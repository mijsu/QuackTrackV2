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
    const { conflictIds, autoResolve = false } = body;
    const userId = session.user.id;

    if (!conflictIds || conflictIds.length === 0) {
      return NextResponse.json({ error: 'No conflicts specified' }, { status: 400 });
    }

    // Get all conflicts
    const conflicts = await db.conflict.findMany({
      where: { 
        id: { in: conflictIds },
        resolved: false,
      },
    });

    if (conflicts.length === 0) {
      return NextResponse.json({ 
        message: 'No unresolved conflicts found',
        resolved: 0,
        failed: 0,
      });
    }

    const results = {
      resolved: 0,
      failed: 0,
      skipped: 0,
      details: [] as Array<{ conflictId: string; status: string; message?: string }>,
    };

    // Get all schedules and rooms for resolution calculation
    const [rooms, allSchedules] = await Promise.all([
      db.room.findMany({ where: { isActive: true } }),
      db.schedule.findMany({
        include: { subject: true, faculty: true, room: true, section: true },
      }),
    ]);

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const timeSlots = [];
    for (let hour = 7; hour <= 20; hour++) {
      timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
    }

    // Helper function to check slot availability
    const isSlotAvailable = (
      excludeScheduleIds: string[],
      facultyId?: string,
      roomId?: string,
      sectionId?: string,
      day?: string,
      startTime?: string,
      endTime?: string
    ) => {
      if (!day || !startTime || !endTime) return false;

      return !allSchedules.some(s => {
        if (excludeScheduleIds.includes(s.id)) return false;
        
        const sameDay = s.day === day;
        const timeOverlap = startTime < s.endTime && endTime > s.startTime;

        if (!sameDay || !timeOverlap) return false;

        if (facultyId && s.facultyId === facultyId) return true;
        if (roomId && s.roomId === roomId) return true;
        if (sectionId && s.sectionId === sectionId) return true;

        return false;
      });
    };

    // Process each conflict
    for (const conflict of conflicts) {
      try {
        const scheduleIds = [conflict.scheduleId1, conflict.scheduleId2].filter(Boolean) as string[];
        
        if (scheduleIds.length === 0) {
          // No schedules to fix, just mark as resolved
          await db.conflict.update({
            where: { id: conflict.id },
            data: {
              resolved: true,
              resolvedBy: userId || 'batch-auto',
              resolvedAt: new Date(),
              resolutionAction: 'marked_resolved',
            },
          });
          results.resolved++;
          results.details.push({ conflictId: conflict.id, status: 'resolved', message: 'Marked as resolved (no schedules to fix)' });
          continue;
        }

        // Get the schedules
        const schedules = await db.schedule.findMany({
          where: { id: { in: scheduleIds } },
          include: { subject: true, faculty: true, room: true, section: true },
        });

        if (schedules.length === 0) {
          results.skipped++;
          results.details.push({ conflictId: conflict.id, status: 'skipped', message: 'Schedules not found' });
          continue;
        }

        let resolved = false;

        // Try to find an alternative for the first schedule
        const schedule = schedules[0];
        const duration = parseInt(schedule.endTime.split(':')[0]) - parseInt(schedule.startTime.split(':')[0]);

        // Try alternative time slots
        for (const day of days) {
          if (resolved) break;
          
          for (const startTime of timeSlots) {
            if (resolved) break;
            
            const startHour = parseInt(startTime.split(':')[0]);
            const endHour = startHour + duration;
            if (endHour > 21) continue;

            const endTime = `${endHour.toString().padStart(2, '0')}:00`;

            const available = isSlotAvailable(
              scheduleIds,
              schedule.facultyId || undefined,
              schedule.roomId || undefined,
              schedule.sectionId || undefined,
              day,
              startTime,
              endTime
            );

            if (available) {
              // Apply the resolution
              const oldValue = {
                day: schedule.day,
                startTime: schedule.startTime,
                endTime: schedule.endTime,
              };

              await db.schedule.update({
                where: { id: schedule.id },
                data: {
                  day,
                  startTime,
                  endTime,
                  status: 'modified',
                },
              });

              // Create audit log
              await db.auditLog.create({
                data: {
                  userId,
                  action: 'batch_resolve_conflict',
                  entity: 'schedule',
                  entityId: schedule.id,
                  details: JSON.stringify({ conflictId: conflict.id }),
                  previousState: JSON.stringify(oldValue),
                  newState: JSON.stringify({ day, startTime, endTime }),
                  canUndo: true,
                },
              });

              // Mark conflict as resolved
              await db.conflict.update({
                where: { id: conflict.id },
                data: {
                  resolved: true,
                  resolvedBy: userId || 'batch-auto',
                  resolvedAt: new Date(),
                  resolutionAction: 'auto_moved',
                  rollbackData: JSON.stringify({ scheduleId: schedule.id, previousValues: oldValue }),
                },
              });

              resolved = true;
              results.resolved++;
              results.details.push({ 
                conflictId: conflict.id, 
                status: 'resolved', 
                message: `Moved ${schedule.subject?.subjectCode} to ${day} ${startTime}-${endTime}` 
              });

              // Update allSchedules to reflect the change
              const scheduleIdx = allSchedules.findIndex(s => s.id === schedule.id);
              if (scheduleIdx >= 0) {
                allSchedules[scheduleIdx].day = day;
                allSchedules[scheduleIdx].startTime = startTime;
                allSchedules[scheduleIdx].endTime = endTime;
              }
            }
          }
        }

        // Try alternative rooms for room conflicts
        if (!resolved && conflict.type === 'room_double_booking') {
          for (const altRoom of rooms) {
            if (resolved) break;
            if (altRoom.id === schedule.roomId) continue;
            if (altRoom.capacity < (schedule.section?.studentCount || 0)) continue;

            const available = isSlotAvailable(
              scheduleIds,
              undefined,
              altRoom.id,
              undefined,
              schedule.day,
              schedule.startTime,
              schedule.endTime
            );

            if (available) {
              const oldRoomId = schedule.roomId;

              await db.schedule.update({
                where: { id: schedule.id },
                data: { roomId: altRoom.id, status: 'modified' },
              });

              await db.auditLog.create({
                data: {
                  userId,
                  action: 'batch_resolve_conflict',
                  entity: 'schedule',
                  entityId: schedule.id,
                  details: JSON.stringify({ conflictId: conflict.id, type: 'room_change' }),
                  previousState: JSON.stringify({ roomId: oldRoomId }),
                  newState: JSON.stringify({ roomId: altRoom.id }),
                  canUndo: true,
                },
              });

              await db.conflict.update({
                where: { id: conflict.id },
                data: {
                  resolved: true,
                  resolvedBy: userId || 'batch-auto',
                  resolvedAt: new Date(),
                  resolutionAction: 'auto_room_change',
                  rollbackData: JSON.stringify({ scheduleId: schedule.id, previousValues: { roomId: oldRoomId } }),
                },
              });

              resolved = true;
              results.resolved++;
              results.details.push({ 
                conflictId: conflict.id, 
                status: 'resolved', 
                message: `Moved ${schedule.subject?.subjectCode} to room ${altRoom.roomName}` 
              });
            }
          }
        }

        if (!resolved) {
          results.failed++;
          results.details.push({ conflictId: conflict.id, status: 'failed', message: 'No suitable resolution found' });
        }
      } catch (error) {
        console.error(`Error resolving conflict ${conflict.id}:`, error);
        results.failed++;
        results.details.push({ conflictId: conflict.id, status: 'error', message: String(error) });
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    console.error('Error in batch resolution:', error);
    return NextResponse.json(
      { error: 'Failed to batch resolve conflicts' },
      { status: 500 }
    );
  }
}
