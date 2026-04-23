import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/programs/[id]
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const program = await db.program.findUnique({
      where: { id },
      include: {
        department: true,
        subjects: {
          where: { isActive: true },
          orderBy: { subjectCode: 'asc' },
        },
        sections: {
          where: { isActive: true },
          orderBy: [{ yearLevel: 'asc' }, { sectionName: 'asc' }],
        },
        _count: {
          select: {
            subjects: true,
            sections: true,
          },
        },
      },
    });

    if (!program) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 });
    }

    // Parse JSON fields in subjects
    const formattedProgram = {
      ...program,
      subjects: program.subjects.map(subject => ({
        ...subject,
        requiredSpecialization: JSON.parse(subject.requiredSpecialization || '[]'),
      })),
    };

    return NextResponse.json(formattedProgram);
  } catch (error) {
    console.error('Error fetching program:', error);
    return NextResponse.json({ error: 'Failed to fetch program' }, { status: 500 });
  }
}

// PUT /api/programs/[id] - Admin only
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, code, description, departmentId, isActive } = body;

    // Get existing program
    const existing = await db.program.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 });
    }

    // Check for name conflict if name is being changed
    if (name && name !== existing.name) {
      const nameConflict = await db.program.findFirst({
        where: {
          name,
          departmentId: departmentId || existing.departmentId,
          id: { not: id },
        },
      });
      if (nameConflict) {
        return NextResponse.json({ error: 'Program with this name already exists in the department' }, { status: 400 });
      }
    }

    // Check for code conflict if code is being changed
    if (code && code !== existing.code) {
      const codeConflict = await db.program.findUnique({
        where: { code },
      });
      if (codeConflict) {
        return NextResponse.json({ error: 'Program code already exists' }, { status: 400 });
      }
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (code !== undefined) updateData.code = code;
    if (description !== undefined) updateData.description = description;
    if (departmentId !== undefined) updateData.departmentId = departmentId;
    if (isActive !== undefined) updateData.isActive = isActive;

    const program = await db.program.update({
      where: { id },
      data: updateData,
      include: {
        department: true,
        _count: {
          select: {
            subjects: true,
            sections: true,
          },
        },
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'update',
        entity: 'program',
        entityId: program.id,
        previousState: JSON.stringify(existing),
        newState: JSON.stringify(program),
        canUndo: true,
      },
    });

    return NextResponse.json(program);
  } catch (error) {
    console.error('Error updating program:', error);
    return NextResponse.json({ error: 'Failed to update program' }, { status: 500 });
  }
}

// DELETE /api/programs/[id] - Admin only
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { id } = await params;

    // Check if program has subjects
    const subjectsCount = await db.subject.count({
      where: { programId: id },
    });

    if (subjectsCount > 0) {
      return NextResponse.json({ 
        error: `Cannot delete program. It has ${subjectsCount} subject(s) associated with it. Please reassign or delete the subjects first.` 
      }, { status: 400 });
    }

    // Check if program has sections
    const sectionsCount = await db.section.count({
      where: { programId: id },
    });

    if (sectionsCount > 0) {
      return NextResponse.json({ 
        error: `Cannot delete program. It has ${sectionsCount} section(s) associated with it. Please reassign or delete the sections first.` 
      }, { status: 400 });
    }

    // Get program for audit log
    const program = await db.program.findUnique({
      where: { id },
      include: { department: true },
    });

    if (!program) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 });
    }

    // Delete program
    await db.program.delete({
      where: { id },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'delete',
        entity: 'program',
        entityId: id,
        previousState: JSON.stringify(program),
        canUndo: false,
      },
    });

    return NextResponse.json({ success: true, message: 'Program deleted successfully' });
  } catch (error) {
    console.error('Error deleting program:', error);
    return NextResponse.json({ error: 'Failed to delete program' }, { status: 500 });
  }
}
