import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/stats
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get('departmentId');
    const facultyId = searchParams.get('facultyId');

    // Determine if filtering by faculty (for faculty role)
    const isFaculty = session?.user?.role === 'faculty';
    const filterFacultyId = isFaculty ? session.user.id : facultyId;

    // Build filter conditions
    const userWhere = {
      role: 'faculty' as const,
      ...(departmentId && { departmentId }),
      ...(filterFacultyId && { id: filterFacultyId }),
    };

    const scheduleWhere = {
      ...(departmentId ? { section: { departmentId } } : {}),
      ...(filterFacultyId && { facultyId: filterFacultyId }),
    };

    // Get all relevant data in parallel for efficiency
    const [
      users,
      schedules,
      conflicts,
      rooms,
      sections,
      subjects,
      departments,
      scheduleResponses,
    ] = await Promise.all([
      // Faculty users
      db.user.findMany({
        where: userWhere,
        include: { department: true },
      }),
      // Schedules with related data
      db.schedule.findMany({
        where: scheduleWhere,
        include: { 
          subject: true, 
          faculty: true, 
          room: true, 
          section: true 
        },
        orderBy: { createdAt: 'desc' },
      }),
      // Unresolved conflicts
      db.conflict.findMany({ 
        where: { resolved: false },
        orderBy: { createdAt: 'desc' },
      }),
      // All rooms
      db.room.findMany({
        where: { isActive: true },
      }),
      // Sections (filtered by department if specified)
      db.section.findMany({
        where: {
          isActive: true,
          ...(departmentId && { departmentId }),
        },
      }),
      // Subjects (filtered by department if specified)
      db.subject.findMany({
        where: {
          isActive: true,
          ...(departmentId && { departmentId }),
        },
      }),
      // Departments
      db.department.findMany(),
      // Schedule responses
      db.scheduleResponse.findMany({
        where: filterFacultyId ? { facultyId: filterFacultyId } : undefined,
        include: {
          schedule: {
            include: { subject: true, section: true, room: true },
          },
          faculty: { include: { department: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Calculate core stats
    const totalFaculty = users.length;
    const totalSchedules = schedules.length;
    const totalConflicts = conflicts.length;

    // Faculty utilization calculation
    const facultyLoads: Record<string, number> = {};
    users.forEach(u => { facultyLoads[u.id] = 0; });
    schedules.forEach(s => {
      if (s.subject) {
        facultyLoads[s.facultyId] = (facultyLoads[s.facultyId] || 0) + s.subject.units;
      }
    });

    const totalCapacity = users.reduce((sum, u) => sum + (u.maxUnits || 24), 0);
    const totalLoad = Object.values(facultyLoads).reduce((sum, load) => sum + load, 0);
    const facultyUtilizationAvg = totalCapacity > 0 ? Math.round((totalLoad / totalCapacity) * 100) : 0;

    // Individual faculty utilization
    const facultyUtilization = users.map(u => {
      const assigned = facultyLoads[u.id] || 0;
      const max = u.maxUnits || 24;
      return {
        id: u.id,
        name: u.name,
        image: u.image,
        assigned,
        max,
        percent: max > 0 ? Math.round((assigned / max) * 100) : 0,
        department: u.department?.name || 'Unassigned',
      };
    }).sort((a, b) => b.percent - a.percent);

    // Room occupancy calculation
    const roomSchedules: Record<string, number> = {};
    rooms.forEach(r => { roomSchedules[r.id] = 0; });
    schedules.forEach(s => {
      roomSchedules[s.roomId] = (roomSchedules[s.roomId] || 0) + 1;
    });

    const maxRoomSchedules = 6 * 13; // 6 days (Mon-Sat) * 13 time slots
    const avgRoomUsage = rooms.length > 0 
      ? Object.values(roomSchedules).reduce((sum, count) => sum + count, 0) / rooms.length 
      : 0;
    const roomOccupancy = Math.round((avgRoomUsage / maxRoomSchedules) * 100) || 0;

    // Overloaded/underloaded faculty
    const overloadedFaculty = users.filter(u => (facultyLoads[u.id] || 0) > (u.maxUnits || 24)).length;
    const underloadedFaculty = users.filter(u => (facultyLoads[u.id] || 0) < 12).length;

    // Schedules by day - ensure all days are represented
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayCounts: Record<string, number> = {
      Monday: 0, Tuesday: 0, Wednesday: 0, Thursday: 0, Friday: 0, Saturday: 0,
    };
    schedules.forEach(s => {
      if (dayCounts.hasOwnProperty(s.day)) {
        dayCounts[s.day]++;
      }
    });
    const schedulesByDay = dayOrder.map(day => ({ day, count: dayCounts[day] }));

    // Schedules by status - capitalize first letter
    const statusCounts: Record<string, number> = {};
    schedules.forEach(s => {
      statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;
    });
    const schedulesByStatus = Object.entries(statusCounts)
      .map(([status, count]) => ({ 
        status: status.charAt(0).toUpperCase() + status.slice(1), 
        count 
      }))
      .sort((a, b) => b.count - a.count);

    // Faculty by department
    const deptCounts: Record<string, number> = {};
    users.forEach(u => {
      const deptName = u.department?.name || 'Unassigned';
      deptCounts[deptName] = (deptCounts[deptName] || 0) + 1;
    });
    const facultyByDepartment = Object.entries(deptCounts)
      .map(([department, count]) => ({ department, count }))
      .sort((a, b) => b.count - a.count);

    // Room utilization details
    const roomUtilization = rooms
      .map(r => ({
        room: r.roomName,
        utilization: Math.round(((roomSchedules[r.id] || 0) / maxRoomSchedules) * 100),
        scheduleCount: roomSchedules[r.id] || 0,
      }))
      .sort((a, b) => b.utilization - a.utilization)
      .slice(0, 10);

    // Schedule responses stats
    const responseStats = {
      total: scheduleResponses.length,
      pending: scheduleResponses.filter(r => r.status === 'pending').length,
      accepted: scheduleResponses.filter(r => r.status === 'accepted').length,
      rejected: scheduleResponses.filter(r => r.status === 'rejected').length,
    };

    // Recent schedules (last 10, sorted by creation date)
    const recentSchedules = schedules.slice(0, 10).map(s => ({
      id: s.id,
      subject: s.subject,
      faculty: s.faculty,
      room: s.room,
      section: s.section,
      day: s.day,
      startTime: s.startTime,
      endTime: s.endTime,
      status: s.status,
      createdAt: s.createdAt,
    }));

    return NextResponse.json({
      // Core stats
      totalFaculty,
      totalSchedules,
      totalConflicts,
      facultyUtilizationAvg,
      roomOccupancy,
      overloadedFaculty,
      underloadedFaculty,

      // Entity counts
      totalRooms: rooms.length,
      totalSections: sections.length,
      totalSubjects: subjects.length,
      totalDepartments: departments.length,

      // Detailed data
      facultyUtilization,
      schedulesByDay,
      schedulesByStatus,
      facultyByDepartment,
      roomUtilization,
      recentSchedules,
      responseStats,

      // Flags
      isFacultyView: isFaculty,
      currentFacultyId: filterFacultyId || null,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
