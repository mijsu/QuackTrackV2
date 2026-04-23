'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Plus,
  RefreshCw,
  Trash2,
  Layers,
  Clock,
  Activity,
  ArrowRight,
  LogIn,
  Sparkles,
  Undo2,
  ShieldCheck,
  CalendarDays,
  Users,
  Monitor,
  AlertTriangle,
} from 'lucide-react';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface AuditLogEntry {
  id: string;
  userId: string | null;
  action: string;
  entity: string | null;
  entityId: string | null;
  details: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
}

type FilterTab = 'all' | 'schedules' | 'faculty' | 'system' | 'conflicts';

// ============================================================================
// ACTION CONFIG
// ============================================================================

interface ActionConfig {
  icon: React.ElementType;
  dotColor: string;
  badgeColor: string;
  badgeBg: string;
  label: string;
}

function getActionConfig(action: string): ActionConfig {
  const upper = action.toUpperCase();
  if (upper.includes('CREATE')) {
    return {
      icon: Plus,
      dotColor: 'bg-emerald-500',
      badgeColor: 'text-emerald-700 dark:text-emerald-400',
      badgeBg: 'bg-emerald-100 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800',
      label: 'CREATE',
    };
  }
  if (upper.includes('UPDATE') || upper.includes('RESOLVE')) {
    return {
      icon: RefreshCw,
      dotColor: 'bg-amber-500',
      badgeColor: 'text-amber-700 dark:text-amber-400',
      badgeBg: 'bg-amber-100 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800',
      label: 'UPDATE',
    };
  }
  if (upper.includes('DELETE')) {
    return {
      icon: Trash2,
      dotColor: 'bg-red-500',
      badgeColor: 'text-red-700 dark:text-red-400',
      badgeBg: 'bg-red-100 dark:bg-red-950/50 border-red-200 dark:border-red-800',
      label: 'DELETE',
    };
  }
  if (upper.includes('LOGIN')) {
    return {
      icon: LogIn,
      dotColor: 'bg-blue-500',
      badgeColor: 'text-blue-700 dark:text-blue-400',
      badgeBg: 'bg-blue-100 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800',
      label: 'LOGIN',
    };
  }
  if (upper.includes('GENERATE') || upper.includes('SPARKLES')) {
    return {
      icon: Sparkles,
      dotColor: 'bg-violet-500',
      badgeColor: 'text-violet-700 dark:text-violet-400',
      badgeBg: 'bg-violet-100 dark:bg-violet-950/50 border-violet-200 dark:border-violet-800',
      label: 'GENERATE',
    };
  }
  if (upper.includes('UNDO')) {
    return {
      icon: Undo2,
      dotColor: 'bg-gray-400',
      badgeColor: 'text-gray-700 dark:text-gray-400',
      badgeBg: 'bg-gray-100 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700',
      label: 'UNDO',
    };
  }
  if (upper.includes('BATCH')) {
    return {
      icon: Layers,
      dotColor: 'bg-violet-500',
      badgeColor: 'text-violet-700 dark:text-violet-400',
      badgeBg: 'bg-violet-100 dark:bg-violet-950/50 border-violet-200 dark:border-violet-800',
      label: 'BATCH',
    };
  }
  return {
    icon: Clock,
    dotColor: 'bg-gray-400',
    badgeColor: 'text-gray-700 dark:text-gray-400',
    badgeBg: 'bg-gray-100 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700',
    label: upper.includes('_') ? upper.split('_')[0] : upper,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    login: 'Login',
    create: 'Created',
    update: 'Updated',
    delete: 'Deleted',
    resolve: 'Resolved',
    resolve_conflict: 'Resolved Conflict',
    batch_update: 'Batch Updated',
    batch_resolve_conflict: 'Batch Resolved',
    undo: 'Undone',
    generate: 'Generated',
  };
  return labels[action] || action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatEntityName(entity: string | null): string {
  if (!entity) return 'an item';
  const names: Record<string, string> = {
    schedule: 'a schedule',
    conflict: 'a conflict',
    user: 'a user',
    faculty: 'a faculty member',
    room: 'a room',
    subject: 'a subject',
    section: 'a section',
    department: 'a department',
    program: 'a program',
    setting: 'system settings',
  };
  return names[entity.toLowerCase()] || `a ${entity}`;
}

function getEntityDetail(details: string | null): string {
  if (!details) return '';
  try {
    const parsed = JSON.parse(details);
    if (parsed.name) return parsed.name;
    if (parsed.description) return parsed.description;
    if (parsed.entityName) return parsed.entityName;
    return '';
  } catch {
    return '';
  }
}

function formatDescription(entry: AuditLogEntry): string {
  const actorName = entry.user?.name || 'System';
  const entityDetail = getEntityDetail(entry.details);
  const action = entry.action.toLowerCase();

  if (action === 'login') {
    return `${actorName} logged in`;
  }

  const entityStr = formatEntityName(entry.entity);
  const detailStr = entityDetail ? ` "${entityDetail}"` : '';
  const actionLabel = getActionLabel(entry.action);

  return `${actorName} ${actionLabel.toLowerCase()} ${entityStr}${detailStr}`;
}

function getEntityIcon(entity: string | null): React.ElementType {
  if (!entity) return Clock;
  const lower = entity.toLowerCase();
  if (lower === 'schedule') return CalendarDays;
  if (lower === 'user' || lower === 'faculty') return Users;
  if (lower === 'room') return Monitor;
  if (lower === 'conflict') return AlertTriangle;
  return Clock;
}

// ============================================================================
// FILTERING LOGIC
// ============================================================================

function matchesFilter(entry: AuditLogEntry, filter: FilterTab): boolean {
  if (filter === 'all') return true;
  const entity = (entry.entity || '').toLowerCase();
  const action = entry.action.toLowerCase();

  switch (filter) {
    case 'schedules':
      return entity === 'schedule' || action.includes('generate');
    case 'faculty':
      return entity === 'user' || entity === 'faculty' || action === 'login';
    case 'system':
      return entity === 'setting' || action === 'login' || action.includes('batch');
    case 'conflicts':
      return entity === 'conflict' || action.includes('conflict') || action.includes('resolve');
    default:
      return true;
  }
}

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    x: 12,
    transition: { duration: 0.15 },
  },
};

// ============================================================================
// SKELETON LOADING
// ============================================================================

function SkeletonRow() {
  return (
    <div className="flex items-start gap-3 px-1 py-2.5">
      <div className="relative flex flex-col items-center">
        <Skeleton className="h-3 w-3 rounded-full shrink-0" />
        <Skeleton className="w-px flex-1 min-h-[32px] mt-1" />
      </div>
      <div className="flex-1 min-w-0 space-y-2 pb-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-16 rounded" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const MAX_ACTIVITIES = 15;

export function RecentActivityFeed() {
  const [activities, setActivities] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const setViewMode = useAppStore((state) => state.setViewMode);

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/audit?limit=15&offset=0');
      if (!res.ok) throw new Error('Failed to fetch activities');
      const data = await res.json();
      setActivities(data.logs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Compute filter counts
  const filterCounts = useMemo(() => {
    const counts: Record<FilterTab, number> = {
      all: activities.length,
      schedules: 0,
      faculty: 0,
      system: 0,
      conflicts: 0,
    };
    activities.forEach((entry) => {
      if (matchesFilter(entry, 'schedules')) counts.schedules++;
      if (matchesFilter(entry, 'faculty')) counts.faculty++;
      if (matchesFilter(entry, 'system')) counts.system++;
      if (matchesFilter(entry, 'conflicts')) counts.conflicts++;
    });
    return counts;
  }, [activities]);

  // Filtered activities (memoized)
  const filteredActivities = useMemo(() => {
    return activities
      .filter((entry) => matchesFilter(entry, activeFilter))
      .slice(0, MAX_ACTIVITIES);
  }, [activities, activeFilter]);

  return (
    <Card className="glass-card-elevated h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4 text-muted-foreground" />
          Recent Activity
        </CardTitle>
        <CardAction>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setViewMode('audit')}
          >
            View All
            <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="px-4 pb-4 flex-1 flex flex-col min-h-0">
        {/* Filter Tabs */}
        <Tabs
          value={activeFilter}
          onValueChange={(v) => setActiveFilter(v as FilterTab)}
          className="w-full"
        >
          <TabsList className="w-full h-auto flex-wrap gap-1 bg-muted/50 p-1">
            <TabsTrigger value="all" className="text-xs px-2.5 py-1.5 data-[state=active]:bg-background">
              All
              {filterCounts.all > 0 && (
                <span className="ml-1 text-[10px] text-muted-foreground font-normal">
                  {filterCounts.all}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="schedules" className="text-xs px-2.5 py-1.5 data-[state=active]:bg-background">
              <CalendarDays className="h-3 w-3 mr-1" />
              Schedules
              {filterCounts.schedules > 0 && (
                <span className="ml-1 text-[10px] text-muted-foreground font-normal">
                  {filterCounts.schedules}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="faculty" className="text-xs px-2.5 py-1.5 data-[state=active]:bg-background">
              <Users className="h-3 w-3 mr-1" />
              Faculty
              {filterCounts.faculty > 0 && (
                <span className="ml-1 text-[10px] text-muted-foreground font-normal">
                  {filterCounts.faculty}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="system" className="text-xs px-2.5 py-1.5 data-[state=active]:bg-background">
              <Monitor className="h-3 w-3 mr-1" />
              System
              {filterCounts.system > 0 && (
                <span className="ml-1 text-[10px] text-muted-foreground font-normal">
                  {filterCounts.system}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="conflicts" className="text-xs px-2.5 py-1.5 data-[state=active]:bg-background">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Conflicts
              {filterCounts.conflicts > 0 && (
                <span className="ml-1 text-[10px] text-muted-foreground font-normal">
                  {filterCounts.conflicts}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Activity List */}
        <div className="mt-3 flex-1 min-h-0">
          <div className="max-h-80 overflow-y-auto pr-1 custom-scrollbar">
            {loading ? (
              <div className="space-y-0">
                {Array.from({ length: 3 }).map((_, i) => (
                  <SkeletonRow key={i} />
                ))}
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-destructive/10 p-3 mb-3">
                  <AlertTriangle className="h-6 w-6 text-destructive/60" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Unable to load activity</p>
                <p className="text-xs text-muted-foreground/60 mt-1">{error}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-3 text-xs"
                  onClick={fetchActivities}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Try again
                </Button>
              </div>
            ) : filteredActivities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-muted/80 p-3 mb-3">
                  <Clock className="h-6 w-6 text-muted-foreground/50" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">No recent activity</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  {activeFilter !== 'all'
                    ? `No ${activeFilter} activity found`
                    : 'Activity will appear here as changes are made'}
                </p>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeFilter}
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  className="relative pl-5"
                >
                  {/* Timeline vertical line */}
                  <div className="absolute left-[5px] top-2 bottom-2 w-px bg-border" />

                  {filteredActivities.map((entry, index) => {
                    const config = getActionConfig(entry.action);
                    const EntityIcon = getEntityIcon(entry.entity);
                    const isLast = index === filteredActivities.length - 1;

                    return (
                      <motion.div
                        key={entry.id}
                        variants={itemVariants}
                        layout
                        className="relative"
                      >
                        {/* Timeline dot */}
                        <div
                          className={cn(
                            'absolute -left-5 top-3 h-[10px] w-[10px] rounded-full border-2 border-background z-10',
                            config.dotColor
                          )}
                        />

                        {/* Content card */}
                        <div
                          className={cn(
                            'group ml-2 rounded-lg px-3 py-2.5 transition-all duration-200',
                            'hover:bg-muted/60 hover:translate-x-0.5 cursor-default',
                            !isLast && 'mb-1'
                          )}
                        >
                          {/* Top row: badge + description */}
                          <div className="flex items-start gap-2">
                            <Badge
                              variant="outline"
                              className={cn(
                                'shrink-0 text-[10px] font-semibold px-1.5 py-0 h-5 leading-5 border',
                                config.badgeBg,
                                config.badgeColor
                              )}
                            >
                              {config.label}
                            </Badge>
                            <p className="text-sm leading-snug text-foreground/90 flex-1 min-w-0">
                              {formatDescription(entry)}
                            </p>
                          </div>

                          {/* Bottom row: user + entity + time */}
                          <div className="flex items-center gap-2 mt-1.5 ml-0">
                            {/* User */}
                            {entry.user && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground/70 truncate max-w-[120px]">
                                <Users className="h-3 w-3 shrink-0" />
                                <span className="truncate">{entry.user.name}</span>
                              </span>
                            )}

                            {/* Entity */}
                            {entry.entity && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground/50 truncate">
                                <EntityIcon className="h-3 w-3 shrink-0" />
                                <span className="capitalize truncate">{entry.entity}</span>
                              </span>
                            )}

                            {/* Time */}
                            <span className="ml-auto text-xs text-muted-foreground/50 shrink-0">
                              {formatDistanceToNow(new Date(entry.createdAt), {
                                addSuffix: true,
                              })}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* View All button */}
        {!loading && activities.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setViewMode('audit')}
            >
              View All Activity
              <ArrowRight className="ml-1.5 h-3 w-3" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
