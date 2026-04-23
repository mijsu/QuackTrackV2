'use client';

import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';
import { useAppStore, type ViewMode } from '@/store';
import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

// Lazy-load ALL views with SSR disabled to reduce server memory footprint
const AppShell = dynamic(() => import('@/components/layout/AppShell').then(m => ({ default: m.AppShell })), {
  ssr: false,
  loading: () => <ViewLoadingSpinner />,
});
const LoginPage = dynamic(() => import('@/components/auth/LoginPage').then(m => ({ default: m.LoginPage })), {
  ssr: false,
  loading: () => <ViewLoadingSpinner />,
});
const DashboardView = dynamic(() => import('@/components/dashboard/DashboardView').then(m => ({ default: m.DashboardView })), {
  ssr: false,
  loading: () => <ViewLoadingSpinner />,
});
const CalendarView = dynamic(() => import('@/components/calendar/CalendarView').then(m => ({ default: m.CalendarView })), {
  ssr: false,
  loading: () => <ViewLoadingSpinner />,
});
const FacultyView = dynamic(() => import('@/components/tables/FacultyView').then(m => ({ default: m.FacultyView })), {
  ssr: false,
  loading: () => <ViewLoadingSpinner />,
});
const SubjectsView = dynamic(() => import('@/components/tables/SubjectsView').then(m => ({ default: m.SubjectsView })), {
  ssr: false,
  loading: () => <ViewLoadingSpinner />,
});
const RoomsView = dynamic(() => import('@/components/tables/RoomsView').then(m => ({ default: m.RoomsView })), {
  ssr: false,
  loading: () => <ViewLoadingSpinner />,
});
const SectionsView = dynamic(() => import('@/components/tables/SectionsView').then(m => ({ default: m.SectionsView })), {
  ssr: false,
  loading: () => <ViewLoadingSpinner />,
});
const DepartmentsView = dynamic(() => import('@/components/tables/DepartmentsView').then(m => ({ default: m.DepartmentsView })), {
  ssr: false,
  loading: () => <ViewLoadingSpinner />,
});
const ProgramsView = dynamic(() => import('@/components/tables/ProgramsView').then(m => ({ default: m.ProgramsView })), {
  ssr: false,
  loading: () => <ViewLoadingSpinner />,
});
const SchedulesView = dynamic(() => import('@/components/tables/SchedulesView').then(m => ({ default: m.SchedulesView })), {
  ssr: false,
  loading: () => <ViewLoadingSpinner />,
});
const UsersView = dynamic(() => import('@/components/tables/UsersView').then(m => ({ default: m.UsersView })), {
  ssr: false,
  loading: () => <ViewLoadingSpinner />,
});
const NotificationsView = dynamic(() => import('@/components/tables/NotificationsView').then(m => ({ default: m.NotificationsView })), {
  ssr: false,
  loading: () => <ViewLoadingSpinner />,
});
const ProfileView = dynamic(() => import('@/components/tables/ProfileView').then(m => ({ default: m.ProfileView })), {
  ssr: false,
  loading: () => <ViewLoadingSpinner />,
});
const PreferencesView = dynamic(() => import('@/components/tables/PreferencesView').then(m => ({ default: m.PreferencesView })), {
  ssr: false,
  loading: () => <ViewLoadingSpinner />,
});
const ReportsView = dynamic(() => import('@/components/tables/ReportsView').then(m => ({ default: m.ReportsView })), {
  ssr: false,
  loading: () => <ViewLoadingSpinner />,
});
const SettingsView = dynamic(() => import('@/components/tables/SettingsView').then(m => ({ default: m.SettingsView })), {
  ssr: false,
  loading: () => <ViewLoadingSpinner />,
});
const EnhancedConflictsView = dynamic(() => import('@/components/conflicts/EnhancedConflictsView').then(m => ({ default: m.EnhancedConflictsView })), {
  ssr: false,
  loading: () => <ViewLoadingSpinner />,
});
const ScheduleResponsesView = dynamic(() => import('@/components/responses/ScheduleResponsesView').then(m => ({ default: m.ScheduleResponsesView })), {
  ssr: false,
  loading: () => <ViewLoadingSpinner />,
});
const MyScheduleResponsesView = dynamic(() => import('@/components/responses/MyScheduleResponsesView').then(m => ({ default: m.MyScheduleResponsesView })), {
  ssr: false,
  loading: () => <ViewLoadingSpinner />,
});
const AuditHistoryView = dynamic(() => import('@/components/audit/AuditHistoryView').then(m => ({ default: m.AuditHistoryView })), {
  ssr: false,
  loading: () => <ViewLoadingSpinner />,
});
const WorkloadDashboard = dynamic(() => import('@/components/dashboard/WorkloadDashboard').then(m => ({ default: m.WorkloadDashboard })), {
  ssr: false,
  loading: () => <ViewLoadingSpinner />,
});
const AnnouncementsView = dynamic(() => import('@/components/tables/AnnouncementsView').then(m => ({ default: m.AnnouncementsView })), {
  ssr: false,
  loading: () => <ViewLoadingSpinner />,
});
const CurriculumView = dynamic(() => import('@/components/tables/CurriculumView').then(m => ({ default: m.CurriculumView })), {
  ssr: false,
  loading: () => <ViewLoadingSpinner />,
});
const ViewErrorBoundary = dynamic(() => import('@/components/ui/ViewErrorBoundary').then(m => ({ default: m.ViewErrorBoundary })), {
  ssr: false,
  loading: () => <></>,
});

// Shared loading spinner for lazy-loaded views
function ViewLoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">Loading view...</p>
      </div>
    </div>
  );
}

// Define which roles can access which views
const viewPermissions: Record<ViewMode, string[]> = {
  dashboard: ['admin', 'faculty'],
  calendar: ['admin', 'faculty'],
  schedules: ['admin'],
  faculty: ['admin'],
  subjects: ['admin'],
  rooms: ['admin'],
  sections: ['admin'],
  departments: ['admin'],
  programs: ['admin'],
  users: ['admin'],
  conflicts: ['admin'],
  notifications: ['admin', 'faculty'],
  profile: ['admin', 'faculty'],
  preferences: ['faculty'],
  reports: ['admin'],
  settings: ['admin'],
  'schedule-responses': ['admin'],
  'my-responses': ['faculty'],
  audit: ['admin'],
  workload: ['admin'],
  announcements: ['admin'],
  curriculum: ['admin'],
};

export default function Home() {
  const { status, data: session } = useSession();
  const { viewMode, setViewMode } = useAppStore();

  // Redirect unauthorized users to dashboard
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role) {
      const allowedRoles = viewPermissions[viewMode];
      if (allowedRoles && !allowedRoles.includes(session.user.role)) {
        setViewMode('dashboard');
      }
    }
  }, [status, session, viewMode, setViewMode]);

  // Scroll main content to top on view change
  useEffect(() => {
    const mainContent = document.querySelector('main');
    if (mainContent) {
      mainContent.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
    window.scrollTo({ top: 0 });
  }, [viewMode]);

  // Show loading state
  if (status === 'loading') {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-background z-50">
        <div className="absolute inset-0 mesh-gradient opacity-50" />
        <div className="relative flex flex-col items-center gap-6">
          <div className="brand-loader" />
          <div className="text-center animate-fade-in">
            <h1 className="text-xl font-bold tracking-tight">
              <span className="text-gradient-green">Quack</span>
              <span>Track</span>
            </h1>
            <p className="text-xs text-muted-foreground mt-1">Loading your workspace...</p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
          </div>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (status === 'unauthenticated') {
    return <LoginPage />;
  }

  // Render the appropriate view based on viewMode
  const renderView = () => {
    switch (viewMode) {
      case 'dashboard':
        return <DashboardView />;
      case 'calendar':
        return <CalendarView />;
      case 'schedules':
        return <SchedulesView />;
      case 'faculty':
        return <FacultyView />;
      case 'subjects':
        return <SubjectsView />;
      case 'rooms':
        return <RoomsView />;
      case 'sections':
        return <SectionsView />;
      case 'departments':
        return <DepartmentsView />;
      case 'programs':
        return <ProgramsView />;
      case 'users':
        return <UsersView />;
      case 'conflicts':
        return <EnhancedConflictsView />;
      case 'notifications':
        return <NotificationsView />;
      case 'profile':
        return <ProfileView />;
      case 'preferences':
        return <PreferencesView />;
      case 'reports':
        return <ReportsView />;
      case 'settings':
        return <SettingsView />;
      case 'schedule-responses':
        return <ScheduleResponsesView />;
      case 'my-responses':
        return <MyScheduleResponsesView />;
      case 'audit':
        return <AuditHistoryView />;
      case 'workload':
        return <WorkloadDashboard />;
      case 'announcements':
        return <AnnouncementsView />;
      case 'curriculum':
        return <CurriculumView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <AppShell>
      <ViewErrorBoundary>
        <div key={viewMode} className="h-full view-transition animate-fade-in">
          {renderView()}
        </div>
      </ViewErrorBoundary>
    </AppShell>
  );
}
