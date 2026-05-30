import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Navigation views
export type ViewId =
  | 'dashboard'
  | 'faculty'
  | 'departments'
  | 'programs'
  | 'subjects'
  | 'sections'
  | 'schedules'
  | 'generate'
  | 'conflicts'
  | 'preferences'
  | 'notifications'
  | 'audit-log'
  | 'settings'

interface AppState {
  // Navigation
  currentView: ViewId
  setCurrentView: (view: ViewId) => void

  // Auth (persisted to localStorage so page reloads don't sign the user out)
  isAuthenticated: boolean
  user: {
    id: string
    name: string
    email: string
    role: string
    departmentId?: string
    facultyType?: string | null
    specialization?: string | null
    contractType?: string | null
    uid?: string
  } | null
  mustChangePassword: boolean
  login: (user: AppState['user'], mustChangePassword?: boolean) => void
  logout: () => void
  completePasswordChange: () => void

  // Sidebar
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void

  // Global loading
  isGenerating: boolean
  setIsGenerating: (generating: boolean) => void

  // Notifications count
  unreadNotifications: number
  setUnreadNotifications: (count: number) => void

  // Selected items for detail views
  selectedDepartmentId: string | null
  setSelectedDepartmentId: (id: string | null) => void
  selectedScheduleVersionId: string | null
  setSelectedScheduleVersionId: (id: string | null) => void

  // Zen mode
  zenMode: boolean
  setZenMode: (zen: boolean) => void
  toggleZenMode: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentView: 'dashboard',
      setCurrentView: (view) => set({ currentView: view }),

      isAuthenticated: false,
      user: null,
      mustChangePassword: false,
      login: (user, mustChangePassword = false) => set({ isAuthenticated: true, user, mustChangePassword }),
      logout: () => set({ isAuthenticated: false, user: null, mustChangePassword: false, currentView: 'dashboard' }),
      completePasswordChange: () => set({ mustChangePassword: false }),

      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      isGenerating: false,
      setIsGenerating: (generating) => set({ isGenerating: generating }),

      unreadNotifications: 0,
      setUnreadNotifications: (count) => set({ unreadNotifications: count }),

      selectedDepartmentId: null,
      setSelectedDepartmentId: (id) => set({ selectedDepartmentId: id }),
      selectedScheduleVersionId: null,
      setSelectedScheduleVersionId: (id) => set({ selectedScheduleVersionId: id }),

      zenMode: false,
      setZenMode: (zen) => set({ zenMode: zen }),
      toggleZenMode: () => set((state) => ({ zenMode: !state.zenMode })),
    }),
    {
      name: 'quacktrack-auth', // localStorage key
      // Only persist auth-related fields — transient UI state resets on reload
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        mustChangePassword: state.mustChangePassword,
        selectedScheduleVersionId: state.selectedScheduleVersionId,
      }),
    }
  )
)
