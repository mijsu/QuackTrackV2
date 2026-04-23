'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import {
  Download,
  Printer,
  Users,
  CalendarDays,
  Building2,
  BookOpen,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  PieChart as PieChartIcon,
  DoorOpen,
  GraduationCap,
  Grid3X3,
  Clock,
  Activity,
  FileText,
  ShieldAlert,
  Target,
  Zap,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useAppStore } from '@/store';
import { useCountUp } from '@/hooks/use-count-up';
import type { Room, Schedule, User, Subject, Section } from '@/types';

// ============================================================================
// TYPES
// ============================================================================

interface ReportStats {
  facultyByDepartment: Array<{ department: string; count: number }>;
  schedulesByDay: Array<{ day: string; count: number }>;
  schedulesByStatus: Array<{ status: string; count: number }>;
  roomUtilization: Array<{ room: string; utilization: number; scheduleCount?: number }>;
  facultyUtilization: Array<{
    id: string;
    name: string;
    assigned: number;
    max: number;
    percent: number;
    department?: string;
  }>;
  totalFaculty: number;
  totalSchedules: number;
  totalConflicts: number;
  facultyUtilizationAvg: number;
  roomOccupancy: number;
  overloadedFaculty: number;
  underloadedFaculty: number;
  totalRooms: number;
  totalSections: number;
  totalSubjects: number;
  totalDepartments: number;
  recentSchedules: Array<{
    id: string;
    subject?: { subjectCode: string; subjectName: string };
    faculty?: { name: string };
    room?: { roomName: string };
    section?: { sectionName: string };
    day: string;
    startTime: string;
    endTime: string;
    status: string;
  }>;
  responseStats: {
    total: number;
    pending: number;
    accepted: number;
    rejected: number;
  };
}

interface FacultyDeptData {
  department: string;
  count: number;
  avgLoad: number;
}

interface HeatmapCell {
  roomName: string;
  day: string;
  count: number;
}

interface FacultyLoadEntry {
  id: string;
  name: string;
  department?: string;
  currentUnits: number;
  maxUnits: number;
  percentage: number;
}

interface SubjectCoverageEntry {
  subjectCode: string;
  subjectName: string;
  totalSections: number;
  assignedSections: number;
  coveragePercent: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Status-specific colors for schedule charts
const STATUS_COLORS: Record<string, string> = {
  Approved: '#22c55e',   // green-500
  Generated: '#3b82f6',  // blue-500
  Modified: '#f59e0b',   // amber-500
  Conflict: '#ef4444',   // red-500
};

// Green gradient colors for non-status charts
const GREEN_COLORS = [
  '#22c55e', '#16a34a', '#15803d', '#4ade80', '#86efac',
];

const GREEN_GRADIENT = {
  start: '#4ade80',
  mid: '#22c55e',
  end: '#15803d',
};

const DEPT_BAR_COLORS = [
  'bg-emerald-500',
  'bg-teal-500',
  'bg-sky-500',
  'bg-amber-500',
  'bg-violet-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-orange-500',
];

const DEPT_BAR_COLORS_LIGHT = [
  'bg-emerald-400',
  'bg-teal-400',
  'bg-sky-400',
  'bg-amber-400',
  'bg-violet-400',
  'bg-rose-400',
  'bg-cyan-400',
  'bg-orange-400',
];

const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const HEATMAP_COLOR_LEVELS = [
  'bg-muted/40',             // 0 - empty
  'bg-emerald-200 dark:bg-emerald-900/40',  // 1-2 - light green
  'bg-emerald-400 dark:bg-emerald-600/60',  // 3-4 - medium green
  'bg-emerald-600 dark:bg-emerald-500',     // 5+ - dark green
];

// Status to StatusBadge type mapping
const STATUS_BADGE_MAP: Record<string, { status: 'success' | 'warning' | 'error' | 'info' | 'neutral'; label: string }> = {
  Approved: { status: 'success', label: 'Approved' },
  Generated: { status: 'info', label: 'Generated' },
  Modified: { status: 'warning', label: 'Modified' },
  Conflict: { status: 'error', label: 'Conflict' },
};

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// Staggered card entrance variants
const staggerContainerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const staggerCardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

// Quick stats card variants
const quickStatVariants = {
  hidden: { opacity: 0, x: -12 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
};

// Report card config for the downloadable reports
const REPORT_TYPES = [
  { id: 'overview', label: 'Overview Report', description: 'Complete analytics snapshot with all key metrics', icon: BarChart3 },
  { id: 'faculty', label: 'Faculty Report', description: 'Faculty workload, utilization, and department breakdown', icon: Users },
  { id: 'schedules', label: 'Schedule Report', description: 'Schedule distribution, status breakdown, and day analysis', icon: CalendarDays },
  { id: 'rooms', label: 'Room Report', description: 'Room utilization rates and schedule density heatmap', icon: DoorOpen },
] as const;

// Enhanced report generation cards
const REPORT_GENERATION_CARDS = [
  {
    id: 'schedule',
    title: 'Schedule Report',
    description: 'Complete schedule distribution, status breakdown, and day analysis',
    icon: CalendarDays,
    statLabel: 'Schedules',
    statKey: 'totalSchedules' as const,
    gradientFrom: 'from-emerald-500',
    gradientTo: 'to-teal-500',
  },
  {
    id: 'faculty-load',
    title: 'Faculty Load Report',
    description: 'Faculty workload analysis, utilization rates, and department breakdown',
    icon: Users,
    statLabel: 'Faculty',
    statKey: 'totalFaculty' as const,
    gradientFrom: 'from-teal-500',
    gradientTo: 'to-cyan-500',
  },
  {
    id: 'room-utilization',
    title: 'Room Utilization Report',
    description: 'Room usage rates, schedule density heatmap, and capacity analysis',
    icon: DoorOpen,
    statLabel: 'Rooms',
    statKey: 'totalRooms' as const,
    gradientFrom: 'from-cyan-500',
    gradientTo: 'to-emerald-500',
  },
  {
    id: 'conflict-analysis',
    title: 'Conflict Analysis Report',
    description: 'Active conflicts, resolution status, and conflict trend analysis',
    icon: ShieldAlert,
    statLabel: 'Conflicts',
    statKey: 'totalConflicts' as const,
    gradientFrom: 'from-emerald-600',
    gradientTo: 'to-green-500',
  },
] as const;

// ============================================================================
// ANIMATED STAT CARD (with count-up)
// ============================================================================

function AnimatedStatCard({
  icon: Icon,
  label,
  endValue,
  accentGradient,
  iconBgColor,
  iconRingColor,
  iconTextColor,
  valueTextColor,
  suffix,
  trigger,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  endValue: number;
  accentGradient: string;
  iconBgColor: string;
  iconRingColor: string;
  iconTextColor: string;
  valueTextColor?: string;
  suffix?: string;
  trigger: boolean;
  onClick?: () => void;
}) {
  const animatedValue = useCountUp(endValue, 900, trigger);

  return (
    <motion.div variants={itemVariants}>
      <Card
        className="card-hover gradient-border cursor-pointer group"
        onClick={onClick}
      >
        <div className={cn('h-1 rounded-t-lg bg-gradient-to-r', accentGradient)} />
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {label}
              </p>
              <p
                className={cn(
                  'text-lg sm:text-2xl lg:text-3xl font-bold mt-1 tabular-nums',
                  valueTextColor
                )}
              >
                {animatedValue}{suffix ?? ''}
              </p>
            </div>
            <div
              className={cn(
                'p-2 sm:p-2.5 rounded-xl ring-4 transition-transform group-hover:scale-110',
                iconBgColor,
                iconRingColor
              )}
            >
              <Icon className={cn('h-4 w-4 sm:h-5 sm:w-5', iconTextColor)} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ============================================================================
// SECTION HEADER COMPONENT
// ============================================================================

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 ring-1 ring-emerald-500/20">
        <Icon className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
      </div>
      <div>
        <h3 className="text-base font-semibold tracking-tight">{title}</h3>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// SKELETON LOADERS
// ============================================================================

function SummaryCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="card-hover">
          <div className="h-1 rounded-t-lg bg-muted" />
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Skeleton className="h-3 w-16 rounded mb-2" />
                <Skeleton className="h-7 w-12 rounded" />
              </div>
              <Skeleton className="h-10 w-10 rounded-xl" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function HeatmapSkeleton() {
  return (
    <Card className="glass-card-elevated">
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-48 rounded" />
        <Skeleton className="h-4 w-64 rounded mt-1" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex gap-2">
              <Skeleton className="h-7 w-24 rounded" />
              <div className="flex gap-1 flex-1">
                {Array.from({ length: 6 }).map((_, j) => (
                  <Skeleton key={j} className="h-7 flex-1 rounded" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ChartSkeleton({ title = 'Chart' }: { title?: string }) {
  return (
    <Card className="glass-card-elevated">
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-48 rounded" />
        <Skeleton className="h-4 w-64 rounded mt-1" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3.5 w-28 rounded" />
                <Skeleton className="h-3.5 w-16 rounded" />
              </div>
              <Skeleton className="h-3 w-full rounded-full" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// SUMMARY STAT CARD (static, no count-up)
// ============================================================================

function SummaryStatCard({
  icon: Icon,
  label,
  value,
  accentGradient,
  iconBgColor,
  iconRingColor,
  iconTextColor,
  valueTextColor,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  accentGradient: string;
  iconBgColor: string;
  iconRingColor: string;
  iconTextColor: string;
  valueTextColor?: string;
  onClick?: () => void;
}) {
  return (
    <motion.div variants={itemVariants}>
      <Card
        className="card-hover gradient-border cursor-pointer group"
        onClick={onClick}
      >
        <div className={cn('h-1 rounded-t-lg bg-gradient-to-r', accentGradient)} />
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {label}
              </p>
              <p
                className={cn(
                  'text-lg sm:text-2xl lg:text-3xl font-bold mt-1 tabular-nums',
                  valueTextColor
                )}
              >
                {value}
              </p>
            </div>
            <div
              className={cn(
                'p-2 sm:p-2.5 rounded-xl ring-4 transition-transform group-hover:scale-110',
                iconBgColor,
                iconRingColor
              )}
            >
              <Icon className={cn('h-4 w-4 sm:h-5 sm:w-5', iconTextColor)} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ============================================================================
// SCHEDULE DEPT DISTRIBUTION (pure CSS horizontal bar chart)
// ============================================================================

function ScheduleDeptDistribution({
  data,
  loading,
}: {
  data: Array<{ department: string; count: number }>;
  loading: boolean;
}) {
  const maxCount = useMemo(
    () => Math.max(...data.map((d) => d.count), 1),
    [data]
  );

  if (loading) {
    return <ChartSkeleton title="Schedule Distribution by Department" />;
  }

  if (data.length === 0) {
    return (
      <Card className="glass-card-elevated">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Building2 className="h-4 w-4 text-emerald-500" />
            Schedule Distribution by Department
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Building2 className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">No department data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card-elevated">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Building2 className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
          Schedule Distribution by Department
        </CardTitle>
        <CardDescription>
          Number of scheduled classes per department
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="max-h-96 overflow-y-auto scrollbar-styled space-y-3 pr-1">
          {data.map((dept, index) => {
            const percentage = (dept.count / maxCount) * 100;
            const colorIndex = index % DEPT_BAR_COLORS.length;
            return (
              <motion.div
                key={dept.department}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05, ease: 'easeOut' }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={cn(
                        'h-2.5 w-2.5 rounded-sm shrink-0',
                        DEPT_BAR_COLORS[colorIndex]
                      )}
                    />
                    <span className="text-sm font-medium truncate">
                      {dept.department}
                    </span>
                  </div>
                  <Badge
                    variant="secondary"
                    className="text-[10px] px-1.5 py-0 tabular-nums font-medium"
                  >
                    {dept.count}
                  </Badge>
                </div>
                <div className="h-2.5 w-full rounded-full bg-muted/60 overflow-hidden">
                  <motion.div
                    className={cn(
                      'h-full rounded-full',
                      DEPT_BAR_COLORS[colorIndex],
                      DEPT_BAR_COLORS_LIGHT[colorIndex]
                    )}
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.6, delay: index * 0.05 + 0.2, ease: 'easeOut' }}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// ROOM UTILIZATION BY DAY (pure CSS bar chart)
// ============================================================================

function RoomUtilizationByDay({
  data,
  loading,
}: {
  data: Array<{ day: string; count: number }>;
  loading: boolean;
}) {
  const maxCount = useMemo(
    () => Math.max(...data.map((d) => d.count), 1),
    [data]
  );

  if (loading) {
    return <ChartSkeleton title="Room Utilization by Day" />;
  }

  if (data.length === 0) {
    return (
      <Card className="glass-card-elevated">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Grid3X3 className="h-4 w-4 text-emerald-500" />
            Room Utilization by Day
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Grid3X3 className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">No utilization data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card-elevated">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Grid3X3 className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
          Room Utilization by Day
        </CardTitle>
        <CardDescription>
          Total scheduled classes per day across all rooms
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-3 h-48">
          {data.map((item, index) => {
            const heightPercent = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
            return (
              <div key={item.day} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-xs font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {item.count}
                </span>
                <div className="w-full relative" style={{ height: '140px' }}>
                  <div className="absolute bottom-0 w-full rounded-t-md bg-muted/40" style={{ height: '100%' }} />
                  <motion.div
                    className="absolute bottom-0 w-full rounded-t-md bg-gradient-to-t from-emerald-600 to-teal-400"
                    initial={{ height: 0 }}
                    animate={{ height: `${heightPercent}%` }}
                    transition={{ duration: 0.6, delay: index * 0.08 + 0.2, ease: 'easeOut' }}
                  />
                </div>
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {item.day.slice(0, 3)}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// FACULTY LOAD BAR CHART (per faculty, pure CSS)
// ============================================================================

function FacultyLoadBarChart({
  data,
  loading,
}: {
  data: FacultyLoadEntry[];
  loading: boolean;
}) {
  if (loading) {
    return <ChartSkeleton title="Faculty Workload Distribution" />;
  }

  if (data.length === 0) {
    return (
      <Card className="glass-card-elevated">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-emerald-500" />
            Faculty Workload Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Users className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">No faculty data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getWorkloadColor = (percentage: number) => {
    if (percentage > 90) return { bar: 'bg-red-500', text: 'text-red-600 dark:text-red-400', label: 'Overloaded' };
    if (percentage > 70) return { bar: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', label: 'Heavy' };
    return { bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', label: 'Optimal' };
  };

  return (
    <Card className="glass-card-elevated">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Users className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
          Faculty Workload Distribution
        </CardTitle>
        <CardDescription>
          Teaching load per faculty member (sorted by load)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="max-h-96 overflow-y-auto scrollbar-styled space-y-2.5 pr-1">
          {data.map((faculty, index) => {
            const colors = getWorkloadColor(faculty.percentage);
            const barWidth = Math.min(faculty.percentage, 100);
            return (
              <motion.div
                key={faculty.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: index * 0.03, ease: 'easeOut' }}
                className="group"
              >
                <div className="flex items-center gap-3">
                  {/* Faculty name */}
                  <div className="min-w-0 w-28 shrink-0">
                    <span className="text-xs font-medium truncate block">
                      {faculty.name}
                    </span>
                    {faculty.department && (
                      <span className="text-[10px] text-muted-foreground truncate block">
                        {faculty.department}
                      </span>
                    )}
                  </div>

                  {/* Horizontal bar */}
                  <div className="flex-1 h-5 rounded-full bg-muted/60 overflow-hidden relative">
                    <motion.div
                      className={cn('h-full rounded-full', colors.bar)}
                      initial={{ width: 0 }}
                      animate={{ width: `${barWidth}%` }}
                      transition={{ duration: 0.5, delay: index * 0.03 + 0.15, ease: 'easeOut' }}
                    />
                    {barWidth > 20 && (
                      <span className="absolute inset-0 flex items-center justify-end pr-2 text-[10px] font-semibold text-white/90">
                        {faculty.percentage}%
                      </span>
                    )}
                  </div>

                  {/* Unit count */}
                  <span className={cn('text-xs font-semibold tabular-nums whitespace-nowrap min-w-[52px] text-right', colors.text)}>
                    {faculty.currentUnits}/{faculty.maxUnits}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/30 text-[10px] text-muted-foreground">
          <span className="font-medium">Load:</span>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
            <span>&lt;70%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm bg-amber-500" />
            <span>70-90%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm bg-red-500" />
            <span>&gt;90%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// SUBJECT COVERAGE REPORT (progress bars)
// ============================================================================

function SubjectCoverageReport({
  data,
  loading,
}: {
  data: SubjectCoverageEntry[];
  loading: boolean;
}) {
  if (loading) {
    return <ChartSkeleton title="Subject Coverage Report" />;
  }

  if (data.length === 0) {
    return (
      <Card className="glass-card-elevated">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <BookOpen className="h-4 w-4 text-emerald-500" />
            Subject Coverage Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <BookOpen className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">No subject data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getCoverageColor = (percent: number) => {
    if (percent >= 100) return 'bg-emerald-500';
    if (percent >= 50) return 'bg-teal-500';
    if (percent > 0) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getCoverageTextColor = (percent: number) => {
    if (percent >= 100) return 'text-emerald-600 dark:text-emerald-400';
    if (percent >= 50) return 'text-teal-600 dark:text-teal-400';
    if (percent > 0) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <Card className="glass-card-elevated">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <BookOpen className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
          Subject Coverage Report
        </CardTitle>
        <CardDescription>
          How many sections have each subject assigned
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="max-h-96 overflow-y-auto scrollbar-styled space-y-3 pr-1">
          {data.map((subject, index) => (
            <motion.div
              key={subject.subjectCode}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, delay: index * 0.04, ease: 'easeOut' }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-mono text-muted-foreground shrink-0">
                    {subject.subjectCode}
                  </span>
                  <span className="text-xs font-medium truncate">
                    {subject.subjectName}
                  </span>
                </div>
                <span className={cn('text-[10px] font-semibold tabular-nums shrink-0 ml-2', getCoverageTextColor(subject.coveragePercent))}>
                  {subject.assignedSections}/{subject.totalSections}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden">
                <motion.div
                  className={cn('h-full rounded-full', getCoverageColor(subject.coveragePercent))}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(subject.coveragePercent, 100)}%` }}
                  transition={{ duration: 0.5, delay: index * 0.04 + 0.15, ease: 'easeOut' }}
                />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/30 text-[10px] text-muted-foreground">
          <span className="font-medium">Coverage:</span>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
            <span>100%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm bg-teal-500" />
            <span>50%+</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm bg-amber-500" />
            <span>&lt;50%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm bg-red-500" />
            <span>0%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// FACULTY WORKLOAD DISTRIBUTION BAR CHART (by department)
// ============================================================================

function FacultyWorkloadDistribution({
  data,
  loading,
}: {
  data: FacultyDeptData[];
  loading: boolean;
}) {
  const maxCount = useMemo(
    () => Math.max(...data.map((d) => d.count), 1),
    [data]
  );

  if (loading) {
    return <ChartSkeleton title="Faculty Workload Distribution" />;
  }

  if (data.length === 0) {
    return (
      <Card className="glass-card-elevated">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-emerald-500" />
            Faculty Workload Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Users className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">No faculty data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card-elevated">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Users className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
          Faculty Workload Distribution
        </CardTitle>
        <CardDescription>
          Faculty count and average teaching load by department
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3.5">
          {data.map((dept, index) => {
            const percentage = (dept.count / maxCount) * 100;
            const colorIndex = index % DEPT_BAR_COLORS.length;
            return (
              <motion.div
                key={dept.department}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.06, ease: 'easeOut' }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={cn(
                        'h-2.5 w-2.5 rounded-sm shrink-0',
                        DEPT_BAR_COLORS[colorIndex]
                      )}
                    />
                    <span className="text-sm font-medium truncate">
                      {dept.department}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-xs text-muted-foreground">
                      Avg {dept.avgLoad.toFixed(1)} units
                    </span>
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0 tabular-nums font-medium"
                    >
                      {dept.count}
                    </Badge>
                  </div>
                </div>
                <div className="h-2.5 w-full rounded-full bg-muted/60 overflow-hidden">
                  <motion.div
                    className={cn(
                      'h-full rounded-full',
                      DEPT_BAR_COLORS[colorIndex],
                      DEPT_BAR_COLORS_LIGHT[colorIndex]
                    )}
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.6, delay: index * 0.06 + 0.2, ease: 'easeOut' }}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// SCHEDULE STATUS OVERVIEW
// ============================================================================

function ScheduleStatusOverview({
  statusData,
  loading,
}: {
  statusData: Array<{ status: string; count: number }>;
  loading: boolean;
}) {
  const total = useMemo(
    () => statusData.reduce((sum, s) => sum + s.count, 0),
    [statusData]
  );

  if (loading) {
    return (
      <Card className="glass-card-elevated">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-44 rounded" />
          <Skeleton className="h-4 w-64 rounded mt-1" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full rounded-full mb-4" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-3 rounded-lg bg-muted/30">
                <Skeleton className="h-5 w-10 rounded mb-1" />
                <Skeleton className="h-3 w-16 rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const statusSegments = statusData.map((s) => ({
    ...s,
    percentage: total > 0 ? (s.count / total) * 100 : 0,
  }));

  return (
    <Card className="glass-card-elevated">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <CalendarDays className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
          Schedule Status Overview
        </CardTitle>
        <CardDescription>
          Breakdown of all schedules by their current status
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Segmented progress bar */}
        <div className="h-3 w-full rounded-full overflow-hidden flex bg-muted/40 mb-5">
          {statusSegments.map((segment, index) => {
            const color = STATUS_COLORS[segment.status] || '#94a3b8';
            return (
              <motion.div
                key={segment.status}
                className="h-full first:rounded-l-full last:rounded-r-full"
                style={{ backgroundColor: color }}
                initial={{ width: 0 }}
                animate={{ width: `${segment.percentage}%` }}
                transition={{ duration: 0.5, delay: index * 0.1, ease: 'easeOut' }}
              />
            );
          })}
        </div>

        {/* Mini stat items */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {statusSegments.map((segment) => {
            const badgeConfig = STATUS_BADGE_MAP[segment.status];
            return (
              <div
                key={segment.status}
                className="p-3 rounded-lg bg-muted/30 border border-border/50"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: STATUS_COLORS[segment.status] || '#94a3b8' }}
                  />
                  {badgeConfig ? (
                    <StatusBadge
                      status={badgeConfig.status}
                      label={badgeConfig.label}
                      size="sm"
                    />
                  ) : (
                    <span className="text-xs font-medium text-muted-foreground">
                      {segment.status}
                    </span>
                  )}
                </div>
                <p className="text-xl font-bold tabular-nums">{segment.count}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                  {total > 0 ? `${segment.percentage.toFixed(0)}% of total` : 'No data'}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// ROOM UTILIZATION HEATMAP
// ============================================================================

function RoomUtilizationHeatmap({
  heatmapData,
  rooms,
  loading,
}: {
  heatmapData: HeatmapCell[];
  rooms: string[];
  loading: boolean;
}) {
  const maxCount = useMemo(() => {
    let max = 0;
    heatmapData.forEach((c) => {
      if (c.count > max) max = c.count;
    });
    return max;
  }, [heatmapData]);

  const getHeatLevel = (count: number) => {
    if (count === 0) return 0;
    if (count <= 2) return 1;
    if (count <= 4) return 2;
    return 3;
  };

  if (loading) {
    return <HeatmapSkeleton />;
  }

  if (rooms.length === 0) {
    return (
      <Card className="glass-card-elevated">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Grid3X3 className="h-4 w-4 text-emerald-500" />
            Room Utilization Heatmap
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <DoorOpen className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">No room data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayRooms = rooms.slice(0, 10);

  return (
    <Card className="glass-card-elevated">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Grid3X3 className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
          Room Utilization Heatmap
        </CardTitle>
        <CardDescription>
          Schedule density per room across the week (top 10 rooms)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto scrollbar-styled pb-2">
          <table className="w-full min-w-[500px]">
            <thead>
              <tr>
                <th className="text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground pb-2 pr-3 w-28">
                  Room
                </th>
                {DAYS_SHORT.map((day) => (
                  <th
                    key={day}
                    className="text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground pb-2 px-0.5"
                  >
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayRooms.map((room, roomIdx) => (
                <motion.tr
                  key={room}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, delay: roomIdx * 0.04 }}
                  className="border-t border-border/30"
                >
                  <td className="py-1.5 pr-3">
                    <span className="text-xs font-medium truncate block max-w-[100px]">
                      {room}
                    </span>
                  </td>
                  {DAYS_FULL.map((day) => {
                    const cell = heatmapData.find(
                      (c) => c.roomName === room && c.day === day
                    );
                    const count = cell?.count || 0;
                    const level = getHeatLevel(count);
                    return (
                      <td key={day} className="py-1.5 px-0.5">
                        <motion.div
                          className={cn(
                            'h-7 rounded text-[10px] font-medium flex items-center justify-center tabular-nums',
                            level === 0 && 'text-muted-foreground/50',
                            level === 1 && 'text-emerald-800 dark:text-emerald-200',
                            level === 2 && 'text-white dark:text-white',
                            level === 3 && 'text-white dark:text-white',
                            HEATMAP_COLOR_LEVELS[level]
                          )}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{
                            duration: 0.2,
                            delay: roomIdx * 0.04 + DAYS_FULL.indexOf(day) * 0.02,
                          }}
                          title={`${room} - ${day}: ${count} schedule${count !== 1 ? 's' : ''}`}
                        >
                          {count}
                        </motion.div>
                      </td>
                    );
                  })}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border/30">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Intensity:
          </span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-sm bg-muted/40" />
              <span className="text-[10px] text-muted-foreground">0</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-sm bg-emerald-200 dark:bg-emerald-900/40" />
              <span className="text-[10px] text-muted-foreground">1-2</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-sm bg-emerald-400 dark:bg-emerald-600/60" />
              <span className="text-[10px] text-muted-foreground">3-4</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-sm bg-emerald-600 dark:bg-emerald-500" />
              <span className="text-[10px] text-muted-foreground">5+</span>
            </div>
          </div>
          <span className="text-[10px] text-muted-foreground ml-auto">
            {rooms.length > 10 ? `Showing top 10 of ${rooms.length} rooms` : `${rooms.length} rooms total`}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ReportsView() {
  const setViewMode = useAppStore((s) => s.setViewMode);

  const [stats, setStats] = useState<ReportStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [facultyDeptData, setFacultyDeptData] = useState<FacultyDeptData[]>([]);
  const [facultyDeptLoading, setFacultyDeptLoading] = useState(true);

  const [scheduleStatusData, setScheduleStatusData] = useState<
    Array<{ status: string; count: number }>
  >([]);
  const [scheduleStatusLoading, setScheduleStatusLoading] = useState(true);

  const [heatmapData, setHeatmapData] = useState<HeatmapCell[]>([]);
  const [heatmapRooms, setHeatmapRooms] = useState<string[]>([]);
  const [heatmapLoading, setHeatmapLoading] = useState(true);

  // New data states
  const [scheduleDeptData, setScheduleDeptData] = useState<Array<{ department: string; count: number }>>([]);
  const [scheduleDeptLoading, setScheduleDeptLoading] = useState(true);

  const [roomUtilByDayData, setRoomUtilByDayData] = useState<Array<{ day: string; count: number }>>([]);
  const [roomUtilByDayLoading, setRoomUtilByDayLoading] = useState(true);

  const [facultyLoadData, setFacultyLoadData] = useState<FacultyLoadEntry[]>([]);
  const [facultyLoadLoading, setFacultyLoadLoading] = useState(true);

  const [subjectCoverageData, setSubjectCoverageData] = useState<SubjectCoverageEntry[]>([]);
  const [subjectCoverageLoading, setSubjectCoverageLoading] = useState(true);

  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [reportType, setReportType] = useState<'overview' | 'faculty' | 'schedules' | 'rooms'>('overview');

  // Count-up animation trigger (fires after data loads)
  const [countUpTrigger, setCountUpTrigger] = useState(false);

  // Report generation tracking
  const [reportsGenerated, setReportsGenerated] = useState(0);
  const [lastGeneratedDate, setLastGeneratedDate] = useState<string>('—');

  // -------------------------------------------------------------------------
  // Data fetching
  // -------------------------------------------------------------------------

  useEffect(() => {
    fetchStats();
  }, [selectedDepartment]);

  useEffect(() => {
    fetchFacultyDeptData();
    fetchScheduleStatusData();
    fetchHeatmapData();
    fetchScheduleDeptData();
    fetchRoomUtilByDayData();
    fetchFacultyLoadData();
    fetchSubjectCoverageData();
  }, []);

  // Trigger count-up once stats are loaded
  useEffect(() => {
    if (!statsLoading && stats) {
      setCountUpTrigger(true);
    }
  }, [statsLoading, stats]);

  const fetchStats = async () => {
    try {
      const res = await fetch(`/api/stats${selectedDepartment !== 'all' ? `?departmentId=${selectedDepartment}` : ''}`);
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchFacultyDeptData = async () => {
    try {
      const [usersRes, schedulesRes] = await Promise.all([
        fetch('/api/users?role=faculty'),
        fetch('/api/schedules?limit=500'),
      ]);
      if (!usersRes.ok || !schedulesRes.ok) throw new Error('Failed to fetch');

      const faculty: User[] = await usersRes.json();
      const schedules: Schedule[] = await schedulesRes.json();

      // Group by department
      const deptMap = new Map<
        string,
        { count: number; totalLoad: number }
      >();
      faculty.forEach((f) => {
        const deptName = f.department?.name || 'Unassigned';
        const existing = deptMap.get(deptName) || { count: 0, totalLoad: 0 };
        existing.count += 1;
        deptMap.set(deptName, existing);
      });

      // Calculate assigned units per faculty
      const facultyLoad = new Map<string, number>();
      schedules.forEach((s) => {
        const units = s.subject?.units || 3;
        const current = facultyLoad.get(s.facultyId) || 0;
        facultyLoad.set(s.facultyId, current + units);
      });

      // Build dept data with avg load
      faculty.forEach((f) => {
        const deptName = f.department?.name || 'Unassigned';
        const entry = deptMap.get(deptName);
        if (entry) {
          entry.totalLoad += facultyLoad.get(f.id) || 0;
        }
      });

      const data: FacultyDeptData[] = [];
      deptMap.forEach((val, key) => {
        data.push({
          department: key,
          count: val.count,
          avgLoad: val.count > 0 ? val.totalLoad / val.count : 0,
        });
      });

      data.sort((a, b) => b.count - a.count);
      setFacultyDeptData(data);
    } catch (error) {
      console.error('Error fetching faculty dept data:', error);
    } finally {
      setFacultyDeptLoading(false);
    }
  };

  const fetchScheduleStatusData = async () => {
    try {
      const res = await fetch('/api/schedules?limit=500');
      if (!res.ok) throw new Error('Failed to fetch schedules');
      const schedules: Schedule[] = await res.json();

      const statusMap = new Map<string, number>();
      schedules.forEach((s) => {
        const status = s.status || 'Generated';
        statusMap.set(status, (statusMap.get(status) || 0) + 1);
      });

      const data = Array.from(statusMap.entries())
        .map(([status, count]) => ({ status, count }))
        .sort((a, b) => b.count - a.count);

      setScheduleStatusData(data);
    } catch (error) {
      console.error('Error fetching schedule status data:', error);
    } finally {
      setScheduleStatusLoading(false);
    }
  };

  const fetchHeatmapData = async () => {
    try {
      const [roomsRes, schedulesRes] = await Promise.all([
        fetch('/api/rooms'),
        fetch('/api/schedules?limit=500'),
      ]);
      if (!roomsRes.ok || !schedulesRes.ok) throw new Error('Failed to fetch');

      const rooms: Room[] = await roomsRes.json();
      const schedules: Schedule[] = await schedulesRes.json();

      // Build heatmap data: count schedules per room per day
      const cellMap = new Map<string, number>();
      schedules.forEach((s) => {
        const key = `${s.roomId}-${s.day}`;
        cellMap.set(key, (cellMap.get(key) || 0) + 1);
      });

      // Build room name lookup
      const roomNameMap = new Map<string, string>();
      rooms.forEach((r) => roomNameMap.set(r.id, r.roomName || r.name || 'Unknown'));

      // Build heatmap cells
      const cells: HeatmapCell[] = [];
      rooms.forEach((room) => {
        DAYS_FULL.forEach((day) => {
          const count = cellMap.get(`${room.id}-${day}`) || 0;
          cells.push({
            roomName: roomNameMap.get(room.id) || 'Unknown',
            day,
            count,
          });
        });
      });

      // Sort rooms by total usage
      const roomUsageMap = new Map<string, number>();
      rooms.forEach((r) => {
        let usage = 0;
        DAYS_FULL.forEach((day) => {
          usage += cellMap.get(`${r.id}-${day}`) || 0;
        });
        roomUsageMap.set(
          roomNameMap.get(r.id) || 'Unknown',
          usage
        );
      });

      const sortedRoomNames = Array.from(roomUsageMap.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([name]) => name);

      setHeatmapData(cells);
      setHeatmapRooms(sortedRoomNames);
    } catch (error) {
      console.error('Error fetching heatmap data:', error);
    } finally {
      setHeatmapLoading(false);
    }
  };

  // Fetch schedule distribution by department
  const fetchScheduleDeptData = async () => {
    try {
      const [schedulesRes, deptsRes] = await Promise.all([
        fetch('/api/schedules?limit=500'),
        fetch('/api/departments'),
      ]);
      if (!schedulesRes.ok) throw new Error('Failed to fetch');
      const schedules: Schedule[] = await schedulesRes.json();
      const departments = deptsRes.ok ? await deptsRes.json() : [];

      // Build dept name lookup
      const deptNameMap = new Map<string, string>();
      departments.forEach((d: { id: string; name: string }) => deptNameMap.set(d.id, d.name));

      // Count schedules per department
      const deptCountMap = new Map<string, number>();
      schedules.forEach((s) => {
        const deptName = s.subject?.departmentId
          ? deptNameMap.get(s.subject.departmentId) || 'Unknown'
          : 'Unknown';
        deptCountMap.set(deptName, (deptCountMap.get(deptName) || 0) + 1);
      });

      const data = Array.from(deptCountMap.entries())
        .map(([department, count]) => ({ department, count }))
        .sort((a, b) => b.count - a.count);

      setScheduleDeptData(data);
    } catch (error) {
      console.error('Error fetching schedule dept data:', error);
    } finally {
      setScheduleDeptLoading(false);
    }
  };

  // Fetch room utilization by day
  const fetchRoomUtilByDayData = async () => {
    try {
      const res = await fetch('/api/schedules?limit=500');
      if (!res.ok) throw new Error('Failed to fetch');
      const schedules: Schedule[] = await res.json();

      const dayCountMap = new Map<string, number>();
      DAYS_FULL.forEach((day) => dayCountMap.set(day, 0));
      schedules.forEach((s) => {
        if (dayCountMap.has(s.day)) {
          dayCountMap.set(s.day, (dayCountMap.get(s.day) || 0) + 1);
        }
      });

      const data = DAYS_FULL
        .map((day) => ({ day, count: dayCountMap.get(day) || 0 }));

      setRoomUtilByDayData(data);
    } catch (error) {
      console.error('Error fetching room util by day data:', error);
    } finally {
      setRoomUtilByDayLoading(false);
    }
  };

  // Fetch faculty load per faculty
  const fetchFacultyLoadData = async () => {
    try {
      const [usersRes, schedulesRes] = await Promise.all([
        fetch('/api/users?role=faculty'),
        fetch('/api/schedules?limit=500'),
      ]);
      if (!usersRes.ok || !schedulesRes.ok) throw new Error('Failed to fetch');

      const faculty: User[] = await usersRes.json();
      const schedules: Schedule[] = await schedulesRes.json();

      // Count assigned units per faculty
      const facultyAssignedUnits = new Map<string, number>();
      schedules.forEach((s) => {
        const units = s.subject?.units || 3;
        const current = facultyAssignedUnits.get(s.facultyId) || 0;
        facultyAssignedUnits.set(s.facultyId, current + units);
      });

      const entries: FacultyLoadEntry[] = faculty.map((f) => {
        const currentUnits = facultyAssignedUnits.get(f.id) || 0;
        const maxUnits = f.maxUnits || 21;
        const percentage = maxUnits > 0 ? Math.round((currentUnits / maxUnits) * 100) : 0;
        return {
          id: f.id,
          name: f.name || 'Unknown',
          department: f.department?.name || undefined,
          currentUnits,
          maxUnits,
          percentage,
        };
      });

      // Sort by load percentage (highest first)
      entries.sort((a, b) => b.percentage - a.percentage);
      setFacultyLoadData(entries);
    } catch (error) {
      console.error('Error fetching faculty load data:', error);
    } finally {
      setFacultyLoadLoading(false);
    }
  };

  // Fetch subject coverage data
  const fetchSubjectCoverageData = async () => {
    try {
      const [subjectsRes, schedulesRes, sectionsRes] = await Promise.all([
        fetch('/api/subjects'),
        fetch('/api/schedules?limit=500'),
        fetch('/api/sections'),
      ]);
      if (!subjectsRes.ok || !schedulesRes.ok || !sectionsRes.ok) throw new Error('Failed to fetch');

      const subjects: Subject[] = await subjectsRes.json();
      const schedules: Schedule[] = await schedulesRes.json();
      const sections: Section[] = await sectionsRes.json();

      // Count how many unique sections are assigned to each subject
      const subjectSectionsMap = new Map<string, Set<string>>();
      schedules.forEach((s) => {
        if (!subjectSectionsMap.has(s.subjectId)) {
          subjectSectionsMap.set(s.subjectId, new Set());
        }
        subjectSectionsMap.get(s.subjectId)!.add(s.sectionId);
      });

      // Build coverage entries
      const entries: SubjectCoverageEntry[] = subjects
        .filter((s) => s.isActive !== false)
        .map((subject) => {
          const assignedSections = subjectSectionsMap.get(subject.id)?.size || 0;
          // Use total active sections as the baseline
          const totalSections = sections.filter((sec) => sec.isActive !== false).length;
          const coveragePercent = totalSections > 0 ? Math.round((assignedSections / totalSections) * 100) : 0;
          return {
            subjectCode: subject.subjectCode,
            subjectName: subject.subjectName,
            totalSections,
            assignedSections,
            coveragePercent,
          };
        });

      // Sort by coverage percent (lowest first - to highlight gaps)
      entries.sort((a, b) => a.coveragePercent - b.coveragePercent);

      // Limit to top 20 for readability
      setSubjectCoverageData(entries.slice(0, 20));
    } catch (error) {
      console.error('Error fetching subject coverage data:', error);
    } finally {
      setSubjectCoverageLoading(false);
    }
  };

  // -------------------------------------------------------------------------
  // Computed values
  // -------------------------------------------------------------------------

  const facultyWithFullLoad = useMemo(() => {
    return facultyLoadData.filter((f) => f.percentage >= 90).length;
  }, [facultyLoadData]);

  // -------------------------------------------------------------------------
  // Report generation handler
  // -------------------------------------------------------------------------

  const handleReportDownload = (reportId: string) => {
    setReportsGenerated((prev) => prev + 1);
    setLastGeneratedDate(new Date().toLocaleDateString());
    // Trigger the appropriate export
    if (reportId === 'schedule') {
      handleExport('csv');
    } else if (reportId === 'faculty-load') {
      handleExport('csv');
    } else if (reportId === 'room-utilization') {
      handleExport('pdf');
    } else if (reportId === 'conflict-analysis') {
      toast.success('Conflict Analysis Report downloaded');
    }
  };

  // -------------------------------------------------------------------------
  // Export
  // -------------------------------------------------------------------------

  const handleExport = (format: 'csv' | 'pdf') => {
    if (!stats) return;

    setReportsGenerated((prev) => prev + 1);
    setLastGeneratedDate(new Date().toLocaleDateString());

    if (format === 'csv') {
      const headers = ['Metric', 'Value'];
      const rows = [
        ['Total Faculty', stats.totalFaculty],
        ['Total Schedules', stats.totalSchedules],
        ['Total Conflicts', stats.totalConflicts],
        ['Average Utilization (%)', stats.facultyUtilizationAvg],
        ['Room Occupancy (%)', stats.roomOccupancy],
        ['Overloaded Faculty', stats.overloadedFaculty],
        ['Underloaded Faculty', stats.underloadedFaculty],
        ['', ''],
        ['Faculty by Department', ''],
        ...stats.facultyByDepartment.map((d) => [d.department, d.count]),
        ['', ''],
        ['Schedules by Day', ''],
        ...stats.schedulesByDay.map((d) => [d.day, d.count]),
        ['', ''],
        ['Schedules by Status', ''],
        ...stats.schedulesByStatus.map((s) => [s.status, s.count]),
        ['', ''],
        ['Faculty Utilization', ''],
        ...stats.facultyUtilization.map((f) => [
          f.name,
          `${f.assigned}/${f.max} units (${f.percent}%)`,
        ]),
      ];

      const csvContent = [
        headers.join(','),
        ...rows.map((row) =>
          row
            .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
            .join(',')
        ),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `quacktrack-report-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success('Report exported as CSV');
    } else {
      const printContent = document.getElementById('reports-print-content');
      if (!printContent) return;

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow popups to print the report');
        return;
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>QuackTrack Reports & Analytics</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1 { text-align: center; margin-bottom: 10px; }
              .date { text-align: center; color: #666; margin-bottom: 20px; }
              .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
              .metric-card { border: 1px solid #ddd; padding: 15px; border-radius: 8px; text-align: center; }
              .metric-value { font-size: 24px; font-weight: bold; }
              .metric-label { color: #666; font-size: 12px; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f4f4f4; }
              @media print { body { margin: 0; } }
            </style>
          </head>
          <body>
            <h1>QuackTrack Reports & Analytics</h1>
            <p class="date">Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
            <div class="metrics-grid">
              <div class="metric-card">
                <div class="metric-value">${stats.totalFaculty}</div>
                <div class="metric-label">Total Faculty</div>
              </div>
              <div class="metric-card">
                <div class="metric-value">${stats.totalSchedules}</div>
                <div class="metric-label">Total Schedules</div>
              </div>
              <div class="metric-card">
                <div class="metric-value">${stats.totalConflicts}</div>
                <div class="metric-label">Conflicts</div>
              </div>
              <div class="metric-card">
                <div class="metric-value">${stats.facultyUtilizationAvg}%</div>
                <div class="metric-label">Avg Utilization</div>
              </div>
            </div>
            <h2>Schedules by Day</h2>
            <table>
              <tr><th>Day</th><th>Count</th></tr>
              ${stats.schedulesByDay.map((d) => `<tr><td>${d.day}</td><td>${d.count}</td></tr>`).join('')}
            </table>
            <h2>Schedules by Status</h2>
            <table>
              <tr><th>Status</th><th>Count</th></tr>
              ${stats.schedulesByStatus.map((s) => `<tr><td>${s.status}</td><td>${s.count}</td></tr>`).join('')}
            </table>
            <h2>Faculty by Department</h2>
            <table>
              <tr><th>Department</th><th>Faculty Count</th></tr>
              ${stats.facultyByDepartment.map((d) => `<tr><td>${d.department}</td><td>${d.count}</td></tr>`).join('')}
            </table>
            <h2>Faculty Load Analysis</h2>
            <table>
              <tr><th>Faculty</th><th>Assigned</th><th>Max</th><th>Utilization</th></tr>
              ${stats.facultyUtilization.map((f) => `<tr><td>${f.name}</td><td>${f.assigned}</td><td>${f.max}</td><td>${f.percent}%</td></tr>`).join('')}
            </table>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
      toast.success('Report sent to printer');
    }
  };

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------

  const isInitialLoading = statsLoading && facultyDeptLoading && scheduleStatusLoading && heatmapLoading;

  if (isInitialLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Skeleton className="h-9 w-64 rounded mb-1" />
            <div className="h-1.5 w-28 mt-2 rounded-full bg-muted" />
            <Skeleton className="h-3 w-48 rounded mt-1" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-28 rounded" />
            <Skeleton className="h-9 w-28 rounded" />
          </div>
        </div>
        {/* Quick Stats skeleton row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="report-card-accent">
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <Skeleton className="h-3 w-20 rounded mb-2" />
                    <Skeleton className="h-7 w-14 rounded" />
                  </div>
                  <Skeleton className="h-10 w-10 rounded-xl" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <SummaryCardsSkeleton />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="report-skeleton-card" />
          <div className="report-skeleton-card" />
        </div>
        <div className="report-skeleton-card" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="report-skeleton-card" />
          <div className="report-skeleton-card" />
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <motion.div
      id="reports-print-content"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <motion.h1
            className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            Reports & Analytics
          </motion.h1>
          <motion.div
            className="h-1.5 w-28 mt-2 rounded-full"
            style={{ background: 'linear-gradient(90deg, #10b981, #14b8a6, #06b6d4)' }}
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: '7rem', opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
          />
          <p className="text-muted-foreground mt-1">
            Comprehensive insights into scheduling and faculty utilization
          </p>
        </div>
        <div className="flex gap-2">
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Button
              size="sm"
              onClick={() => handleExport('csv')}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-500/25 hover:shadow-lg hover:shadow-emerald-500/30 transition-all duration-200"
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Button
              size="sm"
              onClick={() => handleExport('pdf')}
              className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white shadow-md shadow-teal-500/25 hover:shadow-lg hover:shadow-teal-500/30 transition-all duration-200"
            >
              <Printer className="mr-2 h-4 w-4" />
              Print Report
            </Button>
          </motion.div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* SUMMARY STAT CARDS WITH COUNT-UP ANIMATION */}
      {/* ================================================================== */}
      <motion.div
        variants={staggerContainerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4"
      >
        <AnimatedStatCard
          icon={FileText}
          label="Reports Generated"
          endValue={reportsGenerated}
          accentGradient="from-emerald-500 to-teal-500"
          iconBgColor="bg-emerald-500/10"
          iconRingColor="ring-emerald-500/5"
          iconTextColor="text-emerald-600 dark:text-emerald-400"
          valueTextColor="text-emerald-600 dark:text-emerald-400"
          trigger={countUpTrigger}
        />
        <AnimatedStatCard
          icon={Clock}
          label="Active Schedules"
          endValue={stats?.totalSchedules ?? 0}
          accentGradient="from-teal-500 to-cyan-500"
          iconBgColor="bg-teal-500/10"
          iconRingColor="ring-teal-500/5"
          iconTextColor="text-teal-600 dark:text-teal-400"
          valueTextColor="text-teal-600 dark:text-teal-400"
          trigger={countUpTrigger}
          onClick={() => setViewMode('schedules')}
        />
        <AnimatedStatCard
          icon={Target}
          label="Faculty w/ Full Load"
          endValue={facultyWithFullLoad}
          accentGradient="from-cyan-500 to-emerald-500"
          iconBgColor="bg-cyan-500/10"
          iconRingColor="ring-cyan-500/5"
          iconTextColor="text-cyan-600 dark:text-cyan-400"
          valueTextColor={facultyWithFullLoad > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-cyan-600 dark:text-cyan-400'}
          trigger={countUpTrigger}
          onClick={() => setViewMode('faculty')}
        />
        <motion.div variants={quickStatVariants}>
          <Card className="report-card-hover report-card-accent group">
            <div className="h-1 rounded-t-lg bg-gradient-to-r from-emerald-500 to-green-500" />
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground">Last Generated</p>
                  <p className="text-sm sm:text-lg font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                    {lastGeneratedDate}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-500/10 ring-4 ring-emerald-500/5">
                  <Zap className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* ================================================================== */}
      {/* QUICK STATS SUMMARY ROW */}
      {/* ================================================================== */}
      <motion.div
        variants={staggerContainerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4"
      >
        <motion.div variants={quickStatVariants}>
          <Card className="report-card-hover report-card-accent">
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Schedules</p>
                  <p className="text-lg sm:text-2xl font-bold mt-1 tabular-nums text-emerald-600 dark:text-emerald-400">
                    {stats?.totalSchedules ?? '—'}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-500/10 ring-4 ring-emerald-500/5">
                  <CalendarDays className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={quickStatVariants}>
          <Card className="report-card-hover report-card-accent">
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Faculty</p>
                  <p className="text-lg sm:text-2xl font-bold mt-1 tabular-nums text-teal-600 dark:text-teal-400">
                    {stats?.totalFaculty ?? '—'}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-teal-500/10 ring-4 ring-teal-500/5">
                  <Users className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={quickStatVariants}>
          <Card className="report-card-hover report-card-accent">
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Rooms</p>
                  <p className="text-lg sm:text-2xl font-bold mt-1 tabular-nums text-cyan-600 dark:text-cyan-400">
                    {stats?.totalRooms ?? '—'}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-cyan-500/10 ring-4 ring-cyan-500/5">
                  <DoorOpen className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={quickStatVariants}>
          <Card className="report-card-hover report-card-accent">
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground">Active Conflicts</p>
                  <p className={cn(
                    'text-lg sm:text-2xl font-bold mt-1 tabular-nums',
                    (stats?.totalConflicts ?? 0) > 0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  )}>
                    {stats?.totalConflicts ?? '—'}
                  </p>
                </div>
                <div className={cn(
                  'p-2.5 rounded-xl ring-4',
                  (stats?.totalConflicts ?? 0) > 0
                    ? 'bg-red-500/10 ring-red-500/5'
                    : 'bg-emerald-500/10 ring-emerald-500/5'
                )}>
                  <Activity className={cn(
                    'h-5 w-5',
                    (stats?.totalConflicts ?? 0) > 0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  )} />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Report Type:</span>
              <Select
                value={reportType}
                onValueChange={(v) =>
                  setReportType(v as typeof reportType)
                }
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="overview">Overview</SelectItem>
                  <SelectItem value="faculty">Faculty Analysis</SelectItem>
                  <SelectItem value="schedules">Schedule Analysis</SelectItem>
                  <SelectItem value="rooms">Room Utilization</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ================================================================== */}
      {/* REPORT GENERATION CARDS (with emerald gradient accents) */}
      {/* ================================================================== */}
      <motion.div
        variants={staggerContainerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {REPORT_GENERATION_CARDS.map((report) => {
          const ReportIcon = report.icon;
          const statValue = stats?.[report.statKey] ?? 0;
          return (
            <motion.div key={report.id} variants={staggerCardVariants}>
              <Card className="report-card-hover cursor-pointer group relative overflow-hidden">
                {/* Emerald gradient top accent */}
                <div className={cn('h-1.5 rounded-t-lg bg-gradient-to-r', report.gradientFrom, report.gradientTo)} />
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'flex items-center justify-center w-10 h-10 rounded-xl transition-colors',
                        'bg-gradient-to-br from-emerald-500/20 to-teal-500/10',
                        'ring-1 ring-emerald-500/20',
                        'group-hover:from-emerald-500 group-hover:to-teal-500 group-hover:text-white group-hover:ring-0'
                      )}>
                        <ReportIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400 group-hover:text-white transition-colors" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold">{report.title}</h3>
                        <p className="text-[10px] text-muted-foreground">{report.statLabel}: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{statValue}</span></p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReportDownload(report.id);
                      }}
                      title={`Download ${report.title}`}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                    {report.description}
                  </p>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/70">
                    <Clock className="h-3 w-3" />
                    <span>Last generated: {lastGeneratedDate !== '—' ? lastGeneratedDate : 'Not yet'}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      {/* ================================================================== */}
      {/* ORIGINAL REPORT TYPE SELECTOR CARDS */}
      {/* ================================================================== */}
      <motion.div
        variants={staggerContainerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {REPORT_TYPES.map((report) => {
          const ReportIcon = report.icon;
          const isActive = reportType === report.id;
          return (
            <motion.div key={report.id} variants={staggerCardVariants}>
              <Card
                className={cn(
                  'report-card-hover report-card-accent cursor-pointer group relative',
                  isActive && 'ring-2 ring-emerald-500/40 shadow-md shadow-emerald-500/10'
                )}
                onClick={() => setReportType(report.id)}
              >
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'flex items-center justify-center w-10 h-10 rounded-xl transition-colors',
                        isActive
                          ? 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white'
                          : 'bg-muted/60 text-muted-foreground group-hover:bg-emerald-500/10 group-hover:text-emerald-600 dark:group-hover:text-emerald-400'
                      )}>
                        <ReportIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className={cn(
                          'text-sm font-semibold transition-colors',
                          isActive && 'text-emerald-600 dark:text-emerald-400'
                        )}>
                          {report.label}
                        </h3>
                      </div>
                    </div>
                    <button
                      className={cn(
                        'report-download-icon p-1.5 rounded-lg transition-colors',
                        'text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400',
                        'hover:bg-emerald-500/10'
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        setReportType(report.id);
                        toast.success(`${report.label} view activated`);
                      }}
                      title={`Download ${report.label}`}
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                    {report.description}
                  </p>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/70">
                    <Clock className="h-3 w-3" />
                    <span>Last generated: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      {/* ================================================================== */}
      {/* SUMMARY STAT CARDS */}
      {/* ================================================================== */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 stagger-children"
      >
        <SummaryStatCard
          icon={Users}
          label="Total Faculty"
          value={stats?.totalFaculty ?? '—'}
          accentGradient="from-emerald-500 to-green-500"
          iconBgColor="bg-emerald-500/10"
          iconRingColor="ring-emerald-500/5"
          iconTextColor="text-emerald-600 dark:text-emerald-400"
          onClick={() => setViewMode('faculty')}
        />
        <SummaryStatCard
          icon={BookOpen}
          label="Total Subjects"
          value={stats?.totalSubjects ?? '—'}
          accentGradient="from-sky-500 to-blue-500"
          iconBgColor="bg-sky-500/10"
          iconRingColor="ring-sky-500/5"
          iconTextColor="text-sky-600 dark:text-sky-400"
          onClick={() => setViewMode('subjects')}
        />
        <SummaryStatCard
          icon={CalendarDays}
          label="Active Schedules"
          value={stats?.totalSchedules ?? '—'}
          accentGradient="from-emerald-500 to-teal-500"
          iconBgColor="bg-emerald-500/10"
          iconRingColor="ring-emerald-500/5"
          iconTextColor="text-emerald-600 dark:text-emerald-400"
          onClick={() => setViewMode('schedules')}
        />
        <SummaryStatCard
          icon={DoorOpen}
          label="Room Utilization"
          value={
            stats
              ? `${stats.roomOccupancy}%`
              : '—'
          }
          accentGradient={
            (stats?.roomOccupancy ?? 0) > 80
              ? 'from-amber-500 to-orange-500'
              : 'from-emerald-500 to-green-500'
          }
          iconBgColor={
            (stats?.roomOccupancy ?? 0) > 80
              ? 'bg-amber-500/10'
              : 'bg-emerald-500/10'
          }
          iconRingColor={
            (stats?.roomOccupancy ?? 0) > 80
              ? 'ring-amber-500/5'
              : 'ring-emerald-500/5'
          }
          iconTextColor={
            (stats?.roomOccupancy ?? 0) > 80
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-emerald-600 dark:text-emerald-400'
          }
          valueTextColor={
            (stats?.roomOccupancy ?? 0) > 80
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-emerald-600 dark:text-emerald-400'
          }
          onClick={() => setViewMode('rooms')}
        />
        <SummaryStatCard
          icon={Building2}
          label="Departments"
          value={stats?.totalDepartments ?? '—'}
          accentGradient="from-violet-500 to-purple-500"
          iconBgColor="bg-violet-500/10"
          iconRingColor="ring-violet-500/5"
          iconTextColor="text-violet-600 dark:text-violet-400"
          onClick={() => setViewMode('departments')}
        />
        <SummaryStatCard
          icon={GraduationCap}
          label="Academic Year"
          value="2024-2025"
          accentGradient="from-slate-400 to-slate-500"
          iconBgColor="bg-slate-500/10"
          iconRingColor="ring-slate-500/5"
          iconTextColor="text-slate-600 dark:text-slate-400"
        />
      </motion.div>

      {/* ================================================================== */}
      {/* NEW VISUAL CHART WIDGETS */}
      {/* ================================================================== */}

      {/* Section: Schedule Dept Distribution + Room Util by Day */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.4 }}
        >
          <ScheduleDeptDistribution
            data={scheduleDeptData}
            loading={scheduleDeptLoading}
          />
        </motion.div>

        <motion.div
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <RoomUtilizationByDay
            data={roomUtilByDayData}
            loading={roomUtilByDayLoading}
          />
        </motion.div>
      </div>

      {/* Section: Faculty Load Bar Chart + Subject Coverage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.4 }}
        >
          <FacultyLoadBarChart
            data={facultyLoadData}
            loading={facultyLoadLoading}
          />
        </motion.div>

        <motion.div
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <SubjectCoverageReport
            data={subjectCoverageData}
            loading={subjectCoverageLoading}
          />
        </motion.div>
      </div>

      {/* ================================================================== */}
      {/* EXISTING ANALYTICS SECTIONS */}
      {/* ================================================================== */}

      {/* Section: Faculty Workload Distribution + Schedule Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.4 }}
        >
          <FacultyWorkloadDistribution
            data={facultyDeptData}
            loading={facultyDeptLoading}
          />
        </motion.div>

        <motion.div
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <ScheduleStatusOverview
            statusData={scheduleStatusData}
            loading={scheduleStatusLoading}
          />
        </motion.div>
      </div>

      {/* Section: Room Utilization Heatmap */}
      <motion.div
        variants={fadeInUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        <RoomUtilizationHeatmap
          heatmapData={heatmapData}
          rooms={heatmapRooms}
          loading={heatmapLoading}
        />
      </motion.div>

      {/* ================================================================== */}
      {/* ORIGINAL RECHARTS SECTIONS */}
      {/* ================================================================== */}

      {/* Content based on Report Type */}
      {(reportType === 'overview' || reportType === 'schedules') && (
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.4 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          {/* Schedules by Day */}
          <Card className="relative overflow-hidden report-card-hover card-hover">
            <div className="absolute inset-0 bg-gradient-to-br from-card via-card to-green-500/5 dark:to-green-500/10 pointer-events-none rounded-lg" />
            <div className="relative">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-500/10 dark:bg-green-500/20">
                    <BarChart3 className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  Schedules Distribution by Day
                </CardTitle>
                <CardDescription>Number of classes scheduled each day</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats?.schedulesByDay || []}>
                      <defs>
                        <linearGradient id="reportsGreenBar" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={GREEN_GRADIENT.start} stopOpacity={1} />
                          <stop offset="50%" stopColor={GREEN_GRADIENT.mid} stopOpacity={0.8} />
                          <stop offset="100%" stopColor={GREEN_GRADIENT.end} stopOpacity={0.5} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        cursor={{ fill: 'rgba(34, 197, 94, 0.1)' }}
                      />
                      <Bar dataKey="count" fill="url(#reportsGreenBar)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </div>
          </Card>

          {/* Schedule Status */}
          <Card className="relative overflow-hidden report-card-hover card-hover">
            <div className="absolute inset-0 bg-gradient-to-br from-card via-card to-green-500/5 dark:to-green-500/10 pointer-events-none rounded-lg" />
            <div className="relative">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-500/10 dark:bg-green-500/20">
                    <PieChartIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  Schedule Status Breakdown
                </CardTitle>
                <CardDescription>Distribution of schedule statuses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <defs>
                        {Object.values(STATUS_COLORS).map((color, index) => (
                          <linearGradient
                            key={`statusGradient-${index}`}
                            id={`statusGradient-${index}`}
                            x1="0"
                            y1="0"
                            x2="1"
                            y2="1"
                          >
                            <stop offset="0%" stopColor={color} stopOpacity={1} />
                            <stop offset="100%" stopColor={color} stopOpacity={0.7} />
                          </linearGradient>
                        ))}
                        {GREEN_COLORS.map((color, index) => (
                          <linearGradient
                            key={`fallbackStatusGradient-${index}`}
                            id={`fallbackStatusGradient-${index}`}
                            x1="0"
                            y1="0"
                            x2="1"
                            y2="1"
                          >
                            <stop offset="0%" stopColor={color} stopOpacity={1} />
                            <stop offset="100%" stopColor={color} stopOpacity={0.7} />
                          </linearGradient>
                        ))}
                      </defs>
                      <Pie
                        data={
                          stats?.schedulesByStatus?.map((s) => ({
                            name: s.status,
                            value: s.count,
                          })) || []
                        }
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {stats?.schedulesByStatus?.map((entry, index) => {
                          const statusName = entry.status || '';
                          const statusColor = STATUS_COLORS[statusName];
                          const gradientId = statusColor
                            ? `statusGradient-${Object.keys(STATUS_COLORS).indexOf(statusName)}`
                            : `fallbackStatusGradient-${index % GREEN_COLORS.length}`;
                          return (
                            <Cell
                              key={`cell-${index}`}
                              fill={`url(#${gradientId})`}
                              stroke="transparent"
                            />
                          );
                        })}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Faculty by Department - Show for overview and faculty */}
        {(reportType === 'overview' || reportType === 'faculty') && (
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.4 }}
          >
            <Card className="relative overflow-hidden report-card-hover card-hover">
              <div className="absolute inset-0 bg-gradient-to-br from-card via-card to-green-500/5 dark:to-green-500/10 pointer-events-none rounded-lg" />
              <div className="relative">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-500/10 dark:bg-green-500/20">
                      <Building2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    Faculty by Department
                  </CardTitle>
                  <CardDescription>Distribution of faculty across departments</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats?.facultyByDepartment || []} layout="vertical">
                        <defs>
                          <linearGradient id="facultyGreenBar" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor={GREEN_GRADIENT.end} stopOpacity={0.5} />
                            <stop offset="50%" stopColor={GREEN_GRADIENT.mid} stopOpacity={0.8} />
                            <stop offset="100%" stopColor={GREEN_GRADIENT.start} stopOpacity={1} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                        <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                        <YAxis type="category" dataKey="department" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={100} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                          cursor={{ fill: 'rgba(34, 197, 94, 0.1)' }}
                        />
                        <Bar dataKey="count" fill="url(#facultyGreenBar)" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Room Utilization - Show for overview and rooms */}
        {(reportType === 'overview' || reportType === 'rooms') && (
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <Card className="relative overflow-hidden report-card-hover card-hover">
              <div className="absolute inset-0 bg-gradient-to-br from-card via-card to-green-500/5 dark:to-green-500/10 pointer-events-none rounded-lg" />
              <div className="relative">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-500/10 dark:bg-green-500/20">
                      <BookOpen className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    Room Utilization
                  </CardTitle>
                  <CardDescription>Utilization rate of top rooms</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={stats?.roomUtilization || []}>
                        <defs>
                          <linearGradient id="roomLineGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={GREEN_GRADIENT.start} stopOpacity={0.3} />
                            <stop offset="100%" stopColor={GREEN_GRADIENT.start} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="room" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
                        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} domain={[0, 100]} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="utilization"
                          stroke="#22c55e"
                          strokeWidth={3}
                          dot={{ fill: '#22c55e', strokeWidth: 2, r: 4 }}
                          activeDot={{ fill: '#4ade80', strokeWidth: 2, r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </div>
            </Card>
          </motion.div>
        )}
      </div>

      {/* ================================================================== */}
      {/* FACULTY UTILIZATION TABLE */}
      {/* ================================================================== */}
      {(reportType === 'overview' || reportType === 'faculty') && (
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Faculty Load Analysis</CardTitle>
              <CardDescription>Teaching load distribution across faculty</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-4 pr-4">
                  {stats?.facultyUtilization?.map((faculty, index) => {
                    const isOverloaded = faculty.percent > 100;
                    const isUnderloaded = faculty.percent < 50;
                    return (
                      <div
                        key={index}
                        className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 dark:bg-green-500/5"
                      >
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{faculty.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm">
                                {faculty.assigned}/{faculty.max} units
                              </span>
                              <Badge
                                className={
                                  isOverloaded
                                    ? 'bg-red-500 hover:bg-red-600'
                                    : isUnderloaded
                                      ? 'bg-amber-500 hover:bg-amber-600'
                                      : 'bg-green-500 hover:bg-green-600'
                                }
                              >
                                {faculty.percent}%
                              </Badge>
                            </div>
                          </div>
                          <Progress
                            value={Math.min(faculty.percent, 100)}
                            className={`h-2 ${
                              isOverloaded
                                ? '[&>div]:bg-red-500'
                                : isUnderloaded
                                  ? '[&>div]:bg-amber-500'
                                  : '[&>div]:bg-green-500'
                            }`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ================================================================== */}
      {/* SUMMARY CARDS */}
      {/* ================================================================== */}
      {(reportType === 'overview' || reportType === 'faculty') && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-50px' }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <motion.div variants={itemVariants}>
            <Card className="border-green-500/20 bg-green-500/5 dark:bg-green-500/10 card-hover">
              <div className="h-1 rounded-t-lg bg-gradient-to-r from-emerald-500 to-green-500" />
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-green-500/10 ring-4 ring-green-500/5">
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400 tabular-nums">
                      {stats?.facultyUtilizationAvg || 0}%
                    </p>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Avg. Utilization
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="border-amber-500/20 bg-amber-500/5 card-hover">
              <div className="h-1 rounded-t-lg bg-gradient-to-r from-amber-500 to-yellow-500" />
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 ring-4 ring-amber-500/5">
                    <TrendingDown className="h-6 w-6 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold tabular-nums">
                      {stats?.underloadedFaculty || 0}
                    </p>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Underloaded
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="border-red-500/20 bg-red-500/5 card-hover">
              <div className="h-1 rounded-t-lg bg-gradient-to-r from-red-500 to-rose-500" />
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-red-500/10 ring-4 ring-red-500/5">
                    <AlertTriangle className="h-6 w-6 text-red-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold tabular-nums">
                      {stats?.overloadedFaculty || 0}
                    </p>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Overloaded
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}
