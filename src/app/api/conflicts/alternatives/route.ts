import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { DAYS, TIME_OPTIONS } from '@/types';

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

// GET /api/conflicts/alternatives - Get available alternatives for conflict resolution
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const scheduleId = searchParams.get('scheduleId');
    const type = searchParams.get('type'); // 'rooms', 'faculty', 'timeslots', or 'all'

    if (!scheduleId) {
      return NextResponse.json({ error: 'Schedule ID is required' }, { status: 400 });
    }

    // Get the schedule
    const schedule = await db.schedule.findUnique({
      where: { id: scheduleId },
      include: {
        subject: { include: { program: { include: { department: true } } } },
        faculty: true,
        room: true,
        section: { include: { department: true, program: true } },
      },
    });

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    const result: {
      rooms?: Array<{ id: string; roomName: string; building: string; capacity: number; available: boolean; conflictReason?: string }>;
      faculty?: Array<{ id: string; name: string; email: string; department: string; available: boolean; specialization: string[]; conflictReason?: string }>;
      timeSlots?: Array<{ day: string; startTime: string; endTime: string; available: boolean; conflictReason?: string }>;
    } = {};

    // Get all existing schedules for conflict checking
    const allSchedules = await db.schedule.findMany({
      where: {
        id: { not: scheduleId },
      },
      include: {
        faculty: { select: { id: true, name: true } },
        room: { select: { id: true, roomName: true } },
      },
    });

    // Get available rooms
    if (type === 'rooms' || type === 'all') {
      const allRooms = await db.room.findMany({
        where: { isActive: true },
        orderBy: [{ building: 'asc' }, { roomName: 'asc' }],
      });

      const sectionStudentCount = schedule.section?.studentCount || 0;

      result.rooms = allRooms.map(room => {
        // Check if room is available at this time
        const roomConflict = allSchedules.find(s => 
          s.roomId === room.id && 
          s.day === schedule.day &&
          timesOverlap(schedule.startTime, schedule.endTime, s.startTime, s.endTime)
        );

        const available = !roomConflict;
        let conflictReason: string | undefined;

        if (roomConflict) {
          conflictReason = `Occupied by ${roomConflict.subject?.subjectCode || 'another class'}`;
        } else if (room.capacity < sectionStudentCount) {
          conflictReason = `Capacity too small (${room.capacity} < ${sectionStudentCount} students)`;
        }

        return {
          id: room.id,
          roomName: room.roomName,
          building: room.building,
          capacity: room.capacity,
          available,
          conflictReason,
        };
      });
    }

    // Get available faculty
    if (type === 'faculty' || type === 'all') {
      const subjectRequiredSpecs = schedule.subject?.requiredSpecialization 
        ? JSON.parse(schedule.subject.requiredSpecialization) 
        : [];

      const allFaculty = await db.user.findMany({
        where: {
          role: 'faculty',
        },
        include: {
          department: { select: { name: true } },
          preferences: true,
          _count: { select: { schedules: true } },
        },
      });

      result.faculty = allFaculty.map(faculty => {
        const facultySpecs = faculty.specialization 
          ? JSON.parse(faculty.specialization) 
          : [];

        // Check if faculty has required specialization
        const hasRequiredSpec = subjectRequiredSpecs.length === 0 || 
          subjectRequiredSpecs.some((spec: string) => facultySpecs.includes(spec));

        // Check if faculty is available at this time
        const facultyConflict = allSchedules.find(s => 
          s.facultyId === faculty.id && 
          s.day === schedule.day &&
          timesOverlap(schedule.startTime, schedule.endTime, s.startTime, s.endTime)
        );

        // Check if day is in unavailable days
        const unavailableDays = faculty.preferences?.unavailableDays 
          ? JSON.parse(faculty.preferences.unavailableDays) 
          : [];
        const isDayUnavailable = unavailableDays.includes(schedule.day);

        const available = !facultyConflict && !isDayUnavailable && hasRequiredSpec;
        let conflictReason: string | undefined;

        if (facultyConflict) {
          conflictReason = `Has another class at this time`;
        } else if (isDayUnavailable) {
          conflictReason = `Not available on ${schedule.day}`;
        } else if (!hasRequiredSpec) {
          conflictReason = `Missing required specialization`;
        }

        return {
          id: faculty.id,
          name: faculty.name,
          email: faculty.email,
          department: faculty.department?.name || 'Unassigned',
          available,
          specialization: facultySpecs,
          conflictReason,
        };
      });
    }

    // Get available time slots
    if (type === 'timeslots' || type === 'all') {
      result.timeSlots = [];

      for (const day of DAYS) {
        for (let i = 0; i < TIME_OPTIONS.length - 1; i++) {
          const startTime = TIME_OPTIONS[i].value;
          const endTime = TIME_OPTIONS[i + 1].value;

          // Check if current schedule's room, faculty, and section are available
          const roomConflict = allSchedules.find(s => 
            s.roomId === schedule.roomId && 
            s.day === day &&
            timesOverlap(startTime, endTime, s.startTime, s.endTime)
          );

          const facultyConflict = allSchedules.find(s => 
            s.facultyId === schedule.facultyId && 
            s.day === day &&
            timesOverlap(startTime, endTime, s.startTime, s.endTime)
          );

          const sectionConflict = allSchedules.find(s => 
            s.sectionId === schedule.sectionId && 
            s.day === day &&
            timesOverlap(startTime, endTime, s.startTime, s.endTime)
          );

          const available = !roomConflict && !facultyConflict && !sectionConflict;
          let conflictReason: string | undefined;

          if (roomConflict) {
            conflictReason = `Room occupied`;
          } else if (facultyConflict) {
            conflictReason = `Faculty has another class`;
          } else if (sectionConflict) {
            conflictReason = `Section has another class`;
          }

          // Only show time slots that are available or have conflicts
          result.timeSlots.push({
            day,
            startTime,
            endTime,
            available,
            conflictReason,
          });
        }
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching alternatives:', error);
    return NextResponse.json({ error: 'Failed to fetch alternatives' }, { status: 500 });
  }
}
