'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  BookOpen,
  TrendingUp,
  Coffee,
} from 'lucide-react';
import { cn, formatTimeRange } from '@/lib/utils';
import type { Schedule } from '@/types';
import { DAYS } from '@/types';

// ---------------------------------------------------------------------------
// Day color palette (Mon–Sat)
// ---------------------------------------------------------------------------
const DAY_COLORS: Record<string, { bg: string; border: string; text: string; badge: string; dot: string }> = {
  Monday: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    border: 'border-emerald-200 dark:border-emerald-800',
    text: 'text-emerald-700 dark:text-emerald-300',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300',
    dot: 'bg-emerald-500',
  },
  Tuesday: {
    bg: 'bg-teal-50 dark:bg-teal-950/40',
    border: 'border-teal-200 dark:border-teal-800',
    text: 'text-teal-700 dark:text-teal-300',
    badge: 'bg-teal-100 text-teal-700 dark:bg-teal-900/60 dark:text-teal-300',
    dot: 'bg-teal-500',
  },
  Wednesday: {
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    border: 'border-amber-200 dark:border-amber-800',
    text: 'text-amber-700 dark:text-amber-300',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300',
    dot: 'bg-amber-500',
  },
  Thursday: {
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    border: 'border-rose-200 dark:border-rose-800',
    text: 'text-rose-700 dark:text-rose-300',
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300',
    dot: 'bg-rose-500',
  },
  Friday: {
    bg: 'bg-violet-50 dark:bg-violet-950/40',
    border: 'border-violet-200 dark:border-violet-800',
    text: 'text-violet-700 dark:text-violet-300',
    badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-300',
    dot: 'bg-violet-500',
  },
  Saturday: {
    bg: 'bg-sky-50 dark:bg-sky-950/40',
    border: 'border-sky-200 dark:border-sky-800',
    text: 'text-sky-700 dark:text-sky-300',
    badge: 'bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-300',
    dot: 'bg-sky-500',
  },
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface FacultyScheduleModalProps {
  facultyId: string;
  facultyName: string;
  facultyDepartment?: string | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function calcHours(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  return (eh * 60 + em - sh * 60 - sm) / 60;
}

function totalHours(schedules: Schedule[]): number {
  return schedules.reduce((sum, s) => sum + calcHours(s.startTime, s.endTime), 0);
}

function totalUnits(schedules: Schedule[]): number {
  return schedules.reduce((sum, s) => sum + (s.subject?.units || 0), 0);
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------
function ModalSkeleton() {
  return (
    <div className="space-y-5">
      {/* Header skeleton */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>
      {/* Stats skeleton */}
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
      {/* Grid skeleton */}
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-20 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function FacultyScheduleModal({
  facultyId,
  facultyName,
  facultyDepartment,
  isOpen,
  onOpenChange,
}: FacultyScheduleModalProps) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSchedules = useCallback(async () => {
    if (!facultyId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/schedules?facultyId=${facultyId}`);
      if (res.ok) {
        const data = await res.json();
        setSchedules(Array.isArray(data) ? data : []);
      }
    } catch {
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  }, [facultyId]);

  useEffect(() => {
    if (isOpen) {
      fetchSchedules();
    } else {
      // Reset data when closing
      setSchedules([]);
    }
  }, [isOpen, fetchSchedules]);

  // Group schedules by day
  const schedulesByDay = useMemo(() => {
    const grouped: Record<string, Schedule[]> = {};
    for (const day of DAYS) {
      grouped[day] = schedules.filter((s) => s.day === day);
    }
    return grouped;
  }, [schedules]);

  // Only show days that have classes
  const activeDays = useMemo(() => {
    return DAYS.filter((d) => (schedulesByDay[d]?.length ?? 0) > 0);
  }, [schedulesByDay]);

  // Summary stats
  const stats = useMemo(() => {
    const hours = totalHours(schedules);
    const units = totalUnits(schedules);

    // Busiest day
    let busiestDay = '—';
    let maxDayHours = 0;
    for (const day of DAYS) {
      const daySchedules = schedulesByDay[day] || [];
      const dayHrs = totalHours(daySchedules);
      if (dayHrs > maxDayHours) {
        maxDayHours = dayHrs;
        busiestDay = day;
      }
    }

    // Free periods (days with no classes, out of Mon-Sat)
    const freeDays = DAYS.filter((d) => (schedulesByDay[d]?.length ?? 0) === 0);

    return { hours, units, busiestDay, busiestDayHours: maxDayHours, freeDays, classCount: schedules.length };
  }, [schedules, schedulesByDay]);

  const initial = facultyName.charAt(0).toUpperCase();

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-3xl max-h-[90vh] p-0 flex flex-col sm:rounded-xl">
        <div className="flex-shrink-0 p-4 sm:p-6 pb-0 sm:pb-0">
          <DialogHeader>
            <DialogTitle className="sr-only">Faculty Schedule</DialogTitle>
            <DialogDescription className="sr-only">Weekly teaching schedule</DialogDescription>
          </DialogHeader>

          {/* ---- Header ---- */}
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 border-2 border-emerald-200 dark:border-emerald-700">
              <AvatarFallback className="bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 font-bold text-lg">
                {initial}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold truncate">{facultyName}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                {facultyDepartment && (
                  <Badge variant="secondary" className="text-xs">
                    {facultyDepartment}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <BookOpen className="h-3 w-3" />
                  {stats.units} units &middot; {stats.classCount} {stats.classCount === 1 ? 'class' : 'classes'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ---- Scrollable body ---- */}
        <ScrollArea className="flex-1 min-h-0 px-4 sm:px-6 pb-4 sm:pb-6">
          <div className="mt-4 space-y-5">
            {loading ? (
              <ModalSkeleton />
            ) : schedules.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="No schedules found"
                description={`${facultyName} has no assigned classes for the current semester.`}
              />
            ) : (
              <>
                {/* ---- Summary stats row ---- */}
                <div className="grid grid-cols-3 gap-3">
                  <Card className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-7 w-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center">
                        <Clock className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                    </div>
                    <p className="text-lg font-bold tabular-nums">{stats.hours.toFixed(1)}</p>
                    <p className="text-[11px] text-muted-foreground leading-tight">Hours / week</p>
                  </Card>
                  <Card className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-7 w-7 rounded-lg bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center">
                        <TrendingUp className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                      </div>
                    </div>
                    <p className="text-lg font-bold tabular-nums">{stats.busiestDayHours.toFixed(1)}h</p>
                    <p className="text-[11px] text-muted-foreground leading-tight">Busiest: {stats.busiestDay.slice(0, 3)}</p>
                  </Card>
                  <Card className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-7 w-7 rounded-lg bg-rose-100 dark:bg-rose-900/60 flex items-center justify-center">
                        <Coffee className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                      </div>
                    </div>
                    <p className="text-lg font-bold tabular-nums">{stats.freeDays.length}</p>
                    <p className="text-[11px] text-muted-foreground leading-tight">Free day{stats.freeDays.length !== 1 ? 's' : ''}</p>
                  </Card>
                </div>

                {/* ---- Weekly schedule grid ---- */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    Weekly Schedule
                  </h3>

                  <AnimatePresence mode="popLayout">
                    {activeDays.map((day) => {
                      const colors = DAY_COLORS[day] || DAY_COLORS.Monday;
                      const daySchedules = schedulesByDay[day] || [];
                      const dayHrs = totalHours(daySchedules);

                      return (
                        <motion.div
                          key={day}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.2 }}
                        >
                          {/* Day header */}
                          <div className="flex items-center gap-2 mb-2">
                            <div className={cn('h-2 w-2 rounded-full', colors.dot)} />
                            <span className={cn('text-xs font-semibold uppercase tracking-wider', colors.text)}>
                              {day}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {daySchedules.length} {daySchedules.length === 1 ? 'class' : 'classes'} &middot; {dayHrs.toFixed(1)}h
                            </span>
                          </div>

                          {/* Class cards */}
                          <div className="grid gap-2">
                            {daySchedules.map((schedule, idx) => (
                              <motion.div
                                key={schedule.id}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.15, delay: idx * 0.04 }}
                              >
                                <Card
                                  className={cn(
                                    'border p-3 transition-colors hover:shadow-sm',
                                    colors.bg,
                                    colors.border,
                                  )}
                                >
                                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1.5">
                                    {/* Left: subject info */}
                                    <div className="min-w-0 flex-1 space-y-0.5">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-semibold text-sm leading-tight truncate">
                                          {schedule.subject?.subjectCode}
                                        </span>
                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                                          {schedule.subject?.units}u
                                        </Badge>
                                      </div>
                                      <p className="text-xs text-muted-foreground truncate">
                                        {schedule.subject?.subjectName}
                                      </p>
                                    </div>

                                    {/* Right: meta info */}
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground flex-shrink-0">
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {formatTimeRange(schedule.startTime, schedule.endTime)}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        {schedule.room?.roomName}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <Users className="h-3 w-3" />
                                        {schedule.section?.sectionName}
                                      </span>
                                    </div>
                                  </div>
                                </Card>
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>

                  {/* Free days indicator */}
                  {stats.freeDays.length > 0 && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground">
                        <Coffee className="h-3 w-3 inline mr-1" />
                        Free days:{' '}
                        {stats.freeDays.map((d) => (
                          <Badge key={d} variant="outline" className="ml-1 text-[10px] px-1.5 py-0 h-5">
                            {d.slice(0, 3)}
                          </Badge>
                        ))}
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
