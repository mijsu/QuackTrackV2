'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Printer, Download, FileText } from 'lucide-react';
import { DAYS } from '@/types';
import { formatTime12Hour } from '@/lib/utils';
import type { Schedule } from '@/types';

// Time range for the grid (7:00 AM to 9:00 PM)
const START_HOUR = 7;
const END_HOUR = 21;

// Color palette for department/faculty color-coding
const COLOR_PALETTE = [
  { bg: 'bg-emerald-100 dark:bg-emerald-900/50', border: 'border-emerald-300 dark:border-emerald-700', text: 'text-emerald-800 dark:text-emerald-200' },
  { bg: 'bg-sky-100 dark:bg-sky-900/50', border: 'border-sky-300 dark:border-sky-700', text: 'text-sky-800 dark:text-sky-200' },
  { bg: 'bg-amber-100 dark:bg-amber-900/50', border: 'border-amber-300 dark:border-amber-700', text: 'text-amber-800 dark:text-amber-200' },
  { bg: 'bg-rose-100 dark:bg-rose-900/50', border: 'border-rose-300 dark:border-rose-700', text: 'text-rose-800 dark:text-rose-200' },
  { bg: 'bg-violet-100 dark:bg-violet-900/50', border: 'border-violet-300 dark:border-violet-700', text: 'text-violet-800 dark:text-violet-200' },
  { bg: 'bg-teal-100 dark:bg-teal-900/50', border: 'border-teal-300 dark:border-teal-700', text: 'text-teal-800 dark:text-teal-200' },
  { bg: 'bg-orange-100 dark:bg-orange-900/50', border: 'border-orange-300 dark:border-orange-700', text: 'text-orange-800 dark:text-orange-200' },
  { bg: 'bg-pink-100 dark:bg-pink-900/50', border: 'border-pink-300 dark:border-pink-700', text: 'text-pink-800 dark:text-pink-200' },
  { bg: 'bg-cyan-100 dark:bg-cyan-900/50', border: 'border-cyan-300 dark:border-cyan-700', text: 'text-cyan-800 dark:text-cyan-200' },
  { bg: 'bg-lime-100 dark:bg-lime-900/50', border: 'border-lime-300 dark:border-lime-700', text: 'text-lime-800 dark:text-lime-200' },
];

// Generate time slots from 7:00 AM to 9:00 PM in 1-hour increments
const TIME_SLOTS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => {
  const hour = START_HOUR + i;
  return {
    hour,
    label: formatTime12Hour(`${hour.toString().padStart(2, '0')}:00`),
    value: `${hour.toString().padStart(2, '0')}:00`,
  };
});

interface PrintScheduleViewProps {
  schedules?: Schedule[];
}

export function PrintScheduleView({ schedules: externalSchedules }: PrintScheduleViewProps) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(!externalSchedules);

  useEffect(() => {
    if (externalSchedules) {
      setSchedules(externalSchedules);
      return;
    }

    const fetchSchedules = async () => {
      try {
        const res = await fetch('/api/schedules');
        const data = await res.json();
        setSchedules(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching schedules for print:', error);
        setSchedules([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSchedules();
  }, [externalSchedules]);

  // Build a map of "day-hour" -> Schedule[] for quick lookup
  const scheduleGrid = useMemo(() => {
    const grid = new Map<string, Schedule[]>();

    schedules.forEach((schedule) => {
      const [startHour] = schedule.startTime.split(':').map(Number);
      const [endHour] = schedule.endTime.split(':').map(Number);

      // Only include schedules within 7AM-9PM range
      if (startHour < START_HOUR || endHour > END_HOUR) return;

      // Place schedule in each hour slot it occupies
      for (let h = startHour; h < endHour; h++) {
        const key = `${schedule.day}-${h}`;
        const existing = grid.get(key) || [];
        // Only add if it starts at this hour (to avoid duplicating multi-hour entries)
        if (h === startHour) {
          existing.push(schedule);
          grid.set(key, existing);
        }
      }
    });

    return grid;
  }, [schedules]);

  // Assign colors to faculty members
  const facultyColorMap = useMemo(() => {
    const facultyIds = new Set(schedules.map((s) => s.facultyId).filter(Boolean));
    const colorMap = new Map<string, number>();
    let colorIndex = 0;

    facultyIds.forEach((id) => {
      if (id) {
        colorMap.set(id, colorIndex % COLOR_PALETTE.length);
        colorIndex++;
      }
    });

    return colorMap;
  }, [schedules]);

  // Get schedules for a given day and hour (only those starting at that hour)
  const getSchedulesForSlot = (day: string, hour: number): Schedule[] => {
    return scheduleGrid.get(`${day}-${hour}`) || [];
  };

  // Get color classes for a faculty member
  const getFacultyColor = (facultyId?: string) => {
    if (!facultyId) return COLOR_PALETTE[0];
    const index = facultyColorMap.get(facultyId) ?? 0;
    return COLOR_PALETTE[index];
  };

  // Calculate how many hour slots a schedule spans
  const getSpanHours = (schedule: Schedule): number => {
    const [startHour] = schedule.startTime.split(':').map(Number);
    const [endHour] = schedule.endTime.split(':').map(Number);
    return endHour - startHour;
  };

  const handlePrint = () => {
    window.print();
  };

  // Determine which time slots have no schedules (for hiding rows in print)
  const activeTimeSlots = useMemo(() => {
    const activeHours = new Set<number>();
    schedules.forEach((schedule) => {
      const [startHour] = schedule.startTime.split(':').map(Number);
      const [endHour] = schedule.endTime.split(':').map(Number);
      for (let h = startHour; h < endHour; h++) {
        activeHours.add(h);
      }
    });
    return activeHours;
  }, [schedules]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 print-schedule-view">
      {/* Print-specific CSS */}
      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-schedule-view { padding: 0; }
        }
      `}</style>

      {/* Header with actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 no-print">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Print Schedule</h2>
          <p className="text-sm text-muted-foreground">
            {schedules.length} schedule{ schedules.length !== 1 ? 's' : ''} &middot; Generated {new Date().toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="ghost" size="sm" disabled>
            <FileText className="h-4 w-4 mr-2" />
            Download as PDF
          </Button>
        </div>
      </div>

      {/* Print Title (only visible when printing) */}
      <div className="hidden print:block print:text-center print:mb-4">
        <h1 className="text-2xl font-bold">Pateros Technological College</h1>
        <h2 className="text-lg font-semibold">Weekly Class Schedule</h2>
        <p className="text-sm text-muted-foreground">
          Generated on {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Color Legend */}
      <div className="flex flex-wrap gap-2 no-print">
        <span className="text-xs text-muted-foreground">Faculty Colors:</span>
        {Array.from(facultyColorMap.entries()).map(([facultyId, colorIndex]) => {
          const faculty = schedules.find((s) => s.facultyId === facultyId)?.faculty;
          const colors = COLOR_PALETTE[colorIndex % COLOR_PALETTE.length];
          return (
            <Badge
              key={facultyId}
              variant="outline"
              className={`${colors.bg} ${colors.border} ${colors.text} text-xs`}
            >
              {faculty?.name || 'Unknown'}
            </Badge>
          );
        })}
      </div>

      {/* Schedule Grid Table */}
      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="border px-2 py-2 sm:px-3 sm:py-3 text-left font-semibold w-20 sm:w-24 shrink-0">
                Time
              </th>
              {DAYS.map((day) => (
                <th
                  key={day}
                  className="border px-2 py-2 sm:px-3 sm:py-3 text-center font-semibold min-w-[130px]"
                >
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TIME_SLOTS.map(({ hour, label }) => {
              const slotSchedules = DAYS.map((day) => getSchedulesForSlot(day, hour));
              const hasAnySchedule = slotSchedules.some((s) => s.length > 0);

              // Always show all time slots for a complete schedule
              return (
                <tr key={hour} className={!hasAnySchedule ? 'opacity-30' : ''}>
                  <td className="border px-2 py-1 sm:px-3 sm:py-2 font-medium text-muted-foreground align-top whitespace-nowrap">
                    {label}
                  </td>
                  {DAYS.map((day) => {
                    const daySlotSchedules = getSchedulesForSlot(day, hour);

                    if (daySlotSchedules.length === 0) {
                      return (
                        <td key={day} className="border px-1 py-1 sm:px-2 sm:py-2 align-top" />
                      );
                    }

                    return (
                      <td key={day} className="border px-1 py-1 sm:px-2 sm:py-2 align-top">
                        {daySlotSchedules.map((schedule) => {
                          const colors = getFacultyColor(schedule.facultyId);
                          const spanHours = getSpanHours(schedule);

                          return (
                            <div
                              key={schedule.id}
                              className={`rounded border-l-4 px-1.5 py-1 sm:px-2 sm:py-1.5 mb-1 ${colors.bg} ${colors.border} ${colors.text}`}
                              style={spanHours > 1 ? { minHeight: `${spanHours * 2}rem` } : undefined}
                            >
                              <p className="font-bold text-xs sm:text-sm leading-tight">
                                {schedule.subject?.subjectCode}
                              </p>
                              <p className="text-[10px] sm:text-xs leading-tight mt-0.5">
                                {schedule.subject?.subjectName}
                              </p>
                              <div className="mt-1 space-y-0.5 text-[10px] sm:text-xs opacity-80">
                                <p>{schedule.faculty?.name}</p>
                                <p>{schedule.room?.roomName}</p>
                                <p>{schedule.section?.sectionName}</p>
                              </div>
                            </div>
                          );
                        })}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer note */}
      <p className="text-xs text-muted-foreground text-center no-print">
        Use your browser&apos;s Print dialog (Ctrl+P / ⌘P) to print or save as PDF.
        Colors are assigned per faculty member for easy identification.
      </p>
    </div>
  );
}
