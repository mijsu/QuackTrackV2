import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { conflictId, resolutionOption } = body;
    const userId = session.user.id;

    // Get conflict with rollback data
    const conflict = await db.conflict.findUnique({
      where: { id: conflictId },
    });

    if (!conflict) {
      return NextResponse.json({ error: 'Conflict not found' }, { status: 404 });
    }

    if (conflict.resolved) {
      return NextResponse.json({ error: 'Conflict already resolved' }, { status: 400 });
    }

    const { scheduleId, type, newValue, currentValue } = resolutionOption;

    // Get schedule before update for rollback
    const schedule = await db.schedule.findUnique({
      where: { id: scheduleId },
      include: { subject: true, faculty: true, room: true, section: true },
    });

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    // Store rollback data
    const rollbackData = {
      scheduleId,
      previousValues: {
        day: schedule.day,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        roomId: schedule.roomId,
      },
      conflictId,
    };

    // Apply the resolution
    let updateData: Record<string, unknown> = {};
    
    if (type === 'move_time') {
      updateData = {
        day: newValue.day,
        startTime: newValue.startTime,
        endTime: newValue.endTime,
        status: 'modified',
      };
    } else if (type === 'move_room') {
      updateData = {
        roomId: newValue.roomId,
        status: 'modified',
      };
    }

    // Update the schedule
    const updatedSchedule = await db.schedule.update({
      where: { id: scheduleId },
      data: updateData,
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId,
        action: 'resolve_conflict',
        entity: 'schedule',
        entityId: scheduleId,
        details: JSON.stringify({
          conflictId,
          resolutionType: type,
          newValue,
          conflictType: conflict.type,
        }),
        previousState: JSON.stringify(currentValue),
        newState: JSON.stringify(newValue),
        canUndo: true,
      },
    });

    // Create schedule log
    await db.scheduleLog.create({
      data: {
        scheduleId,
        modifiedBy: userId || 'system',
        oldValue: JSON.stringify(currentValue),
        newValue: JSON.stringify(newValue),
        action: 'conflict_resolution',
        reason: `Resolved ${conflict.type} conflict`,
      },
    });

    // Mark conflict as resolved
    await db.conflict.update({
      where: { id: conflictId },
      data: {
        resolved: true,
        resolvedBy: userId,
        resolvedAt: new Date(),
        resolutionAction: type,
        rollbackData: JSON.stringify(rollbackData),
      },
    });

    return NextResponse.json({
      success: true,
      schedule: updatedSchedule,
      message: 'Conflict resolved successfully',
    });
  } catch (error) {
    console.error('Error applying resolution:', error);
    return NextResponse.json(
      { error: 'Failed to apply resolution' },
      { status: 500 }
    );
  }
}
