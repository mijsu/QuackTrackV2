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
    const subject = await db.subject.findUnique({
      where: { id },
      include: {
        program: {
          include: {
            department: true,
          },
        },
      },
    });

    if (!subject) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...subject,
      department: subject.program?.department,
      requiredSpecialization: JSON.parse(subject.requiredSpecialization || '[]'),
    });
  } catch (error) {
    console.error('Error fetching subject:', error);
    return NextResponse.json({ error: 'Failed to fetch subject' }, { status: 500 });
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
    const { 
      subjectCode, 
      subjectName, 
      description, 
      units, 
      programId, 
      yearLevel,
      semester,
      requiredSpecialization, 
      isActive, 
      defaultDurationHours,
      subjectType
    } = body;

    // Get the previous state for audit log
    const previousSubject = await db.subject.findUnique({
      where: { id },
      include: { program: true },
    });

    if (!previousSubject) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {};
    
    if (subjectCode !== undefined) updateData.subjectCode = subjectCode;
    if (subjectName !== undefined) updateData.subjectName = subjectName;
    if (description !== undefined) updateData.description = description;
    if (units !== undefined) updateData.units = units;
    if (yearLevel !== undefined) updateData.yearLevel = parseInt(yearLevel) || 1;
    if (semester !== undefined) updateData.semester = semester;
    if (requiredSpecialization !== undefined) {
      updateData.requiredSpecialization = JSON.stringify(requiredSpecialization || []);
    }
    if (isActive !== undefined) updateData.isActive = isActive;
    if (defaultDurationHours !== undefined) updateData.defaultDurationHours = defaultDurationHours;
    if (subjectType !== undefined) updateData.subjectType = subjectType;

    // Determine the target programId (either new or existing)
    const targetProgramId = programId || previousSubject.programId;

    // If programId is changing, update both programId and departmentId (denormalized)
    if (programId && programId !== previousSubject.programId) {
      const program = await db.program.findUnique({
        where: { id: programId },
        select: { departmentId: true },
      });
      
      if (!program) {
        return NextResponse.json({ error: 'Program not found' }, { status: 400 });
      }
      
      updateData.programId = programId;
      updateData.departmentId = program.departmentId;
    }

    // Check if subject code already exists in the target program (excluding current subject)
    const codeToCheck = subjectCode || previousSubject.subjectCode;
    if (codeToCheck) {
      const existing = await db.subject.findFirst({
        where: {
          subjectCode: codeToCheck,
          programId: targetProgramId,
          id: { not: id }, // Exclude current subject
        },
      });
      if (existing) {
        return NextResponse.json({ error: 'Subject code already exists in this program. Use a different code or select another program.' }, { status: 400 });
      }
    }

    const subject = await db.subject.update({
      where: { id },
      data: updateData,
      include: {
        program: {
          include: {
            department: true,
          },
        },
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'update',
        entity: 'subject',
        entityId: id,
        previousState: JSON.stringify(previousSubject),
        newState: JSON.stringify(subject),
        canUndo: true,
      },
    });

    return NextResponse.json({
      ...subject,
      department: subject.program?.department,
      requiredSpecialization: JSON.parse(subject.requiredSpecialization || '[]'),
    });
  } catch (error) {
    console.error('Error updating subject:', error);
    return NextResponse.json({ error: 'Failed to update subject' }, { status: 500 });
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

    // Get subject for audit log
    const subject = await db.subject.findUnique({
      where: { id },
      include: { program: true },
    });

    if (!subject) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
    }

    // Check if subject has schedules
    const schedulesCount = await db.schedule.count({ where: { subjectId: id } });
    if (schedulesCount > 0) {
      return NextResponse.json({ 
        error: `Cannot delete subject. It has ${schedulesCount} schedule(s) associated with it. Please remove the schedules first.` 
      }, { status: 400 });
    }

    await db.subject.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'delete',
        entity: 'subject',
        entityId: id,
        previousState: JSON.stringify(subject),
        canUndo: false,
      },
    });

    return NextResponse.json({ success: true, message: 'Subject deleted successfully' });
  } catch (error) {
    console.error('Error deleting subject:', error);
    return NextResponse.json({ error: 'Failed to delete subject' }, { status: 500 });
  }
}
