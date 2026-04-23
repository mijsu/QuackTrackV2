'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Clock, BarChart3, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScheduleItem {
  id: string;
  startTime: string;
  endTime: string;
  day: string;
  status: string;
}

type TimeSlot = 'morning' | 'afternoon' | 'evening';

interface TimeSlotData {
  slot: TimeSlot;
  label: string;
  hours: string;
  count: number;
  percent: number;
  color: string;
  bgColor: string;
  textColor: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REFRESH_INTERVAL_MS = 60_000;

const DAY_SHORT: Record<string, string> = {
  Monday: 'Mon',
  Tuesday: 'Tue',
  Wednesday: 'Wed',
  Thursday: 'Thu',
  Friday: 'Fri',
  Saturday: 'Sat',
};

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const SLOT_CONFIG: Array<{
  slot: TimeSlot;
  label: string;
  hours: string;
  minHour: number;
  maxHour: number;
  color: string;
  bgColor: string;
  textColor: string;
}> = [
  {
    slot: 'morning',
    label: 'Morning',
    hours: '7:00 – 11:00',
    minHour: 7,
    maxHour: 11,
    color: 'bg-emerald-500',
    bgColor: 'bg-emerald-500/10',
    textColor: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    slot: 'afternoon',
    label: 'Afternoon',
    hours: '12:00 – 16:00',
    minHour: 12,
    maxHour: 16,
    color: 'bg-amber-500',
    bgColor: 'bg-amber-500/10',
    textColor: 'text-amber-600 dark:text-amber-400',
  },
  {
    slot: 'evening',
    label: 'Evening',
    hours: '17:00 – 21:00',
    minHour: 17,
    maxHour: 21,
    color: 'bg-violet-500',
    bgColor: 'bg-violet-500/10',
    textColor: 'text-violet-600 dark:text-violet-400',
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTimeSlot(startTime: string): TimeSlot | null {
  const hour = parseInt(startTime.split(':')[0], 10);
  if (hour >= 7 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour <= 21) return 'evening';
  return null;
}

// ---------------------------------------------------------------------------
// Stagger animation variants
// ---------------------------------------------------------------------------

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
  },
};

const barVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
};

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------

function BarsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-2.5 w-full rounded-full" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ScheduleDistributionMiniWidget() {
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/schedules');
      if (!res.ok) throw new Error('Failed to fetch schedules');
      const json = await res.json();
      setSchedules(json as ScheduleItem[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial fetch + auto-refresh
  useEffect(() => {
    fetchData();

    const interval = setInterval(() => {
      fetchData(true);
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [fetchData]);

  // Compute time slot distribution
  const slotData = useMemo((): TimeSlotData[] => {
    const counts: Record<TimeSlot, number> = { morning: 0, afternoon: 0, evening: 0 };
    for (const s of schedules) {
      const slot = getTimeSlot(s.startTime);
      if (slot) counts[slot]++;
    }
    const total = schedules.length || 1;

    return SLOT_CONFIG.map((cfg) => ({
      slot: cfg.slot,
      label: cfg.label,
      hours: cfg.hours,
      count: counts[cfg.slot],
      percent: Math.round((counts[cfg.slot] / total) * 100),
      color: cfg.color,
      bgColor: cfg.bgColor,
      textColor: cfg.textColor,
    }));
  }, [schedules]);

  // Compute day distribution
  const dayDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    DAY_ORDER.forEach((d) => { counts[d] = 0; });
    for (const s of schedules) {
      if (counts.hasOwnProperty(s.day)) {
        counts[s.day]++;
      }
    }
    return DAY_ORDER.map((day) => ({
      day,
      short: DAY_SHORT[day],
      count: counts[day],
    }));
  }, [schedules]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <Card className="h-full flex flex-col max-w-lg">
        {/* Header */}
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-sm font-medium">
            <span className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Schedule Distribution
            </span>
            <div className="flex items-center gap-2">
              {schedules.length > 0 && (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 h-5 border-primary/30 text-primary"
                >
                  {schedules.length} total
                </Badge>
              )}
              <button
                onClick={() => fetchData(true)}
                disabled={refreshing}
                className={cn(
                  'rounded-md p-1 transition-colors',
                  'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  refreshing && 'animate-spin'
                )}
                aria-label="Refresh schedule distribution"
              >
                <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="pt-0 flex-1 flex flex-col gap-4">
          {/* Error state */}
          {error && (
            <div className="text-center py-4">
              <p className="text-xs text-red-500">{error}</p>
            </div>
          )}

          {/* Loading skeleton */}
          {loading && !schedules.length && <BarsSkeleton />}

          {/* Data view */}
          {!loading && !error && schedules.length > 0 && (
            <>
              {/* Time slot bars */}
              <motion.div
                className="space-y-3"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {slotData.map((slot) => (
                  <motion.div key={slot.slot} variants={barVariants}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Clock className={cn('h-3 w-3 shrink-0', slot.textColor)} />
                        <span className="text-xs font-medium truncate">{slot.label}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {slot.hours}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {slot.count}
                        </span>
                        <Badge
                          variant="secondary"
                          className={cn('text-[10px] px-1.5 py-0 h-4 font-semibold', slot.bgColor, slot.textColor)}
                        >
                          {slot.percent}%
                        </Badge>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                      <motion.div
                        className={cn('h-full rounded-full transition-all duration-700 ease-out', slot.color)}
                        initial={{ width: 0 }}
                        animate={{ width: `${slot.percent}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                      />
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              {/* Day distribution badges */}
              <div className="mt-auto pt-3 border-t">
                <p className="text-[10px] text-muted-foreground mb-2 font-medium uppercase tracking-wider">
                  By Day
                </p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {dayDistribution.map(({ day, short, count }) => (
                    <Badge
                      key={day}
                      variant="outline"
                      className={cn(
                        'text-[10px] px-2 py-0.5 h-5 font-medium tabular-nums',
                        count === 0
                          ? 'text-muted-foreground/50 border-muted'
                          : 'text-primary border-primary/30'
                      )}
                    >
                      {short} {count}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Empty state */}
          {!loading && !error && schedules.length === 0 && (
            <div className="text-center py-6">
              <BarChart3 className="h-6 w-6 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No schedules found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
