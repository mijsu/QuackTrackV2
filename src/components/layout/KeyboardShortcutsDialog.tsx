'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAppStore, type ViewMode } from '@/store';
import { openSearchDialog } from '@/components/layout/SearchDialog';
import {
  Search,
  LayoutDashboard,
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
  Moon,
  Sun,
  ArrowUp,
  type LucideIcon,
} from 'lucide-react';

interface ShortcutItem {
  keys: string[];
  label: string;
  icon?: LucideIcon;
  action: () => void;
  category: 'navigation' | 'general';
}

const viewShortcuts: Record<string, ViewMode> = {
  'g+d': 'dashboard',
  'g+c': 'calendar',
  'g+s': 'schedules',
  'g+f': 'faculty',
  'g+b': 'subjects',
  'g+r': 'rooms',
  'g+e': 'sections',
  'g+p': 'departments',
  'g+o': 'programs',
  'g+u': 'users',
  'g+x': 'conflicts',
  'g+a': 'reports',
  'g+h': 'audit',
  'g+w': 'workload',
  'g+n': 'notifications',
  'g+i': 'profile',
  'g+q': 'settings',
};

const viewLabels: Record<ViewMode, { label: string; icon: LucideIcon }> = {
  dashboard: { label: 'Dashboard', icon: LayoutDashboard },
  calendar: { label: 'Calendar', icon: Calendar },
  schedules: { label: 'Schedules', icon: CalendarDays },
  faculty: { label: 'Faculty', icon: Users },
  subjects: { label: 'Subjects', icon: BookOpen },
  rooms: { label: 'Rooms', icon: DoorOpen },
  sections: { label: 'Sections', icon: GraduationCap },
  departments: { label: 'Departments', icon: Building2 },
  programs: { label: 'Programs', icon: Layers },
  users: { label: 'Users', icon: UserCog },
  conflicts: { label: 'Conflicts', icon: AlertTriangle },
  reports: { label: 'Reports', icon: BarChart3 },
  audit: { label: 'Audit History', icon: History },
  workload: { label: 'Workload', icon: Scale },
  notifications: { label: 'Notifications', icon: Bell },
  profile: { label: 'Profile', icon: User },
  settings: { label: 'Settings', icon: Shield },
  preferences: { label: 'Preferences', icon: Settings },
  'schedule-responses': { label: 'Responses', icon: ClipboardCheck },
  'my-responses': { label: 'My Responses', icon: ClipboardCheck },
};

export function KeyboardShortcutsDialog() {
  const [open, setOpen] = useState(false);
  const { setViewMode } = useAppStore();

  // Listen for '?' key to open dialog
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger when typing in input/textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      // Open shortcuts dialog with '?' or Cmd+K / Ctrl+K
      if (e.key === '?' || ((e.metaKey || e.ctrlKey) && e.key === 'k')) {
        e.preventDefault();
        setOpen((prev) => !prev);
        return;
      }

      // Close dialog with Escape
      if (e.key === 'Escape') {
        setOpen(false);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle Go-to navigation shortcuts (g+<key>)
  const handleGoShortcuts = useCallback(
    (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      // Check for g+key pattern
      if (e.key === 'g') {
        const timer = setTimeout(() => {
          const key = `g+${e.key}`;
          if (viewShortcuts[key]) {
            e.preventDefault();
            setViewMode(viewShortcuts[key]);
          }
        }, 300);

        const handler = (ke: KeyboardEvent) => {
          clearTimeout(timer);
          const combo = `g+${ke.key.toLowerCase()}`;
          if (viewShortcuts[combo]) {
            ke.preventDefault();
            setViewMode(viewShortcuts[combo]);
          }
          window.removeEventListener('keydown', handler);
        };

        window.addEventListener('keydown', handler);
        return () => clearTimeout(timer);
      }
    },
    [setViewMode]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleGoShortcuts);
    return () => window.removeEventListener('keydown', handleGoShortcuts);
  }, [handleGoShortcuts]);

  const generalShortcuts = [
    {
      keys: ['⌘', 'K'],
      label: 'Search',
      icon: Search,
      action: () => {
        setOpen(false);
        openSearchDialog();
      },
    },
    {
      keys: ['?'],
      label: 'Show Shortcuts',
      action: () => setOpen(false),
    },
    {
      keys: ['⌘', '/'],
      label: 'Toggle Theme',
      icon: Moon,
      action: () => {
        setOpen(false);
        // Theme toggle is handled by the theme provider in Header
        document.documentElement.classList.toggle('dark');
      },
    },
  ];

  const navigationShortcuts = Object.entries(viewShortcuts).map(([combo, view]) => ({
    keys: combo.split('+').map((k) => k.toUpperCase()),
    label: viewLabels[view]?.label || view,
    icon: viewLabels[view]?.icon,
    action: () => {
      setViewMode(view);
      setOpen(false);
    },
  }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <kbd className="inline-flex items-center justify-center h-6 px-2 rounded bg-muted border border-border text-xs font-mono font-medium">
              ?
            </kbd>
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Navigate QuackTrack faster with keyboard shortcuts
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6 max-h-[60vh] overflow-y-auto">
          {/* General Shortcuts */}
          <div className="mb-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              General
            </h3>
            <div className="space-y-1">
              {generalShortcuts.map((shortcut) => (
                <button
                  key={shortcut.label}
                  onClick={shortcut.action}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted/60 transition-colors text-left group"
                >
                  <span className="flex items-center gap-2.5 text-sm">
                    {shortcut.icon && (
                      <shortcut.icon className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    )}
                    {shortcut.label}
                  </span>
                  <div className="flex items-center gap-0.5">
                    {shortcut.keys.map((key, i) => (
                      <kbd
                        key={i}
                        className="inline-flex items-center justify-center h-6 min-w-[24px] px-1.5 rounded bg-muted border border-border text-[11px] font-mono font-medium text-muted-foreground"
                      >
                        {key}
                      </kbd>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Navigation Shortcuts */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Navigation (G + key)
            </h3>
            <div className="grid grid-cols-2 gap-1">
              {navigationShortcuts.map((shortcut) => (
                <button
                  key={shortcut.label}
                  onClick={shortcut.action}
                  className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted/60 transition-colors text-left group"
                >
                  <span className="flex items-center gap-2 text-sm">
                    {shortcut.icon && (
                      <shortcut.icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                    )}
                    <span className="truncate">{shortcut.label}</span>
                  </span>
                  <div className="flex items-center gap-0.5 shrink-0 ml-1">
                    {shortcut.keys.map((key, i) => (
                      <kbd
                        key={i}
                        className="inline-flex items-center justify-center h-5 min-w-[20px] px-1 rounded bg-muted border border-border text-[10px] font-mono font-medium text-muted-foreground"
                      >
                        {key}
                      </kbd>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-3 bg-muted/30 border-t flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground">
            Press <kbd className="inline-flex items-center h-4 px-1 rounded bg-muted border border-border text-[10px] font-mono">?</kbd> to toggle this dialog
          </p>
          <p className="text-[11px] text-muted-foreground">
            Press <kbd className="inline-flex items-center h-4 px-1 rounded bg-muted border border-border text-[10px] font-mono">Esc</kbd> to close
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
