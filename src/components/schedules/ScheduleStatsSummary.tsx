'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, CheckCircle, Clock, BarChart3, Users, MapPin, DoorOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Schedule, DayOfWeek } from '@/types';
import { DAYS } from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScheduleStatsSummaryProps {
  schedules: Schedule[];
  totalFaculty: number;
  loading?: boolean;
}

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

// ---------------------------------------------------------------------------
// Skeleton card
// ---------------------------------------------------------------------------

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-4">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-muted animate-gradient-shimmer shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-16 rounded animate-gradient-shimmer" />
          <div className="h-5 w-12 rounded animate-gradient-shimmer" />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ScheduleStatsSummary({ schedules, totalFaculty, loading }: ScheduleStatsSummaryProps) {
  // Compute stats
  const stats = useMemo(() => {
    const total = schedules.length;
    const approved = schedules.filter((s) => s.status === 'approved').length;
    const pending = total - approved;

    // Day distribution
    const dayCounts: Record<string, number> = {};
    DAYS.forEach((d) => {
      dayCounts[d] = 0;
    });
    schedules.forEach((s) => {
      if (dayCounts[s.day] !== undefined) {
        dayCounts[s.day]++;
      }
    });
    let busiestDay: DayOfWeek = DAYS[0];
    let maxCount = 0;
    for (const day of DAYS) {
      if (dayCounts[day] > maxCount) {
        maxCount = dayCounts[day];
        busiestDay = day;
      }
    }

    // Faculty coverage
    const uniqueFacultyIds = new Set(schedules.map((s) => s.facultyId));
    const uniqueFaculty = uniqueFacultyIds.size;
    const coveragePct = totalFaculty > 0 ? Math.round((uniqueFaculty / totalFaculty) * 100) : 0;

    // Active rooms
    const uniqueRoomIds = new Set(schedules.map((s) => s.roomId));
    const activeRooms = uniqueRoomIds.size;

    return {
      total,
      approved,
      pending,
      dayCounts,
      busiestDay,
      busiestDayCount: maxCount,
      uniqueFaculty,
      coveragePct,
      activeRooms,
    };
  }, [schedules, totalFaculty]);

  // Loading skeleton
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Schedules',
      value: stats.total,
      sublabel: `${stats.approved} approved`,
      icon: CalendarDays,
      gradient: 'from-emerald-500 to-teal-400',
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/30',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      valueColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: "This Week's Classes",
      value: stats.total,
      sublabel: `${stats.busiestDayCount} on ${stats.busiestDay.slice(0, 3)}`,
      icon: Clock,
      gradient: 'from-teal-500 to-cyan-400',
      iconBg: 'bg-teal-50 dark:bg-teal-950/30',
      iconColor: 'text-teal-600 dark:text-teal-400',
      valueColor: 'text-teal-600 dark:text-teal-400',
    },
    {
      label: 'Active Rooms',
      value: stats.activeRooms,
      sublabel: 'rooms in use',
      icon: DoorOpen,
      gradient: 'from-amber-500 to-orange-400',
      iconBg: 'bg-amber-50 dark:bg-amber-950/30',
      iconColor: 'text-amber-600 dark:text-amber-400',
      valueColor: 'text-amber-600 dark:text-amber-400',
    },
    {
      label: 'Faculty Teaching',
      value: stats.uniqueFaculty,
      sublabel: `${stats.coveragePct}% coverage`,
      icon: Users,
      gradient: 'from-violet-500 to-purple-400',
      iconBg: 'bg-violet-50 dark:bg-violet-950/30',
      iconColor: 'text-violet-600 dark:text-violet-400',
      valueColor: 'text-violet-600 dark:text-violet-400',
    },
  ];

  return (
    <motion.div
      className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {statCards.map((card) => (
        <motion.div key={card.label} variants={cardVariants}>
          <div className="relative rounded-xl border border-border/50 bg-card p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 group">
            {/* Gradient header strip */}
            <div className={cn(
              'absolute inset-x-0 top-0 h-1 rounded-t-xl bg-gradient-to-r opacity-70 group-hover:opacity-100 transition-opacity',
              card.gradient
            )} />
            <div className="flex items-center gap-3">
              <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg shrink-0', card.iconBg)}>
                <card.icon className={cn('h-4.5 w-4.5', card.iconColor)} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">{card.label}</p>
                <p className={cn('text-xl font-bold tabular-nums', card.valueColor)}>{card.value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{card.sublabel}</p>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
