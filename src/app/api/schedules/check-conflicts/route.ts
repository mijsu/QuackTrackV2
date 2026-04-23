import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

interface Conflict {
  type: string;
  severity: 'critical' | 'warning' | 'info';
  description: string;
  conflictingSchedule: {
    id: string;
    subject?: { subjectCode: string; subjectName: string } | null;
    faculty?: { name: string } | null;
    room?: { roomName: string } | null;
    section?: { sectionName: string } | null;
    day: string;
    startTime: string;
    endTime: string;
  } | null;
}

interface AvailableSlot {
  day: string;
  startTime: string;
  endTime: string;
  score: number;
  reasons: string[];
}

// POST /api/schedules/check-conflicts
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      facultyId, 
      roomId, 
      sectionId, 
      day, 
      startTime, 
      endTime,
      excludeScheduleId 
    } = body;

    const conflicts: Conflict[] = [];

    // Time overlap helper
    const timesOverlap = (s1: string, e1: string, s2: string, e2: string) => {
      return s1 < e2 && e1 > s2;
    };

    // Check faculty double booking
    if (facultyId && day && startTime && endTime) {
      const facultySchedules = await db.schedule.findMany({
        where: {
          facultyId,
          day,
          ...(excludeScheduleId && { id: { not: excludeScheduleId } }),
        },
        include: {
          subject: { select: { subjectCode: true, subjectName: true } },
          room: { select: { roomName: true } },
          section: { select: { sectionName: true } },
        },
      });

      for (const s of facultySchedules) {
        if (timesOverlap(startTime, endTime, s.startTime, s.endTime)) {
          conflicts.push({
            type: 'faculty_double_booking',
            severity: 'critical',
            description: `Faculty is already scheduled for ${s.subject?.subjectCode || 'another class'} at this time`,
            conflictingSchedule: {
              id: s.id,
              subject: s.subject,
              room: s.room,
              section: s.section,
              day: s.day,
              startTime: s.startTime,
              endTime: s.endTime,
            },
          });
        }
      }
    }

    // Check room double booking
    if (roomId && day && startTime && endTime) {
      const roomSchedules = await db.schedule.findMany({
        where: {
          roomId,
          day,
          ...(excludeScheduleId && { id: { not: excludeScheduleId } }),
        },
        include: {
          subject: { select: { subjectCode: true, subjectName: true } },
          faculty: { select: { name: true } },
          section: { select: { sectionName: true } },
        },
      });

      for (const s of roomSchedules) {
        if (timesOverlap(startTime, endTime, s.startTime, s.endTime)) {
          conflicts.push({
            type: 'room_double_booking',
            severity: 'critical',
            description: `Room is already booked by ${s.faculty?.name || 'another faculty'} for ${s.subject?.subjectCode || 'a class'}`,
            conflictingSchedule: {
              id: s.id,
              subject: s.subject,
              faculty: s.faculty,
              section: s.section,
              day: s.day,
              startTime: s.startTime,
              endTime: s.endTime,
            },
          });
        }
      }
    }

    // Check section overlap
    if (sectionId && day && startTime && endTime) {
      const sectionSchedules = await db.schedule.findMany({
        where: {
          sectionId,
          day,
          ...(excludeScheduleId && { id: { not: excludeScheduleId } }),
        },
        include: {
          subject: { select: { subjectCode: true, subjectName: true } },
          faculty: { select: { name: true } },
          room: { select: { roomName: true } },
        },
      });

      for (const s of sectionSchedules) {
        if (timesOverlap(startTime, endTime, s.startTime, s.endTime)) {
          conflicts.push({
            type: 'section_overlap',
            severity: 'critical',
            description: `Section already has ${s.subject?.subjectCode || 'a class'} with ${s.faculty?.name || 'another faculty'} at this time`,
            conflictingSchedule: {
              id: s.id,
              subject: s.subject,
              faculty: s.faculty,
              room: s.room,
              day: s.day,
              startTime: s.startTime,
              endTime: s.endTime,
            },
          });
        }
      }
    }

    return NextResponse.json({ conflicts });
  } catch (error) {
    console.error('Error checking conflicts:', error);
    return NextResponse.json({ error: 'Failed to check conflicts', conflicts: [] }, { status: 500 });
  }
}

// GET /api/schedules/check-conflicts - Get available slots
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const facultyId = searchParams.get('facultyId');
    const roomId = searchParams.get('roomId');
    const sectionId = searchParams.get('sectionId');
    const duration = parseInt(searchParams.get('duration') || '3', 10); // Duration in hours
    const excludeScheduleId = searchParams.get('excludeScheduleId');
    const preferredDay = searchParams.get('day');

    const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const availableSlots: AvailableSlot[] = [];

    // Time overlap helper
    const timesOverlap = (s1: string, e1: string, s2: string, e2: string) => {
      return s1 < e2 && e1 > s2;
    };

    // Generate time slots (30-minute increments from 7:00 to 21:00)
    const generateTimeSlots = (durationHours: number) => {
      const slots: { start: string; end: string }[] = [];
      const durationMinutes = durationHours * 60;
      
      for (let minutes = 7 * 60; minutes <= 21 * 60 - durationMinutes; minutes += 30) {
        const startHour = Math.floor(minutes / 60);
        const startMin = minutes % 60;
        const endMinutes = minutes + durationMinutes;
        const endHour = Math.floor(endMinutes / 60);
        const endMin = endMinutes % 60;
        
        slots.push({
          start: `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}`,
          end: `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`,
        });
      }
      return slots;
    };

    const timeSlots = generateTimeSlots(duration);

    // Get all existing schedules for the resources
    const [facultySchedules, roomSchedules, sectionSchedules] = await Promise.all([
      facultyId ? db.schedule.findMany({
        where: {
          facultyId,
          ...(excludeScheduleId && { id: { not: excludeScheduleId } }),
        },
      }) : [],
      roomId ? db.schedule.findMany({
        where: {
          roomId,
          ...(excludeScheduleId && { id: { not: excludeScheduleId } }),
        },
      }) : [],
      sectionId ? db.schedule.findMany({
        where: {
          sectionId,
          ...(excludeScheduleId && { id: { not: excludeScheduleId } }),
        },
      }) : [],
    ]);

    // Check each slot for availability
    for (const day of DAYS) {
      // If preferred day is specified, check it first and give higher priority
      const dayPriority = preferredDay && day === preferredDay ? 1 : 0;

      for (const slot of timeSlots) {
        let isAvailable = true;

        // Check faculty availability
        if (facultyId) {
          for (const s of facultySchedules) {
            if (s.day === day && timesOverlap(slot.start, slot.end, s.startTime, s.endTime)) {
              isAvailable = false;
              break;
            }
          }
          if (!isAvailable) continue;
        }

        // Check room availability
        if (roomId) {
          for (const s of roomSchedules) {
            if (s.day === day && timesOverlap(slot.start, slot.end, s.startTime, s.endTime)) {
              isAvailable = false;
              break;
            }
          }
          if (!isAvailable) continue;
        }

        // Check section availability
        if (sectionId) {
          for (const s of sectionSchedules) {
            if (s.day === day && timesOverlap(slot.start, slot.end, s.startTime, s.endTime)) {
              isAvailable = false;
              break;
            }
          }
          if (!isAvailable) continue;
        }

        if (isAvailable) {
          // Calculate score based on time quality
          const startHour = parseInt(slot.start.split(':')[0]);
          let score = 100;
          const reasons: string[] = [];

          // Prefer morning to early afternoon (8 AM - 4 PM)
          if (startHour >= 8 && startHour <= 14) {
            score += 20;
            reasons.push('Prime time slot');
          } else if (startHour >= 7 && startHour <= 16) {
            score += 10;
            reasons.push('Good time slot');
          } else {
            reasons.push('Early morning or late afternoon');
          }

          // Bonus for preferred day
          if (dayPriority) {
            score += 30;
            reasons.push('Same day as original');
          }

          availableSlots.push({
            day,
            startTime: slot.start,
            endTime: slot.end,
            score,
            reasons,
          });
        }
      }
    }

    // Sort by score (descending) and limit results
    availableSlots.sort((a, b) => b.score - a.score);
    const topSlots = availableSlots.slice(0, 20);

    return NextResponse.json({ 
      availableSlots: topSlots,
      totalAvailable: availableSlots.length,
    });
  } catch (error) {
    console.error('Error getting available slots:', error);
    return NextResponse.json({ error: 'Failed to get available slots', availableSlots: [] }, { status: 500 });
  }
}
