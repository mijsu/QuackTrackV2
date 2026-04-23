'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import {
  GraduationCap,
  CalendarDays,
  Users,
  DoorOpen,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StatsData {
  totalSchedules: number;
  facultyUtilizationAvg: number;
  roomOccupancy: number;
  overloadedFaculty: number;
  underloadedFaculty: number;
  totalFaculty: number;
}

interface SettingsData {
  semester: string;
  academic_year: string;
}

// ---------------------------------------------------------------------------
// Counter animation hook
// ---------------------------------------------------------------------------

function useCounter(target: number, duration = 1200, enabled = true) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;

    // Schedule a rAF callback to reset value — avoids synchronous setState in effect
    const resetId = requestAnimationFrame(() => {
      setValue(0);

      if (target === 0) return;

      const start = performance.now();
      const animate = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(Math.round(target * eased));
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(animate);
        }
      };
      rafRef.current = requestAnimationFrame(animate);
    });

    return () => {
      cancelAnimationFrame(resetId);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, enabled]);

  return value;
}

// ---------------------------------------------------------------------------
// Mini sparkline (SVG)
// ---------------------------------------------------------------------------

function MiniSparkline({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  const color =
    trend === 'up'
      ? '#10b981'
      : trend === 'down'
        ? '#f59e0b'
        : '#6b7280';

  const Icon =
    trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <Icon className="h-4 w-4" style={{ color }} />
  );
}

// ---------------------------------------------------------------------------
// Mini progress ring (SVG circle)
// ---------------------------------------------------------------------------

function MiniProgressRing({
  value,
  max = 100,
  size = 40,
  strokeWidth = 4,
  color,
}: {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(value, max) / max) * circumference;

  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      {/* background ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-muted/40"
      />
      {/* progress ring */}
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1, ease: 'easeOut' }}
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

function getLoadColor(pct: number) {
  if (pct < 70) return { color: '#f59e0b', label: 'amber', bg: 'bg-amber-100 dark:bg-amber-950/50', text: 'text-amber-600 dark:text-amber-400' };
  if (pct <= 90) return { color: '#10b981', label: 'emerald', bg: 'bg-emerald-100 dark:bg-emerald-950/50', text: 'text-emerald-600 dark:text-emerald-400' };
  return { color: '#ef4444', label: 'red', bg: 'bg-red-100 dark:bg-red-950/50', text: 'text-red-600 dark:text-red-400' };
}

function getUsageColor(pct: number) {
  if (pct < 30) return { color: '#f59e0b', label: 'amber', bar: 'bg-amber-500' };
  if (pct <= 70) return { color: '#10b981', label: 'emerald', bar: 'bg-emerald-500' };
  return { color: '#ef4444', label: 'red', bar: 'bg-red-500' };
}

// ---------------------------------------------------------------------------
// Stagger animation variants
// ---------------------------------------------------------------------------

const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.1, delayChildren: 0.15 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] } },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SemesterStatsPanel() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetcher = useCallback(async () => {
    try {
      const [statsRes, settingsRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/settings'),
      ]);
      if (!statsRes.ok || !settingsRes.ok) throw new Error('Fetch failed');
      const statsData = await statsRes.json();
      const settingsData = await settingsRes.json();
      setStats({
        totalSchedules: statsData.totalSchedules ?? 0,
        facultyUtilizationAvg: statsData.facultyUtilizationAvg ?? 0,
        roomOccupancy: statsData.roomOccupancy ?? 0,
        overloadedFaculty: statsData.overloadedFaculty ?? 0,
        underloadedFaculty: statsData.underloadedFaculty ?? 0,
        totalFaculty: statsData.totalFaculty ?? 0,
      });
      setSettings({
        semester: settingsData.semester ?? '1st Semester',
        academic_year: settingsData.academic_year ?? '2024-2025',
      });
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetcher();
  }, [fetcher]);

  // Counter hooks
  const animSchedules = useCounter(stats?.totalSchedules ?? 0, 1000, !!stats);
  const animFacultyLoad = useCounter(
    stats?.facultyUtilizationAvg ? Math.round(stats.facultyUtilizationAvg) : 0,
    1100,
    !!stats,
  );
  const animRoomUsage = useCounter(
    stats?.roomOccupancy ? Math.round(stats.roomOccupancy) : 0,
    1200,
    !!stats,
  );

  // Derived values
  const semesterLabel = settings
    ? `${settings.semester} ${settings.academic_year}`
    : '—';
  const loadColor = getLoadColor(animFacultyLoad);
  const usageColor = getUsageColor(animRoomUsage);
  const scheduleTrend: 'up' | 'down' | 'stable' = stats
    ? stats.totalSchedules > 50
      ? 'up'
      : stats.totalSchedules > 20
        ? 'stable'
        : 'down'
    : 'stable';

  // ---- Loading skeleton ----
  if (loading) {
    return (
      <Card className="relative overflow-hidden border border-border/50">
        {/* Animated gradient top border placeholder */}
        <div className="h-1 bg-muted animate-gradient-shimmer" />
        <div className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl bg-muted/50 p-4"
              >
                <div className="h-10 w-10 rounded-full animate-gradient-shimmer shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-24 rounded animate-gradient-shimmer" />
                  <div className="h-6 w-16 rounded animate-gradient-shimmer" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  if (error || !stats || !settings) return null;

  return (
    <Card className="relative overflow-hidden border border-border/50 backdrop-blur-sm bg-card/80 dark:bg-card/60">
      {/* Animated gradient top border */}
      <motion.div
        className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500"
        initial={{ scaleX: 0, originX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />

      <div className="p-4 sm:p-5">
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {/* ---- 1. Semester ---- */}
          <motion.div variants={cardVariants}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="group relative flex items-center gap-3 sm:gap-4 rounded-xl bg-muted/40 dark:bg-muted/30 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 border border-transparent hover:border-border/60 cursor-default">
                  {/* Icon circle */}
                  <div className="flex items-center justify-center h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-violet-100 dark:bg-violet-950/50 shrink-0">
                    <GraduationCap className="h-5 w-5 sm:h-5.5 sm:w-5.5 text-violet-600 dark:text-violet-400" />
                  </div>
                  {/* Value + Label */}
                  <div className="min-w-0 flex-1">
                    <p className="text-lg sm:text-xl font-bold text-foreground leading-tight truncate">
                      {semesterLabel}
                    </p>
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground mt-0.5">
                      Current Semester
                    </p>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">
                  {settings.semester} of {settings.academic_year}
                </p>
              </TooltipContent>
            </Tooltip>
          </motion.div>

          {/* ---- 2. Active Schedules ---- */}
          <motion.div variants={cardVariants}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="group relative flex items-center gap-3 sm:gap-4 rounded-xl bg-muted/40 dark:bg-muted/30 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 border border-transparent hover:border-border/60 cursor-default">
                  <div className="flex items-center justify-center h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-teal-100 dark:bg-teal-950/50 shrink-0">
                    <CalendarDays className="h-5 w-5 sm:h-5.5 sm:w-5.5 text-teal-600 dark:text-teal-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-lg sm:text-xl font-bold text-foreground leading-tight">
                        {animSchedules}
                      </p>
                      <MiniSparkline trend={scheduleTrend} />
                    </div>
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground mt-0.5">
                      Active Schedules
                    </p>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">
                  {stats.totalSchedules} schedule{stats.totalSchedules !== 1 ? 's' : ''} across all departments
                </p>
              </TooltipContent>
            </Tooltip>
          </motion.div>

          {/* ---- 3. Faculty Load ---- */}
          <motion.div variants={cardVariants}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="group relative flex items-center gap-3 sm:gap-4 rounded-xl bg-muted/40 dark:bg-muted/30 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 border border-transparent hover:border-border/60 cursor-default">
                  <div className="relative shrink-0">
                    <MiniProgressRing
                      value={animFacultyLoad}
                      size={44}
                      strokeWidth={4}
                      color={loadColor.color}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={cn('text-[9px] font-bold', loadColor.text)}>
                        {animFacultyLoad}%
                      </span>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-1.5">
                      <p className="text-lg sm:text-xl font-bold text-foreground leading-tight">
                        {animFacultyLoad}%
                      </p>
                      <span className={cn('text-[10px] font-medium', loadColor.text)}>avg</span>
                    </div>
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground mt-0.5">
                      Faculty Load
                    </p>
                    {stats.overloadedFaculty > 0 && (
                      <p className="text-[10px] text-red-500 dark:text-red-400 mt-0.5">
                        {stats.overloadedFaculty} overloaded
                      </p>
                    )}
                  </div>
                  {/* Icon behind ring */}
                  <div className={cn('absolute right-3 top-3 opacity-10', loadColor.bg)}>
                    <Users className="h-8 w-8" />
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">
                  Average {animFacultyLoad}% utilization across {stats.totalFaculty} faculty
                </p>
              </TooltipContent>
            </Tooltip>
          </motion.div>

          {/* ---- 4. Room Usage ---- */}
          <motion.div variants={cardVariants}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="group relative flex items-center gap-3 sm:gap-4 rounded-xl bg-muted/40 dark:bg-muted/30 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 border border-transparent hover:border-border/60 cursor-default">
                  <div className="flex items-center justify-center h-10 w-10 sm:h-11 sm:w-11 rounded-full shrink-0"
                    style={{ backgroundColor: `${usageColor.color}15` }}
                  >
                    <DoorOpen className="h-5 w-5 sm:h-5.5 sm:w-5.5" style={{ color: usageColor.color }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-1.5">
                      <p className="text-lg sm:text-xl font-bold text-foreground leading-tight">
                        {animRoomUsage}%
                      </p>
                      <span className="text-[10px] font-medium text-muted-foreground">utilized</span>
                    </div>
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground mt-0.5">
                      Room Usage
                    </p>
                    {/* Color-coded bar */}
                    <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <motion.div
                        className={cn('h-full rounded-full', usageColor.bar)}
                        initial={{ width: 0 }}
                        animate={{ width: `${animRoomUsage}%` }}
                        transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                      />
                    </div>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">
                  {animRoomUsage}% of available room slots are in use
                </p>
              </TooltipContent>
            </Tooltip>
          </motion.div>
        </motion.div>
      </div>
    </Card>
  );
}
