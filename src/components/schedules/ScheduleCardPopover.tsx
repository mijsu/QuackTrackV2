'use client';

import { useCallback } from 'react';
import {
  Popover,
  PopoverContent,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { StatusBadge, resolveStatus } from '@/components/ui/StatusBadge';
import { useAppStore } from '@/store';
import { cn, formatTimeRange } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  User,
  DoorOpen,
  Clock,
  CalendarDays,
  Pencil,
  Copy,
  BookOpen,
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { Schedule, ScheduleStatus } from '@/types';

interface ScheduleCardPopoverProps {
  schedule: Schedule;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
}

// Status color mapping for left border accent
const statusBorderMap: Record<ScheduleStatus, string> = {
  generated: 'border-l-blue-500',
  approved: 'border-l-emerald-500',
  modified: 'border-l-amber-500',
  conflict: 'border-l-red-500',
};

// Status color mapping for top bar
const statusTopBarMap: Record<ScheduleStatus, string> = {
  generated: 'bg-blue-500',
  approved: 'bg-emerald-500',
  modified: 'bg-amber-500',
  conflict: 'bg-red-500',
};

// Day color indicators
const dayColorMap: Record<string, string> = {
  Monday: 'bg-emerald-500',
  Tuesday: 'bg-teal-500',
  Wednesday: 'bg-amber-500',
  Thursday: 'bg-rose-500',
  Friday: 'bg-violet-500',
  Saturday: 'bg-sky-500',
};

// Section badge color cycle
const sectionBadgeColors = [
  'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800',
  'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
  'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800',
  'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800',
];

function getSectionBadgeColor(sectionId: string): string {
  let hash = 0;
  for (let i = 0; i < sectionId.length; i++) {
    hash = sectionId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return sectionBadgeColors[Math.abs(hash) % sectionBadgeColors.length];
}

function getAvatarInitial(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function ScheduleCardPopover({
  schedule,
  isOpen,
  onOpenChange,
  onEdit,
}: ScheduleCardPopoverProps) {
  const setViewMode = useAppStore((state) => state.setViewMode);
  const { toast } = useToast();

  const borderColor =
    statusBorderMap[schedule.status] || 'border-l-muted-foreground/30';
  const topBarColor =
    statusTopBarMap[schedule.status] || 'bg-muted-foreground/30';

  const subjectCode = schedule.subject?.subjectCode || 'N/A';
  const subjectName = schedule.subject?.subjectName || 'Unknown Subject';
  const facultyName = schedule.faculty?.name || 'Unassigned';
  const sectionName = schedule.section?.sectionName || 'N/A';
  const roomName = schedule.room?.roomName || 'TBD';
  const building = schedule.room?.building || '';
  const roomDisplay = building ? `${roomName}, ${building}` : roomName;
  const units = schedule.subject?.units || 0;
  const timeRange = formatTimeRange(schedule.startTime, schedule.endTime);

  const handleEdit = useCallback(() => {
    if (onEdit) {
      onOpenChange(false);
      onEdit();
    } else {
      toast({
        title: 'Coming Soon',
        description: 'Edit feature coming soon',
      });
      onOpenChange(false);
    }
  }, [onEdit, toast, onOpenChange]);

  const handleViewFaculty = useCallback(() => {
    onOpenChange(false);
    setViewMode('faculty');
  }, [onOpenChange, setViewMode]);

  const handleViewRoom = useCallback(() => {
    toast({
      title: 'Coming Soon',
      description: 'Room details coming soon',
    });
    onOpenChange(false);
  }, [toast, onOpenChange]);

  const handleCopyDetails = useCallback(() => {
    const details = [
      `${subjectCode} - ${subjectName}`,
      `Faculty: ${facultyName}`,
      `Section: ${sectionName}`,
      `Room: ${roomDisplay}`,
      `Schedule: ${schedule.day}, ${timeRange}`,
      `Status: ${schedule.status.charAt(0).toUpperCase() + schedule.status.slice(1)}`,
      `Units: ${units}`,
    ].join('\n');

    navigator.clipboard.writeText(details).then(
      () => {
        toast({
          title: 'Copied',
          description: 'Schedule details copied to clipboard',
        });
      },
      () => {
        toast({
          title: 'Error',
          description: 'Failed to copy details',
          variant: 'destructive',
        });
      }
    );
  }, [subjectCode, subjectName, facultyName, sectionName, roomDisplay, schedule.day, timeRange, schedule.status, units, toast]);

  const dayIndicatorColor = dayColorMap[schedule.day] || 'bg-muted-foreground/30';

  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverContent
        className="w-[320px] max-w-[320px] p-0 overflow-hidden"
        side="right"
        align="start"
        sideOffset={8}
        asChild
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 4 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
        >
          {/* Color-coded top bar */}
          <div className={cn('h-1 w-full', topBarColor)} />

          <div className={cn('border-l-[3px] p-3.5 space-y-3', borderColor)}>
            {/* Subject header */}
            <div className="space-y-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-foreground leading-tight truncate">
                    {subjectCode}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {subjectName}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="shrink-0 text-[10px] px-1.5 py-0 h-5 font-medium gap-1"
                >
                  <BookOpen className="h-2.5 w-2.5" />
                  {units} unit{units !== 1 ? 's' : ''}
                </Badge>
              </div>
            </div>

            <Separator />

            {/* Details grid */}
            <div className="space-y-2.5">
              {/* Faculty with avatar initial */}
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-semibold shrink-0">
                  {getAvatarInitial(facultyName)}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground leading-none mb-0.5">
                    Faculty
                  </p>
                  <p className="text-xs font-medium truncate">{facultyName}</p>
                </div>
              </div>

              {/* Section with colored badge */}
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted/80 shrink-0">
                  <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground leading-none mb-0.5">
                    Section
                  </p>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] px-1.5 py-0 h-5 font-medium',
                      getSectionBadgeColor(schedule.sectionId)
                    )}
                  >
                    {sectionName}
                  </Badge>
                </div>
              </div>

              {/* Room + Building */}
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted/80 shrink-0">
                  <DoorOpen className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground leading-none mb-0.5">
                    Room
                  </p>
                  <p className="text-xs font-medium truncate">{roomDisplay}</p>
                </div>
              </div>

              {/* Time range */}
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted/80 shrink-0">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground leading-none mb-0.5">
                    Time
                  </p>
                  <p className="text-xs font-medium truncate">{timeRange}</p>
                </div>
              </div>

              {/* Day with colored indicator */}
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted/80 shrink-0">
                  <div
                    className={cn(
                      'h-2 w-2 rounded-full',
                      dayIndicatorColor
                    )}
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground leading-none mb-0.5">
                    Day
                  </p>
                  <p className="text-xs font-medium">{schedule.day}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Status */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">Status</span>
              <StatusBadge
                status={resolveStatus(schedule.status)}
                label={
                  schedule.status.charAt(0).toUpperCase() +
                  schedule.status.slice(1)
                }
                size="sm"
              />
            </div>

            <Separator />

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-[11px] gap-1.5"
                onClick={handleEdit}
              >
                <Pencil className="h-3 w-3" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-[11px] gap-1.5"
                onClick={handleViewFaculty}
              >
                <User className="h-3 w-3" />
                View Faculty
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-[11px] gap-1.5"
                onClick={handleViewRoom}
              >
                <DoorOpen className="h-3 w-3" />
                View Room
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-[11px] gap-1.5"
                onClick={handleCopyDetails}
              >
                <Copy className="h-3 w-3" />
                Copy Details
              </Button>
            </div>
          </div>
        </motion.div>
      </PopoverContent>
    </Popover>
  );
}
