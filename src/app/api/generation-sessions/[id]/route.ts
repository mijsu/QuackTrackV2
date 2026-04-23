import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/generation-sessions/[id] - Get session details with progress
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const genSession = await db.generationSession.findUnique({
      where: { id: params.id },
    });

    if (!genSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const result = {
      ...genSession,
      stats: genSession.stats ? JSON.parse(genSession.stats) : null,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching generation session:', error);
    return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 });
  }
}

// PUT /api/generation-sessions/[id] - Update session progress
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      status, progress, totalTasks, assignedCount, unassignedCount,
      elapsedTimeMs, estimatedRemainingMs, error, stats, completedAt, versionId
    } = body;

    const updateData: Record<string, unknown> = {};
    if (status !== undefined) updateData.status = status;
    if (progress !== undefined) updateData.progress = progress;
    if (totalTasks !== undefined) updateData.totalTasks = totalTasks;
    if (assignedCount !== undefined) updateData.assignedCount = assignedCount;
    if (unassignedCount !== undefined) updateData.unassignedCount = unassignedCount;
    if (elapsedTimeMs !== undefined) updateData.elapsedTimeMs = elapsedTimeMs;
    if (estimatedRemainingMs !== undefined) updateData.estimatedRemainingMs = estimatedRemainingMs;
    if (error !== undefined) updateData.error = error;
    if (stats !== undefined) updateData.stats = JSON.stringify(stats);
    if (completedAt !== undefined) updateData.completedAt = completedAt;
    if (versionId !== undefined) updateData.versionId = versionId;

    const genSession = await db.generationSession.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(genSession);
  } catch (error) {
    console.error('Error updating generation session:', error);
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
  }
}

// DELETE - Cancel a running session
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const genSession = await db.generationSession.update({
      where: { id: params.id },
      data: { 
        status: 'cancelled',
        completedAt: new Date(),
      },
    });

    return NextResponse.json(genSession);
  } catch (error) {
    console.error('Error cancelling generation session:', error);
    return NextResponse.json({ error: 'Failed to cancel session' }, { status: 500 });
  }
}
