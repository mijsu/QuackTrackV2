'use client';

import { useCallback } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet, Calendar } from 'lucide-react';
import type { Schedule } from '@/types';

interface ScheduleExportButtonProps {
  schedules: Array<{
    id: string;
    subject?: { subjectCode: string; subjectName: string; units?: number } | null;
    faculty?: { name: string } | null;
    room?: { roomName: string; building?: string } | null;
    section?: { sectionName: string } | null;
    day: string;
    startTime: string;
    endTime: string;
    status?: string;
  }>;
}

/**
 * Map day names to dates in the 2025-01 base week (second semester).
 * Monday = 2025-01-13, Tuesday = 2025-01-14, etc.
 */
const DAY_TO_DATE: Record<string, string> = {
  Monday: '2025-01-13',
  Tuesday: '2025-01-14',
  Wednesday: '2025-01-15',
  Thursday: '2025-01-16',
  Friday: '2025-01-17',
  Saturday: '2025-01-18',
};

/**
 * Convert a "HH:MM" time string to "YYYYMMDDTHHMMSSZ" UTC format.
 */
function toUTCDateTime(dateStr: string, timeStr: string): string {
  const dateOnly = dateStr.replace(/-/g, '');
  const timeOnly = timeStr.replace(':', '') + '00';
  return `${dateOnly}T${timeOnly}Z`;
}

/**
 * Escape special characters in ICS text values.
 */
function escapeIcsText(text: string): string {
  return text.replace(/[\\;,\n]/g, (char) => {
    if (char === '\n') return '\\n';
    return `\\${char}`;
  });
}

/**
 * Generate today's date string in YYYY-MM-DD format for filenames.
 */
function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

function downloadBlob(content: string, mimeType: string, filename: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function ScheduleExportButton({ schedules }: ScheduleExportButtonProps) {
  const handleExportCSV = useCallback(() => {
    const headers = [
      'Subject Code',
      'Subject Name',
      'Faculty Name',
      'Room',
      'Building',
      'Section',
      'Day',
      'Start Time',
      'End Time',
      'Status',
      'Units',
    ];

    const rows = schedules.map((s) => [
      s.subject?.subjectCode || '',
      s.subject?.subjectName || '',
      s.faculty?.name || '',
      s.room?.roomName || '',
      s.room?.building || '',
      s.section?.sectionName || '',
      s.day,
      s.startTime,
      s.endTime,
      s.status || '',
      String(s.subject?.units ?? ''),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    downloadBlob(
      csvContent,
      'text/csv;charset=utf-8;',
      `quacktrack-schedules-${getTodayString()}.csv`
    );
  }, [schedules]);

  const handleExportICal = useCallback(() => {
    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//QuackTrack//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
    ];

    schedules.forEach((s, index) => {
      const subjectCode = s.subject?.subjectCode || 'N/A';
      const subjectName = s.subject?.subjectName || 'Unknown Subject';
      const facultyName = s.faculty?.name || 'Unassigned';
      const roomName = s.room?.roomName || 'TBD';
      const building = s.room?.building || '';
      const sectionName = s.section?.sectionName || 'N/A';

      const dateStr = DAY_TO_DATE[s.day] || DAY_TO_DATE['Monday'];
      const dtStart = toUTCDateTime(dateStr, s.startTime);
      const dtEnd = toUTCDateTime(dateStr, s.endTime);

      const summary = `${subjectCode} - ${subjectName}`;
      const description = `Faculty: ${facultyName} | Room: ${roomName}${building ? ` (${building})` : ''} | Section: ${sectionName}`;
      const location = building ? `${roomName} (${building})` : roomName;

      lines.push(
        'BEGIN:VEVENT',
        `UID:schedule-${s.id || index}@quacktrack`,
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        `SUMMARY:${escapeIcsText(summary)}`,
        `DESCRIPTION:${escapeIcsText(description)}`,
        `LOCATION:${escapeIcsText(location)}`,
        'CATEGORIES:Education',
        'STATUS:Confirmed',
        'END:VEVENT'
      );
    });

    lines.push('END:VCALENDAR');

    const icsContent = lines.join('\r\n');

    downloadBlob(
      icsContent,
      'text/calendar;charset=utf-8;',
      `quacktrack-schedules-${getTodayString()}.ics`
    );
  }, [schedules]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-2 hover-lift">
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Export</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={handleExportCSV} className="cursor-pointer">
          <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <div className="flex-1">
            <span className="text-sm">Export as CSV</span>
            <span className="block text-[11px] text-muted-foreground">
              Spreadsheet compatible format
            </span>
          </div>
          <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            CSV
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportICal} className="cursor-pointer">
          <Calendar className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          <div className="flex-1">
            <span className="text-sm">Export as iCal</span>
            <span className="block text-[11px] text-muted-foreground">
              Calendar event import
            </span>
          </div>
          <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            ICS
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
