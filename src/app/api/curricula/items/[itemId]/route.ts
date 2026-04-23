import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

interface RouteParams {
  params: Promise<{ itemId: string }>;
}

// PUT /api/curricula/items/[itemId] - Admin only
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { itemId } = await params;
    const body = await request.json();

    const existing = await db.curriculumItem.findUnique({
      where: { id: itemId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Curriculum item not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (body.subjectCode !== undefined) updateData.subjectCode = body.subjectCode;
    if (body.subjectName !== undefined) updateData.subjectName = body.subjectName;
    if (body.description !== undefined) updateData.description = body.description || null;
    if (body.units !== undefined) updateData.units = Number(body.units);
    if (body.yearLevel !== undefined) updateData.yearLevel = Number(body.yearLevel);
    if (body.semester !== undefined) updateData.semester = body.semester;
    if (body.isComplete !== undefined) updateData.isComplete = body.isComplete;
    if (body.sortOrder !== undefined) updateData.sortOrder = Number(body.sortOrder);

    const item = await db.curriculumItem.update({
      where: { id: itemId },
      data: updateData,
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'update',
        entity: 'curriculum_item',
        entityId: itemId,
        previousState: JSON.stringify(existing),
        newState: JSON.stringify(item),
        canUndo: true,
      },
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error('Error updating curriculum item:', error);
    return NextResponse.json({ error: 'Failed to update curriculum item' }, { status: 500 });
  }
}

// DELETE /api/curricula/items/[itemId] - Admin only
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { itemId } = await params;

    const existing = await db.curriculumItem.findUnique({
      where: { id: itemId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Curriculum item not found' }, { status: 404 });
    }

    await db.curriculumItem.delete({
      where: { id: itemId },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'delete',
        entity: 'curriculum_item',
        entityId: itemId,
        previousState: JSON.stringify(existing),
        canUndo: false,
      },
    });

    return NextResponse.json({ success: true, message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Error deleting curriculum item:', error);
    return NextResponse.json({ error: 'Failed to delete curriculum item' }, { status: 500 });
  }
}
