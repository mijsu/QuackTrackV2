import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { DAYS } from '@/types';

// GET /api/reminders - Preview upcoming classes that would get reminders
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin can preview all reminders
    const isAdmin = session.user.role === 'admin';

    // Check if schedule_reminders is enabled
    const remindersSetting = await db.systemSetting.findUnique({
      where: { key: 'schedule_reminders' },
    });

    const remindersEnabled = remindersSetting?.value === 'true';

    // Get current day and time
    const now = new Date();
    const currentDay = DAYS[now.getDay() === 0 ? 6 : now.getDay() - 1]; // Adjust for Monday start
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

    // Get hours ahead parameter (default 2 hours)
    const { searchParams } = new URL(request.url);
    const hoursAhead = parseInt(searchParams.get('hours') || '2');

    // Calculate time range
    const currentMinutes = parseInt(currentTime.split(':')[0]) * 60 + parseInt(currentTime.split(':')[1]);
    const endMinutes = currentMinutes + (hoursAhead * 60);
    const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;

    // Fetch active semester
    const activeSemesterSetting = await db.systemSetting.findUnique({
      where: { key: 'semester' },
    });
    const activeSemester = activeSemesterSetting?.value || '1st Semester';

    // Build filter for schedules
    const scheduleFilter: { facultyId?: string; semester: string; day: string } = {
      semester: activeSemester,
      day: currentDay,
    };

    // Faculty can only see their own reminders
    if (!isAdmin) {
      scheduleFilter.facultyId = session.user.id;
    }

    // Fetch schedules for today within the time range
    const upcomingSchedules = await db.schedule.findMany({
      where: {
        ...scheduleFilter,
        startTime: {
          gte: currentTime,
          lte: endTime,
        },
      },
      include: {
        subject: true,
        faculty: true,
        room: true,
        section: true,
      },
      orderBy: { startTime: 'asc' },
    });

    return NextResponse.json({
      remindersEnabled,
      currentDay,
      currentTime,
      hoursAhead,
      upcomingClasses: upcomingSchedules.map(s => ({
        id: s.id,
        subject: s.subject.subjectName,
        subjectCode: s.subject.subjectCode,
        faculty: s.faculty.name,
        facultyEmail: s.faculty.email,
        room: s.room.roomName,
        section: s.section.sectionName,
        startTime: s.startTime,
        endTime: s.endTime,
      })),
      total: upcomingSchedules.length,
    });
  } catch (error) {
    console.error('Error fetching reminders preview:', error);
    return NextResponse.json({ error: 'Failed to fetch reminders preview' }, { status: 500 });
  }
}

// POST /api/reminders - Send reminders for upcoming classes
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin can trigger reminders
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied. Admin only.' }, { status: 403 });
    }

    // Check if schedule_reminders is enabled
    const remindersSetting = await db.systemSetting.findUnique({
      where: { key: 'schedule_reminders' },
    });

    if (remindersSetting?.value !== 'true') {
      return NextResponse.json({ 
        error: 'Schedule reminders are disabled',
        hint: 'Enable schedule_reminders in System Settings to send reminders'
      }, { status: 400 });
    }

    const body = await request.json();
    const hoursAhead = body.hoursAhead || 2; // Default 2 hours ahead

    // Get current day and time
    const now = new Date();
    const currentDay = DAYS[now.getDay() === 0 ? 6 : now.getDay() - 1]; // Adjust for Monday start
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

    // Calculate time range
    const currentMinutes = parseInt(currentTime.split(':')[0]) * 60 + parseInt(currentTime.split(':')[1]);
    const endMinutes = currentMinutes + (hoursAhead * 60);
    const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;

    // Fetch active semester
    const activeSemesterSetting = await db.systemSetting.findUnique({
      where: { key: 'semester' },
    });
    const activeSemester = activeSemesterSetting?.value || '1st Semester';

    // Fetch schedules for today within the time range
    const upcomingSchedules = await db.schedule.findMany({
      where: {
        semester: activeSemester,
        day: currentDay,
        startTime: {
          gte: currentTime,
          lte: endTime,
        },
      },
      include: {
        subject: true,
        faculty: true,
        room: true,
        section: true,
      },
      orderBy: { startTime: 'asc' },
    });

    // Group by faculty
    const facultySchedules = new Map<string, typeof upcomingSchedules>();
    
    for (const schedule of upcomingSchedules) {
      const facultyId = schedule.facultyId;
      if (!facultySchedules.has(facultyId)) {
        facultySchedules.set(facultyId, []);
      }
      facultySchedules.get(facultyId)!.push(schedule);
    }

    // Send reminders to each faculty
    let sentCount = 0;
    let errorCount = 0;
    const results: Array<{ faculty: string; email: string; success: boolean; error?: string }> = [];

    for (const [facultyId, schedules] of facultySchedules) {
      const faculty = schedules[0].faculty;
      
      // Build email content
      const scheduleList = schedules.map(s => 
        `<tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${s.startTime} - ${s.endTime}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${s.subject.subjectCode}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${s.subject.subjectName}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${s.room.roomName}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${s.section.sectionName}</td>
        </tr>`
      ).join('');

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          </style>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0;">📅 Class Reminder</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
            <p>Hello <strong>${faculty.name}</strong>,</p>
            <p>This is a reminder that you have <strong>${schedules.length}</strong> upcoming class(es) today:</p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: white; border-radius: 8px; overflow: hidden;">
              <thead>
                <tr style="background: #f3f4f6;">
                  <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e5e7eb;">Time</th>
                  <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e5e7eb;">Code</th>
                  <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e5e7eb;">Subject</th>
                  <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e5e7eb;">Room</th>
                  <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e5e7eb;">Section</th>
                </tr>
              </thead>
              <tbody>
                ${scheduleList}
              </tbody>
            </table>
            
            <p style="color: #6b7280; font-size: 14px;">
              This is an automated reminder from QuackTrack - Pateros Technological College
            </p>
          </div>
        </body>
        </html>
      `;

      // Get faculty's personal email if available, otherwise use institutional email
      const emailTo = faculty.personalEmail || faculty.email;

      const result = await sendEmail({
        to: emailTo,
        subject: `📅 Class Reminder: ${schedules.length} upcoming class(es) today`,
        html,
      });

      if (result.success) {
        sentCount++;
        results.push({ faculty: faculty.name, email: emailTo, success: true });
      } else {
        errorCount++;
        results.push({ faculty: faculty.name, email: emailTo, success: false, error: result.error });
      }
    }

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'send_reminders',
        entity: 'reminder',
        details: JSON.stringify({
          sentCount,
          errorCount,
          hoursAhead,
          currentDay,
          currentTime,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Sent ${sentCount} reminder(s), ${errorCount} error(s)`,
      sentCount,
      errorCount,
      results,
    });
  } catch (error) {
    console.error('Error sending reminders:', error);
    return NextResponse.json({ error: 'Failed to send reminders' }, { status: 500 });
  }
}
