'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, CalendarDays, Clock, ArrowRight, MapPin, GraduationCap, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';
import { formatTime12Hour } from '@/lib/utils';
import type { Schedule } from '@/types';

// ============================================================================
// HELPERS
// ============================================================================

/** Map JS day index (0=Sun, 6=Sat) to our DayOfWeek values */
function getTodayDayOfWeek(): string {
  const jsDay = new Date().getDay();
  const dayMap: Record<number, string> = {
    0: 'Sunday',
    1: 'Monday',
    2: 'Tuesday',
    3: 'Wednesday',
    4: 'Thursday',
    5: 'Friday',
    6: 'Saturday',
  };
  return dayMap[jsDay] || 'Monday';
}

function getDayLabel(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

/** Get schedule status relative to now */
function getScheduleStatus(startTime: string, endTime: string): 'upcoming' | 'active' | 'completed' {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const startMinutes = sh * 60 + sm;
  const endMinutes = eh * 60 + em;

  if (nowMinutes < startMinutes) return 'upcoming';
  if (nowMinutes < endMinutes) return 'active';
  return 'completed';
}

// ============================================================================
// SKELETON
// ============================================================================

function WidgetSkeleton() {
  return (
    <Card className="card-hover">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-5 w-32 rounded" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-3 w-28 rounded" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-12 w-16 shrink-0 rounded-lg" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-36 rounded" />
              <Skeleton className="h-3 w-48 rounded" />
              <Skeleton className="h-3 w-40 rounded" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

const MAX_ITEMS = 5;

export function ScheduleQuickView() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const setViewMode = useAppStore((state) => state.setViewMode);

  const fetchSchedules = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/schedules');
      if (!res.ok) throw new Error('Failed to fetch schedules');
      const data: Schedule[] = await res.json();

      const today = getTodayDayOfWeek();
      const todaySchedules = data
        .filter((s) => s.day === today)
        .sort((a, b) => a.startTime.localeCompare(b.startTime));

      setSchedules(todaySchedules);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const displayed = schedules.slice(0, MAX_ITEMS);
  const hasMore = schedules.length > MAX_ITEMS;

  if (loading) return <WidgetSkeleton />;

  if (error) {
    return (
      <Card className="card-hover">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-5 w-5 text-emerald-500" />
            Today&apos;s Classes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Calendar className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Unable to load schedule</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-hover">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-5 w-5 text-emerald-500" />
            Today&apos;s Classes
          </CardTitle>
          <CardAction>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setViewMode('calendar')}
            >
              View Full Schedule
              <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </CardAction>
        </div>
      </CardHeader>
      <CardContent>
        {/* Date label */}
        <p className="text-xs text-muted-foreground mb-3">{getDayLabel()}</p>

        {schedules.length === 0 ? (
          /* No classes today */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center justify-center py-8 text-center"
          >
            <div className="rounded-full bg-muted p-3 mb-3">
              <Calendar className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No classes scheduled</p>
            <p className="text-xs text-muted-foreground mt-1">Enjoy your free day!</p>
          </motion.div>
        ) : (
          <div className="space-y-2">
            {displayed.map((schedule) => {
              const status = getScheduleStatus(schedule.startTime, schedule.endTime);
              const isActive = status === 'active';
              const isCompleted = status === 'completed';

              return (
                <motion.div
                  key={schedule.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    'flex gap-3 rounded-lg border p-3 transition-all duration-200',
                    isActive
                      ? 'bg-emerald-500/5 border-emerald-500/30'
                      : isCompleted
                        ? 'bg-muted/30 border-transparent opacity-60'
                        : 'bg-card border-border hover:border-primary/30',
                  )}
                >
                  {/* Time block */}
                  <div className={cn(
                    'flex flex-col items-center justify-center shrink-0 rounded-lg px-2 py-1.5 min-w-[56px]',
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : isCompleted
                        ? 'bg-muted text-muted-foreground'
                        : 'bg-muted/80 text-foreground',
                  )}>
                    <span className="text-xs font-bold leading-tight">
                      {formatTime12Hour(schedule.startTime)}
                    </span>
                    <span className="text-[10px] opacity-70 leading-tight">
                      {formatTime12Hour(schedule.endTime)}
                    </span>
                  </div>

                  {/* Class info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="h-3 w-3 text-emerald-500 shrink-0" />
                      <p className={cn(
                        'text-sm font-medium truncate',
                        isActive && 'text-emerald-700 dark:text-emerald-300',
                      )}>
                        {schedule.subject?.subjectCode}
                        {schedule.subject?.subjectName
                          ? ` — ${schedule.subject.subjectName}`
                          : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {schedule.room?.roomName || 'TBD'}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                        <GraduationCap className="h-3 w-3 shrink-0" />
                        {schedule.section?.sectionName || '—'}
                      </span>
                    </div>
                  </div>

                  {/* Active indicator */}
                  {isActive && (
                    <div className="flex items-center justify-center shrink-0">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                      </span>
                    </div>
                  )}
                </motion.div>
              );
            })}

            {/* Show more indicator */}
            {hasMore && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full gap-1.5 text-xs text-muted-foreground hover:text-foreground mt-1"
                onClick={() => setViewMode('calendar')}
              >
                <Clock className="h-3 w-3" />
                +{schedules.length - MAX_ITEMS} more classes
                <ArrowRight className="h-3 w-3 ml-auto" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
