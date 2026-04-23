'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Zap,
  Settings,
  ArrowRight,
  CalendarCheck,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  History,
  MinusCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store';
import type { DashboardStats } from '@/types';

// ============================================================================
// TYPES
// ============================================================================

interface GenerationSummary {
  totalSchedules: number;
  totalConflicts: number;
}

interface GenerationEvent {
  id: string;
  status: string;
  createdAt: string;
  assignedCount?: number;
  totalTasks?: number;
  elapsedTimeMs?: number;
  error?: string | null;
  stats?: string | null;
}

// ============================================================================
// HELPERS
// ============================================================================

function formatTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const min = Math.floor(ms / 60000);
  const sec = Math.round((ms % 60000) / 1000);
  return `${min}m ${sec}s`;
}

function parseStatsJson(statsStr: string | null): { generated?: number; scheduleCount?: number } | null {
  if (!statsStr) return null;
  try {
    return JSON.parse(statsStr);
  } catch {
    return null;
  }
}

// ============================================================================
// SKELETON
// ============================================================================

function PanelSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-4 w-32" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-9 flex-1 rounded-md" />
        <Skeleton className="h-9 w-24 rounded-md" />
      </div>
    </div>
  );
}

function HistorySkeleton() {
  return (
    <div className="space-y-2 pt-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-3 flex-1" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export function QuickGenPanel() {
  const [summary, setSummary] = useState<GenerationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastGenerated, setLastGenerated] = useState<string | null>(null);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [generationHistory, setGenerationHistory] = useState<GenerationEvent[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const setViewMode = useAppStore((state) => state.setViewMode);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/stats');
      if (!res.ok) throw new Error('Failed to fetch stats');
      const data: DashboardStats = await res.json();

      setSummary({
        totalSchedules: data.totalSchedules || 0,
        totalConflicts: data.totalConflicts || 0,
      });

      // Derive last generation time from recent schedules
      if (data.recentSchedules && data.recentSchedules.length > 0) {
        const latest = data.recentSchedules[0];
        setLastGenerated(
          new Date(latest.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })
        );
      }
    } catch {
      // Silently fail — widget still shows actionable buttons
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      // Fetch from generation sessions and audit logs in parallel
      const [sessionsRes, auditRes] = await Promise.all([
        fetch('/api/generation-sessions?limit=5'),
        fetch('/api/audit?action=generate_schedules&limit=5'),
      ]);

      const events: GenerationEvent[] = [];

      // Process generation sessions
      if (sessionsRes.ok) {
        const sessions = await sessionsRes.json();
        for (const session of sessions) {
          const stats = parseStatsJson(session.stats);
          events.push({
            id: session.id,
            status: session.status,
            createdAt: session.startedAt,
            assignedCount: session.assignedCount ?? stats?.generated ?? stats?.scheduleCount,
            totalTasks: session.totalTasks,
            elapsedTimeMs: session.elapsedTimeMs,
            error: session.error,
            stats: session.stats,
          });
        }
      }

      // Process audit logs for generate actions
      if (auditRes.ok) {
        const auditData = await auditRes.json();
        if (auditData.logs) {
          for (const log of auditData.logs) {
            // Only add if not already captured from sessions
            const alreadyExists = events.some(
              (e) => new Date(e.createdAt).getTime() === new Date(log.createdAt).getTime()
            );
            if (!alreadyExists) {
              let details: { generated?: number; scheduleCount?: number } = {};
              try {
                details = log.details ? JSON.parse(log.details) : {};
              } catch {
                // ignore
              }
              events.push({
                id: log.id,
                status: 'completed',
                createdAt: log.createdAt,
                assignedCount: details.generated ?? details.scheduleCount,
                error: null,
                stats: log.details,
              });
            }
          }
        }
      }

      // Sort by date descending and take top 5
      events.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setGenerationHistory(events.slice(0, 5));
    } catch {
      // Silently fail
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const toggleHistory = () => {
    if (!historyExpanded && generationHistory.length === 0) {
      fetchHistory();
    }
    setHistoryExpanded(!historyExpanded);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
      case 'failed':
        return <XCircle className="h-3.5 w-3.5 text-red-500" />;
      case 'running':
        return <History className="h-3.5 w-3.5 text-amber-500 animate-spin" />;
      case 'cancelled':
        return <MinusCircle className="h-3.5 w-3.5 text-muted-foreground" />;
      default:
        return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
            Success
          </span>
        );
      case 'failed':
        return (
          <span className="text-[10px] font-medium text-red-600 dark:text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">
            Failed
          </span>
        );
      case 'running':
        return (
          <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
            Running
          </span>
        );
      case 'cancelled':
        return (
          <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25 }}
    >
      <Card className="card-hover h-full flex flex-col overflow-hidden" data-tour="quick-gen-panel">
        {/* Emerald gradient top accent */}
        <div className="h-1 bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 dark:from-emerald-600 dark:via-emerald-500 dark:to-teal-500" />

        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4 text-emerald-500" />
            Quick Generation
          </CardTitle>
          <CardDescription className="text-xs">
            Generate or review schedules
          </CardDescription>
        </CardHeader>

        <CardContent className="px-4 pb-4 flex-1">
          {loading ? (
            <PanelSkeleton />
          ) : (
            <div className="space-y-4">
              {/* Summary stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-center">
                  <CalendarCheck className="h-5 w-5 mx-auto mb-1 text-emerald-500" />
                  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    {summary?.totalSchedules ?? 0}
                  </p>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    Schedules Generated
                  </p>
                </div>
                <div
                  className={`rounded-lg border p-3 text-center ${
                    (summary?.totalConflicts ?? 0) > 0
                      ? 'bg-amber-500/10 border-amber-500/20'
                      : 'bg-emerald-500/10 border-emerald-500/20'
                  }`}
                >
                  <AlertTriangle
                    className={`h-5 w-5 mx-auto mb-1 ${
                      (summary?.totalConflicts ?? 0) > 0
                        ? 'text-amber-500'
                        : 'text-emerald-500'
                    }`}
                  />
                  <p
                    className={`text-xl font-bold ${
                      (summary?.totalConflicts ?? 0) > 0
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {summary?.totalConflicts ?? 0}
                  </p>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    Conflicts Detected
                  </p>
                </div>
              </div>

              {/* Last generation info */}
              {lastGenerated && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3 shrink-0" />
                  <span>Last generated: {lastGenerated}</span>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                  size="sm"
                  onClick={() => setViewMode('dashboard')}
                >
                  <Zap className="h-4 w-4 mr-1.5" />
                  Generate Schedule
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode('settings')}
                  className="shrink-0"
                >
                  <Settings className="h-4 w-4 mr-1.5" />
                  Configure
                </Button>
              </div>

              {/* Generation History - Expandable */}
              <div className="border-t border-border pt-3">
                <button
                  onClick={toggleHistory}
                  className="w-full flex items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <History className="h-3 w-3" />
                    Generation History
                    {generationHistory.length > 0 && (
                      <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full">
                        {generationHistory.length}
                      </span>
                    )}
                  </span>
                  <motion.div
                    animate={{ rotate: historyExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="h-3 w-3" />
                  </motion.div>
                </button>

                <AnimatePresence>
                  {historyExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      {historyLoading ? (
                        <HistorySkeleton />
                      ) : generationHistory.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground py-2 text-center">
                          No generation history yet
                        </p>
                      ) : (
                        <div className="space-y-1.5 pt-2">
                          {generationHistory.map((event) => (
                            <div
                              key={event.id}
                              className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors"
                            >
                              {getStatusIcon(event.status)}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  {getStatusLabel(event.status)}
                                  {event.assignedCount != null && (
                                    <span className="text-[10px] text-muted-foreground">
                                      {event.assignedCount} schedule{event.assignedCount !== 1 ? 's' : ''}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-muted-foreground truncate">
                                  {event.error
                                    ? event.error.length > 60
                                      ? event.error.substring(0, 60) + '...'
                                      : event.error
                                    : formatTimeAgo(event.createdAt)}
                                </p>
                              </div>
                              {event.elapsedTimeMs != null && event.elapsedTimeMs > 0 && (
                                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                  {formatDuration(event.elapsedTimeMs)}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Generation reports link */}
              <Button
                variant="link"
                size="sm"
                className="w-full text-xs text-muted-foreground hover:text-foreground p-0 h-auto"
                onClick={() => setViewMode('reports')}
              >
                View Full Reports
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
