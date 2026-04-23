'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import { Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { User, Schedule } from '@/types';

// ============================================================================
// TYPES
// ============================================================================

interface FacultyWorkloadEntry {
  id: string;
  name: string;
  department?: string | null;
  currentUnits: number;
  maxUnits: number;
  percentage: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const WORKLOAD_GREEN_MAX = 70;   // Under 70% = green (optimal)
const WORKLOAD_AMBER_MAX = 90;   // 70-90% = amber
// Over 90% = red (overloaded)

// ============================================================================
// SKELETON
// ============================================================================

function OverviewSkeleton() {
  return (
    <Card className="card-hover">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-5 w-48 rounded" />
          </div>
          <Skeleton className="h-5 w-32 rounded" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-4 w-28 rounded" />
              <Skeleton className="h-5 flex-1 rounded-full" />
              <Skeleton className="h-4 w-14 rounded" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function getWorkloadColor(percentage: number) {
  if (percentage > WORKLOAD_AMBER_MAX) {
    return {
      bar: 'bg-red-500',
      barBg: 'bg-red-500/10',
      text: 'text-red-600 dark:text-red-400',
      label: 'Overloaded',
    };
  }
  if (percentage > WORKLOAD_GREEN_MAX) {
    return {
      bar: 'bg-amber-500',
      barBg: 'bg-amber-500/10',
      text: 'text-amber-600 dark:text-amber-400',
      label: 'Heavy',
    };
  }
  return {
    bar: 'bg-emerald-500',
    barBg: 'bg-emerald-500/10',
    text: 'text-emerald-600 dark:text-emerald-400',
    label: 'Optimal',
  };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function FacultyWorkloadOverview() {
  const [facultyData, setFacultyData] = useState<FacultyWorkloadEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [usersRes, schedulesRes] = await Promise.all([
        fetch('/api/users?role=faculty'),
        fetch('/api/schedules'),
      ]);

      if (!usersRes.ok || !schedulesRes.ok) throw new Error('Failed to fetch data');

      const faculty: User[] = await usersRes.json();
      const schedules: Schedule[] = await schedulesRes.json();

      // Count assigned units per faculty from schedules
      const facultyAssignedUnits = new Map<string, number>();
      schedules.forEach((s) => {
        const units = s.subject?.units || 3;
        const current = facultyAssignedUnits.get(s.facultyId) || 0;
        facultyAssignedUnits.set(s.facultyId, current + units);
      });

      // Build faculty workload entries
      const entries: FacultyWorkloadEntry[] = faculty.map((f) => {
        const currentUnits = facultyAssignedUnits.get(f.id) || 0;
        const maxUnits = f.maxUnits || 21;
        const percentage = maxUnits > 0 ? Math.round((currentUnits / maxUnits) * 100) : 0;

        return {
          id: f.id,
          name: f.name || 'Unknown',
          department: f.department?.name || f.departmentId || null,
          currentUnits,
          maxUnits,
          percentage,
        };
      });

      setFacultyData(entries);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Sort by load percentage (highest first)
  const sortedData = useMemo(
    () => [...facultyData].sort((a, b) => b.percentage - a.percentage),
    [facultyData]
  );

  // Count faculty at optimal load (under 70%)
  const optimalCount = facultyData.filter(
    (f) => f.percentage <= WORKLOAD_GREEN_MAX
  ).length;

  if (loading) return <OverviewSkeleton />;

  if (error) {
    return (
      <Card className="card-hover">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
            Faculty Workload Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Activity className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Unable to load faculty workload data</p>
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
            <Activity className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
            Faculty Workload Distribution
          </CardTitle>
          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
            {optimalCount} of {facultyData.length} at optimal load
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {sortedData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Activity className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm font-medium">No faculty data</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add faculty members to see their workload distribution
            </p>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto scrollbar-styled space-y-2 pr-1">
            {sortedData.map((faculty) => {
              const colors = getWorkloadColor(faculty.percentage);
              const barWidth = Math.min(faculty.percentage, 100);

              return (
                <Tooltip key={faculty.id}>
                  <TooltipTrigger asChild>
                    <div className="group flex items-center gap-3 rounded-lg px-2 py-1.5 -mx-2 transition-colors hover:bg-muted/50 cursor-default">
                      {/* Faculty name */}
                      <div className="min-w-0 w-32 shrink-0">
                        <span className="text-sm font-medium truncate block">
                          {faculty.name}
                        </span>
                        {faculty.department && (
                          <span className="text-[10px] text-muted-foreground truncate block">
                            {faculty.department}
                          </span>
                        )}
                      </div>

                      {/* Horizontal bar */}
                      <div className="flex-1 h-5 rounded-full bg-muted/60 overflow-hidden relative">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all duration-500 ease-out',
                            colors.bar
                          )}
                          style={{ width: `${barWidth}%` }}
                        />
                        {/* Percentage inside bar when wide enough */}
                        {barWidth > 20 && (
                          <span className="absolute inset-0 flex items-center justify-end pr-2 text-[10px] font-semibold text-white/90">
                            {faculty.percentage}%
                          </span>
                        )}
                      </div>

                      {/* Unit count */}
                      <span
                        className={cn(
                          'text-xs font-semibold tabular-nums whitespace-nowrap min-w-[52px] text-right',
                          colors.text
                        )}
                      >
                        {faculty.currentUnits}/{faculty.maxUnits}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-[220px]">
                    <div className="space-y-1">
                      <p className="font-semibold">{faculty.name}</p>
                      {faculty.department && (
                        <p className="text-[10px] opacity-80">Dept: {faculty.department}</p>
                      )}
                      <p className="text-[10px] opacity-80">
                        Units: {faculty.currentUnits} / {faculty.maxUnits} ({faculty.percentage}%)
                      </p>
                      <p className={cn('text-[10px] font-medium', colors.text)}>
                        Status: {colors.label}
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        )}

        {/* Legend */}
        {facultyData.length > 0 && (
          <div className="flex items-center gap-4 mt-3 pt-3 border-t text-[10px] text-muted-foreground">
            <span className="font-medium">Load:</span>
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
              <span>&lt;70%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-sm bg-amber-500" />
              <span>70-90%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-sm bg-red-500" />
              <span>&gt;90%</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
