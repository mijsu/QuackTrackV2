import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DayOfWeek } from '@/types';

export type ViewMode = 
  | 'dashboard' 
  | 'schedules' 
  | 'calendar' 
  | 'faculty' 
  | 'rooms' 
  | 'subjects' 
  | 'sections' 
  | 'departments' 
  | 'programs'
  | 'users' 
  | 'preferences' 
  | 'conflicts' 
  | 'notifications' 
  | 'profile'
  | 'settings'
  | 'reports'
  | 'schedule-responses'
  | 'my-responses'
  | 'audit'
  | 'workload'
  | 'announcements'
  | 'curriculum';

export interface NavigationAction {
  type: 'edit' | 'add' | 'delete' | 'split';
  targetId?: string;
  params?: Record<string, string>;
}

export interface ConflictResolutionContext {
  scheduleIdToEdit?: string;
  scheduleIdToDelete?: string;
  facultyIdToEdit?: string;
  subjectIdToEdit?: string;
  sectionIdToSplit?: string;
  addFacultySpecs?: string[];
  addFacultyDept?: string;
  addRoomMinCapacity?: number;
  editPreferencesFor?: string;
}

interface CalendarFilters {
  section: string;
  faculty: string;
  day: DayOfWeek | 'all';
  room: string;
  classType: string;
}

interface AppState {
  // Navigation
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  
  // Sidebar
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  
  // Department Filter
  selectedDepartment: string | null;
  setSelectedDepartment: (id: string | null) => void;
  
  // Calendar Filters
  calendarFilters: CalendarFilters;
  setCalendarFilters: (filters: Partial<CalendarFilters>) => void;
  resetCalendarFilters: () => void;
  
  // Data Refresh
  lastRefresh: number;
  triggerRefresh: () => void;
  
  // Conflict Resolution Context
  conflictResolutionContext: ConflictResolutionContext | null;
  setConflictResolutionContext: (context: ConflictResolutionContext | null) => void;
  clearConflictResolutionContext: () => void;
}

const defaultCalendarFilters: CalendarFilters = {
  section: 'all',
  faculty: 'all',
  day: 'all',
  room: 'all',
  classType: 'all',
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Navigation
      viewMode: 'dashboard',
      setViewMode: (mode) => set({ viewMode: mode }),
      
      // Sidebar
      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      sidebarCollapsed: false,
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      
      // Department Filter
      selectedDepartment: null,
      setSelectedDepartment: (id) => set({ selectedDepartment: id }),
      
      // Calendar Filters
      calendarFilters: defaultCalendarFilters,
      setCalendarFilters: (filters) => 
        set((state) => ({ 
          calendarFilters: { ...state.calendarFilters, ...filters } 
        })),
      resetCalendarFilters: () => set({ calendarFilters: defaultCalendarFilters }),
      
      // Data Refresh
      lastRefresh: Date.now(),
      triggerRefresh: () => set({ lastRefresh: Date.now() }),
      
      // Conflict Resolution Context
      conflictResolutionContext: null,
      setConflictResolutionContext: (context) => set({ conflictResolutionContext: context }),
      clearConflictResolutionContext: () => set({ conflictResolutionContext: null }),
    }),
    {
      name: 'quacktrack-scheduling-store',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        selectedDepartment: state.selectedDepartment,
        calendarFilters: state.calendarFilters,
      }),
    }
  )
);

// Selector hooks for better performance
export const useViewMode = () => useAppStore((state) => state.viewMode);
export const useSidebarState = () => useAppStore((state) => ({
  open: state.sidebarOpen,
  collapsed: state.sidebarCollapsed,
}));
export const useSelectedDepartment = () => useAppStore((state) => state.selectedDepartment);
export const useCalendarFilters = () => useAppStore((state) => state.calendarFilters);
export const useConflictResolutionContext = () => useAppStore((state) => state.conflictResolutionContext);
