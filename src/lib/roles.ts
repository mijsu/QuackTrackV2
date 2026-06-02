// ─── Role-Based Access Control (RBAC) for QuackTrack ────────────────────────
// Defines roles, permissions, and helper functions for UI authorization.

export type RoleId =
  | 'admin'           // Admin (MIS) — full control
  | 'department_dean' // Department Dean
  | 'program_head'    // Program Head
  | 'human_resource'  // Human Resource
  | 'registrar'       // Registrar
  | 'faculty'         // Faculty

export const ROLES: Record<RoleId, { label: string; description: string }> = {
  admin: {
    label: 'Admin (MIS)',
    description: 'Full control access to everything',
  },
  department_dean: {
    label: 'Department Dean',
    description: 'Generate, manual & move schedules, export reports, view Department & Program',
  },
  program_head: {
    label: 'Program Head',
    description: 'Generate, manual & move schedules, export reports, view Department & Program',
  },
  human_resource: {
    label: 'Human Resource',
    description: 'View faculty, edit faculty details and number of units',
  },
  registrar: {
    label: 'Registrar',
    description: 'Manual & move schedules, export reports, view Department & Program (no generate)',
  },
  faculty: {
    label: 'Faculty',
    description: 'Viewing and personal preferences only',
  },
}

/** Get a human-readable label for a role string */
export function getRoleLabel(role: string): string {
  return (ROLES as Record<string, { label: string }>)[role]?.label ?? role
}

// ─── View Access ─────────────────────────────────────────────────────────────
// Which roles can access each navigation view.

const VIEW_ACCESS: Record<string, RoleId[]> = {
  dashboard:        ['admin', 'department_dean', 'program_head', 'human_resource', 'registrar', 'faculty'],
  departments:      ['admin', 'department_dean', 'program_head', 'registrar'],
  programs:         ['admin', 'department_dean', 'program_head', 'registrar'],
  subjects:         ['admin', 'department_dean', 'program_head', 'registrar'],
  sections:         ['admin', 'department_dean', 'program_head', 'registrar'],
  faculty:          ['admin', 'department_dean', 'program_head', 'human_resource'],
  schedules:        ['admin', 'department_dean', 'program_head', 'registrar', 'faculty'],
  generate:         ['admin', 'department_dean', 'program_head'],
  conflicts:        ['admin', 'department_dean', 'program_head', 'registrar'],
  preferences:      ['admin', 'department_dean', 'program_head', 'registrar', 'faculty'],
  notifications:    ['admin', 'department_dean', 'program_head', 'human_resource', 'registrar', 'faculty'],
  'audit-log':      ['admin'],
  settings:         ['admin', 'department_dean', 'program_head', 'human_resource', 'registrar', 'faculty'],
}

/** Check if a role can access a specific view */
export function canAccessView(role: string | undefined | null, viewId: string): boolean {
  if (!role) return false
  // Admin always has access
  if (role === 'admin') return true
  const allowed = VIEW_ACCESS[viewId]
  return allowed ? allowed.includes(role as RoleId) : false
}

// ─── Action Permissions ──────────────────────────────────────────────────────

const ACTION_PERMISSIONS: Record<string, RoleId[]> = {
  // Schedule generation
  generateSchedule:  ['admin', 'department_dean', 'program_head'],

  // Faculty management
  viewFaculty:       ['admin', 'department_dean', 'program_head', 'human_resource'],
  createFaculty:     ['admin'],
  editFaculty:       ['admin', 'human_resource'],
  deleteFaculty:     ['admin'],

  // Schedule management
  modifySchedule:    ['admin', 'department_dean', 'program_head', 'registrar'],
  finalizeSchedule:  ['admin', 'department_dean', 'program_head', 'registrar'],
  deleteSchedule:    ['admin', 'department_dean', 'program_head', 'registrar'],

  // Export
  exportReport:      ['admin', 'department_dean', 'program_head', 'registrar', 'faculty'],

  // Curriculum editing
  editCurriculum:    ['admin'],

  // Audit log
  viewAuditLog:      ['admin'],
}

/** Check if a role can perform a specific action */
export function canPerformAction(role: string | undefined | null, action: string): boolean {
  if (!role) return false
  // Admin always can
  if (role === 'admin') return true
  const allowed = ACTION_PERMISSIONS[action]
  return allowed ? allowed.includes(role as RoleId) : false
}

// ─── Sidebar Navigation Filter ───────────────────────────────────────────────
// Returns the nav items a role should see, organized by sidebar section.

export interface NavSection {
  title: string
  icon?: string
  items: { title: string; view: string }[]
  view?: string // for single-item sections
}

/** Get the default view for a role after login */
export function getDefaultView(role: string): string {
  if (canAccessView(role, 'dashboard')) return 'dashboard'
  // Fallback: find first accessible view
  const viewOrder = ['dashboard', 'schedules', 'preferences', 'notifications', 'settings']
  for (const view of viewOrder) {
    if (canAccessView(role, view)) return view
  }
  return 'settings'
}

/** Legacy role mapping: maps old roles to new equivalent roles */
export function mapLegacyRole(role: string): RoleId {
  const mapping: Record<string, RoleId> = {
    admin: 'admin',
    faculty: 'faculty',
    department_head: 'department_dean',
    scheduler: 'registrar', // scheduler maps to registrar as closest equivalent
  }
  return mapping[role] || (role as RoleId)
}
