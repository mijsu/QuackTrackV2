import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

interface ResolutionOption {
  id: string;
  type: 'move_time' | 'move_room' | 'swap' | 'delete';
  scheduleId: string;
  scheduleLabel: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  newValue: Record<string, unknown>;
  currentValue: Record<string, unknown>;
  score: number; // Higher is better
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin' && session.user.role !== 'faculty') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { conflictId } = body;

    // Get conflict details
    const conflict = await db.conflict.findUnique({
      where: { id: conflictId },
    });

    if (!conflict) {
      return NextResponse.json({ error: 'Conflict not found' }, { status: 404 });
    }

    const resolutionOptions: ResolutionOption[] = [];

    // Get schedules involved
    const scheduleIds = [conflict.scheduleId1, conflict.scheduleId2].filter(Boolean) as string[];
    const schedules = await db.schedule.findMany({
      where: { id: { in: scheduleIds } },
      include: {
        subject: true,
        faculty: true,
        room: true,
        section: true,
      },
    });

    const scheduleMap = new Map(schedules.map(s => [s.id, s]));

    // Get all rooms and schedules for availability checking
    const [rooms, allSchedules] = await Promise.all([
      db.room.findMany({ where: { isActive: true } }),
      db.schedule.findMany({
        where: { id: { notIn: scheduleIds } },
        include: { subject: true },
      }),
    ]);

    // Time slots to check
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const timeSlots = [];
    for (let hour = 7; hour <= 20; hour++) {
      timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
    }

    // Helper function to check if a slot is available
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

        // Check conflicts
        if (facultyId && s.facultyId === facultyId) return true;
        if (roomId && s.roomId === roomId) return true;
        if (sectionId && s.sectionId === sectionId) return true;

        return false;
      });
    };

    // Generate resolution options based on conflict type
    switch (conflict.type) {
      case 'faculty_double_booking':
      case 'room_double_booking':
      case 'section_overlap': {
        // For each conflicting schedule, find alternative time slots
        for (const scheduleId of scheduleIds) {
          const schedule = scheduleMap.get(scheduleId);
          if (!schedule) continue;

          const duration = parseInt(schedule.endTime.split(':')[0]) - parseInt(schedule.startTime.split(':')[0]);
          const subject = schedule.subject;
          const faculty = schedule.faculty;
          const room = schedule.room;
          const section = schedule.section;

          // Find alternative time slots on different days
          for (const day of days) {
            for (const startTime of timeSlots) {
              const startHour = parseInt(startTime.split(':')[0]);
              const endHour = startHour + duration;
              if (endHour > 21) continue; // Don't go past 9 PM

              const endTime = `${endHour.toString().padStart(2, '0')}:00`;

              // Check if this slot works
              const facultyAvailable = isSlotAvailable(
                scheduleIds,
                faculty?.id,
                undefined,
                undefined,
                day,
                startTime,
                endTime
              );

              const roomAvailable = isSlotAvailable(
                scheduleIds,
                undefined,
                room?.id,
                undefined,
                day,
                startTime,
                endTime
              );

              const sectionAvailable = isSlotAvailable(
                scheduleIds,
                undefined,
                undefined,
                section?.id,
                day,
                startTime,
                endTime
              );

              if (facultyAvailable && roomAvailable && sectionAvailable) {
                // Calculate score based on time quality
                let score = 50;
                
                // Prefer morning/afternoon over evening
                if (startHour >= 8 && startHour <= 16) score += 20;
                else if (startHour >= 7 && startHour <= 17) score += 10;
                
                // Prefer not changing day if possible
                if (day === schedule.day) score += 15;
                
                // Prefer TTH or MWF patterns
                if (['Monday', 'Wednesday', 'Friday'].includes(day)) score += 5;
                if (['Tuesday', 'Thursday'].includes(day)) score += 5;

                resolutionOptions.push({
                  id: `move-${scheduleId}-${day}-${startTime}`,
                  type: 'move_time',
                  scheduleId,
                  scheduleLabel: `${subject?.subjectCode || 'Schedule'} (${faculty?.name || 'Unknown'})`,
                  description: `Move to ${day} ${startTime}-${endTime}`,
                  impact: day === schedule.day ? 'low' : 'medium',
                  newValue: { day, startTime, endTime },
                  currentValue: { 
                    day: schedule.day, 
                    startTime: schedule.startTime, 
                    endTime: schedule.endTime 
                  },
                  score,
                });
              }
            }
          }

          // Find alternative rooms (for room conflicts)
          if (conflict.type === 'room_double_booking') {
            for (const altRoom of rooms) {
              if (altRoom.id === schedule.roomId) continue;
              
              const roomAvailable = isSlotAvailable(
                scheduleIds,
                undefined,
                altRoom.id,
                undefined,
                schedule.day,
                schedule.startTime,
                schedule.endTime
              );

              if (roomAvailable && altRoom.capacity >= (section?.studentCount || 0)) {
                resolutionOptions.push({
                  id: `move-room-${scheduleId}-${altRoom.id}`,
                  type: 'move_room',
                  scheduleId,
                  scheduleLabel: `${subject?.subjectCode || 'Schedule'}`,
                  description: `Move to room ${altRoom.roomName} (capacity: ${altRoom.capacity})`,
                  impact: 'low',
                  newValue: { roomId: altRoom.id },
                  currentValue: { roomId: schedule.roomId, roomName: room?.roomName },
                  score: 60,
                });
              }
            }
          }
        }
        break;
      }

      case 'room_capacity_gap': {
        // Find larger rooms
        const schedule = scheduleMap.get(conflict.scheduleId1 || '');
        if (schedule?.section) {
          const requiredCapacity = schedule.section.studentCount;
          
          for (const altRoom of rooms) {
            if (altRoom.capacity >= requiredCapacity) {
              const roomAvailable = isSlotAvailable(
                scheduleIds,
                undefined,
                altRoom.id,
                undefined,
                schedule.day,
                schedule.startTime,
                schedule.endTime
              );

              if (roomAvailable) {
                resolutionOptions.push({
                  id: `move-room-capacity-${altRoom.id}`,
                  type: 'move_room',
                  scheduleId: schedule.id,
                  scheduleLabel: schedule.subject?.subjectCode || 'Schedule',
                  description: `Move to ${altRoom.roomName} (capacity: ${altRoom.capacity})`,
                  impact: 'low',
                  newValue: { roomId: altRoom.id },
                  currentValue: { roomId: schedule.roomId, roomName: schedule.room?.roomName },
                  score: 80,
                });
              }
            }
          }
        }
        break;
      }
    }

    // Sort by score and limit results
    resolutionOptions.sort((a, b) => b.score - a.score);
    const topOptions = resolutionOptions.slice(0, 10);

    return NextResponse.json({ 
      options: topOptions,
      hasAutoResolve: topOptions.length > 0,
    });
  } catch (error) {
    console.error('Error generating resolution suggestions:', error);
    return NextResponse.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}
