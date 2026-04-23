'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, ArrowRight, Users, DoorOpen, Layers } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';
import type { Conflict, ConflictType } from '@/types';

// ============================================================================
// TYPES
// ============================================================================

interface ConflictBreakdown {
  label: string;
  count: number;
  color: string;
  bgColor: string;
  icon: typeof AlertTriangle;
  types: ConflictType[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CONFLICT_CATEGORIES: ConflictBreakdown[] = [
  {
    label: 'Faculty',
    count: 0,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-500',
    icon: Users,
    types: ['faculty_double_booking', 'fully_unavailable'],
  },
  {
    label: 'Room',
    count: 0,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-500',
    icon: DoorOpen,
    types: ['room_double_booking', 'room_capacity_gap'],
  },
  {
    label: 'Section',
    count: 0,
    color: 'text-violet-600 dark:text-violet-400',
    bgColor: 'bg-violet-500',
    icon: Layers,
    types: ['section_overlap'],
  },
];

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
            <Skeleton className="h-5 w-36 rounded" />
          </div>
          <Skeleton className="h-8 w-16 rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-3 w-full rounded-full" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <Skeleton className="h-9 w-full rounded" />
      </CardContent>
    </Card>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function computeBreakdown(conflicts: Conflict[]): ConflictBreakdown[] {
  return CONFLICT_CATEGORIES.map((cat) => ({
    ...cat,
    count: conflicts.filter((c) => cat.types.includes(c.type as ConflictType)).length,
  }));
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ConflictSummaryWidget() {
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const setViewMode = useAppStore((state) => state.setViewMode);

  const fetchConflicts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/conflicts');
      if (!res.ok) throw new Error('Failed to fetch conflicts');
      const data: Conflict[] = await res.json();
      // Only show unresolved (open) conflicts
      const openConflicts = data.filter((c) => !c.resolved);
      setConflicts(openConflicts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConflicts();
  }, [fetchConflicts]);

  const breakdown = useMemo(() => computeBreakdown(conflicts), [conflicts]);
  const totalOpen = conflicts.length;
  const maxCategoryCount = Math.max(...breakdown.map((b) => b.count), 1);

  if (loading) return <WidgetSkeleton />;

  if (error) {
    return (
      <Card className="card-hover">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Conflict Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertTriangle className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Unable to load conflict data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-hover">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Conflict Summary
          </CardTitle>
          <CardAction>
            {totalOpen === 0 ? (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-bold">
                <CheckCircle2 className="h-3.5 w-3.5" />
                All Clear
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 text-xs font-bold tabular-nums">
                <AlertTriangle className="h-3.5 w-3.5" />
                {totalOpen} open
              </div>
            )}
          </CardAction>
        </div>
      </CardHeader>
      <CardContent>
        {totalOpen === 0 ? (
          /* Success state: no conflicts */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center justify-center py-6 text-center"
          >
            <div className="rounded-full bg-emerald-500/10 p-3 mb-3">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">No open conflicts</p>
            <p className="text-xs text-muted-foreground mt-1">All schedules are conflict-free</p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {/* Mini bar chart */}
            <div className="space-y-2.5">
              {breakdown.map((cat) => {
                if (cat.count === 0) return null;
                const pct = Math.round((cat.count / maxCategoryCount) * 100);
                const Icon = cat.icon;
                return (
                  <motion.div
                    key={cat.label}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
                        <Icon className="h-3 w-3" />
                        {cat.label}
                      </span>
                      <span className={cn('font-bold tabular-nums', cat.color)}>
                        {cat.count}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <motion.div
                        className={cn('h-full rounded-full', cat.bgColor)}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Type pills */}
            <div className="flex flex-wrap gap-1.5">
              {breakdown
                .filter((cat) => cat.count > 0)
                .map((cat) => (
                  <Badge
                    key={cat.label}
                    variant="secondary"
                    className={cn('text-[10px] px-2 py-0.5 font-semibold gap-1', cat.color)}
                  >
                    {cat.count} {cat.label.toLowerCase()}
                  </Badge>
                ))}
            </div>

            {/* View All button */}
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 text-xs mt-2"
              onClick={() => setViewMode('conflicts')}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              View All Conflicts
              <ArrowRight className="h-3 w-3 ml-auto" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
