import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { notifyScheduleChange } from '@/lib/notification-client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const schedule = await db.schedule.findUnique({
      where: { id },
      include: {
        subject: { include: { program: { include: { department: true } } } },
        faculty: { include: { department: true } },
        section: { include: { department: true, program: true } },
        room: true,
      },
    });

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    // Faculty can only view their own schedules
    if (session.user.role === 'faculty' && schedule.facultyId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json(schedule);
  } catch (error) {
    console.error('Error fetching schedule:', error);
    return NextResponse.json({ error: 'Failed to fetch schedule' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = session.user.role === 'admin';
    const isDeptHead = session.user.role === 'department_head';

    if (!isAdmin && !isDeptHead) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { subjectId, facultyId, sectionId, roomId, day, startTime, endTime, status, reason } = body;

    // Get old schedule for logging
    const oldSchedule = await db.schedule.findUnique({
      where: { id },
      include: { subject: true, faculty: true, section: true, room: true },
    });

    if (!oldSchedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    // Department heads can only update schedules in their department
    if (isDeptHead && !isAdmin) {
      const section = await db.section.findUnique({ where: { id: oldSchedule.sectionId } });
      if (!section || section.departmentId !== session.user.departmentId) {
        return NextResponse.json({ error: 'You can only update schedules in your department' }, { status: 403 });
      }
    }

    // Update schedule
    const schedule = await db.schedule.update({
      where: { id },
      data: {
        subjectId: subjectId !== undefined ? subjectId : oldSchedule.subjectId,
        facultyId: facultyId !== undefined ? facultyId : oldSchedule.facultyId,
        sectionId: sectionId !== undefined ? sectionId : oldSchedule.sectionId,
        roomId: roomId !== undefined ? roomId : oldSchedule.roomId,
        day: day !== undefined ? day : oldSchedule.day,
        startTime: startTime !== undefined ? startTime : oldSchedule.startTime,
        endTime: endTime !== undefined ? endTime : oldSchedule.endTime,
        status: status || 'modified',
      },
      include: {
        subject: true,
        faculty: true,
        section: true,
        room: true,
      },
    });

    // Create schedule log
    await db.scheduleLog.create({
      data: {
        scheduleId: id,
        modifiedBy: session.user.id,
        oldValue: JSON.stringify(oldSchedule),
        newValue: JSON.stringify(schedule),
        action: 'modified',
        reason,
      },
    });

    // Notify faculty if changed via database notification
    if (facultyId && facultyId !== oldSchedule.facultyId) {
      await db.notification.create({
        data: {
          userId: facultyId,
          title: 'Schedule Updated',
          message: `You have been assigned to ${schedule.subject?.subjectName} on ${schedule.day} (${schedule.startTime} - ${schedule.endTime})`,
          type: 'info',
        },
      });
    }

    // Send real-time notification for schedule update
    const effectiveFacultyId = facultyId || oldSchedule.facultyId;
    if (effectiveFacultyId) {
      notifyScheduleChange(
        effectiveFacultyId,
        'updated',
        schedule.subject?.subjectName || 'Unknown Subject',
        schedule.day,
        `${schedule.startTime} - ${schedule.endTime}`
      );
    }

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'update',
        entity: 'schedule',
        entityId: id,
        details: JSON.stringify({ oldSchedule, newSchedule: schedule }),
        previousState: JSON.stringify({ day: oldSchedule.day, startTime: oldSchedule.startTime, endTime: oldSchedule.endTime, roomId: oldSchedule.roomId, facultyId: oldSchedule.facultyId }),
        newState: JSON.stringify({ day: schedule.day, startTime: schedule.startTime, endTime: schedule.endTime, roomId: schedule.roomId, facultyId: schedule.facultyId }),
        canUndo: true,
      },
    });

    return NextResponse.json(schedule);
  } catch (error) {
    console.error('Error updating schedule:', error);
    return NextResponse.json({ error: 'Failed to update schedule' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = session.user.role === 'admin';
    const isDeptHead = session.user.role === 'department_head';

    if (!isAdmin && !isDeptHead) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { id } = await params;

    // Get schedule for logging
    const schedule = await db.schedule.findUnique({
      where: { id },
      include: { subject: true, faculty: true },
    });

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    // Department heads can only delete schedules in their department
    if (isDeptHead && !isAdmin) {
      const section = await db.section.findUnique({ where: { id: schedule.sectionId } });
      if (!section || section.departmentId !== session.user.departmentId) {
        return NextResponse.json({ error: 'You can only delete schedules in your department' }, { status: 403 });
      }
    }

    // Create schedule log before deletion
    await db.scheduleLog.create({
      data: {
        scheduleId: id,
        modifiedBy: session.user.id,
        oldValue: JSON.stringify(schedule),
        newValue: '{}',
        action: 'deleted',
      },
    });

    // Delete related conflicts
    await db.conflict.deleteMany({
      where: {
        OR: [{ scheduleId1: id }, { scheduleId2: id }],
      },
    });

    // Delete schedule
    await db.schedule.delete({ where: { id } });

    // Notify faculty via database notification
    if (schedule.facultyId) {
      await db.notification.create({
        data: {
          userId: schedule.facultyId,
          title: 'Schedule Removed',
          message: `Your ${schedule.subject?.subjectName} class on ${schedule.day} has been removed`,
          type: 'warning',
        },
      });

      // Send real-time notification for schedule deletion
      notifyScheduleChange(
        schedule.facultyId,
        'deleted',
        schedule.subject?.subjectName || 'Unknown Subject',
        schedule.day,
        `${schedule.startTime} - ${schedule.endTime}`
      );
    }

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'delete',
        entity: 'schedule',
        entityId: id,
        previousState: JSON.stringify({ subjectId: schedule.subjectId, facultyId: schedule.facultyId, sectionId: schedule.sectionId, roomId: schedule.roomId, day: schedule.day, startTime: schedule.startTime, endTime: schedule.endTime }),
        canUndo: true,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    return NextResponse.json({ error: 'Failed to delete schedule' }, { status: 500 });
  }
}
