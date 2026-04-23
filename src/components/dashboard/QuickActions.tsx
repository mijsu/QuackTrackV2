'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Users,
  DoorOpen,
  BookOpen,
  AlertTriangle,
  Printer,
  Download,
  type LucideIcon,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/store';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

interface QuickAction {
  label: string;
  icon: LucideIcon;
  color: string; // tailwind color class for icon bg
  iconColor: string; // tailwind color class for icon itself
  hoverBorder: string; // tailwind border color on hover
  action: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function QuickActions() {
  const setViewMode = useAppStore((state) => state.setViewMode);

  const actions: QuickAction[] = [
    {
      label: 'Add Faculty',
      icon: Users,
      color: 'bg-emerald-500/10',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      hoverBorder: 'hover:border-emerald-500/40',
      action: () => {
        setViewMode('users');
        toast.info('Navigating to Faculty Management');
      },
    },
    {
      label: 'Add Room',
      icon: DoorOpen,
      color: 'bg-blue-500/10',
      iconColor: 'text-blue-600 dark:text-blue-400',
      hoverBorder: 'hover:border-blue-500/40',
      action: () => {
        setViewMode('rooms');
        toast.info('Navigating to Room Management');
      },
    },
    {
      label: 'Add Subject',
      icon: BookOpen,
      color: 'bg-amber-500/10',
      iconColor: 'text-amber-600 dark:text-amber-400',
      hoverBorder: 'hover:border-amber-500/40',
      action: () => {
        setViewMode('subjects');
        toast.info('Navigating to Subject Management');
      },
    },
    {
      label: 'View Conflicts',
      icon: AlertTriangle,
      color: 'bg-red-500/10',
      iconColor: 'text-red-600 dark:text-red-400',
      hoverBorder: 'hover:border-red-500/40',
      action: () => {
        setViewMode('conflicts');
        toast.info('Navigating to Conflict Resolution');
      },
    },
    {
      label: 'Print Schedule',
      icon: Printer,
      color: 'bg-violet-500/10',
      iconColor: 'text-violet-600 dark:text-violet-400',
      hoverBorder: 'hover:border-violet-500/40',
      action: () => {
        setViewMode('calendar');
        toast.info('Opening Calendar — use Ctrl+P to print');
      },
    },
    {
      label: 'Export Data',
      icon: Download,
      color: 'bg-teal-500/10',
      iconColor: 'text-teal-600 dark:text-teal-400',
      hoverBorder: 'hover:border-teal-500/40',
      action: () => {
        handleExportData();
      },
    },
  ];

  return (
    <Card className="card-hover h-full flex flex-col" data-tour="quick-actions">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="flex items-center justify-center w-5 h-5 rounded-md bg-gradient-to-br from-emerald-500 to-teal-500">
            <div className="grid grid-cols-2 gap-[2px]">
              <div className="h-1 w-1 rounded-full bg-white" />
              <div className="h-1 w-1 rounded-full bg-white" />
              <div className="h-1 w-1 rounded-full bg-white" />
              <div className="h-1 w-1 rounded-full bg-white" />
            </div>
          </div>
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 flex-1">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {actions.map((action, index) => {
            const Icon = action.icon;

            return (
              <motion.button
                key={action.label}
                initial={{ opacity: 0, y: 12, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.25, delay: 0.1 + index * 0.06 }}
                whileHover={{ y: -2, scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={action.action}
                className={cn(
                  'group flex flex-col items-center gap-2.5 rounded-xl border border-border/50 bg-background p-4 transition-all duration-200',
                  action.hoverBorder,
                  'hover:shadow-lg hover:shadow-black/5'
                )}
              >
                {/* Icon container */}
                <div
                  className={cn(
                    'flex items-center justify-center h-10 w-10 rounded-lg transition-transform duration-200 group-hover:scale-110',
                    action.color
                  )}
                >
                  <Icon className={cn('h-5 w-5', action.iconColor)} />
                </div>

                {/* Label */}
                <span className="text-xs font-medium text-foreground text-center leading-tight">
                  {action.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// EXPORT HANDLER
// ============================================================================

async function handleExportData() {
  try {
    toast.loading('Exporting data...', { id: 'export-data' });

    const res = await fetch('/api/schedules');
    if (!res.ok) throw new Error('Failed to fetch data');
    const data = await res.json();

    // Create CSV
    const headers = ['Subject Code', 'Subject Name', 'Faculty', 'Section', 'Room', 'Day', 'Start Time', 'End Time', 'Status'];
    const rows = data.map((row: Record<string, unknown>) => [
      row.subject?.subjectCode ?? '',
      row.subject?.subjectName ?? '',
      row.faculty?.name ?? '',
      row.section?.sectionName ?? '',
      row.room?.roomName ?? '',
      row.day ?? '',
      row.startTime ?? '',
      row.endTime ?? '',
      row.status ?? '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((r: string[]) => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `quacktrack-schedule-export-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Exported ${data.length} schedules successfully`, { id: 'export-data' });
  } catch {
    toast.error('Failed to export data. Please try again.', { id: 'export-data' });
  }
}
