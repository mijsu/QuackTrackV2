'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Building2, Users, Calendar, DoorOpen, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store';

// ============================================================================
// TYPES
// ============================================================================

interface Department {
  id: string;
  name: string;
  code?: string;
  college?: string;
  _count?: {
    users: number;
    programs: number;
    sections: number;
  };
}

interface Schedule {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  section?: {
    id: string;
    departmentId?: string;
    sectionName?: string;
  } | null;
}

interface DepartmentBreakdown {
  id: string;
  name: string;
  facultyCount: number;
  scheduleCount: number;
  utilizationPercent: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEPARTMENT_COLORS = [
  { dot: 'bg-emerald-500', bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/20' },
  { dot: 'bg-teal-500', bg: 'bg-teal-500/10', text: 'text-teal-600 dark:text-teal-400', border: 'border-teal-500/20' },
  { dot: 'bg-amber-500', bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/20' },
  { dot: 'bg-rose-500', bg: 'bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-500/20' },
  { dot: 'bg-violet-500', bg: 'bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-500/20' },
  { dot: 'bg-sky-500', bg: 'bg-sky-500/10', text: 'text-sky-600 dark:text-sky-400', border: 'border-sky-500/20' },
];

const TOTAL_POSSIBLE_SLOTS = 6 * 13; // 6 days (Mon-Sat) × 13 time slots (7am-7pm)

// ============================================================================
// ANIMATED COUNTER HOOK
// ============================================================================

function useAnimatedCounter(target: number, duration: number = 800) {
  const [value, setValue] = useState(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === value && target >= 0) {
      // If already at target, no animation needed
      return;
    }

    const startTime = performance.now();
    const startValue = value;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(startValue + (target - startValue) * eased));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [target, duration, value]);

  return value;
}

// ============================================================================
// HELPERS
// ============================================================================

function getUtilBarColor(percent: number): string {
  if (percent > 80) return 'from-red-500 to-red-400';
  if (percent >= 50) return 'from-emerald-500 to-emerald-400';
  return 'from-amber-500 to-amber-400';
}

function getUtilTextColor(percent: number): string {
  if (percent > 80) return 'text-red-600 dark:text-red-400';
  if (percent >= 50) return 'text-emerald-600 dark:text-emerald-400';
  return 'text-amber-600 dark:text-amber-400';
}

function getUtilLabel(percent: number): string {
  if (percent > 80) return 'Overloaded';
  if (percent >= 50) return 'Balanced';
  return 'Underutilized';
}

// ============================================================================
// SKELETON
// ============================================================================

function WidgetSkeleton() {
  return (
    <Card className="card-hover">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-5 w-44 rounded" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-3 w-3 rounded-full" />
                <Skeleton className="h-3.5 w-32 rounded" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-3.5 w-8 rounded" />
                <Skeleton className="h-3.5 w-8 rounded" />
              </div>
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// DEPARTMENT ROW
// ============================================================================

function DepartmentRow({
  dept,
  colorIndex,
  index,
  onNavigate,
}: {
  dept: DepartmentBreakdown;
  colorIndex: number;
  index: number;
  onNavigate: () => void;
}) {
  const color = DEPARTMENT_COLORS[colorIndex % DEPARTMENT_COLORS.length];
  const animatedSchedules = useAnimatedCounter(dept.scheduleCount);
  const animatedFaculty = useAnimatedCounter(dept.facultyCount);
  const animatedUtil = useAnimatedCounter(dept.utilizationPercent);

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.button
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: index * 0.08, ease: 'easeOut' }}
            onClick={onNavigate}
            className="w-full rounded-lg p-3 text-left hover:bg-muted/70 hover:translate-x-1 transition-all duration-200 cursor-pointer group border border-transparent hover:border-muted-foreground/10"
          >
            {/* Row header: name + counts */}
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={cn(
                    'h-3 w-3 rounded-full shrink-0 ring-2 ring-offset-background',
                    color.dot,
                    `ring-offset-1 ${color.bg.replace('/10', '/30')}`
                  )}
                />
                <span className="text-sm font-medium truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  {dept.name}
                </span>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" />
                  <span className="tabular-nums font-medium">{animatedFaculty}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span className="tabular-nums font-medium">{animatedSchedules}</span>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="flex items-center gap-2.5">
              <div className="flex-1 h-2 w-full rounded-full bg-muted overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(dept.utilizationPercent, 100)}%` }}
                  transition={{ duration: 0.8, delay: index * 0.08 + 0.2, ease: 'easeOut' }}
                  className={cn(
                    'h-full rounded-full bg-gradient-to-r',
                    getUtilBarColor(dept.utilizationPercent)
                  )}
                />
              </div>
              <span
                className={cn(
                  'text-[11px] font-bold tabular-nums shrink-0 w-10 text-right',
                  getUtilTextColor(dept.utilizationPercent)
                )}
              >
                {animatedUtil}%
              </span>
            </div>
          </motion.button>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-[240px]">
          <div className="space-y-2">
            <p className="font-semibold text-sm">{dept.name}</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <div className="flex items-center gap-1.5">
                <Users className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Faculty:</span>
                <span className="font-medium">{dept.facultyCount}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Schedules:</span>
                <span className="font-medium">{dept.scheduleCount}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <DoorOpen className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Utilization:</span>
                <span className="font-medium">{dept.utilizationPercent}%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" />
                <span className="text-muted-foreground">Status:</span>
                <span className={cn('font-medium', getUtilTextColor(dept.utilizationPercent))}>
                  {getUtilLabel(dept.utilizationPercent)}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground pt-1 border-t">
              Click to view department details
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DepartmentBreakdownWidget() {
  const [departments, setDepartments] = useState<DepartmentBreakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const setViewMode = useAppStore((state) => state.setViewMode);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [deptRes, scheduleRes] = await Promise.all([
        fetch('/api/departments'),
        fetch('/api/schedules'),
      ]);

      if (!deptRes.ok) throw new Error('Failed to fetch departments');
      if (!scheduleRes.ok) throw new Error('Failed to fetch schedules');

      const deptData: Department[] = await deptRes.json();
      const scheduleData: Schedule[] = await scheduleRes.json();

      // Count schedules per department
      const scheduleCountByDept = new Map<string, number>();
      scheduleData.forEach((s) => {
        const deptId = s.section?.departmentId;
        if (deptId) {
          scheduleCountByDept.set(
            deptId,
            (scheduleCountByDept.get(deptId) || 0) + 1
          );
        }
      });

      // Build breakdown entries
      const breakdown: DepartmentBreakdown[] = deptData.map((dept) => {
        const facultyCount = dept._count?.users ?? 0;
        const scheduleCount = scheduleCountByDept.get(dept.id) ?? 0;
        const utilizationPercent =
          TOTAL_POSSIBLE_SLOTS > 0
            ? Math.round((scheduleCount / TOTAL_POSSIBLE_SLOTS) * 100)
            : 0;

        return {
          id: dept.id,
          name: dept.name,
          facultyCount,
          scheduleCount,
          utilizationPercent,
        };
      });

      // Sort by schedule count descending
      breakdown.sort((a, b) => b.scheduleCount - a.scheduleCount);

      setDepartments(breakdown);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const navigateToDepartments = useCallback(() => {
    setViewMode('departments');
  }, [setViewMode]);

  // Loading state
  if (loading) return <WidgetSkeleton />;

  // Error state
  if (error) {
    return (
      <Card className="card-hover">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
            Department Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Building2 className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Unable to load department data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (departments.length === 0) {
    return (
      <Card className="card-hover">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
            Department Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Building2 className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm font-medium text-muted-foreground">
              No departments yet
            </p>
            <button
              onClick={navigateToDepartments}
              className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              Add your first department
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Summary stats
  const totalFaculty = departments.reduce((sum, d) => sum + d.facultyCount, 0);
  const totalSchedules = departments.reduce((sum, d) => sum + d.scheduleCount, 0);
  const avgUtilization =
    departments.length > 0
      ? Math.round(departments.reduce((sum, d) => sum + d.utilizationPercent, 0) / departments.length)
      : 0;

  return (
    <Card className="card-hover">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
            Department Overview
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px] px-2 py-0.5 h-5 font-medium">
              {departments.length} dept{departments.length !== 1 ? 's' : ''}
            </Badge>
            <div
              className={cn(
                'flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold tabular-nums',
                avgUtilization > 80
                  ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                  : avgUtilization >= 50
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
              )}
            >
              {avgUtilization}% avg
            </div>
          </div>
        </div>
        {/* Summary row */}
        <div className="flex items-center gap-4 pt-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {totalFaculty} faculty
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {totalSchedules} schedules
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="max-h-96 overflow-y-auto scrollbar-styled space-y-1.5 pr-1">
          {departments.map((dept, index) => (
            <DepartmentRow
              key={dept.id}
              dept={dept}
              colorIndex={index}
              index={index}
              onNavigate={navigateToDepartments}
            />
          ))}
        </div>

        {/* View All link */}
        {departments.length > 0 && (
          <button
            onClick={navigateToDepartments}
            className="w-full flex items-center justify-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors py-3 mt-2 border-t"
          >
            View All Departments
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-2 border-t text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-6 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400" />
            Balanced (50–80%)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-6 rounded-full bg-gradient-to-r from-amber-500 to-amber-400" />
            Underutilized (&lt;50%)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-6 rounded-full bg-gradient-to-r from-red-500 to-red-400" />
            Overloaded (&gt;80%)
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
