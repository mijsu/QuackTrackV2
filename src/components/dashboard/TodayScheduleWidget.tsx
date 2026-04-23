'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Coffee,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';
import { formatTime12Hour } from '@/lib/utils';
import type { Schedule } from '@/types';
import { useSession } from 'next-auth/react';

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_VISIBLE_ITEMS = 5;
const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

const DAY_MAP: Record<number, string> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
};

// ============================================================================
// HELPERS
// ============================================================================

/** Map JS day index (0=Sun, 6=Sat) to our DayOfWeek values */
function getTodayDayName(): string {
  return DAY_MAP[new Date().getDay()] ?? 'Monday';
}

/** Get formatted date label, e.g. "Monday, Jan 15" */
function getDayLabel(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

/** Convert "HH:MM" to minutes since midnight */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Determine the time-of-day category based on start time.
 *   Morning : before 12:00  → emerald
 *   Afternoon: 12:00–16:59 → amber
 *   Evening  : 17:00+       → violet
 */
type TimeSlotPeriod = 'morning' | 'afternoon' | 'evening';

function getTimePeriod(startTime: string): TimeSlotPeriod {
  const mins = timeToMinutes(startTime);
  if (mins < 12 * 60) return 'morning';
  if (mins < 17 * 60) return 'afternoon';
  return 'evening';
}

const PERIOD_STYLES: Record<
  TimeSlotPeriod,
  { border: string; badge: string; text: string; dot: string }
> = {
  morning: {
    border: 'border-l-emerald-500',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400',
    text: 'text-emerald-600 dark:text-emerald-400',
    dot: 'bg-emerald-500',
  },
  afternoon: {
    border: 'border-l-amber-500',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400',
    text: 'text-amber-600 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
  evening: {
    border: 'border-l-violet-500',
    badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-400',
    text: 'text-violet-600 dark:text-violet-400',
    dot: 'bg-violet-500',
  },
};

// ============================================================================
// SKELETON
// ============================================================================

function ScheduleSkeleton() {
  return (
    <div className="space-y-2.5 px-1">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border border-l-[3px] border-l-muted p-3 space-y-2"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-4 w-12 rounded-full" />
          </div>
          <Skeleton className="h-4 w-3/4" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: 'easeOut' as const },
  },
  exit: {
    opacity: 0,
    y: -6,
    transition: { duration: 0.15 },
  },
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function TodayScheduleWidget() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { data: session } = useSession();
  const setViewMode = useAppStore((state) => state.setViewMode);

  const isAdmin = session?.user?.role === 'admin';

  const fetchTodaySchedules = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/schedules');
      if (!res.ok) {
        throw new Error(`Failed to fetch schedules (${res.status})`);
      }
      const data: Schedule[] = await res.json();

      const todayName = getTodayDayName();
      const filtered = data
        .filter((s) => s.day === todayName)
        .sort((a, b) => a.startTime.localeCompare(b.startTime));

      setSchedules(filtered);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchTodaySchedules();
  }, [fetchTodaySchedules]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchTodaySchedules();
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchTodaySchedules]);

  // Show at most MAX_VISIBLE_ITEMS
  const visibleSchedules = schedules.slice(0, MAX_VISIBLE_ITEMS);
  const hasMore = schedules.length > MAX_VISIBLE_ITEMS;

  const handleViewAll = () => {
    setViewMode('calendar');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="w-full"
    >
      <Card className="h-full flex flex-col">
        {/* ── Header ── */}
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 text-base font-semibold">
            <Calendar className="h-4 w-4 text-emerald-500" />
            <CardTitle>Today&apos;s Schedule</CardTitle>
            {!loading && !error && schedules.length > 0 && (
              <Badge
                variant="secondary"
                className="ml-1 h-5 min-w-[20px] justify-center px-1.5 text-[10px] font-semibold"
              >
                {schedules.length}
              </Badge>
            )}
          </div>
        </CardHeader>

        {/* ── Body ── */}
        <CardContent className="px-4 pb-4 flex-1 flex flex-col gap-3">
          {/* Date sub-label */}
          <p className="text-xs text-muted-foreground px-1">{getDayLabel()}</p>

          {/* Content area */}
          <div className="flex-1 min-h-0">
            {loading ? (
              <ScheduleSkeleton />
            ) : error ? (
              /* ── Error state ── */
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Loader2 className="h-7 w-7 text-muted-foreground/40 mb-2 animate-spin" />
                <p className="text-sm text-muted-foreground">Unable to load schedule</p>
                <p className="text-xs text-muted-foreground/60 mt-1">{error}</p>
              </div>
            ) : schedules.length === 0 ? (
              /* ── Empty state ── */
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35 }}
                className="flex flex-col items-center justify-center py-10 text-center"
              >
                <div className="rounded-full bg-violet-500/10 p-3 mb-3">
                  <Coffee className="h-6 w-6 text-violet-500" />
                </div>
                <p className="text-sm font-medium text-foreground">No classes today</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Enjoy your free day!
                </p>
              </motion.div>
            ) : (
              /* ── Schedule list ── */
              <AnimatePresence mode="wait">
                <motion.div
                  key={schedules.map((s) => s.id).join(',')}
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  className="space-y-2 px-0.5"
                >
                  {visibleSchedules.map((schedule) => {
                    const period = getTimePeriod(schedule.startTime);
                    const styles = PERIOD_STYLES[period];

                    return (
                      <motion.div
                        key={schedule.id}
                        variants={itemVariants}
                        layout
                        className={cn(
                          'group relative rounded-lg border border-l-[3px] p-3 transition-colors hover:bg-muted/40',
                          styles.border,
                        )}
                      >
                        {/* Row 1: Time range + period badge */}
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p
                            className={cn(
                              'text-xs font-semibold tabular-nums tracking-tight',
                              styles.text,
                            )}
                          >
                            <span className="font-mono">
                              {formatTime12Hour(schedule.startTime)}
                            </span>
                            <span className="mx-1 text-muted-foreground/60">&ndash;</span>
                            <span className="font-mono">
                              {formatTime12Hour(schedule.endTime)}
                            </span>
                          </p>
                          <Badge
                            variant="secondary"
                            className={cn(
                              'text-[9px] px-1.5 py-0 h-4 capitalize font-medium shrink-0',
                              styles.badge,
                            )}
                          >
                            {period}
                          </Badge>
                        </div>

                        {/* Row 2: Subject code + name */}
                        <p className="text-sm font-medium text-foreground truncate leading-snug">
                          {schedule.subject?.subjectCode ?? '—'}
                          {schedule.subject?.subjectName
                            ? ` — ${schedule.subject.subjectName}`
                            : ''}
                        </p>

                        {/* Row 3: Room + Faculty */}
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">
                              {schedule.room?.roomName ?? 'TBD'}
                            </span>
                          </span>
                          {isAdmin && schedule.faculty?.name && (
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <User className="h-3 w-3 shrink-0" />
                              <span className="truncate">{schedule.faculty.name}</span>
                            </span>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </AnimatePresence>
            )}
          </div>

          {/* ── View All footer ── */}
          {!loading && schedules.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground hover:text-foreground mt-2 gap-1"
                onClick={handleViewAll}
              >
                <Clock className="h-3 w-3" />
                {hasMore
                  ? `View All ${schedules.length} Classes`
                  : 'View Full Calendar'}
                <ChevronRight className="ml-auto h-3 w-3" />
              </Button>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
