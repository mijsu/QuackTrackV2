'use client';

import { useAppStore, type ViewMode } from '@/store';
import { useSession } from 'next-auth/react';
import {
  Calendar,
  CalendarDays,
  Users,
  BookOpen,
  DoorOpen,
  GraduationCap,
  Building2,
  Layers,
  UserCog,
  AlertTriangle,
  BarChart3,
  History,
  Scale,
  ClipboardCheck,
  Bell,
  User,
  Settings,
  Shield,
  ChevronRight,
  Home,
  Megaphone,
  BookMarked,
  type LucideIcon,
} from 'lucide-react';

interface ViewInfo {
  label: string;
  icon: LucideIcon;
  group?: string;
}

const viewInfoMap: Record<ViewMode, ViewInfo> = {
  dashboard: { label: 'Dashboard', icon: Home, group: 'Overview' },
  calendar: { label: 'Schedule Calendar', icon: Calendar, group: 'Scheduling' },
  schedules: { label: 'Manage Schedules', icon: CalendarDays, group: 'Scheduling' },
  faculty: { label: 'Faculty & Loads', icon: Users, group: 'Management' },
  subjects: { label: 'Subjects', icon: BookOpen, group: 'Academic' },
  rooms: { label: 'Rooms', icon: DoorOpen, group: 'Resources' },
  sections: { label: 'Sections', icon: GraduationCap, group: 'Academic' },
  departments: { label: 'Departments', icon: Building2, group: 'Academic' },
  programs: { label: 'Programs', icon: Layers, group: 'Academic' },
  curriculum: { label: 'Curriculum', icon: BookMarked, group: 'Academic' },
  users: { label: 'Users', icon: UserCog, group: 'System' },
  conflicts: { label: 'Conflicts', icon: AlertTriangle, group: 'Scheduling' },
  workload: { label: 'Workload Balance', icon: Scale, group: 'Analytics' },
  'schedule-responses': { label: 'Schedule Responses', icon: ClipboardCheck, group: 'Scheduling' },
  reports: { label: 'Reports & Analytics', icon: BarChart3, group: 'Analytics' },
  audit: { label: 'Audit History', icon: History, group: 'System' },
  notifications: { label: 'Notifications', icon: Bell, group: 'System' },
  profile: { label: 'Profile Settings', icon: User, group: 'Account' },
  preferences: { label: 'My Preferences', icon: Settings, group: 'Account' },
  settings: { label: 'System Settings', icon: Shield, group: 'System' },
  'my-responses': { label: 'My Schedule Responses', icon: ClipboardCheck, group: 'Account' },
  announcements: { label: 'Announcements', icon: Megaphone, group: 'Communication' },
};

export function Breadcrumb() {
  const { viewMode, setViewMode } = useAppStore();
  const { data: session } = useSession();
  const info = viewInfoMap[viewMode];

  if (!info) return null;

  return (
    <div className="breadcrumb-wrapper">
    <nav
      aria-label="Breadcrumb"
      className="breadcrumb-bar flex items-center gap-2 text-sm mb-4 animate-fade-in pb-3"
    >
      {/* Home — with hover underline animation */}
      <button
        onClick={() => setViewMode('dashboard')}
        className="focus-ring flex items-center gap-1 text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors duration-200 hover-underline"
        aria-label="Go to Dashboard"
      >
        <Home className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Home</span>
      </button>

      {/* Animated Separator — chevron with muted color */}
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 breadcrumb-chevron" />

      {/* Group (if exists) */}
      {info.group && (
        <>
          <span className="text-muted-foreground/60 text-xs hidden sm:inline">
            {info.group}
          </span>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 hidden sm:block breadcrumb-chevron" />
        </>
      )}

      {/* Current View — gradient text with underline accent */}
      <span className="breadcrumb-active text-gradient-green font-medium">
        <info.icon className="h-3.5 w-3.5 text-primary inline mr-0.5" />
        {info.label}
      </span>

      {/* Role Badge — styled with emerald pill */}
      {session?.user?.role && (
        <>
          <span className="ml-2 text-muted-foreground/30">|</span>
          <span className="ml-2 inline-flex items-center text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
            {session.user.role}
          </span>
        </>
      )}
    </nav>
    </div>
  );
}
