import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { notifyScheduleChange } from '@/lib/notification-client';

// Time utility functions
function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

function timesOverlap(s1: string, e1: string, s2: string, e2: string): boolean {
  const start1 = timeToMinutes(s1);
  const end1 = timeToMinutes(e1);
  const start2 = timeToMinutes(s2);
  const end2 = timeToMinutes(e2);
  return start1 < end2 && end1 > start2;
}

// Resolution action types
type ResolutionAction = 
  | 'reassign_time'
  | 'reassign_room'
  | 'reassign_faculty'
  | 'delete_schedule'
  | 'acknowledge'
  | 'update_preferences';

interface ResolutionRequest {
  conflictId: string;
  action: ResolutionAction;
  targetScheduleId?: string; // Which schedule to modify (scheduleId1 or scheduleId2)
  newRoomId?: string;
  newFacultyId?: string;
  newDay?: string;
  newStartTime?: string;
  newEndTime?: string;
  reason?: string;
}

// POST /api/conflicts/resolve
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

    const body: ResolutionRequest = await request.json();
    const { conflictId, action, targetScheduleId, newRoomId, newFacultyId, newDay, newStartTime, newEndTime, reason } = body;

    // Fetch the conflict
    const conflict = await db.conflict.findUnique({
      where: { id: conflictId },
    });

    if (!conflict) {
      return NextResponse.json({ error: 'Conflict not found' }, { status: 404 });
    }

    if (conflict.resolved) {
      return NextResponse.json({ error: 'Conflict already resolved' }, { status: 400 });
    }

    let resolutionDetails: Record<string, unknown> = { action };
    let resolved = true;

    // Handle different resolution actions
    switch (action) {
      case 'reassign_time': {
        if (!targetScheduleId || !newDay || !newStartTime || !newEndTime) {
          return NextResponse.json({ error: 'Missing required fields for time reassignment' }, { status: 400 });
        }

        // Get the schedule to modify
        const oldSchedule = await db.schedule.findUnique({
          where: { id: targetScheduleId },
          include: { subject: true, faculty: true, room: true, section: true },
        });

        if (!oldSchedule) {
          return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
        }

        // Check for conflicts at new time slot
        const existingAtNewTime = await db.schedule.findFirst({
          where: {
            id: { not: targetScheduleId },
            day: newDay,
            OR: [
              { facultyId: oldSchedule.facultyId },
              { roomId: oldSchedule.roomId },
              { sectionId: oldSchedule.sectionId },
            ],
          },
        });

        // Check time overlap
        if (existingAtNewTime && timesOverlap(newStartTime, newEndTime, existingAtNewTime.startTime, existingAtNewTime.endTime)) {
          // Update anyway but warn about potential new conflict
          resolutionDetails.warning = 'New time slot may have conflicts';
        }

        // Update schedule
        const updatedSchedule = await db.schedule.update({
          where: { id: targetScheduleId },
          data: {
            day: newDay,
            startTime: newStartTime,
            endTime: newEndTime,
            status: 'modified',
          },
          include: { subject: true, faculty: true, room: true },
        });

        // Log the change
        await db.scheduleLog.create({
          data: {
            scheduleId: targetScheduleId,
            modifiedBy: session.user.id,
            oldValue: JSON.stringify(oldSchedule),
            newValue: JSON.stringify(updatedSchedule),
            action: 'modified',
            reason: reason || `Resolved conflict: ${conflict.type}`,
          },
        });

        // Notify faculty
        if (updatedSchedule.facultyId) {
          await db.notification.create({
            data: {
              userId: updatedSchedule.facultyId,
              title: 'Schedule Time Changed',
              message: `Your ${updatedSchedule.subject?.subjectName} class has been moved to ${newDay} (${newStartTime} - ${newEndTime})`,
              type: 'info',
            },
          });

          notifyScheduleChange(
            updatedSchedule.facultyId,
            'updated',
            updatedSchedule.subject?.subjectName || 'Unknown',
            newDay,
            `${newStartTime} - ${newEndTime}`
          );
        }

        resolutionDetails.oldSchedule = oldSchedule;
        resolutionDetails.newSchedule = updatedSchedule;
        break;
      }

      case 'reassign_room': {
        if (!targetScheduleId || !newRoomId) {
          return NextResponse.json({ error: 'Missing required fields for room reassignment' }, { status: 400 });
        }

        const newRoom = await db.room.findUnique({ where: { id: newRoomId } });
        if (!newRoom) {
          return NextResponse.json({ error: 'Room not found' }, { status: 404 });
        }

        const oldSchedule = await db.schedule.findUnique({
          where: { id: targetScheduleId },
          include: { subject: true, faculty: true, room: true, section: true },
        });

        if (!oldSchedule) {
          return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
        }

        // Update schedule
        const updatedSchedule = await db.schedule.update({
          where: { id: targetScheduleId },
          data: {
            roomId: newRoomId,
            status: 'modified',
          },
          include: { subject: true, faculty: true, room: true },
        });

        // Log the change
        await db.scheduleLog.create({
          data: {
            scheduleId: targetScheduleId,
            modifiedBy: session.user.id,
            oldValue: JSON.stringify(oldSchedule),
            newValue: JSON.stringify(updatedSchedule),
            action: 'modified',
            reason: reason || `Resolved conflict: ${conflict.type}`,
          },
        });

        // Notify faculty
        if (updatedSchedule.facultyId) {
          await db.notification.create({
            data: {
              userId: updatedSchedule.facultyId,
              title: 'Schedule Room Changed',
              message: `Your ${updatedSchedule.subject?.subjectName} class on ${updatedSchedule.day} has been moved to ${newRoom.roomName}`,
              type: 'info',
            },
          });

          notifyScheduleChange(
            updatedSchedule.facultyId,
            'updated',
            updatedSchedule.subject?.subjectName || 'Unknown',
            updatedSchedule.day,
            `${updatedSchedule.startTime} - ${updatedSchedule.endTime}`
          );
        }

        resolutionDetails.oldSchedule = oldSchedule;
        resolutionDetails.newSchedule = updatedSchedule;
        break;
      }

      case 'reassign_faculty': {
        if (!targetScheduleId || !newFacultyId) {
          return NextResponse.json({ error: 'Missing required fields for faculty reassignment' }, { status: 400 });
        }

        const newFaculty = await db.user.findUnique({ where: { id: newFacultyId } });
        if (!newFaculty) {
          return NextResponse.json({ error: 'Faculty not found' }, { status: 404 });
        }

        const oldSchedule = await db.schedule.findUnique({
          where: { id: targetScheduleId },
          include: { subject: true, faculty: true, room: true, section: true },
        });

        if (!oldSchedule) {
          return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
        }

        // Update schedule
        const updatedSchedule = await db.schedule.update({
          where: { id: targetScheduleId },
          data: {
            facultyId: newFacultyId,
            status: 'modified',
          },
          include: { subject: true, faculty: true, room: true },
        });

        // Log the change
        await db.scheduleLog.create({
          data: {
            scheduleId: targetScheduleId,
            modifiedBy: session.user.id,
            oldValue: JSON.stringify(oldSchedule),
            newValue: JSON.stringify(updatedSchedule),
            action: 'modified',
            reason: reason || `Resolved conflict: ${conflict.type}`,
          },
        });

        // Notify old faculty
        if (oldSchedule.facultyId && oldSchedule.facultyId !== newFacultyId) {
          await db.notification.create({
            data: {
              userId: oldSchedule.facultyId,
              title: 'Schedule Unassigned',
              message: `You have been unassigned from ${oldSchedule.subject?.subjectName} on ${oldSchedule.day}`,
              type: 'warning',
            },
          });
        }

        // Notify new faculty
        await db.notification.create({
          data: {
            userId: newFacultyId,
            title: 'New Schedule Assignment',
            message: `You have been assigned to ${updatedSchedule.subject?.subjectName} on ${updatedSchedule.day} (${updatedSchedule.startTime} - ${updatedSchedule.endTime})`,
            type: 'info',
          },
        });

        notifyScheduleChange(
          newFacultyId,
          'created',
          updatedSchedule.subject?.subjectName || 'Unknown',
          updatedSchedule.day,
          `${updatedSchedule.startTime} - ${updatedSchedule.endTime}`
        );

        resolutionDetails.oldSchedule = oldSchedule;
        resolutionDetails.newSchedule = updatedSchedule;
        break;
      }

      case 'delete_schedule': {
        if (!targetScheduleId) {
          return NextResponse.json({ error: 'Missing schedule ID for deletion' }, { status: 400 });
        }

        const schedule = await db.schedule.findUnique({
          where: { id: targetScheduleId },
          include: { subject: true, faculty: true },
        });

        if (!schedule) {
          return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
        }

        // Delete related conflicts first
        await db.conflict.deleteMany({
          where: {
            OR: [{ scheduleId1: targetScheduleId }, { scheduleId2: targetScheduleId }],
            id: { not: conflictId }, // Don't delete the current conflict yet
          },
        });

        // Delete schedule
        await db.schedule.delete({ where: { id: targetScheduleId } });

        // Notify faculty
        if (schedule.facultyId) {
          await db.notification.create({
            data: {
              userId: schedule.facultyId,
              title: 'Schedule Removed',
              message: `Your ${schedule.subject?.subjectName} class on ${schedule.day} has been removed due to conflict resolution`,
              type: 'warning',
            },
          });

          notifyScheduleChange(
            schedule.facultyId,
            'deleted',
            schedule.subject?.subjectName || 'Unknown',
            schedule.day,
            `${schedule.startTime} - ${schedule.endTime}`
          );
        }

        resolutionDetails.deletedSchedule = schedule;
        break;
      }

      case 'acknowledge': {
        // Just mark as resolved without any changes
        resolutionDetails.acknowledged = true;
        break;
      }

      case 'update_preferences': {
        // This would redirect to preferences page or open a dialog
        // For now, just mark as acknowledged with a note
        resolutionDetails.preferenceUpdate = 'User will update preferences manually';
        break;
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Mark conflict as resolved
    await db.conflict.update({
      where: { id: conflictId },
      data: {
        resolved: true,
        resolvedBy: session.user.id,
        resolvedAt: new Date(),
        suggestedResolution: `${action}: ${reason || 'Resolved by admin'}`,
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'resolve_conflict',
        entity: 'conflict',
        entityId: conflictId,
        details: JSON.stringify(resolutionDetails),
      },
    });

    return NextResponse.json({
      success: true,
      action,
      resolutionDetails,
      message: `Conflict resolved successfully using ${action}`,
    });
  } catch (error) {
    console.error('Error resolving conflict:', error);
    return NextResponse.json({ error: 'Failed to resolve conflict' }, { status: 500 });
  }
}
