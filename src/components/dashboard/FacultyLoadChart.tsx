'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import { GraduationCap, AlertCircle, Users, BarChart3, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store';
import type { User, Schedule } from '@/types';

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_DISPLAY = 10;
const DEFAULT_MAX_UNITS = 21;

// ============================================================================
// TYPES
// ============================================================================

interface FacultyLoadEntry {
  id: string;
  name: string;
  department: string | null;
  currentUnits: number;
  maxUnits: number;
  percentage: number;
  status: 'underloaded' | 'balanced' | 'overloaded';
}

// ============================================================================
// HELPERS
// ============================================================================

function getLoadStatus(percentage: number): FacultyLoadEntry['status'] {
  if (percentage > 90) return 'overloaded';
  if (percentage >= 70) return 'balanced';
  return 'underloaded';
}

function getLoadColors(status: FacultyLoadEntry['status']) {
  switch (status) {
    case 'underloaded':
      return {
        bar: 'bg-emerald-500',
        barBg: 'bg-emerald-500/10',
        text: 'text-emerald-600 dark:text-emerald-400',
        label: 'Underloaded',
        badge: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      };
    case 'balanced':
      return {
        bar: 'bg-teal-500',
        barBg: 'bg-teal-500/10',
        text: 'text-teal-600 dark:text-teal-400',
        label: 'Balanced',
        badge: 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800',
      };
    case 'overloaded':
      return {
        bar: 'bg-red-500',
        barBg: 'bg-red-500/10',
        text: 'text-red-600 dark:text-red-400',
        label: 'Overloaded',
        badge: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
      };
  }
}

// ============================================================================
// SKELETON
// ============================================================================

function LoadingSkeleton() {
  return (
    <Card className="card-hover">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-5 w-44 rounded" />
          </div>
          <Skeleton className="h-8 w-20 rounded" />
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary badges skeleton */}
        <div className="flex gap-2 mb-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-24 rounded-full" />
          ))}
        </div>
        {/* Bar chart skeleton */}
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3.5 w-28 rounded" />
                <Skeleton className="h-3.5 w-14 rounded" />
              </div>
              <Skeleton className="h-3 w-full rounded-full" />
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

export function FacultyLoadChart() {
  const [facultyData, setFacultyData] = useState<FacultyLoadEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
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

      // Build faculty load entries
      const entries: FacultyLoadEntry[] = faculty.map((f) => {
        const currentUnits = facultyAssignedUnits.get(f.id) || 0;
        const maxUnits = f.maxUnits || DEFAULT_MAX_UNITS;
        const percentage = maxUnits > 0 ? Math.round((currentUnits / maxUnits) * 100) : 0;

        return {
          id: f.id,
          name: f.name || 'Unknown',
          department: f.department?.name || f.departmentId || null,
          currentUnits,
          maxUnits,
          percentage,
          status: getLoadStatus(percentage),
        };
      });

      // Sort by load percentage (highest first)
      entries.sort((a, b) => b.percentage - a.percentage);

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

  // Display data: first MAX_DISPLAY items, or all if showAll
  const displayData = useMemo(() => {
    return showAll ? facultyData : facultyData.slice(0, MAX_DISPLAY);
  }, [facultyData, showAll]);

  // Summary stats
  const summaryStats = useMemo(() => {
    const underloaded = facultyData.filter((f) => f.status === 'underloaded').length;
    const balanced = facultyData.filter((f) => f.status === 'balanced').length;
    const overloaded = facultyData.filter((f) => f.status === 'overloaded').length;
    return { underloaded, balanced, overloaded, total: facultyData.length };
  }, [facultyData]);

  // Render states
  if (loading) return <LoadingSkeleton />;

  if (error) {
    return (
      <Card className="card-hover">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <GraduationCap className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
            Faculty Load Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Unable to load faculty data</p>
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
            <GraduationCap className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
            Faculty Load Distribution
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setViewMode('faculty')}
          >
            <ArrowRight className="h-3 w-3" />
          </Button>
        </div>

        {/* Summary badges */}
        {facultyData.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {summaryStats.underloaded} Underloaded
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
              <div className="h-1.5 w-1.5 rounded-full bg-teal-500" />
              {summaryStats.balanced} Balanced
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
              <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
              {summaryStats.overloaded} Overloaded
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {facultyData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Users className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm font-medium">No faculty data</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add faculty members to see their load distribution
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {/* Bar chart rows */}
            {displayData.map((faculty, index) => {
              const colors = getLoadColors(faculty.status);
              const barWidth = Math.min(faculty.percentage, 120); // Allow slight overflow for overloaded

              return (
                <motion.div
                  key={faculty.id}
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.04 }}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="group cursor-default rounded-lg px-2 py-2 -mx-2 transition-colors hover:bg-muted/50">
                        {/* Faculty info row */}
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-medium truncate">{faculty.name}</span>
                              <span className={cn('text-[9px] font-semibold px-1.5 py-0.5 rounded-full border', colors.badge)}>
                                {colors.label}
                              </span>
                            </div>
                            {faculty.department && (
                              <span className="text-[10px] text-muted-foreground truncate block mt-0.5">
                                {faculty.department}
                              </span>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <span className={cn('text-xs font-bold tabular-nums', colors.text)}>
                              {faculty.currentUnits}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              /{faculty.maxUnits} units
                            </span>
                          </div>
                        </div>

                        {/* Horizontal bar */}
                        <div className="h-2.5 w-full rounded-full bg-muted/80 overflow-hidden relative">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${barWidth}%` }}
                            transition={{ duration: 0.6, delay: index * 0.04 + 0.1, ease: 'easeOut' }}
                            className={cn('h-full rounded-full', colors.bar)}
                          />
                          {/* Percentage marker */}
                          {faculty.percentage > 100 && (
                            <div
                              className="absolute top-0 bottom-0 w-px bg-foreground/30"
                              style={{ left: '100%' }}
                              title="Max capacity"
                            />
                          )}
                        </div>

                        {/* Percentage label */}
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="text-[10px] text-muted-foreground">
                            {faculty.percentage}% of capacity
                          </span>
                          {faculty.percentage > 100 && (
                            <span className="text-[9px] text-red-500 font-medium">
                              +{faculty.percentage - 100}% over
                            </span>
                          )}
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-[240px]">
                      <div className="space-y-1">
                        <p className="font-semibold">{faculty.name}</p>
                        {faculty.department && (
                          <p className="text-[10px] opacity-80">Dept: {faculty.department}</p>
                        )}
                        <p className="text-[10px] opacity-80">
                          Teaching: {faculty.currentUnits} / {faculty.maxUnits} units ({faculty.percentage}%)
                        </p>
                        <p className={cn('text-[10px] font-medium', colors.text)}>
                          Status: {colors.label}
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </motion.div>
              );
            })}

            {/* View All button */}
            {facultyData.length > MAX_DISPLAY && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: MAX_DISPLAY * 0.04 + 0.2 }}
                className="pt-2 border-t mt-2"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full h-8 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setShowAll(!showAll)}
                >
                  <BarChart3 className="h-3 w-3 mr-1" />
                  {showAll
                    ? `Show Less (${MAX_DISPLAY} of ${facultyData.length})`
                    : `View All (${facultyData.length} Faculty)`}
                </Button>
              </motion.div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
