'use client';

import { motion } from 'framer-motion';
import {
  UserPlus,
  DoorOpen,
  BookPlus,
  Sparkles,
  AlertTriangle,
  FileDown,
  Bell,
  CalendarDays,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store';
import type { ViewMode } from '@/store';

type ActionColor = 'emerald' | 'amber' | 'rose' | 'sky' | 'violet';

interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: typeof UserPlus;
  color: ActionColor;
  viewMode: ViewMode;
}

const ACTIONS: QuickAction[] = [
  {
    id: 'add-faculty',
    label: 'Add Faculty',
    description: 'Register new faculty member',
    icon: UserPlus,
    color: 'emerald',
    viewMode: 'faculty',
  },
  {
    id: 'add-room',
    label: 'Add Room',
    description: 'Create new classroom entry',
    icon: DoorOpen,
    color: 'emerald',
    viewMode: 'rooms',
  },
  {
    id: 'add-subject',
    label: 'Add Subject',
    description: 'Register a new course offering',
    icon: BookPlus,
    color: 'emerald',
    viewMode: 'subjects',
  },
  {
    id: 'generate-schedule',
    label: 'Generate Schedule',
    description: 'Auto-generate with CSP engine',
    icon: Sparkles,
    color: 'amber',
    viewMode: 'dashboard',
  },
  {
    id: 'view-conflicts',
    label: 'View Conflicts',
    description: 'Review scheduling conflicts',
    icon: AlertTriangle,
    color: 'rose',
    viewMode: 'conflicts',
  },
  {
    id: 'export-reports',
    label: 'Export Reports',
    description: 'Download schedule analytics',
    icon: FileDown,
    color: 'sky',
    viewMode: 'reports',
  },
  {
    id: 'send-notification',
    label: 'Send Notification',
    description: 'Broadcast announcement',
    icon: Bell,
    color: 'violet',
    viewMode: 'announcements',
  },
  {
    id: 'view-calendar',
    label: 'View Calendar',
    description: 'Visual schedule grid view',
    icon: CalendarDays,
    color: 'sky',
    viewMode: 'calendar',
  },
];

const colorStyles: Record<ActionColor, { bg: string; iconBg: string; iconText: string; hoverShadow: string; border: string }> = {
  emerald: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    iconBg: 'bg-emerald-100 dark:bg-emerald-500/20',
    iconText: 'text-emerald-600 dark:text-emerald-400',
    hoverShadow: 'hover:shadow-emerald-500/20 hover:shadow-lg',
    border: 'border-emerald-200/50 dark:border-emerald-800/30',
  },
  amber: {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    iconBg: 'bg-amber-100 dark:bg-amber-500/20',
    iconText: 'text-amber-600 dark:text-amber-400',
    hoverShadow: 'hover:shadow-amber-500/20 hover:shadow-lg',
    border: 'border-amber-200/50 dark:border-amber-800/30',
  },
  rose: {
    bg: 'bg-rose-50 dark:bg-rose-950/30',
    iconBg: 'bg-rose-100 dark:bg-rose-500/20',
    iconText: 'text-rose-600 dark:text-rose-400',
    hoverShadow: 'hover:shadow-rose-500/20 hover:shadow-lg',
    border: 'border-rose-200/50 dark:border-rose-800/30',
  },
  sky: {
    bg: 'bg-sky-50 dark:bg-sky-950/30',
    iconBg: 'bg-sky-100 dark:bg-sky-500/20',
    iconText: 'text-sky-600 dark:text-sky-400',
    hoverShadow: 'hover:shadow-sky-500/20 hover:shadow-lg',
    border: 'border-sky-200/50 dark:border-sky-800/30',
  },
  violet: {
    bg: 'bg-violet-50 dark:bg-violet-950/30',
    iconBg: 'bg-violet-100 dark:bg-violet-500/20',
    iconText: 'text-violet-600 dark:text-violet-400',
    hoverShadow: 'hover:shadow-violet-500/20 hover:shadow-lg',
    border: 'border-violet-200/50 dark:border-violet-800/30',
  },
};

export function QuickActionDashboard() {
  const setViewMode = useAppStore((s) => s.setViewMode);

  const handleAction = (action: QuickAction) => {
    setViewMode(action.viewMode);
  };

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      {ACTIONS.map((action, index) => {
        const Icon = action.icon;
        const styles = colorStyles[action.color];

        return (
          <motion.button
            key={action.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.04, ease: [0.25, 0.46, 0.45, 0.94] }}
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => handleAction(action)}
            className={cn(
              'group relative flex flex-col items-start gap-2.5 rounded-xl border p-4 text-left transition-all duration-200',
              'cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring',
              styles.bg,
              styles.border,
              styles.hoverShadow
            )}
          >
            {/* Icon */}
            <div
              className={cn(
                'h-9 w-9 rounded-lg flex items-center justify-center transition-transform duration-200 group-hover:scale-110',
                styles.iconBg
              )}
            >
              <Icon className={cn('h-4.5 w-4.5', styles.iconText)} />
            </div>

            {/* Text */}
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-foreground leading-tight">{action.label}</p>
              <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
                {action.description}
              </p>
            </div>

            {/* Subtle corner accent */}
            <div
              className={cn(
                'absolute top-0 right-0 h-8 w-8 rounded-bl-xl rounded-tr-xl opacity-30 transition-opacity duration-200 group-hover:opacity-50',
                styles.iconBg
              )}
            />
          </motion.button>
        );
      })}
    </div>
  );
}
