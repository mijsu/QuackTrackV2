import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { notifyScheduleChange } from '@/lib/notification-client';

// Types for workload analysis
interface FacultyWorkload {
  id: string;
  name: string;
  email: string;
  department?: string | null;
  maxUnits: number;
  totalUnits: number;
  utilizationPercent: number;
  hoursPerDay: Record<string, number>;
  unitsPerDay: Record<string, number>;
  scheduleCount: number;
  status: 'overloaded' | 'underloaded' | 'balanced';
  loadBalanceScore: number;
}

interface WorkloadSwap {
  scheduleId: string;
  subjectCode: string;
  subjectName: string;
  currentFacultyId: string;
  currentFacultyName: string;
  suggestedFacultyId: string;
  suggestedFacultyName: string;
  day: string;
  startTime: string;
  endTime: string;
  units: number;
  reason: string;
  impact: string;
}

interface WorkloadAnalysis {
  faculty: FacultyWorkload[];
  overloadedFaculty: FacultyWorkload[];
  underloadedFaculty: FacultyWorkload[];
  balancedFaculty: FacultyWorkload[];
  averageUtilization: number;
  totalSchedules: number;
  suggestedSwaps: WorkloadSwap[];
  dayDistribution: Record<string, { total: number; faculty: Record<string, number> }>;
}

// Days of the week
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// GET /api/workload - Analyze faculty workload distribution
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get('departmentId');

    // Get active semester
    const activeSemesterSetting = await db.systemSetting.findUnique({
      where: { key: 'semester' },
    });
    const activeSemester = activeSemesterSetting?.value || '1st Semester';

    // Fetch all faculty with their schedules
    const faculty = await db.user.findMany({
      where: {
        role: 'faculty',
        ...(departmentId && { departmentId }),
      },
      include: {
        department: true,
        schedules: {
          where: { semester: activeSemester },
          include: {
            subject: true,
          },
        },
      },
    });

    // Build workload analysis for each faculty
    const facultyWorkloads: FacultyWorkload[] = faculty.map((f) => {
      const hoursPerDay: Record<string, number> = {};
      const unitsPerDay: Record<string, number> = {};
      
      // Initialize all days
      DAYS.forEach((day) => {
        hoursPerDay[day] = 0;
        unitsPerDay[day] = 0;
      });

      let totalUnits = 0;
      let totalHours = 0;

      f.schedules.forEach((schedule) => {
        if (schedule.subject) {
          const units = schedule.subject.units;
          const hours = calculateHours(schedule.startTime, schedule.endTime);
          
          totalUnits += units;
          totalHours += hours;
          hoursPerDay[schedule.day] = (hoursPerDay[schedule.day] || 0) + hours;
          unitsPerDay[schedule.day] = (unitsPerDay[schedule.day] || 0) + units;
        }
      });

      const maxUnits = f.maxUnits || 24;
      const utilizationPercent = maxUnits > 0 ? Math.round((totalUnits / maxUnits) * 100) : 0;
      
      // Determine status
      let status: 'overloaded' | 'underloaded' | 'balanced' = 'balanced';
      if (totalUnits > maxUnits) {
        status = 'overloaded';
      } else if (totalUnits < 12) { // Less than half of default max units is considered underloaded
        status = 'underloaded';
      }

      // Calculate load balance score (how evenly distributed across days)
      const loadBalanceScore = calculateLoadBalanceScore(hoursPerDay);

      return {
        id: f.id,
        name: f.name,
        email: f.email,
        department: f.department?.name || null,
        maxUnits,
        totalUnits,
        utilizationPercent,
        hoursPerDay,
        unitsPerDay,
        scheduleCount: f.schedules.length,
        status,
        loadBalanceScore,
      };
    });

    // Separate faculty by status
    const overloadedFaculty = facultyWorkloads
      .filter((f) => f.status === 'overloaded')
      .sort((a, b) => b.utilizationPercent - a.utilizationPercent);
    
    const underloadedFaculty = facultyWorkloads
      .filter((f) => f.status === 'underloaded')
      .sort((a, b) => a.utilizationPercent - b.utilizationPercent);
    
    const balancedFaculty = facultyWorkloads
      .filter((f) => f.status === 'balanced')
      .sort((a, b) => b.utilizationPercent - a.utilizationPercent);

    // Calculate average utilization
    const totalUtilization = facultyWorkloads.reduce((sum, f) => sum + f.utilizationPercent, 0);
    const averageUtilization = facultyWorkloads.length > 0 
      ? Math.round(totalUtilization / facultyWorkloads.length) 
      : 0;

    // Calculate day distribution
    const dayDistribution: Record<string, { total: number; faculty: Record<string, number> }> = {};
    DAYS.forEach((day) => {
      dayDistribution[day] = { total: 0, faculty: {} };
    });

    facultyWorkloads.forEach((f) => {
      DAYS.forEach((day) => {
        const units = f.unitsPerDay[day] || 0;
        dayDistribution[day].total += units;
        if (units > 0) {
          dayDistribution[day].faculty[f.id] = units;
        }
      });
    });

    // Generate suggested swaps
    const suggestedSwaps = await generateSwapSuggestions(
      overloadedFaculty,
      underloadedFaculty,
      activeSemester,
      departmentId
    );

    const analysis: WorkloadAnalysis = {
      faculty: facultyWorkloads,
      overloadedFaculty,
      underloadedFaculty,
      balancedFaculty,
      averageUtilization,
      totalSchedules: facultyWorkloads.reduce((sum, f) => sum + f.scheduleCount, 0),
      suggestedSwaps,
      dayDistribution,
    };

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Error analyzing workload:', error);
    return NextResponse.json(
      { error: 'Failed to analyze workload' },
      { status: 500 }
    );
  }
}

// POST /api/workload - Auto-balance schedules
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can auto-balance
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const { swaps, dryRun = false } = body;

    if (!swaps || !Array.isArray(swaps) || swaps.length === 0) {
      return NextResponse.json(
        { error: 'No swaps provided' },
        { status: 400 }
      );
    }

    const results = [];
    const errors = [];

    for (const swap of swaps) {
      try {
        const { scheduleId, suggestedFacultyId } = swap;

        // Get the schedule to move
        const schedule = await db.schedule.findUnique({
          where: { id: scheduleId },
          include: { subject: true, faculty: true },
        });

        if (!schedule) {
          errors.push({ scheduleId, error: 'Schedule not found' });
          continue;
        }

        // Check for conflicts with new faculty
        const conflicts = await checkConflicts(
          suggestedFacultyId,
          schedule.roomId,
          schedule.sectionId,
          schedule.day,
          schedule.startTime,
          schedule.endTime,
          scheduleId
        );

        if (conflicts.length > 0) {
          errors.push({
            scheduleId,
            error: 'Would create conflicts',
            conflicts,
          });
          continue;
        }

        if (dryRun) {
          results.push({
            scheduleId,
            subjectCode: schedule.subject?.subjectCode,
            from: schedule.faculty?.name,
            to: (await db.user.findUnique({ where: { id: suggestedFacultyId } }))?.name,
            status: 'validated',
          });
        } else {
          // Perform the swap
          const previousFacultyId = schedule.facultyId;
          
          const updatedSchedule = await db.schedule.update({
            where: { id: scheduleId },
            data: {
              facultyId: suggestedFacultyId,
              status: 'modified',
            },
            include: {
              subject: true,
              faculty: true,
              room: true,
              section: true,
            },
          });

          // Log the change
          await db.scheduleLog.create({
            data: {
              scheduleId: scheduleId,
              modifiedBy: session.user.id,
              oldValue: JSON.stringify({ facultyId: previousFacultyId }),
              newValue: JSON.stringify({ facultyId: suggestedFacultyId }),
              action: 'modified',
              reason: 'Workload balancing',
            },
          });

          // Notify both faculty members
          await db.notification.create({
            data: {
              userId: previousFacultyId,
              title: 'Schedule Reassigned',
              message: `Your ${schedule.subject?.subjectName} class has been reassigned due to workload balancing.`,
              type: 'info',
            },
          });

          await db.notification.create({
            data: {
              userId: suggestedFacultyId,
              title: 'New Schedule Assignment',
              message: `You have been assigned to ${schedule.subject?.subjectName} due to workload balancing.`,
              type: 'info',
            },
          });

          // Real-time notification
          notifyScheduleChange(
            suggestedFacultyId,
            'modified',
            schedule.subject?.subjectName || 'Unknown Subject',
            schedule.day,
            `${schedule.startTime} - ${schedule.endTime}`
          );

          results.push({
            scheduleId,
            subjectCode: schedule.subject?.subjectCode,
            from: schedule.faculty?.name,
            to: updatedSchedule.faculty?.name,
            status: 'completed',
          });
        }
      } catch (swapError) {
        console.error('Error processing swap:', swapError);
        errors.push({ scheduleId: swap.scheduleId, error: 'Failed to process swap' });
      }
    }

    // Audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: dryRun ? 'workload_balance_preview' : 'workload_balance_apply',
        entity: 'schedule',
        details: JSON.stringify({ swaps: results, errors, dryRun }),
        canUndo: !dryRun,
      },
    });

    return NextResponse.json({
      success: true,
      dryRun,
      results,
      errors,
      summary: {
        total: swaps.length,
        successful: results.length,
        failed: errors.length,
      },
    });
  } catch (error) {
    console.error('Error auto-balancing workload:', error);
    return NextResponse.json(
      { error: 'Failed to auto-balance workload' },
      { status: 500 }
    );
  }
}

// Helper function to calculate hours from time strings
function calculateHours(startTime: string, endTime: string): number {
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  return (endH * 60 + endM - startH * 60 - startM) / 60;
}

// Helper function to calculate load balance score (0-100, 100 being perfectly balanced)
function calculateLoadBalanceScore(hoursPerDay: Record<string, number>): number {
  const hours = Object.values(hoursPerDay).filter((h) => h > 0);
  if (hours.length <= 1) return 100;

  const avg = hours.reduce((sum, h) => sum + h, 0) / hours.length;
  if (avg === 0) return 100;

  // Calculate variance
  const variance = hours.reduce((sum, h) => sum + Math.pow(h - avg, 2), 0) / hours.length;
  const stdDev = Math.sqrt(variance);
  
  // Coefficient of variation (lower is better)
  const cv = stdDev / avg;
  
  // Convert to score (0-100)
  return Math.max(0, Math.min(100, Math.round((1 - cv) * 100)));
}

// Helper function to generate swap suggestions
async function generateSwapSuggestions(
  overloadedFaculty: FacultyWorkload[],
  underloadedFaculty: FacultyWorkload[],
  semester: string,
  departmentId: string | null
): Promise<WorkloadSwap[]> {
  const swaps: WorkloadSwap[] = [];

  if (overloadedFaculty.length === 0 || underloadedFaculty.length === 0) {
    return swaps;
  }

  // Get schedules from overloaded faculty
  for (const overloaded of overloadedFaculty) {
    const schedules = await db.schedule.findMany({
      where: {
        facultyId: overloaded.id,
        semester,
      },
      include: {
        subject: true,
        faculty: true,
      },
    });

    for (const schedule of schedules) {
      if (!schedule.subject) continue;

      // Find best candidate from underloaded faculty
      const candidates = underloadedFaculty
        .filter((f) => f.utilizationPercent < 80) // Has capacity
        .sort((a, b) => a.utilizationPercent - b.utilizationPercent); // Lowest utilization first

      for (const candidate of candidates) {
        // Check if this swap would be beneficial
        const newOverloadUnits = overloaded.totalUnits - schedule.subject.units;
        const newCandidateUnits = candidate.totalUnits + schedule.subject.units;

        // Skip if it would overload the candidate
        if (newCandidateUnits > candidate.maxUnits) continue;

        // Skip if the overloaded faculty still has too much (try a bigger subject)
        if (newOverloadUnits > overloaded.maxUnits && overloaded.utilizationPercent - candidate.utilizationPercent > 30) continue;

        // Check for specialization match if subject requires it
        const subjectSpecs = schedule.subject.requiredSpecialization 
          ? JSON.parse(schedule.subject.requiredSpecialization || '[]') 
          : [];
        
        // Get candidate's specializations
        const candidateUser = await db.user.findUnique({
          where: { id: candidate.id },
          select: { specialization: true },
        });
        const candidateSpecs = candidateUser?.specialization 
          ? JSON.parse(candidateUser.specialization as string) 
          : [];

        // Check if candidate has required specialization
        const hasRequiredSpec = subjectSpecs.length === 0 || 
          subjectSpecs.some((spec: string) => candidateSpecs.includes(spec));

        if (!hasRequiredSpec) continue;

        // Check for potential conflicts
        const conflicts = await checkConflicts(
          candidate.id,
          schedule.roomId,
          schedule.sectionId,
          schedule.day,
          schedule.startTime,
          schedule.endTime,
          schedule.id
        );

        if (conflicts.length === 0) {
          swaps.push({
            scheduleId: schedule.id,
            subjectCode: schedule.subject.subjectCode,
            subjectName: schedule.subject.subjectName,
            currentFacultyId: overloaded.id,
            currentFacultyName: overloaded.name,
            suggestedFacultyId: candidate.id,
            suggestedFacultyName: candidate.name,
            day: schedule.day,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            units: schedule.subject.units,
            reason: `Move ${schedule.subject.units} units from overloaded (${overloaded.utilizationPercent}%) to underloaded (${candidate.utilizationPercent}%) faculty`,
            impact: `Reduces ${overloaded.name}'s load to ${Math.round((newOverloadUnits / overloaded.maxUnits) * 100)}%, increases ${candidate.name}'s load to ${Math.round((newCandidateUnits / candidate.maxUnits) * 100)}%`,
          });
          break; // Move to next schedule once we find a good candidate
        }
      }
    }
  }

  return swaps.slice(0, 20); // Limit to top 20 suggestions
}

// Helper function to check for conflicts
async function checkConflicts(
  facultyId: string,
  roomId: string,
  sectionId: string,
  day: string,
  startTime: string,
  endTime: string,
  excludeScheduleId?: string
): Promise<Array<{ type: string; conflictingScheduleId: string | null; description: string }>> {
  const conflicts: Array<{ type: string; conflictingScheduleId: string | null; description: string }> = [];

  const timesOverlap = (s1: string, e1: string, s2: string, e2: string) => {
    return s1 < e2 && e1 > s2;
  };

  // Check faculty double booking
  const facultySchedules = await db.schedule.findMany({
    where: {
      facultyId,
      day,
      ...(excludeScheduleId && { id: { not: excludeScheduleId } }),
    },
  });

  for (const s of facultySchedules) {
    if (timesOverlap(startTime, endTime, s.startTime, s.endTime)) {
      conflicts.push({
        type: 'faculty_double_booking',
        conflictingScheduleId: s.id,
        description: 'Faculty is already scheduled for another class at this time',
      });
    }
  }

  return conflicts;
}
