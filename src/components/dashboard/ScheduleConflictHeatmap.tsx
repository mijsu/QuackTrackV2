'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Grid3X3, AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Schedule } from '@/types';

// ============================================================================
// TYPES
// ============================================================================

type HeatmapCell = { day: string; timeSlot: string; count: number };

// ============================================================================
// CONSTANTS
// ============================================================================

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
const TIME_SLOTS = [
  { label: '7-9', start: 7, end: 9 },
  { label: '9-11', start: 9, end: 11 },
  { label: '11-1', start: 11, end: 13 },
  { label: '1-3', start: 13, end: 15 },
  { label: '3-5', start: 15, end: 17 },
  { label: '5-7', start: 17, end: 19 },
] as const;

// ============================================================================
// HELPERS
// ============================================================================

function getCellColor(count: number): string {
  if (count === 0) return 'bg-muted/60 dark:bg-muted/30';
  if (count <= 2) return 'bg-emerald-100 dark:bg-emerald-900/40';
  if (count <= 4) return 'bg-emerald-300 dark:bg-emerald-700/50';
  return 'bg-emerald-500 dark:bg-emerald-600/70';
}

function getCellTextColor(count: number): string {
  if (count === 0) return 'text-muted-foreground/50';
  if (count <= 2) return 'text-emerald-700 dark:text-emerald-300';
  if (count <= 4) return 'text-emerald-800 dark:text-emerald-200';
  return 'text-white dark:text-white';
}

function getCellHover(count: number): string {
  if (count === 0) return 'hover:bg-muted dark:hover:bg-muted/50';
  if (count <= 2) return 'hover:bg-emerald-200 dark:hover:bg-emerald-800/50';
  if (count <= 4) return 'hover:bg-emerald-400 dark:hover:bg-emerald-600/60';
  return 'hover:bg-emerald-600 dark:hover:bg-emerald-500/80';
}

// ============================================================================
// SKELETON
// ============================================================================

function HeatmapSkeleton() {
  return (
    <Card className="card-hover">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-44 rounded" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {/* Column headers skeleton */}
          <div className="grid grid-cols-7 gap-1.5">
            <Skeleton className="h-5 rounded" />
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-5 rounded" />
            ))}
          </div>
          {/* Row skeletons */}
          {Array.from({ length: 6 }).map((_, ri) => (
            <div key={ri} className="grid grid-cols-7 gap-1.5">
              <Skeleton className="h-10 rounded" />
              {Array.from({ length: 6 }).map((_, ci) => (
                <Skeleton
                  key={ci}
                  className="h-10 rounded"
                  style={{ animationDelay: `${(ri * 6 + ci) * 40}ms` }}
                />
              ))}
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

export function ScheduleConflictHeatmap() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/schedules');
      if (!res.ok) throw new Error('Failed to fetch schedules');
      const data = await res.json();
      setSchedules(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Build heatmap: count of classes per day x time-slot
  const heatmap = useMemo(() => {
    const grid = new Map<string, number>();

    // Initialize all cells to 0
    DAYS.forEach((day) => {
      TIME_SLOTS.forEach((slot) => {
        grid.set(`${day}-${slot.label}`, 0);
      });
    });

    // Count schedules in each cell
    schedules.forEach((s) => {
      const startHour = parseInt(s.startTime.split(':')[0], 10);
      const endHour = parseInt(s.endTime.split(':')[0], 10);

      // Find matching time slot(s)
      TIME_SLOTS.forEach((slot) => {
        // A schedule belongs to a slot if it overlaps with the slot range
        if (startHour < slot.end && endHour > slot.start) {
          const key = `${s.day}-${slot.label}`;
          grid.set(key, (grid.get(key) || 0) + 1);
        }
      });
    });

    return grid;
  }, [schedules]);

  // Summary stats
  const summary = useMemo(() => {
    let totalClasses = 0;
    let peakSlot: HeatmapCell = { day: 'Monday', timeSlot: '7-9', count: 0 };
    let emptySlots = 0;
    let totalSlots = 0;

    heatmap.forEach((count, key) => {
      totalSlots++;
      totalClasses += count;
      if (count > peakSlot.count) {
        const [day, timeSlot] = key.split('-');
        peakSlot = { day, timeSlot, count };
      }
      if (count === 0) emptySlots++;
    });

    return { totalClasses, peakSlot, emptySlots, totalSlots };
  }, [heatmap]);

  if (loading) return <HeatmapSkeleton />;

  if (error) {
    return (
      <Card className="card-hover">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Grid3X3 className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
            Schedule Density Heatmap
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <AlertTriangle className="h-8 w-8 text-destructive mb-3" />
            <p className="text-sm text-muted-foreground">Failed to load schedule data</p>
            <button
              onClick={fetchData}
              className="mt-3 flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Try again
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-hover">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Grid3X3 className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
            Schedule Density Heatmap
          </CardTitle>
          <button
            onClick={fetchData}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/15 p-2.5 text-center">
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {summary.totalClasses}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Total Classes
            </p>
          </div>
          <div className="rounded-lg bg-gradient-to-br from-teal-500/10 to-emerald-500/10 border border-teal-500/15 p-2.5 text-center">
            <p className="text-sm font-bold text-teal-600 dark:text-teal-400">
              {summary.peakSlot.day.slice(0, 3)} {summary.peakSlot.timeSlot}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Peak Slot ({summary.peakSlot.count})
            </p>
          </div>
          <div className="rounded-lg bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/15 p-2.5 text-center">
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {summary.totalSlots - summary.emptySlots}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Active Slots
            </p>
          </div>
        </div>

        {/* Heatmap Grid */}
        <div className="overflow-x-auto -mx-2 px-2">
          <div className="min-w-[400px]">
            {/* Column headers (days) */}
            <div className="grid grid-cols-[56px_repeat(6,1fr)] gap-1.5 mb-1.5">
              <div /> {/* spacer for row labels */}
              {DAYS.map((day) => (
                <div
                  key={day}
                  className="text-center text-[11px] font-medium text-muted-foreground py-1"
                >
                  {day.slice(0, 3)}
                </div>
              ))}
            </div>

            {/* Rows (time slots) */}
            {TIME_SLOTS.map((slot) => (
              <div
                key={slot.label}
                className="grid grid-cols-[56px_repeat(6,1fr)] gap-1.5 mb-1.5"
              >
                {/* Time label */}
                <div className="flex items-center justify-end pr-1">
                  <span className="text-[11px] text-muted-foreground font-mono whitespace-nowrap">
                    {slot.label}
                  </span>
                </div>
                {/* Cells */}
                {DAYS.map((day) => {
                  const key = `${day}-${slot.label}`;
                  const count = heatmap.get(key) || 0;
                  const timeRange = slot.start < 12
                    ? `${slot.start > 12 ? slot.start - 12 : slot.start}${slot.start < 12 ? 'AM' : 'PM'}-${slot.end > 12 ? slot.end - 12 : slot.end}${slot.end < 12 ? 'AM' : 'PM'}`
                    : `${slot.start > 12 ? slot.start - 12 : slot.start}PM-${slot.end > 12 ? slot.end - 12 : slot.end}PM`;

                  return (
                    <div
                      key={key}
                      className={cn(
                        'h-10 rounded-md border border-transparent transition-all duration-150 cursor-default flex items-center justify-center',
                        getCellColor(count),
                        getCellTextColor(count),
                        getCellHover(count),
                        'hover:scale-105 hover:z-10 hover:shadow-sm'
                      )}
                      title={`${day} ${timeRange}: ${count} class${count !== 1 ? 'es' : ''}`}
                    >
                      <span className="text-xs font-bold">{count}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-[10px] text-muted-foreground flex-wrap">
          <span className="font-medium">Density:</span>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-sm bg-muted/60 dark:bg-muted/30 border border-border" />
            <span>0 classes</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-sm bg-emerald-100 dark:bg-emerald-900/40" />
            <span>1-2</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-sm bg-emerald-300 dark:bg-emerald-700/50" />
            <span>3-4</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-sm bg-emerald-500 dark:bg-emerald-600/70" />
            <span>5+</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
