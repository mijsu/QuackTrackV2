'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { DAYS } from '@/types';
import { useAppStore } from '@/store';
import { Calendar as CalendarIcon, Filter, Printer, Download, User, MapPin, Users, Clock, Layers, Search, LayoutGrid, BookOpen, ChevronDown, ChevronUp, X, SlidersHorizontal, FileSpreadsheet, Loader2, FileText, TableProperties, CalendarDays, DoorOpen, AlertTriangle, Crown, Palette } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatTime12Hour, formatTimeRange, calculateBlocks, cn } from '@/lib/utils';
import type { Schedule, User, Section, Room } from '@/types';
import { PrintScheduleView } from '@/components/schedules/PrintScheduleView';
import { ScheduleCardPopover } from '@/components/schedules/ScheduleCardPopover';
import { ScheduleQuickEditor } from '@/components/schedules/ScheduleQuickEditor';
import { ScheduleExportButton } from '@/components/ui/ScheduleExportButton';

// Constants for grid sizing - Desktop
const ROW_HEIGHT = 56;
const HALF_ROW_HEIGHT = ROW_HEIGHT / 2;

// Constants for grid sizing - Mobile (slightly smaller than desktop)
const ROW_HEIGHT_MOBILE = 48;
const HALF_ROW_HEIGHT_MOBILE = ROW_HEIGHT_MOBILE / 2;

// Time range for the grid (7:00 to 21:00)
const START_HOUR = 7;
const END_HOUR = 21;

// Maximum schedules to display per day (one per time slot)
const MAX_SCHEDULES_PER_DAY = 14;

// Department color coding for schedule blocks
const DEPARTMENT_COLORS = [
  { gradient: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-500', light: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-300 dark:border-emerald-700', dot: 'bg-emerald-500', label: 'Dept A' },
  { gradient: 'from-teal-500 to-cyan-500', bg: 'bg-teal-500', light: 'bg-teal-50 dark:bg-teal-950/30', text: 'text-teal-700 dark:text-teal-400', border: 'border-teal-300 dark:border-teal-700', dot: 'bg-teal-500', label: 'Dept B' },
  { gradient: 'from-amber-500 to-orange-500', bg: 'bg-amber-500', light: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-300 dark:border-amber-700', dot: 'bg-amber-500', label: 'Dept C' },
  { gradient: 'from-violet-500 to-purple-500', bg: 'bg-violet-500', light: 'bg-violet-50 dark:bg-violet-950/30', text: 'text-violet-700 dark:text-violet-400', border: 'border-violet-300 dark:border-violet-700', dot: 'bg-violet-500', label: 'Dept D' },
  { gradient: 'from-rose-500 to-pink-500', bg: 'bg-rose-500', light: 'bg-rose-50 dark:bg-rose-950/30', text: 'text-rose-700 dark:text-rose-400', border: 'border-rose-300 dark:border-rose-700', dot: 'bg-rose-500', label: 'Dept E' },
  { gradient: 'from-cyan-500 to-sky-500', bg: 'bg-cyan-500', light: 'bg-cyan-50 dark:bg-cyan-950/30', text: 'text-cyan-700 dark:text-cyan-400', border: 'border-cyan-300 dark:border-cyan-700', dot: 'bg-cyan-500', label: 'Dept F' },
];

function getScheduleDepartmentColor(schedule: Schedule): typeof DEPARTMENT_COLORS[number] {
  const hash = (schedule.subject?.departmentId || schedule.subjectId || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return DEPARTMENT_COLORS[hash % DEPARTMENT_COLORS.length];
}

export function CalendarView() {
  const { data: session } = useSession();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [faculty, setFaculty] = useState<User[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { calendarFilters, setCalendarFilters } = useAppStore();

  // Dialog state for showing multiple schedules
  const [selectedSlot, setSelectedSlot] = useState<{
    day: string;
    startTime: string;
    endTime: string;
    schedules: Schedule[];
  } | null>(null);

  // View mode state (calendar, grid, or print)
  const [viewMode, setViewMode] = useState<'calendar' | 'grid' | 'print'>('calendar');

  // Filter expanded state
  const [filterExpanded, setFilterExpanded] = useState(false);

  // Popover state for single schedule card click
  const [popoverSchedule, setPopoverSchedule] = useState<Schedule | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const popoverAnchorRef = useRef<HTMLDivElement | null>(null);

  // Quick editor state
  const [editorOpen, setEditorOpen] = useState(false);

  const isFaculty = session?.user?.role === 'faculty';

  useEffect(() => {
    if (isFaculty && session?.user?.id) {
      setCalendarFilters({ faculty: session.user.id });
    }
  }, [isFaculty, session?.user?.id, setCalendarFilters]);

  useEffect(() => {
    if (session?.user) {
      fetchData();
    }
  }, [session?.user]);

  const fetchData = async () => {
    try {
      const [schedulesRes, usersRes, sectionsRes, roomsRes] = await Promise.all([
        fetch('/api/schedules'),
        fetch('/api/users?role=faculty'),
        fetch('/api/sections'),
        fetch('/api/rooms'),
      ]);

      const schedulesData = await schedulesRes.json();
      const usersData = await usersRes.json();
      const sectionsData = await sectionsRes.json();
      const roomsData = await roomsRes.json();

      setSchedules(Array.isArray(schedulesData) ? schedulesData : []);
      setFaculty(Array.isArray(usersData) ? usersData : []);
      setSections(Array.isArray(sectionsData) ? sectionsData : []);
      setRooms(Array.isArray(roomsData) ? roomsData : []);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
      setSchedules([]);
      setFaculty([]);
      setSections([]);
      setRooms([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredSchedules = useMemo(() => {
    const effectiveFacultyFilter = isFaculty ? session?.user?.id : calendarFilters.faculty;
    
    return schedules.filter(s => {
      if (calendarFilters.section !== 'all' && s.sectionId !== calendarFilters.section) return false;
      if (effectiveFacultyFilter !== 'all' && effectiveFacultyFilter && s.facultyId !== effectiveFacultyFilter) return false;
      if (calendarFilters.day !== 'all' && s.day !== calendarFilters.day) return false;
      if (calendarFilters.room !== 'all' && s.roomId !== calendarFilters.room) return false;
      if (calendarFilters.classType === 'executive' && s.section?.classType !== 'executive') return false;
      if (calendarFilters.classType === 'regular' && s.section?.classType === 'executive') return false;
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          (s.subject?.subjectName?.toLowerCase().includes(query)) ||
          (s.subject?.subjectCode?.toLowerCase().includes(query)) ||
          (s.faculty?.name?.toLowerCase().includes(query)) ||
          (s.section?.sectionName?.toLowerCase().includes(query)) ||
          (s.room?.roomName?.toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }
      
      return true;
    });
  }, [schedules, calendarFilters, isFaculty, session?.user?.id, searchQuery]);

  // Helper function to check if schedule is within visible time range (7:00 AM - 9:00 PM)
  const isWithinVisibleTimeRange = (startTime: string, endTime: string): boolean => {
    const [startHour] = startTime.split(':').map(Number);
    const [endHour] = endTime.split(':').map(Number);
    // Schedule must start at or after 7:00 AM and end at or before 9:00 PM
    return startHour >= START_HOUR && endHour <= END_HOUR;
  };

  // Group schedules by day and time slot
  // Returns a map of "day-startTime" -> Schedule[]
  // Only includes schedules within the visible time range (7:00 AM - 9:00 PM)
  const schedulesBySlot = useMemo(() => {
    const slotMap = new Map<string, Schedule[]>();
    
    filteredSchedules.forEach(schedule => {
      // Only include schedules within the visible time range
      if (!isWithinVisibleTimeRange(schedule.startTime, schedule.endTime)) {
        return;
      }
      const key = `${schedule.day}-${schedule.startTime}-${schedule.endTime}`;
      const existing = slotMap.get(key) || [];
      existing.push(schedule);
      slotMap.set(key, existing);
    });

    return slotMap;
  }, [filteredSchedules]);

  // Get grouped schedules for a specific day (only show one per time slot)
  // Limited to MAX_SCHEDULES_PER_DAY (14) cards per day
  const getGroupedSchedulesForDay = (day: string) => {
    const daySchedules: { 
      key: string; 
      firstSchedule: Schedule; 
      count: number; 
      allSchedules: Schedule[];
    }[] = [];

    schedulesBySlot.forEach((slotSchedules, key) => {
      if (key.startsWith(day + '-')) {
        const sortedSchedules = slotSchedules.sort((a, b) => 
          (a.subject?.subjectCode || '').localeCompare(b.subject?.subjectCode || '')
        );
        daySchedules.push({
          key,
          firstSchedule: sortedSchedules[0],
          count: sortedSchedules.length,
          allSchedules: sortedSchedules,
        });
      }
    });

    // Sort by start time and limit to MAX_SCHEDULES_PER_DAY
    return daySchedules
      .sort((a, b) => a.firstSchedule.startTime.localeCompare(b.firstSchedule.startTime))
      .slice(0, MAX_SCHEDULES_PER_DAY);
  };

  // Calculate position for a schedule card
  const getSchedulePosition = (schedule: Schedule, isMobile: boolean = false) => {
    const rowHeight = isMobile ? ROW_HEIGHT_MOBILE : ROW_HEIGHT;
    const halfRowHeight = isMobile ? HALF_ROW_HEIGHT_MOBILE : HALF_ROW_HEIGHT;
    const [startHour] = schedule.startTime.split(':').map(Number);
    const [endHour] = schedule.endTime.split(':').map(Number);

    const top = (startHour - START_HOUR) * rowHeight + halfRowHeight;
    const height = (endHour - startHour) * rowHeight;

    return { top, height };
  };

  // Calculate z-index for schedule card based on start time
  // Later start times get higher z-index for proper overlapping
  // 7am-8am = z-1, 8am-9am = z-2, 9am-10am = z-3, etc.
  const getScheduleZIndex = (startTime: string): number => {
    const [hours] = startTime.split(':').map(Number);
    // Z-index is based on hour difference from start hour (7am)
    // 7am = 1, 8am = 2, 9am = 3, ... 9pm = 15
    return hours - START_HOUR + 1;
  };

  const handlePrint = () => {
    const printContent = document.getElementById('calendar-print-content');
    if (!printContent) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print the calendar');
      return;
    }
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>PTC Schedule Calendar</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { text-align: center; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
            th { background-color: #f4f4f4; font-weight: bold; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <h1>PTC Schedule Calendar</h1>
          <p style="text-align: center;">Generated on ${new Date().toLocaleDateString()}</p>
          ${printContent.outerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const handleExport = () => {
    const headers = ['Day', 'Start Time', 'End Time', 'Blocks', 'Subject', 'Subject Code', 'Faculty', 'Section', 'Room', 'Status'];
    const rows = filteredSchedules.map(s => [
      s.day,
      s.startTime,
      s.endTime,
      calculateBlocks(s.startTime, s.endTime),
      s.subject?.subjectName || '',
      s.subject?.subjectCode || '',
      s.faculty?.name || '',
      s.section?.sectionName || '',
      s.room?.roomName || '',
      s.status
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ptc-schedule-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const handleExportPDF = async () => {
    try {
      setExportingPdf(true);
      
      // Build query params based on current filters
      const params = new URLSearchParams();
      const effectiveFacultyFilter = isFaculty ? session?.user?.id : calendarFilters.faculty;
      
      // Determine report type based on filters
      let reportType = 'full';
      if (effectiveFacultyFilter && effectiveFacultyFilter !== 'all') {
        reportType = 'faculty';
      } else if (calendarFilters.room !== 'all') {
        reportType = 'room';
      } else if (calendarFilters.day !== 'all') {
        reportType = 'day';
      }
      
      params.append('type', reportType);
      
      if (calendarFilters.section !== 'all') {
        params.append('sectionId', calendarFilters.section);
      }
      if (effectiveFacultyFilter && effectiveFacultyFilter !== 'all') {
        params.append('facultyId', effectiveFacultyFilter);
      }
      if (calendarFilters.day !== 'all') {
        params.append('day', calendarFilters.day);
      }
      if (calendarFilters.room !== 'all') {
        params.append('roomId', calendarFilters.room);
      }
      
      const response = await fetch(`/api/reports/pdf?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to generate PDF report');
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `QuackTrack_Schedule_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setExportingPdf(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setExportingExcel(true);
      
      // Build query params based on current filters
      const params = new URLSearchParams();
      const effectiveFacultyFilter = isFaculty ? session?.user?.id : calendarFilters.faculty;
      
      if (calendarFilters.section !== 'all') {
        params.append('sectionId', calendarFilters.section);
      }
      if (effectiveFacultyFilter && effectiveFacultyFilter !== 'all') {
        params.append('facultyId', effectiveFacultyFilter);
      }
      if (calendarFilters.day !== 'all') {
        params.append('day', calendarFilters.day);
      }
      if (calendarFilters.room !== 'all') {
        params.append('roomId', calendarFilters.room);
      }
      
      const response = await fetch(`/api/reports/excel?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to generate Excel report');
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `QuackTrack_Schedule_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting Excel:', error);
      alert('Failed to export Excel. Please try again.');
    } finally {
      setExportingExcel(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-emerald-100 dark:bg-emerald-900/80 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700';
      case 'generated': return 'bg-blue-100 dark:bg-blue-900/80 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700';
      case 'modified': return 'bg-amber-100 dark:bg-amber-900/80 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700';
      case 'conflict': return 'bg-red-100 dark:bg-red-900/80 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const handleScheduleClick = (day: string, startTime: string, endTime: string, allSchedules: Schedule[]) => {
    setSelectedSlot({
      day,
      startTime,
      endTime,
      schedules: allSchedules,
    });
  };

  // Handle clicking the main card body (not the "+N grouped" area)
  const handleCardPopoverClick = useCallback(
    (e: React.MouseEvent, schedule: Schedule) => {
      e.stopPropagation();
      popoverAnchorRef.current = e.currentTarget as HTMLDivElement;
      setPopoverSchedule(schedule);
      setPopoverOpen(true);
    },
    []
  );

  // Handle clicking the "+N grouped" badge or footer
  const handleGroupedClick = useCallback(
    (e: React.MouseEvent, day: string, startTime: string, endTime: string, allSchedules: Schedule[]) => {
      e.stopPropagation();
      setSelectedSlot({
        day,
        startTime,
        endTime,
        schedules: allSchedules,
      });
    },
    []
  );

  // Current hour for the "now" indicator
  const currentHour = new Date().getHours();
  const currentMinute = new Date().getMinutes();

  // Total grid height - include the full last hour (END_HOUR)
  const gridHeight = (END_HOUR - START_HOUR + 1) * ROW_HEIGHT;
  const gridHeightMobile = (END_HOUR - START_HOUR + 1) * ROW_HEIGHT_MOBILE;

  // Compute unique departments for legend
  const uniqueDepartments = useMemo(() => {
    const deptMap = new Map<string, { id: string; name: string; colorIndex: number }>();
    filteredSchedules.forEach(s => {
      const deptId = s.subject?.departmentId || s.subjectId || 'unknown';
      if (!deptMap.has(deptId)) {
        const hash = deptId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
        deptMap.set(deptId, {
          id: deptId,
          name: s.subject?.departmentName || s.subject?.subjectCode?.split(' ')[0] || `Dept ${deptMap.size + 1}`,
          colorIndex: hash % DEPARTMENT_COLORS.length,
        });
      }
    });
    return Array.from(deptMap.values());
  }, [filteredSchedules]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center gap-3"
        >
          <div className="relative">
            <CalendarIcon className="h-8 w-8 animate-spin text-emerald-500" />
            <div className="absolute inset-0 h-8 w-8 animate-ping rounded-full bg-emerald-500/20" />
          </div>
          <p className="text-sm text-muted-foreground animate-pulse">Loading calendar...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 p-2 shadow-lg shadow-emerald-500/20">
              <CalendarDays className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
                {isFaculty ? 'My Schedule' : 'Schedule Calendar'}
              </h1>
              <div className="h-1 w-20 mt-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" />
            </div>
          </div>
          <p className="text-muted-foreground mt-2 ml-11">
            {isFaculty ? 'View your class schedules' : 'View and manage class schedules'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handlePrint} className="hover-lift border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 dark:hover:text-emerald-300 hover:border-emerald-300 dark:hover:border-emerald-700">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <ScheduleExportButton schedules={filteredSchedules} />
          <Button variant="outline" size="sm" onClick={handleExport} className="hover-lift border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 dark:hover:text-emerald-300 hover:border-emerald-300 dark:hover:border-emerald-700">
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button 
            variant="default" 
            size="sm" 
            onClick={handleExportExcel}
            disabled={exportingExcel}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all duration-200"
          >
            {exportingExcel ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4 mr-2" />
            )}
            {exportingExcel ? 'Exporting...' : 'Export Excel'}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportPDF}
            disabled={exportingPdf}
            className="hover-lift border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 dark:hover:text-emerald-300 hover:border-emerald-300 dark:hover:border-emerald-700"
          >
            {exportingPdf ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileText className="h-4 w-4 mr-2" />
            )}
            {exportingPdf ? 'Generating...' : 'Export PDF'}
          </Button>
        </div>
      </motion.div>

      {/* Filters */}
      <Card className="p-0 sm:p-0">
        <div className="px-3 py-2 sm:px-4 sm:py-2.5 cursor-pointer select-none flex items-center justify-between" onClick={() => setFilterExpanded(!filterExpanded)}>
          <div className="text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2">
            <SlidersHorizontal className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Filters</span>
            <span className="sm:hidden">Filter</span>
              {/* Show active filter count */}
              {(calendarFilters.section !== 'all' || calendarFilters.day !== 'all' || calendarFilters.room !== 'all' || calendarFilters.classType !== 'all' || (!isFaculty && calendarFilters.faculty !== 'all') || searchQuery) && (
                <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                  {[calendarFilters.section !== 'all', calendarFilters.day !== 'all', calendarFilters.room !== 'all', calendarFilters.classType !== 'all', !isFaculty && calendarFilters.faculty !== 'all', !!searchQuery].filter(Boolean).length}
                </span>
              )}
              {calendarFilters.classType === 'executive' && (
                <span className="text-xs bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25 px-2 py-0.5 rounded-full flex items-center gap-1"><Crown className="h-3 w-3" /> Exec</span>
              )}
              {calendarFilters.classType === 'regular' && (
                <span className="text-xs bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 px-2 py-0.5 rounded-full">Regular</span>
              )}
          </div>
          <motion.div
            animate={{ rotate: filterExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </motion.div>
        </div>
        
        <AnimatePresence>
          {filterExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-3 pb-3 sm:px-4 sm:pb-4 space-y-2 sm:space-y-3">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-8 py-2 sm:pl-10 sm:pr-10 sm:py-2.5 text-xs sm:text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  />
                  {searchQuery && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSearchQuery('');
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </button>
                  )}
                </div>
                
                {/* Filter Dropdowns */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] sm:text-xs font-medium text-muted-foreground">Section</label>
                    <Select
                      value={calendarFilters.section}
                      onValueChange={(value) => setCalendarFilters({ section: value })}
                    >
                      <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sections</SelectItem>
                        {sections.map((section) => (
                          <SelectItem key={section.id} value={section.id}>
                            {section.sectionName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {!isFaculty && (
                    <div className="space-y-1">
                      <label className="text-[10px] sm:text-xs font-medium text-muted-foreground">Faculty</label>
                      <Select
                        value={calendarFilters.faculty}
                        onValueChange={(value) => setCalendarFilters({ faculty: value })}
                      >
                        <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm">
                          <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Faculty</SelectItem>
                          {faculty.map((f) => (
                            <SelectItem key={f.id} value={f.id}>
                              {f.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className="text-[10px] sm:text-xs font-medium text-muted-foreground">Day</label>
                    <Select
                      value={calendarFilters.day}
                      onValueChange={(value) => setCalendarFilters({ day: value as typeof calendarFilters.day })}
                    >
                      <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Days</SelectItem>
                        {DAYS.map((day) => (
                          <SelectItem key={day} value={day}>
                            {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] sm:text-xs font-medium text-muted-foreground">Room</label>
                    <Select
                      value={calendarFilters.room}
                      onValueChange={(value) => setCalendarFilters({ room: value })}
                    >
                      <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Rooms</SelectItem>
                        {rooms.map((room) => (
                          <SelectItem key={room.id} value={room.id}>
                            {room.roomName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] sm:text-xs font-medium text-muted-foreground">Class Type</label>
                    <Select
                      value={calendarFilters.classType}
                      onValueChange={(value) => setCalendarFilters({ classType: value })}
                    >
                      <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Classes</SelectItem>
                        <SelectItem value="regular">
                          <span className="flex items-center gap-1">Regular</span>
                        </SelectItem>
                        <SelectItem value="executive">
                          <span className="flex items-center gap-1"><Crown className="h-3 w-3 text-amber-600" /> Executive</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Quick Stats Summary Cards */}
      {(() => {
        const jsDay = new Date().getDay();
        const dayMap: Record<number, string> = { 0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday' };
        const todayName = dayMap[jsDay] || 'Monday';

        const uniqueRooms = new Set(filteredSchedules.filter(s => s.roomId).map(s => s.roomId));
        const uniqueFaculty = new Set(filteredSchedules.filter(s => s.facultyId).map(s => s.facultyId));
        const uniqueRoomsCount = uniqueRooms.size;
        const uniqueFacultyCount = uniqueFaculty.size;

        // Find busiest day
        const dayCounts: Record<string, number> = {};
        const DAYS_LIST = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        DAYS_LIST.forEach(d => { dayCounts[d] = 0; });
        filteredSchedules.forEach(s => {
          if (dayCounts[s.day] !== undefined) dayCounts[s.day]++;
        });
        let busiestDay = DAYS_LIST[0];
        let busiestCount = 0;
        DAYS_LIST.forEach(d => {
          if (dayCounts[d] > busiestCount) {
            busiestCount = dayCounts[d];
            busiestDay = d;
          }
        });

        const statsCards = [
          {
            label: 'Total Schedules',
            value: filteredSchedules.length,
            icon: CalendarIcon,
            color: 'text-emerald-600 dark:text-emerald-400',
            bgColor: 'bg-emerald-50 dark:bg-emerald-950/40',
            borderColor: 'border-emerald-200 dark:border-emerald-800',
          },
          {
            label: 'Rooms In Use',
            value: uniqueRoomsCount,
            icon: DoorOpen,
            color: 'text-sky-600 dark:text-sky-400',
            bgColor: 'bg-sky-50 dark:bg-sky-950/40',
            borderColor: 'border-sky-200 dark:border-sky-800',
          },
          {
            label: 'Faculty Teaching',
            value: uniqueFacultyCount,
            icon: Users,
            color: 'text-violet-600 dark:text-violet-400',
            bgColor: 'bg-violet-50 dark:bg-violet-950/40',
            borderColor: 'border-violet-200 dark:border-violet-800',
          },
          {
            label: 'Busiest Day',
            value: busiestDay.slice(0, 3),
            subValue: `${busiestCount} classes`,
            icon: BookOpen,
            color: 'text-amber-600 dark:text-amber-400',
            bgColor: 'bg-amber-50 dark:bg-amber-950/40',
            borderColor: 'border-amber-200 dark:border-amber-800',
          },
        ];

        return (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              {statsCards.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.1 + index * 0.05 }}
                  >
                    <Card className={cn('border', stat.borderColor, stat.bgColor)}>
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className={cn('rounded-lg p-2', stat.bgColor)}>
                          <Icon className={cn('h-4 w-4', stat.color)} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider truncate">
                            {stat.label}
                          </p>
                          <div className="flex items-baseline gap-1">
                            <p className={cn('text-lg sm:text-xl font-bold leading-tight', stat.color)}>
                              {stat.value}
                            </p>
                            {stat.subValue && (
                              <span className="text-[10px] text-muted-foreground hidden sm:inline">
                                {stat.subValue}
                              </span>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        );
      })()}

      {/* Schedule Stats with View Toggle */}
      <div className="flex items-center justify-between gap-2 text-xs sm:text-sm text-muted-foreground">
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <span>Total Schedules: <strong className="text-foreground">{filteredSchedules.length}</strong></span>
          {viewMode === 'calendar' && (
            <span>Time Slots: <strong className="text-foreground">{schedulesBySlot.size}</strong></span>
          )}
          {/* Today Quick Button */}
          {viewMode === 'calendar' && (() => {
            const jsDay = new Date().getDay();
            const dayMap: Record<number, string> = { 0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday' };
            const todayName = dayMap[jsDay] || '';
            const isWeekday = jsDay >= 1 && jsDay <= 6;
            if (!isWeekday) return null;
            return (
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 sm:h-8 sm:px-3 border-emerald-300 dark:border-emerald-700 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 text-emerald-700 dark:text-emerald-300 hover:from-emerald-100 hover:to-teal-100 dark:hover:from-emerald-900/50 dark:hover:to-teal-900/50 hover:text-emerald-800 dark:hover:text-emerald-200 shadow-sm"
                onClick={() => {
                  const todayCol = document.querySelector(`[data-day="${todayName}"]`);
                  if (todayCol) {
                    todayCol.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                  }
                }}
              >
                <CalendarDays className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                <span className="hidden sm:inline">Today</span>
                <span className="sm:hidden">{todayName.slice(0, 3)}</span>
              </Button>
            );
          })()}
        </div>
        {/* View Toggle - Enhanced with emerald gradient active state */}
        <div className="flex gap-0.5 border border-emerald-200/60 dark:border-emerald-800/60 rounded-lg p-0.5 shrink-0 bg-background/50 backdrop-blur-sm">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode('calendar')}
            className={cn(
              "h-7 px-2 sm:h-8 sm:px-3 transition-all duration-200",
              viewMode === 'calendar'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/25 hover:from-emerald-600 hover:to-teal-600'
                : 'hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600 dark:hover:text-emerald-400'
            )}
          >
            <CalendarIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-1" />
            <span className="hidden sm:inline">Calendar</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode('grid')}
            className={cn(
              "h-7 px-2 sm:h-8 sm:px-3 transition-all duration-200",
              viewMode === 'grid'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/25 hover:from-emerald-600 hover:to-teal-600'
                : 'hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600 dark:hover:text-emerald-400'
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-1" />
            <span className="hidden sm:inline">Grid</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode('print')}
            className={cn(
              "h-7 px-2 sm:h-8 sm:px-3 transition-all duration-200",
              viewMode === 'print'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/25 hover:from-emerald-600 hover:to-teal-600'
                : 'hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600 dark:hover:text-emerald-400'
            )}
          >
            <Printer className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-1" />
            <span className="hidden sm:inline">Print View</span>
          </Button>
        </div>
      </div>

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <>
          {/* Calendar Grid with Half-Block Support */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15, ease: 'easeOut' }}
          >
          <Card className="shadow-md border-emerald-200/40 dark:border-emerald-800/40 overflow-hidden">
            <CardContent className="p-0">
          <div className="overflow-x-auto" id="calendar-print-content">
            <div className="min-w-[850px] md:min-w-[900px]">
              {/* Header Row */}
              <div className="flex border-b bg-gradient-to-r from-emerald-50/80 to-teal-50/50 dark:from-emerald-950/30 dark:to-teal-950/20 sticky top-0 z-10">
                <div className="w-16 md:w-20 p-1.5 md:p-3 text-[10px] md:text-sm font-medium shrink-0 text-emerald-600 dark:text-emerald-400">Time</div>
                {DAYS.map((day) => {
                  const jsDay = new Date().getDay();
                  const dayMap: Record<number, string> = { 0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday' };
                  const todayName = dayMap[jsDay] || '';
                  const isToday = day === todayName;
                  return (
                  <div key={day} data-day={day} className={`flex-1 min-w-[115px] md:min-w-[130px] p-1.5 md:p-3 text-[10px] md:text-sm font-medium border-l transition-colors duration-200 ${isToday ? 'bg-gradient-to-b from-emerald-100 to-emerald-50/50 dark:from-emerald-900/40 dark:to-emerald-950/20 text-emerald-700 dark:text-emerald-300 border-b-2 border-b-emerald-500' : 'bg-gradient-to-b from-emerald-50/40 to-transparent dark:from-emerald-950/20 dark:to-transparent'}`}>
                    <div className="flex items-center gap-1.5">
                      <span className="hidden sm:inline">{day}</span>
                      <span className="sm:hidden">{day.slice(0, 3)}</span>
                      {isToday && (
                        <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500 text-white font-bold shadow-sm shadow-emerald-500/30">
                          <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
                          Today
                        </span>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>

              {/* Grid Container - Desktop */}
              <div className="hidden md:flex relative" style={{ height: gridHeight }}>
                {/* Time Column */}
                <div className="w-20 shrink-0 relative border-r">
                  {/* Generate time labels from START_HOUR to END_HOUR */}
                  {Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => {
                    const hour = START_HOUR + i;
                    return (
                      <div
                        key={hour}
                        className={`absolute left-0 right-0 flex items-center justify-center text-xs text-emerald-600/60 dark:text-emerald-400/50 font-medium border-t border-emerald-100/30 dark:border-emerald-900/20`}
                        style={{ top: i * ROW_HEIGHT, height: ROW_HEIGHT }}
                      >
                        {formatTime12Hour(`${hour.toString().padStart(2, '0')}:00`)}
                      </div>
                    );
                  })}
                </div>

                {/* Day Columns with Schedule Cards - Desktop */}
                {DAYS.map((day) => (
                  <div
                    key={day}
                    className="flex-1 min-w-[130px] relative border-l"
                    style={{ height: gridHeight }}
                  >
                    {/* Hour grid lines - emerald tinted */}
                    {Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => (
                      <div
                        key={i}
                        className={`absolute left-0 right-0 ${i % 2 === 0 ? 'border-t border-dashed border-emerald-200/30 dark:border-emerald-800/20' : 'border-t border-emerald-100/20 dark:border-emerald-900/10'}`}
                        style={{ top: i * ROW_HEIGHT }}
                      />
                    ))}

                    {/* Half-hour grid lines (dashed) - emerald tinted */}
                    {Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => (
                      <div
                        key={`half-${i}`}
                        className="absolute left-0 right-0 border-t border-dotted border-emerald-100/20 dark:border-emerald-900/10"
                        style={{ top: i * ROW_HEIGHT + HALF_ROW_HEIGHT }}
                      />
                    ))}

                    {/* Empty day placeholder */}
                    {getGroupedSchedulesForDay(day).length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="flex flex-col items-center gap-1 text-muted-foreground/30">
                          <div className="w-12 h-px border-t border-dashed border-emerald-200/30 dark:border-emerald-800/20" />
                          <span className="text-[10px] font-medium">No classes</span>
                          <div className="w-12 h-px border-t border-dashed border-emerald-200/30 dark:border-emerald-800/20" />
                        </div>
                      </div>
                    )}

                    {/* Current time indicator - Desktop */}
                    {(() => {
                      const jsDay = new Date().getDay();
                      const dayMap: Record<number, string> = { 0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday' };
                      const todayName = dayMap[jsDay] || '';
                      if (day !== todayName || currentHour < START_HOUR || currentHour >= END_HOUR) return null;
                      const topPosition = ((currentHour - START_HOUR) + currentMinute / 60) * ROW_HEIGHT;
                      return (
                        <div
                          className="absolute left-0 right-0 z-20 pointer-events-none"
                          style={{ top: topPosition }}
                        >
                          <div className="flex items-center">
                            <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.5)] -ml-1 shrink-0" />
                            <div className="h-[2px] flex-1 bg-gradient-to-r from-rose-500 to-rose-500/30" />
                          </div>
                        </div>
                      );
                    })()}

                    {/* Schedule Cards (Grouped) - Desktop with department colors & tooltips */}
                    {getGroupedSchedulesForDay(day).map(({ key, firstSchedule, count, allSchedules }) => {
                      const { top, height } = getSchedulePosition(firstSchedule, false);
                      const hasMultiple = count > 1;
                      const zIndex = getScheduleZIndex(firstSchedule.startTime);
                      const deptColor = getScheduleDepartmentColor(firstSchedule);
                      
                      return (
                        <TooltipProvider key={key} delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={`absolute left-1 right-1 rounded-lg border overflow-hidden cursor-pointer select-none calendar-card-hover hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 ${getStatusColor(firstSchedule.status)}`}
                                style={{ top: top + 2, height: height - 4, zIndex }}
                                onClick={(e) => handleCardPopoverClick(e, firstSchedule)}
                              >
                                {/* Department color gradient bar at top */}
                                <div className={`h-1 w-full bg-gradient-to-r ${deptColor.gradient}`} />
                                <div className="flex items-start justify-between gap-1 px-2 py-1 border-b border-muted/30">
                                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                    <div className={`w-2 h-2 rounded-full shrink-0 ${deptColor.dot}`} />
                                    <p className="font-semibold text-xs truncate">{firstSchedule.subject?.subjectCode}</p>
                                  </div>
                                  {hasMultiple && (
                                    <span
                                      className="text-[10px] px-1.5 py-0.5 shrink-0 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-semibold cursor-pointer hover:bg-emerald-500/30 transition-colors"
                                      onClick={(e) => handleGroupedClick(e, day, firstSchedule.startTime, firstSchedule.endTime, allSchedules)}
                                      title={`View all ${count} schedules`}
                                    >
                                      +{count - 1}
                                    </span>
                                  )}
                                </div>
                                <div className="px-2 space-y-1">
                                  <p className="text-[10px] text-muted-foreground truncate">{firstSchedule.subject?.subjectName}</p>
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3 shrink-0 text-muted-foreground" />
                                    <p className="text-[10px] text-muted-foreground truncate">{formatTimeRange(firstSchedule.startTime, firstSchedule.endTime)}</p>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <User className="h-3 w-3 shrink-0 text-muted-foreground" />
                                    <p className="text-[10px] text-muted-foreground truncate">{firstSchedule.faculty?.name}</p>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3 shrink-0 text-muted-foreground" />
                                    <p className="text-[10px] text-muted-foreground truncate">{firstSchedule.room?.roomName}</p>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Users className="h-3 w-3 shrink-0 text-muted-foreground" />
                                    <p className="text-[10px] text-muted-foreground truncate">{firstSchedule.section?.sectionName}</p>
                                  </div>
                                  {hasMultiple && (
                                    <div
                                      className="flex items-center gap-1 pt-2 mt-2 border-t border-muted/50 cursor-pointer hover:text-primary/80 transition-colors"
                                      onClick={(e) => handleGroupedClick(e, day, firstSchedule.startTime, firstSchedule.endTime, allSchedules)}
                                    >
                                      <Layers className="h-3 w-3 shrink-0 text-primary" />
                                      <p className="text-[10px] text-primary font-medium">Click to view all {count}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-[260px] bg-card text-card-foreground border shadow-xl p-3">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <div className={`w-3 h-3 rounded-full ${deptColor.dot}`} />
                                  <p className="font-bold text-sm">{firstSchedule.subject?.subjectCode}</p>
                                  <Badge variant="outline" className={`text-[10px] ${getStatusColor(firstSchedule.status)}`}>
                                    {firstSchedule.status.charAt(0).toUpperCase() + firstSchedule.status.slice(1)}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">{firstSchedule.subject?.subjectName}</p>
                                <div className="grid grid-cols-2 gap-1.5 text-xs">
                                  <div className="flex items-center gap-1.5">
                                    <Clock className="h-3 w-3 text-emerald-500" />
                                    <span>{formatTimeRange(firstSchedule.startTime, firstSchedule.endTime)}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <MapPin className="h-3 w-3 text-emerald-500" />
                                    <span>{firstSchedule.room?.roomName || 'N/A'}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <User className="h-3 w-3 text-emerald-500" />
                                    <span>{firstSchedule.faculty?.name || 'N/A'}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <Users className="h-3 w-3 text-emerald-500" />
                                    <span>{firstSchedule.section?.sectionName || 'N/A'}</span>
                                  </div>
                                </div>
                                {hasMultiple && (
                                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium pt-1 border-t border-border">
                                    +{count - 1} more schedule{count - 1 > 1 ? 's' : ''} at this slot
                                  </p>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Grid Container - Mobile (same as desktop but smaller) */}
              <div className="md:hidden flex relative" style={{ height: gridHeightMobile }}>
                {/* Time Column - Mobile */}
                <div className="w-16 shrink-0 relative border-r">
                  {Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => {
                    const hour = START_HOUR + i;
                    return (
                      <div
                        key={hour}
                        className="absolute left-0 right-0 flex items-center justify-center text-[10px] text-emerald-600/60 dark:text-emerald-400/50 font-medium border-t border-emerald-100/30 dark:border-emerald-900/20"
                        style={{ top: i * ROW_HEIGHT_MOBILE, height: ROW_HEIGHT_MOBILE }}
                      >
                        {formatTime12Hour(`${hour.toString().padStart(2, '0')}:00`)}
                      </div>
                    );
                  })}
                </div>

                {/* Day Columns - Mobile */}
                {DAYS.map((day) => (
                  <div
                    key={day}
                    className="flex-1 min-w-[115px] relative border-l"
                    style={{ height: gridHeightMobile }}
                  >
                    {/* Hour grid lines - Mobile (emerald tinted) */}
                    {Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => (
                      <div
                        key={i}
                        className={`absolute left-0 right-0 ${i % 2 === 0 ? 'border-t border-dashed border-emerald-200/30 dark:border-emerald-800/20' : 'border-t border-emerald-100/20 dark:border-emerald-900/10'}`}
                        style={{ top: i * ROW_HEIGHT_MOBILE }}
                      />
                    ))}

                    {/* Half-hour grid lines - Mobile (emerald tinted) */}
                    {Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => (
                      <div
                        key={`half-${i}`}
                        className="absolute left-0 right-0 border-t border-dotted border-emerald-100/20 dark:border-emerald-900/10"
                        style={{ top: i * ROW_HEIGHT_MOBILE + HALF_ROW_HEIGHT_MOBILE }}
                      />
                    ))}

                    {/* Empty day placeholder - Mobile */}
                    {getGroupedSchedulesForDay(day).length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="flex flex-col items-center gap-1 text-muted-foreground/30">
                          <div className="w-8 h-px border-t border-dashed border-emerald-200/30 dark:border-emerald-800/20" />
                          <span className="text-[9px] font-medium">No classes</span>
                          <div className="w-8 h-px border-t border-dashed border-emerald-200/30 dark:border-emerald-800/20" />
                        </div>
                      </div>
                    )}

                    {/* Current time indicator - Mobile */}
                    {(() => {
                      const jsDay = new Date().getDay();
                      const dayMap: Record<number, string> = { 0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday' };
                      const todayName = dayMap[jsDay] || '';
                      if (day !== todayName || currentHour < START_HOUR || currentHour >= END_HOUR) return null;
                      const topPosition = ((currentHour - START_HOUR) + currentMinute / 60) * ROW_HEIGHT_MOBILE;
                      return (
                        <div
                          className="absolute left-0 right-0 z-20 pointer-events-none"
                          style={{ top: topPosition }}
                        >
                          <div className="flex items-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_4px_rgba(244,63,94,0.5)] -ml-0.5 shrink-0" />
                            <div className="h-[1.5px] flex-1 bg-gradient-to-r from-rose-500 to-rose-500/30" />
                          </div>
                        </div>
                      );
                    })()}

                    {/* Schedule Cards - Mobile with department colors & tooltips */}
                    {getGroupedSchedulesForDay(day).map(({ key, firstSchedule, count, allSchedules }) => {
                      const { top, height } = getSchedulePosition(firstSchedule, true);
                      const hasMultiple = count > 1;
                      const zIndex = getScheduleZIndex(firstSchedule.startTime);
                      const deptColor = getScheduleDepartmentColor(firstSchedule);

                      return (
                        <TooltipProvider key={key} delayDuration={300}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={`absolute left-0.5 right-0.5 rounded-md border overflow-hidden cursor-pointer select-none calendar-card-hover-mobile hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 ${getStatusColor(firstSchedule.status)}`}
                                style={{ top: top + 1, height: height - 2, zIndex }}
                                onClick={(e) => handleCardPopoverClick(e, firstSchedule)}
                              >
                                {/* Department color gradient bar at top */}
                                <div className={`h-0.5 w-full bg-gradient-to-r ${deptColor.gradient}`} />
                                <div className="flex items-start justify-between gap-1 px-1.5 py-1 border-b border-muted/30">
                                  <div className="flex items-center gap-1 min-w-0 flex-1">
                                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${deptColor.dot}`} />
                                    <p className="font-semibold text-[11px] truncate">{firstSchedule.subject?.subjectCode}</p>
                                  </div>
                                  {hasMultiple && (
                                    <span
                                      className="text-[9px] px-1.5 py-0.5 shrink-0 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-semibold cursor-pointer hover:bg-emerald-500/30 transition-colors"
                                      onClick={(e) => handleGroupedClick(e, day, firstSchedule.startTime, firstSchedule.endTime, allSchedules)}
                                      title={`View all ${count} schedules`}
                                    >
                                      +{count - 1}
                                    </span>
                                  )}
                                </div>
                                <div className="px-1.5 py-1 space-y-1">
                                  <p className="text-[10px] text-muted-foreground truncate">{firstSchedule.subject?.subjectName}</p>
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3 shrink-0 text-muted-foreground" />
                                    <p className="text-[10px] text-muted-foreground truncate">{formatTimeRange(firstSchedule.startTime, firstSchedule.endTime)}</p>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <User className="h-3 w-3 shrink-0 text-muted-foreground" />
                                    <p className="text-[10px] text-muted-foreground truncate">{firstSchedule.faculty?.name}</p>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3 shrink-0 text-muted-foreground" />
                                    <p className="text-[10px] text-muted-foreground truncate">{firstSchedule.room?.roomName}</p>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Users className="h-3 w-3 shrink-0 text-muted-foreground" />
                                    <p className="text-[10px] text-muted-foreground truncate">{firstSchedule.section?.sectionName}</p>
                                  </div>
                                  {hasMultiple && (
                                    <div
                                      className="flex items-center gap-1 pt-1 mt-1 border-t border-muted/50 cursor-pointer hover:text-primary/80 transition-colors"
                                      onClick={(e) => handleGroupedClick(e, day, firstSchedule.startTime, firstSchedule.endTime, allSchedules)}
                                    >
                                      <Layers className="h-3 w-3 shrink-0 text-primary" />
                                      <p className="text-[10px] text-primary font-medium">View all {count}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[220px] bg-card text-card-foreground border shadow-xl p-2">
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-1.5">
                                  <div className={`w-2 h-2 rounded-full ${deptColor.dot}`} />
                                  <p className="font-bold text-xs">{firstSchedule.subject?.subjectCode}</p>
                                </div>
                                <p className="text-[10px] text-muted-foreground">{firstSchedule.subject?.subjectName}</p>
                                <div className="grid grid-cols-2 gap-1 text-[10px]">
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-2.5 w-2.5 text-emerald-500" />
                                    <span>{formatTimeRange(firstSchedule.startTime, firstSchedule.endTime)}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <MapPin className="h-2.5 w-2.5 text-emerald-500" />
                                    <span>{firstSchedule.room?.roomName || 'N/A'}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <User className="h-2.5 w-2.5 text-emerald-500" />
                                    <span>{firstSchedule.faculty?.name || 'N/A'}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Users className="h-2.5 w-2.5 text-emerald-500" />
                                    <span>{firstSchedule.section?.sectionName || 'N/A'}</span>
                                  </div>
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      </motion.div>

      {/* Legend - Enhanced with department colors */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <Card className="border-emerald-200/40 dark:border-emerald-800/40">
          <CardContent className="py-4 space-y-3">
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Status:</span>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="bg-emerald-100 dark:bg-emerald-900/80 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700">Approved</Badge>
                <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900/80 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700">Generated</Badge>
                <Badge variant="outline" className="bg-amber-100 dark:bg-amber-900/80 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700">Modified</Badge>
                <Badge variant="outline" className="bg-red-100 dark:bg-red-900/80 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700">Conflict</Badge>
              </div>
            </div>
            {/* Department Color Legend */}
            {uniqueDepartments.length > 0 && (
              <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-emerald-100 dark:border-emerald-900/50">
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <Palette className="h-3.5 w-3.5" />
                  Departments:
                </span>
                <div className="flex flex-wrap gap-2">
                  {uniqueDepartments.map((dept) => (
                    <div key={dept.id} className="flex items-center gap-1.5 text-xs">
                      <div className={`w-2.5 h-2.5 rounded-full ${DEPARTMENT_COLORS[dept.colorIndex].dot}`} />
                      <span className="text-muted-foreground">{dept.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
        </>
      )}

      {/* Grid View */}
      {viewMode === 'grid' && (
        <>
          {/* Quick Stats - Hidden for faculty */}
          {!isFaculty && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{filteredSchedules.length}</div>
                  <p className="text-sm text-muted-foreground">Total Schedules</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-emerald-600">
                    {filteredSchedules.filter(s => s.status === 'approved').length}
                  </div>
                  <p className="text-sm text-muted-foreground">Approved</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-blue-600">
                    {filteredSchedules.filter(s => s.status === 'generated').length}
                  </div>
                  <p className="text-sm text-muted-foreground">Generated</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-red-600">
                    {filteredSchedules.filter(s => s.status === 'conflict').length}
                  </div>
                  <p className="text-sm text-muted-foreground">With Conflicts</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Schedule Cards Grid */}
          <Card className="border-emerald-200/40 dark:border-emerald-800/40">
            <CardContent className="pt-6">
              {filteredSchedules.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No schedules found</p>
                  <p className="text-sm">Try adjusting your filters</p>
                </div>
              ) : (
                <div className="max-h-[500px] md:max-h-none overflow-y-auto md:overflow-visible">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredSchedules.map((schedule) => {
                      const deptColor = getScheduleDepartmentColor(schedule);
                      return (
                      <div key={schedule.id} className="rounded-lg border bg-card p-4 calendar-grid-card-hover cursor-pointer select-none overflow-hidden relative">
                        {/* Department gradient accent bar */}
                        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${deptColor.gradient}`} />
                        <div className="space-y-3 pt-1">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${deptColor.dot} shrink-0`} />
                              <div>
                                <p className="font-medium">{schedule.subject?.subjectCode}</p>
                                <p className="text-xs text-muted-foreground">{schedule.subject?.subjectName}</p>
                              </div>
                            </div>
                            <Badge variant="outline" className={getStatusColor(schedule.status)}>
                              {schedule.status.charAt(0).toUpperCase() + schedule.status.slice(1)}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={schedule.faculty?.image || ''} alt={schedule.faculty?.name || ''} />
                                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                  {schedule.faculty?.name?.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="truncate">{schedule.faculty?.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span className="truncate">{schedule.section?.sectionName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span className="truncate">{schedule.room?.roomName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="truncate">{schedule.day}</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t">
                            <p className="text-sm font-medium">
                              {formatTimeRange(schedule.startTime, schedule.endTime)}
                            </p>
                          </div>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Print View */}
      {viewMode === 'print' && (
        <PrintScheduleView schedules={filteredSchedules} />
      )}

      {/* Schedule Detail Dialog */}
      <Dialog open={!!selectedSlot} onOpenChange={() => setSelectedSlot(null)}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Schedules for {selectedSlot?.day} - {selectedSlot && formatTimeRange(selectedSlot.startTime, selectedSlot.endTime)}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
            <p className="text-sm text-muted-foreground">
              {selectedSlot?.schedules.length} schedule(s) at this time slot
            </p>
            <AnimatePresence>
              {selectedSlot?.schedules.map((schedule, index) => (
                <motion.div
                  key={schedule.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-4 rounded-lg border ${getStatusColor(schedule.status)}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold">{schedule.subject?.subjectCode}</p>
                    <Badge variant="outline" className="text-xs">
                      {schedule.status.charAt(0).toUpperCase() + schedule.status.slice(1)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{schedule.subject?.subjectName}</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{schedule.faculty?.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{schedule.room?.roomName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{schedule.section?.sectionName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{formatTimeRange(schedule.startTime, schedule.endTime)}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </DialogContent>
      </Dialog>

      {/* Schedule Card Popover - shows on single card click */}
      {popoverSchedule && (
        <ScheduleCardPopover
          schedule={popoverSchedule}
          isOpen={popoverOpen}
          onOpenChange={(open) => {
            setPopoverOpen(open);
            if (!open && editorOpen) return;
          }}
          onEdit={() => setEditorOpen(true)}
        />
      )}

      {/* Schedule Quick Editor - shows on edit action */}
      <ScheduleQuickEditor
        schedule={popoverSchedule}
        isOpen={editorOpen}
        onOpenChange={(open) => {
          setEditorOpen(open);
          if (!open) setPopoverOpen(false);
        }}
        onSave={fetchData}
      />
    </motion.div>
  );
}
