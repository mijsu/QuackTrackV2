/**
 * FAST Schedule Generator v3 — Major improvements over v2
 *
 * Retained from v2:
 * - Balanced multi-pass approach (maximizes unique subjects)
 * - Rarest-first heuristic (MCV — most constrained variable first)
 * - Department-based faculty matching
 * - Subject assignment caps (prevents monopoly)
 * - Early termination on timeout
 *
 * v3 additions:
 *  1. Lunch break avoidance (12:00-13:00 deprioritized, not hard-blocked)
 *  2. Max consecutive hours limit (default 6 h, configurable)
 *  3. Part-time faculty support (lower unit cap, Saturday preference)
 *  4. Day balance optimization (spread assignments across days)
 *  5. Room efficiency scoring (tightest fit preferred)
 *  6. Equipment violation detection (comprehensive post-generation scan)
 *  7. Enhanced violation detection (specialization, overload, duplicates)
 *  8. Progress callback support
 *  9. Enhanced generation stats (v3-specific fields)
 * 10. Improved unassigned tracking (specific failure reasons)
 */

import type {
  Faculty, Room, Section, Subject, ScheduleAssignment,
  GenerationResult, UnassignedItem, GenerationStats,
  ConstraintViolation, CurriculumEntry,
} from './scheduling-algorithm';

// Re-export types needed by consumers (generate/route.ts)
export type {
  Faculty, Room, Section, Subject, ScheduleAssignment,
  GenerationResult, UnassignedItem, GenerationStats,
  ConstraintViolation, CurriculumEntry, ExistingSchedule,
};

// ============================================================================
// CONSTANTS
// ============================================================================

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
export const WORK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

/** Lunch break window — minutes from midnight */
const LUNCH_START = 12 * 60; // 12:00
const LUNCH_END = 13 * 60;   // 13:00

/** Default maximum consecutive teaching minutes for a faculty member per day */
const MAX_CONSECUTIVE_MINUTES = 6 * 60; // 6 hours

/** Default maximum units for part-time faculty (if their maxUnits is not already lower) */
const PART_TIME_DEFAULT_MAX_UNITS = 12;

/** Gap tolerance (minutes) for merging adjacent blocks into a consecutive run */
const CONSECUTIVE_GAP_TOLERANCE = 5;

// ============================================================================
// PUBLIC TYPES
// ============================================================================

/** Progress information passed to the optional onProgress callback. */
export interface ProgressInfo {
  pass: number;
  totalAssignments: number;
  uniqueSubjects: number;
  phase: string;
}

/** Extended generation stats with v3-specific fields. */
export interface V3GenerationStats extends GenerationStats {
  partTimeFacultyUsed: number;
  fullTimeFacultyUsed: number;
  lunchBreakCrossings: number;
  avgConsecutiveHours: number;
}

/**
 * Represents an existing schedule from the database that should be respected
 * during generation (e.g., executive schedules already saved to DB when
 * generating regular schedules afterward).
 *
 * These are loaded into the FastContext before generation begins so that
 * conflict detection works across already-committed schedules.
 */
export interface ExistingSchedule {
  facultyId: string;
  roomId?: string | null;
  sectionId: string;
  subjectId: string;
  subjectUnits: number;
  day: string;
  startTime: string;
  endTime: string;
}

// ============================================================================
// INTERNAL TYPES
// ============================================================================

/** Reason codes for why a subject-section pair could not be assigned. */
type UnassignedReason =
  | 'No eligible faculty'
  | 'No suitable room'
  | 'Faculty at capacity'
  | 'No time slot available'
  | 'Subject already assigned to section';

/** Internal scheduling context with all tracking state. */
interface FastContext {
  assignments: ScheduleAssignment[];
  facultyLoad: Map<string, number>;
  facultyAssignmentCount: Map<string, number>;
  facultySchedule: Map<string, Map<string, Array<{ start: string; end: string }>>>;
  roomSchedule: Map<string, Map<string, Array<{ start: string; end: string }>>>;
  sectionSchedule: Map<string, Map<string, Array<{ start: string; end: string }>>>;
  sectionSubjects: Map<string, Set<string>>;
  subjectAssignmentCount: Map<string, number>;
  facultyMap: Map<string, Faculty>;
  roomMap: Map<string, Room>;
  sectionMap: Map<string, Section>;
  subjectMap: Map<string, Subject>;

  // v3 — Faculty per-day teaching blocks (minutes) for consecutive-hours tracking
  facultyDayMinutes: Map<string, Map<string, Array<{ start: number; end: number }>>>;

  // v3 — Global day assignment count for day-balance optimisation
  dayAssignmentCount: Map<string, number>;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/** Convert "HH:MM" time string to minutes from midnight. */
function timeToMinutes(time: string): number {
  const parts = time.split(':');
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  return h * 60 + (m || 0);
}

/** Check if two time ranges overlap (string-based). */
function timesOverlap(s1: string, e1: string, s2: string, e2: string): boolean {
  const start1 = timeToMinutes(s1);
  const end1 = timeToMinutes(e1);
  const start2 = timeToMinutes(s2);
  const end2 = timeToMinutes(e2);
  return start1 < end2 && end1 > start2;
}

/** Convert minutes from midnight to "HH:MM" time string. */
function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Check if a time range crosses the lunch window (12:00 – 13:00).
 * Returns true when the range overlaps with [LUNCH_START, LUNCH_END).
 */
function crossesLunch(startMin: number, endMin: number): boolean {
  return startMin < LUNCH_END && endMin > LUNCH_START;
}

/**
 * Calculate the maximum consecutive block duration when adding a new time block
 * to a faculty member's existing day schedule.
 *
 * Blocks separated by at most {@link CONSECUTIVE_GAP_TOLERANCE} minutes are
 * merged into a single consecutive run.
 *
 * @returns Duration in minutes of the longest consecutive block.
 */
function getMaxConsecutiveMinutes(
  dayMinutes: ReadonlyArray<{ start: number; end: number }>,
  newStart: number,
  newEnd: number,
): number {
  if (dayMinutes.length === 0) return newEnd - newStart;

  const allBlocks = [...dayMinutes, { start: newStart, end: newEnd }]
    .sort((a, b) => a.start - b.start);

  let maxDuration = 0;
  let blockStart = allBlocks[0].start;
  let blockEnd = allBlocks[0].end;

  for (let i = 1; i < allBlocks.length; i++) {
    const block = allBlocks[i];
    if (block.start <= blockEnd + CONSECUTIVE_GAP_TOLERANCE) {
      blockEnd = Math.max(blockEnd, block.end);
    } else {
      maxDuration = Math.max(maxDuration, blockEnd - blockStart);
      blockStart = block.start;
      blockEnd = block.end;
    }
  }
  maxDuration = Math.max(maxDuration, blockEnd - blockStart);
  return maxDuration;
}

/**
 * Read the contract type from a Faculty object.
 * The field may not exist on the imported type, so we access it safely.
 * Defaults to 'full-time'.
 */
function getContractType(faculty: Faculty): 'full-time' | 'part-time' {
  // The Faculty type does not include contractType, but the DB User model does.
  // We access it via an intermediate type that mirrors the DB shape.
  const extended = faculty as unknown as { contractType?: string | null };
  return extended.contractType === 'part-time' ? 'part-time' : 'full-time';
}

/**
 * Get the effective maximum units for a faculty member, applying the
 * part-time cap when applicable.
 */
function getEffectiveMaxUnits(faculty: Faculty): number {
  if (getContractType(faculty) === 'part-time') {
    return Math.min(faculty.maxUnits, PART_TIME_DEFAULT_MAX_UNITS);
  }
  return faculty.maxUnits;
}

/**
 * Check if an entity already has a scheduling conflict for the given day/time.
 */
function hasConflict(
  schedule: Map<string, Map<string, Array<{ start: string; end: string }>>>,
  id: string,
  day: string,
  start: string,
  end: string,
): boolean {
  const daySchedule = schedule.get(id)?.get(day);
  if (!daySchedule) return false;
  return daySchedule.some(block => timesOverlap(block.start, block.end, start, end));
}

/** Register a time block in the conflict-tracking schedule map. */
function addSchedule(
  schedule: Map<string, Map<string, Array<{ start: string; end: string }>>>,
  id: string,
  day: string,
  start: string,
  end: string,
): void {
  if (!schedule.has(id)) schedule.set(id, new Map());
  const dayMap = schedule.get(id)!;
  if (!dayMap.has(day)) dayMap.set(day, []);
  dayMap.get(day)!.push({ start, end });
}

/** Register a time block (in minutes) for consecutive-hours tracking. */
function addDayMinutes(
  facultyDayMinutes: Map<string, Map<string, Array<{ start: number; end: number }>>>,
  facultyId: string,
  day: string,
  startMin: number,
  endMin: number,
): void {
  if (!facultyDayMinutes.has(facultyId)) facultyDayMinutes.set(facultyId, new Map());
  const dayMap = facultyDayMinutes.get(facultyId)!;
  if (!dayMap.has(day)) dayMap.set(day, []);
  dayMap.get(day)!.push({ start: startMin, end: endMin });
}

/** Extract year level from subject code (e.g. CS101 → 1, IT201 → 2). */
function extractYearFromCode(code: string): number | null {
  const match = code.match(/\d/);
  if (match) {
    const digit = parseInt(match[0], 10);
    if (digit >= 1 && digit <= 5) return digit;
  }
  return null;
}

// ============================================================================
// ASSIGNMENT LOGIC
// ============================================================================

/**
 * Try to assign a single (subject, section) pair to a faculty / room / time slot.
 *
 * @returns The reason for failure, or `null` on success.
 */
function tryAssign(
  ctx: FastContext,
  subject: Subject,
  section: Section,
  deptFaculty: Map<string | null, Faculty[]>,
  sortedRooms: Room[],
  sectionCapacity: Map<string, number>,
  workDays: readonly string[],
): UnassignedReason | null {
  // ── Duplicate check ──────────────────────────────────────────────────────
  const assignedSubjects = ctx.sectionSubjects.get(section.id);
  if (assignedSubjects?.has(subject.id)) {
    return 'Subject already assigned to section';
  }

  // ── Find eligible faculty ────────────────────────────────────────────────
  const deptFacultyList = deptFaculty.get(subject.departmentId) || [];
  const eligibleFaculty: Faculty[] = [];

  for (const f of deptFacultyList) {
    const effectiveMax = getEffectiveMaxUnits(f);
    const currentLoad = ctx.facultyLoad.get(f.id) || 0;
    if (currentLoad + subject.units > effectiveMax) continue;

    const reqSpecs = subject.requiredSpecialization || [];
    const fSpecs = f.specialization || [];
    if (reqSpecs.length > 0 && fSpecs.length > 0 && !reqSpecs.some(s => fSpecs.includes(s))) {
      continue;
    }
    eligibleFaculty.push(f);
  }

  if (eligibleFaculty.length === 0) {
    const anyFaculty = deptFacultyList.length > 0;
    const allAtCapacity = deptFacultyList.length > 0 && deptFacultyList.every(f => {
      const effectiveMax = getEffectiveMaxUnits(f);
      return (ctx.facultyLoad.get(f.id) || 0) + subject.units > effectiveMax;
    });
    return anyFaculty && allAtCapacity
      ? 'Faculty at capacity'
      : 'No eligible faculty';
  }

  // ── Find suitable rooms ──────────────────────────────────────────────────
  const hasRooms = sortedRooms.length > 0;
  let suitableRooms: Room[] = [];
  
  if (hasRooms) {
    const capacity = sectionCapacity.get(section.id) || 30;
    suitableRooms = sortedRooms.filter(r => r.capacity >= capacity);

    const requiredEquipment = subject.requiredEquipment || [];
    if (requiredEquipment.length > 0) {
      const equipmentRooms = suitableRooms.filter(r => {
        const roomEquip = r.equipment || [];
        return requiredEquipment.every(eq => roomEquip.includes(eq));
      });
      if (equipmentRooms.length > 0) {
        suitableRooms = equipmentRooms;
      }
      // else: graceful fallback — use capacity-only rooms; violation caught post-generation
    }

    if (suitableRooms.length === 0) return 'No suitable room';

    // v3 — Room efficiency scoring: prefer tightest capacity fit
    suitableRooms = [...suitableRooms].sort((a, b) => (a.capacity - capacity) - (b.capacity - capacity));
  }

  const durationHours = subject.defaultDurationHours || Math.min(subject.units || 3, 4);
  const durationMinutes = durationHours * 60;

  // ── Sort faculty: least loaded first, then fewest assignments (diversity) ─
  eligibleFaculty.sort((a, b) => {
    const loadA = ctx.facultyLoad.get(a.id) || 0;
    const loadB = ctx.facultyLoad.get(b.id) || 0;
    if (loadA !== loadB) return loadA - loadB;
    return (ctx.facultyAssignmentCount.get(a.id) || 0) - (ctx.facultyAssignmentCount.get(b.id) || 0);
  });

  // Track whether we attempted any time slot at all
  let anySlotAttempted = false;

  // ── Main search: for each faculty × room, try non-lunch then lunch slots ─
  // If no rooms available, iterate once with null room
  const roomsToIterate = hasRooms ? suitableRooms : [null as Room | null];
  for (const faculty of eligibleFaculty) {
    const prefDays = faculty.preferences?.preferredDays || [...workDays];
    const prefStart = faculty.preferences?.preferredTimeStart
      ? timeToMinutes(faculty.preferences.preferredTimeStart) : 7 * 60;
    const prefEnd = faculty.preferences?.preferredTimeEnd
      ? timeToMinutes(faculty.preferences.preferredTimeEnd) : 21 * 60;
    const unavailableDays = faculty.preferences?.unavailableDays || [];
    const isPartTime = getContractType(faculty) === 'part-time';

    for (const room of roomsToIterate) {
      // v3 — Day balance: sort preferred days by ascending global count
      const availablePrefDays = prefDays
        .filter(d => !unavailableDays.includes(d))
        .sort((a, b) => (ctx.dayAssignmentCount.get(a) || 0) - (ctx.dayAssignmentCount.get(b) || 0));

      // ── Phase A: Preferred days, non-lunch slots ─────────────────────────
      for (const day of availablePrefDays) {
        for (let hour = Math.ceil(prefStart / 60); hour <= Math.floor((prefEnd - durationMinutes) / 60); hour++) {
          const startMin = hour * 60;
          const endMin = startMin + durationMinutes;
          if (endMin > 21 * 60) continue;
          if (crossesLunch(startMin, endMin)) continue; // skip lunch — Phase B handles it

          anySlotAttempted = true;

          const start = minutesToTime(startMin);
          const end = minutesToTime(endMin);
          if (hasConflict(ctx.facultySchedule, faculty.id, day, start, end)) continue;
          if (room && hasConflict(ctx.roomSchedule, room.id, day, start, end)) continue;
          if (hasConflict(ctx.sectionSchedule, section.id, day, start, end)) continue;

          // v3 — Max consecutive hours check
          const existing = ctx.facultyDayMinutes.get(faculty.id)?.get(day) || [];
          if (getMaxConsecutiveMinutes(existing, startMin, endMin) > MAX_CONSECUTIVE_MINUTES) continue;

          makeAssignment(ctx, subject, faculty, section, room, day, start, end, startMin, endMin);
          return null;
        }
      }

      // ── Phase B: Preferred days, lunch-crossing slots (fallback) ─────────
      for (const day of availablePrefDays) {
        for (let hour = Math.ceil(prefStart / 60); hour <= Math.floor((prefEnd - durationMinutes) / 60); hour++) {
          const startMin = hour * 60;
          const endMin = startMin + durationMinutes;
          if (endMin > 21 * 60) continue;
          if (!crossesLunch(startMin, endMin)) continue; // only lunch-crossing here

          const start = minutesToTime(startMin);
          const end = minutesToTime(endMin);
          if (hasConflict(ctx.facultySchedule, faculty.id, day, start, end)) continue;
          if (room && hasConflict(ctx.roomSchedule, room.id, day, start, end)) continue;
          if (hasConflict(ctx.sectionSchedule, section.id, day, start, end)) continue;

          const existing = ctx.facultyDayMinutes.get(faculty.id)?.get(day) || [];
          if (getMaxConsecutiveMinutes(existing, startMin, endMin) > MAX_CONSECUTIVE_MINUTES) continue;

          makeAssignment(ctx, subject, faculty, section, room, day, start, end, startMin, endMin);
          return null;
        }
      }

      // ── Phase C: Standard slots, day-balanced order ──────────────────────
      const stdBlockStarts = [
        7 * 60, 8 * 60, 9 * 60, 10 * 60, 11 * 60,
        13 * 60, 14 * 60, 15 * 60, 16 * 60, 17 * 60, 18 * 60, 19 * 60, 20 * 60,
      ];

      const availableWorkDays = [...workDays]
        .filter(d => !unavailableDays.includes(d))
        .sort((a, b) => {
          // v3 — Part-time Saturday preference
          if (isPartTime && a === 'Saturday') return -1;
          if (isPartTime && b === 'Saturday') return 1;
          return (ctx.dayAssignmentCount.get(a) || 0) - (ctx.dayAssignmentCount.get(b) || 0);
        });

      // Standard non-lunch first, then standard lunch-crossing
      for (const day of availableWorkDays) {
        for (const startMin of stdBlockStarts) {
          const endMin = startMin + durationMinutes;
          if (endMin > 21 * 60) continue;
          if (crossesLunch(startMin, endMin)) continue;

          anySlotAttempted = true;
          const start = minutesToTime(startMin);
          const end = minutesToTime(endMin);
          if (hasConflict(ctx.facultySchedule, faculty.id, day, start, end)) continue;
          if (room && hasConflict(ctx.roomSchedule, room.id, day, start, end)) continue;
          if (hasConflict(ctx.sectionSchedule, section.id, day, start, end)) continue;

          const existing = ctx.facultyDayMinutes.get(faculty.id)?.get(day) || [];
          if (getMaxConsecutiveMinutes(existing, startMin, endMin) > MAX_CONSECUTIVE_MINUTES) continue;

          makeAssignment(ctx, subject, faculty, section, room, day, start, end, startMin, endMin);
          return null;
        }

        for (const startMin of stdBlockStarts) {
          const endMin = startMin + durationMinutes;
          if (endMin > 21 * 60) continue;
          if (!crossesLunch(startMin, endMin)) continue;

          anySlotAttempted = true;
          const start = minutesToTime(startMin);
          const end = minutesToTime(endMin);
          if (hasConflict(ctx.facultySchedule, faculty.id, day, start, end)) continue;
          if (room && hasConflict(ctx.roomSchedule, room.id, day, start, end)) continue;
          if (hasConflict(ctx.sectionSchedule, section.id, day, start, end)) continue;

          const existing = ctx.facultyDayMinutes.get(faculty.id)?.get(day) || [];
          if (getMaxConsecutiveMinutes(existing, startMin, endMin) > MAX_CONSECUTIVE_MINUTES) continue;

          makeAssignment(ctx, subject, faculty, section, room, day, start, end, startMin, endMin);
          return null;
        }
      }
    }
  }

  return anySlotAttempted ? 'No time slot available' : 'No time slot available';
}

// ============================================================================
// ASSIGNMENT RECORDING
// ============================================================================

/**
 * Record a successful assignment and update all tracking structures.
 */
function makeAssignment(
  ctx: FastContext,
  subject: Subject,
  faculty: Faculty,
  section: Section,
  room: Room | null,
  day: string,
  start: string,
  end: string,
  startMin: number,
  endMin: number,
): void {
  const assignment: ScheduleAssignment = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    subjectId: subject.id,
    facultyId: faculty.id,
    sectionId: section.id,
    roomId: room?.id || '',
    day,
    startTime: start,
    endTime: end,
    status: 'generated',
  };

  ctx.assignments.push(assignment);
  ctx.facultyLoad.set(faculty.id, (ctx.facultyLoad.get(faculty.id) || 0) + subject.units);
  ctx.subjectAssignmentCount.set(subject.id, (ctx.subjectAssignmentCount.get(subject.id) || 0) + 1);
  ctx.facultyAssignmentCount.set(faculty.id, (ctx.facultyAssignmentCount.get(faculty.id) || 0) + 1);

  addSchedule(ctx.facultySchedule, faculty.id, day, start, end);
  if (room) {
    addSchedule(ctx.roomSchedule, room.id, day, start, end);
  }
  addSchedule(ctx.sectionSchedule, section.id, day, start, end);
  addDayMinutes(ctx.facultyDayMinutes, faculty.id, day, startMin, endMin);

  // v3 — Global day balance counter
  ctx.dayAssignmentCount.set(day, (ctx.dayAssignmentCount.get(day) || 0) + 1);

  if (!ctx.sectionSubjects.has(section.id)) {
    ctx.sectionSubjects.set(section.id, new Set());
  }
  ctx.sectionSubjects.get(section.id)!.add(subject.id);
}

// ============================================================================
// POST-GENERATION VIOLATION DETECTION
// ============================================================================

/**
 * Comprehensive post-generation violation scan.
 *
 * Checks for:
 * - `equipment_missing`: room lacks equipment required by the subject
 * - `specialization_mismatch`: faculty assigned outside their specialisation
 * - `unit_overload`: faculty exceeds their effective max units
 * - `duplicate_subject_section`: same subject assigned to same section >1×
 */
function detectViolations(ctx: FastContext): ConstraintViolation[] {
  const violations: ConstraintViolation[] = [];

  // ── Equipment violation ──────────────────────────────────────────────────
  for (const assignment of ctx.assignments) {
    const subject = ctx.subjectMap.get(assignment.subjectId);
    const room = ctx.roomMap.get(assignment.roomId);
    if (!subject || !room) continue;
    const requiredEquipment = subject.requiredEquipment || [];
    if (requiredEquipment.length === 0) continue;
    const roomEquip = room.equipment || [];
    const missingEquipment = requiredEquipment.filter(eq => !roomEquip.includes(eq));
    if (missingEquipment.length > 0) {
      violations.push({
        type: 'equipment_missing',
        severity: 'warning',
        description: `Room "${room.roomName}" missing equipment for ${subject.subjectCode}: ${missingEquipment.join(', ')}`,
        scheduleIds: [assignment.id],
      });
    }
  }

  // ── Specialisation mismatch ──────────────────────────────────────────────
  const processedPairs = new Set<string>();
  for (const assignment of ctx.assignments) {
    const pairKey = `${assignment.facultyId}|${assignment.subjectId}`;
    if (processedPairs.has(pairKey)) continue;
    processedPairs.add(pairKey);

    const faculty = ctx.facultyMap.get(assignment.facultyId);
    const subject = ctx.subjectMap.get(assignment.subjectId);
    if (!faculty || !subject) continue;

    const reqSpecs = subject.requiredSpecialization || [];
    const fSpecs = faculty.specialization || [];
    if (
      reqSpecs.length > 0 &&
      fSpecs.length > 0 &&
      !reqSpecs.some(s => fSpecs.includes(s))
    ) {
      violations.push({
        type: 'specialization_mismatch',
        severity: 'warning',
        description: `Faculty "${faculty.name}" assigned to ${subject.subjectCode} without matching specialisation (requires: ${reqSpecs.join(', ')}, has: ${fSpecs.join(', ')})`,
        scheduleIds: [assignment.id],
      });
    }
  }

  // ── Unit overload ────────────────────────────────────────────────────────
  for (const faculty of ctx.facultyMap.values()) {
    const effectiveMax = getEffectiveMaxUnits(faculty);
    const currentLoad = ctx.facultyLoad.get(faculty.id) || 0;
    if (currentLoad > effectiveMax) {
      const relatedIds = ctx.assignments
        .filter(a => a.facultyId === faculty.id)
        .map(a => a.id);
      violations.push({
        type: 'unit_overload',
        severity: 'warning',
        description: `Faculty "${faculty.name}" has ${currentLoad} units assigned, exceeding max of ${effectiveMax} units`,
        scheduleIds: relatedIds,
      });
    }
  }

  // ── Duplicate subject-section ────────────────────────────────────────────
  const pairCounts = new Map<string, string[]>();
  for (const assignment of ctx.assignments) {
    const key = `${assignment.subjectId}|${assignment.sectionId}`;
    if (!pairCounts.has(key)) pairCounts.set(key, []);
    pairCounts.get(key)!.push(assignment.id);
  }
  for (const [key, ids] of pairCounts) {
    if (ids.length <= 1) continue;
    const [subjectId, sectionId] = key.split('|');
    const subject = ctx.subjectMap.get(subjectId);
    const section = ctx.sectionMap.get(sectionId);
    violations.push({
      type: 'duplicate_subject_section',
      severity: 'critical',
      description: `Subject "${subject?.subjectCode || subjectId}" assigned to section "${section?.sectionName || sectionId}" ${ids.length} times`,
      scheduleIds: ids,
    });
  }

  return violations;
}

// ============================================================================
// V3 STATS CALCULATION
// ============================================================================

/**
 * Calculate enhanced v3 generation statistics from the final assignments.
 */
function calculateV3Stats(
  ctx: FastContext,
  totalPairs: number,
  generationTimeMs: number,
  facultyList: Faculty[],
): V3GenerationStats {
  // ── Part-time vs full-time faculty utilisation ───────────────────────────
  const usedFacultyIds = new Set(ctx.assignments.map(a => a.facultyId));
  let partTimeUsed = 0;
  let fullTimeUsed = 0;
  for (const fid of usedFacultyIds) {
    const faculty = ctx.facultyMap.get(fid);
    if (!faculty) continue;
    if (getContractType(faculty) === 'part-time') partTimeUsed++;
    else fullTimeUsed++;
  }

  // ── Lunch break crossings ────────────────────────────────────────────────
  let lunchCrossings = 0;
  for (const assignment of ctx.assignments) {
    const startMin = timeToMinutes(assignment.startTime);
    const endMin = timeToMinutes(assignment.endTime);
    if (crossesLunch(startMin, endMin)) lunchCrossings++;
  }

  // ── Average consecutive hours ────────────────────────────────────────────
  let totalConsecutiveMinutes = 0;
  let facultyDayCount = 0;
  for (const [, dayMap] of ctx.facultyDayMinutes) {
    for (const [, blocks] of dayMap) {
      if (blocks.length === 0) continue;
      const sorted = [...blocks].sort((a, b) => a.start - b.start);
      let blockStart = sorted[0].start;
      let blockEnd = sorted[0].end;
      let maxDuration = 0;
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].start <= blockEnd + CONSECUTIVE_GAP_TOLERANCE) {
          blockEnd = Math.max(blockEnd, sorted[i].end);
        } else {
          maxDuration = Math.max(maxDuration, blockEnd - blockStart);
          blockStart = sorted[i].start;
          blockEnd = sorted[i].end;
        }
      }
      maxDuration = Math.max(maxDuration, blockEnd - blockStart);
      totalConsecutiveMinutes += maxDuration;
      facultyDayCount++;
    }
  }
  const avgConsecutiveHours = facultyDayCount > 0
    ? Math.round(((totalConsecutiveMinutes / facultyDayCount) / 60) * 100) / 100
    : 0;

  const avgLoad = facultyList.length > 0
    ? Array.from(ctx.facultyLoad.values()).reduce((a, b) => a + b, 0) / facultyList.length
    : 0;

  return {
    totalSlots: totalPairs,
    assignedSlots: ctx.assignments.length,
    assignmentRate: totalPairs > 0 ? ctx.assignments.length / totalPairs : 0,
    averageFacultyLoad: avgLoad,
    averageRoomUtilization: 0,
    preferenceMatchRate: 1,
    generationTimeMs,
    backtrackCount: 0,
    skippedCount: 0,
    // v3-specific fields
    partTimeFacultyUsed: partTimeUsed,
    fullTimeFacultyUsed: fullTimeUsed,
    lunchBreakCrossings: lunchCrossings,
    avgConsecutiveHours,
  };
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

/**
 * Balanced multi-pass schedule generator v3.
 *
 * Generates optimised class schedules considering faculty load, room capacity,
 * time conflicts, lunch breaks, consecutive hours, part-time constraints,
 * day balance, and room efficiency.
 *
 * @param facultyList  - Available faculty members
 * @param roomList     - Available rooms
 * @param sectionList  - Class sections to fill
 * @param subjectList  - Subjects to schedule
 * @param curriculum   - Optional curriculum mapping (subject → section pairs)
 * @param maxTimeMs    - Maximum generation time in milliseconds
 * @param onProgress   - Optional progress callback for real-time reporting
 * @returns {@link GenerationResult} with schedules, violations, unassigned items, and stats
 */
export function generateSchedulesFast(
  facultyList: Faculty[],
  roomList: Room[],
  sectionList: Section[],
  subjectList: Subject[],
  curriculum?: CurriculumEntry[],
  maxTimeMs: number = 45000,
  onProgress?: (info: ProgressInfo) => void,
  existingSchedules?: ExistingSchedule[],
): GenerationResult {
  const startTime = Date.now();

  console.log(`[FAST-v3] Starting schedule generation...`);
  console.log(`[FAST-v3] Faculty: ${facultyList.length}, Rooms: ${roomList.length}, Sections: ${sectionList.length}, Subjects: ${subjectList.length}`);
  if (existingSchedules && existingSchedules.length > 0) {
    console.log(`[FAST-v3] Pre-loading ${existingSchedules.length} existing schedules for cross-phase conflict detection`);
  }

  // ── Build context ────────────────────────────────────────────────────────
  const ctx: FastContext = {
    assignments: [],
    facultyLoad: new Map(facultyList.map(f => [f.id, 0])),
    facultyAssignmentCount: new Map(facultyList.map(f => [f.id, 0])),
    facultySchedule: new Map(),
    roomSchedule: new Map(),
    sectionSchedule: new Map(),
    sectionSubjects: new Map(),
    subjectAssignmentCount: new Map(),
    facultyMap: new Map(facultyList.map(f => [f.id, f])),
    roomMap: new Map(roomList.map(r => [r.id, r])),
    sectionMap: new Map(sectionList.map(s => [s.id, s])),
    subjectMap: new Map(subjectList.map(s => [s.id, s])),
    facultyDayMinutes: new Map(),
    dayAssignmentCount: new Map(),
  };

  for (const day of WORK_DAYS) {
    ctx.dayAssignmentCount.set(day, 0);
  }

  // ── Seed context with existing schedules (cross-phase conflict avoidance) ──
  // This loads previously committed schedules (e.g., executive schedules from DB)
  // into the conflict tracking maps so the algorithm won't double-book faculty,
  // rooms, or sections that already have committed time slots.
  if (existingSchedules && existingSchedules.length > 0) {
    let seededFaculty = 0;
    let seededRooms = 0;
    let seededSections = 0;

    for (const sched of existingSchedules) {
      // Seed faculty schedule (time conflict tracking)
      addSchedule(ctx.facultySchedule, sched.facultyId, sched.day, sched.startTime, sched.endTime);

      // Seed faculty day minutes (consecutive hours tracking)
      const startMin = timeToMinutes(sched.startTime);
      const endMin = timeToMinutes(sched.endTime);
      addDayMinutes(ctx.facultyDayMinutes, sched.facultyId, sched.day, startMin, endMin);

      // Add to faculty load (unit capacity tracking)
      const currentLoad = ctx.facultyLoad.get(sched.facultyId) || 0;
      ctx.facultyLoad.set(sched.facultyId, currentLoad + sched.subjectUnits);
      ctx.facultyAssignmentCount.set(sched.facultyId, (ctx.facultyAssignmentCount.get(sched.facultyId) || 0) + 1);

      // Seed room schedule
      if (sched.roomId) {
        addSchedule(ctx.roomSchedule, sched.roomId, sched.day, sched.startTime, sched.endTime);
        seededRooms++;
      }

      // Seed section schedule
      addSchedule(ctx.sectionSchedule, sched.sectionId, sched.day, sched.startTime, sched.endTime);

      // Track which subjects are already assigned to which sections
      if (!ctx.sectionSubjects.has(sched.sectionId)) {
        ctx.sectionSubjects.set(sched.sectionId, new Set());
      }
      ctx.sectionSubjects.get(sched.sectionId)!.add(sched.subjectId);

      // Increment day assignment count for day balance
      ctx.dayAssignmentCount.set(sched.day, (ctx.dayAssignmentCount.get(sched.day) || 0) + 1);

      seededFaculty++;
      seededSections++;
    }

    console.log(`[FAST-v3] Seeded context: ${seededFaculty} faculty slots, ${seededRooms} room slots, ${seededSections} section slots`);

    // Log faculty load after seeding
    for (const [fid, load] of ctx.facultyLoad) {
      if (load > 0) {
        const faculty = ctx.facultyMap.get(fid);
        const effectiveMax = faculty ? getEffectiveMaxUnits(faculty) : 0;
        console.log(`[FAST-v3]   ${faculty?.name || fid}: ${load}/${effectiveMax} units (from existing schedules)`);
      }
    }
  }

  // ── Department maps ──────────────────────────────────────────────────────
  const deptFaculty = new Map<string | null, Faculty[]>();
  for (const f of facultyList) {
    if (!deptFaculty.has(f.departmentId)) deptFaculty.set(f.departmentId, []);
    deptFaculty.get(f.departmentId)!.push(f);
  }
  const deptSubjects = new Map<string, Subject[]>();
  for (const s of subjectList) {
    if (!deptSubjects.has(s.departmentId)) deptSubjects.set(s.departmentId, []);
    deptSubjects.get(s.departmentId)!.push(s);
  }
  const deptSections = new Map<string, Section[]>();
  for (const s of sectionList) {
    if (!deptSections.has(s.departmentId)) deptSections.set(s.departmentId, []);
    deptSections.get(s.departmentId)!.push(s);
  }

  const sectionCapacity = new Map(sectionList.map(s => [s.id, s.studentCount]));
  const sortedRooms = [...roomList].sort((a, b) => a.capacity - b.capacity);
  const totalFacultyCapacity = facultyList.reduce(
    (sum, f) => sum + getEffectiveMaxUnits(f), 0,
  );

  // Log part-time faculty info
  const ptCount = facultyList.filter(f => getContractType(f) === 'part-time').length;
  if (ptCount > 0) {
    console.log(`[FAST-v3] Part-time faculty: ${ptCount} (max ${PART_TIME_DEFAULT_MAX_UNITS} units each)`);
  }

  // =========================================================================
  // BUILD VALID (SUBJECT, SECTION) PAIRS
  // =========================================================================

  const subjectToSections = new Map<string, Array<{ sectionId: string; flexibility: number }>>();

  if (curriculum && curriculum.length > 0) {
    for (const entry of curriculum) {
      if (!entry.isRequired) continue;
      if (!subjectToSections.has(entry.subjectId)) {
        subjectToSections.set(entry.subjectId, []);
      }
      subjectToSections.get(entry.subjectId)!.push({ sectionId: entry.sectionId, flexibility: 0 });
    }
  } else {
    const flexibility = new Map<string, number>();
    for (const [deptId, subjects] of deptSubjects) {
      const sections = deptSections.get(deptId) || [];
      for (const subject of subjects) {
        let matchCount = 0;
        for (const section of sections) {
          const subjYear = subject.yearLevel || extractYearFromCode(subject.subjectCode);
          if (subjYear && Math.abs(subjYear - section.yearLevel) > 1) continue;
          matchCount++;
        }
        flexibility.set(subject.id, matchCount);
      }
    }

    for (const [deptId, subjects] of deptSubjects) {
      const sections = deptSections.get(deptId) || [];
      for (const subject of subjects) {
        const matchingSections: Array<{ sectionId: string; flexibility: number }> = [];
        for (const section of sections) {
          const subjYear = subject.yearLevel || extractYearFromCode(subject.subjectCode);
          if (subjYear && Math.abs(subjYear - section.yearLevel) > 1) continue;
          matchingSections.push({
            sectionId: section.id,
            flexibility: flexibility.get(subject.id) || 999,
          });
        }
        if (matchingSections.length > 0) {
          subjectToSections.set(subject.id, matchingSections);
        }
      }
    }

    const flexValues = [...flexibility.values()].sort((a, b) => a - b);
    console.log(`[FAST-v3] Subject flexibility range: ${flexValues[0] ?? 0} to ${flexValues[flexValues.length - 1] ?? 0} sections`);
  }

  // Sort subjects: RAREST FIRST (MCV heuristic)
  const sortedSubjectIds = [...subjectToSections.keys()].sort((a, b) => {
    const aFlex = subjectToSections.get(a)![0]?.flexibility ?? 999;
    const bFlex = subjectToSections.get(b)![0]?.flexibility ?? 999;
    if (aFlex !== bFlex) return aFlex - bFlex;
    return Math.random() - 0.5;
  });

  const totalPairs = [...subjectToSections.values()].reduce((sum, secs) => sum + secs.length, 0);
  console.log(`[FAST-v3] Total valid (subject, section) pairs: ${totalPairs}`);
  console.log(`[FAST-v3] Total faculty capacity: ${totalFacultyCapacity} units`);

  // =========================================================================
  // MULTI-PASS ASSIGNMENT
  // =========================================================================

  const unassigned: UnassignedItem[] = [];
  const unassignedSubjectSet = new Set<string>();
  let lastLogTime = Date.now();
  let passNumber = 0;
  const MAX_PASSES = 20;
  const avgUnitsPerSubject = subjectList.length > 0
    ? subjectList.reduce((sum, s) => sum + s.units, 0) / subjectList.length
    : 3;

  // Initial progress report
  onProgress?.({
    pass: 0,
    totalAssignments: 0,
    uniqueSubjects: 0,
    phase: 'initialization',
  });

  while (passNumber < MAX_PASSES) {
    const elapsed = Date.now() - startTime;
    if (elapsed > maxTimeMs) {
      console.log(`[FAST-v3] Timeout at pass ${passNumber}, ${elapsed}ms`);
      break;
    }

    onProgress?.({
      pass: passNumber + 1,
      totalAssignments: ctx.assignments.length,
      uniqueSubjects: new Set(ctx.assignments.map(a => a.subjectId)).size,
      phase: 'assignment',
    });

    let assignedThisPass = 0;

    for (const subjectId of sortedSubjectIds) {
      const elapsed = Date.now() - startTime;
      if (elapsed > maxTimeMs) break;

      const subject = ctx.subjectMap.get(subjectId);
      if (!subject) continue;

      const currentAssignments = ctx.subjectAssignmentCount.get(subjectId) || 0;
      if (currentAssignments > passNumber) continue;

      const remainingCapacity = totalFacultyCapacity
        - Array.from(ctx.facultyLoad.values()).reduce((a, b) => a + b, 0);
      if (remainingCapacity < avgUnitsPerSubject) {
        console.log(`[FAST-v3] Capacity exhausted at pass ${passNumber + 1}`);
        break;
      }

      const compatibleSections = subjectToSections.get(subjectId);
      if (!compatibleSections) continue;

      const shuffledSections = [...compatibleSections].sort(() => Math.random() - 0.5);

      let assigned = false;
      let lastFailReason: UnassignedReason = 'No eligible faculty';

      for (const { sectionId } of shuffledSections) {
        const section = ctx.sectionMap.get(sectionId);
        if (!section) continue;

        const result = tryAssign(ctx, subject, section, deptFaculty, sortedRooms, sectionCapacity, WORK_DAYS);
        if (result === null) {
          assigned = true;
          assignedThisPass++;
          break;
        }
        lastFailReason = result;
      }

      // Record first failure per subject with specific reason
      if (!assigned && currentAssignments === 0 && !unassignedSubjectSet.has(subjectId)) {
        unassignedSubjectSet.add(subjectId);
        const section = ctx.sectionMap.get(compatibleSections[0]?.sectionId);
        if (subject && section) {
          unassigned.push({
            subjectId: subject.id,
            subjectCode: subject.subjectCode,
            subjectName: subject.subjectName,
            sectionId: section.id,
            sectionName: section.sectionName,
            reason: lastFailReason,
          });
        }
      }
    }

    // Periodic progress log
    if (Date.now() - lastLogTime > 3000 || passNumber === 0) {
      const uniqueSubjs = new Set(ctx.assignments.map(a => a.subjectId)).size;
      const uniqueSecs = new Set(ctx.assignments.map(a => a.sectionId)).size;
      console.log(
        `[FAST-v3] Pass ${passNumber + 1}: +${assignedThisPass} ` +
        `(total: ${ctx.assignments.length}, subjects: ${uniqueSubjs}, sections: ${uniqueSecs})`,
      );
      lastLogTime = Date.now();
    }

    if (assignedThisPass === 0) {
      console.log(`[FAST-v3] No more assignments possible after pass ${passNumber + 1}`);
      break;
    }

    passNumber++;
  }

  // Completion progress report
  onProgress?.({
    pass: passNumber,
    totalAssignments: ctx.assignments.length,
    uniqueSubjects: new Set(ctx.assignments.map(a => a.subjectId)).size,
    phase: 'complete',
  });

  // =========================================================================
  // GENERATION SUMMARY
  // =========================================================================

  const elapsed = Date.now() - startTime;
  const uniqueSubjectsAssigned = new Set(ctx.assignments.map(a => a.subjectId)).size;
  const uniqueSectionsServed = new Set(ctx.assignments.map(a => a.sectionId)).size;

  console.log(`\n[FAST-v3] === GENERATION COMPLETE ===`);
  console.log(`[FAST-v3] Time: ${elapsed}ms`);
  console.log(`[FAST-v3] Passes: ${passNumber}`);
  console.log(`[FAST-v3] Total assignments: ${ctx.assignments.length}`);
  console.log(
    `[FAST-v3] Unique subjects: ${uniqueSubjectsAssigned}/${subjectList.length} ` +
    `(${subjectList.length > 0 ? Math.round(uniqueSubjectsAssigned / subjectList.length * 100) : 0}%)`,
  );
  console.log(`[FAST-v3] Sections covered: ${uniqueSectionsServed}/${sectionList.length}`);

  const sectionSubjectCounts = [...ctx.sectionSubjects.values()].map(s => s.size);
  if (sectionSubjectCounts.length > 0) {
    console.log(
      `[FAST-v3] Subjects per section: ` +
      `min=${Math.min(...sectionSubjectCounts)}, max=${Math.max(...sectionSubjectCounts)}, ` +
      `avg=${(sectionSubjectCounts.reduce((a, b) => a + b, 0) / sectionSubjectCounts.length).toFixed(1)}`,
    );
  }

  // Day distribution
  console.log(`[FAST-v3] Day distribution:`);
  for (const day of WORK_DAYS) {
    console.log(`  ${day}: ${ctx.dayAssignmentCount.get(day) ?? 0}`);
  }

  // =========================================================================
  // POST-GENERATION VIOLATION SCAN
  // =========================================================================

  console.log(`[FAST-v3] Running post-generation violation scan...`);
  const violations = detectViolations(ctx);

  const violationByType = new Map<string, number>();
  for (const v of violations) {
    violationByType.set(v.type, (violationByType.get(v.type) || 0) + 1);
  }
  if (violations.length > 0) {
    console.log(`[FAST-v3] Found ${violations.length} violations:`);
    for (const [type, count] of violationByType) {
      console.log(`  - ${type}: ${count}`);
    }
  } else {
    console.log(`[FAST-v3] No violations detected.`);
  }

  // =========================================================================
  // UNASSIGNED BREAKDOWN
  // =========================================================================

  const reasonCounts = new Map<string, number>();
  for (const u of unassigned) {
    reasonCounts.set(u.reason, (reasonCounts.get(u.reason) || 0) + 1);
  }
  console.log(`[FAST-v3] Unassigned: ${unassigned.length}`);
  for (const [reason, count] of reasonCounts) {
    console.log(`  - ${reason}: ${count}`);
  }

  if (uniqueSubjectsAssigned < subjectList.length * 0.5 && subjectList.length > 0) {
    console.log(
      `\n[FAST-v3] ⚠ CAPACITY WARNING: Only ${uniqueSubjectsAssigned}/${subjectList.length} subjects scheduled.`,
    );
    console.log(`[FAST-v3] Consider adding more faculty or reducing subjects/sections.`);
  }

  // =========================================================================
  // CALCULATE & RETURN STATS
  // =========================================================================

  const stats = calculateV3Stats(ctx, totalPairs, elapsed, facultyList);

  console.log(`[FAST-v3] V3 Stats:`);
  console.log(`  Part-time faculty used: ${stats.partTimeFacultyUsed}`);
  console.log(`  Full-time faculty used: ${stats.fullTimeFacultyUsed}`);
  console.log(`  Lunch break crossings: ${stats.lunchBreakCrossings}`);
  console.log(`  Avg consecutive hours: ${stats.avgConsecutiveHours}`);

  return {
    success: ctx.assignments.length > 0,
    schedules: ctx.assignments,
    violations,
    unassigned,
    stats,
  };
}
