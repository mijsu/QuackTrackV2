'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/store/app-store'
import { canAccessView, getDefaultView } from '@/lib/roles'
import { AppSidebar } from '@/components/app-sidebar'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { DashboardView } from '@/components/views/dashboard-view'
import { FacultyView } from '@/components/views/faculty-view'
import { DepartmentsView } from '@/components/views/departments-view'
import { ProgramsView } from '@/components/views/programs-view'
import { SubjectsView } from '@/components/views/subjects-view'
import { SectionsView } from '@/components/views/sections-view'
import { SchedulesView } from '@/components/views/schedules-view'
import { GenerateView } from '@/components/views/generate-view'
import { ConflictsView } from '@/components/views/conflicts-view'
import { PreferencesView } from '@/components/views/preferences-view'
import { NotificationsView } from '@/components/views/notifications-view'
import { AuditLogView } from '@/components/views/audit-log-view'
import { SettingsView } from '@/components/views/settings-view'
import { LoginScreen } from '@/components/login-screen'
import { ChangePasswordScreen } from '@/components/change-password-screen'
import { NotificationDropdown } from '@/components/notification-dropdown'
import { FacultyBottomNav } from '@/components/faculty-bottom-nav'
import { ZenModeToggle } from '@/components/zen-mode-toggle'
import { ZenSchedule } from '@/components/zen-schedule'
import { useIsMobile } from '@/hooks/use-mobile'

const VIEW_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  faculty: 'Faculty',
  departments: 'Departments',
  programs: 'Programs',
  subjects: 'Subjects',
  sections: 'Sections',
  schedules: 'Schedules',
  generate: 'Generate',
  conflicts: 'Conflicts',
  preferences: 'Preferences',
  notifications: 'Notifications',
  'audit-log': 'Audit Log',
  settings: 'Settings',
}

export default function Home() {
  const { currentView, isAuthenticated, mustChangePassword, user, setCurrentView, zenMode, toggleZenMode } = useAppStore()
  const isMobile = useIsMobile()
  const isFaculty = user?.role === 'faculty'
  const useBottomNav = isFaculty && isMobile

  // Switch to schedules view when entering zen mode
  useEffect(() => {
    if (zenMode && currentView !== 'schedules') {
      setCurrentView('schedules')
    }
  }, [zenMode, currentView, setCurrentView])

  // Role-based view access control: auto-correct if current view is not accessible
  useEffect(() => {
    if (isAuthenticated && !canAccessView(user?.role, currentView)) {
      setCurrentView(getDefaultView(user?.role || ''))
    }
  }, [currentView, isAuthenticated, user, setCurrentView])

  if (!isAuthenticated) {
    return <LoginScreen />
  }

  // Force password change on first login — block all other pages
  if (mustChangePassword) {
    return <ChangePasswordScreen />
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <DashboardView />
      case 'faculty': return <FacultyView />
      case 'departments': return <DepartmentsView />
      case 'programs': return <ProgramsView />
      case 'subjects': return <SubjectsView />
      case 'sections': return <SectionsView />
      case 'schedules': return <SchedulesView />
      case 'generate': return <GenerateView />
      case 'conflicts': return <ConflictsView />
      case 'preferences': return <PreferencesView />
      case 'notifications': return <NotificationsView />
      case 'audit-log': return <AuditLogView />
      case 'settings': return <SettingsView />
      default: return <DashboardView />
    }
  }

  return (
    <SidebarProvider>
      {/* Zen mode: full-screen minimal schedule + time */}
      {zenMode ? (
        <ZenSchedule />
      ) : (
        <>
          {/* Sidebar: hidden on mobile for faculty, normal otherwise */}
          {!useBottomNav && <AppSidebar />}
          <SidebarInset className={`min-w-0 overflow-x-hidden ${useBottomNav ? 'pb-20' : ''}`}>
            <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border px-4">
              {/* Only show sidebar trigger when sidebar is visible */}
              {!useBottomNav && <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground" />}
              {!useBottomNav && <Separator orientation="vertical" className="mr-2 h-4 bg-border" />}
              <nav className="flex items-center gap-1 text-sm text-muted-foreground">
                <span
                  className="cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => setCurrentView('dashboard')}
                >
                  QuackTrack
                </span>
                <span className="text-foreground/30">/</span>
                <span className="text-foreground font-medium">
                  {VIEW_LABELS[currentView] || 'Dashboard'}
                </span>
              </nav>
              <div className="ml-auto flex items-center gap-2">
                {/* Zen mode toggle (faculty mobile only) */}
                <ZenModeToggle />
                {/* Notifications */}
                <NotificationDropdown />
              </div>
            </header>
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              <div className="p-4 md:p-6 max-w-7xl mx-auto">
                {renderView()}
              </div>
            </div>
          </SidebarInset>
          {/* Bottom nav for faculty on mobile */}
          {useBottomNav && <FacultyBottomNav />}
        </>
      )}
    </SidebarProvider>
  )
}
