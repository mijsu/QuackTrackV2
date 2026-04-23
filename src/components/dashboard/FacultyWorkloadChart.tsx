'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import { Users, ArrowUpDown, ArrowRight } from 'lucide-react';
import { useAppStore } from '@/store';
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

type SortMode = 'load' | 'name';

// ============================================================================
// CONSTANTS
// ============================================================================

const WORKLOAD_THRESHOLD_HIGH = 80;
const WORKLOAD_THRESHOLD_OVER = 100;
const MAX_DISPLAY = 10;

// ============================================================================
// SKELETON
// ============================================================================

function ChartSkeleton() {
  return (
    <Card className="card-hover">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-5 w-36 rounded" />
          </div>
          <Skeleton className="h-7 w-24 rounded" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3.5 w-32 rounded" />
                <Skeleton className="h-3.5 w-16 rounded" />
              </div>
              <Skeleton className="h-2.5 w-full rounded-full" />
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
  if (percentage > WORKLOAD_THRESHOLD_OVER) {
    return {
      bar: 'bg-red-500',
      text: 'text-red-600 dark:text-red-400',
      label: 'Overloaded',
      dot: 'bg-red-500',
    };
  }
  if (percentage > WORKLOAD_THRESHOLD_HIGH) {
    return {
      bar: 'bg-amber-500',
      text: 'text-amber-600 dark:text-amber-400',
      label: 'Heavy',
      dot: 'bg-amber-500',
    };
  }
  return {
    bar: 'bg-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-400',
    label: 'Balanced',
    dot: 'bg-emerald-500',
  };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function FacultyWorkloadChart() {
  const [facultyData, setFacultyData] = useState<FacultyWorkloadEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('load');
  const setViewMode = useAppStore((state) => state.setViewMode);

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

  // Sort data
  const sortedData = [...facultyData]
    .sort((a, b) => {
      if (sortMode === 'name') return a.name.localeCompare(b.name);
      return b.percentage - a.percentage;
    })
    .slice(0, MAX_DISPLAY);

  // Stats
  const optimalCount = facultyData.filter(
    (f) => f.percentage <= WORKLOAD_THRESHOLD_HIGH
  ).length;

  if (loading) return <ChartSkeleton />;

  if (error) {
    return (
      <Card className="card-hover">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
            Faculty Workload
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Users className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Unable to load faculty workload</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-hover">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
          Faculty Workload
        </CardTitle>
        <CardAction>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setSortMode(sortMode === 'load' ? 'name' : 'load')}
            >
              <ArrowUpDown className="h-3 w-3 mr-1" />
              {sortMode === 'load' ? 'By Load' : 'By Name'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setViewMode('users')}
            >
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </CardAction>
      </CardHeader>
      <CardContent>
        {sortedData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Users className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm font-medium">No faculty data</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add faculty members to see their workload
            </p>
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto scrollbar-styled space-y-2.5 pr-1">
            {sortedData.map((faculty) => {
              const colors = getWorkloadColor(faculty.percentage);
              const displayPercentage = Math.min(faculty.percentage, 150);
              const barWidth = Math.min((faculty.percentage / 100) * 100, 100);

              return (
                <Tooltip key={faculty.id}>
                  <TooltipTrigger asChild>
                    <div className="group cursor-default rounded-lg p-2 -mx-2 transition-colors hover:bg-muted/50">
                      {/* Faculty info */}
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="min-w-0">
                          <span className="text-sm font-medium truncate block">
                            {faculty.name}
                          </span>
                          {faculty.department && (
                            <span className="text-[10px] text-muted-foreground truncate block">
                              {faculty.department}
                            </span>
                          )}
                        </div>
                        <span
                          className={cn(
                            'text-xs font-semibold tabular-nums whitespace-nowrap',
                            colors.text
                          )}
                        >
                          {faculty.currentUnits}/{faculty.maxUnits}
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all duration-500 ease-out',
                            colors.bar
                          )}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>

                      {/* Percentage label */}
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-[10px] text-muted-foreground">
                          {colors.label}
                        </span>
                        <span className={cn('text-[10px] font-medium', colors.text)}>
                          {displayPercentage}%
                        </span>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-[220px]">
                    <div className="space-y-1">
                      <p className="font-semibold">{faculty.name}</p>
                      {faculty.department && (
                        <p className="text-[10px] opacity-80">Dept: {faculty.department}</p>
                      )}
                      <p className="text-[10px] opacity-80">
                        Load: {faculty.currentUnits} / {faculty.maxUnits} units ({faculty.percentage}%)
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

        {/* Summary stats */}
        {facultyData.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t">
            <div className="text-center">
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {facultyData.filter((f) => f.percentage <= WORKLOAD_THRESHOLD_HIGH).length}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Balanced
              </p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                {facultyData.filter(
                  (f) => f.percentage > WORKLOAD_THRESHOLD_HIGH && f.percentage <= WORKLOAD_THRESHOLD_OVER
                ).length}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Heavy
              </p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-red-600 dark:text-red-400">
                {facultyData.filter((f) => f.percentage > WORKLOAD_THRESHOLD_OVER).length}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Overloaded
              </p>
            </div>
          </div>
        )}

        {/* Optimal load footer */}
        {facultyData.length > 0 && (
          <p className="text-[11px] text-muted-foreground text-center mt-2">
            {optimalCount} of {facultyData.length} faculty at optimal load
          </p>
        )}
      </CardContent>
    </Card>
  );
}
