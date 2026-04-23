'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAppStore, type ViewMode } from '@/store';
import {
  Users,
  BookOpen,
  CalendarDays,
  AlertTriangle,
  DoorOpen,
  GraduationCap,
  Loader2,
  TrendingUp,
} from 'lucide-react';
import { useCountUp } from '@/hooks/use-count-up';

interface QuickStats {
  totalFaculty: number;
  totalSubjects: number;
  totalSchedules: number;
  totalConflicts: number;
  roomOccupancy: number;
  semester: string;
  academicYear: string;
}

interface StatCard {
  label: string;
  value: string | number;
  numericValue: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  accentColor: string;
  borderColor: string;
  hoverBorderColor: string;
  gradientFrom: string;
  gradientTo: string;
  viewMode?: ViewMode;
}

export function QuickStatsBar() {
  const [stats, setStats] = useState<QuickStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { setViewMode } = useAppStore();

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, settingsRes] = await Promise.all([
          fetch('/api/stats'),
          fetch('/api/settings'),
        ]);

        const statsData = await statsRes.json();
        const settingsData = await settingsRes.json();

        setStats({
          totalFaculty: statsData.totalFaculty || 0,
          totalSubjects: statsData.totalSubjects || 0,
          totalSchedules: statsData.totalSchedules || 0,
          totalConflicts: statsData.totalConflicts || 0,
          roomOccupancy: statsData.roomOccupancy || 0,
          semester: settingsData.semester || '1st Semester',
          academicYear: settingsData.academic_year || '2024-2025',
        });
      } catch (error) {
        console.error('Error fetching quick stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="relative">
        <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-none snap-x snap-mandatory" style={{ WebkitOverflowScrolling: 'touch' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Card
              key={i}
              className="flex-shrink-0 flex items-center gap-3 px-4 py-3 pl-[18px] min-w-[140px] sm:min-w-[170px] snap-start border border-border/30 relative overflow-hidden"
            >
              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-muted animate-gradient-shimmer" />
              <div className="h-9 w-9 rounded-lg bg-muted animate-gradient-shimmer" />
              <div className="space-y-1.5">
                <div className="h-3 w-20 rounded animate-gradient-shimmer" />
                <div className="h-5 w-12 rounded animate-gradient-shimmer" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const cards: StatCard[] = [
    {
      label: 'Total Faculty',
      value: stats.totalFaculty,
      numericValue: stats.totalFaculty,
      icon: Users,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-950/50',
      accentColor: 'bg-blue-500 dark:bg-blue-400',
      borderColor: 'border-l-blue-500',
      hoverBorderColor: 'hover:border-blue-300 dark:hover:border-blue-700',
      gradientFrom: 'from-blue-500/10',
      gradientTo: 'to-blue-500/5',
      viewMode: 'faculty',
    },
    {
      label: 'Total Subjects',
      value: stats.totalSubjects,
      numericValue: stats.totalSubjects,
      icon: BookOpen,
      color: 'text-violet-600 dark:text-violet-400',
      bgColor: 'bg-violet-100 dark:bg-violet-950/50',
      accentColor: 'bg-violet-500 dark:bg-violet-400',
      borderColor: 'border-l-violet-500',
      hoverBorderColor: 'hover:border-violet-300 dark:hover:border-violet-700',
      gradientFrom: 'from-violet-500/10',
      gradientTo: 'to-violet-500/5',
      viewMode: 'subjects',
    },
    {
      label: 'Active Schedules',
      value: stats.totalSchedules,
      numericValue: stats.totalSchedules,
      icon: CalendarDays,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-100 dark:bg-emerald-950/50',
      accentColor: 'bg-emerald-500 dark:bg-emerald-400',
      borderColor: 'border-l-emerald-500',
      hoverBorderColor: 'hover:border-emerald-300 dark:hover:border-emerald-700',
      gradientFrom: 'from-emerald-500/10',
      gradientTo: 'to-emerald-500/5',
      viewMode: 'schedules',
    },
    {
      label: 'Open Conflicts',
      value: stats.totalConflicts,
      numericValue: stats.totalConflicts,
      icon: AlertTriangle,
      color: stats.totalConflicts > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400',
      bgColor: stats.totalConflicts > 0 ? 'bg-red-100 dark:bg-red-950/50' : 'bg-emerald-100 dark:bg-emerald-950/50',
      accentColor: stats.totalConflicts > 0 ? 'bg-red-500 dark:bg-red-400' : 'bg-emerald-500 dark:bg-emerald-400',
      borderColor: stats.totalConflicts > 0 ? 'border-l-red-500' : 'border-l-emerald-500',
      hoverBorderColor: stats.totalConflicts > 0 ? 'hover:border-red-300 dark:hover:border-red-700' : 'hover:border-emerald-300 dark:hover:border-emerald-700',
      gradientFrom: stats.totalConflicts > 0 ? 'from-red-500/10' : 'from-emerald-500/10',
      gradientTo: stats.totalConflicts > 0 ? 'to-red-500/5' : 'to-emerald-500/5',
      viewMode: 'conflicts',
    },
    {
      label: 'Room Utilization',
      value: `${stats.roomOccupancy}%`,
      numericValue: stats.roomOccupancy,
      icon: DoorOpen,
      color: stats.roomOccupancy > 80 ? 'text-amber-600 dark:text-amber-400' : 'text-teal-600 dark:text-teal-400',
      bgColor: stats.roomOccupancy > 80 ? 'bg-amber-100 dark:bg-amber-950/50' : 'bg-teal-100 dark:bg-teal-950/50',
      accentColor: stats.roomOccupancy > 80 ? 'bg-amber-500 dark:bg-amber-400' : 'bg-teal-500 dark:bg-teal-400',
      borderColor: stats.roomOccupancy > 80 ? 'border-l-amber-500' : 'border-l-teal-500',
      hoverBorderColor: stats.roomOccupancy > 80 ? 'hover:border-amber-300 dark:hover:border-amber-700' : 'hover:border-teal-300 dark:hover:border-teal-700',
      gradientFrom: stats.roomOccupancy > 80 ? 'from-amber-500/10' : 'from-teal-500/10',
      gradientTo: stats.roomOccupancy > 80 ? 'to-amber-500/5' : 'to-teal-500/5',
      viewMode: 'rooms',
    },
    {
      label: 'Current Semester',
      value: `${stats.semester} ${stats.academicYear}`,
      numericValue: 0,
      icon: GraduationCap,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-100 dark:bg-emerald-950/50',
      accentColor: 'bg-emerald-500 dark:bg-emerald-400',
      borderColor: 'border-l-emerald-500',
      hoverBorderColor: 'hover:border-emerald-300 dark:hover:border-emerald-700',
      gradientFrom: 'from-emerald-500/10',
      gradientTo: 'to-teal-500/5',
    },
  ];

  const handleClick = (card: StatCard) => {
    if (card.viewMode) {
      setViewMode(card.viewMode);
    }
  };

  return (
    <div className="relative group/stats" data-tour="quick-stats-bar">
      {/* Left fade indicator */}
      <div className="absolute left-0 top-0 bottom-1 w-6 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none opacity-0 group-hover/stats:opacity-100 transition-opacity" />
      {/* Right fade indicator */}
      <div className="absolute right-0 top-0 bottom-1 w-6 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none opacity-0 group-hover/stats:opacity-100 transition-opacity" />

      <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-none snap-x snap-mandatory" style={{ WebkitOverflowScrolling: 'touch' }}>
        {cards.map((card, index) => (
          <StatCardItem key={card.label} card={card} index={index} onClick={handleClick} />
        ))}
      </div>
    </div>
  );
}

function StatCardItem({ card, index, onClick }: { card: StatCard; index: number; onClick: (card: StatCard) => void }) {
  const Icon = card.icon;
  const isClickable = !!card.viewMode;
  const animatedValue = useCountUp(card.numericValue, 600 + index * 100, card.numericValue > 0);

  const displayValue = card.numericValue > 0
    ? (typeof card.value === 'string' && card.value.includes('%') ? `${animatedValue}%` : animatedValue)
    : card.value;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Card
          onClick={() => onClick(card)}
          className={`
            flex-shrink-0 flex items-center gap-3 px-4 py-3 min-w-[140px] sm:min-w-[170px]
            snap-start border border-border/50 relative overflow-hidden
            transition-all duration-200 ease-out
            border-l-[3px] ${card.borderColor}
            ${card.hoverBorderColor}
            ${isClickable ? 'cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:scale-[1.02] active:translate-y-0 active:scale-[0.98] touch-manipulation' : 'cursor-default'}
          `}
        >
          {/* Subtle gradient background */}
          <div className={`absolute inset-0 bg-gradient-to-br ${card.gradientFrom} ${card.gradientTo} opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none`} />

          <div className={`flex items-center justify-center h-9 w-9 rounded-lg ${card.bgColor} shrink-0 transition-transform duration-200 group-hover:scale-110`}>
            <Icon className={`h-5 w-5 ${card.color}`} />
          </div>
          <div className="flex flex-col min-w-0 relative">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider leading-tight">
              {card.label}
            </span>
            <span className="text-sm font-bold stat-number-gradient leading-tight truncate">
              {displayValue}
            </span>
          </div>
        </Card>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs font-medium">
        <p>{card.label}: <span className="font-bold">{card.value}</span></p>
      </TooltipContent>
    </Tooltip>
  );
}
