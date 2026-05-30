import { db } from '@/lib/db'

interface GenerationInput {
  semester: string
  academicYear: string
  departmentId?: string
  configId?: string
  classType?: string // 'regular', 'executive', or undefined (all)
}

interface GenerationResult {
  sessionId: string
  versionId: string
  totalSchedules: number
  conflictCount: number
  status: 'completed' | 'partial' | 'failed'
  message: string
}

// ─── Utility helpers ──────────────────────────────────────────────────────────

/**
 * Normalize semester value for matching.
 * Handles both "1st" and "1st Semester" formats.
 */
function normalizeSemester(sem: string): string {
  if (!sem) return ''
  const lower = sem.toLowerCase().trim()
  if (lower.startsWith('1st')) return '1st'
  if (lower.startsWith('2nd')) return '2nd'
  if (lower.startsWith('3rd')) return '3rd'
  if (lower.startsWith('summer')) return 'summer'
  return lower
}

function semesterMatch(querySemester: string, dataSemester: string): boolean {
  return normalizeSemester(querySemester) === normalizeSemester(dataSemester)
}

/**
 * Parse a specialization value which may be:
 * - A JSON array string like '["English Literature","Linguistics"]'
 * - A plain string like 'computer_science'
 * - null/undefined
 */
function parseSpecialization(val: string | null | undefined): string[] {
  if (!val) return []
  try {
    const parsed = JSON.parse(val)
    if (Array.isArray(parsed)) return parsed.map(String)
    return [String(parsed)]
  } catch {
    return val.split(',').map(s => s.trim()).filter(Boolean)
  }
}

/**
 * Check if a faculty member's specializations overlap with a subject's required specializations
 */
function specializationMatches(
  facultySpec: string | null | undefined,
  subjectReqSpec: string | null | undefined
): boolean {
  if (!subjectReqSpec) return true
  const facultySpecs = parseSpecialization(facultySpec)
  const requiredSpecs = parseSpecialization(subjectReqSpec)
  if (requiredSpecs.length === 0) return true
  if (facultySpecs.length === 0) return true
  return facultySpecs.some(fs =>
    requiredSpecs.some(rs => fs.toLowerCase().trim() === rs.toLowerCase().trim())
  )
}

/**
 * Check if two time ranges overlap
 */
function timeOverlaps(start1: string, end1: string, start2: string, end2: string): boolean {
  return start1 < end2 && start2 < end1
}

// ─── Faculty preference helpers ───────────────────────────────────────────────

interface FacultyPreferenceData {
  preferredDays: string | null
  preferredTimeStart: string | null
  preferredTimeEnd: string | null
  unavailableDays: string | null
  unavailableTimeSlots: string | null
  maxUnitsOverride: number | null
  semester: string
}

/**
 * Parse a comma-separated days string like "Mon,Wed,Fri" into an array
 */
function parseDays(val: string | null | undefined): string[] {
  if (!val) return []
  return val.split(',').map(d => d.trim()).filter(Boolean)
}

/**
 * Check if a day is in a faculty member's preferred days list.
 * If no preferred days are set, all days are considered preferred.
 */
function isPreferredDay(day: string, preferences: FacultyPreferenceData[], semester: string): boolean {
  const pref = preferences.find(p => semesterMatch(p.semester, semester))
  if (!pref || !pref.preferredDays) return true // No preference = all days OK
  const preferred = parseDays(pref.preferredDays)
  return preferred.length === 0 || preferred.includes(day)
}

/**
 * Check if a day is in a faculty member's unavailable days list.
 */
function isUnavailableDay(day: string, preferences: FacultyPreferenceData[], semester: string): boolean {
  const pref = preferences.find(p => semesterMatch(p.semester, semester))
  if (!pref || !pref.unavailableDays) return false
  return parseDays(pref.unavailableDays).includes(day)
}

/**
 * Check if a time slot falls within a faculty member's preferred time range.
 * If no preferred time is set, all times are considered OK.
 */
function isPreferredTime(
  slotStart: string,
  slotEnd: string,
  preferences: FacultyPreferenceData[],
  semester: string
): boolean {
  const pref = preferences.find(p => semesterMatch(p.semester, semester))
  if (!pref || !pref.preferredTimeStart || !pref.preferredTimeEnd) return true
  // Slot must start at or after preferred start, and end at or before preferred end
  return slotStart >= pref.preferredTimeStart && slotEnd <= pref.preferredTimeEnd
}

/**
 * Get the effective max units for a faculty member (preference override or default)
 */
function getEffectiveMaxUnits(facultyMaxUnits: number, preferences: FacultyPreferenceData[], semester: string): number {
  const pref = preferences.find(p => semesterMatch(p.semester, semester))
  if (pref && pref.maxUnitsOverride && pref.maxUnitsOverride > 0) return pref.maxUnitsOverride
  return facultyMaxUnits
}

// ─── Slot scoring for intelligent placement ───────────────────────────────────

interface SlotScore {
  day: string
  slot: { start: string; end: string }
  score: number
  facultyId: string
}

/**
 * Score a potential slot for a given section's subject assignment.
 * Higher score = better placement.
 *
 * Scoring criteria:
 * 1. Faculty preference match (preferred days & times) — highest priority
 * 2. Day load balancing — favor days with fewer assignments for this section
 * 3. Faculty day load balancing — favor days where the faculty has fewer classes
 * 4. Faculty total load balancing — favor under-utilized faculty to distribute units evenly
 * 5. Global day balancing — favor days with fewer total assignments
 */
function scoreSlot(
  day: string,
  slot: { start: string; end: string },
  facultyId: string,
  sectionId: string,
  facultyPrefs: FacultyPreferenceData[],
  sectionDayCount: Map<string, Map<string, number>>,   // sectionId -> day -> count
  facultyDayCount: Map<string, Map<string, number>>,    // facultyId -> day -> count
  globalDayCount: Map<string, number>,                   // day -> total count
  semester: string,
  currentFacultyUnits: number,                            // total units currently assigned to this faculty
  effectiveMaxUnits: number,                              // max units this faculty can handle
  newTaskUnits: number,                                   // units of the task being assigned
): number {
  let score = 0

  // ── Faculty preference scoring (0-40 points) ──
  const isPrefDay = isPreferredDay(day, facultyPrefs, semester)
  const isUnavail = isUnavailableDay(day, facultyPrefs, semester)
  const isPrefTime = isPreferredTime(slot.start, slot.end, facultyPrefs, semester)

  // Hard constraint: unavailable days should NEVER be used
  if (isUnavail) return -1000

  // Preferred day bonus
  if (isPrefDay) score += 20
  else score -= 10

  // Preferred time bonus
  if (isPrefTime) score += 20
  else score -= 5

  // ── Section day distribution (0-25 points) ──
  // Favor days where this section has fewer classes → better spread
  const sectionDayMap = sectionDayCount.get(sectionId)
  const sectionCount = sectionDayMap?.get(day) || 0
  // Penalty for too many classes on same day for this section
  if (sectionCount >= 3) score -= 15
  else if (sectionCount >= 2) score -= 5
  else if (sectionCount === 0) score += 10
  // Bonus for spreading to empty days
  else score += 5

  // ── Faculty day load balancing (0-20 points) ──
  // Favor days where the faculty has fewer classes
  const facultyDayMap = facultyDayCount.get(facultyId)
  const facultyDayLoad = facultyDayMap?.get(day) || 0
  if (facultyDayLoad >= 3) score -= 10
  else if (facultyDayLoad >= 2) score -= 3
  else if (facultyDayLoad === 0) score += 8
  else score += 3

  // ── Faculty total load balancing (0-35 points) ──
  // Strongly reward under-utilized faculty and penalize nearly-full ones
  // to ensure even distribution of units across all eligible faculty
  if (effectiveMaxUnits > 0) {
    const projectedUnits = currentFacultyUnits + newTaskUnits
    const utilization = projectedUnits / effectiveMaxUnits

    if (utilization <= 0.50) score += 35       // < 50% → strongly favored
    else if (utilization <= 0.75) score += 20   // 50-75% → moderately favored
    else if (utilization <= 0.90) score += 5    // 75-90% → slightly favored
    else if (utilization <= 1.00) score -= 15   // 90-100% → penalized (nearing cap)
    else score -= 50                             // > 100% → heavily penalized (over cap)
  }

  // ── Global day balancing (0-15 points) ──
  // Favor days that have fewer total assignments globally
  const globalLoad = globalDayCount.get(day) || 0
  const avgLoad = Array.from(globalDayCount.values()).reduce((a, b) => a + b, 0) / Math.max(globalDayCount.size, 1)
  if (globalLoad <= avgLoad) score += 10
  else score -= 5

  return score
}

// ─── Main generation algorithm ────────────────────────────────────────────────

export async function generateSchedules(input: GenerationInput): Promise<GenerationResult> {
  const { semester, academicYear, departmentId, configId, classType } = input

  console.log(`🔧 Schedule generation started: semester=${semester}, academicYear=${academicYear}, departmentId=${departmentId || 'all'}, classType=${classType || 'all'}`)

  // Create generation session
  const session = await db.generationSession.create({
    data: {
      name: `Auto-Generation ${semester} ${academicYear}`,
      status: 'running',
      configId,
      semester,
      academicYear,
      startedAt: new Date(),
    },
  })

  // Create a new schedule version
  const version = await db.scheduleVersion.create({
    data: {
      name: `Generated Schedule - ${semester} ${academicYear}`,
      description: 'Auto-generated schedule',
      semester,
      academicYear,
      status: 'draft',
      generationSessionId: session.id,
    },
  })

  try {
    // ── Resolve department IDs based on classType ──
    // When a classType is selected (not "all"), find all departments matching
    // that classType and use them to filter faculty, subjects, and sections.
    // This ensures that generating "Regular Only" only includes departments
    // tagged as Regular, and "Executive Only" only Executive departments.
    let resolvedDepartmentIds: string[] | undefined
    if (classType && classType !== 'executive' && classType !== 'regular') {
      // Unknown classType — ignore
    } else if (classType) {
      const matchingDepts = await db.department.findMany({
        where: { classType },
        select: { id: true },
      })
      resolvedDepartmentIds = matchingDepts.map(d => d.id)
      if (resolvedDepartmentIds.length === 0) {
        // No departments match this classType — will fail the data check below
        resolvedDepartmentIds = ['__none__']
      }
    }

    // Use explicit departmentId if provided, otherwise use resolved department IDs
    const targetDeptIds = departmentId ? [departmentId] : resolvedDepartmentIds

    // ── Fetch data ──
    const subjectsWhere: Record<string, unknown> = {
      isActive: true,
      ...(targetDeptIds ? { departmentId: { in: targetDeptIds } } : {}),
    }
    const sectionsWhere: Record<string, unknown> = {
      isActive: true,
      ...(targetDeptIds ? { departmentId: { in: targetDeptIds } } : {}),
    }

    const allSubjects = await db.subject.findMany({
      where: subjectsWhere,
      include: { program: true, department: true },
    })
    const subjects = allSubjects.filter(s => semesterMatch(semester, s.semester))

    const facultyWhere: Record<string, unknown> = {
      status: 'active',
      role: { in: ['faculty', 'department_dean', 'program_head'] },
    }
    if (targetDeptIds) facultyWhere.departmentId = { in: targetDeptIds }
    // Filter by classType if specified — faculty are matched as follows:
    // - Regular classes: ANY faculty (regular OR masteral) can teach, since masteral
    //   faculty hold a master's degree but still teach regular/undergraduate classes.
    // - Executive classes: Only 'masteral' faculty (those with master's degrees) can
    //   teach, as executive/graduate classes require advanced qualifications.
    // When no classType is selected ("all"), all eligible faculty are used.
    if (classType === 'executive') {
      facultyWhere.facultyType = 'masteral'
    }
    // Note: For 'regular' classType, no facultyType filter is applied so all
    // faculty (regular + masteral) are eligible to teach regular classes.

    const faculty = await db.user.findMany({
      where: facultyWhere,
      include: { preferences: true },
    })

    const allSections = await db.section.findMany({
      where: sectionsWhere,
      include: { program: true, department: true },
    })
    const sections = allSections.filter(s => semesterMatch(semester, s.semester))

    // Filter subjects and sections by classType — subjects/sections tagged as 'regular' are for regular tracks,
    // 'executive' for executive tracks, 'both' for shared subjects/sections used by both tracks.
    // When no classType filter is specified (undefined), include ALL subjects/sections regardless of tag.
    let filteredSubjects = subjects
    let filteredSections = sections
    if (classType && classType !== 'masteral') {
      filteredSubjects = subjects.filter(s => s.classType === classType || s.classType === 'both' || !s.classType)
      filteredSections = sections.filter(s => s.classType === classType || s.classType === 'both' || !s.classType)
    }

    console.log(`📊 Data found: ${filteredSubjects.length} subjects, ${faculty.length} faculty, ${filteredSections.length} sections (classType=${classType || 'all'})`)

    if (filteredSubjects.length === 0 || faculty.length === 0 || sections.length === 0) {
      const allSubjectsInSemester = allSubjects.filter(s => semesterMatch(semester, s.semester))
      const allSectionsInSemester = allSections.filter(s => semesterMatch(semester, s.semester))
      const missingItems: Array<{ label: string; found: number; totalInSemester: number; needed: string }> = []
      if (filteredSubjects.length === 0) missingItems.push({
        label: `Subjects (semester="${semester}"${classType ? `, type="${classType}"` : ''})`,
        found: filteredSubjects.length,
        totalInSemester: allSubjectsInSemester.length,
        needed: 'At least 1 subject matching the semester and class type',
      })
      if (faculty.length === 0) missingItems.push({
        label: `Faculty${classType ? ` (type="${classType}")` : ''}`,
        found: 0,
        totalInSemester: 0,
        needed: 'At least 1 eligible faculty member',
      })
      if (sections.length === 0) missingItems.push({
        label: `Sections (semester="${semester}"${classType ? `, type="${classType}"` : ''})`,
        found: filteredSections.length,
        totalInSemester: allSectionsInSemester.length,
        needed: 'At least 1 section matching the semester and class type',
      })

      await db.generationSession.update({
        where: { id: session.id },
        data: { status: 'failed', completedAt: new Date() },
      })

      return {
        sessionId: session.id,
        versionId: version.id,
        totalSchedules: 0,
        conflictCount: 0,
        score: 0,
        status: 'failed',
        message: `Cannot generate schedule — missing required data for the selected semester and class type.`,
        missingItems,
      }
    }

    // ── Configuration ──
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const timeSlots = [
      { start: '07:00', end: '08:30' },
      { start: '08:30', end: '10:00' },
      { start: '10:00', end: '11:30' },
      { start: '11:30', end: '13:00' },
      { start: '13:00', end: '14:30' },
      { start: '14:30', end: '16:00' },
      { start: '16:00', end: '17:30' },
      { start: '17:30', end: '19:00' },
      { start: '19:00', end: '20:30' },
    ]

    // ── Tracking structures ──
    const facultySlotBooked: Map<string, Set<string>> = new Map()    // facultyId -> Set of "day-start-end"
    const sectionSlotBooked: Map<string, Set<string>> = new Map()    // sectionId -> Set of "day-start-end"
    const facultyUnits: Map<string, number> = new Map()              // facultyId -> total units assigned
    const sectionDayCount: Map<string, Map<string, number>> = new Map()  // sectionId -> day -> count
    const facultyDayCount: Map<string, Map<string, number>> = new Map()  // facultyId -> day -> count
    const globalDayCount: Map<string, number> = new Map()            // day -> total schedules
    // Merge tracking: facultyId -> "day-start-end-subjectId" -> Set of "programId|yearLevel" pairs
    // Used to detect valid merges (same subject + time + program/year = allowed) vs conflicts
    const facultyMergeSlots: Map<string, Map<string, Array<{ programId: string; yearLevel: number; sectionId: string }>>> = new Map()

    // Initialize
    faculty.forEach(f => {
      facultySlotBooked.set(f.id, new Set())
      facultyUnits.set(f.id, 0)
      facultyDayCount.set(f.id, new Map())
      facultyMergeSlots.set(f.id, new Map())
    })
    sections.forEach(s => {
      sectionSlotBooked.set(s.id, new Set())
      sectionDayCount.set(s.id, new Map())
    })
    days.forEach(d => globalDayCount.set(d, 0))

    // Build a faculty lookup for preference access
    const facultyMap = new Map(faculty.map(f => [f.id, f]))

    const generatedSchedules: Array<{
      day: string
      startTime: string
      endTime: string
      subjectId: string
      facultyId: string
      roomId: string | null
      sectionId: string
      scheduleVersionId: string
      status: string
    }> = []

    let unassignedCount = 0

    // ── PHASE 1: Build assignment plan ──
    // For each section, create a list of (section, subject) pairs that need scheduling
    // For lecture_and_lab subjects, create TWO tasks: one for lecture, one for lab
    interface AssignmentTask {
      sectionId: string
      sectionProgramId: string
      sectionYearLevel: number
      subjectId: string
      subjectUnits: number
      subjectDepartmentId: string
      subjectRequiredSpec: string | null
      subjectType: string // lecture, lab, seminar, lecture (from lecture_and_lab), lab (from lecture_and_lab)
      slotCount: number // number of 1.5h time slots needed
      componentName?: string // "lecture" or "lab" for lecture_and_lab subjects
    }

    /**
     * Calculate how many 1.5h slots are needed for a given number of hours.
     * Rounds up: 1.5h = 1 slot, 2h = 2 slots, 3h = 2 slots, 3.5h = 3 slots, etc.
     */
    function hoursToSlots(hours: number): number {
      if (hours <= 0) return 1
      return Math.ceil(hours / 1.5)
    }

    const tasks: AssignmentTask[] = []
    for (const section of filteredSections) {
      const sectionSubjects = filteredSubjects.filter(
        s => s.programId === section.programId && (
          // Executive subjects don't use year level — match any section in the same program
          s.classType === 'executive' || s.yearLevel === section.yearLevel
        )
      )
      for (const subject of sectionSubjects) {
        if (subject.subjectType === 'lecture_and_lab') {
          // Create separate lecture and lab tasks
          const lecSlots = hoursToSlots(subject.lectureHours)
          const labSlots = hoursToSlots(subject.labHours)
          // Split units proportionally (lecture gets units proportional to lecture hours)
          const totalHrs = subject.lectureHours + subject.labHours
          const lecUnits = totalHrs > 0 ? Math.round(subject.units * (subject.lectureHours / totalHrs)) : Math.ceil(subject.units / 2)
          const labUnits = subject.units - lecUnits

          tasks.push({
            sectionId: section.id,
            sectionProgramId: section.programId,
            sectionYearLevel: section.yearLevel,
            subjectId: subject.id,
            subjectUnits: lecUnits,
            subjectDepartmentId: subject.departmentId,
            subjectRequiredSpec: subject.requiredSpecialization,
            subjectType: 'lecture',
            slotCount: lecSlots,
            componentName: 'lecture',
          })
          tasks.push({
            sectionId: section.id,
            sectionProgramId: section.programId,
            sectionYearLevel: section.yearLevel,
            subjectId: subject.id,
            subjectUnits: labUnits,
            subjectDepartmentId: subject.departmentId,
            subjectRequiredSpec: subject.requiredSpecialization,
            subjectType: 'lab',
            slotCount: labSlots,
            componentName: 'lab',
          })
        } else {
          // Single-type subject
          const hrs = subject.lectureHours > 0 ? subject.lectureHours
            : subject.labHours > 0 ? subject.labHours
            : subject.defaultDurationHours
          tasks.push({
            sectionId: section.id,
            sectionProgramId: section.programId,
            sectionYearLevel: section.yearLevel,
            subjectId: subject.id,
            subjectUnits: subject.units,
            subjectDepartmentId: subject.departmentId,
            subjectRequiredSpec: subject.requiredSpecialization,
            subjectType: subject.subjectType,
            slotCount: hoursToSlots(hrs),
          })
        }
      }
    }

    // ── PHASE 2: Shuffle tasks for randomness, then sort by constraint difficulty ──
    // Harder-to-place subjects first (those with required specializations)
    // This prevents them from being left with no options
    const shuffled = [...tasks]
    // Fisher-Yates shuffle
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    // Sort: subjects with required specialization first (harder to place)
    shuffled.sort((a, b) => {
      const aHasSpec = a.subjectRequiredSpec ? 1 : 0
      const bHasSpec = b.subjectRequiredSpec ? 1 : 0
      return bHasSpec - aHasSpec
    })

    // ── PHASE 3: Assign each task using best-scored slot ──
    // For tasks with slotCount > 1, book consecutive time slots on the same day
    for (const task of shuffled) {
      // Find eligible faculty
      const eligibleFaculty = faculty.filter(f => {
        const hasMatchingSpec = specializationMatches(f.specialization, task.subjectRequiredSpec)
        // For executive class type, any masteral faculty with matching specialization is eligible
        // regardless of department. For regular, also allow same-department faculty.
        if (classType === 'executive') {
          if (!hasMatchingSpec) return false
        } else {
          const sameDepartment = f.departmentId === task.subjectDepartmentId
          if (!sameDepartment && !hasMatchingSpec) return false
        }

        const currentUnits = facultyUnits.get(f.id) || 0
        // Enforce load limits based on contract type:
        // Part-time = max 18 units, Full-time = max 21 units, Permanent = max 21 units
        const contractMaxUnits: Record<string, number> = {
          casual: 18,
          part_time: 18,
          full_time: 21,
          permanent: 21,
        }
        const contractLimit = contractMaxUnits[f.contractType ?? 'full_time'] ?? 21
        const maxUnits = getEffectiveMaxUnits(f.maxUnits, f.preferences || [], semester)
        // Use the most restrictive limit (contract limit, faculty maxUnits, or preference override)
        const effectiveMax = Math.min(maxUnits, contractLimit)
        if (currentUnits + task.subjectUnits > effectiveMax) return false

        // Class type separation is already handled by the database query filter
        // (faculty are pre-filtered by classType before reaching here)

        return true
      })

      if (eligibleFaculty.length === 0) {
        unassignedCount++
        continue
      }

      // Sort eligible faculty: specialization match first, then by least total units (load balancing)
      const sortedFaculty = [...eligibleFaculty].sort((a, b) => {
        const aMatch = specializationMatches(a.specialization, task.subjectRequiredSpec) ? 1 : 0
        const bMatch = specializationMatches(b.specialization, task.subjectRequiredSpec) ? 1 : 0
        if (bMatch !== aMatch) return bMatch - aMatch

        const aUnits = facultyUnits.get(a.id) || 0
        const bUnits = facultyUnits.get(b.id) || 0
        return aUnits - bUnits
      })

      const slotCount = task.slotCount || 1

      // Find best multi-slot placement
      interface MultiSlotCandidate {
        day: string
        startSlotIndex: number
        slots: typeof timeSlots extends Array<infer T> ? T[] : never
        score: number
        facultyId: string
      }

      const candidates: MultiSlotCandidate[] = []

      for (const f of sortedFaculty) {
        const facultyBooked = facultySlotBooked.get(f.id)!
        const sectionBooked = sectionSlotBooked.get(task.sectionId)!
        const prefs = (f.preferences || []) as FacultyPreferenceData[]
        const fMergeSlots = facultyMergeSlots.get(f.id)!

        for (const day of days) {
          if (isUnavailableDay(day, prefs, semester)) continue

          // Try each possible starting slot
          for (let si = 0; si <= timeSlots.length - slotCount; si++) {
            const neededSlots = timeSlots.slice(si, si + slotCount)

            // Check all slots are free for both faculty and section
            // Allow merged classes: same professor + same time + same subject + same program/year level
            let allFree = true
            let isValidMerge = true  // Track if this would be a valid merge
            let mergeCount = 0       // How many sections already merged in this slot
            for (const slot of neededSlots) {
              const slotKey = `${day}-${slot.start}-${slot.end}`
              if (sectionBooked.has(slotKey)) {
                allFree = false
                break
              }
              if (facultyBooked.has(slotKey)) {
                // Faculty slot is booked — check if this could be a valid merge
                // Same subject + same time + same program & year level = valid merge
                const mergeKey = `${day}-${slot.start}-${slot.end}-${task.subjectId}`
                const existingMerges = fMergeSlots.get(mergeKey)
                if (existingMerges && existingMerges.length > 0) {
                  // Check if all existing merges share the same program & year level
                  const allSameProgramYear = existingMerges.every(m =>
                    m.programId === task.sectionProgramId && m.yearLevel === task.sectionYearLevel
                  )
                  if (allSameProgramYear && existingMerges.length < 2) {
                    // Valid merge: same subject + time + program/year, and under the 2-section limit
                    mergeCount = Math.max(mergeCount, existingMerges.length)
                  } else {
                    // Invalid: either different program/year or already 2 sections merged
                    isValidMerge = false
                    allFree = false
                    break
                  }
                } else {
                  // Faculty is booked at this time with a DIFFERENT subject — can't merge
                  isValidMerge = false
                  allFree = false
                  break
                }
              }
            }
            if (!allFree) continue

            // Score using the first slot as anchor
            // Compute effective max units for load-balancing scoring
            const contractLimit: Record<string, number> = { casual: 18, part_time: 18, full_time: 21, permanent: 21 }
            const fContractLimit = contractLimit[f.contractType ?? 'full_time'] ?? 21
            const fMaxUnits = getEffectiveMaxUnits(f.maxUnits, prefs, semester)
            const fEffMax = Math.min(fMaxUnits, fContractLimit)
            const fCurrentUnits = facultyUnits.get(f.id) || 0

            const s = scoreSlot(
              day, neededSlots[0], f.id, task.sectionId,
              prefs,
              sectionDayCount, facultyDayCount, globalDayCount,
              semester,
              fCurrentUnits,
              fEffMax,
              task.subjectUnits
            )

            if (s >= -500) {
              candidates.push({
                day,
                startSlotIndex: si,
                slots: neededSlots,
                score: s,
                facultyId: f.id,
              })
            }
          }
        }
      }

      // Pick the best scored multi-slot placement that doesn't exceed the faculty's max units.
      // Apply a hard cap: even if the scoring favors an overloaded faculty, skip them
      // and use the next-best candidate who is within their unit limit.
      let bestCandidate: MultiSlotCandidate | null = null
      if (candidates.length > 0) {
        candidates.sort((a, b) => b.score - a.score)

        // Find the first candidate whose faculty won't exceed their max
        for (const candidate of candidates) {
          const f = facultyMap.get(candidate.facultyId)
          if (!f) continue
          const contractLimit: Record<string, number> = { casual: 18, part_time: 18, full_time: 21, permanent: 21 }
          const fContractLimit = contractLimit[f.contractType ?? 'full_time'] ?? 21
          const fMaxUnits = getEffectiveMaxUnits(f.maxUnits, (f.preferences || []) as FacultyPreferenceData[], semester)
          const fEffMax = Math.min(fMaxUnits, fContractLimit)
          const fCurrentUnits = facultyUnits.get(f.id) || 0
          if (fCurrentUnits + task.subjectUnits <= fEffMax) {
            bestCandidate = candidate
            break
          }
        }
      }

      // Fallback: if no scored candidate (or none within max), try first available without scoring
      if (!bestCandidate) {
        for (const f of sortedFaculty) {
          // Re-check eligibility with current units
          const contractLimit: Record<string, number> = { casual: 18, part_time: 18, full_time: 21, permanent: 21 }
          const fContractLimit = contractLimit[f.contractType ?? 'full_time'] ?? 21
          const fMaxUnits = getEffectiveMaxUnits(f.maxUnits, (f.preferences || []) as FacultyPreferenceData[], semester)
          const fEffMax = Math.min(fMaxUnits, fContractLimit)
          const fCurrentUnits = facultyUnits.get(f.id) || 0
          if (fCurrentUnits + task.subjectUnits > fEffMax) continue // hard cap

          const facultyBooked = facultySlotBooked.get(f.id)!
          const sectionBooked = sectionSlotBooked.get(task.sectionId)!

          for (const day of days) {
            let found = false
            for (let si = 0; si <= timeSlots.length - slotCount; si++) {
              const neededSlots = timeSlots.slice(si, si + slotCount)
              let allFree = true
              for (const slot of neededSlots) {
                const slotKey = `${day}-${slot.start}-${slot.end}`
                if (facultyBooked.has(slotKey) || sectionBooked.has(slotKey)) {
                  allFree = false
                  break
                }
              }
              if (!allFree) continue

              bestCandidate = {
                day,
                startSlotIndex: si,
                slots: neededSlots,
                score: 0,
                facultyId: f.id,
              }
              found = true
              break
            }
            if (found) break
          }
          if (bestCandidate) break
        }
      }

      if (!bestCandidate) {
        unassignedCount++
        continue
      }

      // Assign all slots for this task
      for (const slot of bestCandidate.slots) {
        const slotKey = `${bestCandidate.day}-${slot.start}-${slot.end}`
        generatedSchedules.push({
          day: bestCandidate.day,
          startTime: slot.start,
          endTime: slot.end,
          subjectId: task.subjectId,
          facultyId: bestCandidate.facultyId,
          roomId: null,
          sectionId: task.sectionId,
          scheduleVersionId: version.id,
          status: 'initial',
        })

        // Update tracking
        facultySlotBooked.get(bestCandidate.facultyId)?.add(slotKey)
        sectionSlotBooked.get(task.sectionId)?.add(slotKey)

        // Track merge slots for this faculty
        const mergeKey = `${bestCandidate.day}-${slot.start}-${slot.end}-${task.subjectId}`
        const fMergeSlots = facultyMergeSlots.get(bestCandidate.facultyId)!
        const existingMerges = fMergeSlots.get(mergeKey) || []
        existingMerges.push({
          programId: task.sectionProgramId,
          yearLevel: task.sectionYearLevel,
          sectionId: task.sectionId,
        })
        fMergeSlots.set(mergeKey, existingMerges)

        // Update day counts
        const secDayMap = sectionDayCount.get(task.sectionId)!
        secDayMap.set(bestCandidate.day, (secDayMap.get(bestCandidate.day) || 0) + 1)

        const facDayMap = facultyDayCount.get(bestCandidate.facultyId)!
        facDayMap.set(bestCandidate.day, (facDayMap.get(bestCandidate.day) || 0) + 1)

        globalDayCount.set(bestCandidate.day, (globalDayCount.get(bestCandidate.day) || 0) + 1)
      }

      // Add units — for merged classes, only count units once per unique subject assignment
      // (merged sections share the same teaching period, not additional load)
      const mergeKey = `${bestCandidate.day}-${bestCandidate.slots[0].start}-${bestCandidate.slots[0].end}-${task.subjectId}`
      const fMergeSlots = facultyMergeSlots.get(bestCandidate.facultyId)!
      const mergesForSlot = fMergeSlots.get(mergeKey) || []
      // Only add units for the first section in a merge group (not for subsequent merged sections)
      const isFirstInSectionMerge = mergesForSlot.findIndex(m => m.sectionId === task.sectionId) === 0
      if (isFirstInSectionMerge) {
        facultyUnits.set(bestCandidate.facultyId, (facultyUnits.get(bestCandidate.facultyId) || 0) + task.subjectUnits)
      }
    }

    // ── PHASE 4: Persist schedules ──
    if (generatedSchedules.length > 0) {
      await db.schedule.createMany({ data: generatedSchedules })
    }

    // ── PHASE 5: Conflict detection ──
    const conflicts = await detectConflicts(version.id)
    const totalConflicts = conflicts.length // Only actual conflicts, not unassigned subjects

    const finalStatus: 'completed' | 'partial' | 'failed' =
      generatedSchedules.length === 0 ? 'failed' :
      unassignedCount > 0 ? 'partial' : 'completed'

    // Log day distribution
    console.log('📊 Day distribution:')
    days.forEach(d => {
      const count = globalDayCount.get(d) || 0
      console.log(`  ${d}: ${count} schedules`)
    })

    // Update session
    await db.generationSession.update({
      where: { id: session.id },
      data: {
        status: finalStatus,
        totalSchedules: generatedSchedules.length,
        conflictCount: totalConflicts,
        score: 0, // kept for DB compat, no longer displayed
        completedAt: new Date(),
      },
    })

    console.log(`✅ Generation complete: ${generatedSchedules.length} schedules, ${totalConflicts} conflicts`)

    return {
      sessionId: session.id,
      versionId: version.id,
      totalSchedules: generatedSchedules.length,
      conflictCount: totalConflicts,
      status: finalStatus,
      message: generatedSchedules.length > 0
        ? `Generated ${generatedSchedules.length} schedules with ${totalConflicts} conflicts${unassignedCount > 0 ? ` (${unassignedCount} subjects could not be assigned)` : ''}`
        : 'No schedules could be generated. Check that subjects, faculty, and sections exist for the selected semester.',
    }
  } catch (error) {
    console.error('Schedule generation error:', error)

    await db.generationSession.update({
      where: { id: session.id },
      data: { status: 'failed', completedAt: new Date() },
    })

    return {
      sessionId: session.id,
      versionId: version.id,
      totalSchedules: 0,
      conflictCount: 0,
      score: 0,
      status: 'failed',
      message: `Schedule generation failed: ${error instanceof Error ? error.message : 'Internal error'}`,
    }
  }
}

/**
 * Detect conflicts in a schedule version
 *
 * School rules for conflict detection:
 *
 * NOT a conflict:
 * - Same professor teaches same subject at same time for multiple sections
 *   of the same program & year level (merged classes are allowed)
 *
 * Conflict MUST trigger only when:
 * 1. Merge limit exceeded: Professor already has 2 sections merged for the same subject
 *    at the same time (adding a 3rd section is a conflict)
 * 2. Invalid merge: Same subject + same time but different program or year level
 *    (cross-program/year merging is not allowed)
 * 3. Faculty overload: Part-time > 18 units, Full-time > 21 units
 */
export async function detectConflicts(scheduleVersionId: string) {
  const schedules = await db.schedule.findMany({
    where: { scheduleVersionId },
    include: {
      subject: true,
      faculty: { select: { id: true, name: true, specialization: true, contractType: true, facultyType: true } },
      section: { include: { program: true } },
    },
  })

  // Clear existing unresolved conflicts for this version
  const existingConflicts = await db.conflict.findMany({
    where: {
      OR: [
        { schedule1: { scheduleVersionId } },
        { schedule2: { scheduleVersionId } },
      ],
      isResolved: false,
    },
  })

  const conflictIds = existingConflicts.map(c => c.id)
  if (conflictIds.length > 0) {
    await db.conflict.deleteMany({ where: { id: { in: conflictIds } } })
  }

  const conflicts: Array<{
    type: string
    severity: string
    scheduleId1: string
    scheduleId2: string | null
    details: string
  }> = []

  // ── Conflict 1: Faculty overload ──
  // Part-time: max 18 units, Full-time: max 21 units
  // Uses merge-aware counting matching the generation algorithm:
  //   - Same faculty + same day + same time + same subject = 1 merge group (section merges)
  //   - Same faculty + same day + same subject + same section + consecutive slots = 1 task
  // Units are counted ONCE per task, and once per merge group (first section only).
  const facultyTotalUnits: Map<string, { name: string; total: number; contractType: string | null }> = new Map()
  // Track counted task groups: Map<facultyId, Set<"day|subjectId|sectionId">>
  const countedTasks: Map<string, Set<string>> = new Map()
  // Track counted merge groups for section-merge dedup: Map<facultyId, Set<"day|start|end|subjectId">>
  const countedMerges: Map<string, Set<string>> = new Map()

  // Group schedules by faculty first
  const byFaculty = new Map<string, typeof schedules>()
  for (const s of schedules) {
    const arr = byFaculty.get(s.facultyId) || []
    arr.push(s)
    byFaculty.set(s.facultyId, arr)
  }

  for (const [facultyId, facSchedules] of byFaculty) {
    // Group into task groups: same day + same subject + same section = 1 task
    const taskGroups = new Map<string, typeof schedules>()
    for (const s of facSchedules) {
      const taskKey = `${s.day}|${s.subjectId}|${s.sectionId}`
      const arr = taskGroups.get(taskKey) || []
      arr.push(s)
      taskGroups.set(taskKey, arr)
    }

    const facCountedTasks = countedTasks.get(facultyId) || new Set()
    const facCountedMerges = countedMerges.get(facultyId) || new Set()
    let totalUnits = 0

    for (const [, group] of taskGroups) {
      // Find earliest start time (first slot of the task)
      group.sort((a, b) => a.startTime.localeCompare(b.startTime))
      const firstSlot = group[0]
      const taskKey = `${firstSlot.day}|${firstSlot.subjectId}|${firstSlot.sectionId}`
      const mergeKey = `${firstSlot.day}|${firstSlot.startTime}|${firstSlot.endTime}|${firstSlot.subjectId}`

      // Count units once per task group AND once per merge group
      if (!facCountedTasks.has(taskKey) && !facCountedMerges.has(mergeKey)) {
        totalUnits += firstSlot.subject.units
        facCountedTasks.add(taskKey)
        facCountedMerges.add(mergeKey)
      }
    }

    countedTasks.set(facultyId, facCountedTasks)
    countedMerges.set(facultyId, facCountedMerges)

    const firstSchedule = facSchedules[0]
    facultyTotalUnits.set(facultyId, {
      name: firstSchedule.faculty.name,
      total: totalUnits,
      contractType: firstSchedule.faculty.contractType,
    })
  }
  for (const [facultyId, info] of facultyTotalUnits) {
    // School rules: Part-time max 18 units, Full-time max 21 units
    const contractMaxUnits: Record<string, number> = {
      casual: 18,
      part_time: 18,
      full_time: 21,
      permanent: 21,
    }
    const maxAllowed = contractMaxUnits[info.contractType ?? 'full_time'] ?? 21
    const contractLabel: Record<string, string> = {
      casual: 'Casual',
      part_time: 'Part-time',
      full_time: 'Full-time',
      permanent: 'Permanent',
    }
    const typeLabel = contractLabel[info.contractType ?? 'full_time'] ?? 'Full-time'
    if (info.total > maxAllowed) {
      const facSchedule = schedules.find(s => s.facultyId === facultyId)
      if (facSchedule) {
        conflicts.push({
          type: 'faculty_overload',
          severity: 'error',
          scheduleId1: facSchedule.id,
          scheduleId2: null,
          details: `${info.name} exceeds maximum load: ${info.total} units assigned (max ${maxAllowed} for ${typeLabel})`,
        })
      }
    }
  }

  // ── Build merge groups for efficient checking ──
  // Group schedules by: facultyId + subjectId + day + startTime + endTime
  const mergeGroups: Map<string, typeof schedules> = new Map()
  for (const s of schedules) {
    const key = `${s.facultyId}|${s.subjectId}|${s.day}|${s.startTime}|${s.endTime}`
    const group = mergeGroups.get(key) || []
    group.push(s)
    mergeGroups.set(key, group)
  }

  // ── Conflict 2 & 3: Check each merge group ──
  for (const [, group] of mergeGroups) {
    if (group.length <= 1) continue

    // All schedules in this group share the same faculty + subject + day + time
    // Check program/year level consistency
    const programs = new Set(group.map(s => s.section.programId))
    const yearLevels = new Set(group.map(s => s.section.yearLevel))

    if (programs.size > 1 || yearLevels.size > 1) {
      // Conflict 2: Invalid merge — same subject + time but different program or year level
      // Flag each pair that differs
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const s1 = group[i]
          const s2 = group[j]
          const sameProgram = s1.section.programId === s2.section.programId
          const sameYearLevel = s1.section.yearLevel === s2.section.yearLevel

          if (!sameProgram || !sameYearLevel) {
            conflicts.push({
              type: 'invalid_merge',
              severity: 'error',
              scheduleId1: s1.id,
              scheduleId2: s2.id,
              details: `${s1.faculty.name} has "${s1.subject.subjectCode}" at same time on ${s1.day}, but sections have ${!sameProgram ? 'different programs' : 'different year levels'} — cross-program/year merging is not allowed`,
            })
          }
        }
      }
    }

    // Among schedules with same program + year level, check merge limit
    const validMergeSubGroups: Map<string, typeof schedules> = new Map()
    for (const s of group) {
      const subKey = `${s.section.programId}|${s.section.yearLevel}`
      const subGroup = validMergeSubGroups.get(subKey) || []
      subGroup.push(s)
      validMergeSubGroups.set(subKey, subGroup)
    }

    for (const [, subGroup] of validMergeSubGroups) {
      // Conflict 3: Merge limit exceeded — more than 2 sections merged for same subject slot
      if (subGroup.length > 2) {
        // Flag once for this merge group (not per pair)
        const alreadyFlagged = conflicts.some(c =>
          c.type === 'merge_limit_exceeded' &&
          subGroup.some(s => s.id === c.scheduleId1 || s.id === c.scheduleId2)
        )
        if (!alreadyFlagged) {
          const sectionNames = subGroup.map(s => s.section.sectionName).join(', ')
          conflicts.push({
            type: 'merge_limit_exceeded',
            severity: 'error',
            scheduleId1: subGroup[0].id,
            scheduleId2: subGroup[1].id,
            details: `"${subGroup[0].subject.subjectCode}" on ${subGroup[0].day} ${subGroup[0].startTime}-${subGroup[0].endTime} is merged with ${subGroup.length} sections (${sectionNames}) — maximum 2 sections allowed per merge`,
          })
        }
      }
    }
  }

  if (conflicts.length > 0) {
    await db.conflict.createMany({ data: conflicts })
  }

  return conflicts
}
