import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { notifyScheduleChange } from '@/lib/notification-client';
import { sendEmail } from '@/lib/email';

// GET /api/schedules
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get('departmentId');
    const facultyId = searchParams.get('facultyId');
    const sectionId = searchParams.get('sectionId');
    const roomId = searchParams.get('roomId');
    const day = searchParams.get('day');
    const semesterParam = searchParams.get('semester');
    const classType = searchParams.get('classType');

    // Role-based filtering
    const isFaculty = session.user.role === 'faculty';
    const isAdmin = session.user.role === 'admin';

    // Faculty can ONLY see their own schedules - ignore any facultyId param
    // This is a security measure to ensure faculty can't see other faculty's schedules
    const filterFacultyId = isFaculty ? session.user.id : facultyId;

    // =========================================================================
    // FETCH ACTIVE SEMESTER FROM SYSTEM SETTINGS (if no semester param provided)
    // =========================================================================
    let activeSemester = semesterParam;
    if (!activeSemester) {
      const activeSemesterSetting = await db.systemSetting.findUnique({
        where: { key: 'semester' },
      });
      activeSemester = activeSemesterSetting?.value || '1st Semester';
    }

    const schedules = await db.schedule.findMany({
      where: {
        ...(departmentId && { section: { departmentId } }),
        ...(classType && { section: { classType } }),
        ...(filterFacultyId && { facultyId: filterFacultyId }),
        ...(sectionId && { sectionId }),
        ...(roomId && { roomId }),
        ...(day && { day }),
        semester: activeSemester, // Filter by active semester
      },
      include: {
        subject: { include: { program: { include: { department: true } } } },
        faculty: { include: { department: true } },
        section: { include: { department: true, program: true } },
        room: true,
      },
      orderBy: [{ day: 'asc' }, { startTime: 'asc' }],
    });

    return NextResponse.json(schedules);
  } catch (error) {
    console.error('Error fetching schedules:', error);
    return NextResponse.json({ error: 'Failed to fetch schedules' }, { status: 500 });
  }
}

// POST /api/schedules
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin can create schedules
    const isAdmin = session.user.role === 'admin';
    
    if (!isAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const { subjectId, facultyId, sectionId, roomId, day, startTime, endTime } = body;

    if (!subjectId || !facultyId || !sectionId || !day || !startTime || !endTime) {
      return NextResponse.json({ error: 'Required fields missing (subjectId, facultyId, sectionId, day, startTime, endTime)' }, { status: 400 });
    }

    // Validate time format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return NextResponse.json({ error: 'Invalid time format. Use HH:MM format.' }, { status: 400 });
    }

    if (startTime >= endTime) {
      return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 });
    }

    // =========================================================================
    // FETCH ACTIVE SEMESTER AND ACADEMIC YEAR FROM SYSTEM SETTINGS
    // =========================================================================
    const activeSemesterSetting = await db.systemSetting.findUnique({
      where: { key: 'semester' },
    });
    const activeSemester = activeSemesterSetting?.value || '1st Semester';

    const activeAYSetting = await db.systemSetting.findUnique({
      where: { key: 'academic_year' },
    });
    const activeAcademicYear = activeAYSetting?.value || '2024-2025';

    // Check for conflicts (only check room conflicts if roomId is provided)
    const conflicts = await checkConflicts(facultyId, roomId || null, sectionId, day, startTime, endTime, undefined, activeSemester);

    // Create schedule
    const schedule = await db.schedule.create({
      data: {
        subjectId,
        facultyId,
        sectionId,
        roomId: roomId || null,
        day,
        startTime,
        endTime,
        semester: activeSemester,
        academicYear: activeAcademicYear,
        status: conflicts.length > 0 ? 'conflict' : 'approved',
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
        scheduleId: schedule.id,
        modifiedBy: session.user.id,
        oldValue: '{}',
        newValue: JSON.stringify(schedule),
        action: 'created',
      },
    });

    // Create conflict records
    for (const conflict of conflicts) {
      await db.conflict.create({
        data: {
          type: conflict.type,
          scheduleId1: schedule.id,
          scheduleId2: conflict.conflictingScheduleId,
          description: conflict.description,
          severity: 'warning',
        },
      });
    }

    // Notify faculty via database notification
    await db.notification.create({
      data: {
        userId: facultyId,
        title: 'New Schedule Assignment',
        message: `You have been assigned to ${schedule.subject?.subjectName} on ${day} (${startTime} - ${endTime})`,
        type: conflicts.length > 0 ? 'warning' : 'info',
        actionUrl: 'calendar',
      },
    });

    // Send real-time notification to faculty
    notifyScheduleChange(
      facultyId,
      'created',
      schedule.subject?.subjectName || 'Unknown Subject',
      day,
      `${startTime} - ${endTime}`
    );

    // Send email notification if enabled
    try {
      const emailNotificationsSetting = await db.systemSetting.findUnique({
        where: { key: 'email_notifications' },
      });
      
      if (emailNotificationsSetting?.value === 'true') {
        const faculty = await db.user.findUnique({
          where: { id: facultyId },
        });
        
        if (faculty && (faculty.personalEmail || faculty.email)) {
          await sendEmail({
            to: faculty.personalEmail || faculty.email,
            subject: `📅 New Schedule Assignment: ${schedule.subject?.subjectName}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #1e40af;">New Schedule Assignment</h2>
                <p>Hello ${faculty.name},</p>
                <p>You have been assigned to a new class:</p>
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                  <tr><td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong>Subject:</strong></td><td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${schedule.subject?.subjectName}</td></tr>
                  <tr><td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong>Day:</strong></td><td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${day}</td></tr>
                  <tr><td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong>Time:</strong></td><td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${startTime} - ${endTime}</td></tr>
                  <tr><td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong>Room:</strong></td><td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${schedule.room?.roomName}</td></tr>
                  <tr><td style="padding: 10px;"><strong>Section:</strong></td><td style="padding: 10px;">${schedule.section?.sectionName}</td></tr>
                </table>
                ${conflicts.length > 0 ? '<p style="color: #dc2626; background: #fef2f2; padding: 10px; border-radius: 5px;"><strong>⚠️ Warning:</strong> This schedule has conflicts that need resolution.</p>' : ''}
                <p style="color: #6b7280; font-size: 14px;">Please check your calendar for more details.</p>
              </div>
            `,
          });
        }
      }
    } catch (emailError) {
      console.error('Failed to send email notification:', emailError);
      // Don't fail the request if email fails
    }

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'create',
        entity: 'schedule',
        entityId: schedule.id,
        details: JSON.stringify({ subjectId, facultyId, sectionId, roomId, day, startTime, endTime }),
        canUndo: true,
      },
    });

    return NextResponse.json({
      ...schedule,
      conflicts,
    });
  } catch (error) {
    console.error('Error creating schedule:', error);
    return NextResponse.json({ error: 'Failed to create schedule' }, { status: 500 });
  }
}

// Helper function to check for conflicts
async function checkConflicts(
  facultyId: string,
  roomId: string | null,
  sectionId: string,
  day: string,
  startTime: string,
  endTime: string,
  excludeScheduleId?: string,
  semester?: string
) {
  const conflicts: Array<{
    type: string;
    conflictingScheduleId: string | null;
    description: string;
  }> = [];

  // Time overlap helper
  const timesOverlap = (s1: string, e1: string, s2: string, e2: string) => {
    return s1 < e2 && e1 > s2;
  };

  // Check faculty double booking
  const facultySchedules = await db.schedule.findMany({
    where: {
      facultyId,
      day,
      ...(semester && { semester }),
      ...(excludeScheduleId && { id: { not: excludeScheduleId } }),
    },
  });

  for (const s of facultySchedules) {
    if (timesOverlap(startTime, endTime, s.startTime, s.endTime)) {
      conflicts.push({
        type: 'faculty_double_booking',
        conflictingScheduleId: s.id,
        description: `Faculty is already scheduled for another class at this time`,
      });
    }
  }

  // Check room double booking (only if roomId is provided)
  if (roomId) {
    const roomSchedules = await db.schedule.findMany({
      where: {
        roomId,
        day,
        ...(semester && { semester }),
        ...(excludeScheduleId && { id: { not: excludeScheduleId } }),
      },
    });

    for (const s of roomSchedules) {
      if (timesOverlap(startTime, endTime, s.startTime, s.endTime)) {
        conflicts.push({
          type: 'room_double_booking',
          conflictingScheduleId: s.id,
          description: `Room is already booked at this time`,
        });
      }
    }
  }

  // Check section overlap
  const sectionSchedules = await db.schedule.findMany({
    where: {
      sectionId,
      day,
      ...(semester && { semester }),
      ...(excludeScheduleId && { id: { not: excludeScheduleId } }),
    },
  });

  for (const s of sectionSchedules) {
    if (timesOverlap(startTime, endTime, s.startTime, s.endTime)) {
      conflicts.push({
        type: 'section_overlap',
        conflictingScheduleId: s.id,
        description: `Section already has a class at this time`,
      });
    }
  }

  return conflicts;
}
