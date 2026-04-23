/**
 * QuackTrack Scheduling System — Shared Types, Interfaces & Constants
 *
 * This file contains ONLY the type definitions, interfaces, and constants
 * shared across the scheduling system. The actual scheduling algorithm
 * lives in `fast-scheduler.ts` (Fast Greedy Scheduler v3).
 *
 * Legacy algorithms (CSP Backtracking v1, Enhanced CSP v2) have been removed.
 * See worklog for details on the cleanup.
 */

// ============================================================================
// FACULTY
// ============================================================================

export interface FacultyPreference {
  preferredDays: string[];
  preferredTimeStart: string;
  preferredTimeEnd: string;
  preferredSubjects: string[];
  unavailableDays?: string[];
  notes?: string;
}

export interface Faculty {
  id: string;
  name: string;
  specialization: string[];
  maxUnits: number;
  departmentId: string | null;
  preferences?: FacultyPreference;
}

// ============================================================================
// SUBJECTS & CURRICULUM
// ============================================================================

export interface Subject {
  id: string;
  subjectCode: string;
  subjectName: string;
  units: number;
  departmentId: string;
  requiredSpecialization: string[];
  requiredEquipment?: string[];
  yearLevel?: number;
  semester?: string;
  defaultDurationHours?: number;
}

export interface CurriculumEntry {
  subjectId: string;
  sectionId: string;
  semester?: string;
  isRequired: boolean;
}

// ============================================================================
// ROOMS & SECTIONS
// ============================================================================

export interface Room {
  id: string;
  roomName: string;
  capacity: number;
  equipment: string[];
  building: string;
}

export interface Section {
  id: string;
  sectionName: string;
  yearLevel: number;
  studentCount: number;
  departmentId: string;
}

// ============================================================================
// SCHEDULING
// ============================================================================

export interface TimeSlot {
  day: string;
  start: string;
  end: string;
}

export interface ScheduleAssignment {
  id: string;
  subjectId: string;
  facultyId: string;
  sectionId: string;
  roomId: string;
  day: string;
  startTime: string;
  endTime: string;
  status: 'approved' | 'generated' | 'conflict';
  score?: number;
}

export interface ConstraintViolation {
  type: 'faculty_double_booking' | 'room_double_booking' | 'section_overlap' |
        'capacity_exceeded' | 'equipment_missing' | 'specialization_mismatch' |
        'unit_overload' | 'preference_violation' | 'duplicate_subject_section';
  severity: 'critical' | 'warning' | 'info';
  description: string;
  scheduleIds: string[];
}

export interface UnassignedItem {
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  sectionId: string;
  sectionName: string;
  reason: string;
}

export interface GenerationStats {
  totalSlots: number;
  assignedSlots: number;
  assignmentRate: number;
  averageFacultyLoad: number;
  averageRoomUtilization: number;
  preferenceMatchRate: number;
  generationTimeMs: number;
  backtrackCount: number;
  skippedCount: number;
}

export interface GenerationResult {
  success: boolean;
  schedules: ScheduleAssignment[];
  violations: ConstraintViolation[];
  unassigned: UnassignedItem[];
  stats: GenerationStats;
}

// ============================================================================
// SCORING & WEIGHTS (used by dashboard components)
// ============================================================================

export interface ScoreBreakdown {
  total: number;
  specializationMatch: number;
  preferenceMatch: number;
  loadBalance: number;
  roomEfficiency: number;
  timeQuality: number;
  dayDistribution: number;
  departmentMatch: number;
}

export interface ConstraintWeights {
  FACULTY_PREFERENCE: number;
  LOAD_BALANCE: number;
  ROOM_EFFICIENCY: number;
  TIME_QUALITY: number;
  DAY_DISTRIBUTION: number;
  BACKTRACK_PENALTY: number;
  DEPARTMENT_MATCH: number;
  SPECIALIZATION_MATCH: number;
  PART_TIME_BONUS: number;
  CONSECUTIVE_PENALTY: number;
}

export const DEFAULT_WEIGHTS: ConstraintWeights = {
  FACULTY_PREFERENCE: 0.25,
  LOAD_BALANCE: 0.10,
  ROOM_EFFICIENCY: 0.03,
  TIME_QUALITY: 0.05,
  DAY_DISTRIBUTION: 0.05,
  BACKTRACK_PENALTY: 0.05,
  DEPARTMENT_MATCH: 0.12,
  SPECIALIZATION_MATCH: 0.35,
  PART_TIME_BONUS: 0.05,
  CONSECUTIVE_PENALTY: 0.05,
};

export const WEIGHT_PRESETS: Record<string, ConstraintWeights> = {
  balanced: DEFAULT_WEIGHTS,
  preferencePriority: {
    ...DEFAULT_WEIGHTS,
    FACULTY_PREFERENCE: 0.35,
    SPECIALIZATION_MATCH: 0.30,
    LOAD_BALANCE: 0.08,
  },
  loadBalanced: {
    ...DEFAULT_WEIGHTS,
    FACULTY_PREFERENCE: 0.15,
    LOAD_BALANCE: 0.25,
    SPECIALIZATION_MATCH: 0.30,
  },
  specializationFocus: {
    ...DEFAULT_WEIGHTS,
    SPECIALIZATION_MATCH: 0.45,
    FACULTY_PREFERENCE: 0.20,
    LOAD_BALANCE: 0.08,
  },
};

// ============================================================================
// CONSTANTS
// ============================================================================

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
export const WORK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

export const TIME_RANGES = {
  START: '07:00',
  END: '21:00',
  MORNING_START: '07:00',
  MORNING_END: '12:00',
  AFTERNOON_START: '13:00',
  AFTERNOON_END: '18:00',
  EVENING_START: '18:00',
  EVENING_END: '21:00',
};
