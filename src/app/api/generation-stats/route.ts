import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/generation-stats - Comprehensive generation statistics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const semester = searchParams.get('semester');
    const academicYear = searchParams.get('academicYear');

    // Build where clause
    const whereClause: Record<string, unknown> = {};
    if (semester) whereClause.semester = semester;
    if (academicYear) whereClause.academicYear = academicYear;

    // Get all schedules with related data
    const schedules = await db.schedule.findMany({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      include: {
        subject: { include: { program: { include: { department: true } } } },
        faculty: { include: { department: true } },
        room: true,
        section: { include: { department: true, program: true } },
      },
    });

    // Calculate faculty load distribution
    const facultyLoad: Record<string, { name: string; department: string; load: number; maxUnits: number; schedules: number }> = {};
    
    for (const schedule of schedules) {
      const fid = schedule.facultyId;
      if (!facultyLoad[fid]) {
        facultyLoad[fid] = {
          name: schedule.faculty?.name || 'Unknown',
          department: schedule.faculty?.department?.name || 'Unassigned',
          load: 0,
          maxUnits: 24,
          schedules: 0,
        };
      }
      facultyLoad[fid].load += schedule.subject?.units || 3;
      facultyLoad[fid].schedules++;
    }

    // Calculate room utilization
    const roomUsage: Record<string, { name: string; building: string; capacity: number; schedules: number; hoursPerWeek: number }> = {};
    
    for (const schedule of schedules) {
      const rid = schedule.roomId;
      if (!rid) continue; // Skip schedules without room assignments
      if (!roomUsage[rid]) {
        roomUsage[rid] = {
          name: schedule.room?.roomName || 'Unknown',
          building: schedule.room?.building || 'Unknown',
          capacity: schedule.room?.capacity || 0,
          schedules: 0,
          hoursPerWeek: 0,
        };
      }
      roomUsage[rid].schedules++;
      // Calculate hours
      const [startH, startM] = schedule.startTime.split(':').map(Number);
      const [endH, endM] = schedule.endTime.split(':').map(Number);
      const hours = (endH * 60 + endM - startH * 60 - startM) / 60;
      roomUsage[rid].hoursPerWeek += hours;
    }

    // Calculate time slot distribution
    const timeSlotDistribution: Record<string, number> = {};
    const dayDistribution: Record<string, number> = {};
    
    for (const schedule of schedules) {
      // Time slots
      const hour = schedule.startTime.split(':')[0];
      const timeKey = `${hour}:00`;
      timeSlotDistribution[timeKey] = (timeSlotDistribution[timeKey] || 0) + 1;
      
      // Days
      dayDistribution[schedule.day] = (dayDistribution[schedule.day] || 0) + 1;
    }

    // Calculate department distribution
    const departmentDistribution: Record<string, { schedules: number; faculty: Set<string> }> = {};
    
    for (const schedule of schedules) {
      const dept = schedule.subject?.program?.department?.name || schedule.section?.department?.name || 'Unknown';
      if (!departmentDistribution[dept]) {
        departmentDistribution[dept] = { schedules: 0, faculty: new Set() };
      }
      departmentDistribution[dept].schedules++;
      if (schedule.facultyId) {
        departmentDistribution[dept].faculty.add(schedule.facultyId);
      }
    }

    // Calculate score distribution (if available from versions)
    const latestVersion = await db.scheduleVersion.findFirst({
      orderBy: { generatedAt: 'desc' },
    });

    let scoreStats = { min: 0, max: 0, avg: 0, median: 0 };
    if (latestVersion) {
      const snapshots = await db.scheduleSnapshot.findMany({
        where: { versionId: latestVersion.id },
        select: { score: true },
      });
      
      const scores = snapshots.map(s => s.score || 0).filter(s => s > 0);
      if (scores.length > 0) {
        scoreStats = {
          min: Math.min(...scores),
          max: Math.max(...scores),
          avg: scores.reduce((a, b) => a + b, 0) / scores.length,
          median: scores.sort((a, b) => a - b)[Math.floor(scores.length / 2)],
        };
      }
    }

    // Calculate section coverage
    const sections = await db.section.findMany({
      where: { isActive: true },
      select: { id: true, sectionName: true },
    });
    
    const sectionsWithSchedules = new Set(schedules.map(s => s.sectionId));
    const sectionCoverage = {
      total: sections.length,
      withSchedules: sectionsWithSchedules.size,
      coveragePercent: sections.length > 0 ? (sectionsWithSchedules.size / sections.length) * 100 : 0,
    };

    // Calculate faculty utilization stats
    const facultyArray = Object.values(facultyLoad);
    const utilizationStats = {
      overloaded: facultyArray.filter(f => f.load > f.maxUnits).length,
      underloaded: facultyArray.filter(f => f.load < f.maxUnits * 0.3).length,
      optimal: facultyArray.filter(f => f.load >= f.maxUnits * 0.6 && f.load <= f.maxUnits * 0.9).length,
      avgUtilization: facultyArray.length > 0 
        ? facultyArray.reduce((sum, f) => sum + (f.load / f.maxUnits), 0) / facultyArray.length 
        : 0,
    };

    // Build response
    const stats = {
      overview: {
        totalSchedules: schedules.length,
        totalSubjects: new Set(schedules.map(s => s.subjectId)).size,
        totalFaculty: Object.keys(facultyLoad).length,
        totalRooms: Object.keys(roomUsage).length,
        totalSections: sectionCoverage.withSchedules,
      },
      facultyLoad: Object.entries(facultyLoad).map(([id, data]) => ({
        id,
        ...data,
        utilization: data.maxUnits > 0 ? (data.load / data.maxUnits) * 100 : 0,
      })).sort((a, b) => b.load - a.load),
      roomUtilization: Object.entries(roomUsage).map(([id, data]) => ({
        id,
        ...data,
        utilizationPercent: (data.hoursPerWeek / 45) * 100,
      })).sort((a, b) => b.hoursPerWeek - a.hoursPerWeek),
      timeSlotDistribution,
      dayDistribution,
      departmentDistribution: Object.entries(departmentDistribution).map(([name, data]) => ({
        department: name,
        schedules: data.schedules,
        facultyCount: data.faculty.size,
      })),
      scoreDistribution: scoreStats,
      sectionCoverage,
      utilizationStats,
      generationHistory: await db.generationSession.findMany({
        take: 10,
        orderBy: { startedAt: 'desc' },
        select: {
          id: true,
          status: true,
          progress: true,
          startedAt: true,
          completedAt: true,
          elapsedTimeMs: true,
          assignedCount: true,
          unassignedCount: true,
        },
      }),
      versions: await db.scheduleVersion.findMany({
        take: 5,
        orderBy: { generatedAt: 'desc' },
        select: {
          id: true,
          versionName: true,
          semester: true,
          academicYear: true,
          scheduleCount: true,
          generatedAt: true,
          isActive: true,
        },
      }),
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching generation stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
