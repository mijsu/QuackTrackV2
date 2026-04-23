'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { QuickStatsBar } from './QuickStatsBar';
import { WelcomeBanner } from './WelcomeBanner';
import { DashboardChartWidgets } from './DashboardChartWidgets';
import { TodayScheduleWidget } from './TodayScheduleWidget';
import { ScheduleOverviewWidget } from './ScheduleOverviewWidget';
import { FacultyWorkloadChart } from './FacultyWorkloadChart';
import { FacultyWorkloadOverview } from './FacultyWorkloadOverview';
import { QuickGenPanel } from './QuickGenPanel';
import { RecentActivityFeed } from './RecentActivityFeed';
import { AnnouncementsWidget } from './AnnouncementsWidget';
import { SemesterTimeline } from './SemesterTimeline';
import { QuickActions } from './QuickActions';
import { AnnouncementBannerWidget } from './AnnouncementBannerWidget';
import { RoomUtilizationChart } from './RoomUtilizationChart';
import { QuickNavPanel } from '@/components/layout/QuickNavPanel';
import { RoomUtilizationWidget } from './RoomUtilizationWidget';
import { ScheduleDistributionWidget } from './ScheduleDistributionWidget';
import { DepartmentOverviewWidget } from './DepartmentOverviewWidget';
import { ScheduleStatsWidget } from './ScheduleStatsWidget';
import { ConflictSummaryWidget } from './ConflictSummaryWidget';
import { ScheduleQuickView } from './ScheduleQuickView';
import { ScheduleHealthScoreWidget } from './ScheduleHealthScoreWidget';
import { DepartmentBreakdownWidget } from './DepartmentBreakdownWidget';
import { FacultyAvailabilityWidget } from './FacultyAvailabilityWidget';
import { CurriculumOverviewWidget } from './CurriculumOverviewWidget';
import { QuickScheduleSearch } from './QuickScheduleSearch';
import { SemesterStatsPanel } from './SemesterStatsPanel';
import { SystemHealthWidget } from './SystemHealthWidget';
import { ConflictTimelineWidget } from './ConflictTimelineWidget';
import { RoomOccupancyMiniWidget } from './RoomOccupancyMiniWidget';
import { ScheduleDistributionMiniWidget } from './ScheduleDistributionMiniWidget';
import { QuickFacultyStatsWidget } from './QuickFacultyStatsWidget';
import { RoomOccupancyWidget } from './RoomOccupancyWidget';
import { FacultyLoadChart } from './FacultyLoadChart';
import { ScheduleConflictHeatmap } from './ScheduleConflictHeatmap';
import { QuickActionDashboard } from './QuickActionDashboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tour, type TourStep } from '@/components/ui/tour';
import {
  Users,
  Calendar,
  AlertTriangle,
  Building2,
  BookOpen,
  DoorOpen,
  Zap,
  Activity,
  TrendingUp,
  Clock,
  BookOpenCheck,
  AlertCircle,
  Info,
  CheckCircle2,
  LayoutGrid,
  CalendarDays,
  MapPin,
  User,
  ChevronRight,
  Layers,
  HelpCircle,
  Loader2,
  Terminal,
  Cpu,
  Database,
  GitBranch,
  Sparkles,
  X,
  MessageSquare,
  Printer,
  Sliders,
  Bell,
  GraduationCap,
  Award,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import type { DashboardStats, Schedule, Conflict } from '@/types';
import { cn } from '@/lib/utils';
import { formatTime12Hour, formatTimeRange } from '@/lib/utils';
import { useCountUp } from '@/hooks/use-count-up';
import { useAppStore } from '@/store';
import { DAYS } from '@/types';

type FacultyInfo = {
  id: string;
  name: string;
  email: string;
  department?: string | null;
};

type PreGenerationWarning = {
  type: string;
  message: string;
  severity: 'warning' | 'info';
  faculty?: FacultyInfo[];
};

// Countdown timer constants
const CONFIRM_COUNTDOWN_SECONDS = 5;
const WARNING_COUNTDOWN_SECONDS = 5;

// ============================================================================
// SCHEDULE GENERATION LOADER COMPONENT
// ============================================================================

interface GenerationLog {
  id: number;
  type: 'info' | 'success' | 'warning' | 'process' | 'data';
  message: string;
  timestamp: Date;
}

const PHASES = [
  { id: 'init', name: 'Initializing CSP Engine', icon: Cpu },
  { id: 'load', name: 'Loading Resources', icon: Database },
  { id: 'validate', name: 'Validating Constraints', icon: CheckCircle2 },
  { id: 'assign', name: 'Assigning Schedules', icon: GitBranch },
  { id: 'optimize', name: 'Optimizing Assignments', icon: Sparkles },
  { id: 'finalize', name: 'Finalizing', icon: Terminal },
];

const LOG_MESSAGES: Record<string, Array<{ type: GenerationLog['type']; msg: string }>> = {
  init: [
    { type: 'info', msg: 'Starting QuackTrack CSP Scheduler v2.0...' },
    { type: 'info', msg: 'Loading constraint satisfaction algorithm...' },
    { type: 'process', msg: 'Initializing MCV (Most Constrained Variable) heuristic...' },
    { type: 'process', msg: 'Initializing LCV (Least Constraining Value) heuristic...' },
    { type: 'info', msg: 'Forward checking propagation enabled' },
  ],
  load: [
    { type: 'data', msg: 'Fetching faculty records from database...' },
    { type: 'data', msg: 'Fetching subject offerings from database...' },
    { type: 'data', msg: 'Fetching section data from database...' },
    { type: 'data', msg: 'Fetching room availability from database...' },
    { type: 'success', msg: 'All resources loaded successfully' },
  ],
  validate: [
    { type: 'process', msg: 'Checking faculty specializations...' },
    { type: 'process', msg: 'Validating time slot availability...' },
    { type: 'process', msg: 'Checking room capacity constraints...' },
    { type: 'process', msg: 'Analyzing faculty preferences...' },
    { type: 'warning', msg: 'Checking for potential conflicts...' },
    { type: 'success', msg: 'Constraint validation complete' },
  ],
  assign: [
    { type: 'info', msg: 'Starting backtracking search algorithm...' },
    { type: 'process', msg: 'Selecting most constrained variable (MCV)...' },
    { type: 'process', msg: 'Applying domain reduction...' },
    { type: 'process', msg: 'Assigning values with LCV ordering...' },
    { type: 'process', msg: 'Propagating constraints via forward checking...' },
    { type: 'info', msg: 'Processing assignments...' },
    { type: 'process', msg: 'Backtracking on conflicts...' },
    { type: 'info', msg: 'Continuing assignment process...' },
  ],
  optimize: [
    { type: 'process', msg: 'Calculating preference match scores...' },
    { type: 'process', msg: 'Optimizing faculty load balance...' },
    { type: 'process', msg: 'Optimizing day distribution...' },
    { type: 'process', msg: 'Optimizing time slot quality...' },
    { type: 'process', msg: 'Optimizing room efficiency...' },
    { type: 'success', msg: 'Optimization complete' },
  ],
  finalize: [
    { type: 'info', msg: 'Saving schedules to database...' },
    { type: 'info', msg: 'Recording conflict violations...' },
    { type: 'info', msg: 'Updating faculty notifications...' },
    { type: 'info', msg: 'Creating audit log entries...' },
    { type: 'success', msg: 'Generation complete!' },
  ],
};

function ScheduleGenerationLoader({ isVisible, onCancel, isCancelling }: { 
  isVisible: boolean; 
  onCancel?: () => void;
  isCancelling?: boolean;
}) {
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [logs, setLogs] = useState<GenerationLog[]>([]);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState({
    faculty: 0,
    subjects: 0,
    sections: 0,
    rooms: 0,
    assigned: 0,
    conflicts: 0,
  });
  const logIdRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible) {
      setCurrentPhaseIndex(0);
      setLogs([]);
      setProgress(0);
      setStats({
        faculty: Math.floor(Math.random() * 10) + 15,
        subjects: Math.floor(Math.random() * 20) + 30,
        sections: Math.floor(Math.random() * 8) + 10,
        rooms: Math.floor(Math.random() * 5) + 8,
        assigned: 0,
        conflicts: 0,
      });
    }
  }, [isVisible]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    if (!isVisible) return;

    const phaseKeys = ['init', 'load', 'validate', 'assign', 'optimize', 'finalize'];
    let phaseTimeout: NodeJS.Timeout;
    let logInterval: NodeJS.Timeout;

    const runPhase = (phaseIndex: number) => {
      if (phaseIndex >= PHASES.length) return;

      const phaseKey = phaseKeys[phaseIndex];
      const messages = LOG_MESSAGES[phaseKey];
      let msgIndex = 0;

      logInterval = setInterval(() => {
        if (msgIndex < messages.length) {
          const { type, msg } = messages[msgIndex];
          setLogs(prev => [...prev, {
            id: ++logIdRef.current,
            type,
            message: msg,
            timestamp: new Date(),
          }]);
          msgIndex++;
          setProgress(Math.min(100, ((phaseIndex + (msgIndex / messages.length)) / PHASES.length) * 100));

          if (phaseKey === 'assign' && msgIndex % 2 === 0) {
            setStats(prev => ({
              ...prev,
              assigned: prev.assigned + Math.floor(Math.random() * 10) + 5,
            }));
          }
        } else {
          clearInterval(logInterval);
          setCurrentPhaseIndex(phaseIndex + 1);

          phaseTimeout = setTimeout(() => {
            runPhase(phaseIndex + 1);
          }, 300);
        }
      }, 150 + Math.random() * 200);
    };

    runPhase(0);

    return () => {
      clearTimeout(phaseTimeout);
      clearInterval(logInterval);
    };
  }, [isVisible]);

  const getLogColor = (type: GenerationLog['type']) => {
    switch (type) {
      case 'success': return 'text-emerald-400';
      case 'warning': return 'text-amber-400';
      case 'process': return 'text-blue-400';
      case 'data': return 'text-purple-400';
      default: return 'text-gray-400';
    }
  };

  const getLogIcon = (type: GenerationLog['type']) => {
    switch (type) {
      case 'success': return '✓';
      case 'warning': return '⚠';
      case 'process': return '→';
      case 'data': return '◆';
      default: return '•';
    }
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-4xl bg-card border rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Cpu className="h-8 w-8 text-primary" />
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    className="absolute inset-0 border-2 border-primary/30 border-t-primary rounded-full"
                  />
                </div>
                <div>
                  <h2 className="text-xl font-bold">
                    {isCancelling ? 'Cancelling...' : 'Generating Schedules'}
                  </h2>
                  <p className="text-sm text-muted-foreground">QuackTrack CSP Algorithm v2.0</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">{Math.round(progress)}%</p>
                  <p className="text-xs text-muted-foreground">Complete</p>
                </div>
                {onCancel && !isCancelling && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onCancel}
                    className="text-destructive border-destructive/50 hover:bg-destructive/10"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                )}
                {isCancelling && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Cancelling...</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 divide-x">
            {/* Left: Phases */}
            <div className="p-4 space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Generation Phases</h3>
              {PHASES.map((phase, index) => {
                const Icon = phase.icon;
                const status = index < currentPhaseIndex ? 'completed' : index === currentPhaseIndex ? 'active' : 'pending';
                return (
                  <motion.div
                    key={phase.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg transition-all duration-300',
                      status === 'active' && 'bg-primary/10 border border-primary/30',
                      status === 'completed' && 'bg-emerald-500/10 border border-emerald-500/20',
                      status === 'pending' && 'bg-muted/50'
                    )}
                  >
                    <div className={cn(
                      'flex items-center justify-center w-8 h-8 rounded-full transition-colors',
                      status === 'active' && 'bg-primary text-primary-foreground',
                      status === 'completed' && 'bg-emerald-500 text-white',
                      status === 'pending' && 'bg-muted text-muted-foreground'
                    )}>
                      {status === 'completed' ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : status === 'active' ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={cn(
                        'text-sm font-medium',
                        status === 'pending' && 'text-muted-foreground'
                      )}>
                        {phase.name}
                      </p>
                    </div>
                  </motion.div>
                );
              })}

              {/* Progress Bar */}
              <div className="pt-4">
                <Progress value={progress} className="h-2" />
              </div>
            </div>

            {/* Middle: Terminal Log */}
            <div className="p-4 flex flex-col">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                <Terminal className="h-4 w-4" />
                Console Output
              </h3>
              <div
                ref={scrollRef}
                className="flex-1 bg-black/90 rounded-lg p-3 font-mono text-xs overflow-y-auto max-h-[400px] space-y-1"
              >
                <AnimatePresence initial={false}>
                  {logs.map((log) => (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn('flex items-start gap-2', getLogColor(log.type))}
                    >
                      <span className="opacity-50 shrink-0">
                        [{log.timestamp.toLocaleTimeString('en-US', { hour12: false })}]
                      </span>
                      <span>{getLogIcon(log.type)}</span>
                      <span>{log.message}</span>
                    </motion.div>
                  ))}
                </AnimatePresence>
                <motion.span
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  className="text-white"
                >
                  ▌
                </motion.span>
              </div>
            </div>

            {/* Right: Stats */}
            <div className="p-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Statistics</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <Users className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                    <p className="text-2xl font-bold">{stats.faculty}</p>
                    <p className="text-xs text-muted-foreground">Faculty</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <BookOpen className="h-5 w-5 mx-auto mb-1 text-purple-500" />
                    <p className="text-2xl font-bold">{stats.subjects}</p>
                    <p className="text-xs text-muted-foreground">Subjects</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <Users className="h-5 w-5 mx-auto mb-1 text-amber-500" />
                    <p className="text-2xl font-bold">{stats.sections}</p>
                    <p className="text-xs text-muted-foreground">Sections</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <DoorOpen className="h-5 w-5 mx-auto mb-1 text-emerald-500" />
                    <p className="text-2xl font-bold">{stats.rooms}</p>
                    <p className="text-xs text-muted-foreground">Rooms</p>
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Schedules Assigned</span>
                    <span className="text-lg font-bold text-emerald-500">{stats.assigned}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Conflicts Detected</span>
                    <span className="text-lg font-bold text-amber-500">{stats.conflicts}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Backtrack Count</span>
                    <span className="text-lg font-bold text-blue-500">
                      {Math.floor(Math.random() * 50) + 10}
                    </span>
                  </div>
                </div>

                <Separator className="my-4" />

                {/* Algorithm Info */}
                <div className="bg-primary/5 rounded-lg p-3">
                  <p className="text-xs font-semibold text-primary mb-2">Algorithm Features</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                      MCV Heuristic
                    </li>
                    <li className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                      LCV Heuristic
                    </li>
                    <li className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                      Forward Checking
                    </li>
                    <li className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                      Load Balancing
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Simple Calendar View - Exact copy of CalendarView calendar grid only
function SimpleCalendarView({ schedules }: { schedules: Schedule[] }) {
  // Constants for grid sizing - Desktop
  const ROW_HEIGHT = 56;
  const HALF_ROW_HEIGHT = ROW_HEIGHT / 2;

  // Constants for grid sizing - Mobile (slightly smaller than desktop)
  const ROW_HEIGHT_MOBILE = 48;
  const HALF_ROW_HEIGHT_MOBILE = ROW_HEIGHT_MOBILE / 2;

  // Time range for the grid (7:00 to 21:00)
  const START_HOUR = 7;
  const END_HOUR = 21;

  // Get status color - exact same as CalendarView
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'generated': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'modified': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'conflict': return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // Group schedules by day and time slot - exact same as CalendarView
  const schedulesBySlot = useMemo(() => {
    const slotMap = new Map<string, Schedule[]>();
    
    schedules.forEach(schedule => {
      const key = `${schedule.day}-${schedule.startTime}-${schedule.endTime}`;
      const existing = slotMap.get(key) || [];
      existing.push(schedule);
      slotMap.set(key, existing);
    });

    return slotMap;
  }, [schedules]);

  // Get grouped schedules for a specific day - exact same as CalendarView
  const getGroupedSchedulesForDay = (day: string) => {
    const daySchedules: { 
      key: string; 
      firstSchedule: Schedule; 
      count: number; 
      allSchedules: Schedule[];
    }[] = [];

    schedulesBySlot.forEach((slotSchedules, key) => {
      if (key.startsWith(day + '-')) {
        const sortedSchedules = slotSchedules.sort((a, b) => 
          (a.subject?.subjectCode || '').localeCompare(b.subject?.subjectCode || '')
        );
        daySchedules.push({
          key,
          firstSchedule: sortedSchedules[0],
          count: sortedSchedules.length,
          allSchedules: sortedSchedules,
        });
      }
    });

    // Sort by start time
    return daySchedules.sort((a, b) => 
      a.firstSchedule.startTime.localeCompare(b.firstSchedule.startTime)
    );
  };

  // Calculate position for a schedule card - exact same as CalendarView
  const getSchedulePosition = (schedule: Schedule, isMobile: boolean = false) => {
    const rowHeight = isMobile ? ROW_HEIGHT_MOBILE : ROW_HEIGHT;
    const halfRowHeight = isMobile ? HALF_ROW_HEIGHT_MOBILE : HALF_ROW_HEIGHT;
    const [startHour] = schedule.startTime.split(':').map(Number);
    const [endHour] = schedule.endTime.split(':').map(Number);

    const top = (startHour - START_HOUR) * rowHeight + halfRowHeight;
    const height = (endHour - startHour) * rowHeight;

    return { top, height };
  };

  const gridHeight = (END_HOUR - START_HOUR + 1) * ROW_HEIGHT;
  const gridHeightMobile = (END_HOUR - START_HOUR + 1) * ROW_HEIGHT_MOBILE;

  if (schedules.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          {/* Custom empty state SVG illustration */}
          <div className="relative mb-4">
            <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 p-4">
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="8" y="16" width="48" height="40" rx="4" className="fill-emerald-100 dark:fill-emerald-900/40" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M8 24h48" className="stroke-emerald-300 dark:stroke-emerald-700" strokeWidth="1.5" />
                <rect x="16" y="12" width="32" height="8" rx="2" className="fill-emerald-200 dark:fill-emerald-800/50" stroke="currentColor" strokeWidth="1" />
                <circle cx="20" cy="33" r="2" className="fill-emerald-400 dark:fill-emerald-500" />
                <line x1="26" y1="33" x2="44" y2="33" className="stroke-emerald-300 dark:stroke-emerald-700" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="20" cy="41" r="2" className="fill-emerald-400 dark:fill-emerald-500" />
                <line x1="26" y1="41" x2="38" y2="41" className="stroke-emerald-300 dark:stroke-emerald-700" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="20" cy="49" r="2" className="fill-emerald-300 dark:fill-emerald-700" />
                <line x1="26" y1="49" x2="42" y2="49" className="stroke-emerald-200 dark:stroke-emerald-800" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            {/* Floating decorative dots */}
            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-teal-400/60 animate-bounce" style={{ animationDelay: '0.5s', animationDuration: '2s' }} />
            <div className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-emerald-400/60 animate-bounce" style={{ animationDelay: '1s', animationDuration: '2.5s' }} />
          </div>
          <p className="font-semibold text-foreground">No schedules assigned yet</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-[240px]">
            Your calendar is empty for now. Once schedules are generated, they&#39;ll appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Calendar Grid - EXACT COPY FROM CalendarView */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto" id="calendar-print-content">
            <div className="min-w-[850px] md:min-w-[900px]">
              {/* Header Row */}
              <div className="flex border-b bg-muted/50 sticky top-0 z-10">
                <div className="w-16 md:w-20 p-1.5 md:p-3 text-[10px] md:text-sm font-medium shrink-0">Time</div>
                {DAYS.map((day) => (
                  <div key={day} className="flex-1 min-w-[115px] md:min-w-[130px] p-1.5 md:p-3 text-[10px] md:text-sm font-medium border-l">
                    <span className="hidden sm:inline">{day}</span>
                    <span className="sm:hidden">{day.slice(0, 3)}</span>
                  </div>
                ))}
              </div>

              {/* Grid Container - Desktop */}
              <div className="hidden md:flex relative" style={{ height: gridHeight }}>
                {/* Time Column */}
                <div className="w-20 shrink-0 relative border-r">
                  {/* Generate time labels from START_HOUR to END_HOUR */}
                  {Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => {
                    const hour = START_HOUR + i;
                    return (
                      <div
                        key={hour}
                        className={`absolute left-0 right-0 flex items-start justify-center pt-1 text-xs text-muted-foreground font-medium border-t`}
                        style={{ top: i * ROW_HEIGHT, height: ROW_HEIGHT }}
                      >
                        {formatTime12Hour(`${hour.toString().padStart(2, '0')}:00`)}
                      </div>
                    );
                  })}
                </div>

                {/* Day Columns with Schedule Cards - Desktop */}
                {DAYS.map((day) => (
                  <div
                    key={day}
                    className="flex-1 min-w-[130px] relative border-l"
                    style={{ height: gridHeight }}
                  >
                    {/* Hour grid lines */}
                    {Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => (
                      <div
                        key={i}
                        className={`absolute left-0 right-0 ${i % 2 === 0 ? 'border-t border-dashed border-muted-foreground/20' : 'border-t border-muted-foreground/10'}`}
                        style={{ top: i * ROW_HEIGHT }}
                      />
                    ))}

                    {/* Half-hour grid lines (dashed) */}
                    {Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => (
                      <div
                        key={`half-${i}`}
                        className="absolute left-0 right-0 border-t border-dotted border-muted-foreground/10"
                        style={{ top: i * ROW_HEIGHT + HALF_ROW_HEIGHT }}
                      />
                    ))}

                    {/* Schedule Cards (Grouped) - Desktop */}
                    {getGroupedSchedulesForDay(day).map(({ key, firstSchedule, count, allSchedules }) => {
                      const { top, height } = getSchedulePosition(firstSchedule, false);
                      const hasMultiple = count > 1;
                      
                      return (
                        <div
                          key={key}
                          className={`absolute left-1 right-1 rounded-lg border overflow-hidden cursor-pointer select-none calendar-card-hover ${getStatusColor(firstSchedule.status)}`}
                          style={{ top: top + 2, height: height - 4 }}
                        >
                          <div className="flex items-start justify-between gap-1 px-2 py-1.5 border-b border-muted/30">
                            <p className="font-semibold text-xs truncate flex-1">{firstSchedule.subject?.subjectCode}</p>
                            {hasMultiple && (
                              <span className="text-[10px] px-1.5 py-0.5 shrink-0 rounded bg-emerald-500/20 text-emerald-700 font-semibold">
                                +{count - 1}
                              </span>
                            )}
                          </div>
                          <div className="px-2 space-y-1">
                            <p className="text-[10px] text-muted-foreground truncate">{firstSchedule.subject?.subjectName}</p>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 shrink-0 text-muted-foreground" />
                              <p className="text-[10px] text-muted-foreground truncate">{formatTimeRange(firstSchedule.startTime, firstSchedule.endTime)}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3 shrink-0 text-muted-foreground" />
                              <p className="text-[10px] text-muted-foreground truncate">{firstSchedule.faculty?.name}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 shrink-0 text-muted-foreground" />
                              <p className="text-[10px] text-muted-foreground truncate">{firstSchedule.room?.roomName}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3 shrink-0 text-muted-foreground" />
                              <p className="text-[10px] text-muted-foreground truncate">{firstSchedule.section?.sectionName}</p>
                            </div>
                            {hasMultiple && (
                              <div className="flex items-center gap-1 pt-2 mt-2 border-t border-muted/50">
                                <Layers className="h-3 w-3 shrink-0 text-primary" />
                                <p className="text-[10px] text-primary font-medium">Click to view all {count}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Grid Container - Mobile (same as desktop but smaller) */}
              <div className="md:hidden flex relative" style={{ height: gridHeightMobile }}>
                {/* Time Column - Mobile */}
                <div className="w-16 shrink-0 relative border-r">
                  {Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => {
                    const hour = START_HOUR + i;
                    return (
                      <div
                        key={hour}
                        className="absolute left-0 right-0 flex items-start justify-center pt-0.5 text-[10px] text-muted-foreground font-medium border-t"
                        style={{ top: i * ROW_HEIGHT_MOBILE, height: ROW_HEIGHT_MOBILE }}
                      >
                        {formatTime12Hour(`${hour.toString().padStart(2, '0')}:00`)}
                      </div>
                    );
                  })}
                </div>

                {/* Day Columns - Mobile */}
                {DAYS.map((day) => (
                  <div
                    key={day}
                    className="flex-1 min-w-[115px] relative border-l"
                    style={{ height: gridHeightMobile }}
                  >
                    {/* Hour grid lines - Mobile */}
                    {Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => (
                      <div
                        key={i}
                        className={`absolute left-0 right-0 ${i % 2 === 0 ? 'border-t border-dashed border-muted-foreground/20' : 'border-t border-muted-foreground/10'}`}
                        style={{ top: i * ROW_HEIGHT_MOBILE }}
                      />
                    ))}

                    {/* Half-hour grid lines - Mobile */}
                    {Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => (
                      <div
                        key={`half-${i}`}
                        className="absolute left-0 right-0 border-t border-dotted border-muted-foreground/10"
                        style={{ top: i * ROW_HEIGHT_MOBILE + HALF_ROW_HEIGHT_MOBILE }}
                      />
                    ))}

                    {/* Schedule Cards - Mobile (same layout as desktop, smaller) */}
                    {getGroupedSchedulesForDay(day).map(({ key, firstSchedule, count, allSchedules }) => {
                      const { top, height } = getSchedulePosition(firstSchedule, true);
                      const hasMultiple = count > 1;

                      return (
                        <div
                          key={key}
                          className={`absolute left-0.5 right-0.5 rounded-md border overflow-hidden cursor-pointer select-none calendar-card-hover-mobile ${getStatusColor(firstSchedule.status)}`}
                          style={{ top: top + 1, height: height - 2 }}
                        >
                          <div className="flex items-start justify-between gap-1 px-1.5 py-1 border-b border-muted/30">
                            <p className="font-semibold text-[11px] truncate flex-1">{firstSchedule.subject?.subjectCode}</p>
                            {hasMultiple && (
                              <span className="text-[9px] px-1.5 py-0.5 shrink-0 rounded bg-emerald-500/20 text-emerald-700 font-semibold">
                                +{count - 1}
                              </span>
                            )}
                          </div>
                          <div className="px-1.5 py-1 space-y-1">
                            <p className="text-[10px] text-muted-foreground truncate">{firstSchedule.subject?.subjectName}</p>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 shrink-0 text-muted-foreground" />
                              <p className="text-[10px] text-muted-foreground truncate">{formatTimeRange(firstSchedule.startTime, firstSchedule.endTime)}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3 shrink-0 text-muted-foreground" />
                              <p className="text-[10px] text-muted-foreground truncate">{firstSchedule.faculty?.name}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 shrink-0 text-muted-foreground" />
                              <p className="text-[10px] text-muted-foreground truncate">{firstSchedule.room?.roomName}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3 shrink-0 text-muted-foreground" />
                              <p className="text-[10px] text-muted-foreground truncate">{firstSchedule.section?.sectionName}</p>
                            </div>
                            {hasMultiple && (
                              <div className="flex items-center gap-1 pt-1 mt-1 border-t border-muted/50">
                                <Layers className="h-3 w-3 shrink-0 text-primary" />
                                <p className="text-[10px] text-primary font-medium">View all {count}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm font-medium">Status:</span>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600">Approved</Badge>
              <Badge variant="outline" className="bg-blue-500/10 text-blue-600">Generated</Badge>
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600">Modified</Badge>
              <Badge variant="outline" className="bg-red-500/10 text-red-600">Conflict</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

// ============================================================================
// ANIMATED STAT NUMBER COMPONENT
// ============================================================================

function AnimatedStatNumber({ value }: { value: number }) {
  const animatedValue = useCountUp(value, 600, value > 0);
  return (
    <span className="text-2xl font-bold tabular-nums animate-count-up">
      {value > 0 ? animatedValue : value}
    </span>
  );
}

export function DashboardView() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [allSchedules, setAllSchedules] = useState<Schedule[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [preGenerationWarnings, setPreGenerationWarnings] = useState<PreGenerationWarning[]>([]);
  const [generationClassType, setGenerationClassType] = useState<'regular' | 'executive'>('regular');
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  
  // AbortController for cancelling generation
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Countdown timers
  const [confirmCountdown, setConfirmCountdown] = useState(CONFIRM_COUNTDOWN_SECONDS);
  const [warningCountdown, setWarningCountdown] = useState(WARNING_COUNTDOWN_SECONDS);
  
  // Mobile view mode for faculty: 'dashboard' = normal, 'simple' = just schedule list, 'calendar' = full calendar
  const [mobileViewMode, setMobileViewMode] = useState<'dashboard' | 'simple' | 'calendar'>('dashboard');
  
  // Tour state for faculty
  const [showTour, setShowTour] = useState(false);

  const isFaculty = session?.user?.role === 'faculty';

  // Check if faculty has seen the tour
  useEffect(() => {
    if (isFaculty && session?.user?.id) {
      const hasSeenTour = localStorage.getItem(`ptc-tour-completed-${session.user.id}`);
      if (!hasSeenTour) {
        // Small delay to ensure DOM is ready
        const timer = setTimeout(() => setShowTour(true), 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [isFaculty, session?.user?.id]);

  // Faculty tour steps
  const facultyTourSteps: TourStep[] = [
    {
      target: '#faculty-dashboard-header',
      title: 'Welcome to QuackTrack!',
      description: 'This is your faculty dashboard where you can view your schedules, track your teaching load, and manage your preferences.',
      placement: 'bottom',
      showOn: 'all',
    },
    {
      target: '#faculty-stats-cards',
      title: 'Quick Statistics',
      description: 'View your total schedules, teaching load percentage, number of subjects, and active teaching days at a glance.',
      placement: 'bottom',
      showOn: 'all',
    },
    {
      target: '#mobile-schedule-toggle',
      title: 'View Your Schedule',
      description: 'Click this button to quickly view your class schedule in a mobile-friendly format. You can switch between list and calendar views.',
      placement: 'bottom',
      offset: { y: 10 },
      showOn: 'mobile',
    },
    {
      target: '#faculty-class-schedule',
      title: 'Your Class Schedule',
      description: 'Here you can see your upcoming classes for the week, including subject, section, room, and time.',
      placement: 'top',
      showOn: 'all',
    },
    {
      target: '#faculty-teaching-load',
      title: 'Teaching Load',
      description: 'Monitor your current teaching load versus your maximum capacity. This helps you understand your workload.',
      placement: 'top',
      showOn: 'all',
    },
    {
      target: '#sidebar-navigation',
      title: 'Navigation Menu',
      description: 'Use the sidebar to navigate to different sections: Schedule Calendar, My Schedule Responses, Notifications, and Preferences.',
      placement: 'right',
      offset: { x: 10 },
      showOn: 'desktop',
    },
    {
      target: '#mobile-bottom-nav',
      title: 'Mobile Navigation',
      description: 'On mobile, use the bottom navigation bar to quickly access your schedule, responses, notifications, and more options.',
      placement: 'top',
      offset: { y: -10 },
      showOn: 'mobile',
    },
  ];

  const handleTourFinish = () => {
    if (session?.user?.id) {
      localStorage.setItem(`ptc-tour-completed-${session.user.id}`, 'true');
    }
    setShowTour(false);
  };

  const handleTourClose = () => {
    setShowTour(false);
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Countdown timer for generation dialog
  useEffect(() => {
    if (!showGenerateDialog) {
      setConfirmCountdown(CONFIRM_COUNTDOWN_SECONDS);
      return;
    }
    
    if (confirmCountdown <= 0) return;
    
    const timer = setInterval(() => {
      setConfirmCountdown((prev) => prev - 1);
    }, 1000);
    
    return () => clearInterval(timer);
  }, [showGenerateDialog, confirmCountdown]);

  // Countdown timer for warning dialog
  useEffect(() => {
    if (!showWarningDialog) {
      setWarningCountdown(WARNING_COUNTDOWN_SECONDS);
      return;
    }
    
    if (warningCountdown <= 0) return;
    
    const timer = setInterval(() => {
      setWarningCountdown((prev) => prev - 1);
    }, 1000);
    
    return () => clearInterval(timer);
  }, [showWarningDialog, warningCountdown]);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, schedulesRes, conflictsRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/schedules'),
        fetch('/api/conflicts'),
      ]);

      const statsData = await statsRes.json();
      const schedulesData = await schedulesRes.json();
      const conflictsData = await conflictsRes.json();

      setStats(statsData);
      // Ensure we always set arrays (APIs might return error objects)
      setAllSchedules(Array.isArray(schedulesData) ? schedulesData : []);
      setConflicts(Array.isArray(conflictsData?.conflicts) ? conflictsData.conflicts.slice(0, 5) : []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
      // Set default values on error
      setStats(null);
      setAllSchedules([]);
      setConflicts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenGenerateDialog = () => {
    // Reset to default and show the unified generation modal
    setGenerationClassType('regular');
    setConfirmCountdown(CONFIRM_COUNTDOWN_SECONDS);
    setShowGenerateDialog(true);
  };

  const handleSelectGenerationType = (type: 'regular' | 'executive') => {
    setGenerationClassType(type);
  };

  const confirmGeneration = async () => {
    setShowGenerateDialog(false);
    // Then check for potential conflicts
    try {
      const checkRes = await fetch('/api/preferences/check-conflicts');
      const checkData = await checkRes.json();
      
      const warnings = checkData.conflicts?.filter((c: { severity: string }) => c.severity === 'warning') || [];
      
      if (warnings.length > 0) {
        // Show warning dialog before proceeding
        setPreGenerationWarnings(warnings);
        setShowWarningDialog(true);
        return;
      }
      
      // No warnings, proceed directly
      await executeGeneration();
    } catch {
      // If check fails, proceed anyway
      await executeGeneration();
    }
  };

  const executeGeneration = async () => {
    setShowWarningDialog(false);
    setGenerating(true);
    setIsCancelling(false);
    
    // Create new AbortController for this request
    abortControllerRef.current = new AbortController();
    
    // Set a client-side timeout (55 seconds - slightly longer than server's 50s)
    // This ensures we get our JSON error response instead of Render's HTML timeout page
    const clientTimeout = setTimeout(() => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    }, 55000);
    
    try {
      // Pass detected conflicts to the generate API so they can be saved
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          clearExisting: true,
          detectedConflicts: preGenerationWarnings,
          classType: generationClassType,
        }),
        signal: abortControllerRef.current.signal,
      });
      
      // Clear the timeout since we got a response
      clearTimeout(clientTimeout);
      
      // Check if response is OK before parsing JSON
      if (!res.ok) {
        const text = await res.text();
        console.error('API error response:', text);
        try {
          const errorData = JSON.parse(text);
          // Check if this is a timeout error
          if (errorData.timedOut || res.status === 408) {
            toast.error('Schedule generation timed out', {
              description: errorData.hint || 'The generation took too long. Try generating by department instead of all at once.',
              duration: 8000,
            });
          } else {
            toast.error(errorData.error || errorData.details || `Server error: ${res.status}`);
          }
        } catch {
          toast.error(`Server error: ${res.status}. Please check the console for details.`);
        }
        return;
      }
      
      const data = await res.json();
      
      if (data.success) {
        // Show success message with conflict info
        if (data.savedConflicts && data.savedConflicts > 0) {
          toast.success(
            `Generated ${data.generated} schedules. ${data.savedConflicts} conflict(s) recorded for review.`,
            { duration: 6000 }
          );
        } else if (data.preGenerationWarnings && data.preGenerationWarnings.length > 0) {
          toast.info(
            `Generated ${data.generated} schedules. ${data.preGenerationWarnings.length} preference conflicts were detected but did not block generation.`,
            { duration: 6000 }
          );
        } else {
          toast.success(data.message);
        }
        fetchDashboardData();
      } else {
        toast.error(data.error || 'Failed to generate schedules');
        if (data.details) {
          console.error('Generation details:', data.details);
        }
      }
    } catch (error) {
      // Check if this was a cancellation
      if (error instanceof Error && error.name === 'AbortError') {
        // Check if it was a timeout or user cancellation
        if (isCancelling) {
          toast.info('Schedule generation was cancelled');
        } else {
          toast.error('Schedule generation timed out', {
            description: 'The request took too long. Try generating by department instead of all at once, or consider upgrading your hosting plan for longer timeouts.',
            duration: 8000,
          });
        }
      } else {
        console.error('Generation error:', error);
        toast.error('Failed to generate schedules. Please try again.');
      }
    } finally {
      clearTimeout(clientTimeout);
      setGenerating(false);
      setIsCancelling(false);
      abortControllerRef.current = null;
    }
  };
  
  // Cancel ongoing generation
  const cancelGeneration = () => {
    if (abortControllerRef.current) {
      setIsCancelling(true);
      abortControllerRef.current.abort();
    }
  };

  // Cycle through mobile view modes
  const cycleMobileViewMode = () => {
    setMobileViewMode((prev) => {
      if (prev === 'dashboard') return 'simple';
      if (prev === 'simple') return 'calendar';
      return 'dashboard';
    });
  };

  // All hooks and derived state must be before any early returns
  const isAdmin = session?.user?.role === 'admin';
  const isDeptHead = session?.user?.role === 'department_head';

  // Derived state: recent schedules for dashboard card (first 5)
  const recentSchedules = allSchedules.slice(0, 5);

  // Loading check comes AFTER all hooks
  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Skeleton stat cards row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 stagger-children">
          {[1, 2, 3, 4].map((i) => {
            const gradients = [
              'from-emerald-500/20 to-teal-500/10',
              'from-blue-500/20 to-indigo-500/10',
              'from-amber-500/20 to-orange-500/10',
              'from-violet-500/20 to-purple-500/10',
            ];
            return (
              <div key={i} className="skeleton-card p-4 sm:p-5 space-y-3 relative overflow-hidden">
                {/* Gradient header strip */}
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradients[i - 1]}`} />
                <div className="flex items-center justify-between">
                  <div className="skeleton-line w-24 h-3 rounded-full" />
                  <div className="skeleton-line w-8 h-8 rounded-lg" />
                </div>
                <div className="skeleton-line w-16 h-7 rounded-md" />
                <div className="skeleton-line w-full h-2 rounded-full" />
              </div>
            );
          })}
        </div>
        {/* Skeleton main content row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 stagger-children">
          <div className="lg:col-span-2 skeleton-card p-5 space-y-4">
            <div className="skeleton-line w-40 h-5 rounded-md" />
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="skeleton-line w-10 h-10 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton-line w-3/4 h-4 rounded-md" />
                    <div className="skeleton-line w-1/2 h-3 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="skeleton-card p-5 space-y-4">
            <div className="skeleton-line w-32 h-5 rounded-md" />
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="skeleton-line w-8 h-8 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton-line w-2/3 h-3 rounded-md" />
                    <div className="skeleton-line w-1/3 h-2 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Skeleton bottom row */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 stagger-children">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton-card p-5 space-y-4">
              <div className="skeleton-line w-36 h-5 rounded-md" />
              <div className="skeleton-line w-full h-32 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Faculty-specific dashboard
  if (isFaculty) {
    return (
      <>
        {/* Fullscreen Mobile Views (Simple or Calendar Mode) */}
        <AnimatePresence>
          {(mobileViewMode === 'simple' || mobileViewMode === 'calendar') && (
            <motion.div
              key={mobileViewMode}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-background md:hidden flex flex-col"
            >
              {/* Exit Button - Fixed at top right */}
              <div className="fixed top-4 right-4 z-10">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setMobileViewMode('dashboard')}
                  className="h-10 w-10 p-0 rounded-full shadow-lg"
                >
                  <LayoutGrid className="h-5 w-5" />
                </Button>
              </div>

              {/* Mode Toggle - Fixed at bottom */}
              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-10 flex gap-2 bg-background/80 backdrop-blur-sm p-2 rounded-full shadow-lg border">
                <Button
                  variant={mobileViewMode === 'simple' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setMobileViewMode('simple')}
                  className="h-9 px-4 rounded-full"
                >
                  <BookOpenCheck className="h-4 w-4 mr-2" />
                  Schedule
                </Button>
                <Button
                  variant={mobileViewMode === 'calendar' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setMobileViewMode('calendar')}
                  className="h-9 px-4 rounded-full"
                >
                  <CalendarDays className="h-4 w-4 mr-2" />
                  Calendar
                </Button>
              </div>

              {/* Content Area - Scrollable */}
              <div className="flex-1 overflow-y-auto pt-16 pb-24 px-4">
                {mobileViewMode === 'simple' && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    {/* Title */}
                    <div className="text-center mb-4">
                      <h1 className="text-xl font-bold">My Class Schedule</h1>
                      <p className="text-sm text-muted-foreground">Your classes for the week</p>
                    </div>

                    {/* My Class Schedule - Grouped by Day */}
                    {allSchedules.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="relative mb-4">
                          <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 p-4">
                            <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <rect x="6" y="14" width="44" height="36" rx="3" className="fill-emerald-100 dark:fill-emerald-900/40" stroke="currentColor" strokeWidth="1.5" />
                              <path d="M6 22h44" className="stroke-emerald-300 dark:stroke-emerald-700" strokeWidth="1.5" />
                              <line x1="14" y1="30" x2="34" y2="30" className="stroke-emerald-300 dark:stroke-emerald-700" strokeWidth="1.5" strokeLinecap="round" />
                              <line x1="14" y1="37" x2="28" y2="37" className="stroke-emerald-200 dark:stroke-emerald-800" strokeWidth="1.5" strokeLinecap="round" />
                              <line x1="14" y1="44" x2="32" y2="44" className="stroke-emerald-200 dark:stroke-emerald-800" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                          </div>
                          <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-teal-400/60 animate-bounce" style={{ animationDelay: '0.5s', animationDuration: '2s' }} />
                        </div>
                        <p className="font-semibold text-foreground">No schedules assigned yet</p>
                        <p className="text-sm text-muted-foreground mt-1 max-w-[220px]">
                          Once your classes are scheduled, they&#39;ll appear here organized by day.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {/* Sort schedules by day order from DAYS constant */}
                        {DAYS
                          .filter(day => allSchedules.some(s => s.day === day))
                          .map((day, dayIndex) => {
                            const daySchedules = allSchedules.filter(s => s.day === day);
                            return (
                              <div key={day}>
                                {dayIndex > 0 && <Separator className="my-4" />}
                                
                                <div className="flex items-center gap-2 mb-3">
                                  <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center">
                                    <Calendar className="h-3.5 w-3.5 text-primary" />
                                  </div>
                                  <p className="font-semibold">{day}</p>
                                </div>

                                <div className="space-y-2">
                                  {daySchedules
                                    .sort((a, b) => a.startTime.localeCompare(b.startTime))
                                    .map((schedule) => (
                                    <div 
                                      key={schedule.id} 
                                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                                          <BookOpenCheck className="h-4 w-4 text-primary" />
                                        </div>
                                        <div>
                                          <p className="font-medium text-sm">{schedule.subject?.subjectName}</p>
                                          <p className="text-xs text-muted-foreground">
                                            {schedule.section?.sectionName} • {schedule.room?.roomName}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-xs font-medium">
                                          {formatTimeRange(schedule.startTime, schedule.endTime)}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </motion.div>
                )}

                {mobileViewMode === 'calendar' && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    {/* Title */}
                    <div className="text-center mb-4">
                      <h1 className="text-xl font-bold">Schedule Calendar</h1>
                      <p className="text-sm text-muted-foreground">Your weekly schedule overview</p>
                    </div>

                    {/* Simple Calendar View */}
                    <SimpleCalendarView schedules={allSchedules} />
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Default Dashboard View */}
        <div className="space-y-6">
          {/* ================================================================= */}
          {/* (a) Personal Welcome Section                                          */}
          {/* ================================================================= */}
          <motion.div
            id="faculty-dashboard-header"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="relative rounded-xl border border-border/50 bg-gradient-to-br from-emerald-500/5 via-card to-card p-5 sm:p-6 overflow-hidden"
          >
            {/* Decorative background */}
            <div className="absolute inset-0 dot-pattern opacity-30 pointer-events-none" />
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-emerald-500/8 to-transparent rounded-bl-full pointer-events-none" />

            <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-2">
                {/* Time-based greeting */}
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  {(() => {
                    const hour = new Date().getHours();
                    if (hour < 12) return 'Good morning';
                    if (hour < 18) return 'Good afternoon';
                    return 'Good evening';
                  })()}{', '}{session?.user?.name?.split(' ')[0]}! 👋
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Here&apos;s your teaching schedule overview
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                    <GraduationCap className="h-3 w-3 mr-1" />
                    Current Semester
                  </Badge>
                </div>
              </div>

              {/* Mobile View Toggle - Only visible on mobile */}
              <Button
                id="mobile-schedule-toggle"
                variant="outline"
                size="sm"
                onClick={cycleMobileViewMode}
                className="md:hidden h-10 px-4 gap-2 bg-primary/5 border-primary/20 hover:bg-primary/10"
              >
                <CalendarDays className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">My Schedule</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          </motion.div>

          {/* ================================================================= */}
          {/* (b) Personal Stats Row (4 cards)                                    */}
          {/* ================================================================= */}
          <div id="faculty-stats-cards" className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 stagger-children">
            {/* My Subjects */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <div className="glass-card-elevated card-hover rounded-xl relative overflow-hidden group">
                {/* Gradient header strip */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-80 group-hover:opacity-100 transition-opacity" />
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/20">
                      <BookOpen className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">My Subjects</span>
                  </div>
                  <AnimatedStatNumber value={new Set(allSchedules.map(s => s.subjectId)).size} />
                  <p className="text-xs text-muted-foreground mt-0.5">Unique subjects assigned</p>
                </div>
              </div>
            </motion.div>

            {/* Teaching Load */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
            >
              <div className="glass-card-elevated card-hover rounded-xl relative overflow-hidden group">
                {/* Gradient header strip */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 opacity-80 group-hover:opacity-100 transition-opacity" />
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 ring-1 ring-blue-500/20">
                      <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Teaching Load</span>
                  </div>
                  <p className="text-2xl font-bold tabular-nums">
                    <AnimatedStatNumber value={stats?.facultyUtilization?.[0]?.assigned || 0} /><span className="text-sm font-normal text-muted-foreground">/{stats?.facultyUtilization?.[0]?.max || 24}</span>
                    <span className="text-xs font-medium text-muted-foreground ml-1">units</span>
                  </p>
                <div className="mt-2">
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-500',
                        (stats?.facultyUtilizationAvg || 0) > 100 ? 'bg-gradient-to-r from-red-500 to-rose-500' :
                        (stats?.facultyUtilizationAvg || 0) > 80 ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
                        'bg-gradient-to-r from-emerald-500 to-teal-500'
                      )}
                      style={{ width: `${Math.min((stats?.facultyUtilizationAvg || 0), 100)}%` }}
                    />
                  </div>
                </div>
              </div>
              </div>
            </motion.div>

            {/* Active Days */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <div className="glass-card-elevated card-hover rounded-xl relative overflow-hidden group">
                {/* Gradient header strip */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500 opacity-80 group-hover:opacity-100 transition-opacity" />
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 ring-1 ring-amber-500/20">
                      <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Active Days</span>
                  </div>
                  <AnimatedStatNumber value={new Set(allSchedules.map(s => s.day)).size} />
                  <p className="text-xs text-muted-foreground mt-0.5">Days with classes</p>
                </div>
              </div>
            </motion.div>

            {/* Departments */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.25 }}
            >
              <div className="glass-card-elevated card-hover rounded-xl relative overflow-hidden group">
                {/* Gradient header strip */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 to-purple-500 opacity-80 group-hover:opacity-100 transition-opacity" />
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10 ring-1 ring-violet-500/20">
                      <Building2 className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Departments</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(() => {
                      const depts = [...new Set(allSchedules.map(s => s.subject?.program?.department?.name || s.subject?.department?.name).filter(Boolean))];
                      return depts.length > 0
                        ? depts.slice(0, 3).map(d => (
                            <Badge key={d} variant="secondary" className="text-[10px] px-1.5 py-0 h-5">{d}</Badge>
                          ))
                        : <p className="text-xs text-muted-foreground">None assigned</p>;
                    })()}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* ================================================================= */}
          {/* (c) Today's Teaching Schedule + (d) Weekly Schedule Preview            */}
          {/* ================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Today's Teaching Schedule */}
            <motion.div
              id="faculty-class-schedule"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <TodayScheduleWidget />
            </motion.div>

            {/* Weekly Schedule Preview - hidden on mobile, shown on md+ */}
            <motion.div
              id="faculty-weekly-schedule"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.35 }}
              className="hidden md:block"
            >
              <Card className="card-hover h-full flex flex-col">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CalendarDays className="h-4 w-4 text-emerald-500" />
                    This Week&apos;s Schedule
                  </CardTitle>
                  <CardDescription>Your complete class timetable for the week</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 overflow-auto">
                  <SimpleCalendarView schedules={allSchedules} />
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Mobile-only: View Full Calendar button instead of weekly grid */}
          <div className="md:hidden">
            <Button
              variant="outline"
              className="w-full h-11 gap-2 bg-primary/5 border-primary/20 hover:bg-primary/10"
              onClick={() => setMobileViewMode('calendar')}
            >
              <CalendarDays className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">View Full Calendar</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>

          {/* Schedule Quick View for Faculty */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.38 }}
          >
            <ScheduleQuickView />
          </motion.div>

          {/* ================================================================= */}
          {/* (e) Teaching Load Progress Section                                   */}
          {/* ================================================================= */}
          <motion.div
            id="faculty-teaching-load"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <Card className="glass-card-elevated card-hover">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  Teaching Load Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Main progress bar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Current Load</span>
                      <span className={cn(
                        'font-semibold tabular-nums',
                        (stats?.facultyUtilizationAvg || 0) > 100 ? 'text-red-600 dark:text-red-400' :
                        (stats?.facultyUtilizationAvg || 0) > 80 ? 'text-amber-600 dark:text-amber-400' :
                        'text-emerald-600 dark:text-emerald-400'
                      )}>
                        {stats?.facultyUtilizationAvg || 0}%
                      </span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                      <motion.div
                        className={cn(
                          'h-full rounded-full',
                          (stats?.facultyUtilizationAvg || 0) > 100 ? 'bg-gradient-to-r from-red-500 to-rose-500' :
                          (stats?.facultyUtilizationAvg || 0) > 80 ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
                          'bg-gradient-to-r from-emerald-500 to-teal-500'
                        )}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((stats?.facultyUtilizationAvg || 0), 100)}%` }}
                        transition={{ duration: 0.8, delay: 0.5, ease: 'easeOut' }}
                      />
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Current: <span className="font-medium text-foreground">{stats?.facultyUtilization?.[0]?.assigned || 0}</span> units</span>
                    <span>Max: <span className="font-medium text-foreground">{stats?.facultyUtilization?.[0]?.max || 24}</span> units</span>
                  </div>

                  {/* Remaining capacity message */}
                  <p className="text-xs text-muted-foreground">
                    {(() => {
                      const assigned = stats?.facultyUtilization?.[0]?.assigned || 0;
                      const max = stats?.facultyUtilization?.[0]?.max || 24;
                      const remaining = max - assigned;
                      if (remaining > 0) {
                        return `You have ${remaining} unit${remaining !== 1 ? 's' : ''} of capacity remaining`;
                      }
                      if (remaining === 0) {
                        return 'You are at full capacity';
                      }
                      return `You are ${Math.abs(remaining)} unit${Math.abs(remaining) !== 1 ? 's' : ''} over capacity`;
                    })()}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* ================================================================= */}
          {/* (f) Quick Actions for Faculty                                        */}
          {/* ================================================================= */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.45 }}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* My Schedule Responses */}
              <button
                onClick={() => useAppStore.getState().setViewMode('my-responses')}
                className="glass-card-elevated card-hover rounded-xl p-4 flex flex-col items-center gap-3 text-center cursor-pointer border-0 bg-card"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/20">
                  <MessageSquare className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-sm font-medium">Schedule Responses</span>
              </button>

              {/* Print Schedule */}
              <button
                onClick={() => useAppStore.getState().setViewMode('calendar')}
                className="glass-card-elevated card-hover rounded-xl p-4 flex flex-col items-center gap-3 text-center cursor-pointer border-0 bg-card"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/20">
                  <Printer className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-sm font-medium">Print Schedule</span>
              </button>

              {/* My Preferences */}
              <button
                onClick={() => useAppStore.getState().setViewMode('preferences')}
                className="glass-card-elevated card-hover rounded-xl p-4 flex flex-col items-center gap-3 text-center cursor-pointer border-0 bg-card"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/20">
                  <Sliders className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-sm font-medium">My Preferences</span>
              </button>

              {/* Notifications */}
              <button
                onClick={() => useAppStore.getState().setViewMode('notifications')}
                className="glass-card-elevated card-hover rounded-xl p-4 flex flex-col items-center gap-3 text-center cursor-pointer border-0 bg-card"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/20">
                  <Bell className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-sm font-medium">Notifications</span>
              </button>
            </div>
          </motion.div>

          {/* ================================================================= */}
          {/* (g) Recent Announcements                                             */}
          {/* ================================================================= */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
          >
            <AnnouncementsWidget />
          </motion.div>
        </div>

        {/* Faculty Tour */}
        <Tour
          steps={facultyTourSteps}
          open={showTour}
          onClose={handleTourClose}
          onFinish={handleTourFinish}
        />
      </>
    );
  }

  // Admin/Dept Head Dashboard (original view)
  return (
    <>
      {/* Quick Navigation Panel */}
      <QuickNavPanel />

      {/* Schedule Generation Loader */}
      <ScheduleGenerationLoader 
        isVisible={generating} 
        onCancel={cancelGeneration}
        isCancelling={isCancelling}
      />
      
      <div className="space-y-5 relative">
      {/* Decorative emerald gradient watermark */}
      <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-gradient-to-br from-emerald-500/5 via-teal-500/3 to-transparent rounded-full blur-3xl pointer-events-none" aria-hidden="true" />
      <div className="absolute top-1/3 -left-48 w-[400px] h-[400px] bg-gradient-to-tr from-emerald-600/4 via-transparent to-transparent rounded-full blur-3xl pointer-events-none" aria-hidden="true" />
      
      {/* Welcome Banner */}
      <WelcomeBanner />

      {/* Admin Announcement Banner */}
      {isAdmin && <AnnouncementBannerWidget />}

      {/* Dashboard Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="relative rounded-xl border border-border/50 bg-gradient-to-br from-emerald-500/5 via-card to-card p-5 sm:p-6 overflow-hidden"
      >
        {/* Decorative background grid pattern */}
        <div className="absolute inset-0 subtle-grid opacity-40 pointer-events-none" />
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-emerald-500/5 to-transparent rounded-bl-full pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gradient-emerald">
                Dashboard
              </h1>
            </div>
            {/* Accent line */}
            <div className="accent-line-emerald w-24" />
            <div className="flex items-center gap-2 pt-1">
              <p className="text-sm sm:text-base text-muted-foreground">
                Welcome back, <span className="font-medium text-foreground/90">{session?.user?.name}</span>
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
              <Calendar className="h-3 w-3" />
              <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <motion.div
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  onClick={handleOpenGenerateDialog}
                  disabled={generating}
                  size="lg"
                  className={cn(
                    "bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:via-emerald-400 hover:to-teal-400",
                    "text-white border-0 shadow-lg shadow-emerald-500/20 font-semibold text-sm px-6 py-5 h-auto",
                    "hover:shadow-xl hover:shadow-emerald-500/30 hover:scale-[1.02] active:scale-[0.98]",
                    "transition-all duration-200",
                    !generating && "generate-btn-glow"
                  )}
                >
                  {generating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="mr-2 h-4 w-4" />
                  )}
                  {generating ? 'Generating...' : 'Generate Schedule'}
                </Button>
              </motion.div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Quick Schedule Search — Global search bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <QuickScheduleSearch />
      </motion.div>

      {/* Quick Stats Bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <QuickStatsBar />
      </motion.div>

      {/* Semester Stats Panel — Admin Only */}
      {isAdmin && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
        >
          <SemesterStatsPanel />
        </motion.div>
      )}

      {/* Quick Action Dashboard — Admin Only */}
      {isAdmin && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.06 }}
        >
          <QuickActionDashboard />
        </motion.div>
      )}

      {/* System Health Status — Admin Only */}
      {isAdmin && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.08 }}
        >
          <SystemHealthWidget />
        </motion.div>
      )}

      {/* Conflict Timeline & Room Occupancy — Admin Only */}
      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ConflictTimelineWidget />
          <RoomOccupancyMiniWidget />
        </div>
      )}

      {/* Schedule Distribution & Quick Faculty Stats — Admin Only */}
      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ScheduleDistributionMiniWidget />
          <QuickFacultyStatsWidget />
        </div>
      )}

      {/* Analytics Overview Section Title */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="flex items-center gap-3"
      >
        <h2 className="text-lg font-semibold tracking-tight whitespace-nowrap">Analytics Overview</h2>
        <div className="flex-1 h-px bg-gradient-to-r from-primary/30 via-primary/10 to-transparent" />
      </motion.div>

      {/* Dashboard Chart Widgets */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <DashboardChartWidgets />
      </motion.div>

      {/* Today's Schedule / Quick Generation / Recent Activity / Announcements / Schedule Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-stretch stagger-children">
        <motion.div
          className="h-full"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <TodayScheduleWidget />
        </motion.div>
        <motion.div
          className="h-full"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.22 }}
        >
          <ScheduleOverviewWidget />
        </motion.div>
        <motion.div
          className="h-full"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <RecentActivityFeed />
        </motion.div>
        <motion.div
          className="h-full"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.28 }}
        >
          <AnnouncementsWidget />
        </motion.div>
        <motion.div
          className="h-full"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
        >
          <QuickGenPanel />
        </motion.div>
      </div>

      {/* Recent Schedules, Active Conflicts & Schedule Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* Recent Schedules */}
        <Card className="focus-glow card-hover">
          <CardHeader className="relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-emerald-500" />
              Recent Schedules
            </CardTitle>
            <CardDescription>Latest schedule assignments</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              {recentSchedules.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 p-3 mb-3">
                    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="4" y="8" width="32" height="28" rx="2" className="fill-emerald-100 dark:fill-emerald-900/40" stroke="currentColor" strokeWidth="1" />
                      <path d="M4 14h32" className="stroke-emerald-300 dark:stroke-emerald-700" strokeWidth="1" />
                      <line x1="10" y1="20" x2="26" y2="20" className="stroke-emerald-300 dark:stroke-emerald-700" strokeWidth="1" strokeLinecap="round" />
                      <line x1="10" y1="26" x2="20" y2="26" className="stroke-emerald-200 dark:stroke-emerald-800" strokeWidth="1" strokeLinecap="round" />
                    </svg>
                  </div>
                  <p className="font-medium text-sm">No schedules generated yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Generate your first schedule to see it here!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentSchedules.map((schedule, index) => (
                    <div key={schedule.id}>
                      {index > 0 && <Separator className="mb-4" />}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{schedule.subject?.subjectName}</p>
                          <p className="text-sm text-muted-foreground">
                            {schedule.faculty?.name} • {schedule.room?.roomName}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{schedule.day}</p>
                          <p className="text-xs text-muted-foreground">
                            {schedule.startTime} - {schedule.endTime}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Conflict Summary Widget */}
        <motion.div
          className="h-full"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.32 }}
        >
          <ConflictSummaryWidget />
        </motion.div>

        {/* Schedule Stats */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.34 }}
          className="h-full"
        >
          <ScheduleStatsWidget />
        </motion.div>
      </div>

      {/* Schedule Health Score */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.36 }}
        className="max-w-xs"
      >
        <ScheduleHealthScoreWidget />
      </motion.div>

      {/* Today's Quick Schedule View (admin) */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.35 }}
        className="max-w-2xl"
      >
        <ScheduleQuickView />
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.32 }}
        >
          <SemesterTimeline />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.36 }}
        >
          <QuickActions />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.38 }}
          className="h-full"
        >
          <DepartmentOverviewWidget />
        </motion.div>
      </div>

      {/* Department Schedule Breakdown (admin only) */}
      {isAdmin && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.38 }}
        >
          <DepartmentBreakdownWidget />
        </motion.div>
      )}

      {/* Faculty Availability Widget (admin only) */}
      {isAdmin && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.39 }}
        >
          <FacultyAvailabilityWidget />
        </motion.div>
      )}

      {/* Curriculum Overview Widget (admin only) */}
      {isAdmin && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <CurriculumOverviewWidget />
        </motion.div>
      )}

      {/* New Dashboard Widgets (admin only) */}
      {isAdmin && (
        <>
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.4 }}
            className="flex items-center gap-3"
          >
            <h2 className="text-lg font-semibold tracking-tight whitespace-nowrap">Resource Insights</h2>
            <div className="flex-1 h-px bg-gradient-to-r from-teal-500/30 via-teal-500/10 to-transparent" />
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <RoomUtilizationChart />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <ScheduleDistributionWidget />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.4 }}
            >
              <FacultyWorkloadChart />
            </motion.div>
          </div>

          {/* Room Occupancy & Faculty Load (admin only) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.5 }}
            >
              <RoomOccupancyWidget />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.55 }}
            >
              <FacultyLoadChart />
            </motion.div>
          </div>

          {/* Faculty Workload Overview & Schedule Density Heatmap (admin only) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.58 }}
            >
              <FacultyWorkloadOverview />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.62 }}
            >
              <ScheduleConflictHeatmap />
            </motion.div>
          </div>

          {/* New Dashboard Widgets */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.5 }}
            className="flex items-center gap-3"
          >
            <h2 className="text-lg font-semibold tracking-tight whitespace-nowrap">Utilization Insights</h2>
            <div className="flex-1 h-px bg-gradient-to-r from-emerald-500/30 via-emerald-500/10 to-transparent" />
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <RoomUtilizationWidget />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.4 }}
            >
              <ScheduleDistributionWidget />
            </motion.div>
          </div>
        </>
      )}

      {/* Unified Generate Schedule Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Generate Schedule
            </DialogTitle>
            <DialogDescription asChild>
              <p className="text-muted-foreground">
                Select the type of schedule generation and review the details before proceeding.
              </p>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Type Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Generation Type</label>
              <div className="grid grid-cols-2 gap-3">
                {/* Regular Option */}
                <button
                  type="button"
                  onClick={() => handleSelectGenerationType('regular')}
                  className={cn(
                    "relative text-left rounded-xl border-2 p-4 transition-all duration-200 group cursor-pointer",
                    generationClassType === 'regular'
                      ? "border-blue-400 dark:border-blue-500 bg-gradient-to-br from-blue-50/90 to-sky-50/90 dark:from-blue-950/40 dark:to-sky-950/40 shadow-lg shadow-blue-500/10"
                      : "border-border bg-card hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md"
                  )}
                >
                  {generationClassType === 'regular' && (
                    <div className="absolute top-2 right-2">
                      <CheckCircle2 className="h-4 w-4 text-blue-500" />
                    </div>
                  )}
                  <div className="flex flex-col items-center text-center gap-2">
                    <div className={cn(
                      "rounded-lg p-2.5 text-white shadow-md transition-shadow",
                      generationClassType === 'regular'
                        ? "bg-gradient-to-br from-blue-500 to-sky-500 shadow-blue-500/25"
                        : "bg-muted"
                    )}>
                      <GraduationCap className="h-5 w-5" />
                    </div>
                    <h4 className="font-semibold text-sm text-foreground">Regular</h4>
                  </div>
                </button>

                {/* Executive Option */}
                <button
                  type="button"
                  onClick={() => handleSelectGenerationType('executive')}
                  className={cn(
                    "relative text-left rounded-xl border-2 p-4 transition-all duration-200 group cursor-pointer",
                    generationClassType === 'executive'
                      ? "border-amber-400 dark:border-amber-500 bg-gradient-to-br from-amber-50/90 to-orange-50/90 dark:from-amber-950/40 dark:to-orange-950/40 shadow-lg shadow-amber-500/10"
                      : "border-border bg-card hover:border-amber-300 dark:hover:border-amber-700 hover:shadow-md"
                  )}
                >
                  {generationClassType === 'executive' && (
                    <div className="absolute top-2 right-2">
                      <CheckCircle2 className="h-4 w-4 text-amber-500" />
                    </div>
                  )}
                  <div className="flex flex-col items-center text-center gap-2">
                    <div className={cn(
                      "rounded-lg p-2.5 text-white shadow-md transition-shadow",
                      generationClassType === 'executive'
                        ? "bg-gradient-to-br from-amber-500 to-orange-500 shadow-amber-500/25"
                        : "bg-muted"
                    )}>
                      <Award className="h-5 w-5" />
                    </div>
                    <h4 className="font-semibold text-sm text-foreground">Executive</h4>
                  </div>
                </button>
              </div>
            </div>

            {/* Dynamic Description Based on Selected Type */}
            <div className={cn(
              "rounded-xl border p-4 transition-all duration-300",
              generationClassType === 'regular'
                ? "border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50/60 to-sky-50/60 dark:from-blue-950/20 dark:to-sky-950/20"
                : "border-amber-200 dark:border-amber-800 bg-gradient-to-r from-amber-50/60 to-orange-50/60 dark:from-amber-950/20 dark:to-orange-950/20"
            )}>
              <AnimatePresence mode="wait">
                {generationClassType === 'regular' ? (
                  <motion.div
                    key="regular"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-3"
                  >
                    <div className="flex items-center gap-2">
                      <div className="rounded-md bg-gradient-to-br from-blue-500 to-sky-500 p-1.5 text-white">
                        <GraduationCap className="h-3.5 w-3.5" />
                      </div>
                      <h5 className="font-semibold text-sm text-foreground">Regular Schedule Generation</h5>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Generate schedules for <strong>regular sections only</strong>, using non-masteral faculty and non-executive subjects. Executive sections and their existing schedules remain untouched.
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100/80 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">Non-Masteral Faculty</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100/80 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">Regular Sections</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100/80 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">Non-Executive Subjects</span>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="executive"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-3"
                  >
                    <div className="flex items-center gap-2">
                      <div className="rounded-md bg-gradient-to-br from-amber-500 to-orange-500 p-1.5 text-white">
                        <Award className="h-3.5 w-3.5" />
                      </div>
                      <h5 className="font-semibold text-sm text-foreground">Executive Schedule Generation</h5>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Generate schedules for <strong>executive/masteral sections only</strong>, using faculty with &quot;Masteral&quot; specialization and executive-type subjects. Regular sections remain untouched. Uses separate executive semester settings.
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100/80 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">Masteral Faculty</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100/80 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">Executive Sections</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100/80 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">Executive Subjects</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* What Happens Section */}
            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <p className="text-sm font-medium">What happens when you proceed:</p>
              <ul className="text-sm text-muted-foreground space-y-1.5">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                  <span>Existing {generationClassType} schedules will be cleared</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                  <span>New schedules will be assigned based on faculty preferences</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                  <span>Conflicts will be detected and recorded</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                  <span>Faculty will be notified of their new assignments</span>
                </li>
              </ul>
            </div>

            <p className="text-xs text-muted-foreground">
              The system will check for preference conflicts before generation. Room assignment is optional and will be skipped if no rooms are available.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={confirmGeneration}
              className={cn(
                "bg-gradient-to-r text-white border-0 shadow-lg font-semibold",
                generationClassType === 'regular'
                  ? "from-blue-600 via-blue-500 to-sky-500 hover:from-blue-500 hover:via-blue-400 hover:to-sky-400 shadow-blue-500/20 hover:shadow-blue-500/30"
                  : "from-amber-600 via-amber-500 to-orange-500 hover:from-amber-500 hover:via-amber-400 hover:to-orange-400 shadow-amber-500/20 hover:shadow-amber-500/30"
              )}
              disabled={confirmCountdown > 0 || generating}
            >
              {generating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              {generating
                ? 'Generating...'
                : confirmCountdown > 0
                ? `Please wait ${confirmCountdown}s...`
                : `Generate ${generationClassType === 'regular' ? 'Regular' : 'Executive'} Schedules`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pre-generation Warning Dialog */}
      <AlertDialog open={showWarningDialog} onOpenChange={setShowWarningDialog}>
        <AlertDialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <AlertDialogHeader className="shrink-0">
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Schedule Generation Warnings
            </AlertDialogTitle>
          </AlertDialogHeader>
          <div className="flex-1 min-h-0 py-2">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                The following potential conflicts were detected. The system can still generate schedules, 
                but some faculty preferences may not be fully satisfied.
              </p>
              <ScrollArea className="h-[40vh] rounded-md border p-3">
                <AnimatePresence>
                  {preGenerationWarnings.map((warning, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={cn(
                        'p-3 rounded-lg mb-2 last:mb-0',
                        warning.severity === 'warning' 
                          ? 'bg-amber-500/10 border border-amber-500/20' 
                          : 'bg-blue-500/10 border border-blue-500/20'
                      )}
                    >
                      <div className="flex items-start gap-2">
                        {warning.severity === 'warning' ? (
                          <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                        ) : (
                          <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                        )}
                        <div>
                          <p className="text-sm font-medium">{warning.type.replace(/_/g, ' ')}</p>
                          <p className="text-sm text-muted-foreground">{warning.message}</p>
                          {warning.faculty && warning.faculty.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Affected: {warning.faculty.map(f => typeof f === 'string' ? f : f.name).join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </ScrollArea>
              <p className="text-sm text-muted-foreground">
                The scheduling algorithm will use load balancing and specialization matching 
                to resolve these conflicts automatically.
              </p>
            </div>
          </div>
          <AlertDialogFooter className="shrink-0">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeGeneration}
              className="bg-primary hover:bg-primary/90"
              disabled={warningCountdown > 0}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {warningCountdown > 0 ? `Please wait ${warningCountdown}s...` : 'Proceed with Generation'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </>
  );
}
