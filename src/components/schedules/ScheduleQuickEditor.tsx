'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  User,
  DoorOpen,
  Clock,
  CalendarDays,
  Save,
  Loader2,
  BookOpen,
  AlertTriangle,
  X,
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { Schedule, ScheduleStatus, DayOfWeek } from '@/types';

interface ScheduleQuickEditorProps {
  schedule: Schedule | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: () => void;
}

const DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const STATUSES: { value: ScheduleStatus; label: string; color: string }[] = [
  { value: 'approved', label: 'Approved', color: 'bg-emerald-500' },
  { value: 'generated', label: 'Generated', color: 'bg-blue-500' },
  { value: 'modified', label: 'Modified', color: 'bg-amber-500' },
  { value: 'conflict', label: 'Conflict', color: 'bg-red-500' },
];

const DAY_COLORS: Record<string, string> = {
  Monday: 'text-emerald-600 dark:text-emerald-400',
  Tuesday: 'text-teal-600 dark:text-teal-400',
  Wednesday: 'text-amber-600 dark:text-amber-400',
  Thursday: 'text-rose-600 dark:text-rose-400',
  Friday: 'text-violet-600 dark:text-violet-400',
  Saturday: 'text-sky-600 dark:text-sky-400',
};

interface FacultyOption {
  id: string;
  name: string;
  department?: { name: string } | null;
}

interface RoomOption {
  id: string;
  roomName: string;
  building?: string | null;
  capacity?: number | null;
}

export function ScheduleQuickEditor({
  schedule,
  isOpen,
  onOpenChange,
  onSave,
}: ScheduleQuickEditorProps) {
  const [saving, setSaving] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [facultyOptions, setFacultyOptions] = useState<FacultyOption[]>([]);
  const [roomOptions, setRoomOptions] = useState<RoomOption[]>([]);

  // Form state
  const [facultyId, setFacultyId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [day, setDay] = useState<DayOfWeek>('Monday');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [status, setStatus] = useState<ScheduleStatus>('approved');

  // Fetch faculty and room options on open
  useEffect(() => {
    if (!isOpen) return;

    const fetchOptions = async () => {
      setLoadingOptions(true);
      try {
        const [facRes, roomRes] = await Promise.all([
          fetch('/api/faculty?limit=200'),
          fetch('/api/rooms?limit=200'),
        ]);

        if (facRes.ok) {
          const facData = await facRes.json();
          setFacultyOptions(Array.isArray(facData) ? facData : facData.faculty || []);
        }
        if (roomRes.ok) {
          const roomData = await roomRes.json();
          setRoomOptions(Array.isArray(roomData) ? roomData : roomData.rooms || []);
        }
      } catch (error) {
        console.error('Error fetching options:', error);
      } finally {
        setLoadingOptions(false);
      }
    };

    fetchOptions();
  }, [isOpen]);

  // Populate form when schedule changes
  useEffect(() => {
    if (schedule) {
      setFacultyId(schedule.facultyId || '');
      setRoomId(schedule.roomId || '');
      setDay(schedule.day || 'Monday');
      setStartTime(schedule.startTime || '');
      setEndTime(schedule.endTime || '');
      setStatus(schedule.status || 'approved');
    }
  }, [schedule]);

  const handleSave = useCallback(async () => {
    if (!schedule?.id) return;

    // Validation
    if (!facultyId) {
      toast.error('Please select a faculty member');
      return;
    }
    // Room is optional — no validation needed
    if (!startTime || !endTime) {
      toast.error('Please set start and end times');
      return;
    }
    if (startTime >= endTime) {
      toast.error('End time must be after start time');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/schedules/${schedule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facultyId,
          roomId,
          day,
          startTime,
          endTime,
          status,
        }),
      });

      if (res.ok) {
        toast.success('Schedule updated successfully');
        onOpenChange(false);
        onSave?.();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to update schedule');
      }
    } catch (error) {
      console.error('Error updating schedule:', error);
      toast.error('Failed to update schedule');
    } finally {
      setSaving(false);
    }
  }, [schedule, facultyId, roomId, day, startTime, endTime, status, onOpenChange, onSave]);

  const subjectCode = schedule?.subject?.subjectCode || 'N/A';
  const subjectName = schedule?.subject?.subjectName || 'Unknown Subject';
  const sectionName = schedule?.section?.sectionName || 'N/A';
  const units = schedule?.subject?.units || 0;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        {/* Gradient accent bar */}
        <div className="h-[3px] bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />

        <DialogHeader className="px-6 pt-5 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
              <BookOpen className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            Edit Schedule
          </DialogTitle>
          <DialogDescription>
            Modify schedule details for {subjectCode} - {subjectName}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4 space-y-5">
          {/* Subject info card */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm shrink-0">
              {subjectCode.slice(0, 3)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm truncate">{subjectCode} - {subjectName}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                  {sectionName}
                </Badge>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                  {units} unit{units !== 1 ? 's' : ''}
                </Badge>
              </div>
            </div>
          </motion.div>

          {loadingOptions ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Loading options...</span>
            </div>
          ) : (
            <>
              {/* Form fields - 2 column grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Faculty */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="space-y-2"
                >
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <div className="flex h-5 w-5 items-center justify-center rounded bg-emerald-500/10">
                      <User className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    Faculty
                  </Label>
                  <Select value={facultyId} onValueChange={setFacultyId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select faculty..." />
                    </SelectTrigger>
                    <SelectContent>
                      {facultyOptions.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          <span className="truncate">{f.name}</span>
                          {f.department && (
                            <span className="text-muted-foreground text-xs ml-1">
                              ({f.department.name})
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </motion.div>

                {/* Room */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="space-y-2"
                >
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <div className="flex h-5 w-5 items-center justify-center rounded bg-teal-500/10">
                      <DoorOpen className="h-3 w-3 text-teal-600 dark:text-teal-400" />
                    </div>
                    Room
                  </Label>
                  <Select value={roomId} onValueChange={setRoomId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select room..." />
                    </SelectTrigger>
                    <SelectContent>
                      {roomOptions.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.roomName}
                          {r.building && ` (${r.building})`}
                          {r.capacity != null && (
                            <span className="text-muted-foreground text-xs ml-1">
                              Cap: {r.capacity}
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </motion.div>

                {/* Day */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="space-y-2"
                >
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <div className="flex h-5 w-5 items-center justify-center rounded bg-amber-500/10">
                      <CalendarDays className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                    </div>
                    Day
                  </Label>
                  <Select value={day} onValueChange={(v) => setDay(v as DayOfWeek)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS.map((d) => (
                        <SelectItem key={d} value={d}>
                          <span className={cn(DAY_COLORS[d])}>{d}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </motion.div>

                {/* Status */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="space-y-2"
                >
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <div className="flex h-5 w-5 items-center justify-center rounded bg-violet-500/10">
                      <AlertTriangle className="h-3 w-3 text-violet-600 dark:text-violet-400" />
                    </div>
                    Status
                  </Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as ScheduleStatus)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          <div className="flex items-center gap-2">
                            <div className={cn('h-2 w-2 rounded-full', s.color)} />
                            {s.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </motion.div>

                {/* Start Time */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-2"
                >
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <div className="flex h-5 w-5 items-center justify-center rounded bg-rose-500/10">
                      <Clock className="h-3 w-3 text-rose-600 dark:text-rose-400" />
                    </div>
                    Start Time
                  </Label>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full"
                  />
                </motion.div>

                {/* End Time */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="space-y-2"
                >
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <div className="flex h-5 w-5 items-center justify-center rounded bg-rose-500/10">
                      <Clock className="h-3 w-3 text-rose-600 dark:text-rose-400" />
                    </div>
                    End Time
                  </Label>
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full"
                  />
                </motion.div>
              </div>

              {/* Time preview */}
              {startTime && endTime && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/40 text-sm"
                >
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {day} &middot; {startTime} - {endTime}
                  </span>
                  {startTime >= endTime && (
                    <span className="text-red-500 text-xs ml-auto flex items-center gap-1">
                      <X className="h-3 w-3" />
                      Invalid time range
                    </span>
                  )}
                </motion.div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="px-6 pb-5 pt-0 gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="mr-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || loadingOptions}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md hover:shadow-lg transition-all"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
