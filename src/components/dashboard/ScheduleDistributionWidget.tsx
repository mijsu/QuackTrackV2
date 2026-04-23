'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Schedule, DayOfWeek } from '@/types';

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

// ============================================================================
// TYPES
// ============================================================================

interface DayCount {
  day: DayOfWeek;
  count: number;
  isMax: boolean;
}

// ============================================================================
// SKELETON
// ============================================================================

function ChartSkeleton() {
  return (
    <Card className="card-hover">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-44 rounded" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-around gap-2 h-48 pt-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <Skeleton className="h-4 w-8 rounded" />
              <Skeleton className="flex-1 w-full rounded-lg" />
              <Skeleton className="h-3 w-8 rounded" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ScheduleDistributionWidget() {
  const [dayCounts, setDayCounts] = useState<DayCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/schedules');
      if (!res.ok) throw new Error('Failed to fetch schedules');

      const schedules: Schedule[] = await res.json();

      // Count schedules per day
      const counts = new Map<DayOfWeek, number>();
      DAYS.forEach((day) => counts.set(day, 0));
      schedules.forEach((s) => {
        if (counts.has(s.day)) {
          counts.set(s.day, (counts.get(s.day) || 0) + 1);
        }
      });

      const maxCount = Math.max(...Array.from(counts.values()), 1);

      const result: DayCount[] = DAYS.map((day) => ({
        day,
        count: counts.get(day) || 0,
        isMax: counts.get(day) === maxCount && maxCount > 0,
      }));

      setDayCounts(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const maxCount = useMemo(
    () => Math.max(...dayCounts.map((d) => d.count), 1),
    [dayCounts]
  );

  if (loading) return <ChartSkeleton />;

  if (error) {
    return (
      <Card className="card-hover">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
            Schedule Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <BarChart3 className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Unable to load schedule data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-hover">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
          Schedule Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        {dayCounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <BarChart3 className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm font-medium">No schedules</p>
            <p className="text-xs text-muted-foreground mt-1">
              Generate schedules to see distribution
            </p>
          </div>
        ) : (
          <div className="flex items-end justify-around gap-2 sm:gap-3 h-48 pt-2">
            {dayCounts.map((item) => {
              const heightPercent = maxCount > 0
                ? Math.max((item.count / maxCount) * 100, 4)
                : 4;

              return (
                <div
                  key={item.day}
                  className="flex-1 flex flex-col items-center gap-1.5"
                >
                  {/* Count label */}
                  <span
                    className={cn(
                      'text-xs font-semibold tabular-nums transition-colors',
                      item.isMax
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-muted-foreground'
                    )}
                  >
                    {item.count}
                  </span>

                  {/* Bar */}
                  <div className="relative w-full flex-1 flex items-end">
                    <div
                      className={cn(
                        'w-full rounded-t-md transition-all duration-500 ease-out',
                        item.isMax
                          ? 'bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-sm shadow-emerald-500/30'
                          : 'bg-gradient-to-t from-emerald-500/70 to-emerald-400/50'
                      )}
                      style={{ height: `${heightPercent}%` }}
                    />
                  </div>

                  {/* Day label */}
                  <span
                    className={cn(
                      'text-[10px] sm:text-xs font-medium transition-colors',
                      item.isMax
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-muted-foreground'
                    )}
                  >
                    {DAY_SHORT[item.day]}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Total count */}
        {dayCounts.length > 0 && (
          <div className="flex items-center justify-center mt-3 pt-3 border-t">
            <p className="text-[11px] text-muted-foreground">
              Total schedules:{' '}
              <span className="font-semibold text-foreground">
                {dayCounts.reduce((sum, d) => sum + d.count, 0)}
              </span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
