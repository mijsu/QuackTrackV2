'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GitCompareArrows,
  Plus,
  Minus,
  Pencil,
  Equal,
  ArrowRight,
  Loader2,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  CalendarDays,
  Clock,
  User,
  MapPin,
  BookOpen,
  ArrowLeftRight,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VersionListItem {
  id: string;
  versionName: string;
  description?: string | null;
  semester: string;
  academicYear: string;
  generatedAt: string;
  scheduleCount: number;
  isActive: boolean;
  isArchived: boolean;
  _count?: { snapshots: number };
}

interface DiffChange {
  field: string;
  oldValue: string | null;
  newValue: string | null;
}

interface DiffEntry {
  status: 'added' | 'removed' | 'modified' | 'unchanged';
  snapshot: {
    id: string;
    subjectCode: string;
    subjectName: string;
    facultyName: string;
    sectionName: string;
    roomName: string;
    day: string;
    startTime: string;
    endTime: string;
    status: string;
    score?: number | null;
  };
  previousSnapshot?: {
    id: string;
    subjectCode: string;
    subjectName: string;
    facultyName: string;
    sectionName: string;
    roomName: string;
    day: string;
    startTime: string;
    endTime: string;
    status: string;
    score?: number | null;
  } | null;
  key: string;
  changes?: DiffChange[];
}

interface CompareSummary {
  totalChanges: number;
  added: number;
  removed: number;
  modified: number;
  unchanged: number;
  totalV1: number;
  totalV2: number;
}

interface VersionInfo {
  id: string;
  versionName: string;
  description?: string | null;
  semester: string;
  academicYear: string;
  generatedAt: string;
  scheduleCount: number;
  isActive: boolean;
  stats: Record<string, unknown>;
}

interface CompareResult {
  version1: VersionInfo;
  version2: VersionInfo;
  diffs: DiffEntry[];
  summary: CompareSummary;
}

// ---------------------------------------------------------------------------
// Status config
// ---------------------------------------------------------------------------

const STATUS_CONFIG = {
  added: {
    label: 'Added',
    icon: Plus,
    bgClass: 'bg-emerald-50 dark:bg-emerald-950/30',
    borderClass: 'border-l-emerald-500',
    textClass: 'text-emerald-700 dark:text-emerald-400',
    badgeClass: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    rowClass: 'bg-emerald-50/50 dark:bg-emerald-950/10 hover:bg-emerald-50 dark:hover:bg-emerald-950/20',
    dotClass: 'bg-emerald-500',
  },
  removed: {
    label: 'Removed',
    icon: Minus,
    bgClass: 'bg-red-50 dark:bg-red-950/30',
    borderClass: 'border-l-red-500',
    textClass: 'text-red-700 dark:text-red-400',
    badgeClass: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
    rowClass: 'bg-red-50/50 dark:bg-red-950/10 hover:bg-red-50 dark:hover:bg-red-950/20',
    dotClass: 'bg-red-500',
  },
  modified: {
    label: 'Modified',
    icon: Pencil,
    bgClass: 'bg-amber-50 dark:bg-amber-950/30',
    borderClass: 'border-l-amber-500',
    textClass: 'text-amber-700 dark:text-amber-400',
    badgeClass: 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    rowClass: 'bg-amber-50/50 dark:bg-amber-950/10 hover:bg-amber-50 dark:hover:bg-amber-950/20',
    dotClass: 'bg-amber-500',
  },
  unchanged: {
    label: 'Unchanged',
    icon: Equal,
    bgClass: '',
    borderClass: 'border-l-muted-foreground/30',
    textClass: 'text-muted-foreground',
    badgeClass: 'bg-muted text-muted-foreground border-border',
    rowClass: 'hover:bg-muted/30',
    dotClass: 'bg-muted-foreground/40',
  },
} as const;

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function formatTime(time: string): string {
  const [h, m] = time.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:${m} ${ampm}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function DiffIndicatorBar({ summary }: { summary: CompareSummary }) {
  const total = summary.totalV1 + summary.totalV2;
  if (total === 0) return null;

  const addedPct = (summary.added / total) * 100;
  const removedPct = (summary.removed / total) * 100;
  const modifiedPct = (summary.modified / total) * 100;
  const unchangedPct = Math.max(0, 100 - addedPct - removedPct - modifiedPct);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Change Distribution</span>
        <span>{summary.totalChanges} change{summary.totalChanges !== 1 ? 's' : ''} detected</span>
      </div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
        {addedPct > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${addedPct}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="bg-emerald-500 min-w-[2px]"
              />
            </TooltipTrigger>
            <TooltipContent>
              <p>Added: {summary.added} ({addedPct.toFixed(1)}%)</p>
            </TooltipContent>
          </Tooltip>
        )}
        {removedPct > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${removedPct}%` }}
                transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
                className="bg-red-500 min-w-[2px]"
              />
            </TooltipTrigger>
            <TooltipContent>
              <p>Removed: {summary.removed} ({removedPct.toFixed(1)}%)</p>
            </TooltipContent>
          </Tooltip>
        )}
        {modifiedPct > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${modifiedPct}%` }}
                transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
                className="bg-amber-500 min-w-[2px]"
              />
            </TooltipTrigger>
            <TooltipContent>
              <p>Modified: {summary.modified} ({modifiedPct.toFixed(1)}%)</p>
            </TooltipContent>
          </Tooltip>
        )}
        {unchangedPct > 0 && (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${unchangedPct}%` }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.3 }}
            className="bg-muted-foreground/20 min-w-[2px]"
          />
        )}
      </div>
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Added ({summary.added})
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-red-500" />
          Removed ({summary.removed})
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          Modified ({summary.modified})
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
          Unchanged ({summary.unchanged})
        </span>
      </div>
    </div>
  );
}

function SummaryCards({ summary }: { summary: CompareSummary }) {
  const cards = [
    {
      label: 'Total Changes',
      value: summary.totalChanges,
      icon: ArrowLeftRight,
      gradient: 'from-emerald-500 to-teal-500',
      bgLight: 'bg-emerald-50 dark:bg-emerald-950/30',
    },
    {
      label: 'Added',
      value: summary.added,
      icon: TrendingUp,
      gradient: 'from-emerald-400 to-emerald-600',
      bgLight: 'bg-emerald-50 dark:bg-emerald-950/30',
    },
    {
      label: 'Removed',
      value: summary.removed,
      icon: TrendingDown,
      gradient: 'from-red-400 to-red-600',
      bgLight: 'bg-red-50 dark:bg-red-950/30',
    },
    {
      label: 'Modified',
      value: summary.modified,
      icon: Pencil,
      gradient: 'from-amber-400 to-amber-600',
      bgLight: 'bg-amber-50 dark:bg-amber-950/30',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className={cn('overflow-hidden border-0 shadow-sm', card.bgLight)}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
                  <p className="text-2xl font-bold mt-1">{card.value}</p>
                </div>
                <div className={cn('flex items-center justify-center h-10 w-10 rounded-lg bg-gradient-to-br text-white', card.gradient)}>
                  <card.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

function ChangeHighlight({ changes }: { changes?: DiffChange[] }) {
  if (!changes || changes.length === 0) return null;

  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {changes.map((change, idx) => (
        <span
          key={idx}
          className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-100/80 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
        >
          <span className="font-medium">{change.field}:</span>
          <span className="line-through decoration-red-400/60">{change.oldValue}</span>
          <ArrowRight className="h-2.5 w-2.5" />
          <span className="font-medium">{change.newValue}</span>
        </span>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: DiffEntry['status'] }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn('gap-1 text-[10px] px-2 py-0.5 font-medium border', config.badgeClass)}
    >
      <Icon className="h-2.5 w-2.5" />
      {config.label}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

interface ScheduleVersionCompareProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ScheduleVersionCompare({ open, onOpenChange }: ScheduleVersionCompareProps) {
  const [versions, setVersions] = useState<VersionListItem[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [selectedV1, setSelectedV1] = useState<string>('');
  const [selectedV2, setSelectedV2] = useState<string>('');
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null);
  const [comparing, setComparing] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'added' | 'removed' | 'modified' | 'unchanged'>('all');
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<{ id: string; name: string } | null>(null);

  // Fetch versions list
  const fetchVersions = useCallback(async () => {
    setLoadingVersions(true);
    try {
      const res = await fetch('/api/schedule-versions');
      if (res.ok) {
        const data = await res.json();
        setVersions(Array.isArray(data) ? data : []);
      } else {
        toast.error('Failed to load versions');
      }
    } catch {
      toast.error('Failed to load versions');
    } finally {
      setLoadingVersions(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchVersions();
      // Reset state when dialog opens
      setCompareResult(null);
      setSelectedV1('');
      setSelectedV2('');
      setFilterStatus('all');
    }
  }, [open, fetchVersions]);

  // Compare two versions
  const handleCompare = useCallback(async () => {
    if (!selectedV1 || !selectedV2) {
      toast.error('Please select two versions to compare');
      return;
    }
    if (selectedV1 === selectedV2) {
      toast.error('Please select two different versions');
      return;
    }

    setComparing(true);
    try {
      const res = await fetch(
        `/api/schedule-versions/compare?versionId1=${selectedV1}&versionId2=${selectedV2}`
      );
      if (res.ok) {
        const data = await res.json();
        setCompareResult(data);
        setFilterStatus('all');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to compare versions');
      }
    } catch {
      toast.error('Failed to compare versions');
    } finally {
      setComparing(false);
    }
  }, [selectedV1, selectedV2]);

  // Restore a version
  const handleRestore = useCallback(async (versionId: string, versionName: string) => {
    setRestoring(versionId);
    try {
      const res = await fetch(`/api/schedule-versions/${versionId}/restore`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Restored "${versionName}" — ${data.restoredCount} schedules recovered`);
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to restore version');
      }
    } catch {
      toast.error('Failed to restore version');
    } finally {
      setRestoring(null);
    }
  }, []);

  // Filtered diffs
  const filteredDiffs = useMemo(() => {
    if (!compareResult) return [];
    if (filterStatus === 'all') return compareResult.diffs;
    return compareResult.diffs.filter((d) => d.status === filterStatus);
  }, [compareResult, filterStatus]);

  // Available options for V2 (exclude V1 selection)
  const v2Options = useMemo(() => {
    return versions.filter((v) => v.id !== selectedV1);
  }, [versions, selectedV1]);

  const v1Options = useMemo(() => {
    return versions.filter((v) => v.id !== selectedV2);
  }, [versions, selectedV2]);

  return (
    <div className="flex flex-col h-full">
      {/* ===== Header ===== */}
      <div className="flex-shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20">
            <GitCompareArrows className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-600">
              Compare Versions
            </h2>
            <p className="text-xs text-muted-foreground">
              Select two schedule versions to see what changed
            </p>
          </div>
        </div>

        {/* ===== Version Selectors ===== */}
        <Card className="border-emerald-200/50 dark:border-emerald-800/30 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-end gap-3">
              <div className="flex-1 w-full space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5 text-emerald-500" />
                  Version A (Base)
                </label>
                <Select value={selectedV1} onValueChange={setSelectedV1}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select base version..." />
                  </SelectTrigger>
                  <SelectContent>
                    {v1Options.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        <span className="flex items-center gap-2">
                          {v.versionName}
                          {v.isActive && (
                            <Badge className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-[9px] px-1 py-0 border-emerald-200 dark:border-emerald-800">
                              Active
                            </Badge>
                          )}
                          <span className="text-muted-foreground text-xs">
                            ({v.scheduleCount} schedules)
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-center py-1">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
                  <ArrowLeftRight className="h-4 w-4" />
                </div>
              </div>

              <div className="flex-1 w-full space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-teal-500" />
                  Version B (Compare)
                </label>
                <Select value={selectedV2} onValueChange={setSelectedV2}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select version to compare..." />
                  </SelectTrigger>
                  <SelectContent>
                    {v2Options.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        <span className="flex items-center gap-2">
                          {v.versionName}
                          {v.isActive && (
                            <Badge className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-[9px] px-1 py-0 border-emerald-200 dark:border-emerald-800">
                              Active
                            </Badge>
                          )}
                          <span className="text-muted-foreground text-xs">
                            ({v.scheduleCount} schedules)
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleCompare}
                disabled={!selectedV1 || !selectedV2 || comparing}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-md hover:shadow-lg transition-all duration-200 w-full sm:w-auto"
              >
                {comparing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Comparing...
                  </>
                ) : (
                  <>
                    <GitCompareArrows className="mr-2 h-4 w-4" />
                    Compare
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ===== Results ===== */}
      <div className="flex-1 min-h-0 mt-4">
        <AnimatePresence mode="wait">
          {compareResult ? (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {/* Version info cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Card className="border-emerald-200/50 dark:border-emerald-800/30">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white text-xs font-bold">
                          A
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{compareResult.version1.versionName}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {formatDate(compareResult.version1.generatedAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {compareResult.version1.scheduleCount} schedules
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs hover:border-emerald-500/50 hover:text-emerald-600"
                          onClick={() => {
                            setRestoreTarget({ id: compareResult.version1.id, name: compareResult.version1.versionName });
                            setShowRestoreConfirm(true);
                          }}
                          disabled={restoring === compareResult.version1.id}
                        >
                          {restoring === compareResult.version1.id ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          ) : (
                            <RotateCcw className="h-3 w-3 mr-1" />
                          )}
                          Restore
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-teal-200/50 dark:border-teal-800/30">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold">
                          B
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{compareResult.version2.versionName}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {formatDate(compareResult.version2.generatedAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {compareResult.version2.scheduleCount} schedules
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs hover:border-teal-500/50 hover:text-teal-600"
                          onClick={() => {
                            setRestoreTarget({ id: compareResult.version2.id, name: compareResult.version2.versionName });
                            setShowRestoreConfirm(true);
                          }}
                          disabled={restoring === compareResult.version2.id}
                        >
                          {restoring === compareResult.version2.id ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          ) : (
                            <RotateCcw className="h-3 w-3 mr-1" />
                          )}
                          Restore
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Diff indicator bar */}
              <Card className="border-0 shadow-sm bg-gradient-to-r from-emerald-50/80 to-teal-50/80 dark:from-emerald-950/20 dark:to-teal-950/20">
                <CardContent className="p-4">
                  <DiffIndicatorBar summary={compareResult.summary} />
                </CardContent>
              </Card>

              {/* Summary cards */}
              <SummaryCards summary={compareResult.summary} />

              {/* Filter tabs */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {(['all', 'added', 'removed', 'modified', 'unchanged'] as const).map((status) => {
                  const count =
                    status === 'all'
                      ? compareResult.diffs.length
                      : compareResult.diffs.filter((d) => d.status === status).length;
                  const config = status !== 'all' ? STATUS_CONFIG[status] : null;

                  return (
                    <button
                      key={status}
                      onClick={() => setFilterStatus(status)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200',
                        filterStatus === status
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm'
                          : 'bg-background border border-border text-muted-foreground hover:bg-muted'
                      )}
                    >
                      {config && <config.icon className="h-3 w-3" />}
                      <span className="capitalize">{status}</span>
                      <span
                        className={cn(
                          'text-[10px] px-1.5 py-0 rounded-full',
                          filterStatus === status
                            ? 'bg-white/25 text-white'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <Separator />

              {/* Diff table */}
              {filteredDiffs.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-12 flex flex-col items-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                    <p className="text-sm font-medium">No differences found</p>
                    <p className="text-xs">The selected versions are identical</p>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-0 shadow-sm overflow-hidden">
                  <ScrollArea className="max-h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 hover:from-emerald-50 hover:to-teal-50 dark:hover:from-emerald-950/30 dark:hover:to-teal-950/30">
                          <TableHead className="w-[40px]">Status</TableHead>
                          <TableHead>
                            <span className="flex items-center gap-1">
                              <BookOpen className="h-3.5 w-3.5 text-emerald-500" />
                              Subject
                            </span>
                          </TableHead>
                          <TableHead>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5 text-teal-500" />
                              Room
                            </span>
                          </TableHead>
                          <TableHead>
                            <span className="flex items-center gap-1">
                              <User className="h-3.5 w-3.5 text-emerald-500" />
                              Faculty
                            </span>
                          </TableHead>
                          <TableHead>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5 text-amber-500" />
                              Time
                            </span>
                          </TableHead>
                          <TableHead>
                            <span className="flex items-center gap-1">
                              <CalendarDays className="h-3.5 w-3.5 text-teal-500" />
                              Day
                            </span>
                          </TableHead>
                          <TableHead>Changes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredDiffs.map((diff, idx) => {
                          const config = STATUS_CONFIG[diff.status];
                          const s = diff.snapshot;

                          return (
                            <motion.tr
                              key={`${diff.key}-${idx}`}
                              initial={{ opacity: 0, x: -5 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.2, delay: idx * 0.02 }}
                              className={cn(
                                'border-b border-l-4 transition-colors',
                                config.borderClass,
                                config.rowClass
                              )}
                            >
                              <TableCell>
                                <StatusBadge status={diff.status} />
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span className={cn('h-6 w-1 rounded-full', config.dotClass)} />
                                  <div>
                                    <p className="font-medium text-xs">{s.subjectCode}</p>
                                    <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                                      {s.subjectName}
                                    </p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'text-[10px]',
                                    diff.status === 'modified' && diff.changes?.some(c => c.field === 'Room')
                                      ? 'bg-amber-100/50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700'
                                      : 'bg-teal-50 dark:bg-teal-950/30 border-teal-200 dark:border-teal-800'
                                  )}
                                >
                                  {s.roomName}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs">{s.facultyName}</TableCell>
                              <TableCell>
                                <span
                                  className={cn(
                                    'text-xs',
                                    diff.status === 'modified' &&
                                      (diff.changes?.some(c => c.field === 'Start Time' || c.field === 'End Time'))
                                      ? 'text-amber-600 dark:text-amber-400 font-medium'
                                      : ''
                                  )}
                                >
                                  {formatTime(s.startTime)} - {formatTime(s.endTime)}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span
                                  className={cn(
                                    'text-xs',
                                    diff.status === 'modified' && diff.changes?.some(c => c.field === 'Day')
                                      ? 'text-amber-600 dark:text-amber-400 font-medium'
                                      : ''
                                  )}
                                >
                                  {s.day}
                                </span>
                              </TableCell>
                              <TableCell>
                                <ChangeHighlight changes={diff.changes} />
                              </TableCell>
                            </motion.tr>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </Card>
              )}
            </motion.div>
          ) : loadingVersions ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-16 text-muted-foreground"
            >
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mb-3" />
              <p className="text-sm">Loading versions...</p>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-16 text-muted-foreground"
            >
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 flex items-center justify-center mb-4">
                <GitCompareArrows className="h-8 w-8 text-emerald-500" />
              </div>
              <p className="text-sm font-medium">Select two versions to compare</p>
              <p className="text-xs mt-1">
                Choose a base version and a comparison version above
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={showRestoreConfirm} onOpenChange={setShowRestoreConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Schedule Version?</AlertDialogTitle>
            <AlertDialogDescription>
              This will overwrite the current schedule with version
              &ldquo;{restoreTarget?.name}&rdquo;. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (restoreTarget) {
                  handleRestore(restoreTarget.id, restoreTarget.name);
                }
                setShowRestoreConfirm(false);
              }}
            >
              Restore Version
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
