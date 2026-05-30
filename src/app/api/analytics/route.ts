import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const maxDuration = 30 // allow up to 30s for Render free tier

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const semester = searchParams.get('semester') || '1st'
    const academicYear = searchParams.get('academicYear') || new Date().getFullYear().toString()

    // Run counts in parallel — lightweight queries
    const [
      totalFaculty,
      totalDepartments,
      totalSubjects,
      totalSections,
      totalSchedules,
    ] = await Promise.all([
      db.user.count({ where: { role: 'faculty', status: 'active' } }),
      db.department.count(),
      db.subject.count({ where: { isActive: true } }),
      db.section.count({ where: { isActive: true } }),
      db.schedule.count(),
    ])

    // Schedules by status — lightweight groupBy
    const schedulesByStatus = await db.schedule.groupBy({
      by: ['status'],
      _count: { id: true },
    })

    // Faculty workload — use lightweight select instead of include all
    const faculty = await db.user.findMany({
      where: { role: 'faculty', status: 'active' },
      select: {
        id: true,
        name: true,
        uid: true,
        specialization: true,
        maxUnits: true,
        department: { select: { name: true } },
        schedules: {
          select: {
            subject: { select: { units: true } },
            startTime: true,
            endTime: true,
          },
        },
      },
    })

    const facultyWorkload = faculty.map(f => {
      const totalUnits = f.schedules.reduce((sum, s) => sum + (s.subject?.units || 0), 0)
      const totalHours = f.schedules.reduce((sum, s) => {
        const [sh, sm] = s.startTime.split(':').map(Number)
        const [eh, em] = s.endTime.split(':').map(Number)
        return sum + ((eh + em/60) - (sh + sm/60))
      }, 0)
      return {
        id: f.id,
        name: f.name,
        uid: f.uid,
        department: f.department?.name || null,
        specialization: f.specialization,
        maxUnits: f.maxUnits,
        assignedUnits: totalUnits,
        totalHours,
        scheduleCount: f.schedules.length,
        utilizationPercent: f.maxUnits > 0 ? Math.round((totalUnits / f.maxUnits) * 100) : 0,
      }
    })

    const overloadedFaculty = facultyWorkload.filter(f => f.utilizationPercent > 100)
    const underloadedFaculty = facultyWorkload.filter(f => f.utilizationPercent < 50)

    // Conflict summary — lightweight groupBy
    const conflictSummary = await db.conflict.groupBy({
      by: ['type', 'severity'],
      _count: { id: true },
      where: { isResolved: false },
    })

    // Conflict counts in parallel
    const [totalConflicts, resolvedConflicts] = await Promise.all([
      db.conflict.count({ where: { isResolved: false } }),
      db.conflict.count({ where: { isResolved: true } }),
    ])

    // Schedule versions — lightweight groupBy
    const scheduleVersions = await db.scheduleVersion.groupBy({
      by: ['status'],
      _count: { id: true },
    })

    // Recent activity — small limit, select only needed fields
    const [recentSchedules, recentAuditLogs] = await Promise.all([
      db.schedule.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          day: true,
          startTime: true,
          endTime: true,
          status: true,
          createdAt: true,
          subject: { select: { subjectCode: true, subjectName: true } },
          faculty: { select: { name: true } },
          section: { select: { sectionName: true } },
        },
      }),
      db.auditLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          action: true,
          entity: true,
          entityId: true,
          details: true,
          createdAt: true,
          user: { select: { name: true, uid: true } },
        },
      }),
    ])

    return NextResponse.json({
      overview: {
        totalFaculty,
        totalDepartments,
        totalSubjects,
        totalSections,
        totalSchedules,
      },
      schedulesByStatus: schedulesByStatus.map(s => ({
        status: s.status,
        count: s._count.id,
      })),
      facultyWorkload: {
        distribution: facultyWorkload,
        overloaded: overloadedFaculty.length,
        underloaded: underloadedFaculty.length,
        averageUtilization: facultyWorkload.length > 0
          ? Math.round(facultyWorkload.reduce((sum, f) => sum + f.utilizationPercent, 0) / facultyWorkload.length)
          : 0,
      },
      conflictSummary: {
        byType: conflictSummary.map(c => ({
          type: c.type,
          severity: c.severity,
          count: c._count.id,
        })),
        totalUnresolved: totalConflicts,
        totalResolved: resolvedConflicts,
      },
      scheduleVersions: scheduleVersions.map(v => ({
        status: v.status,
        count: v._count.id,
      })),
      recentActivity: {
        schedules: recentSchedules,
        auditLogs: recentAuditLogs,
      },
    })
  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}
