'use client';

import { ReactNode } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { StatusBadge, resolveStatus } from '@/components/ui/StatusBadge';
import { useAppStore } from '@/store';
import { formatTime12Hour, formatTimeRange } from '@/lib/utils';
import {
  Users,
  DoorOpen,
  Layers,
  Clock,
  Calendar,
  Pencil,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScheduleDetail {
  id?: string;
  subject?: {
    subjectCode?: string;
    subjectName?: string;
  } | null;
  faculty?: {
    name?: string;
  } | null;
  room?: {
    roomName?: string;
  } | null;
  section?: {
    sectionName?: string;
  } | null;
  day: string;
  startTime: string;
  endTime: string;
  status: string;
}

interface ScheduleDetailPopoverProps {
  schedule: ScheduleDetail;
  children: ReactNode;
  onEdit?: () => void;
}

const statusBorderColorMap: Record<string, string> = {
  approved: 'border-l-emerald-500',
  generated: 'border-l-sky-500',
  modified: 'border-l-amber-500',
  conflict: 'border-l-red-500',
};

export function ScheduleDetailPopover({
  schedule,
  children,
  onEdit,
}: ScheduleDetailPopoverProps) {
  const setViewMode = useAppStore((state) => state.setViewMode);

  const borderColor =
    statusBorderColorMap[schedule.status] || 'border-l-muted-foreground/30';

  const subjectCode = schedule.subject?.subjectCode || 'N/A';
  const subjectName = schedule.subject?.subjectName || 'Unknown Subject';
  const facultyName = schedule.faculty?.name || 'Unassigned';
  const roomName = schedule.room?.roomName || 'TBD';
  const sectionName = schedule.section?.sectionName || 'N/A';

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="w-80 p-0 overflow-hidden"
        side="right"
        align="start"
        sideOffset={8}
      >
        {/* Color-coded top border */}
        <div
          className={cn(
            'h-1 w-full rounded-t-md',
            borderColor.replace('border-l-', 'bg-')
          )}
        />

        <div className={cn('border-l-[3px] p-4 space-y-3', borderColor)}>
          {/* Subject header */}
          <div>
            <p className="text-base font-bold text-foreground leading-tight">
              {subjectCode}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5 truncate">
              {subjectName}
            </p>
          </div>

          <Separator />

          {/* Details */}
          <div className="space-y-2.5">
            {/* Faculty */}
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted/80 shrink-0">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Faculty</p>
                <p className="text-sm font-medium truncate">{facultyName}</p>
              </div>
            </div>

            {/* Room */}
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted/80 shrink-0">
                <DoorOpen className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Room</p>
                <p className="text-sm font-medium truncate">{roomName}</p>
              </div>
            </div>

            {/* Section */}
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted/80 shrink-0">
                <Layers className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Section</p>
                <p className="text-sm font-medium truncate">{sectionName}</p>
              </div>
            </div>

            {/* Day & Time */}
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted/80 shrink-0">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Schedule</p>
                <p className="text-sm font-medium truncate">
                  {schedule.day} · {formatTimeRange(schedule.startTime, schedule.endTime)}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Status badge */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Status</span>
            <StatusBadge
              status={resolveStatus(schedule.status)}
              label={schedule.status.charAt(0).toUpperCase() + schedule.status.slice(1)}
              size="sm"
            />
          </div>

          <Separator />

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs h-8"
              onClick={() => {
                setViewMode('calendar');
              }}
            >
              <Calendar className="h-3.5 w-3.5 mr-1.5" />
              View in Calendar
            </Button>
            {onEdit && (
              <Button
                variant="default"
                size="sm"
                className="flex-1 text-xs h-8"
                onClick={() => {
                  onEdit();
                }}
              >
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                Edit Schedule
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
