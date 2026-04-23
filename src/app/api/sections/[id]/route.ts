import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const section = await db.section.findUnique({
      where: { id },
      include: {
        department: true,
        program: {
          include: {
            department: true,
          },
        },
        curriculum: true,
      },
    });

    if (!section) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }

    return NextResponse.json(section);
  } catch (error) {
    console.error('Error fetching section:', error);
    return NextResponse.json({ error: 'Failed to fetch section' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = session.user.role === 'admin';

    if (!isAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { sectionName, sectionCode, yearLevel, departmentId, programId, curriculumId, studentCount, isActive, classType } = body;

    // Get previous state for audit log
    const previousSection = await db.section.findUnique({
      where: { id },
    });

    if (!previousSection) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }

    if (sectionName) {
      const existing = await db.section.findFirst({
        where: { sectionName, NOT: { id } },
      });
      if (existing) {
        return NextResponse.json({ error: 'A section with this name already exists' }, { status: 409 });
      }
    }

    const updateData: Record<string, unknown> = {};
    if (sectionName !== undefined) updateData.sectionName = sectionName;
    if (sectionCode !== undefined) updateData.sectionCode = sectionCode;
    if (yearLevel !== undefined) updateData.yearLevel = yearLevel;
    if (departmentId !== undefined) updateData.departmentId = departmentId;
    if (programId !== undefined) updateData.programId = programId || null;
    if (curriculumId !== undefined) updateData.curriculumId = curriculumId || null;
    if (studentCount !== undefined) updateData.studentCount = studentCount;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (classType !== undefined) updateData.classType = classType;

    const section = await db.section.update({
      where: { id },
      data: updateData,
      include: {
        department: true,
        program: true,
        curriculum: true,
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'update',
        entity: 'section',
        canUndo: true,
        entityId: id,
        previousState: JSON.stringify(previousSection),
        newState: JSON.stringify(section),
      },
    });

    return NextResponse.json(section);
  } catch (error) {
    console.error('Error updating section:', error);
    return NextResponse.json({ error: 'Failed to update section' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = session.user.role === 'admin';

    if (!isAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { id } = await params;

    // Get section for audit log
    const section = await db.section.findUnique({
      where: { id },
    });

    if (!section) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }

    const schedulesCount = await db.schedule.count({ where: { sectionId: id } });
    if (schedulesCount > 0) {
      return NextResponse.json({ 
        error: `Cannot delete section. It has ${schedulesCount} schedule(s) associated with it. Please remove the schedules first.` 
      }, { status: 400 });
    }

    await db.section.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'delete',
        entity: 'section',
        canUndo: false,
        entityId: id,
        previousState: JSON.stringify(section),
      },
    });

    return NextResponse.json({ success: true, message: 'Section deleted successfully' });
  } catch (error) {
    console.error('Error deleting section:', error);
    return NextResponse.json({ error: 'Failed to delete section' }, { status: 500 });
  }
}
