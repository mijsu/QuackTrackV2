import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/curricula
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

    const curricula = await db.curriculum.findMany({
      where: {
        ...(departmentId ? { departmentId } : {}),
        ...(programId ? { programId } : {}),
        ...(classType ? { classType } : {}),
        ...(includeInactive ? {} : { isActive: true }),
      },
      include: {
        department: true,
        program: true,
        _count: {
          select: {
            items: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Enrich with completion stats
    const enrichedCurricula = await Promise.all(
      curricula.map(async (curriculum) => {
        const completedCount = await db.curriculumItem.count({
          where: { curriculumId: curriculum.id, isComplete: true },
        });
        const totalItems = curriculum._count.items;
        return {
          ...curriculum,
          completedItems: completedCount,
          completionRate: totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0,
        };
      })
    );

    return NextResponse.json(enrichedCurricula);
  } catch (error) {
    console.error('Error fetching curricula:', error);
    return NextResponse.json({ error: 'Failed to fetch curricula' }, { status: 500 });
  }
}

// POST /api/curricula - Admin only
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, departmentId, programId, classType } = body;

    if (!name) {
      return NextResponse.json({ error: 'Curriculum name is required' }, { status: 400 });
    }

    // Check for duplicate name within department
    const existing = await db.curriculum.findFirst({
      where: {
        name,
        departmentId: departmentId || null,
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'A curriculum with this name already exists in this department' }, { status: 400 });
    }

    const curriculum = await db.curriculum.create({
      data: {
        name,
        description,
        departmentId: departmentId || null,
        programId: programId || null,
        ...(classType ? { classType } : {}),
      },
      include: {
        department: true,
        program: true,
        _count: {
          select: { items: true },
        },
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'create',
        entity: 'curriculum',
        entityId: curriculum.id,
        details: JSON.stringify({ name, departmentId, programId }),
        canUndo: true,
      },
    });

    return NextResponse.json({
      ...curriculum,
      completedItems: 0,
      completionRate: 0,
    });
  } catch (error) {
    console.error('Error creating curriculum:', error);
    return NextResponse.json({ error: 'Failed to create curriculum' }, { status: 500 });
  }
}
