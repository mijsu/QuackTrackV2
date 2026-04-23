import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/curricula/[id]/items/batch-toggle - Admin only
// Body: { itemIds: string[], isComplete: boolean }
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
    const { itemIds, isComplete } = body;

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json({ error: 'itemIds array is required' }, { status: 400 });
    }

    if (typeof isComplete !== 'boolean') {
      return NextResponse.json({ error: 'isComplete boolean is required' }, { status: 400 });
    }

    // Verify curriculum exists
    const curriculum = await db.curriculum.findUnique({
      where: { id },
    });

    if (!curriculum) {
      return NextResponse.json({ error: 'Curriculum not found' }, { status: 404 });
    }

    // Batch update
    const result = await db.curriculumItem.updateMany({
      where: {
        id: { in: itemIds },
        curriculumId: id,
      },
      data: { isComplete },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'batch_update',
        entity: 'curriculum_item',
        details: JSON.stringify({
          curriculumId: id,
          itemIds,
          isComplete,
          updatedCount: result.count,
        }),
        canUndo: true,
      },
    });

    return NextResponse.json({
      success: true,
      updatedCount: result.count,
      message: `${result.count} item(s) marked as ${isComplete ? 'complete' : 'incomplete'}`,
    });
  } catch (error) {
    console.error('Error batch toggling curriculum items:', error);
    return NextResponse.json({ error: 'Failed to batch toggle items' }, { status: 500 });
  }
}
