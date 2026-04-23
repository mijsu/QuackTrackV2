// User Types
export type UserRole = 'admin' | 'faculty';
export type ContractType = 'full-time' | 'part-time';
export type ScheduleStatus = 'generated' | 'approved' | 'modified' | 'conflict';
export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
export type NotificationType = 'info' | 'warning' | 'success' | 'error';
// ============================================================================
// CONFLICT TYPE SYSTEM
// ============================================================================

export type ConflictType =
  // Critical - Hard Schedule Conflicts (impossible to schedule)
  | 'faculty_double_booking'
  | 'room_double_booking'
  | 'section_overlap'
  // Warning - Pre-generation Issues (may prevent assignment)
  | 'specialization_gap'
  | 'specialization_limited'
  | 'room_capacity_gap'
  | 'fully_unavailable'
  | 'subject_preference_conflict'
  // Info - Algorithm Will Handle (informational only)
  | 'subject_preference_duplicate'
  | 'time_preference_conflict'
  | 'capacity_warning'
  | 'day_preference_conflict'
  | 'preference_conflict';

/**
 * Get a human-readable label for a conflict type
 */
export function getConflictTypeLabel(type: ConflictType): string {
  switch (type) {
    case 'faculty_double_booking':
      return 'Faculty Double Booking';
    case 'room_double_booking':
      return 'Room Double Booking';
    case 'section_overlap':
      return 'Section Overlap';
    case 'specialization_gap':
      return 'Specialization Gap';
    case 'specialization_limited':
      return 'Limited Faculty Availability';
    case 'room_capacity_gap':
      return 'Room Capacity Gap';
    case 'fully_unavailable':
      return 'Faculty Fully Unavailable';
    case 'subject_preference_conflict':
      return 'Subject Preference Conflict';
    case 'subject_preference_duplicate':
      return 'Duplicate Subject Preference';
    case 'time_preference_conflict':
      return 'Time Preference Conflict';
    case 'capacity_warning':
      return 'Capacity Warning';
    case 'day_preference_conflict':
      return 'Day Preference Conflict';
    case 'preference_conflict':
      return 'Preference Conflict';
    default:
      return 'Unknown Conflict';
  }
}

/**
 * Get the category/severity level for a conflict type
 * - critical: Must be resolved before scheduling
 * - warning: May cause issues, should be reviewed
 * - info: Informational, algorithm can handle
 */
export function getConflictCategory(type: ConflictType): 'critical' | 'warning' | 'info' {
  switch (type) {
    // Critical - Hard conflicts that make scheduling impossible
    case 'faculty_double_booking':
    case 'room_double_booking':
    case 'section_overlap':
      return 'critical';
    // Warning - Pre-generation issues that may prevent assignment
    case 'specialization_gap':
    case 'specialization_limited':
    case 'room_capacity_gap':
    case 'fully_unavailable':
    case 'subject_preference_conflict':
      return 'warning';
    // Info - Algorithm can handle these automatically
    case 'subject_preference_duplicate':
    case 'time_preference_conflict':
    case 'capacity_warning':
    case 'day_preference_conflict':
    case 'preference_conflict':
      return 'info';
    default:
      return 'info';
  }
}

/**
 * Get suggested resolution for a conflict type
 */
export function getConflictResolution(type: ConflictType): string {
  switch (type) {
    case 'faculty_double_booking':
      return 'Adjust the schedule times to avoid overlapping classes for the same faculty member.';
    case 'room_double_booking':
      return 'Reassign one of the classes to a different room or time slot.';
    case 'section_overlap':
      return 'Reschedule one of the classes to avoid students having concurrent classes.';
    case 'specialization_gap':
      return 'Add a faculty member with the required specialization or update subject requirements.';
    case 'specialization_limited':
      return 'Consider cross-training faculty or adjusting course offerings to reduce dependency on a single faculty.';
    case 'room_capacity_gap':
      return 'Add a larger room or split the section into smaller groups.';
    case 'fully_unavailable':
      return 'Update faculty availability to allow scheduling on at least some days.';
    case 'subject_preference_conflict':
      return 'Discuss with affected faculty to adjust preferences, or let the algorithm assign based on load balancing.';
    case 'subject_preference_duplicate':
      return 'The algorithm will assign based on load balancing and specialization fit. No action required.';
    case 'time_preference_conflict':
      return 'The algorithm will resolve this using load balancing. No action required unless specific issues arise.';
    case 'capacity_warning':
      return 'Reduce preferred subjects or increase faculty max units.';
    case 'day_preference_conflict':
      return 'Update preferences to align available days with preferred days.';
    case 'preference_conflict':
      return 'Review and adjust faculty preferences as needed.';
    default:
      return 'Review the conflict and take appropriate action.';
  }
}

// Entity Interfaces
export interface User {
  id: string;
  uid: string;
  name: string;
  email: string; // Institutional email (lastname.firstname@ptc.edu.ph)
  personalEmail?: string | null; // Personal email for sending credentials
  role: UserRole;
  facultyType?: string; // "regular" or "masteral"
  departmentId: string | null;
  contractType: ContractType;
  maxUnits: number;
  specialization: string[];
  image?: string | null;
  phone?: string | null;
  createdAt: Date;
  updatedAt: Date;
  department?: Department;
  preferences?: FacultyPreference | null;
  _count?: { schedules: number };
}

export interface Department {
  id: string;
  name: string;
  code?: string | null;
  college: string;
  createdAt: Date;
  updatedAt: Date;
  programs?: Program[];
  curricula?: Curriculum[];
  _count?: { users: number; programs: number; sections: number };
}

// ============================================================================
// PROGRAM TYPE - Intermediate between Department and Subject
// ============================================================================
export interface Program {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  departmentId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  department?: Department;
  subjects?: Subject[];
  sections?: Section[];
  _count?: { subjects: number; sections: number };
}

export interface Subject {
  id: string;
  subjectCode: string;
  subjectName: string;
  description?: string | null;
  units: number;
  programId: string;
  departmentId: string;
  subjectType?: string; // "regular" or "executive"
  yearLevel: number; // 1=First Year, 2=Second Year, 3=Third Year, 4=Fourth Year
  semester: string; // "1st Semester", "2nd Semester", "Summer"
  requiredSpecialization: string[];
  requiredEquipment: string[];
  defaultDurationHours: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  program?: Program;
  department?: Department;
  _count?: { schedules: number };
}

export interface Room {
  id: string;
  roomName: string;
  roomCode?: string | null;
  capacity: number;
  equipment: string[];
  building: string;
  floor?: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count?: { schedules: number };
}

export interface Curriculum {
  id: string;
  name: string;
  description?: string | null;
  classType?: string;
  departmentId?: string | null;
  programId?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  department?: Department | null;
  program?: Program | null;
  items?: CurriculumItem[];
  sections?: Section[];
}

export interface CurriculumItem {
  id: string;
  curriculumId: string;
  subjectCode: string;
  subjectName: string;
  description?: string | null;
  units: number;
  yearLevel: number;
  semester: string;
  isComplete: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Section {
  id: string;
  sectionName: string;
  sectionCode?: string | null;
  classType?: string; // "regular" or "executive"
  yearLevel: number;
  departmentId: string;
  programId?: string | null;  // Optional link to program
  curriculumId?: string | null; // Optional link to curriculum
  studentCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  department?: Department;
  program?: Program | null;
  curriculum?: Curriculum | null;
  _count?: { schedules: number };
}

export interface Schedule {
  id: string;
  subjectId: string;
  facultyId: string;
  sectionId: string;
  roomId: string;
  day: DayOfWeek;
  startTime: string;
  endTime: string;
  status: ScheduleStatus;
  semester?: string | null;
  academicYear?: string | null;
  createdAt: Date;
  updatedAt: Date;
  subject?: Subject;
  faculty?: User;
  section?: Section;
  room?: Room;
  conflicts?: string[];
}

export interface FacultyPreference {
  id: string;
  facultyId: string;
  preferredDays: DayOfWeek[];
  preferredTimeStart: string;
  preferredTimeEnd: string;
  preferredSubjects: string[];
  unavailableDays?: string[] | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  actionUrl?: string | null;
  createdAt: Date;
}

export interface ScheduleLog {
  id: string;
  scheduleId: string;
  modifiedBy: string;
  oldValue: Record<string, unknown>;
  newValue: Record<string, unknown>;
  action: 'create' | 'update' | 'delete' | 'resolve' | 'undo' | 'batch_update' | 'created' | 'modified' | 'login';
  reason?: string | null;
  timestamp: Date;
}

export interface Conflict {
  id: string;
  type: ConflictType;
  scheduleId1: string | null;
  scheduleId2: string | null;
  description: string;
  severity?: 'critical' | 'warning' | 'info';
  suggestedResolution?: string | null;
  resolutionOptions?: string | null;
  autoResolvable?: boolean;
  resolved: boolean;
  resolvedBy?: string | null;
  resolvedAt?: Date | null;
  resolutionAction?: string | null;
  rollbackData?: string | null;
  createdAt: Date;
  facultyIds?: string | null;
  subjectId?: string | null;
  generationId?: string | null;
}

export interface AuditLog {
  id: string;
  userId?: string | null;
  action: string;
  entity?: string | null;
  entityId?: string | null;
  details?: string | null;
  previousState?: string | null;
  newState?: string | null;
  canUndo: boolean;
  undone: boolean;
  undoneBy?: string | null;
  undoneAt?: Date | null;
  undoOfLogId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Date;
  user?: User | null;
}

export interface ScheduleResponse {
  id: string;
  scheduleId: string;
  facultyId: string;
  status: 'pending' | 'accepted' | 'rejected';
  reason?: string | null;
  respondedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  faculty?: User;
  schedule?: Schedule;
}

export interface SystemSetting {
  id: string;
  key: string;
  value: string;
  description?: string | null;
  category: string;
  updatedAt: Date;
}

// Dashboard Stats
export interface DashboardStats {
  totalFaculty: number;
  totalSchedules: number;
  totalConflicts: number;
  facultyUtilizationAvg: number;
  facultyUtilization: Array<{ id: string; name: string; image?: string | null; assigned: number; max: number; percent: number; department?: string }>;
  roomOccupancy: number;
  overloadedFaculty: number;
  underloadedFaculty: number;
  schedulesByDay: Array<{ day: string; count: number }>;
  schedulesByStatus: Array<{ status: string; count: number }>;
  facultyByDepartment: Array<{ department: string; count: number }>;
  roomUtilization: Array<{ room: string; utilization: number; scheduleCount?: number }>;
  totalRooms: number;
  totalSections: number;
  totalSubjects: number;
  totalDepartments: number;
  recentSchedules?: Array<{
    id: string;
    subject?: Subject;
    faculty?: User;
    room?: Room;
    section?: Section;
    day: string;
    startTime: string;
    endTime: string;
    status: string;
    createdAt: Date;
  }>;
  responseStats?: {
    total: number;
    pending: number;
    accepted: number;
    rejected: number;
  };
  isFacultyView?: boolean;
  currentFacultyId?: string | null;
}

// Time Slot
export interface TimeSlot {
  startTime: string;
  endTime: string;
}

// Constants
export const DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const WEEKDAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Time slots from 7:00 AM to 9:00 PM (07:00 - 21:00)
export const TIME_SLOTS: TimeSlot[] = [
  { startTime: '07:00', endTime: '08:00' },
  { startTime: '08:00', endTime: '09:00' },
  { startTime: '09:00', endTime: '10:00' },
  { startTime: '10:00', endTime: '11:00' },
  { startTime: '11:00', endTime: '12:00' },
  { startTime: '12:00', endTime: '13:00' },
  { startTime: '13:00', endTime: '14:00' },
  { startTime: '14:00', endTime: '15:00' },
  { startTime: '15:00', endTime: '16:00' },
  { startTime: '16:00', endTime: '17:00' },
  { startTime: '17:00', endTime: '18:00' },
  { startTime: '18:00', endTime: '19:00' },
  { startTime: '19:00', endTime: '20:00' },
  { startTime: '20:00', endTime: '21:00' },
];

// Time options for dropdowns (for forms) - 12-hour format display
export const TIME_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '07:00', label: '7:00 AM' },
  { value: '07:30', label: '7:30 AM' },
  { value: '08:00', label: '8:00 AM' },
  { value: '08:30', label: '8:30 AM' },
  { value: '09:00', label: '9:00 AM' },
  { value: '09:30', label: '9:30 AM' },
  { value: '10:00', label: '10:00 AM' },
  { value: '10:30', label: '10:30 AM' },
  { value: '11:00', label: '11:00 AM' },
  { value: '11:30', label: '11:30 AM' },
  { value: '12:00', label: '12:00 PM' },
  { value: '12:30', label: '12:30 PM' },
  { value: '13:00', label: '1:00 PM' },
  { value: '13:30', label: '1:30 PM' },
  { value: '14:00', label: '2:00 PM' },
  { value: '14:30', label: '2:30 PM' },
  { value: '15:00', label: '3:00 PM' },
  { value: '15:30', label: '3:30 PM' },
  { value: '16:00', label: '4:00 PM' },
  { value: '16:30', label: '4:30 PM' },
  { value: '17:00', label: '5:00 PM' },
  { value: '17:30', label: '5:30 PM' },
  { value: '18:00', label: '6:00 PM' },
  { value: '18:30', label: '6:30 PM' },
  { value: '19:00', label: '7:00 PM' },
  { value: '19:30', label: '7:30 PM' },
  { value: '20:00', label: '8:00 PM' },
  { value: '20:30', label: '8:30 PM' },
  { value: '21:00', label: '9:00 PM' },
];

export const EQUIPMENT_OPTIONS = [
  'Computers',
  'Projector',
  'Whiteboard',
  'AC',
  'Microphone',
  'Engineering Software',
  'Lab Equipment',
];

export const SPECIALIZATION_OPTIONS = [
  'Programming',
  'Web Development',
  'Mobile Development',
  'Database Systems',
  'Data Structures',
  'Algorithms',
  'Networking',
  'Cybersecurity',
  'UI/UX',
  'Engineering Mathematics',
  'Thermodynamics',
  'Structural Analysis',
  'Civil Engineering',
  'Marketing',
  'Business Strategy',
  'Entrepreneurship',
  'Masteral',
];

// Year Level Options for Subjects
export const YEAR_LEVEL_OPTIONS = [
  { value: 1, label: 'First Year' },
  { value: 2, label: 'Second Year' },
  { value: 3, label: 'Third Year' },
  { value: 4, label: 'Fourth Year' },
];

// Semester Options for Subjects
export const SEMESTER_OPTIONS = [
  { value: '1st Semester', label: '1st Semester' },
  { value: '2nd Semester', label: '2nd Semester' },
  { value: '3rd Semester', label: '3rd Semester' },
  { value: 'Summer', label: 'Summer' },
];

// Helper function to get year level label
export function getYearLevelLabel(yearLevel: number): string {
  const option = YEAR_LEVEL_OPTIONS.find(opt => opt.value === yearLevel);
  return option?.label || `Year ${yearLevel}`;
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Form Types
export interface UserFormData {
  name: string;
  email: string;
  password?: string;
  confirmPassword?: string;
  role: UserRole;
  departmentId?: string;
  contractType: ContractType;
  maxUnits: number;
  specialization: string[];
}

export interface ScheduleFormData {
  subjectId: string;
  facultyId: string;
  sectionId: string;
  roomId: string;
  day: DayOfWeek;
  startTime: string;
  endTime: string;
}

export interface DepartmentFormData {
  name: string;
  code?: string;
  college: string;
}

export interface ProgramFormData {
  name: string;
  code?: string;
  description?: string;
  departmentId: string;
}

export interface SubjectFormData {
  subjectCode: string;
  subjectName: string;
  description?: string;
  units: number;
  programId: string;
  yearLevel: number; // 1=First Year, 2=Second Year, 3=Third Year, 4=Fourth Year
  semester: string; // "1st Semester", "2nd Semester", "Summer"
  requiredSpecialization: string[];
  defaultDurationHours: number;
}

export interface RoomFormData {
  roomName: string;
  roomCode?: string;
  capacity: number;
  equipment: string[];
  building: string;
  floor?: number;
}

export interface SectionFormData {
  sectionName: string;
  sectionCode?: string;
  yearLevel: number;
  departmentId: string;
  programId?: string | null;  // Optional link to program
  studentCount: number;
}
