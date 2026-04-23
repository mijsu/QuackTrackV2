'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp, Award } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FacultyUtilItem {
  id: string;
  name: string;
  image?: string | null;
  assigned: number;
  max: number;
  percent: number;
  department: string;
}

interface StatsResponse {
  facultyUtilization: FacultyUtilItem[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TOP_FACULTY_COUNT = 5;

const AVATAR_COLORS = [
  'bg-emerald-500',
  'bg-amber-500',
  'bg-violet-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-orange-500',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getWorkloadColor(pct: number) {
  if (pct > 85) return { bar: 'bg-red-500', text: 'text-red-600 dark:text-red-400', label: 'High' };
  if (pct >= 60) return { bar: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', label: 'Medium' };
  return { bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', label: 'Low' };
}

function getInitial(name: string): string {
  return name
    .split(' ')
    .map((w) => w.charAt(0))
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

// ---------------------------------------------------------------------------
// Stagger animation variants
// ---------------------------------------------------------------------------

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.07 },
  },
};

const rowVariants = {
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

function RowsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: TOP_FACULTY_COUNT }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-7 w-7 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-4 w-6 rounded-full" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function QuickFacultyStatsWidget() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/stats');
      if (!res.ok) throw new Error('Failed to fetch stats');
      const json = await res.json();
      setStats(json as StatsResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Get top 5 faculty by assigned units (which correlates with number of schedules)
  const topFaculty = useMemo(() => {
    if (!stats?.facultyUtilization) return [];
    return [...stats.facultyUtilization]
      .sort((a, b) => b.assigned - a.assigned)
      .slice(0, TOP_FACULTY_COUNT);
  }, [stats]);

  const maxAssigned = useMemo(() => {
    if (topFaculty.length === 0) return 1;
    return Math.max(...topFaculty.map((f) => f.assigned), 1);
  }, [topFaculty]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25 }}
    >
      <Card className="h-full flex flex-col max-w-lg">
        {/* Header */}
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-sm font-medium">
            <span className="flex items-center gap-2">
              <Award className="h-4 w-4 text-amber-500" />
              Busiest Faculty
            </span>
            {stats && topFaculty.length > 0 && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 h-5 border-primary/30 text-primary"
              >
                Top {topFaculty.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>

        <CardContent className="pt-0 flex-1 flex flex-col">
          {/* Error state */}
          {error && (
            <div className="text-center py-4">
              <p className="text-xs text-red-500">{error}</p>
            </div>
          )}

          {/* Loading skeleton */}
          {loading && <RowsSkeleton />}

          {/* Data view */}
          {!loading && !error && (
            <>
              {topFaculty.length === 0 ? (
                <div className="text-center py-6">
                  <Users className="h-6 w-6 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No faculty data available</p>
                </div>
              ) : (
                <motion.div
                  className="space-y-3"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {topFaculty.map((faculty, idx) => {
                    const workload = getWorkloadColor(faculty.percent);
                    const barWidth = (faculty.assigned / maxAssigned) * 100;
                    const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length];

                    return (
                      <motion.div key={faculty.id} variants={rowVariants}>
                        <div className="flex items-center gap-2.5">
                          {/* Rank + Avatar */}
                          <div className="relative shrink-0">
                            <div
                              className={cn(
                                'h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white',
                                avatarColor
                              )}
                            >
                              {getInitial(faculty.name)}
                            </div>
                            {/* Rank badge */}
                            <div className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-background border border-border flex items-center justify-center">
                              <span className="text-[8px] font-bold text-muted-foreground">
                                {idx + 1}
                              </span>
                            </div>
                          </div>

                          {/* Info + Bar */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-xs font-medium truncate max-w-[140px]">
                                {faculty.name}
                              </span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] px-1.5 py-0 h-4 tabular-nums font-semibold"
                                >
                                  {faculty.assigned}u
                                </Badge>
                                {faculty.percent > 85 && (
                                  <TrendingUp className="h-3 w-3 text-red-500" />
                                )}
                              </div>
                            </div>
                            {/* Workload bar */}
                            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                              <motion.div
                                className={cn(
                                  'h-full rounded-full transition-all duration-700 ease-out',
                                  workload.bar
                                )}
                                initial={{ width: 0 }}
                                animate={{ width: `${barWidth}%` }}
                                transition={{ duration: 0.8, ease: 'easeOut', delay: idx * 0.05 }}
                              />
                            </div>
                            <div className="flex items-center justify-between mt-0.5">
                              <span className="text-[9px] text-muted-foreground">
                                {faculty.department}
                              </span>
                              <span
                                className={cn(
                                  'text-[9px] tabular-nums font-medium',
                                  workload.text
                                )}
                              >
                                {faculty.percent}% load
                              </span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}

              {/* Legend */}
              {topFaculty.length > 0 && (
                <div className="flex items-center gap-4 mt-4 pt-3 border-t">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-[10px] text-muted-foreground">&lt;60%</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-amber-500" />
                    <span className="text-[10px] text-muted-foreground">60-85%</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-red-500" />
                    <span className="text-[10px] text-muted-foreground">&gt;85%</span>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
