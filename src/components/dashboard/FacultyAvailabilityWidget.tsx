'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Users,
  Clock,
  TrendingUp,
  TrendingDown,
  CalendarDays,
  ChevronRight,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { DayOfWeek } from '@/types';

// ============================================================================
// TYPES
// ============================================================================

interface FacultyUser {
  id: string;
  name: string;
  email: string;
  department?: { name: string } | null;
  _count?: { schedules: number };
}

interface ScheduleRecord {
  id: string;
  facultyId: string;
  day: string;
  startTime: string;
  endTime: string;
  subject?: { subjectCode: string; subjectName: string } | null;
  room?: { roomName: string } | null;
  section?: { sectionName: string } | null;
}

interface DayAvailability {
  day: string;
  freeHours: number;
  freeSlots: { start: string; end: string }[];
  busySlots: { start: string; end: string }[];
}

interface FacultyAvailability {
  faculty: FacultyUser;
  dailyAvailability: DayAvailability[];
  totalFreeHours: number;
  totalBusyHours: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const WEEK_DAYS: { key: string; short: string }[] = [
  { key: 'Monday', short: 'Mon' },
  { key: 'Tuesday', short: 'Tue' },
  { key: 'Wednesday', short: 'Wed' },
  { key: 'Thursday', short: 'Thu' },
  { key: 'Friday', short: 'Fri' },
];

const WORK_START = '07:00';
const WORK_END = '20:00';

function getFreeHoursFromSlots(slots: ScheduleRecord[]): number {
  if (slots.length === 0) return 13; // 7am-8pm = 13 hours

  const busyMinutes: Array<{ start: number; end: number }> = slots.map((s) => ({
    start: timeToMinutes(s.startTime),
    end: timeToMinutes(s.endTime),
  }));

  // Sort and merge overlapping busy periods
  busyMinutes.sort((a, b) => a.start - b.start);
  const merged: Array<{ start: number; end: number }> = [];
  for (const period of busyMinutes) {
    if (merged.length > 0 && period.start <= merged[merged.length - 1].end) {
      merged[merged.length - 1].end = Math.max(
        merged[merged.length - 1].end,
        period.end
      );
    } else {
      merged.push({ ...period });
    }
  }

  // Calculate free time as gaps between busy periods
  const workStartMin = timeToMinutes(WORK_START);
  const workEndMin = timeToMinutes(WORK_END);
  let freeMinutes = 0;

  let cursor = workStartMin;
  for (const period of merged) {
    if (period.start > cursor) {
      freeMinutes += period.start - cursor;
    }
    cursor = Math.max(cursor, period.end);
  }
  if (cursor < workEndMin) {
    freeMinutes += workEndMin - cursor;
  }

  return Math.round(freeMinutes / 60 * 10) / 10;
}

function getFreeSlots(slots: ScheduleRecord[]): { start: string; end: string }[] {
  const busyMinutes: Array<{ start: number; end: number }> = slots.map((s) => ({
    start: timeToMinutes(s.startTime),
    end: timeToMinutes(s.endTime),
  }));

  busyMinutes.sort((a, b) => a.start - b.start);
  const merged: Array<{ start: number; end: number }> = [];
  for (const period of busyMinutes) {
    if (merged.length > 0 && period.start <= merged[merged.length - 1].end) {
      merged[merged.length - 1].end = Math.max(
        merged[merged.length - 1].end,
        period.end
      );
    } else {
      merged.push({ ...period });
    }
  }

  const workStartMin = timeToMinutes(WORK_START);
  const workEndMin = timeToMinutes(WORK_END);
  const freeSlots: { start: string; end: string }[] = [];

  let cursor = workStartMin;
  for (const period of merged) {
    if (period.start > cursor) {
      freeSlots.push({
        start: minutesToTime(cursor),
        end: minutesToTime(period.start),
      });
    }
    cursor = Math.max(cursor, period.end);
  }
  if (cursor < workEndMin) {
    freeSlots.push({
      start: minutesToTime(cursor),
      end: minutesToTime(workEndMin),
    });
  }

  return freeSlots;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function formatTime12(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function FacultyAvailabilityWidget() {
  const [data, setData] = useState<FacultyAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state for clicking a cell
  const [modalOpen, setModalOpen] = useState(false);
  const [modalFacultyName, setModalFacultyName] = useState('');
  const [modalDay, setModalDay] = useState('');
  const [modalFreeSlots, setModalFreeSlots] = useState<{ start: string; end: string }[]>([]);
  const [modalBusySlots, setModalBusySlots] = useState<{ start: string; end: string }[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [facultyRes, schedulesRes] = await Promise.all([
        fetch('/api/users?role=faculty'),
        fetch('/api/schedules'),
      ]);

      if (!facultyRes.ok || !schedulesRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const facultyData: FacultyUser[] = await facultyRes.json();
      const schedulesData: ScheduleRecord[] = await schedulesRes.json();

      if (!Array.isArray(facultyData) || facultyData.length === 0) {
        setData([]);
        setLoading(false);
        return;
      }

      // Build availability map
      const availability: FacultyAvailability[] = facultyData.map((faculty) => {
        const facultySchedules = schedulesData.filter(
          (s) => s.facultyId === faculty.id
        );

        const dailyAvailability: DayAvailability[] = WEEK_DAYS.map((day) => {
          const daySchedules = facultySchedules.filter((s) => s.day === day.key);
          const busySlots = daySchedules.map((s) => ({
            start: s.startTime,
            end: s.endTime,
          }));
          const freeSlots = getFreeSlots(daySchedules);
          const freeHours = getFreeHoursFromSlots(daySchedules);

          return { day: day.key, freeHours, freeSlots, busySlots };
        });

        const totalFreeHours = dailyAvailability.reduce(
          (sum, d) => sum + d.freeHours,
          0
        );
        const totalBusyHours = dailyAvailability.reduce((sum, d) => {
          const dayBusy = 13 - d.freeHours;
          return sum + (dayBusy > 0 ? dayBusy : 0);
        }, 0);

        return { faculty, dailyAvailability, totalFreeHours, totalBusyHours };
      });

      setData(availability);
    } catch (err) {
      setError('Failed to load faculty availability');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Quick stats
  const mostAvailable = useMemo(() => {
    if (data.length === 0) return null;
    return data.reduce((max, fa) =>
      fa.totalFreeHours > max.totalFreeHours ? fa : max
    );
  }, [data]);

  const busiest = useMemo(() => {
    if (data.length === 0) return null;
    return data.reduce((min, fa) =>
      fa.totalFreeHours < min.totalFreeHours ? fa : min
    );
  }, [data]);

  const handleCellClick = (
    facultyName: string,
    dayKey: string,
    freeSlots: { start: string; end: string }[],
    busySlots: { start: string; end: string }[]
  ) => {
    setModalFacultyName(facultyName);
    setModalDay(dayKey);
    setModalFreeSlots(freeSlots);
    setModalBusySlots(busySlots);
    setModalOpen(true);
  };

  const getBadgeClasses = (freeHours: number) => {
    if (freeHours > 4) return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/25';
    if (freeHours >= 1) return 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/25';
    return 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/25';
  };

  // ============================================================================
  // LOADING SKELETON
  // ============================================================================

  if (loading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-5 w-40" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-4 w-32" />
                <div className="flex-1 grid grid-cols-5 gap-2">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Skeleton key={j} className="h-8 rounded" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // ============================================================================
  // ERROR STATE
  // ============================================================================

  if (error) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
            Faculty Availability
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-red-500/10 p-3 mb-3">
              <X className="h-6 w-6 text-red-500" />
            </div>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ============================================================================
  // EMPTY STATE
  // ============================================================================

  if (data.length === 0) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
            Faculty Availability
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-muted p-3 mb-3">
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="font-medium">No faculty found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add faculty members to see their weekly availability
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-5 w-5 text-emerald-500" />
            Faculty Availability
            <Badge variant="outline" className="ml-auto text-xs font-normal">
              This Week
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3">
            {mostAvailable && (
              <div className="flex items-center gap-3 rounded-lg bg-emerald-500/5 border border-emerald-500/15 p-3">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-emerald-500/15 shrink-0">
                  <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                    Most Available
                  </p>
                  <p className="text-sm font-semibold truncate">
                    {mostAvailable.faculty.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {mostAvailable.totalFreeHours.toFixed(1)}h free
                  </p>
                </div>
              </div>
            )}
            {busiest && (
              <div className="flex items-center gap-3 rounded-lg bg-amber-500/5 border border-amber-500/15 p-3">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-amber-500/15 shrink-0">
                  <TrendingDown className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                    Busiest
                  </p>
                  <p className="text-sm font-semibold truncate">
                    {busiest.faculty.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {busiest.totalBusyHours.toFixed(1)}h busy
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500/60" />
              &gt;4h free
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500/60" />
              1–4h free
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500/60" />
              Fully booked
            </div>
          </div>

          {/* Availability Grid */}
          <div className="overflow-x-auto -mx-1">
            <div className="min-w-[520px]">
              {/* Header row */}
              <div className="flex items-center gap-2 px-1 pb-2">
                <div className="w-36 shrink-0" />
                {WEEK_DAYS.map((day) => (
                  <div
                    key={day.key}
                    className="flex-1 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                  >
                    {day.short}
                  </div>
                ))}
              </div>

              {/* Faculty rows */}
              <TooltipProvider delayDuration={200}>
                <div className="space-y-1.5">
                  {data.map((fa, idx) => (
                    <motion.div
                      key={fa.faculty.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="flex items-center gap-2 group"
                    >
                      {/* Faculty name */}
                      <div className="w-36 shrink-0 min-w-0">
                        <p className="text-sm font-medium truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {fa.faculty.name}
                        </p>
                        {fa.faculty.department && (
                          <p className="text-[11px] text-muted-foreground truncate">
                            {fa.faculty.department.name}
                          </p>
                        )}
                      </div>

                      {/* Day cells */}
                      {fa.dailyAvailability.map((dayAvail) => (
                        <Tooltip key={dayAvail.day}>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() =>
                                handleCellClick(
                                  fa.faculty.name,
                                  dayAvail.day,
                                  dayAvail.freeSlots,
                                  dayAvail.busySlots
                                )
                              }
                              className="flex-1 flex items-center justify-center py-1.5 rounded-md border border-transparent hover:border-border hover:bg-muted/50 transition-all cursor-pointer min-h-[36px]"
                            >
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-xs font-semibold px-1.5 py-0 border',
                                  getBadgeClasses(dayAvail.freeHours)
                                )}
                              >
                                {dayAvail.freeHours.toFixed(1)}h
                              </Badge>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            <p className="font-medium">{dayAvail.day}</p>
                            <p className="text-muted-foreground">
                              {dayAvail.freeHours.toFixed(1)}h free
                            </p>
                            <p className="text-muted-foreground">
                              Click to view time slots
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </motion.div>
                  ))}
                </div>
              </TooltipProvider>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Slot Detail Modal */}
      <AnimatePresence>
        {modalOpen && (
          <Dialog open={modalOpen} onOpenChange={setModalOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-emerald-500" />
                  Availability Details
                </DialogTitle>
                <DialogDescription>
                  {modalFacultyName} &middot; {modalDay}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* Free Slots */}
                <div>
                  <h4 className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-1.5">
                    <ChevronRight className="h-3.5 w-3.5" />
                    Free Time Slots ({modalFreeSlots.length})
                  </h4>
                  {modalFreeSlots.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No free slots</p>
                  ) : (
                    <div className="space-y-1.5">
                      {modalFreeSlots.map((slot, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 rounded-md bg-emerald-500/5 border border-emerald-500/15 px-3 py-2"
                        >
                          <span className="text-sm font-medium">
                            {formatTime12(slot.start)} — {formatTime12(slot.end)}
                          </span>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {getFreeHoursFromSlots([
                              {
                                id: '',
                                facultyId: '',
                                day: '',
                                startTime: slot.start,
                                endTime: slot.end,
                              },
                            ])}h
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Busy Slots */}
                <div>
                  <h4 className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-1.5">
                    <ChevronRight className="h-3.5 w-3.5" />
                    Scheduled Classes ({modalBusySlots.length})
                  </h4>
                  {modalBusySlots.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No classes scheduled</p>
                  ) : (
                    <div className="space-y-1.5">
                      {modalBusySlots.map((slot, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 rounded-md bg-amber-500/5 border border-amber-500/15 px-3 py-2"
                        >
                          <span className="text-sm font-medium">
                            {formatTime12(slot.start)} — {formatTime12(slot.end)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </>
  );
}
