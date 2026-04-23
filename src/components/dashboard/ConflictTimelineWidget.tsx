'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, DoorOpen, Users, ArrowRight, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ConflictItem {
  id: string;
  type: string;
  description: string;
  severity?: 'critical' | 'warning' | 'info';
  resolved: boolean;
  createdAt: string;
}

interface ConflictResponse {
  conflicts: ConflictItem[];
  total: number;
  unresolved: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REFRESH_INTERVAL_MS = 30_000;
const MAX_TIMELINE_ITEMS = 5;

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function getConflictIcon(type: string) {
  if (type.includes('time') || type.includes('double_booking')) return Clock;
  if (type.includes('room') || type.includes('capacity')) return DoorOpen;
  return Users;
}

function getSeverityDot(severity?: string, resolved?: boolean) {
  if (resolved) return 'bg-emerald-500';
  if (severity === 'critical') return 'bg-red-500';
  if (severity === 'warning') return 'bg-amber-500';
  return 'bg-muted-foreground/40';
}

function getSeverityLabel(severity?: string, resolved?: boolean) {
  if (resolved) return 'Resolved';
  if (severity === 'critical') return 'Critical';
  if (severity === 'warning') return 'Warning';
  return 'Info';
}

function getConflictTypeShort(type: string): string {
  if (type.includes('faculty')) return 'Faculty';
  if (type.includes('room')) return 'Room';
  if (type.includes('section')) return 'Section';
  if (type.includes('capacity')) return 'Capacity';
  if (type.includes('specialization')) return 'Specialization';
  if (type.includes('preference')) return 'Preference';
  return 'Conflict';
}

function getDayOfWeek(dateStr: string): number {
  const day = new Date(dateStr).getDay(); // 0=Sun ... 6=Sat
  return day === 0 ? 0 : day - 1; // Map to 0=Mon ... 5=Sat, Sun=0
}

// ---------------------------------------------------------------------------
// Stagger animation variants
// ---------------------------------------------------------------------------

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.25, ease: 'easeOut' },
  },
};

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------

function TimelineSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3">
          <Skeleton className="h-2.5 w-2.5 rounded-full mt-1 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center gap-2">
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-3.5 w-10" />
            </div>
            <Skeleton className="h-3 w-full max-w-[240px]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="flex items-end gap-2 h-16">
      {DAY_LABELS.map(() => (
        <div key={Math.random()} className="flex-1 flex flex-col items-center gap-1">
          <Skeleton className="w-full h-12 rounded-sm" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ConflictTimelineWidget() {
  const [data, setData] = useState<ConflictResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/conflicts?resolved=false');
      if (!res.ok) throw new Error('Failed to fetch conflicts');
      const json = await res.json();
      setData(json as ConflictResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial fetch + auto-refresh
  useEffect(() => {
    fetchData();

    const interval = setInterval(() => {
      fetchData(true);
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [fetchData]);

  // Take top 5 recent conflicts
  const recentConflicts = useMemo(() => {
    if (!data?.conflicts) return [];
    return [...data.conflicts]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, MAX_TIMELINE_ITEMS);
  }, [data]);

  // Count conflicts by day-of-week (Mon=0 ... Sat=5)
  const dayCounts = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0]; // Mon-Sat
    if (!data?.conflicts) return counts;
    for (const c of data.conflicts) {
      const idx = getDayOfWeek(c.createdAt);
      if (idx >= 0 && idx < 6) counts[idx]++;
    }
    return counts;
  }, [data]);

  const maxDayCount = Math.max(...dayCounts, 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <Card className="h-full flex flex-col max-w-lg">
        {/* Header */}
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-sm font-medium">
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Conflict Timeline
            </span>
            <div className="flex items-center gap-2">
              {data && (
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[10px] px-1.5 py-0 h-5',
                    data.unresolved > 0
                      ? 'border-red-500/30 text-red-600 dark:text-red-400'
                      : 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                  )}
                >
                  {data.unresolved} active
                </Badge>
              )}
              <button
                onClick={() => fetchData(true)}
                disabled={refreshing}
                className={cn(
                  'rounded-md p-1 transition-colors',
                  'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  refreshing && 'animate-spin'
                )}
                aria-label="Refresh conflicts"
              >
                <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="pt-0 flex-1 flex flex-col gap-4">
          {/* Error state */}
          {error && (
            <div className="text-center py-4">
              <p className="text-xs text-red-500">{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 text-xs h-7"
                onClick={() => fetchData()}
              >
                Retry
              </Button>
            </div>
          )}

          {/* Loading skeleton */}
          {loading && !data && (
            <>
              <TimelineSkeleton />
              <ChartSkeleton />
            </>
          )}

          {/* Data view */}
          {data && !error && (
            <>
              {/* Timeline list */}
              {recentConflicts.length === 0 ? (
                <div className="text-center py-4">
                  <div className="rounded-full bg-emerald-500/10 w-8 h-8 mx-auto flex items-center justify-center mb-2">
                    <AlertTriangle className="h-4 w-4 text-emerald-500" />
                  </div>
                  <p className="text-xs text-muted-foreground">No active conflicts</p>
                </div>
              ) : (
                <motion.div
                  className="space-y-3 relative"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {/* Vertical timeline line */}
                  <div className="absolute left-[4px] top-2 bottom-2 w-px bg-border" />

                  {recentConflicts.map((conflict) => {
                    const Icon = getConflictIcon(conflict.type);
                    return (
                      <motion.div
                        key={conflict.id}
                        variants={itemVariants}
                        className="flex items-start gap-3 relative"
                      >
                        {/* Timeline dot */}
                        <div
                          className={cn(
                            'h-2.5 w-2.5 rounded-full mt-1 shrink-0 ring-2 ring-background z-10',
                            getSeverityDot(conflict.severity, conflict.resolved)
                          )}
                        />
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <Icon className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="text-[11px] font-medium truncate">
                              {getConflictTypeShort(conflict.type)}
                            </span>
                            <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                              {getRelativeTime(conflict.createdAt)}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-tight line-clamp-2">
                            {conflict.description}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}

              {/* Mini day-of-week chart */}
              <div className="mt-auto pt-3 border-t">
                <p className="text-[10px] text-muted-foreground mb-2 font-medium uppercase tracking-wider">
                  Conflicts by Day
                </p>
                <div className="flex items-end gap-1.5 h-14">
                  {DAY_LABELS.map((label, idx) => {
                    const count = dayCounts[idx];
                    const heightPercent = maxDayCount > 0 ? (count / maxDayCount) * 100 : 0;
                    const barColor =
                      count === 0
                        ? 'bg-muted-foreground/15'
                        : count > maxDayCount * 0.7
                          ? 'bg-red-400'
                          : count > maxDayCount * 0.4
                            ? 'bg-amber-400'
                            : 'bg-emerald-400';

                    return (
                      <div key={label} className="flex-1 flex flex-col items-center gap-1">
                        {count > 0 && (
                          <span className="text-[9px] tabular-nums text-muted-foreground">
                            {count}
                          </span>
                        )}
                        <div className="w-full bg-muted/40 rounded-sm h-10 relative overflow-hidden">
                          <motion.div
                            className={cn('absolute bottom-0 left-0 right-0 rounded-sm', barColor)}
                            initial={{ height: 0 }}
                            animate={{ height: `${heightPercent}%` }}
                            transition={{ duration: 0.5, ease: 'easeOut', delay: idx * 0.05 }}
                          />
                        </div>
                        <span className="text-[9px] text-muted-foreground">{label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
