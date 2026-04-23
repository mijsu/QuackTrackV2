import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/subjects
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get('departmentId');
    const programId = searchParams.get('programId');
    const yearLevel = searchParams.get('yearLevel');
    const semester = searchParams.get('semester');
    const subjectType = searchParams.get('subjectType');
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const subjects = await db.subject.findMany({
      where: {
        ...(departmentId ? { departmentId } : {}),
        ...(programId ? { programId } : {}),
        ...(yearLevel ? { yearLevel: parseInt(yearLevel) } : {}),
        ...(semester ? { semester } : {}),
        ...(subjectType ? { subjectType } : {}),
        ...(includeInactive ? {} : { isActive: true }),
      },
      include: {
        program: {
          include: {
            department: true,
          },
        },
        _count: { select: { schedules: true } },
      },
      orderBy: [
        { program: { name: 'asc' } },
        { subjectCode: 'asc' },
      ],
    });

    const formattedSubjects = subjects.map(subject => ({
      ...subject,
      department: subject.program?.department,
      requiredSpecialization: JSON.parse(subject.requiredSpecialization || '[]'),
    }));

    return NextResponse.json(formattedSubjects);
  } catch (error) {
    console.error('Error fetching subjects:', error);
    return NextResponse.json({ error: 'Failed to fetch subjects' }, { status: 500 });
  }
}

// POST /api/subjects - Admin only
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = session.user.role === 'admin';

    if (!isAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

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
      defaultDurationHours,
      subjectType
    } = body;

    if (!subjectCode || !subjectName || !units || !programId || !yearLevel || !semester) {
      return NextResponse.json({ error: 'Subject code, name, units, program, year level, and semester are required' }, { status: 400 });
    }

    // Get the program to find its departmentId for denormalization
    const program = await db.program.findUnique({
      where: { id: programId },
      select: { departmentId: true },
    });

    if (!program) {
      return NextResponse.json({ error: 'Program not found' }, { status: 400 });
    }

    // Check if subject code already exists in the same program
    const existing = await db.subject.findFirst({ 
      where: { 
        subjectCode,
        programId 
      } 
    });
    if (existing) {
      return NextResponse.json({ error: 'Subject code already exists in this program. Use a different code or select another program.' }, { status: 400 });
    }

    const subject = await db.subject.create({
      data: {
        subjectCode,
        subjectName,
        description,
        units,
        programId,
        departmentId: program.departmentId, // Denormalized from program
        yearLevel: parseInt(yearLevel) || 1,
        semester: semester || '1st Semester',
        requiredSpecialization: JSON.stringify(requiredSpecialization || []),
        defaultDurationHours: defaultDurationHours || 3,
        ...(subjectType ? { subjectType } : {}),
      },
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
        action: 'create',
        entity: 'subject',
        entityId: subject.id,
        details: JSON.stringify({ subjectCode, subjectName, programId, yearLevel, semester }),
        canUndo: true,
      },
    });

    return NextResponse.json({
      ...subject,
      department: subject.program?.department,
      requiredSpecialization: JSON.parse(subject.requiredSpecialization || '[]'),
    });
  } catch (error) {
    console.error('Error creating subject:', error);
    return NextResponse.json({ error: 'Failed to create subject' }, { status: 500 });
  }
}
