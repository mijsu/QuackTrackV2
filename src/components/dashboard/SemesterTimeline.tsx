'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { format, differenceInDays, parseISO } from 'date-fns';

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

type MilestoneStatus = 'completed' | 'current' | 'upcoming';

interface Milestone {
  label: string;
  date: string; // display date string
  dateISO: string; // ISO date for calculation
  icon?: React.ReactNode;
}

interface Settings {
  semester?: string;
  academicYear?: string;
  semesterStartDate?: string;
  semesterEndDate?: string;
}

// Default milestones (fallback)
const DEFAULT_MILESTONES: Milestone[] = [
  {
    label: 'Semester Start',
    date: 'Aug 12, 2024',
    dateISO: '2024-08-12',
  },
  {
    label: 'Midterm',
    date: 'Oct 5, 2024',
    dateISO: '2024-10-05',
  },
  {
    label: 'Prelim Exam',
    date: 'Oct 14–18, 2024',
    dateISO: '2024-10-16',
  },
  {
    label: 'Final Exam',
    date: 'Dec 9–13, 2024',
    dateISO: '2024-12-11',
  },
  {
    label: 'Semester End',
    date: 'Dec 20, 2024',
    dateISO: '2024-12-20',
  },
];

const DEFAULT_START = parseISO('2024-08-12');
const DEFAULT_END = parseISO('2024-12-20');

// ============================================================================
// HELPERS
// ============================================================================

function getMilestoneStatus(dateISO: string): MilestoneStatus {
  const milestoneDate = parseISO(dateISO);
  const now = new Date();

  if (now > milestoneDate) return 'completed';
  const diffDays = differenceInDays(milestoneDate, now);
  if (diffDays <= 3 && diffDays >= -3) return 'current';
  return 'upcoming';
}

function getProgressPercentage(start: Date, end: Date): number {
  const now = new Date();
  const totalDays = differenceInDays(end, start);
  const elapsedDays = differenceInDays(now, start);
  if (totalDays <= 0) return 100;
  if (elapsedDays <= 0) return 0;
  if (elapsedDays >= totalDays) return 100;
  return Math.round((elapsedDays / totalDays) * 100);
}

function getCurrentDateIndicatorPosition(start: Date, end: Date): number {
  const now = new Date();
  const totalDays = differenceInDays(end, start);
  const elapsedDays = differenceInDays(now, start);
  if (totalDays <= 0) return 100;
  if (elapsedDays <= 0) return 0;
  if (elapsedDays >= totalDays) return 100;
  return Math.round((elapsedDays / totalDays) * 100);
}

function getDaysRemaining(end: Date): number {
  const now = new Date();
  const days = differenceInDays(end, now);
  return Math.max(0, days);
}

function buildDynamicMilestones(startDate: string, endDate: string): Milestone[] {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  const totalDays = differenceInDays(end, start);

  return [
    {
      label: 'Semester Start',
      date: format(start, 'MMM d, yyyy'),
      dateISO: startDate,
    },
    {
      label: 'Midterm',
      date: format(new Date(start.getTime() + totalDays * 0.4 * 86400000), 'MMM d, yyyy'),
      dateISO: new Date(start.getTime() + totalDays * 0.4 * 86400000).toISOString().split('T')[0],
    },
    {
      label: 'Prelim Exam',
      date: format(new Date(start.getTime() + totalDays * 0.55 * 86400000), 'MMM d, yyyy'),
      dateISO: new Date(start.getTime() + totalDays * 0.55 * 86400000).toISOString().split('T')[0],
    },
    {
      label: 'Final Exam',
      date: format(new Date(start.getTime() + totalDays * 0.85 * 86400000), 'MMM d, yyyy'),
      dateISO: new Date(start.getTime() + totalDays * 0.85 * 86400000).toISOString().split('T')[0],
    },
    {
      label: 'Semester End',
      date: format(end, 'MMM d, yyyy'),
      dateISO: endDate,
    },
  ];
}

function SkeletonTimeline() {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-3 w-32" />
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-4 px-1">
          <div>
            <Skeleton className="h-7 w-14 mb-1" />
            <Skeleton className="h-3 w-16" />
          </div>
          <div className="text-right">
            <Skeleton className="h-7 w-14 mb-1" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <div className="mb-2 px-1">
          <Skeleton className="h-2 w-full rounded-full" />
          <div className="flex justify-between mt-1.5">
            <Skeleton className="h-2.5 w-12" />
            <Skeleton className="h-2.5 w-12" />
          </div>
        </div>
        <div className="mt-4 flex-1">
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
        <div className="mt-4 px-1 pt-3 border-t border-border/50">
          <Skeleton className="h-4 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SemesterTimeline() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
        }
      } catch {
        // Silently fail - will use defaults
      } finally {
        setSettingsLoading(false);
      }
    }
    fetchSettings();
  }, []);

  // Use settings dates if available, otherwise fallback to defaults
  const semesterStart = useMemo(() => {
    if (settings?.semesterStartDate) {
      return parseISO(settings.semesterStartDate);
    }
    return DEFAULT_START;
  }, [settings?.semesterStartDate]);

  const semesterEnd = useMemo(() => {
    if (settings?.semesterEndDate) {
      return parseISO(settings.semesterEndDate);
    }
    return DEFAULT_END;
  }, [settings?.semesterEndDate]);

  const milestones = useMemo(() => {
    if (settings?.semesterStartDate && settings?.semesterEndDate) {
      return buildDynamicMilestones(settings.semesterStartDate, settings.semesterEndDate);
    }
    return DEFAULT_MILESTONES;
  }, [settings?.semesterStartDate, settings?.semesterEndDate]);

  const semesterLabel = useMemo(() => {
    if (settings?.semester && settings?.academicYear) {
      return `${settings.semester} ${settings.academicYear}`;
    }
    return '1st Semester 2024–2025';
  }, [settings?.semester, settings?.academicYear]);

  const progress = useMemo(() => getProgressPercentage(semesterStart, semesterEnd), [semesterStart, semesterEnd]);
  const currentDatePos = useMemo(() => getCurrentDateIndicatorPosition(semesterStart, semesterEnd), [semesterStart, semesterEnd]);
  const daysRemaining = useMemo(() => getDaysRemaining(semesterEnd), [semesterEnd]);
  const isSemesterOver = progress >= 100;

  // Show skeleton while loading settings
  if (settingsLoading) {
    return <SkeletonTimeline />;
  }

  return (
    <Card className="card-hover h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="h-4 w-4 text-emerald-500" />
          Semester Progress
        </CardTitle>
        <div className="flex items-center gap-2 pt-1">
          <Badge
            variant="outline"
            className={cn(
              'text-[10px] font-medium px-2 py-0',
              isSemesterOver
                ? 'bg-muted text-muted-foreground border-muted'
                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
            )}
          >
            {isSemesterOver ? 'Completed' : progress < 40 ? 'Early Semester' : progress < 70 ? 'Mid Semester' : 'Late Semester'}
          </Badge>
          <span className="text-[10px] text-muted-foreground">
            {semesterLabel}
          </span>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 flex-1 flex flex-col">
        {/* Progress Stats */}
        <div className="flex items-center justify-between mb-4 px-1">
          <div>
            <p className="text-2xl font-bold text-foreground">
              {progress}%
            </p>
            <p className="text-[10px] text-muted-foreground">Completed</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-foreground">
              {daysRemaining}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {daysRemaining === 1 ? 'Day' : 'Days'} Remaining
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-2 px-1">
          <div className="relative h-2 rounded-full bg-muted overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400"
            />
            {/* Current date indicator */}
            {!isSemesterOver && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5 }}
                className="absolute top-1/2 -translate-y-1/2 z-10"
                style={{ left: `${currentDatePos}%` }}
              >
                <div className="relative -translate-x-1/2">
                  <div className="absolute inset-0 h-4 w-4 rounded-full bg-red-500/40 animate-ping" />
                  <div className="relative h-3 w-3 rounded-full bg-red-500 ring-2 ring-red-500/30 shadow-lg shadow-red-500/50" />
                </div>
              </motion.div>
            )}
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-[9px] text-muted-foreground">{format(semesterStart, 'MMM d')}</span>
            <span className="text-[9px] text-muted-foreground">{format(semesterEnd, 'MMM d')}</span>
          </div>
        </div>

        {/* Milestones */}
        <div className="mt-4 flex-1 overflow-x-auto">
          <div className="min-w-[420px]">
            {/* Timeline line */}
            <div className="relative flex items-start justify-between px-2">
              {/* Connecting line */}
              <div className="absolute top-[9px] left-[10px] right-[10px] h-[2px] bg-muted rounded-full" />
              {/* Progress line on top */}
              <div
                className="absolute top-[9px] left-[10px] h-[2px] rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                style={{ width: `calc(${progress}% - 20px)` }}
              />

              {milestones.map((milestone, index) => {
                const status = getMilestoneStatus(milestone.dateISO);
                const isCompleted = status === 'completed';
                const isCurrent = status === 'current';

                return (
                  <motion.div
                    key={milestone.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.3 + index * 0.1 }}
                    className="relative flex flex-col items-center z-10"
                    style={{ width: `${100 / milestones.length}%` }}
                  >
                    {/* Dot indicator */}
                    <div className="relative mb-2">
                      {isCompleted ? (
                        <div className="h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center shadow-md shadow-emerald-500/30">
                          <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                        </div>
                      ) : isCurrent ? (
                        <>
                          <div className="absolute inset-0 h-5 w-5 rounded-full bg-emerald-500/30 animate-ping" />
                          <div className="relative h-5 w-5 rounded-full bg-emerald-500 ring-3 ring-emerald-500/30 shadow-lg shadow-emerald-500/40 flex items-center justify-center">
                            <div className="h-2 w-2 rounded-full bg-white" />
                          </div>
                        </>
                      ) : (
                        <div className="h-5 w-5 rounded-full bg-muted border-2 border-muted-foreground/20 flex items-center justify-center">
                          <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
                        </div>
                      )}
                    </div>

                    {/* Label */}
                    <div className="text-center px-1">
                      <p
                        className={cn(
                          'text-[11px] font-semibold leading-tight mb-0.5',
                          isCompleted && 'text-emerald-600 dark:text-emerald-400',
                          isCurrent && 'text-emerald-600 dark:text-emerald-400',
                          !isCompleted && !isCurrent && 'text-muted-foreground'
                        )}
                      >
                        {milestone.label}
                      </p>
                      <p
                        className={cn(
                          'text-[9px] leading-tight',
                          isCompleted && 'text-emerald-500/70',
                          isCurrent && 'text-emerald-500/70',
                          !isCompleted && !isCurrent && 'text-muted-foreground/60'
                        )}
                      >
                        {milestone.date}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-4 px-1 pt-3 border-t border-border/50">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-[10px] text-muted-foreground">Completed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-muted-foreground">Current</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-muted-foreground/20" />
              <span className="text-[10px] text-muted-foreground">Upcoming</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-red-500" />
              <span className="text-[10px] text-muted-foreground">Today</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
