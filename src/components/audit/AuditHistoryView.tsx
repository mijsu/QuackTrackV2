'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
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
import { 
  History, Undo2, User, Calendar as CalendarIcon, Clock, Filter, Loader2,
  AlertCircle, CheckCircle, ArrowRight, RefreshCw, Search, Download,
  Activity, Zap, ChevronDown, ChevronRight, X,
  CalendarDays, FileText, Settings,
  ArrowUpRight, ArrowDownRight, Info, Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  entity: string | null;
  entityId: string | null;
  details: string;
  previousState: string;
  newState: string;
  canUndo: boolean;
  undone: boolean;
  undoneBy: string | null;
  undoneAt: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
}

interface AuditLogsResponse {
  logs: AuditLog[];
  total: number;
  hasMore: boolean;
  stats?: {
    totalActions: number;
    createCount: number;
    updateCount: number;
    deleteCount: number;
    undoCount: number;
    todayCount: number;
    weekCount: number;
    topUsers: Array<{ name: string; count: number }>;
    entityBreakdown: Record<string, number>;
    hourlyDistribution: number[];
  };
}

const ACTION_LABELS: Record<string, string> = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
  resolve_conflict: 'Resolved Conflict',
  batch_resolve_conflict: 'Batch Resolved',
  undo: 'Undone',
  batch_update: 'Batch Updated',
  login: 'Login',
  logout: 'Logout',
  generate_schedules: 'Generated Schedules',
};

const ACTION_COLORS: Record<string, { bg: string; text: string; border: string; icon: typeof ArrowUpRight }> = {
  create: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/20', icon: ArrowUpRight },
  update: { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/20', icon: Settings },
  delete: { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/20', icon: ArrowDownRight },
  resolve_conflict: { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/20', icon: CheckCircle },
  batch_resolve_conflict: { bg: 'bg-purple-500/10', text: 'text-purple-500', border: 'border-purple-500/20', icon: Layers },
  undo: { bg: 'bg-gray-500/10', text: 'text-gray-500', border: 'border-gray-500/20', icon: Undo2 },
  batch_update: { bg: 'bg-cyan-500/10', text: 'text-cyan-500', border: 'border-cyan-500/20', icon: Settings },
  login: { bg: 'bg-green-500/10', text: 'text-green-500', border: 'border-green-500/20', icon: ArrowUpRight },
  logout: { bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500/20', icon: ArrowDownRight },
  generate_schedules: { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/20', icon: CalendarIcon },
};

const ENTITY_LABELS: Record<string, string> = {
  schedule: 'Schedule',
  conflict: 'Conflict',
  user: 'User',
  subject: 'Subject',
  room: 'Room',
  section: 'Section',
  facultyPreference: 'Faculty Preference',
  systemSetting: 'System Setting',
};
const ENTITY_ICONS: Record<string, typeof CalendarIcon> = {
  schedule: CalendarIcon,
  conflict: AlertCircle,
  user: User,
  subject: FileText,
  room: Settings,
  section: User,
  facultyPreference: Settings,
  systemSetting: Settings,
};

// Format details based on action type
const formatDetails = (log: AuditLog): { summary: string; details: { label: string; value: string | number }[] } | null => {
  if (!log.details) return null;
  
  try {
    const data = JSON.parse(log.details);
    const details: { label: string; value: string | number }[] = [];
    let summary = '';
    
    // Handle generate_schedules action
    if (log.action === 'generate_schedules') {
      summary = `Generated ${data.generated || 0} schedules`;
      if (data.generated !== undefined) {
        details.push({ label: 'Generated', value: data.generated });
      }
      if (data.unassigned !== undefined) {
        details.push({ label: 'Unassigned', value: data.unassigned });
      }
      if (data.violations !== undefined) {
        details.push({ label: 'Violations', value: data.violations });
      }
      if (data.savedConflicts !== undefined) {
        details.push({ label: 'Saved Conflicts', value: data.savedConflicts });
      }
      if (data.preferenceMatchRate !== undefined) {
        details.push({ label: 'Preference Match', value: `${(data.preferenceMatchRate * 100).toFixed(0)}%` });
      }
      if (data.assignmentRate !== undefined) {
        details.push({ label: 'Assignment Rate', value: `${(data.assignmentRate * 100).toFixed(1)}%` });
      }
      if (data.generationTimeMs !== undefined) {
        details.push({ label: 'Duration', value: `${(data.generationTimeMs / 1000).toFixed(1)}s` });
      }
      return { summary, details };
    }
    
    // Handle login action
    if (log.action === 'login') {
      summary = 'User logged into the system';
      if (log.user?.name) {
        details.push({ label: 'User', value: log.user.name });
      }
      if (log.user?.role) {
        details.push({ label: 'Role', value: log.user.role });
      }
      return { summary, details };
    }
    
    // Handle logout action
    if (log.action === 'logout') {
      summary = 'User logged out';
      if (log.user?.name) {
        details.push({ label: 'User', value: log.user.name });
      }
      return { summary, details };
    }
    
    // Handle create/update/delete with entity data
    if (data.name) {
      summary = data.name;
    }
    if (data.subjectCode) {
      details.push({ label: 'Code', value: data.subjectCode });
    }
    if (data.subjectName) {
      details.push({ label: 'Subject', value: data.subjectName });
    }
    if (data.roomName) {
      details.push({ label: 'Room', value: data.roomName });
    }
    if (data.sectionName) {
      details.push({ label: 'Section', value: data.sectionName });
    }
    if (data.status) {
      details.push({ label: 'Status', value: data.status });
    }
    
    // If we have any details but no summary, create one from the entity
    if (!summary && log.entity) {
      summary = ENTITY_LABELS[log.entity] || log.entity;
    }
    
    return summary || details.length > 0 ? { summary, details } : null;
  } catch {
    return null;
  }
};

export function AuditHistoryView() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditLogsResponse['stats']>();
  const [loading, setLoading] = useState(true);
  const [undoing, setUndoing] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [undoConfirmOpen, setUndoConfirmOpen] = useState(false);
  const [pendingUndoLog, setPendingUndoLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    fetchLogs();
  }, [filter, actionFilter, dateFrom, dateTo]);

  const fetchLogs = async (offset = 0) => {
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') {
        params.append('entity', filter);
      }
      if (actionFilter !== 'all') {
        params.append('action', actionFilter);
      }
      if (dateFrom) {
        params.append('dateFrom', dateFrom.toISOString());
      }
      if (dateTo) {
        params.append('dateTo', dateTo.toISOString());
      }
      params.append('limit', '30');
      params.append('offset', offset.toString());
      params.append('includeStats', 'true');

      const res = await fetch(`/api/audit?${params.toString()}`);
      
      if (!res.ok) {
        throw new Error(`API returned ${res.status}`);
      }
      
      const data: AuditLogsResponse = await res.json();
      
      // Ensure logs is always an array
      const safeLogs = Array.isArray(data?.logs) ? data.logs : [];
      const safeStats = data?.stats || undefined;
      
      if (offset === 0) {
        setLogs(safeLogs);
        setStats(safeStats);
      } else {
        setLogs(prev => [...prev, ...safeLogs]);
      }
      setHasMore(data?.hasMore || false);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast.error('Failed to load audit history');
      // Set empty state on error
      if (offset === 0) {
        setLogs([]);
        setStats(undefined);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUndoClick = (log: AuditLog) => {
    setPendingUndoLog(log);
    setUndoConfirmOpen(true);
  };

  const handleUndoConfirm = async () => {
    if (!pendingUndoLog) return;
    
    const logId = pendingUndoLog.id;
    setUndoing(logId);
    setUndoConfirmOpen(false);
    
    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logId,
          userId: 'current-user',
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Action undone successfully');
        fetchLogs();
      } else {
        toast.error(data.error || 'Failed to undo action');
      }
    } catch (error) {
      console.error('Error undoing action:', error);
      toast.error('Failed to undo action');
    } finally {
      setUndoing(null);
      setPendingUndoLog(null);
    }
  };

  const loadMore = () => {
    const newPage = page + 1;
    setPage(newPage);
    fetchLogs(newPage * 30);
  };

  const toggleExpand = (logId: string) => {
    setExpandedLogs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      return newSet;
    });
  };

  const filteredLogs = useMemo(() => {
    if (!searchQuery) return logs;
    const query = searchQuery.toLowerCase();
    return logs.filter(log => 
      log.details?.toLowerCase().includes(query) ||
      log.user?.name?.toLowerCase().includes(query) ||
      log.entity?.toLowerCase().includes(query) ||
      log.action.toLowerCase().includes(query)
    );
  }, [logs, searchQuery]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getChangeSummary = (log: AuditLog) => {
    try {
      const prev = log.previousState ? JSON.parse(log.previousState) : {};
      const next = log.newState ? JSON.parse(log.newState) : {};
      const changes: { field: string; from: string; to: string }[] = [];

      Object.keys(next).forEach(key => {
        if (prev[key] !== next[key] && key !== 'updatedAt') {
          changes.push({
            field: key,
            from: prev[key]?.toString() || 'none',
            to: next[key]?.toString() || 'none'
          });
        }
      });

      return changes;
    } catch {
      return [];
    }
  };

  const exportLogs = () => {
    const csv = [
      ['Date', 'Action', 'Entity', 'User', 'Details'].join(','),
      ...filteredLogs.map(log => [
        new Date(log.createdAt).toISOString(),
        log.action,
        log.entity || '',
        log.user?.name || 'System',
        `"${log.details?.replace(/"/g, '""') || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Audit logs exported');
  };

  const renderActivityHeatmap = () => {
    if (!stats?.hourlyDistribution) return null;
    
    const hours = stats.hourlyDistribution;
    const maxVal = Math.max(...hours, 1);
    
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Activity Heatmap
          </CardTitle>
          <CardDescription>Activity distribution by hour</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-0.5">
            {hours.map((count, hour) => (
              <div
                key={hour}
                className={cn(
                  "flex-1 h-8 rounded-sm transition-colors cursor-pointer",
                  count === 0 && "bg-muted/30",
                  count > 0 && count < maxVal * 0.25 && "bg-primary/20",
                  count >= maxVal * 0.25 && count < maxVal * 0.5 && "bg-primary/40",
                  count >= maxVal * 0.5 && count < maxVal * 0.75 && "bg-primary/60",
                  count >= maxVal * 0.75 && "bg-primary/80"
                )}
                title={`${hour}:00 - ${count} actions`}
              />
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>12AM</span>
            <span>6AM</span>
            <span>12PM</span>
            <span>6PM</span>
            <span>11PM</span>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-600">Audit History</h1>
          <div className="h-1 w-20 mt-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" />
          <p className="text-muted-foreground mt-1">Track all changes with undo capability</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportLogs} disabled={filteredLogs.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" onClick={() => fetchLogs()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card className="card-hover gradient-border">
            <div className="h-1 rounded-t-lg bg-gradient-to-r from-violet-500 to-purple-500" />
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/20 ring-4 ring-primary/5">
                  <Activity className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums">{stats.totalActions}</p>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="card-hover gradient-border">
            <div className="h-1 rounded-t-lg bg-gradient-to-r from-emerald-500 to-green-500" />
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/20 ring-4 ring-emerald-500/5">
                  <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums">{stats.createCount}</p>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Created</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-hover gradient-border">
            <div className="h-1 rounded-t-lg bg-gradient-to-r from-blue-500 to-indigo-500" />
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/20 ring-4 ring-blue-500/5">
                  <Settings className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums">{stats.updateCount}</p>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Updated</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-hover gradient-border">
            <div className="h-1 rounded-t-lg bg-gradient-to-r from-red-500 to-rose-500" />
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-red-500/20 ring-4 ring-red-500/5">
                  <ArrowDownRight className="h-4 w-4 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums">{stats.deleteCount}</p>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Deleted</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-hover gradient-border">
            <div className="h-1 rounded-t-lg bg-gradient-to-r from-amber-500 to-yellow-500" />
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/20 ring-4 ring-amber-500/5">
                  <Zap className="h-4 w-4 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums">{stats.todayCount}</p>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Today</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-hover gradient-border">
            <div className="h-1 rounded-t-lg bg-gradient-to-r from-purple-500 to-fuchsia-500" />
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-500/20 ring-4 ring-purple-500/5">
                  <CalendarDays className="h-4 w-4 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums">{stats.weekCount}</p>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">This Week</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search audit logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[150px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Entity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                <SelectItem value="schedule">Schedules</SelectItem>
                <SelectItem value="conflict">Conflicts</SelectItem>
                <SelectItem value="user">Users</SelectItem>
                <SelectItem value="subject">Subjects</SelectItem>
                <SelectItem value="room">Rooms</SelectItem>
              </SelectContent>
            </Select>

            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[150px]">
                <Zap className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="create">Created</SelectItem>
                <SelectItem value="update">Updated</SelectItem>
                <SelectItem value="delete">Deleted</SelectItem>
                <SelectItem value="login">Login</SelectItem>
                <SelectItem value="generate_schedules">Generated</SelectItem>
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[200px] justify-start">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {dateFrom || dateTo ? (
                    <>
                      {dateFrom ? format(dateFrom, 'MMM d') : 'Start'}
                      {' - '}
                      {dateTo ? format(dateTo, 'MMM d') : 'End'}
                    </>
                  ) : (
                    'Date Range'
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <div className="p-4 space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-2">From</p>
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={setDateFrom}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">To</p>
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={setDateTo}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDateFrom(undefined);
                      setDateTo(undefined);
                    }}
                  >
                    Clear Dates
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {(filter !== 'all' || actionFilter !== 'all' || dateFrom || dateTo || searchQuery) && (
              <Button
                variant="ghost"
                onClick={() => {
                  setFilter('all');
                  setActionFilter('all');
                  setDateFrom(undefined);
                  setDateTo(undefined);
                  setSearchQuery('');
                }}
                className="press-scale"
              >
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
            )}
          </div>

          {/* Action Type Quick Filter Pills */}
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border/50">
            <span className="text-xs font-medium text-muted-foreground self-center mr-1">Quick Filter:</span>
            {['all', 'create', 'update', 'delete', 'login'].map((action) => {
              const isActive = actionFilter === action;
              const colors = ACTION_COLORS[action];
              return (
                <button
                  key={action}
                  onClick={() => setActionFilter(action)}
                  className={cn(
                    "px-3 py-1 text-xs font-medium rounded-full transition-all duration-150 hover-scale",
                    isActive
                      ? cn(colors?.bg, colors?.text, "ring-2 ring-offset-1 ring-current/20")
                      : "bg-muted/60 text-muted-foreground hover:bg-muted"
                  )}
                >
                  {action === 'all' ? 'All' : ACTION_LABELS[action] || action}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Logs List */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Recent Changes
              </CardTitle>
              <Badge variant="secondary">{filteredLogs.length} entries</Badge>
            </div>
            <CardDescription>
              View and undo recent changes. Undo is available for the last 24 hours.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <History className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="font-medium">No audit logs found</p>
                <p className="text-sm text-muted-foreground">Changes will appear here as they happen</p>
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-3 pr-4 stagger-children">
                  <AnimatePresence>
                    {filteredLogs.map((log, index) => {
                      const actionStyle = ACTION_COLORS[log.action] || ACTION_COLORS.update;
                      const EntityIcon = log.entity ? ENTITY_ICONS[log.entity] || FileText : FileText;
                      const isExpanded = expandedLogs.has(log.id);
                      const changes = getChangeSummary(log);
                      const formatted = formatDetails(log);
                      
                      return (
                        <motion.div
                          key={log.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ delay: index * 0.02 }}
                          className={cn(
                            "rounded-lg border transition-all duration-200 overflow-hidden",
                            log.undone ? "bg-muted/30 opacity-60" : "bg-card hover:border-primary/30 hover:shadow-sm"
                          )}
                        >
                          <div 
                            className="p-4 cursor-pointer"
                            onClick={() => toggleExpand(log.id)}
                          >
                            <div className="flex items-start gap-4">
                              {/* Action Icon */}
                              <div className={cn(
                                "shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
                                actionStyle.bg
                              )}>
                                <actionStyle.icon className={cn("h-5 w-5", actionStyle.text)} />
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <Badge 
                                    variant="outline" 
                                    className={cn("font-medium", actionStyle.bg, actionStyle.text, actionStyle.border)}
                                  >
                                    {ACTION_LABELS[log.action] || log.action}
                                  </Badge>
                                  <span className="font-medium">
                                    {log.entity ? ENTITY_LABELS[log.entity] || log.entity : 'System'}
                                  </span>
                                  {log.undone && (
                                    <Badge variant="outline" className="text-xs border-gray-500/50 text-gray-500">
                                      <Undo2 className="h-3 w-3 mr-1" />
                                      Undone
                                    </Badge>
                                  )}
                                </div>
                                
                                {/* User and Time */}
                                <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
                                  {log.user && (
                                    <div className="flex items-center gap-1">
                                      <User className="h-3 w-3" />
                                      <span className="text-primary font-medium">{log.user.name}</span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatTime(log.createdAt)}
                                  </div>
                                </div>

                                {/* Quick Summary */}
                                {!isExpanded && formatted && (
                                  <p className="text-sm text-muted-foreground truncate">
                                    {formatted.summary}
                                    {formatted.details.length > 0 && ` • ${formatted.details.slice(0, 2).map(d => `${d.label}: ${d.value}`).join(', ')}`}
                                  </p>
                                )}
                              </div>

                              {/* Expand Icon & Undo */}
                              <div className="flex items-center gap-2">
                                {log.canUndo && !log.undone && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUndoClick(log);
                                    }}
                                    disabled={undoing === log.id}
                                    className="shrink-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                                  >
                                    {undoing === log.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <>
                                        <Undo2 className="h-4 w-4 mr-1" />
                                        Undo
                                      </>
                                    )}
                                  </Button>
                                )}
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Expanded Content */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                <Separator />
                                <div className="p-4 bg-muted/20">
                                  {/* Formatted Details */}
                                  {formatted && formatted.details.length > 0 && (
                                    <div className="space-y-2 mb-4">
                                      <p className="text-sm font-medium">{formatted.summary}</p>
                                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {formatted.details.map((detail, idx) => (
                                          <div key={idx} className="p-2 rounded bg-background/50 border">
                                            <p className="text-xs text-muted-foreground">{detail.label}</p>
                                            <p className="text-sm font-medium">{detail.value}</p>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Change Details */}
                                  {changes.length > 0 && (
                                    <div className="space-y-2 mb-4">
                                      <p className="text-sm font-medium text-muted-foreground">Changes:</p>
                                      <div className="grid gap-2">
                                        {changes.map((change, idx) => (
                                          <div key={idx} className="flex items-center gap-3 p-2 rounded bg-background/50">
                                            <span className="text-sm font-medium text-muted-foreground w-24 shrink-0">
                                              {change.field}
                                            </span>
                                            <div className="flex items-center gap-2 flex-1">
                                              <span className="text-sm text-red-500 line-through">{change.from}</span>
                                              <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                              <span className="text-sm text-emerald-500 font-medium">{change.to}</span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Entity ID */}
                                  {log.entityId && (
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                                      <span className="font-mono bg-muted px-2 py-1 rounded">ID: {log.entityId}</span>
                                    </div>
                                  )}

                                  {/* Undo Info */}
                                  {log.undone && log.undoneAt && (
                                    <div className="mt-3 p-2 rounded bg-gray-500/10 text-xs text-gray-500">
                                      <Undo2 className="h-3 w-3 inline mr-1" />
                                      Undone on {new Date(log.undoneAt).toLocaleString()}
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>

                  {hasMore && (
                    <div className="flex justify-center pt-4">
                      <Button variant="outline" onClick={loadMore}>
                        Load More
                      </Button>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Side Panel */}
        <div className="space-y-6">
          {/* Activity Heatmap */}
          {renderActivityHeatmap()}

          {/* Quick Tips */}
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 card-hover">
            <div className="h-1 rounded-t-lg bg-gradient-to-r from-emerald-500 to-teal-500" />
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="h-4 w-4" />
                Quick Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                  <span>Actions can be undone within 24 hours</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                  <span>Click on a log entry to see detailed changes</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                  <span>Use filters to find specific changes</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Undo Confirmation Dialog */}
      <AlertDialog open={undoConfirmOpen} onOpenChange={setUndoConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Confirm Undo Action
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 pt-2">
                <span className="block">
                  Are you sure you want to undo this action?
                </span>
                {pendingUndoLog && (
                  <div className="p-3 rounded-lg bg-muted/50 border space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "font-medium",
                          ACTION_COLORS[pendingUndoLog.action]?.bg || '',
                          ACTION_COLORS[pendingUndoLog.action]?.text || ''
                        )}
                      >
                        {ACTION_LABELS[pendingUndoLog.action] || pendingUndoLog.action}
                      </Badge>
                      <span className="text-sm font-medium">
                        {pendingUndoLog.entity ? ENTITY_LABELS[pendingUndoLog.entity] || pendingUndoLog.entity : 'System'}
                      </span>
                    </div>
                    <span className="block text-xs text-muted-foreground">
                      By {pendingUndoLog.user?.name || 'System'} • {formatTime(pendingUndoLog.createdAt)}
                    </span>
                  </div>
                )}
                <span className="block text-amber-600 dark:text-amber-400 text-sm font-medium">
                  ⚠️ This will revert the changes made by this action.
                </span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingUndoLog(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUndoConfirm}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              <Undo2 className="h-4 w-4 mr-2" />
              Yes, Undo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
