'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BookMarked, ChevronRight, Library, CheckCircle2, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store';

// ============================================================================
// TYPES
// ============================================================================

interface CurriculumItem {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  departmentId?: string | null;
  programId?: string | null;
  createdAt: string;
  updatedAt: string;
  department?: {
    id: string;
    name: string;
    code?: string;
  } | null;
  program?: {
    id: string;
    name: string;
  } | null;
  _count: {
    items: number;
  };
  completedItems: number;
  completionRate: number;
}

// ============================================================================
// ANIMATED COUNTER HOOK
// ============================================================================

function useAnimatedCounter(target: number, duration: number = 600) {
  const [value, setValue] = useState(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === value && target >= 0) return;

    const startTime = performance.now();
    const startValue = value;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
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
// SKELETON
// ============================================================================

function WidgetSkeleton() {
  return (
    <Card className="card-hover">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-5 w-40 rounded" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <div className="flex items-center gap-4 pt-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-16 rounded" />
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-3.5 w-32 rounded" />
                <Skeleton className="h-4 w-16 rounded-full" />
              </div>
              <Skeleton className="h-4 w-10 rounded-full" />
            </div>
            <Skeleton className="h-1.5 w-full rounded-full" />
          </div>
        ))}
        <Skeleton className="h-8 w-full rounded" />
      </CardContent>
    </Card>
  );
}

// ============================================================================
// CURRICULUM ROW
// ============================================================================

function CurriculumRow({
  curriculum,
  index,
  onNavigate,
}: {
  curriculum: CurriculumItem;
  index: number;
  onNavigate: () => void;
}) {
  const animatedCompletion = useAnimatedCounter(curriculum.completionRate, 600 + index * 100);

  return (
    <motion.button
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay: index * 0.07, ease: 'easeOut' }}
      onClick={onNavigate}
      className="w-full rounded-lg p-3 text-left hover:bg-muted/70 hover:translate-x-1 transition-all duration-200 cursor-pointer group border border-transparent hover:border-muted-foreground/10"
    >
      {/* Row header: name + department + items */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
            {curriculum.name}
          </span>
          {curriculum.department && (
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0 h-4 font-medium shrink-0 bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300 border-teal-200 dark:border-teal-800"
            >
              {curriculum.department.code || curriculum.department.name}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Badge
            variant="outline"
            className="text-[10px] px-1.5 py-0 h-4 font-medium tabular-nums border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400"
          >
            {curriculum._count.items} items
          </Badge>
          {!curriculum.isActive && (
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0 h-4 font-medium bg-muted text-muted-foreground"
            >
              Inactive
            </Badge>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-2.5">
        <div className="flex-1 h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${curriculum.completionRate}%` }}
            transition={{ duration: 0.8, delay: index * 0.07 + 0.15, ease: 'easeOut' }}
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
          />
        </div>
        <span className="text-[11px] font-bold tabular-nums shrink-0 w-9 text-right text-emerald-600 dark:text-emerald-400">
          {animatedCompletion}%
        </span>
      </div>
    </motion.button>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CurriculumOverviewWidget() {
  const [curricula, setCurricula] = useState<CurriculumItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const setViewMode = useAppStore((state) => state.setViewMode);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/curricula?includeInactive=true');

      if (!res.ok) {
        throw new Error(`Failed to fetch curricula (${res.status})`);
      }

      const data: CurriculumItem[] = await res.json();

      // Sort by most items descending
      const sorted = [...data].sort((a, b) => b._count.items - a._count.items);
      setCurricula(sorted);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      toast.error('Failed to load curricula', {
        description: message,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const navigateToCurriculum = useCallback(() => {
    setViewMode('curriculum');
  }, [setViewMode]);

  // Compute summary stats before any early returns (hooks must be unconditional)
  const totalCurricula = curricula.length;
  const activeCurricula = curricula.filter((c) => c.isActive).length;
  const totalSubjects = curricula.reduce((sum, c) => sum + c._count.items, 0);
  const avgCompletion =
    curricula.length > 0
      ? Math.round(curricula.reduce((sum, c) => sum + c.completionRate, 0) / curricula.length)
      : 0;

  const animatedTotal = useAnimatedCounter(totalCurricula);
  const animatedActive = useAnimatedCounter(activeCurricula);
  const animatedSubjects = useAnimatedCounter(totalSubjects);
  const animatedAvg = useAnimatedCounter(avgCompletion);

  // Loading state
  if (loading) return <WidgetSkeleton />;

  // Error state
  if (error) {
    return (
      <Card className="card-hover">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BookMarked className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
            Curriculum Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <BookMarked className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Unable to load curriculum data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (curricula.length === 0) {
    return (
      <Card className="card-hover">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BookMarked className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
            Curriculum Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <BookMarked className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm font-medium text-muted-foreground">
              No curricula created yet
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1 max-w-[240px]">
              Create your first curriculum to organize subjects by department and program.
            </p>
            <button
              onClick={navigateToCurriculum}
              className="mt-3 text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
            >
              Create your first curriculum
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Top 5 curricula by item count
  const topCurricula = curricula.slice(0, 5);

  return (
    <Card className="card-hover">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <BookMarked className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
            Curriculum Overview
          </CardTitle>
          <Badge variant="secondary" className="text-[10px] px-2 py-0.5 h-5 font-medium">
            {totalCurricula} total
          </Badge>
        </div>

        {/* Summary row */}
        <div className="flex items-center gap-4 pt-2 flex-wrap">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Library className="h-3 w-3" />
            <span className="font-semibold text-foreground tabular-nums">{animatedActive}</span> active
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <BookOpen className="h-3 w-3" />
            <span className="font-semibold text-foreground tabular-nums">{animatedSubjects}</span> subjects
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            <span className="font-semibold text-foreground tabular-nums">{animatedAvg}%</span> avg completion
          </span>
        </div>
      </CardHeader>

      <CardContent>
        <div className="max-h-96 overflow-y-auto scrollbar-styled space-y-1.5 pr-1">
          {topCurricula.map((curriculum, index) => (
            <CurriculumRow
              key={curriculum.id}
              curriculum={curriculum}
              index={index}
              onNavigate={navigateToCurriculum}
            />
          ))}
        </div>

        {/* View All link */}
        <button
          onClick={navigateToCurriculum}
          className="w-full flex items-center justify-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors py-3 mt-2 border-t"
        >
          View All Curricula
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </CardContent>
    </Card>
  );
}
