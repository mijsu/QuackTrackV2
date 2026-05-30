import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const version = await db.scheduleVersion.findUnique({
      where: { id },
      include: {
        schedules: {
          include: {
            subject: { select: { id: true, subjectCode: true, subjectName: true, units: true, subjectType: true, defaultDurationHours: true, lectureHours: true, labHours: true } },
            faculty: { select: { id: true, name: true, uid: true, maxUnits: true, department: { select: { name: true, code: true } } } },
            section: { select: { id: true, programId: true, yearLevel: true } },
          },
        },
      },
    })

    if (!version) {
      return NextResponse.json({ error: 'Schedule version not found' }, { status: 404 })
    }

    // Helper: calculate hours from startTime/endTime strings
    function calcHours(startTime: string, endTime: string): number {
      const [sh, sm] = startTime.split(':').map(Number)
      const [eh, em] = endTime.split(':').map(Number)
      return (eh * 60 + em - (sh * 60 + sm)) / 60
    }

    // Aggregate per faculty using the SAME merge-aware counting as the generation algorithm.
    //
    // The algorithm counts units ONCE per "task". A task is one (section × subject) assignment
    // that may span multiple consecutive time slots. Additionally, if the same faculty teaches
    // the same subject at the same day+time to multiple sections (merged class), only the first
    // section's units count.
    //
    // To replicate this from flat schedule data:
    //   1. Group by (facultyId, day, subjectId, sectionId) — a "task group"
    //   2. Within each task group, find the EARLIEST startTime — this is the "first slot"
    //   3. Use (day, firstSlotStartTime, firstSlotEndTime, subjectId) as the merge key
    //   4. Only count units for the FIRST section within each merge group
    //   5. Only count units ONCE per task group (multi-slot → one unit count)
    //
    const facultyMap = new Map<string, {
      id: string
      name: string
      uid: string
      maxUnits: number
      assignedUnits: number
      assignmentCount: number
      totalHours: number
      lectureHours: number
      labHours: number
      subjectCount: number
      subjects: { subjectCode: string; subjectName: string; units: number; subjectType: string; defaultDurationHours: number }[]
      department: { name: string; code: string } | null
      // Track which merge keys have been counted for this faculty:
      // mergeKey = "day|startTime|endTime|subjectId"
      countedMergeKeys: Set<string>
      // Track which task groups have been counted (prevents multi-slot double counting):
      // taskKey = "day|subjectId|sectionId"
      countedTaskGroups: Set<string>
    }>()

    // First pass: group schedules per faculty to compute earliest start time per task group
    const facultySchedules = new Map<string, typeof version.schedules>()
    for (const schedule of version.schedules) {
      const fid = schedule.faculty.id
      const arr = facultySchedules.get(fid) || []
      arr.push(schedule)
      facultySchedules.set(fid, arr)
    }

    for (const [fid, schedules] of facultySchedules) {
      const firstFaculty = schedules[0].faculty
      const mg = new Map<string, { count: number; programs: Set<string> }>()

      // Group schedules into task groups: same day + subject + section = 1 task
      const taskGroups = new Map<string, typeof schedules>()
      for (const s of schedules) {
        const taskKey = `${s.day}|${s.subjectId}|${s.sectionId}`
        const arr = taskGroups.get(taskKey) || []
        arr.push(s)
        taskGroups.set(taskKey, arr)
      }

      let totalUnits = 0
      let totalAssignments = 0
      let totalHrs = 0
      let lecHrs = 0
      let labHrs = 0
      const subjectSet = new Set<string>()
      const subjectsList: { subjectCode: string; subjectName: string; units: number; subjectType: string; defaultDurationHours: number }[] = []
      const countedMergeKeys = new Set<string>()
      const countedTaskGroups = new Set<string>()

      for (const [, group] of taskGroups) {
        // Find the earliest start time in this task group (the "first slot")
        group.sort((a, b) => a.startTime.localeCompare(b.startTime))
        const firstSlot = group[0]
        const mergeKey = `${firstSlot.day}|${firstSlot.startTime}|${firstSlot.endTime}|${firstSlot.subjectId}`

        // Check if this exact merge key has already been counted (section merge detection)
        if (!countedMergeKeys.has(mergeKey)) {
          // Also check that this task group itself hasn't been counted (multi-slot detection)
          const taskKey = `${firstSlot.day}|${firstSlot.subjectId}|${firstSlot.sectionId}`
          if (!countedTaskGroups.has(taskKey)) {
            totalUnits += firstSlot.subject.units
            countedMergeKeys.add(mergeKey)
            countedTaskGroups.add(taskKey)
          }
        }

        // Count assignments and hours for ALL slots in the task group
        for (const s of group) {
          totalAssignments++
          const slotH = calcHours(s.startTime, s.endTime)
          totalHrs += slotH
          const isL = s.subject.subjectType === 'lab'
          lecHrs += isL ? 0 : slotH
          labHrs += isL ? slotH : 0
          if (!subjectSet.has(s.subject.subjectCode)) {
            subjectSet.add(s.subject.subjectCode)
            subjectsList.push(s.subject)
          }
        }
      }

      facultyMap.set(fid, {
        id: firstFaculty.id,
        name: firstFaculty.name,
        uid: firstFaculty.uid,
        maxUnits: firstFaculty.maxUnits,
        assignedUnits: totalUnits,
        assignmentCount: totalAssignments,
        totalHours: totalHrs,
        lectureHours: lecHrs,
        labHours: labHrs,
        subjectCount: subjectsList.length,
        subjects: subjectsList,
        department: firstFaculty.department,
        countedMergeKeys,
        countedTaskGroups,
      })
    }

    // Convert to array and sort by load (highest first)
    const facultyLoads = Array.from(facultyMap.values())
      .sort((a, b) => b.assignedUnits - a.assignedUnits)

    // Compute distribution summary
    const totalFaculty = facultyLoads.length
    const totalAssignedUnits = facultyLoads.reduce((sum, f) => sum + f.assignedUnits, 0)
    const totalAssignments = facultyLoads.reduce((sum, f) => sum + f.assignmentCount, 0)
    const totalHours = facultyLoads.reduce((sum, f) => sum + f.totalHours, 0)
    const totalLectureHours = facultyLoads.reduce((sum, f) => sum + f.lectureHours, 0)
    const totalLabHours = facultyLoads.reduce((sum, f) => sum + f.labHours, 0)
    const overloadedCount = facultyLoads.filter(f => f.maxUnits > 0 && f.assignedUnits >= f.maxUnits).length
    const heavyCount = facultyLoads.filter(f => f.maxUnits > 0 && f.assignedUnits >= f.maxUnits * 0.75 && f.assignedUnits < f.maxUnits).length
    const normalCount = facultyLoads.filter(f => f.maxUnits > 0 && f.assignedUnits < f.maxUnits * 0.75).length
    const unassignedCount = Math.max(0, (version.schedules.length > 0 ? (await db.user.count({ where: { role: 'faculty', status: 'active' } })) : 0) - totalFaculty)
    const avgLoad = totalFaculty > 0 ? Math.round((totalAssignedUnits / totalFaculty) * 10) / 10 : 0
    const avgUtilization = facultyLoads.length > 0
      ? Math.round((facultyLoads.reduce((sum, f) => sum + (f.maxUnits > 0 ? (f.assignedUnits / f.maxUnits) * 100 : 0), 0) / facultyLoads.length) * 10) / 10
      : 0

    return NextResponse.json({
      faculty: facultyLoads.map(f => ({
        ...f,
        totalHours: Math.round(f.totalHours * 10) / 10,
        lectureHours: Math.round(f.lectureHours * 10) / 10,
        labHours: Math.round(f.labHours * 10) / 10,
      })),
      summary: {
        totalFaculty,
        totalAssignedUnits,
        totalAssignments,
        totalHours: Math.round(totalHours * 10) / 10,
        totalLectureHours: Math.round(totalLectureHours * 10) / 10,
        totalLabHours: Math.round(totalLabHours * 10) / 10,
        overloadedCount,
        heavyCount,
        normalCount,
        unassignedCount,
        avgLoad,
        avgUtilization,
      },
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Failed to fetch faculty load data' },
      { status: 500 }
    )
  }
}
