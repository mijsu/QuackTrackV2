import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/sections
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get('departmentId');
    const programId = searchParams.get('programId');
    const classType = searchParams.get('classType');
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const sections = await db.section.findMany({
      where: {
        ...(departmentId ? { departmentId } : {}),
        ...(programId ? { programId } : {}),
        ...(classType ? { classType } : {}),
        ...(includeInactive ? {} : { isActive: true }),
      },
      include: {
        department: true,
        program: {
          include: {
            department: true,
          },
        },
        curriculum: true,
        _count: { select: { schedules: true } },
      },
      orderBy: [{ yearLevel: 'asc' }, { sectionName: 'asc' }],
    });

    return NextResponse.json(sections);
  } catch (error) {
    console.error('Error fetching sections:', error);
    return NextResponse.json({ error: 'Failed to fetch sections' }, { status: 500 });
  }
}

// POST /api/sections - Admin only
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
    const { sectionName, sectionCode, yearLevel, departmentId, programId, curriculumId, studentCount, classType } = body;

    if (!sectionName || !yearLevel || !departmentId || studentCount === undefined) {
      return NextResponse.json({ error: 'Section name, year level, department, and student count are required' }, { status: 400 });
    }

    // Check if section name already exists
    const existing = await db.section.findUnique({ where: { sectionName } });
    if (existing) {
      return NextResponse.json({ error: 'Section name already exists' }, { status: 400 });
    }

    const section = await db.section.create({
      data: {
        sectionName,
        sectionCode,
        yearLevel,
        departmentId,
        programId: programId || null,
        curriculumId: curriculumId || null,
        studentCount,
        ...(classType ? { classType } : {}),
      },
      include: {
        department: true,
        program: true,
        curriculum: true,
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'create',
        entity: 'section',
        canUndo: true,
        entityId: section.id,
        details: JSON.stringify({ sectionName, programId }),
      },
    });

    return NextResponse.json(section);
  } catch (error) {
    console.error('Error creating section:', error);
    return NextResponse.json({ error: 'Failed to create section' }, { status: 500 });
  }
}
