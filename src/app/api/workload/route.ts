import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    let scheduleVersionId = searchParams.get('scheduleVersionId')
    const departmentId = searchParams.get('departmentId')
    const facultyId = searchParams.get('facultyId')

    if (!scheduleVersionId) {
      return NextResponse.json(
        { error: 'scheduleVersionId query parameter is required' },
        { status: 400 }
      )
    }

    // Resolve "latest" to the most recent schedule version ID
    if (scheduleVersionId === 'latest') {
      const latestVersion = await db.scheduleVersion.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      })
      if (!latestVersion) {
        return NextResponse.json({
          scheduleVersionId: null,
          totalFaculty: 0,
          workload: [],
          summary: {
            totalUnitsAssigned: 0,
            totalHoursScheduled: 0,
            overloaded: 0,
            underloaded: 0,
            averageUtilization: 0,
          },
        })
      }
      scheduleVersionId = latestVersion.id
    }

    const facultyWhere: Record<string, unknown> = {
      role: { in: ['faculty', 'department_dean', 'program_head'] },
      status: 'active',
    }
    if (departmentId) facultyWhere.departmentId = departmentId
    if (facultyId) facultyWhere.id = facultyId

    const faculty = await db.user.findMany({
      where: facultyWhere,
      include: {
        department: true,
        schedules: {
          where: { scheduleVersionId },
          include: {
            subject: true,
            section: { include: { program: true } },
          },
        },
        preferences: {
          where: {
            semester: searchParams.get('semester') || '1st',
          },
          take: 1,
        },
      },
      orderBy: { name: 'asc' },
    })

    const workloadData = faculty.map(f => {
      const schedules = f.schedules
      const totalUnits = schedules.reduce((sum, s) => sum + (s.subject?.units || 0), 0)
      const totalHours = schedules.reduce((sum, s) => {
        const start = s.startTime.split(':').map(Number)
        const end = s.endTime.split(':').map(Number)
        const hours = (end[0] + end[1] / 60) - (start[0] + start[1] / 60)
        return sum + hours
      }, 0)

      const daysUsed = new Set(schedules.map(s => s.day))
      const preference = f.preferences[0]

      return {
        id: f.id,
        name: f.name,
        uid: f.uid,
        email: f.email,
        department: f.department?.name || null,
        specialization: f.specialization,
        facultyType: f.facultyType,
        maxUnits: f.maxUnits,
        assignedUnits: totalUnits,
        totalHours: Math.round(totalHours * 10) / 10,
        scheduleCount: schedules.length,
        daysUsed: Array.from(daysUsed),
        utilizationPercent: f.maxUnits > 0 ? Math.round((totalUnits / f.maxUnits) * 100) : 0,
        preference: preference ? {
          preferredDays: preference.preferredDays,
          preferredTimeStart: preference.preferredTimeStart,
          preferredTimeEnd: preference.preferredTimeEnd,
        } : null,
        schedules: schedules.map(s => ({
          id: s.id,
          day: s.day,
          startTime: s.startTime,
          endTime: s.endTime,
          subject: s.subject?.subjectName,
          subjectCode: s.subject?.subjectCode,
          units: s.subject?.units,
          section: s.section?.sectionName,
        })),
      }
    })

    return NextResponse.json({
      scheduleVersionId,
      totalFaculty: workloadData.length,
      workload: workloadData,
      summary: {
        totalUnitsAssigned: workloadData.reduce((sum, f) => sum + f.assignedUnits, 0),
        totalHoursScheduled: workloadData.reduce((sum, f) => sum + f.totalHours, 0),
        overloaded: workloadData.filter(f => f.utilizationPercent > 100).length,
        underloaded: workloadData.filter(f => f.utilizationPercent < 50).length,
        averageUtilization: workloadData.length > 0
          ? Math.round(workloadData.reduce((sum, f) => sum + f.utilizationPercent, 0) / workloadData.length)
          : 0,
      },
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Failed to fetch workload data' },
      { status: 500 }
    )
  }
}
