'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarDays, CheckCircle2, Zap, AlertTriangle, Clock, BarChart3, Sun, Sunrise } from 'lucide-react';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';
import type { Schedule, DayOfWeek, ScheduleStatus } from '@/types';

// ============================================================================
// CONSTANTS
// ============================================================================

const DAYS: DayOfWeek[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const DAY_SHORT: Record<string, string> = {
  Monday: 'Mon',
  Tuesday: 'Tue',
  Wednesday: 'Wed',
  Thursday: 'Thu',
  Friday: 'Fri',
  Saturday: 'Sat',
};

interface StatusInfo {
  status: ScheduleStatus;
  label: string;
  count: number;
  icon: typeof CheckCircle2;
  className: string;
}

// ============================================================================
// SKELETON
// ============================================================================

function StatsSkeleton() {
  return (
    <Card className="card-hover h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-5 w-28 rounded" />
          </div>
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-5">
        {/* Total count skeleton */}
        <Skeleton className="h-10 w-32 rounded-lg" />
        {/* Day distribution skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-24 rounded" />
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-full rounded" />
          ))}
        </div>
        {/* Status badges skeleton */}
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-20 rounded-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ScheduleStatsWidget() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const setViewMode = useAppStore((state) => state.setViewMode);

  const fetchSchedules = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/schedules');
      if (!res.ok) throw new Error('Failed to fetch schedules');
      const data: Schedule[] = await res.json();
      setSchedules(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  // --- Derived statistics ---

  const totalCount = schedules.length;

  // Count per day (Mon-Sat)
  const dayCounts = useMemo(() => {
    const counts = new Map<DayOfWeek, number>();
    DAYS.forEach((day) => counts.set(day, 0));
    schedules.forEach((s) => {
      if (counts.has(s.day)) {
        counts.set(s.day, (counts.get(s.day) || 0) + 1);
      }
    });
    return DAYS.map((day) => ({
      day,
      count: counts.get(day) || 0,
    }));
  }, [schedules]);

  const maxDayCount = useMemo(
    () => Math.max(...dayCounts.map((d) => d.count), 1),
    [dayCounts]
  );

  // Peak day
  const peakDay = useMemo(() => {
    if (dayCounts.length === 0) return null;
    const max = maxDayCount;
    return dayCounts.find((d) => d.count === max) || null;
  }, [dayCounts, maxDayCount]);

  // Count per status
  const statusCounts = useMemo((): StatusInfo[] => {
    const counts: Record<ScheduleStatus, number> = {
      approved: 0,
      generated: 0,
      modified: 0,
      conflict: 0,
    };
    schedules.forEach((s) => {
      counts[s.status] = (counts[s.status] || 0) + 1;
    });

    return [
      {
        status: 'approved',
        label: 'Approved',
        count: counts.approved,
        icon: CheckCircle2,
        className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20',
      },
      {
        status: 'generated',
        label: 'Generated',
        count: counts.generated,
        icon: Zap,
        className: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20 hover:bg-sky-500/20',
      },
      {
        status: 'modified',
        label: 'Modified',
        count: counts.modified,
        icon: Clock,
        className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20',
      },
      {
        status: 'conflict',
        label: 'Conflict',
        count: counts.conflict,
        icon: AlertTriangle,
        className: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 hover:bg-red-500/20',
      },
    ];
  }, [schedules]);

  // Morning / Afternoon split
  const timeSlotSplit = useMemo(() => {
    let morning = 0;
    let afternoon = 0;
    schedules.forEach((s) => {
      const startHour = parseInt(s.startTime.split(':')[0], 10);
      if (startHour < 12) {
        morning++;
      } else {
        afternoon++;
      }
    });
    const total = morning + afternoon;
    return {
      morning,
      afternoon,
      morningPct: total > 0 ? (morning / total) * 100 : 0,
      afternoonPct: total > 0 ? (afternoon / total) * 100 : 0,
      total,
    };
  }, [schedules]);

  // --- Render states ---

  if (loading) return <StatsSkeleton />;

  if (error) {
    return (
      <Card className="card-hover h-full flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
            Schedule Stats
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1">
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <BarChart3 className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Unable to load</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-hover h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
            Schedule Stats
          </CardTitle>
          <button
            onClick={() => setViewMode('schedules')}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="View all schedules"
          >
            <CalendarDays className="h-4 w-4" />
          </button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-5">
        {schedules.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-muted p-4 mb-3">
              <CalendarDays className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No schedules</p>
            <p className="text-xs text-muted-foreground mt-1">
              Generate schedules to see statistics
            </p>
          </div>
        ) : (
          <>
            {/* Total Count */}
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight tabular-nums">
                {totalCount}
              </span>
              <span className="text-sm text-muted-foreground">total schedules</span>
            </div>

            {/* Day Distribution */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                By Day
              </p>
              <div className="space-y-1.5">
                {dayCounts.map((item) => {
                  const isPeak = peakDay !== null && item.day === peakDay.day;
                  return (
                    <div
                      key={item.day}
                      className="flex items-center gap-2 text-xs"
                    >
                      <span
                        className={cn(
                          'w-8 shrink-0',
                          isPeak
                            ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                            : 'text-muted-foreground'
                        )}
                      >
                        {DAY_SHORT[item.day]}
                      </span>
                      <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all duration-500',
                            isPeak
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-sm shadow-emerald-500/30'
                              : 'bg-emerald-500/70'
                          )}
                          style={{
                            width: `${maxDayCount > 0 ? (item.count / maxDayCount) * 100 : 0}%`,
                            minWidth: item.count > 0 ? '4px' : '0px',
                          }}
                        />
                      </div>
                      <span
                        className={cn(
                          'w-6 text-right tabular-nums shrink-0',
                          isPeak
                            ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                            : 'text-muted-foreground'
                        )}
                      >
                        {item.count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Status Badges */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                By Status
              </p>
              <div className="flex flex-wrap gap-2">
                {statusCounts.map((info) => {
                  const Icon = info.icon;
                  return (
                    <Badge
                      key={info.status}
                      variant="outline"
                      className={cn(
                        'gap-1.5 text-xs transition-colors',
                        info.className
                      )}
                    >
                      <Icon className="h-3 w-3" />
                      {info.label}
                      <span className="font-semibold tabular-nums">{info.count}</span>
                    </Badge>
                  );
                })}
              </div>
            </div>

            {/* Peak Day */}
            {peakDay && peakDay.count > 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2">
                <Zap className="h-4 w-4 text-emerald-500 shrink-0" />
                <p className="text-xs">
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    Peak: {peakDay.day}
                  </span>
                  <span className="text-muted-foreground">
                    {' '}({peakDay.count} {peakDay.count === 1 ? 'class' : 'classes'})
                  </span>
                </p>
              </div>
            )}

            {/* Morning / Afternoon Split */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Time Slot Utilization
              </p>
              <div className="space-y-2">
                {/* Morning row */}
                <div className="flex items-center gap-2 text-xs">
                  <Sunrise className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <span className="w-16 text-muted-foreground">Morning</span>
                  <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all duration-500"
                      style={{
                        width: `${timeSlotSplit.morningPct}%`,
                        minWidth: timeSlotSplit.morning > 0 ? '4px' : '0px',
                      }}
                    />
                  </div>
                  <span className="w-16 text-right tabular-nums text-muted-foreground shrink-0">
                    {timeSlotSplit.morning} ({Math.round(timeSlotSplit.morningPct)}%)
                  </span>
                </div>
                {/* Afternoon row */}
                <div className="flex items-center gap-2 text-xs">
                  <Sun className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                  <span className="w-16 text-muted-foreground">Afternoon</span>
                  <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-500 rounded-full transition-all duration-500"
                      style={{
                        width: `${timeSlotSplit.afternoonPct}%`,
                        minWidth: timeSlotSplit.afternoon > 0 ? '4px' : '0px',
                      }}
                    />
                  </div>
                  <span className="w-16 text-right tabular-nums text-muted-foreground shrink-0">
                    {timeSlotSplit.afternoon} ({Math.round(timeSlotSplit.afternoonPct)}%)
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
