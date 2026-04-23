import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// Get audit logs with stats
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const entity = searchParams.get('entity');
    const entityId = searchParams.get('entityId');
    const userId = searchParams.get('userId');
    const action = searchParams.get('action');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const includeStats = searchParams.get('includeStats') === 'true';

    const where: Record<string, unknown> = {};
    
    if (entity) where.entity = entity;
    if (entityId) where.entityId = entityId;
    if (userId) where.userId = userId;
    if (action) where.action = action;

    // Date filtering
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt = { ...where.createdAt as object, gte: new Date(dateFrom) };
      }
      if (dateTo) {
        where.createdAt = { ...where.createdAt as object, lte: new Date(dateTo) };
      }
    }

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.auditLog.count({ where }),
    ]);

    let stats = undefined;

    // Calculate stats if requested
    if (includeStats) {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Get all stats in parallel
      const [
        totalActions,
        createCount,
        updateCount,
        deleteCount,
        undoCount,
        todayCount,
        weekCount,
        topUsersData,
        entityBreakdownData,
        hourlyData,
      ] = await Promise.all([
        db.auditLog.count(),
        db.auditLog.count({ where: { action: 'create' } }),
        db.auditLog.count({ where: { action: 'update' } }),
        db.auditLog.count({ where: { action: 'delete' } }),
        db.auditLog.count({ where: { action: 'undo' } }),
        db.auditLog.count({ where: { createdAt: { gte: todayStart } } }),
        db.auditLog.count({ where: { createdAt: { gte: weekStart } } }),
        // Top users
        db.auditLog.groupBy({
          by: ['userId'],
          where: { userId: { not: null } },
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 5,
        }),
        // Entity breakdown
        db.auditLog.groupBy({
          by: ['entity'],
          where: { entity: { not: null } },
          _count: { id: true },
        }),
        // Hourly distribution (last 24 hours)
        Promise.all(
          Array.from({ length: 24 }, (_, hour) => {
            const hourStart = new Date(now);
            hourStart.setHours(hour, 0, 0, 0);
            const hourEnd = new Date(hourStart);
            hourEnd.setHours(hour + 1);
            return db.auditLog.count({
              where: {
                createdAt: {
                  gte: hourStart,
                  lt: hourEnd,
                },
              },
            });
          })
        ),
      ]);

      // Get user names for top users
      const topUsers = await Promise.all(
        topUsersData.map(async (item) => {
          if (!item.userId) return null;
          const user = await db.user.findUnique({
            where: { id: item.userId },
            select: { name: true },
          });
          return {
            name: user?.name || 'Unknown',
            count: item._count.id,
          };
        })
      );

      // Format entity breakdown
      const entityBreakdown: Record<string, number> = {};
      entityBreakdownData.forEach((item) => {
        if (item.entity) {
          entityBreakdown[item.entity] = item._count.id;
        }
      });

      stats = {
        totalActions,
        createCount,
        updateCount,
        deleteCount,
        undoCount,
        todayCount,
        weekCount,
        topUsers: topUsers.filter(Boolean) as Array<{ name: string; count: number }>,
        entityBreakdown,
        hourlyDistribution: hourlyData,
      };
    }

    return NextResponse.json({
      logs,
      total,
      hasMore: offset + logs.length < total,
      stats,
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}

// Undo an action
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
    const { logId, userId } = body;

    // Get the audit log
    const auditLog = await db.auditLog.findUnique({
      where: { id: logId },
    });

    if (!auditLog) {
      return NextResponse.json({ error: 'Audit log not found' }, { status: 404 });
    }

    if (!auditLog.canUndo) {
      return NextResponse.json({ error: 'This action cannot be undone' }, { status: 400 });
    }

    if (auditLog.undone) {
      return NextResponse.json({ error: 'This action has already been undone' }, { status: 400 });
    }

    // Check 24 hour limit
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (auditLog.createdAt < twentyFourHoursAgo) {
      return NextResponse.json({ error: 'Undo time limit exceeded (24 hours)' }, { status: 400 });
    }

    const previousState = auditLog.previousState ? JSON.parse(auditLog.previousState) : {};
    const newState = auditLog.newState ? JSON.parse(auditLog.newState) : {};

    let result = {};

    switch (auditLog.entity) {
      case 'schedule': {
        if (!auditLog.entityId) {
          return NextResponse.json({ error: 'No entity ID found' }, { status: 400 });
        }

        // Restore previous state
        if (auditLog.action === 'delete') {
          // Recreate the schedule
          const scheduleData = previousState;
          const newSchedule = await db.schedule.create({
            data: {
              subjectId: scheduleData.subjectId,
              facultyId: scheduleData.facultyId,
              sectionId: scheduleData.sectionId,
              roomId: scheduleData.roomId,
              day: scheduleData.day,
              startTime: scheduleData.startTime,
              endTime: scheduleData.endTime,
              status: scheduleData.status || 'generated',
            },
          });
          result = { schedule: newSchedule };
        } else if (auditLog.action === 'create') {
          // Delete the created schedule
          await db.schedule.delete({
            where: { id: auditLog.entityId },
          });
          result = { deleted: true };
        } else if (auditLog.action === 'update' || auditLog.action === 'resolve_conflict' || auditLog.action === 'batch_resolve_conflict') {
          // Restore previous values
          const updateData: Record<string, unknown> = {};
          if (previousState.day) updateData.day = previousState.day;
          if (previousState.startTime) updateData.startTime = previousState.startTime;
          if (previousState.endTime) updateData.endTime = previousState.endTime;
          if (previousState.roomId) updateData.roomId = previousState.roomId;
          if (previousState.facultyId) updateData.facultyId = previousState.facultyId;
          if (previousState.sectionId) updateData.sectionId = previousState.sectionId;

          const updatedSchedule = await db.schedule.update({
            where: { id: auditLog.entityId },
            data: updateData,
          });
          result = { schedule: updatedSchedule };
        }
        break;
      }

      case 'conflict': {
        if (auditLog.action === 'resolve_conflict') {
          // Unresolve the conflict
          const details = auditLog.details ? JSON.parse(auditLog.details) : {};
          if (details.conflictId) {
            await db.conflict.update({
              where: { id: details.conflictId },
              data: {
                resolved: false,
                resolvedBy: null,
                resolvedAt: null,
                resolutionAction: null,
              },
            });
          }
        }
        break;
      }

      default:
        return NextResponse.json({ error: 'Unknown entity type' }, { status: 400 });
    }

    // Mark the original log as undone
    await db.auditLog.update({
      where: { id: logId },
      data: {
        undone: true,
        undoneBy: userId,
        undoneAt: new Date(),
      },
    });

    // Create a new audit log for the undo action
    await db.auditLog.create({
      data: {
        userId,
        action: 'undo',
        entity: auditLog.entity,
        entityId: auditLog.entityId,
        details: JSON.stringify({ originalLogId: logId }),
        previousState: JSON.stringify(newState),
        newState: JSON.stringify(previousState),
        canUndo: false, // Can't undo an undo
        undoOfLogId: logId,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Action undone successfully',
      result,
    });
  } catch (error) {
    console.error('Error undoing action:', error);
    return NextResponse.json(
      { error: 'Failed to undo action' },
      { status: 500 }
    );
  }
}
