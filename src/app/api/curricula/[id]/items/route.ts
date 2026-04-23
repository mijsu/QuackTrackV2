import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/curricula/[id]/items
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify curriculum exists
    const curriculum = await db.curriculum.findUnique({
      where: { id },
    });

    if (!curriculum) {
      return NextResponse.json({ error: 'Curriculum not found' }, { status: 404 });
    }

    const items = await db.curriculumItem.findMany({
      where: { curriculumId: id },
      orderBy: [{ yearLevel: 'asc' }, { semester: 'asc' }, { sortOrder: 'asc' }],
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error('Error fetching curriculum items:', error);
    return NextResponse.json({ error: 'Failed to fetch curriculum items' }, { status: 500 });
  }
}

// POST /api/curricula/[id]/items - Admin only
export async function POST(request: NextRequest, { params }: RouteParams) {
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
    const { subjectCode, subjectName, description, units, yearLevel, semester, sortOrder } = body;

    if (!subjectCode || !subjectName) {
      return NextResponse.json({ error: 'Subject code and name are required' }, { status: 400 });
    }

    if (!units || units < 1) {
      return NextResponse.json({ error: 'Valid units value is required' }, { status: 400 });
    }

    // Verify curriculum exists
    const curriculum = await db.curriculum.findUnique({
      where: { id },
    });

    if (!curriculum) {
      return NextResponse.json({ error: 'Curriculum not found' }, { status: 404 });
    }

    // Get the next sort order if not provided
    let nextSortOrder = sortOrder;
    if (nextSortOrder === undefined || nextSortOrder === null) {
      const maxSort = await db.curriculumItem.findFirst({
        where: {
          curriculumId: id,
          yearLevel: yearLevel || 1,
          semester: semester || '1st Semester',
        },
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true },
      });
      nextSortOrder = (maxSort?.sortOrder ?? -1) + 1;
    }

    const item = await db.curriculumItem.create({
      data: {
        curriculumId: id,
        subjectCode,
        subjectName,
        description: description || null,
        units: Number(units),
        yearLevel: Number(yearLevel) || 1,
        semester: semester || '1st Semester',
        sortOrder: Number(nextSortOrder),
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'create',
        entity: 'curriculum_item',
        entityId: item.id,
        details: JSON.stringify({ subjectCode, subjectName, curriculumId: id }),
        canUndo: true,
      },
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error('Error creating curriculum item:', error);
    return NextResponse.json({ error: 'Failed to create curriculum item' }, { status: 500 });
  }
}
