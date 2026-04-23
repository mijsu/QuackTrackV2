'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from './DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import {
  Plus, MoreHorizontal, Pencil, Trash2, CalendarDays, Clock, User, MapPin, BookOpen,
  Users, AlertTriangle, AlertCircle, CheckCircle, Lightbulb, Sparkles, ArrowRight, Loader2,
  Filter, X, ChevronDown, ChevronUp, Printer, CheckCircle2, ShieldCheck, Zap, Download,
  Crown, GraduationCap, DoorOpen, UserCircle, LayoutGrid, List, Calendar, GitCompareArrows
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion, AnimatePresence } from 'framer-motion';
import type { Schedule, User, Section, Room, Subject, DayOfWeek } from '@/types';
import { DAYS, TIME_OPTIONS } from '@/types';
import { formatTimeRange } from '@/lib/utils';
import { useAppStore } from '@/store';
import { ExportButton } from '@/components/ui/ExportButton';
import { StatusBadge, resolveStatus } from '@/components/ui/StatusBadge';
import { PrintScheduleView } from '@/components/schedules/PrintScheduleView';
import { ScheduleStatsSummary } from '@/components/schedules/ScheduleStatsSummary';
import { ScheduleVersionCompare } from '@/components/schedules/ScheduleVersionCompare';
import { EmptyState } from '@/components/ui/EmptyState';
import { BatchActionBar, SelectAllCheckbox } from '@/components/ui/BatchActionBar';
import { cn } from '@/lib/utils';
import { QuickFilters, type FilterOption } from '@/components/ui/QuickFilters';

// ---------------------------------------------------------------------------
// Color helpers for schedule entries
// ---------------------------------------------------------------------------

const DEPARTMENT_COLORS = [
  { border: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-500', light: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-700 dark:text-emerald-400' },
  { border: 'from-teal-500 to-cyan-500', bg: 'bg-teal-500', light: 'bg-teal-50 dark:bg-teal-950/30', text: 'text-teal-700 dark:text-teal-400' },
  { border: 'from-amber-500 to-orange-500', bg: 'bg-amber-500', light: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-700 dark:text-amber-400' },
  { border: 'from-violet-500 to-purple-500', bg: 'bg-violet-500', light: 'bg-violet-50 dark:bg-violet-950/30', text: 'text-violet-700 dark:text-violet-400' },
  { border: 'from-rose-500 to-pink-500', bg: 'bg-rose-500', light: 'bg-rose-50 dark:bg-rose-950/30', text: 'text-rose-700 dark:text-rose-400' },
  { border: 'from-cyan-500 to-blue-500', bg: 'bg-cyan-500', light: 'bg-cyan-50 dark:bg-cyan-950/30', text: 'text-cyan-700 dark:text-cyan-400' },
];

const DAY_COLORS = [
  'bg-emerald-500',
  'bg-teal-500',
  'bg-cyan-500',
  'bg-amber-500',
  'bg-violet-500',
  'bg-rose-500',
];

function getScheduleColor(schedule: Schedule): typeof DEPARTMENT_COLORS[number] {
  // Use subject departmentId hash for consistent color per department
  const hash = (schedule.subject?.departmentId || schedule.subjectId || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return DEPARTMENT_COLORS[hash % DEPARTMENT_COLORS.length];
}

// ---------------------------------------------------------------------------
// Conflict / AvailableSlot types
// ---------------------------------------------------------------------------

interface Conflict {
  type: string;
  severity: 'critical' | 'warning' | 'info';
  description: string;
  conflictingSchedule: {
    id: string;
    subject?: { subjectCode: string; subjectName: string } | null;
    faculty?: { name: string } | null;
    room?: { roomName: string } | null;
    section?: { sectionName: string } | null;
    day: string;
    startTime: string;
    endTime: string;
  } | null;
}

interface AvailableSlot {
  day: string;
  startTime: string;
  endTime: string;
  score: number;
  reasons: string[];
}

// ---------------------------------------------------------------------------
// View mode type
// ---------------------------------------------------------------------------

type ViewMode = 'table' | 'timeline';

// ===========================================================================
// Main Component
// ===========================================================================

export function SchedulesView() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [faculty, setFaculty] = useState<User[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  // Conflict detection state
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [checkingConflicts, setCheckingConflicts] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  
  // Filter state
  const [filters, setFilters] = useState({
    subjectId: 'all',
    facultyId: 'all',
    sectionId: 'all',
    roomId: 'all',
    day: 'all',
    status: 'all',
    classType: 'all',
  });
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  
  // Print dialog state
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  // Compare versions dialog state
  const [compareDialogOpen, setCompareDialogOpen] = useState(false);
  
  // Get conflict resolution context from store
  const { conflictResolutionContext, clearConflictResolutionContext } = useAppStore();

  useEffect(() => {
    fetchData();
  }, []);

  // Handle conflict resolution context - open edit/delete modal when navigating from conflicts
  useEffect(() => {
    if (!loading && conflictResolutionContext && schedules.length > 0) {
      const { scheduleIdToEdit, scheduleIdToDelete } = conflictResolutionContext;
      
      if (scheduleIdToEdit) {
        const schedule = schedules.find(s => s.id === scheduleIdToEdit);
        if (schedule) {
          handleEdit(schedule);
          clearConflictResolutionContext();
        }
      } else if (scheduleIdToDelete) {
        const schedule = schedules.find(s => s.id === scheduleIdToDelete);
        if (schedule) {
          handleDelete(schedule);
          clearConflictResolutionContext();
        }
      }
    }
  }, [loading, conflictResolutionContext, schedules]);

  const fetchData = async () => {
    try {
      const [schedulesRes, usersRes, sectionsRes, roomsRes, subjectsRes] = await Promise.all([
        fetch('/api/schedules'),
        fetch('/api/users?role=faculty'),
        fetch('/api/sections'),
        fetch('/api/rooms'),
        fetch('/api/subjects'),
      ]);

      const schedulesData = await schedulesRes.json();
      const usersData = await usersRes.json();
      const sectionsData = await sectionsRes.json();
      const roomsData = await roomsRes.json();
      const subjectsData = await subjectsRes.json();

      // Check for API errors
      if (usersData.error) {
        console.error('Faculty API error:', usersData.error);
        toast.error(`Failed to load faculty: ${usersData.error}`);
      }
      
      // Ensure we always set arrays (APIs might return error objects)
      setSchedules(Array.isArray(schedulesData) ? schedulesData : []);
      setFaculty(Array.isArray(usersData) ? usersData : []);
      setSections(Array.isArray(sectionsData) ? sectionsData : []);
      setRooms(Array.isArray(roomsData) ? roomsData : []);
      setSubjects(Array.isArray(subjectsData) ? subjectsData : []);
      
      // Show warning if no faculty available
      if (!Array.isArray(usersData) || usersData.length === 0) {
        console.warn('No faculty members found. Please add faculty users first.');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
      // Set empty arrays on error
      setSchedules([]);
      setFaculty([]);
      setSections([]);
      setRooms([]);
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  };

  // Check for conflicts when form data changes
  const checkConflicts = useCallback(async () => {
    const { facultyId, roomId, sectionId, day, startTime, endTime } = formData;
    
    // Only check if we have all required fields
    if (!facultyId || !sectionId || !day || !startTime || !endTime) {
      setConflicts([]);
      return;
    }

    // Validate time order
    if (startTime >= endTime) {
      return;
    }

    setCheckingConflicts(true);
    try {
      const res = await fetch('/api/schedules/check-conflicts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facultyId,
          roomId,
          sectionId,
          day,
          startTime,
          endTime,
          excludeScheduleId: selectedSchedule?.id,
        }),
      });

      const data = await res.json();
      setConflicts(data.conflicts || []);
    } catch (error) {
      console.error('Error checking conflicts:', error);
    } finally {
      setCheckingConflicts(false);
    }
  }, [formData, selectedSchedule?.id]);

  // Get available slots suggestions
  const fetchAvailableSlots = useCallback(async () => {
    const { facultyId, roomId, sectionId, day } = formData;
    
    // Need at least one resource to check availability
    if (!facultyId && !roomId && !sectionId) {
      setAvailableSlots([]);
      return;
    }

    setLoadingSlots(true);
    try {
      const params = new URLSearchParams();
      if (facultyId) params.append('facultyId', facultyId as string);
      if (roomId) params.append('roomId', roomId as string);
      if (sectionId) params.append('sectionId', sectionId as string);
      if (day) params.append('day', day as string);
      if (selectedSchedule?.id) params.append('excludeScheduleId', selectedSchedule.id);
      
      // Calculate duration from current form data
      const startTime = formData.startTime as string;
      const endTime = formData.endTime as string;
      if (startTime && endTime && endTime > startTime) {
        const startMinutes = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]);
        const endMinutes = parseInt(endTime.split(':')[0]) * 60 + parseInt(endTime.split(':')[1]);
        const durationHours = Math.ceil((endMinutes - startMinutes) / 60);
        params.append('duration', durationHours.toString());
      } else {
        params.append('duration', '3'); // Default 3 hours
      }

      const res = await fetch(`/api/schedules/check-conflicts?${params.toString()}`);
      const data = await res.json();
      setAvailableSlots(data.availableSlots || []);
    } catch (error) {
      console.error('Error fetching available slots:', error);
    } finally {
      setLoadingSlots(false);
    }
  }, [formData, selectedSchedule?.id]);

  // Check conflicts when relevant form fields change
  useEffect(() => {
    if (dialogOpen) {
      checkConflicts();
    }
  }, [dialogOpen, formData.facultyId, formData.roomId, formData.sectionId, formData.day, formData.startTime, formData.endTime, checkConflicts]);

  // Fetch available slots when resources change
  useEffect(() => {
    if (dialogOpen) {
      fetchAvailableSlots();
    }
  }, [dialogOpen, formData.facultyId, formData.roomId, formData.sectionId, fetchAvailableSlots]);

  const handleCreate = () => {
    setSelectedSchedule(null);
    setFormData({
      subjectId: '',
      facultyId: '',
      sectionId: '',
      roomId: '',
      day: 'Monday',
      startTime: '08:00',
      endTime: '10:00',
    });
    setFormErrors({});
    setConflicts([]);
    setAvailableSlots([]);
    setDialogOpen(true);
  };

  const handleEdit = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setFormData({
      subjectId: schedule.subjectId,
      facultyId: schedule.facultyId,
      sectionId: schedule.sectionId,
      roomId: schedule.roomId,
      day: schedule.day,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
    });
    setFormErrors({});
    setConflicts([]);
    setAvailableSlots([]);
    setDialogOpen(true);
  };

  // Apply suggested slot
  const handleApplySlot = (slot: AvailableSlot) => {
    setFormData(prev => ({
      ...prev,
      day: slot.day,
      startTime: slot.startTime,
      endTime: slot.endTime,
    }));
    toast.success(`Applied suggested slot: ${slot.day} ${slot.startTime} - ${slot.endTime}`);
  };

  const handleDelete = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setDeleteDialogOpen(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.subjectId) errors.subjectId = 'Subject is required';
    if (!formData.facultyId) errors.facultyId = 'Faculty is required';
    if (!formData.sectionId) errors.sectionId = 'Section is required';
    // Room is optional — no validation needed
    if (!formData.day) errors.day = 'Day is required';
    if (!formData.startTime) errors.startTime = 'Start time is required';
    if (!formData.endTime) errors.endTime = 'End time is required';
    if (formData.startTime && formData.endTime && formData.startTime >= formData.endTime) {
      errors.endTime = 'End time must be after start time';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      const url = selectedSchedule ? `/api/schedules/${selectedSchedule.id}` : '/api/schedules';
      const method = selectedSchedule ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          modifiedBy: 'current-user',
        }),
      });

      const data = await res.json();
      if (res.ok) {
        if (data.conflicts && data.conflicts.length > 0) {
          toast.warning(`Schedule ${selectedSchedule ? 'updated' : 'created'} with ${data.conflicts.length} conflict(s)`);
        } else {
          toast.success(selectedSchedule ? 'Schedule updated' : 'Schedule created');
        }
        setDialogOpen(false);
        fetchData();
      } else {
        toast.error(data.error || 'Operation failed');
      }
    } catch {
      toast.error('Operation failed');
    }
  };

  const confirmDelete = async () => {
    if (!selectedSchedule) return;

    try {
      const res = await fetch(`/api/schedules/${selectedSchedule.id}?modifiedBy=current-user`, {
        method: 'DELETE'
      });
      if (res.ok) {
        toast.success('Schedule deleted');
        setDeleteDialogOpen(false);
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Delete failed');
      }
    } catch {
      toast.error('Delete failed');
    }
  };

  // Filter schedules based on selected filters
  const filteredSchedules = useMemo(() => {
    return schedules.filter(schedule => {
      if (filters.subjectId !== 'all' && schedule.subjectId !== filters.subjectId) return false;
      if (filters.facultyId !== 'all' && schedule.facultyId !== filters.facultyId) return false;
      if (filters.sectionId !== 'all' && schedule.sectionId !== filters.sectionId) return false;
      if (filters.roomId !== 'all' && schedule.roomId !== filters.roomId) return false;
      if (filters.day !== 'all' && schedule.day !== filters.day) return false;
      if (filters.status !== 'all' && schedule.status !== filters.status) return false;
      if (filters.classType === 'executive' && schedule.section?.classType !== 'executive') return false;
      if (filters.classType === 'regular' && schedule.section?.classType === 'executive') return false;
      return true;
    });
  }, [schedules, filters]);

  // Count schedules by day for quick filter badges
  const dayFilterOptions: FilterOption[] = useMemo(() => {
    return DAYS.map((day) => ({
      value: day,
      label: day,
      count: schedules.filter((s) => s.day === day).length || undefined,
      icon: <CalendarDays className="h-3.5 w-3.5" />,
    }));
  }, [schedules]);

  // Status filter options with colored icons
  const statusFilterOptions: FilterOption[] = useMemo(() => {
    return [
      { value: 'approved', label: 'Approved', icon: <CheckCircle2 className="h-3.5 w-3.5" />,
        count: schedules.filter((s) => s.status === 'approved').length || undefined },
      { value: 'generated', label: 'Generated', icon: <Zap className="h-3.5 w-3.5" />,
        count: schedules.filter((s) => s.status === 'generated').length || undefined },
      { value: 'modified', label: 'Modified', icon: <Pencil className="h-3.5 w-3.5" />,
        count: schedules.filter((s) => s.status === 'modified').length || undefined },
      { value: 'conflict', label: 'Conflict', icon: <AlertTriangle className="h-3.5 w-3.5" />,
        count: schedules.filter((s) => s.status === 'conflict').length || undefined },
    ];
  }, [schedules]);

  // Day active values derived from filters state
  const dayActiveFilters = useMemo(() => {
    return filters.day !== 'all' ? [filters.day] : [];
  }, [filters.day]);

  const statusActiveFilters = useMemo(() => {
    return filters.status !== 'all' ? [filters.status] : [];
  }, [filters.status]);

  // Count active filters (excluding day/status since they have quick filters)
  const activeFilterCount = useMemo(() => {
    return Object.values(filters).filter(v => v !== 'all').length;
  }, [filters]);

  // Day counts for tab badges
  const dayCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    DAYS.forEach(d => { counts[d] = 0; });
    filteredSchedules.forEach(s => {
      if (counts[s.day] !== undefined) counts[s.day]++;
    });
    return counts;
  }, [filteredSchedules]);

  // Schedules grouped by day for timeline view
  const schedulesByDay = useMemo(() => {
    const grouped: Record<string, Schedule[]> = {};
    DAYS.forEach(d => { grouped[d] = []; });
    filteredSchedules.forEach(s => {
      if (grouped[s.day]) grouped[s.day].push(s);
    });
    // Sort each day by startTime
    Object.keys(grouped).forEach(d => {
      grouped[d].sort((a, b) => a.startTime.localeCompare(b.startTime));
    });
    return grouped;
  }, [filteredSchedules]);

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      subjectId: 'all',
      facultyId: 'all',
      sectionId: 'all',
      roomId: 'all',
      day: 'all',
      status: 'all',
      classType: 'all',
    });
  };

  // Batch selection handlers
  const toggleRow = (id: string) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllRows = () => {
    setSelectedRows(new Set(filteredSchedules.map(s => s.id)));
  };

  const clearSelection = () => {
    setSelectedRows(new Set());
  };

  const batchDeleteSelected = async (ids: string[]) => {
    setIsDeleting(true);
    let successCount = 0;
    let errorCount = 0;
    for (const id of ids) {
      try {
        const res = await fetch(`/api/schedules/${id}?modifiedBy=current-user`, { method: 'DELETE' });
        if (res.ok) successCount++;
        else errorCount++;
      } catch {
        errorCount++;
      }
    }
    if (successCount > 0) toast.success(`Deleted ${successCount} schedule${successCount !== 1 ? 's' : ''}`);
    if (errorCount > 0) toast.error(`Failed to delete ${errorCount} schedule${errorCount !== 1 ? 's' : ''}`);
    setIsDeleting(false);
    clearSelection();
    setBatchDeleteDialogOpen(false);
    fetchData();
  };

  const exportSelected = (ids: string[]) => {
    const selected = filteredSchedules.filter(s => ids.includes(s.id));
    if (selected.length === 0) return;
    const data = selected.map(s => ({
      Day: s.day,
      StartTime: s.startTime,
      EndTime: s.endTime,
      SubjectCode: s.subject?.subjectCode || '',
      SubjectName: s.subject?.subjectName || '',
      Faculty: s.faculty?.name || '',
      Section: s.section?.sectionName || '',
      Room: s.room?.roomName || 'No Room',
      Status: s.status,
    }));
    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(','),
      ...data.map(row => headers.map(h => `"${String(row[h as keyof typeof row]).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'selected-schedules.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${selected.length} schedules`);
  };

  const batchChangeStatus = async (ids: string[], status: string) => {
    let successCount = 0;
    let errorCount = 0;
    for (const id of ids) {
      try {
        const res = await fetch(`/api/schedules/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status, modifiedBy: 'current-user' }),
        });
        if (res.ok) successCount++;
        else errorCount++;
      } catch {
        errorCount++;
      }
    }
    if (successCount > 0) toast.success(`Updated ${successCount} schedule${successCount !== 1 ? 's' : ''} to ${status}`);
    if (errorCount > 0) toast.error(`Failed to update ${errorCount} schedule${errorCount !== 1 ? 's' : ''}`);
    clearSelection();
    fetchData();
  };

  // =========================================================================
  // Table columns
  // =========================================================================

  const columns: ColumnDef<Schedule>[] = [
    {
      id: 'select',
      size: 40,
      header: () => (
        <SelectAllCheckbox
          selectedCount={selectedRows.size}
          totalCount={filteredSchedules.length}
          onSelectAll={selectAllRows}
          onClearSelection={clearSelection}
        />
      ),
      cell: ({ row }) => {
        const isSelected = selectedRows.has(row.original.id);
        return (
          <button
            onClick={(e) => { e.stopPropagation(); toggleRow(row.original.id); }}
            className={cn(
              'flex items-center justify-center h-4 w-4 rounded border transition-all duration-150',
              isSelected
                ? 'bg-emerald-600 border-emerald-600 text-white'
                : 'border-input bg-background hover:bg-muted'
            )}
            aria-label={isSelected ? 'Deselect row' : 'Select row'}
          >
            {isSelected && (
              <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        );
      },
    },
    {
      accessorKey: 'subject',
      header: 'Subject',
      cell: ({ row }) => {
        const schedule = row.original;
        const color = getScheduleColor(schedule);
        return (
          <div className="flex items-center gap-2">
            <div className={cn('h-8 w-1 rounded-full bg-gradient-to-b', color.border)} />
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="font-medium">{schedule.subject?.subjectCode}</p>
              <p className="text-xs text-muted-foreground">{schedule.subject?.subjectName}</p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'faculty',
      header: 'Faculty',
      cell: ({ row }) => {
        const facultyData = row.original.faculty;
        return (
          <div className="flex items-center gap-2">
            <UserCircle className="h-4 w-4 text-emerald-500" />
            <span>{facultyData?.name}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'section',
      header: 'Section',
      cell: ({ row }) => {
        const section = row.original.section;
        const isExecutive = section?.classType === 'executive';
        return (
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div className="flex flex-col gap-0.5">
              <span>{section?.sectionName}</span>
              {isExecutive && (
                <Badge variant="outline" className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/25 text-[10px] px-1.5 py-0 w-fit">
                  <Crown className="h-2.5 w-2.5 mr-0.5" />
                  Executive
                </Badge>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'room',
      header: 'Room',
      cell: ({ row }) => {
        const room = row.original.room;
        return (
          <div className="flex items-center gap-2">
            <DoorOpen className="h-4 w-4 text-teal-500" />
            <Badge variant="outline" className="bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-400 border-teal-500/25 text-xs">
              {room?.roomName}
            </Badge>
          </div>
        );
      },
    },
    {
      accessorKey: 'day',
      header: 'Day & Time',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-amber-500" />
          <div>
            <p className="font-medium">{row.original.day}</p>
            <p className="text-xs text-muted-foreground">
              {formatTimeRange(row.original.startTime, row.original.endTime)}
            </p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status || 'generated';
        return <StatusBadge status={resolveStatus(status)} label={status} />;
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const schedule = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleEdit(schedule)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(schedule)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // =========================================================================
  // Loading state
  // =========================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <CalendarDays className="h-8 w-8 animate-spin text-emerald-500" />
          <p className="text-sm text-muted-foreground">Loading schedules...</p>
        </div>
      </div>
    );
  }

  // =========================================================================
  // Time slot definitions for timeline grid
  // =========================================================================

  const TIME_SLOTS_GRID = [
    { start: '07:00', end: '08:00', label: '7 AM' },
    { start: '08:00', end: '09:00', label: '8 AM' },
    { start: '09:00', end: '10:00', label: '9 AM' },
    { start: '10:00', end: '11:00', label: '10 AM' },
    { start: '11:00', end: '12:00', label: '11 AM' },
    { start: '12:00', end: '13:00', label: '12 PM' },
    { start: '13:00', end: '14:00', label: '1 PM' },
    { start: '14:00', end: '15:00', label: '2 PM' },
    { start: '15:00', end: '16:00', label: '3 PM' },
    { start: '16:00', end: '17:00', label: '4 PM' },
    { start: '17:00', end: '18:00', label: '5 PM' },
    { start: '18:00', end: '19:00', label: '6 PM' },
    { start: '19:00', end: '20:00', label: '7 PM' },
    { start: '20:00', end: '21:00', label: '8 PM' },
  ];

  function getSchedulesForSlot(day: string, slotStart: string, slotEnd: string): Schedule[] {
    return (schedulesByDay[day] || []).filter(s => {
      return s.startTime < slotEnd && s.endTime > slotStart;
    });
  }

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        {/* ===== HEADER ===== */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-600">Manage Schedules</h1>
            <div className="h-1 w-20 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 mt-2" />
            <p className="text-muted-foreground mt-1">Create and manage class schedules</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* View Mode Toggle */}
            <div className="flex items-center rounded-lg border border-border bg-background p-0.5">
              <button
                onClick={() => setViewMode('table')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200',
                  viewMode === 'table'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <List className="h-3.5 w-3.5" />
                Table
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200',
                  viewMode === 'timeline'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <Calendar className="h-3.5 w-3.5" />
                Timeline
              </button>
            </div>
            <ExportButton
              data={filteredSchedules.map(s => ({
                Day: s.day,
                StartTime: s.startTime,
                EndTime: s.endTime,
                SubjectCode: s.subject?.subjectCode || '',
                SubjectName: s.subject?.subjectName || '',
                Faculty: s.faculty?.name || '',
                Section: s.section?.sectionName || '',
                Room: s.room?.roomName || 'No Room',
                Status: s.status,
              }))}
              filename="schedules"
            />
            <Button variant="outline" size="sm" onClick={() => setCompareDialogOpen(true)} className="hover:border-emerald-500/30 hover:shadow-md transition-all duration-200">
              <GitCompareArrows className="h-4 w-4 mr-2" />
              Compare Versions
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPrintDialogOpen(true)} className="hover:border-emerald-500/30 hover:shadow-md transition-all duration-200">
              <Printer className="h-4 w-4 mr-2" />
              Print Schedule
            </Button>
            <Button onClick={handleCreate} className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-md hover:shadow-lg transition-all duration-200">
              <Plus className="mr-2 h-4 w-4" />
              Add Schedule
            </Button>
          </div>
        </div>

        {/* ===== STATS SUMMARY ===== */}
        <ScheduleStatsSummary
          schedules={schedules}
          totalFaculty={faculty.length}
        />

        {/* ===== ENHANCED DAY TABS ===== */}
        <div className="space-y-1">
          <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
            {DAYS.map((day, i) => {
              const isActive = filters.day === day;
              const count = dayCounts[day] || 0;
              return (
                <motion.button
                  key={day}
                  onClick={() => setFilters(prev => ({ ...prev, day: isActive ? 'all' : day }))}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    'relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap',
                    isActive
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/20'
                      : 'bg-background border border-border text-muted-foreground hover:bg-emerald-50 dark:hover:bg-emerald-950/20 hover:text-foreground'
                  )}
                >
                  {/* Colored indicator dot */}
                  <span className={cn(
                    'h-2 w-2 rounded-full shrink-0',
                    isActive ? 'bg-white/80' : DAY_COLORS[i]
                  )} />
                  <span>{day.slice(0, 3)}</span>
                  {/* Count badge */}
                  {count > 0 && (
                    <span className={cn(
                      'text-[10px] px-1.5 py-0 rounded-full leading-none font-semibold',
                      isActive
                        ? 'bg-white/25 text-white'
                        : 'bg-muted text-muted-foreground'
                    )}>
                      {count}
                    </span>
                  )}
                  {/* Active underline animation */}
                  {isActive && (
                    <motion.div
                      layoutId="day-tab-underline"
                      className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-white/60"
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Status quick filters (compact) */}
          <QuickFilters
            label="Filter by Status"
            filters={statusFilterOptions}
            activeFilters={statusActiveFilters}
            onFilterChange={(values) =>
              setFilters((prev) => ({ ...prev, status: values.length > 0 ? values[0] : 'all' }))
            }
            mode="single"
          />
        </div>

        {/* ===== MORE FILTERS ===== */}
        <Card className="p-0 sm:p-0">
          <div className="px-3 py-2 sm:px-4 sm:py-2.5 cursor-pointer select-none flex items-center justify-between" onClick={() => setFiltersExpanded(!filtersExpanded)}>
            <div className="text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2">
              <Filter className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">More Filters</span>
              <span className="sm:hidden">More</span>
              {activeFilterCount > 0 && (
                <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </div>
            <motion.div
              animate={{ rotate: filtersExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </motion.div>
          </div>
          
          <AnimatePresence>
            {filtersExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-3 pb-3 sm:px-4 sm:pb-4 space-y-2 sm:space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-4">
                    <div className="space-y-1 min-w-0">
                      <label className="text-[10px] sm:text-xs font-medium text-muted-foreground">Subject</label>
                      <Select
                        value={filters.subjectId}
                        onValueChange={(value) => setFilters({ ...filters, subjectId: value })}
                      >
                        <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm w-full">
                          <span className="truncate">
                            <SelectValue placeholder="All" />
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Subjects</SelectItem>
                          {subjects.map((subject) => (
                            <SelectItem key={subject.id} value={subject.id}>
                              {subject.subjectCode}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1 min-w-0">
                      <label className="text-[10px] sm:text-xs font-medium text-muted-foreground">Faculty</label>
                      <Select
                        value={filters.facultyId}
                        onValueChange={(value) => setFilters({ ...filters, facultyId: value })}
                      >
                        <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm w-full">
                          <span className="truncate">
                            <SelectValue placeholder="All" />
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Faculty</SelectItem>
                          {faculty.map((f) => (
                            <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1 min-w-0">
                      <label className="text-[10px] sm:text-xs font-medium text-muted-foreground">Section</label>
                      <Select
                        value={filters.sectionId}
                        onValueChange={(value) => setFilters({ ...filters, sectionId: value })}
                      >
                        <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm w-full">
                          <span className="truncate">
                            <SelectValue placeholder="All" />
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Sections</SelectItem>
                          {sections.map((section) => (
                            <SelectItem key={section.id} value={section.id}>{section.sectionName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1 min-w-0">
                      <label className="text-[10px] sm:text-xs font-medium text-muted-foreground">Room</label>
                      <Select
                        value={filters.roomId}
                        onValueChange={(value) => setFilters({ ...filters, roomId: value })}
                      >
                        <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm w-full">
                          <span className="truncate">
                            <SelectValue placeholder="All" />
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Rooms</SelectItem>
                          {rooms.map((room) => (
                            <SelectItem key={room.id} value={room.id}>{room.roomName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1 min-w-0">
                      <label className="text-[10px] sm:text-xs font-medium text-muted-foreground">Class Type</label>
                      <Select
                        value={filters.classType}
                        onValueChange={(value) => setFilters({ ...filters, classType: value })}
                      >
                        <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm w-full">
                          <span className="truncate">
                            <SelectValue placeholder="All" />
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Classes</SelectItem>
                          <SelectItem value="regular">
                            <span className="flex items-center gap-1"><GraduationCap className="h-3 w-3 text-emerald-600" /> Regular</span>
                          </SelectItem>
                          <SelectItem value="executive">
                            <span className="flex items-center gap-1"><Crown className="h-3 w-3 text-amber-600" /> Executive</span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {activeFilterCount > 0 && (
                    <div className="flex justify-end">
                      <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs">
                        <X className="h-3 w-3 mr-1" />
                        Clear Filters
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        {/* ===== Results count ===== */}
        <div className="text-xs sm:text-sm text-muted-foreground">
          Showing {filteredSchedules.length} of {schedules.length} schedules
        </div>

        {/* ===== EMPTY STATE (all schedules) ===== */}
        {filteredSchedules.length === 0 && (
          <EmptyState
            icon={CalendarDays}
            title="No schedules found"
            description={activeFilterCount > 0
              ? 'No schedules match the current filters. Try adjusting your filter criteria.'
              : 'Get started by creating your first class schedule or generating one automatically.'}
            action={{
              label: activeFilterCount > 0 ? 'Clear Filters' : 'Add Schedule',
              onClick: activeFilterCount > 0 ? clearFilters : handleCreate,
            }}
            secondaryAction={activeFilterCount > 0 ? {
              label: 'Add Schedule',
              onClick: handleCreate,
            } : undefined}
          />
        )}

        {/* ===== TABLE VIEW ===== */}
        {filteredSchedules.length > 0 && viewMode === 'table' && (
        <Card>
          <CardContent className="pt-6">
            <DataTable
              columns={columns}
              data={filteredSchedules}
              searchKey="day"
              searchPlaceholder="Search by day..."
              isRowSelected={(schedule) => selectedRows.has(schedule.id)}
              mobileCardRender={(schedule) => {
                const isSelected = selectedRows.has(schedule.id);
                const color = getScheduleColor(schedule);
                return (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    'relative rounded-lg border bg-card transition-all duration-200 hover:shadow-md hover:border-emerald-500/30 overflow-hidden',
                    isSelected && 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20'
                  )}
                >
                  {/* Colored left border */}
                  <div className={cn('absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b', color.border)} />
                  <div className="pl-4 pr-3 py-3 space-y-2.5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleRow(schedule.id)}
                          className={cn(
                            'flex-shrink-0 flex items-center justify-center h-5 w-5 rounded border transition-all duration-150',
                            isSelected
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'border-input bg-background hover:bg-muted'
                          )}
                          aria-label={isSelected ? 'Deselect' : 'Select'}
                        >
                          {isSelected && (
                            <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </button>
                        <BookOpen className="h-4 w-4 text-emerald-500" />
                        <div>
                          <p className="font-semibold text-sm">{schedule.subject?.subjectCode}</p>
                          <p className="text-[11px] text-muted-foreground">{schedule.subject?.subjectName}</p>
                        </div>
                      </div>
                      <StatusBadge status={resolveStatus(schedule.status || 'generated')} label={schedule.status || 'generated'} />
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 text-xs">
                      <div className="flex items-center gap-1.5">
                        <UserCircle className="h-3.5 w-3.5 text-emerald-500" />
                        <span className="truncate">{schedule.faculty?.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="truncate">{schedule.section?.sectionName}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <DoorOpen className="h-3.5 w-3.5 text-teal-500" />
                        <Badge variant="outline" className="bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-400 border-teal-500/25 text-[10px] px-1.5 py-0 h-4">
                          {schedule.room?.roomName || 'No Room'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-amber-500" />
                        <span className="truncate font-medium">{schedule.day?.slice(0, 3)} {formatTimeRange(schedule.startTime, schedule.endTime)}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-1.5 border-t border-border/50">
                      <p className="text-xs font-medium text-muted-foreground">
                        {formatTimeRange(schedule.startTime, schedule.endTime)}
                      </p>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(schedule)}>
                            <Pencil className="mr-2 h-3.5 w-3.5" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(schedule)}>
                            <Trash2 className="mr-2 h-3.5 w-3.5" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </motion.div>
                );
              }}
            />
          </CardContent>
        </Card>
        )}

        {/* ===== TIMELINE VIEW ===== */}
        {filteredSchedules.length > 0 && viewMode === 'timeline' && (
          <div className="space-y-4">
            {DAYS.map((day, dayIndex) => {
              const daySchedules = schedulesByDay[day] || [];
              return (
                <motion.div
                  key={day}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: dayIndex * 0.05 }}
                >
                  <Card className="overflow-hidden">
                    {/* Day header */}
                    <div className="flex items-center gap-3 px-4 py-3 border-b bg-muted/20">
                      <span className={cn('h-3 w-3 rounded-full shrink-0', DAY_COLORS[dayIndex])} />
                      <h3 className="font-semibold text-sm">{day}</h3>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-background">
                        {daySchedules.length} class{daySchedules.length !== 1 ? 'es' : ''}
                      </Badge>
                    </div>
                    
                    {daySchedules.length === 0 ? (
                      /* Empty state for days with no classes */
                      <div className="px-4 py-8 flex flex-col items-center justify-center text-center">
                        <motion.div
                          animate={{ y: [0, -6, 0] }}
                          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        >
                          <Calendar className="h-10 w-10 text-muted-foreground/30" />
                        </motion.div>
                        <p className="mt-3 text-sm font-medium text-muted-foreground/60">No classes scheduled for {day}</p>
                        <p className="text-xs text-muted-foreground/40 mt-1">Enjoy the free day or add a schedule</p>
                      </div>
                    ) : (
                      /* Timeline grid */
                      <div className="relative">
                        {/* Time grid lines */}
                        <div className="flex">
                          {/* Time labels column */}
                          <div className="w-14 shrink-0 border-r border-border/30">
                            {TIME_SLOTS_GRID.map((slot) => (
                              <div key={slot.start} className="h-12 flex items-start justify-end pr-2 pt-0.5">
                                <span className="text-[9px] text-muted-foreground/50 font-mono">{slot.label}</span>
                              </div>
                            ))}
                          </div>
                          {/* Grid area */}
                          <div className="flex-1 relative">
                            {/* Horizontal grid lines */}
                            {TIME_SLOTS_GRID.map((slot) => (
                              <div key={slot.start} className="h-12 border-b border-border/15" />
                            ))}
                            {/* Schedule blocks */}
                            {daySchedules.map((schedule) => {
                              const color = getScheduleColor(schedule);
                              const startHour = parseInt(schedule.startTime.split(':')[0]);
                              const startMin = parseInt(schedule.startTime.split(':')[1]);
                              const endHour = parseInt(schedule.endTime.split(':')[0]);
                              const endMin = parseInt(schedule.endTime.split(':')[1]);
                              const startOffset = ((startHour - 7) * 60 + startMin) / 60;
                              const duration = ((endHour - startHour) * 60 + (endMin - startMin)) / 60;
                              const topPx = startOffset * 48; // 48px per hour
                              const heightPx = Math.max(duration * 48, 24);

                              return (
                                <Tooltip key={schedule.id}>
                                  <TooltipTrigger asChild>
                                    <motion.div
                                      initial={{ opacity: 0, scale: 0.95 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      transition={{ duration: 0.2 }}
                                      className={cn(
                                        'absolute left-1 right-1 rounded-md border border-white/20 bg-gradient-to-r cursor-pointer',
                                        'hover:shadow-lg hover:z-10 transition-all duration-200',
                                        color.border
                                      )}
                                      style={{ top: `${topPx}px`, height: `${heightPx}px` }}
                                      onClick={() => handleEdit(schedule)}
                                    >
                                      <div className="px-2 py-1 text-white text-[10px] leading-tight overflow-hidden">
                                        <p className="font-bold truncate">{schedule.subject?.subjectCode}</p>
                                        {heightPx > 30 && (
                                          <p className="opacity-80 truncate">{schedule.room?.roomName || 'No Room'}</p>
                                        )}
                                        {heightPx > 48 && (
                                          <p className="opacity-70 truncate">{schedule.faculty?.name}</p>
                                        )}
                                      </div>
                                    </motion.div>
                                  </TooltipTrigger>
                                  <TooltipContent side="right" className="max-w-xs">
                                    <div className="space-y-1 text-xs">
                                      <p className="font-bold">{schedule.subject?.subjectCode} - {schedule.subject?.subjectName}</p>
                                      <div className="flex items-center gap-1.5">
                                        <Clock className="h-3 w-3" />
                                        <span>{formatTimeRange(schedule.startTime, schedule.endTime)}</span>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <DoorOpen className="h-3 w-3" />
                                        <span>{schedule.room?.roomName || 'No Room'}</span>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <UserCircle className="h-3 w-3" />
                                        <span>{schedule.faculty?.name}</span>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <Users className="h-3 w-3" />
                                        <span>{schedule.section?.sectionName}</span>
                                      </div>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* ===== BATCH ACTION BAR ===== */}
        <BatchActionBar
          selectedIds={Array.from(selectedRows)}
          totalCount={filteredSchedules.length}
          onClearSelection={clearSelection}
          onSelectAll={selectAllRows}
          actions={[
            {
              id: 'delete-selected',
              label: 'Delete Selected',
              icon: Trash2,
              variant: 'destructive',
              onClick: () => setBatchDeleteDialogOpen(true),
            },
            {
              id: 'export-selected',
              label: 'Export Selected',
              icon: Download,
              onClick: (ids) => exportSelected(ids),
            },
            {
              id: 'approve-selected',
              label: 'Approve',
              icon: CheckCircle,
              onClick: (ids) => batchChangeStatus(ids, 'approved'),
            },
            {
              id: 'set-generated',
              label: 'Set Generated',
              icon: Zap,
              onClick: (ids) => batchChangeStatus(ids, 'generated'),
            },
            {
              id: 'set-modified',
              label: 'Set Modified',
              icon: Pencil,
              onClick: (ids) => batchChangeStatus(ids, 'modified'),
            },
            {
              id: 'set-conflict',
              label: 'Set Conflict',
              icon: AlertTriangle,
              onClick: (ids) => batchChangeStatus(ids, 'conflict'),
            },
          ]}
        />

        {/* ===== CREATE/EDIT DIALOG ===== */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-hidden p-0">
            <DialogHeader className="px-6 pt-6 pb-2">
              <DialogTitle>{selectedSchedule ? 'Edit Schedule' : 'Add New Schedule'}</DialogTitle>
              <DialogDescription>
                {selectedSchedule ? 'Update schedule details' : 'Fill in the details to create a new schedule'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
              {/* Left Column - Form Fields */}
              <div className="px-6 py-4 border-b lg:border-b-0 lg:border-r border-border overflow-y-auto max-h-[60vh]">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Subject</Label>
                      <Select
                        value={formData.subjectId as string || ''}
                        onValueChange={(value) => setFormData({ ...formData, subjectId: value })}
                      >
                        <SelectTrigger className={formErrors.subjectId ? 'border-destructive' : ''}>
                          <SelectValue placeholder="Select subject" />
                        </SelectTrigger>
                        <SelectContent>
                          {subjects.map((subject) => (
                            <SelectItem key={subject.id} value={subject.id}>
                              {subject.subjectCode} - {subject.subjectName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {formErrors.subjectId && (
                        <p className="text-xs text-destructive">{formErrors.subjectId}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Faculty</Label>
                      <Select
                        value={formData.facultyId as string || ''}
                        onValueChange={(value) => setFormData({ ...formData, facultyId: value })}
                        disabled={faculty.length === 0}
                      >
                        <SelectTrigger className={formErrors.facultyId ? 'border-destructive' : ''}>
                          <SelectValue placeholder={faculty.length === 0 ? "No faculty available" : "Select faculty"} />
                        </SelectTrigger>
                        <SelectContent>
                          {faculty.length === 0 ? (
                            <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                              No faculty members found.
                              <br />
                              Please add faculty users first.
                            </div>
                          ) : (
                            faculty.map((f) => (
                              <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      {formErrors.facultyId && (
                        <p className="text-xs text-destructive">{formErrors.facultyId}</p>
                      )}
                      {faculty.length === 0 && (
                        <p className="text-xs text-amber-500">
                          No faculty available. Go to Users to add faculty members.
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Section</Label>
                      <Select
                        value={formData.sectionId as string || ''}
                        onValueChange={(value) => setFormData({ ...formData, sectionId: value })}
                      >
                        <SelectTrigger className={formErrors.sectionId ? 'border-destructive' : ''}>
                          <SelectValue placeholder="Select section" />
                        </SelectTrigger>
                        <SelectContent>
                          {sections.map((section) => (
                            <SelectItem key={section.id} value={section.id}>{section.sectionName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {formErrors.sectionId && (
                        <p className="text-xs text-destructive">{formErrors.sectionId}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Room</Label>
                      <Select
                        value={formData.roomId as string || ''}
                        onValueChange={(value) => setFormData({ ...formData, roomId: value })}
                      >
                        <SelectTrigger className={formErrors.roomId ? 'border-destructive' : ''}>
                          <SelectValue placeholder="Select room" />
                        </SelectTrigger>
                        <SelectContent>
                          {rooms.map((room) => (
                            <SelectItem key={room.id} value={room.id}>
                              {room.roomName} ({room.capacity} seats)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {formErrors.roomId && (
                        <p className="text-xs text-destructive">{formErrors.roomId}</p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Day</Label>
                      <Select
                        value={formData.day as string || 'Monday'}
                        onValueChange={(value) => setFormData({ ...formData, day: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DAYS.map((day) => (
                            <SelectItem key={day} value={day}>{day}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Start Time</Label>
                      <Select
                        value={formData.startTime as string || '08:00'}
                        onValueChange={(value) => setFormData({ ...formData, startTime: value })}
                      >
                        <SelectTrigger className={formErrors.startTime ? 'border-destructive' : ''}>
                          <SelectValue placeholder="Select start time" />
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_OPTIONS.map((time) => (
                            <SelectItem key={time.value} value={time.value}>{time.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {formErrors.startTime && (
                        <p className="text-xs text-destructive">{formErrors.startTime}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>End Time</Label>
                      <Select
                        value={formData.endTime as string || '10:00'}
                        onValueChange={(value) => setFormData({ ...formData, endTime: value })}
                      >
                        <SelectTrigger className={formErrors.endTime ? 'border-destructive' : ''}>
                          <SelectValue placeholder="Select end time" />
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_OPTIONS.map((time) => (
                            <SelectItem key={time.value} value={time.value}>{time.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {formErrors.endTime && (
                        <p className="text-xs text-destructive">{formErrors.endTime}</p>
                      )}
                    </div>
                  </div>

                  {/* Conflict Detection - Compact for left column */}
                  <AnimatePresence mode="wait">
                    {checkingConflicts ? (
                      <motion.div
                        key="checking"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex items-center justify-center py-3"
                      >
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Checking for conflicts...</span>
                        </div>
                      </motion.div>
                    ) : conflicts.length > 0 ? (
                      <motion.div
                        key="conflicts"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-2"
                      >
                        <Alert variant="destructive" className="border-red-500/50 bg-red-500/10 py-2">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle className="font-semibold text-sm">Conflicts Detected ({conflicts.length})</AlertTitle>
                        </Alert>
                        <div className="space-y-1">
                          {conflicts.map((conflict, index) => (
                            <div 
                              key={index}
                              className="flex items-start gap-2 p-2 rounded-md bg-red-500/5 border border-red-500/20"
                            >
                              <AlertCircle className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-red-700 dark:text-red-400">
                                  {conflict.type === 'faculty_double_booking' && 'Faculty Double Booking'}
                                  {conflict.type === 'room_double_booking' && 'Room Double Booking'}
                                  {conflict.type === 'section_overlap' && 'Section Schedule Overlap'}
                                </p>
                                <p className="text-xs text-red-600/70 dark:text-red-400/70">
                                  {conflict.description}
                                </p>
                                {conflict.conflictingSchedule && (
                                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-red-600/80 dark:text-red-400/80 bg-red-500/10 rounded px-2 py-1">
                                    {conflict.conflictingSchedule.subject && (
                                      <span className="font-medium">{conflict.conflictingSchedule.subject.subjectCode}</span>
                                    )}
                                    <span className="text-red-400">•</span>
                                    <span>{conflict.conflictingSchedule.day}</span>
                                    <span className="text-red-400">•</span>
                                    <span className="font-medium">
                                      {formatTimeRange(conflict.conflictingSchedule.startTime, conflict.conflictingSchedule.endTime)}
                                    </span>
                                    {conflict.conflictingSchedule.room && (
                                      <>
                                        <span className="text-red-400">•</span>
                                        <span>{conflict.conflictingSchedule.room.roomName}</span>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    ) : formData.facultyId && formData.roomId && formData.sectionId && formData.day && formData.startTime && formData.endTime ? (
                      <motion.div
                        key="no-conflicts"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        <Alert className="border-emerald-500/50 bg-emerald-500/10 py-2">
                          <CheckCircle className="h-4 w-4 text-emerald-500" />
                          <AlertTitle className="text-sm text-emerald-700 dark:text-emerald-400">No Conflicts - Slot Available</AlertTitle>
                        </Alert>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              </div>

              {/* Right Column - Suggested Available Slots */}
              <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Lightbulb className="h-4 w-4 text-amber-500" />
                    <span>Suggested Available Slots</span>
                    {loadingSlots && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                  </div>
                  
                  {availableSlots.length > 0 ? (
                    <ScrollArea className="h-[calc(60vh-80px)] w-full rounded-md border">
                      <div className="p-2 space-y-2">
                        {availableSlots.slice(0, 15).map((slot, index) => (
                          <motion.div
                            key={`${slot.day}-${slot.startTime}-${index}`}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.03 }}
                            className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors group"
                            onClick={() => handleApplySlot(slot)}
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-500/20 transition-colors">
                                <Sparkles className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">{slot.day}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatTimeRange(slot.startTime, slot.endTime)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex flex-wrap gap-1 justify-end max-w-[100px]">
                                {slot.reasons.slice(0, 2).map((reason, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {reason}
                                  </Badge>
                                ))}
                              </div>
                              <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <ArrowRight className="h-4 w-4" />
                              </Button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : loadingSlots ? (
                    <div className="flex items-center justify-center h-40 border rounded-lg">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <span className="text-sm">Finding available slots...</span>
                      </div>
                    </div>
                  ) : !formData.facultyId && !formData.roomId && !formData.sectionId ? (
                    <div className="flex items-center justify-center h-40 border rounded-lg border-dashed">
                      <div className="text-center text-muted-foreground">
                        <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Select faculty, room, or section</p>
                        <p className="text-xs">to see available slot suggestions</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-40 border rounded-lg">
                      <div className="text-center text-muted-foreground">
                        <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No alternative slots found</p>
                        <p className="text-xs">Try different resources or reduce duration</p>
                      </div>
                    </div>
                  )}

                  {/* Selected Slot Preview */}
                  {formData.day && formData.startTime && formData.endTime && !checkingConflicts && conflicts.length === 0 && (
                    <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <p className="text-xs text-muted-foreground mb-1">Selected Slot:</p>
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-primary" />
                        <span className="font-medium text-sm">{formData.day as string}</span>
                        <Clock className="h-4 w-4 text-primary ml-2" />
                        <span className="text-sm">{formatTimeRange(formData.startTime as string, formData.endTime as string)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <DialogFooter className="px-6 py-4 border-t flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="w-full sm:w-auto">Cancel</Button>
              <Button 
                onClick={handleSubmit} 
                className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
                disabled={checkingConflicts || conflicts.length > 0}
              >
                {selectedSchedule ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ===== DELETE DIALOG ===== */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Schedule</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this schedule? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-white hover:bg-destructive/90">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* ===== BATCH DELETE DIALOG ===== */}
        <AlertDialog open={batchDeleteDialogOpen} onOpenChange={setBatchDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Selected Schedules</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {selectedRows.size} schedule{selectedRows.size !== 1 ? 's' : ''}? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => batchDeleteSelected(Array.from(selectedRows))} disabled={isDeleting} className="bg-destructive text-white hover:bg-destructive/90">{isDeleting ? 'Deleting...' : 'Delete All'}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* ===== PRINT DIALOG ===== */}
        <Dialog open={printDialogOpen} onOpenChange={setPrintDialogOpen}>
          <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Print Schedule</DialogTitle>
              <DialogDescription>
                Preview and print the weekly schedule. Use your browser&apos;s print dialog to save as PDF.
              </DialogDescription>
            </DialogHeader>
            <PrintScheduleView schedules={filteredSchedules} />
          </DialogContent>
        </Dialog>

        {/* ===== COMPARE VERSIONS DIALOG ===== */}
        <Dialog open={compareDialogOpen} onOpenChange={setCompareDialogOpen}>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
            <ScheduleVersionCompare open={compareDialogOpen} onOpenChange={setCompareDialogOpen} />
          </DialogContent>
        </Dialog>
      </motion.div>
  );
}
