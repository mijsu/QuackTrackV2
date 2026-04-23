'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Clock, Coffee, BookOpen, MapPin, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatTime12Hour } from '@/lib/utils';
import { useAppStore } from '@/store';
import type { Schedule } from '@/types';

// ============================================================================
// HELPERS
// ============================================================================

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

/** Parse HH:MM to minutes since midnight */
function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** Format mm:ss countdown */
function formatCountdown(totalSeconds: number): string {
  if (totalSeconds <= 0) return 'Starting now!';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${h}h ${m}m ${s}s`;
  }
  if (m > 0) {
    return `${m}m ${s}s`;
  }
  return `${s}s`;
}

// ============================================================================
// SKELETON
// ============================================================================

function OverviewSkeleton() {
  return (
    <Card className="card-hover">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-32 rounded" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-4 w-24 rounded" />
        <Skeleton className="h-20 w-full rounded-lg" />
      </CardContent>
    </Card>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ScheduleOverviewWidget() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const [now, setNow] = useState(new Date());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
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

  // Real-time countdown timer
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Find next upcoming class
  const nextClass = (() => {
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    return schedules.find((s) => {
      const start = parseTimeToMinutes(s.startTime);
      return start > currentMinutes;
    });
  })();

  // Current class in progress
  const currentClass = (() => {
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    return schedules.find((s) => {
      const start = parseTimeToMinutes(s.startTime);
      const end = parseTimeToMinutes(s.endTime);
      return currentMinutes >= start && currentMinutes < end;
    });
  })();

  // Countdown to next class
  useEffect(() => {
    if (!nextClass) {
      setCountdown(0);
      return;
    }
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const currentSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    const startSeconds = parseTimeToMinutes(nextClass.startTime) * 60;
    setCountdown(startSeconds - currentSeconds);
  }, [now, nextClass]);

  const classesCompleted = (() => {
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    return schedules.filter((s) => parseTimeToMinutes(s.endTime) <= currentMinutes).length;
  })();

  const dayLabel = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  if (loading) return <OverviewSkeleton />;

  return (
    <Card className="card-hover h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="h-4 w-4 text-emerald-500" />
          Schedule Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 flex-1">
        {/* Date & Class Count */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{dayLabel}</p>
          <div className="flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              {schedules.length}
            </span>
            <span className="text-xs text-muted-foreground">
              class{schedules.length !== 1 ? 'es' : ''} today
            </span>
          </div>
        </div>

        {/* Progress indicator */}
        {schedules.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{classesCompleted} completed</span>
              <span>{schedules.length - classesCompleted} remaining</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                style={{
                  width: `${schedules.length > 0 ? (classesCompleted / schedules.length) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        )}

        {schedules.length === 0 ? (
          /* No classes today */
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="rounded-full bg-emerald-500/10 p-4 mb-3">
              <Coffee className="h-8 w-8 text-emerald-500" />
            </div>
            <p className="text-sm font-medium">No classes today</p>
            <p className="text-xs text-muted-foreground mt-1">Take a well-deserved break!</p>
          </div>
        ) : (
          <>
            {/* Current class */}
            {currentClass && (
              <div
                className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 cursor-pointer hover:bg-emerald-500/15 transition-colors"
                onClick={() => setViewMode('calendar')}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    In Progress
                  </p>
                </div>
                <p className="text-sm font-medium truncate">
                  {currentClass.subject?.subjectCode}
                </p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {currentClass.subject?.subjectName}
                </p>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTime12Hour(currentClass.startTime)} – {formatTime12Hour(currentClass.endTime)}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {currentClass.room?.roomName || 'TBD'}
                  </span>
                </div>
              </div>
            )}

            {/* Next upcoming class */}
            {nextClass && !currentClass && (
              <div
                className="rounded-lg bg-muted/50 border p-3 cursor-pointer hover:bg-muted/70 transition-colors"
                onClick={() => setViewMode('calendar')}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Next Class
                  </p>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium truncate">
                  {nextClass.subject?.subjectCode}
                </p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {nextClass.subject?.subjectName}
                </p>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTime12Hour(nextClass.startTime)} – {formatTime12Hour(nextClass.endTime)}
                  </span>
                </div>
              </div>
            )}

            {/* Next class + countdown (only when current class is in progress or no classes left) */}
            {nextClass && currentClass && (
              <div
                className="rounded-lg bg-muted/50 border p-3 cursor-pointer hover:bg-muted/70 transition-colors"
                onClick={() => setViewMode('calendar')}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Up Next
                  </p>
                </div>
                <p className="text-sm font-medium truncate">
                  {nextClass.subject?.subjectCode}
                </p>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-xs text-muted-foreground">
                    {formatTime12Hour(nextClass.startTime)}
                  </span>
                  <span
                    className={cn(
                      'text-xs font-mono font-semibold px-2 py-0.5 rounded-md',
                      countdown <= 300
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    )}
                  >
                    in {formatCountdown(countdown)}
                  </span>
                </div>
              </div>
            )}

            {/* All classes done */}
            {!nextClass && !currentClass && schedules.length > 0 && (
              <div className="flex flex-col items-center justify-center py-4 text-center">
                <div className="rounded-full bg-emerald-500/10 p-3 mb-2">
                  <Coffee className="h-6 w-6 text-emerald-500" />
                </div>
                <p className="text-sm font-medium">All classes done!</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {schedules.length} of {schedules.length} completed
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
