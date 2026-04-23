'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DoorOpen,
  Building2,
  Users,
  Monitor,
  FlaskConical,
  GraduationCap,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  BookOpen,
  Wifi,
  Projector,
  Mic,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Room, Schedule } from '@/types';
import { DAYS } from '@/types';

interface RoomQuickViewModalProps {
  roomId: string | null;
  roomName: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

type RoomDetail = Room & {
  _count?: { schedules: number };
};

function getEquipmentIcon(eq: string) {
  const lower = eq.toLowerCase();
  if (lower.includes('computer') || lower.includes('software')) return <Monitor className="h-3.5 w-3.5" />;
  if (lower.includes('lab')) return <FlaskConical className="h-3.5 w-3.5" />;
  if (lower.includes('projector')) return <Projector className="h-3.5 w-3.5" />;
  if (lower.includes('microphone') || lower.includes('mic')) return <Mic className="h-3.5 w-3.5" />;
  if (lower.includes('whiteboard')) return <Wifi className="h-3.5 w-3.5" />;
  return <BookOpen className="h-3.5 w-3.5" />;
}

function formatTime12(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${(m ?? 0).toString().padStart(2, '0')} ${ampm}`;
}

function getDurationHours(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return (eh * 60 + (em ?? 0) - sh * 60 - (sm ?? 0)) / 60;
}

const DAY_COLORS: Record<string, string> = {
  Monday: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10',
  Tuesday: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-500/10',
  Wednesday: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10',
  Thursday: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10',
  Friday: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10',
  Saturday: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-500/10',
};

export function RoomQuickViewModal({ roomId, roomName, isOpen, onOpenChange }: RoomQuickViewModalProps) {
  const [room, setRoom] = useState<RoomDetail | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRoomData = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const [roomRes, schedulesRes] = await Promise.all([
        fetch(`/api/rooms/${id}`),
        fetch(`/api/schedules?roomId=${id}`),
      ]);
      if (!roomRes.ok || !schedulesRes.ok) throw new Error('Failed to fetch room data');
      const roomData = await roomRes.json();
      const schedulesData = await schedulesRes.json();
      setRoom(roomData);
      setSchedules(Array.isArray(schedulesData) ? schedulesData : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load room data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && roomId) {
      fetchRoomData(roomId);
    }
  }, [isOpen, roomId, fetchRoomData]);

  // Group schedules by day
  const schedulesByDay = useMemo(() => {
    const map = new Map<string, Schedule[]>();
    DAYS.forEach((d) => map.set(d, []));
    schedules.forEach((s) => {
      const list = map.get(s.day) || [];
      list.push(s);
      map.set(s.day, list);
    });
    // Sort each day by start time
    map.forEach((list) => list.sort((a, b) => a.startTime.localeCompare(b.startTime)));
    return map;
  }, [schedules]);

  // Utilization stats
  const utilization = useMemo(() => {
    let totalHoursUsed = 0;
    schedules.forEach((s) => {
      totalHoursUsed += getDurationHours(s.startTime, s.endTime);
    });
    // Available hours per day: 7am to 9pm = 14 hours, 6 days = 84 hours/week
    const availableHours = 84;
    const pct = availableHours > 0 ? Math.round((totalHoursUsed / availableHours) * 100) : 0;
    return { totalHoursUsed, availableHours, pct };
  }, [schedules]);

  // Assigned subjects (unique)
  const assignedSubjects = useMemo(() => {
    const seen = new Map<string, { code: string; name: string; facultyName: string }>();
    schedules.forEach((s) => {
      if (s.subject) {
        seen.set(s.subject.id, {
          code: s.subject.subjectCode,
          name: s.subject.subjectName,
          facultyName: s.faculty?.name ?? 'Unassigned',
        });
      }
    });
    return Array.from(seen.values());
  }, [schedules]);

  const activeDays = useMemo(() => {
    const days = new Set<string>();
    schedules.forEach((s) => days.add(s.day));
    return days.size;
  }, [schedules]);

  // Reset state on close
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setRoom(null);
      setSchedules([]);
      setError(null);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-teal-500/10 flex items-center justify-center">
              <DoorOpen className="h-4.5 w-4.5 text-teal-600 dark:text-teal-400" />
            </div>
            Room Quick View
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4 py-4"
            >
              {/* Room details skeleton */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-20 rounded-lg bg-muted/50 animate-pulse" />
                ))}
              </div>
              {/* Schedule skeleton */}
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-12 rounded-lg bg-muted/40 animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
                ))}
              </div>
            </motion.div>
          )}

          {error && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-12 text-center"
            >
              <AlertCircle className="h-8 w-8 text-destructive mb-3" />
              <p className="font-medium text-destructive">Failed to load room data</p>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
            </motion.div>
          )}

          {!loading && !error && room && (
            <motion.div
              key="content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-5"
            >
              {/* Room Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-lg border p-3">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1">Name</p>
                  <p className="text-sm font-semibold truncate">{room.roomName}</p>
                  {room.roomCode && (
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">{room.roomCode}</p>
                  )}
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1">Building</p>
                  <div className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-teal-500" />
                    <p className="text-sm font-semibold truncate">{room.building}</p>
                  </div>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1">Capacity</p>
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-amber-500" />
                    <p className="text-sm font-bold">{room.capacity} <span className="text-xs font-normal text-muted-foreground">seats</span></p>
                  </div>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1">Status</p>
                  <div className="flex items-center gap-1.5">
                    {room.isActive ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Active</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3.5 w-3.5 text-red-500" />
                        <span className="text-sm font-semibold text-red-600 dark:text-red-400">Inactive</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Equipment Badges */}
              {room.equipment && room.equipment.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Equipment</p>
                  <div className="flex flex-wrap gap-1.5">
                    {room.equipment.map((eq, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="gap-1 text-xs bg-teal-50 dark:bg-teal-500/10 border-teal-200/50 dark:border-teal-800/30 text-teal-700 dark:text-teal-300"
                      >
                        {getEquipmentIcon(eq)}
                        {eq}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Utilization */}
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold">Weekly Utilization</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      utilization.pct < 30
                        ? 'text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-50 dark:bg-amber-500/10'
                        : utilization.pct < 70
                          ? 'text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10'
                          : 'text-red-600 dark:text-red-400 border-red-500/30 bg-red-50 dark:bg-red-500/10'
                    )}
                  >
                    {utilization.pct}%
                  </Badge>
                </div>
                <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden mb-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(utilization.pct, 100)}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className={cn(
                      'h-full rounded-full',
                      utilization.pct < 30 ? 'bg-amber-500' : utilization.pct < 70 ? 'bg-emerald-500' : 'bg-red-500'
                    )}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{utilization.totalHoursUsed} hrs used / {utilization.availableHours} hrs available</span>
                  <span>{activeDays} of 6 days active</span>
                </div>
              </div>

              {/* Weekly Schedule Grid */}
              <div>
                <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-primary" />
                  Weekly Schedule
                </p>
                <div className="space-y-2">
                  {DAYS.map((day) => {
                    const daySchedules = schedulesByDay.get(day) || [];
                    return (
                      <motion.div
                        key={day}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2 }}
                        className={cn(
                          'rounded-lg border p-3',
                          daySchedules.length > 0 ? 'bg-card' : 'bg-muted/30'
                        )}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Badge
                            variant="outline"
                            className={cn('text-xs font-medium', DAY_COLORS[day])}
                          >
                            {day}
                          </Badge>
                          {daySchedules.length > 0 && (
                            <span className="text-[10px] text-muted-foreground">
                              {daySchedules.length} class{daySchedules.length !== 1 ? 'es' : ''}
                            </span>
                          )}
                        </div>
                        {daySchedules.length === 0 ? (
                          <p className="text-xs text-muted-foreground/60 italic">No classes</p>
                        ) : (
                          <div className="space-y-1.5">
                            {daySchedules.map((s) => (
                              <div
                                key={s.id}
                                className="flex items-center gap-2 rounded-md bg-muted/50 px-2.5 py-1.5"
                              >
                                <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                                <span className="text-xs font-mono font-medium text-foreground">
                                  {formatTime12(s.startTime)} - {formatTime12(s.endTime)}
                                </span>
                                <span className="text-muted-foreground mx-1">·</span>
                                <span className="text-xs font-medium text-primary truncate">
                                  {s.subject?.subjectCode}
                                </span>
                                <span className="text-xs text-muted-foreground truncate">
                                  {s.subject?.subjectName}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Assigned Subjects */}
              {assignedSubjects.length > 0 && (
                <div>
                  <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    Assigned Subjects
                    <Badge variant="secondary" className="text-xs">{assignedSubjects.length}</Badge>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {assignedSubjects.map((sub) => (
                      <Badge
                        key={sub.code}
                        variant="outline"
                        className="px-2.5 py-1 text-xs gap-1"
                      >
                        <span className="font-semibold text-primary">{sub.code}</span>
                        <span className="text-muted-foreground mx-0.5">·</span>
                        <span className="text-muted-foreground truncate max-w-[150px]">{sub.name}</span>
                        <span className="text-muted-foreground/50 mx-0.5">by</span>
                        <span className="font-medium">{sub.facultyName}</span>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state for schedules */}
              {schedules.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                    <DoorOpen className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">No schedules assigned</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    This room is currently not being used in any schedules.
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
