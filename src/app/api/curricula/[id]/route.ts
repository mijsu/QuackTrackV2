import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/curricula/[id]
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const curriculum = await db.curriculum.findUnique({
      where: { id },
      include: {
        department: true,
        program: true,
        items: {
          orderBy: [{ yearLevel: 'asc' }, { semester: 'asc' }, { sortOrder: 'asc' }],
        },
        _count: {
          select: { items: true },
        },
      },
    });

    if (!curriculum) {
      return NextResponse.json({ error: 'Curriculum not found' }, { status: 404 });
    }

    const completedItems = curriculum.items.filter((item) => item.isComplete).length;
    const totalItems = curriculum.items.length;

    return NextResponse.json({
      ...curriculum,
      completedItems,
      completionRate: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
    });
  } catch (error) {
    console.error('Error fetching curriculum:', error);
    return NextResponse.json({ error: 'Failed to fetch curriculum' }, { status: 500 });
  }
}

// PUT /api/curricula/[id] - Admin only
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
    const { name, description, departmentId, programId, isActive } = body;

    const existing = await db.curriculum.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Curriculum not found' }, { status: 404 });
    }

    // Check name uniqueness if being changed
    if (name && name !== existing.name) {
      const nameConflict = await db.curriculum.findFirst({
        where: {
          name,
          departmentId: departmentId !== undefined ? departmentId : existing.departmentId,
          id: { not: id },
        },
      });
      if (nameConflict) {
        return NextResponse.json({ error: 'A curriculum with this name already exists in this department' }, { status: 400 });
      }
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (departmentId !== undefined) updateData.departmentId = departmentId || null;
    if (programId !== undefined) updateData.programId = programId || null;
    if (isActive !== undefined) updateData.isActive = isActive;

    const curriculum = await db.curriculum.update({
      where: { id },
      data: updateData,
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
        action: 'update',
        entity: 'curriculum',
        entityId: id,
        previousState: JSON.stringify(existing),
        newState: JSON.stringify(curriculum),
        canUndo: true,
      },
    });

    return NextResponse.json(curriculum);
  } catch (error) {
    console.error('Error updating curriculum:', error);
    return NextResponse.json({ error: 'Failed to update curriculum' }, { status: 500 });
  }
}

// DELETE /api/curricula/[id] - Admin only
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

    const curriculum = await db.curriculum.findUnique({
      where: { id },
    });

    if (!curriculum) {
      return NextResponse.json({ error: 'Curriculum not found' }, { status: 404 });
    }

    // Delete curriculum (items are cascade deleted)
    await db.curriculum.delete({
      where: { id },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'delete',
        entity: 'curriculum',
        entityId: id,
        previousState: JSON.stringify(curriculum),
        canUndo: false,
      },
    });

    return NextResponse.json({ success: true, message: 'Curriculum deleted successfully' });
  } catch (error) {
    console.error('Error deleting curriculum:', error);
    return NextResponse.json({ error: 'Failed to delete curriculum' }, { status: 500 });
  }
}
