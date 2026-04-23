'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { 
  AlertTriangle, CheckCircle, RefreshCw, User, MapPin, Users, Clock, BookOpen, 
  AlertCircle, Wrench, UserPlus, Building, ExternalLink, ArrowRight,
  FileEdit, Settings, Plus, Edit3, Calendar, Loader2, Zap, Undo2, ChevronRight,
  HandMetal, Info, Shield, ShieldAlert, ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Conflict, ConflictType } from '@/types';
import { getConflictTypeLabel, getConflictCategory, getConflictResolution } from '@/types';
import { useAppStore, type ConflictResolutionContext } from '@/store';
import { cn } from '@/lib/utils';
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

interface ConflictWithDetails extends Conflict {
  schedule1?: {
    id: string;
    subject?: { subjectName: string; subjectCode: string; id: string; requiredSpecialization?: string; departmentId?: string };
    faculty?: { name: string; id: string; email?: string };
    room?: { roomName: string; id: string; building?: string; capacity?: number };
    section?: { sectionName: string; studentCount: number; id: string };
    day: string;
    startTime: string;
    endTime: string;
  };
  schedule2?: {
    id: string;
    subject?: { subjectName: string; subjectCode: string; id: string };
    faculty?: { name: string; id: string; email?: string };
    room?: { roomName: string; id: string; building?: string; capacity?: number };
    section?: { sectionName: string; studentCount: number; id: string };
    day: string;
    startTime: string;
    endTime: string;
  } | null;
  faculty?: Array<{ id: string; name: string; email: string; specialization?: string[] }>;
  subject?: { 
    id: string;
    subjectName: string; 
    subjectCode: string; 
    requiredSpecialization?: string; 
    departmentId?: string;
    department?: { name: string };
  } | null;
  subjectId?: string;
  isPreGeneration?: boolean;
}

interface ResolutionAction {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  primary?: boolean;
}

// Visual Timeline Component
function ConflictTimeline({ schedule1, schedule2 }: { 
  schedule1?: ConflictWithDetails['schedule1'];
  schedule2?: ConflictWithDetails['schedule2'];
}) {
  if (!schedule1 || !schedule2) return null;

  const getHourPosition = (time: string) => {
    const hour = parseInt(time.split(':')[0]);
    return ((hour - 7) / 14) * 100;
  };

  const getHeight = (start: string, end: string) => {
    const startHour = parseInt(start.split(':')[0]);
    const endHour = parseInt(end.split(':')[0]);
    return ((endHour - startHour) / 14) * 100;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Clock className="h-4 w-4" />
        Time Overlap Visualization
      </div>
      
      <div className="relative h-16 bg-muted/30 rounded-lg border overflow-hidden">
        <div className="absolute inset-0 flex">
          {[7, 9, 11, 13, 15, 17, 19, 21].map(hour => (
            <div key={hour} className="flex-1 border-l border-muted-foreground/10 relative">
              <span className="absolute -top-0.5 left-1 text-[9px] text-muted-foreground">
                {hour > 12 ? `${hour-12}PM` : `${hour}AM`}
              </span>
            </div>
          ))}
        </div>

        <div className="absolute inset-x-0 top-5 h-8 mx-1">
          <div
            className="absolute h-full rounded border flex items-center justify-center text-[10px] font-medium px-1 truncate bg-red-500/20 border-red-500/50 text-red-400"
            style={{
              left: `${getHourPosition(schedule1.startTime)}%`,
              width: `${getHeight(schedule1.startTime, schedule1.endTime)}%`,
            }}
          >
            {schedule1.subject?.subjectCode}
          </div>
          <div
            className="absolute h-full rounded border flex items-center justify-center text-[10px] font-medium px-1 truncate bg-blue-500/20 border-blue-500/50 text-blue-400"
            style={{
              left: `${getHourPosition(schedule2.startTime)}%`,
              width: `${getHeight(schedule2.startTime, schedule2.endTime)}%`,
            }}
          >
            {schedule2.subject?.subjectCode}
          </div>
        </div>
      </div>

      <div className="flex gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-red-500/20" />
          <span>{schedule1.subject?.subjectCode} - {schedule1.faculty?.name}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-blue-500/20" />
          <span>{schedule2.subject?.subjectCode} - {schedule2.faculty?.name}</span>
        </div>
      </div>
    </div>
  );
}

export function EnhancedConflictsView() {
  const [conflicts, setConflicts] = useState<ConflictWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConflict, setSelectedConflict] = useState<ConflictWithDetails | null>(null);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [resolving, setResolving] = useState(false);
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchResolving, setBatchResolving] = useState(false);
  const [batchResolveConfirmOpen, setBatchResolveConfirmOpen] = useState(false);

  // Get navigation functions from Zustand store
  const { setViewMode, setConflictResolutionContext } = useAppStore();

  useEffect(() => {
    fetchConflicts();
  }, []);

  const fetchConflicts = async () => {
    try {
      const res = await fetch('/api/conflicts');
      const data = await res.json();
      setConflicts(data.conflicts || []);
    } catch (error) {
      console.error('Error fetching conflicts:', error);
      toast.error('Failed to load conflicts');
    } finally {
      setLoading(false);
    }
  };

  const openResolveDialog = (conflict: ConflictWithDetails) => {
    setSelectedConflict(conflict);
    setResolveDialogOpen(true);
  };

  const handleMarkResolved = async () => {
    if (!selectedConflict) return;
    setResolving(true);
    try {
      const res = await fetch(`/api/conflicts/${selectedConflict.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolvedBy: 'admin' }),
      });
      if (res.ok) {
        toast.success('Conflict marked as resolved');
        setResolveDialogOpen(false);
        fetchConflicts();
      } else {
        toast.error('Failed to resolve conflict');
      }
    } catch {
      toast.error('Failed to resolve conflict');
    } finally {
      setResolving(false);
    }
  };

  // Navigation helpers
  const navigateToScheduleEdit = (scheduleId: string) => {
    setConflictResolutionContext({ scheduleIdToEdit: scheduleId });
    setViewMode('schedules');
    setResolveDialogOpen(false);
  };

  const navigateToScheduleDelete = (scheduleId: string) => {
    setConflictResolutionContext({ scheduleIdToDelete: scheduleId });
    setViewMode('schedules');
    setResolveDialogOpen(false);
  };

  const navigateToFacultyAdd = (specializations?: string[], departmentId?: string) => {
    setConflictResolutionContext({ 
      addFacultySpecs: specializations, 
      addFacultyDept: departmentId 
    });
    setViewMode('users');
    setResolveDialogOpen(false);
  };

  const navigateToFacultyEdit = (facultyId: string) => {
    setConflictResolutionContext({ facultyIdToEdit: facultyId });
    setViewMode('users');
    setResolveDialogOpen(false);
  };

  const navigateToSubjectEdit = (subjectId: string) => {
    setConflictResolutionContext({ subjectIdToEdit: subjectId });
    setViewMode('subjects');
    setResolveDialogOpen(false);
  };

  const navigateToRoomAdd = (minCapacity?: number) => {
    setConflictResolutionContext({ addRoomMinCapacity: minCapacity });
    setViewMode('rooms');
    setResolveDialogOpen(false);
  };

  const navigateToPreferencesEdit = (facultyId: string) => {
    setConflictResolutionContext({ editPreferencesFor: facultyId });
    setViewMode('preferences');
    setResolveDialogOpen(false);
  };

  const navigateToSectionSplit = (sectionId: string) => {
    setConflictResolutionContext({ sectionIdToSplit: sectionId });
    setViewMode('sections');
    setResolveDialogOpen(false);
  };



  const toggleSelectAll = () => {
    // Only select auto-resolvable conflicts
    const autoResolvableIds = autoResolvableConflicts.map(c => c.id);
    if (selectedIds.size === autoResolvableIds.length && autoResolvableIds.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(autoResolvableIds));
    }
  };

  const toggleSelection = (id: string, isAutoResolvable: boolean) => {
    if (!isAutoResolvable) {
      // Show toast for manual-action conflicts
      toast.warning('This conflict requires manual action and cannot be auto-resolved');
      return;
    }
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const batchResolve = async () => {
    if (selectedIds.size === 0) return;
    
    setBatchResolving(true);
    try {
      const res = await fetch('/api/conflicts/batch-resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conflictIds: Array.from(selectedIds),
          autoResolve: true,
          userId: 'current-user',
        }),
      });
      
      const data = await res.json();
      toast.success(`Resolved ${data.resolved} conflicts. ${data.failed} failed.`);
      setSelectedIds(new Set());
      fetchConflicts();
    } catch (error) {
      console.error('Error batch resolving:', error);
      toast.error('Failed to batch resolve');
    } finally {
      setBatchResolving(false);
    }
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      faculty_double_booking: <User className="h-4 w-4" />,
      room_double_booking: <MapPin className="h-4 w-4" />,
      section_overlap: <Users className="h-4 w-4" />,
      specialization_gap: <BookOpen className="h-4 w-4" />,
      specialization_limited: <BookOpen className="h-4 w-4" />,
      room_capacity_gap: <Building className="h-4 w-4" />,
      fully_unavailable: <Calendar className="h-4 w-4" />,
      subject_preference_conflict: <BookOpen className="h-4 w-4" />,
      time_preference_conflict: <Clock className="h-4 w-4" />,
      capacity_warning: <AlertCircle className="h-4 w-4" />,
      day_preference_conflict: <Calendar className="h-4 w-4" />,
      preference_conflict: <AlertTriangle className="h-4 w-4" />,
    };
    return icons[type] || <AlertCircle className="h-4 w-4" />;
  };

  const getSeverityBadge = (type: ConflictType | string) => {
    const category = getConflictCategory(type as ConflictType);
    const map: Record<string, { status: 'error' | 'warning' | 'info'; label: string }> = {
      critical: { status: 'error', label: 'Critical' },
      warning: { status: 'warning', label: 'Warning' },
      info: { status: 'info', label: 'Info' },
    };
    const cfg = map[category as keyof typeof map];
    return cfg ? <StatusBadge status={cfg.status} label={cfg.label} size="sm" /> : <StatusBadge status="neutral" label="Unknown" size="sm" />;
  };

  // Get resolution actions based on conflict type
  const getResolutionActions = (conflict: ConflictWithDetails): ResolutionAction[] => {
    const type = conflict.type as ConflictType;
    const actions: ResolutionAction[] = [];

    switch (type) {
      // Critical Conflicts
      case 'faculty_double_booking':
        if (conflict.schedule1) {
          actions.push({
            id: 'edit-s1',
            label: `Edit ${conflict.schedule1.subject?.subjectCode || 'Schedule 1'}`,
            description: `Change time/room for ${conflict.schedule1.faculty?.name}'s class`,
            icon: <Edit3 className="h-4 w-4" />,
            action: () => navigateToScheduleEdit(conflict.schedule1!.id),
            primary: true,
          });
        }
        if (conflict.schedule2) {
          actions.push({
            id: 'edit-s2',
            label: `Edit ${conflict.schedule2.subject?.subjectCode || 'Schedule 2'}`,
            description: `Change time/room for ${conflict.schedule2.faculty?.name}'s class`,
            icon: <Edit3 className="h-4 w-4" />,
            action: () => navigateToScheduleEdit(conflict.schedule2!.id),
          });
        }
        if (conflict.schedule1) {
          actions.push({
            id: 'delete-s1',
            label: 'Remove Schedule 1',
            description: 'Delete this schedule entirely',
            icon: <AlertTriangle className="h-4 w-4" />,
            action: () => navigateToScheduleDelete(conflict.schedule1!.id),
          });
        }
        break;

      case 'room_double_booking':
        if (conflict.schedule1) {
          actions.push({
            id: 'edit-s1',
            label: `Change Room for ${conflict.schedule1.subject?.subjectCode}`,
            description: `Reassign to different room`,
            icon: <MapPin className="h-4 w-4" />,
            action: () => navigateToScheduleEdit(conflict.schedule1!.id),
            primary: true,
          });
        }
        if (conflict.schedule2) {
          actions.push({
            id: 'edit-s2',
            label: `Change Room for ${conflict.schedule2.subject?.subjectCode}`,
            description: `Reassign to different room`,
            icon: <MapPin className="h-4 w-4" />,
            action: () => navigateToScheduleEdit(conflict.schedule2!.id),
          });
        }
        actions.push({
          id: 'add-room',
          label: 'Add New Room',
          description: 'Create a new room in the system',
          icon: <Plus className="h-4 w-4" />,
          action: () => navigateToRoomAdd(),
        });
        break;

      case 'section_overlap':
        if (conflict.schedule1) {
          actions.push({
            id: 'edit-s1',
            label: `Reschedule ${conflict.schedule1.subject?.subjectCode}`,
            description: `Move to different time slot`,
            icon: <Clock className="h-4 w-4" />,
            action: () => navigateToScheduleEdit(conflict.schedule1!.id),
            primary: true,
          });
        }
        if (conflict.schedule2) {
          actions.push({
            id: 'edit-s2',
            label: `Reschedule ${conflict.schedule2.subject?.subjectCode}`,
            description: `Move to different time slot`,
            icon: <Clock className="h-4 w-4" />,
            action: () => navigateToScheduleEdit(conflict.schedule2!.id),
          });
        }
        break;

      // Warning Conflicts
      case 'specialization_gap': {
        const subjectData = conflict.schedule1?.subject || conflict.subject;
        const gapRequiredSpecs = subjectData?.requiredSpecialization 
          ? JSON.parse(subjectData.requiredSpecialization) 
          : [];
        actions.push({
          id: 'add-faculty',
          label: 'Add Faculty with Required Specialization',
          description: gapRequiredSpecs.length > 0 
            ? `Create faculty with: ${gapRequiredSpecs.join(', ')}`
            : 'Create new faculty member for this subject',
          icon: <UserPlus className="h-4 w-4" />,
          action: () => navigateToFacultyAdd(gapRequiredSpecs, subjectData?.departmentId),
          primary: true,
        });
        if (subjectData) {
          actions.push({
            id: 'edit-subject',
            label: 'Update Subject Requirements',
            description: 'Modify required specializations for this subject',
            icon: <FileEdit className="h-4 w-4" />,
            action: () => navigateToSubjectEdit(subjectData.id),
          });
        }
        break;
      }

      case 'specialization_limited':
        if (conflict.faculty && conflict.faculty.length > 0) {
          actions.push({
            id: 'train-faculty',
            label: 'Train Other Faculty',
            description: `Add specialization to other faculty members`,
            icon: <UserPlus className="h-4 w-4" />,
            action: () => navigateToFacultyAdd(),
            primary: true,
          });
        }
        actions.push({
          id: 'add-faculty',
          label: 'Add New Faculty',
          description: 'Create faculty with this specialization',
          icon: <Plus className="h-4 w-4" />,
          action: () => navigateToFacultyAdd(),
        });
        break;

      case 'room_capacity_gap':
        const studentCount = conflict.schedule1?.section?.studentCount || 0;
        actions.push({
          id: 'add-room',
          label: 'Add Larger Room',
          description: `Create room with capacity ≥ ${studentCount} students`,
          icon: <Plus className="h-4 w-4" />,
          action: () => navigateToRoomAdd(studentCount),
          primary: true,
        });
        if (conflict.schedule1?.section) {
          actions.push({
            id: 'split-section',
            label: 'Split Section',
            description: 'Divide into smaller groups',
            icon: <Users className="h-4 w-4" />,
            action: () => navigateToSectionSplit(conflict.schedule1!.section!.id),
          });
        }
        break;

      case 'fully_unavailable':
        if (conflict.faculty && conflict.faculty.length > 0) {
          const f = conflict.faculty[0];
          actions.push({
            id: 'edit-prefs',
            label: `Update ${f.name}'s Availability`,
            description: 'Set available days for this faculty',
            icon: <Calendar className="h-4 w-4" />,
            action: () => navigateToPreferencesEdit(f.id),
            primary: true,
          });
        }
        break;

      case 'subject_preference_conflict':
        if (conflict.faculty && conflict.faculty.length > 0) {
          conflict.faculty.forEach((f, idx) => {
            actions.push({
              id: `edit-prefs-${idx}`,
              label: `Adjust ${f.name}'s Preferences`,
              description: 'Review subject preferences',
              icon: <FileEdit className="h-4 w-4" />,
              action: () => navigateToPreferencesEdit(f.id),
              primary: idx === 0,
            });
          });
        }
        break;

      // Info Conflicts
      case 'time_preference_conflict':
      case 'day_preference_conflict':
      case 'preference_conflict':
        if (conflict.faculty && conflict.faculty.length > 0) {
          const f = conflict.faculty[0];
          actions.push({
            id: 'edit-prefs',
            label: `Edit ${f.name}'s Preferences`,
            description: 'Adjust time/day preferences',
            icon: <Settings className="h-4 w-4" />,
            action: () => navigateToPreferencesEdit(f.id),
          });
        }
        break;

      case 'capacity_warning':
        if (conflict.faculty && conflict.faculty.length > 0) {
          const f = conflict.faculty[0];
          actions.push({
            id: 'edit-units',
            label: `Adjust ${f.name}'s Max Units`,
            description: 'Increase/decrease workload capacity',
            icon: <Settings className="h-4 w-4" />,
            action: () => navigateToFacultyEdit(f.id),
          });
        }
        break;

      default:
        break;
    }

    return actions;
  };

  // Check if a conflict can be auto-resolved
  const isAutoResolvable = (type: string): boolean => {
    // These types can be automatically fixed by moving schedules or changing rooms
    const autoResolvableTypes = [
      'faculty_double_booking',
      'room_double_booking',
      'section_overlap',
    ];
    return autoResolvableTypes.includes(type);
  };

  // Get manual action message for non-auto-resolvable conflicts
  const getManualActionMessage = (type: string): string => {
    const messages: Record<string, string> = {
      specialization_gap: 'Requires adding faculty with the needed specialization',
      fully_unavailable: 'Requires updating faculty availability preferences',
      room_capacity_gap: 'Requires adding a larger room or splitting the section',
      specialization_limited: 'Requires adding faculty with this specialization',
      subject_preference_conflict: 'Requires adjusting faculty subject preferences',
      time_preference_conflict: 'Requires adjusting faculty time preferences',
      day_preference_conflict: 'Requires adjusting faculty day preferences',
      preference_conflict: 'Requires adjusting faculty preferences',
      capacity_warning: 'Requires adjusting faculty workload capacity',
    };
    return messages[type] || 'Requires manual intervention';
  };

  const activeConflicts = conflicts.filter(c => !c.resolved);
  const resolvedConflicts = conflicts.filter(c => c.resolved);
  const criticalConflicts = activeConflicts.filter(c => getConflictCategory(c.type as ConflictType) === 'critical');
  const warningConflicts = activeConflicts.filter(c => getConflictCategory(c.type as ConflictType) === 'warning');
  
  // Separate auto-resolvable and manual-action conflicts
  const autoResolvableConflicts = activeConflicts.filter(c => isAutoResolvable(c.type));
  const manualActionConflicts = activeConflicts.filter(c => !isAutoResolvable(c.type));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <AlertTriangle className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const conflictCategory = selectedConflict ? getConflictCategory(selectedConflict.type as ConflictType) : 'info';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-600">Conflict Resolution</h1>
          <div className="h-1 w-20 mt-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" />
          <p className="text-muted-foreground mt-1">Detect and resolve scheduling conflicts</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchConflicts}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          {selectedIds.size > 0 && (
            <Button onClick={() => setBatchResolveConfirmOpen(true)} disabled={batchResolving}>
              {batchResolving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Zap className="mr-2 h-4 w-4" />
              )}
              Auto-Resolve {selectedIds.size}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Conflicts */}
        <Card className="card-hover gradient-border">
          <div className="h-1 rounded-t-lg bg-gradient-to-r from-violet-500 to-purple-500" />
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total</p>
                <p className="text-2xl font-bold mt-1 tabular-nums">{conflicts.length}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-violet-500/10 ring-4 ring-violet-500/5">
                <Shield className="h-5 w-5 text-violet-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Open / Critical */}
        <Card className="card-hover gradient-border">
          <div className="h-1 rounded-t-lg bg-gradient-to-r from-red-500 to-rose-500" />
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Critical</p>
                <p className="text-2xl font-bold mt-1 text-red-500 tabular-nums">{criticalConflicts.length}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-red-500/10 ring-4 ring-red-500/5">
                <ShieldAlert className="h-5 w-5 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Warnings */}
        <Card className="card-hover gradient-border">
          <div className="h-1 rounded-t-lg bg-gradient-to-r from-amber-500 to-yellow-500" />
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Warnings</p>
                <p className="text-2xl font-bold mt-1 text-amber-500 tabular-nums">{warningConflicts.length}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-500/10 ring-4 ring-amber-500/5">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Resolved */}
        <Card className="card-hover gradient-border">
          <div className="h-1 rounded-t-lg bg-gradient-to-r from-emerald-500 to-teal-500" />
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Resolved</p>
                <p className="text-2xl font-bold mt-1 text-emerald-500 tabular-nums">{resolvedConflicts.length}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 ring-4 ring-emerald-500/5">
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {activeConflicts.length > 0 && (
        <Card className="flex flex-col">
          <CardHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  Active Conflicts
                </CardTitle>
                <CardDescription>Click to resolve or select for batch auto-resolution</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={toggleSelectAll} className="gap-2">
                {selectedIds.size === autoResolvableConflicts.length && autoResolvableConflicts.length > 0 ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <div className="h-4 w-4 rounded border border-current opacity-50" />
                )}
                Select Auto-Resolvable ({autoResolvableConflicts.length})
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 overflow-hidden">
            <ScrollArea className="h-[min(600px,calc(100vh-400px))]">
              <div className="space-y-3 pr-4">
                {/* Auto-Resolvable Section */}
                {autoResolvableConflicts.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2 px-1">
                      <Zap className="h-4 w-4 text-emerald-500" />
                      <span className="text-sm font-medium text-emerald-600">Auto-Resolvable</span>
                      <span className="text-xs text-muted-foreground">({autoResolvableConflicts.length} conflicts can be automatically fixed)</span>
                    </div>
                    {autoResolvableConflicts.map((conflict) => (
                      <motion.div
                        key={conflict.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          "p-4 rounded-lg border transition-all duration-200 cursor-pointer mb-2 hover-lift",
                          selectedIds.has(conflict.id) ? "bg-primary/5 border-primary" : "bg-card hover:bg-muted/50 hover:border-border",
                          getConflictCategory(conflict.type as ConflictType) === 'critical' && "border-l-4 border-l-red-500",
                          getConflictCategory(conflict.type as ConflictType) === 'warning' && "border-l-4 border-l-amber-500",
                          getConflictCategory(conflict.type as ConflictType) === 'info' && "border-l-4 border-l-blue-500"
                        )}
                        onClick={() => openResolveDialog(conflict)}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox 
                            checked={selectedIds.has(conflict.id)} 
                            onClick={(e) => { e.stopPropagation(); toggleSelection(conflict.id, true); }} 
                            className="mt-1" 
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {getTypeIcon(conflict.type)}
                              <span className="font-medium">{getConflictTypeLabel(conflict.type as ConflictType)}</span>
                              {getSeverityBadge(conflict.type)}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">{conflict.description}</p>
                            {conflict.schedule1 && (
                              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                                <span className="bg-muted px-2 py-0.5 rounded">{conflict.schedule1.subject?.subjectCode}</span>
                                <span className="text-muted-foreground">{conflict.schedule1.day} {conflict.schedule1.startTime}-{conflict.schedule1.endTime}</span>
                                {conflict.schedule1.faculty && <span className="text-muted-foreground">• {conflict.schedule1.faculty.name}</span>}
                              </div>
                            )}
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Manual Action Required Section */}
                {manualActionConflicts.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2 px-1">
                      <HandMetal className="h-4 w-4 text-amber-500" />
                      <span className="text-sm font-medium text-amber-600">Manual Action Required</span>
                      <span className="text-xs text-muted-foreground">({manualActionConflicts.length} conflicts need manual intervention)</span>
                    </div>
                    {manualActionConflicts.map((conflict) => (
                      <motion.div
                        key={conflict.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          "p-4 rounded-lg border transition-all duration-200 cursor-pointer mb-2 opacity-90 hover-lift",
                          "bg-card hover:bg-muted/50 hover:border-border",
                          getConflictCategory(conflict.type as ConflictType) === 'critical' && "border-l-4 border-l-red-500",
                          getConflictCategory(conflict.type as ConflictType) === 'warning' && "border-l-4 border-l-amber-500",
                          getConflictCategory(conflict.type as ConflictType) === 'info' && "border-l-4 border-l-blue-500"
                        )}
                        onClick={() => openResolveDialog(conflict)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-1 relative">
                            <Checkbox 
                              checked={false}
                              disabled
                              className="opacity-50 cursor-not-allowed"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              {getTypeIcon(conflict.type)}
                              <span className="font-medium">{getConflictTypeLabel(conflict.type as ConflictType)}</span>
                              {getSeverityBadge(conflict.type)}
                              <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-600 bg-amber-50 dark:bg-amber-950/30">
                                <HandMetal className="h-3 w-3 mr-1" />
                                Manual
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">{conflict.description}</p>
                            {/* Manual action message */}
                            <div className="mt-2 flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                              <Info className="h-3 w-3 mt-0.5 shrink-0" />
                              <span>{getManualActionMessage(conflict.type)}</span>
                            </div>
                            {conflict.schedule1 && (
                              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                                <span className="bg-muted px-2 py-0.5 rounded">{conflict.schedule1.subject?.subjectCode}</span>
                                <span className="text-muted-foreground">{conflict.schedule1.day} {conflict.schedule1.startTime}-{conflict.schedule1.endTime}</span>
                                {conflict.schedule1.faculty && <span className="text-muted-foreground">• {conflict.schedule1.faculty.name}</span>}
                              </div>
                            )}
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {activeConflicts.length === 0 && (
        <EmptyState
          icon={CheckCircle}
          title="No Active Conflicts"
          description="All schedules are conflict-free. Great job!"
        />
      )}

      {/* Resolution Dialog */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Resolve Conflict
            </DialogTitle>
            <DialogDescription>
              Review the issue and choose how to fix it
            </DialogDescription>
          </DialogHeader>

          {selectedConflict && (
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-5 py-4">
                {/* Conflict Info */}
                <div className={cn(
                  "p-4 rounded-lg",
                  conflictCategory === 'critical' ? 'bg-red-950/50 border border-red-800' :
                  conflictCategory === 'warning' ? 'bg-amber-950/50 border border-amber-800' :
                  'bg-blue-950/50 border border-blue-800'
                )}>
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "p-2 rounded-lg shrink-0",
                      conflictCategory === 'critical' ? 'bg-red-900 text-red-300' :
                      conflictCategory === 'warning' ? 'bg-amber-900 text-amber-300' :
                      'bg-blue-900 text-blue-300'
                    )}>
                      {getTypeIcon(selectedConflict.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{getConflictTypeLabel(selectedConflict.type as ConflictType)}</span>
                        {getSeverityBadge(selectedConflict.type)}
                      </div>
                      <p className="text-sm text-muted-foreground">{getConflictResolution(selectedConflict.type as ConflictType)}</p>
                    </div>
                  </div>
                </div>

                {/* Visual Timeline for double bookings */}
                {['faculty_double_booking', 'room_double_booking', 'section_overlap'].includes(selectedConflict.type) && (
                  <ConflictTimeline schedule1={selectedConflict.schedule1} schedule2={selectedConflict.schedule2} />
                )}

                <Separator />

                {/* Root Cause */}
                <div className="p-4 border rounded-lg bg-muted/50">
                  <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Root Cause
                  </h4>
                  <div className="text-sm space-y-2">
                    {selectedConflict.type === 'faculty_double_booking' && selectedConflict.schedule1 && selectedConflict.schedule2 && (
                      <div className="space-y-2">
                        <p><strong>{selectedConflict.schedule1.faculty?.name}</strong> is assigned to two classes at the same time:</p>
                        <div className="bg-background p-2 rounded border text-xs space-y-1">
                          <div><strong>{selectedConflict.schedule1.subject?.subjectCode}</strong> • {selectedConflict.schedule1.day} {selectedConflict.schedule1.startTime}-{selectedConflict.schedule1.endTime} • {selectedConflict.schedule1.room?.roomName}</div>
                          <div><strong>{selectedConflict.schedule2.subject?.subjectCode}</strong> • {selectedConflict.schedule2.day} {selectedConflict.schedule2.startTime}-{selectedConflict.schedule2.endTime} • {selectedConflict.schedule2.room?.roomName}</div>
                        </div>
                      </div>
                    )}

                    {selectedConflict.type === 'room_double_booking' && selectedConflict.schedule1 && selectedConflict.schedule2 && (
                      <div className="space-y-2">
                        <p>Room <strong>{selectedConflict.schedule1.room?.roomName}</strong> is double-booked:</p>
                        <div className="bg-background p-2 rounded border text-xs space-y-1">
                          <div><strong>{selectedConflict.schedule1.subject?.subjectCode}</strong> with {selectedConflict.schedule1.faculty?.name} • {selectedConflict.schedule1.day} {selectedConflict.schedule1.startTime}-{selectedConflict.schedule1.endTime}</div>
                          <div><strong>{selectedConflict.schedule2.subject?.subjectCode}</strong> with {selectedConflict.schedule2.faculty?.name} • {selectedConflict.schedule2.day} {selectedConflict.schedule2.startTime}-{selectedConflict.schedule2.endTime}</div>
                        </div>
                      </div>
                    )}

                    {selectedConflict.type === 'section_overlap' && selectedConflict.schedule1 && selectedConflict.schedule2 && (
                      <div className="space-y-2">
                        <p>Section <strong>{selectedConflict.schedule1.section?.sectionName}</strong> has overlapping classes:</p>
                        <div className="bg-background p-2 rounded border text-xs space-y-1">
                          <div><strong>{selectedConflict.schedule1.subject?.subjectCode}</strong> • {selectedConflict.schedule1.day} {selectedConflict.schedule1.startTime}-{selectedConflict.schedule1.endTime}</div>
                          <div><strong>{selectedConflict.schedule2.subject?.subjectCode}</strong> • {selectedConflict.schedule2.day} {selectedConflict.schedule2.startTime}-{selectedConflict.schedule2.endTime}</div>
                        </div>
                      </div>
                    )}

                    {selectedConflict.type === 'specialization_gap' && (() => {
                      const subjectData = selectedConflict.schedule1?.subject || selectedConflict.subject;
                      if (!subjectData) return <p className="text-muted-foreground">Subject information not available.</p>;
                      const requiredSpecs = subjectData.requiredSpecialization ? JSON.parse(subjectData.requiredSpecialization) : [];
                      return (
                        <>
                          <p>Subject <strong>{subjectData.subjectCode || subjectData.subjectName}</strong> requires specializations that no faculty has:</p>
                          {requiredSpecs.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {requiredSpecs.map((s: string) => (
                                <Badge key={s} variant="outline" className="bg-red-950 border-red-800 text-red-300">{s}</Badge>
                              ))}
                            </div>
                          )}
                        </>
                      );
                    })()}

                    {selectedConflict.type === 'room_capacity_gap' && selectedConflict.schedule1?.section && (
                      <div className="space-y-2">
                        <p>Section <strong>{selectedConflict.schedule1.section.sectionName}</strong> has <strong>{selectedConflict.schedule1.section.studentCount} students</strong> but no room is large enough.</p>
                        {selectedConflict.schedule1.room && (
                          <p className="text-xs text-muted-foreground">Current room: {selectedConflict.schedule1.room.roomName} (capacity: {selectedConflict.schedule1.room.capacity})</p>
                        )}
                      </div>
                    )}

                    {selectedConflict.type === 'fully_unavailable' && selectedConflict.faculty && selectedConflict.faculty.length > 0 && (
                      <div className="space-y-2">
                        <p><strong>{selectedConflict.faculty[0]?.name}</strong> has marked all days as unavailable and cannot be assigned any schedules.</p>
                        {selectedConflict.faculty[0]?.email && (
                          <p className="text-xs text-muted-foreground">Contact: {selectedConflict.faculty[0].email}</p>
                        )}
                      </div>
                    )}

                    {['time_preference_conflict', 'day_preference_conflict', 'preference_conflict', 'capacity_warning', 'subject_preference_conflict'].includes(selectedConflict.type) && (
                      <div className="space-y-2">
                        <p>{selectedConflict.description}</p>
                        {selectedConflict.faculty && selectedConflict.faculty.length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            Affected: {selectedConflict.faculty.map(f => f.name).join(', ')}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Resolution Actions */}
                <div>
                  <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                    <ArrowRight className="h-4 w-4" />
                    Choose Solution
                  </h4>
                  <div className="space-y-2">
                    {getResolutionActions(selectedConflict).map((action, idx) => (
                      <motion.button
                        key={action.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        onClick={action.action}
                        className={cn(
                          "w-full p-3 rounded-lg border text-left transition-all hover:shadow-md",
                          action.primary ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-background hover:bg-muted"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn("shrink-0 p-2 rounded-lg", action.primary ? "bg-primary-foreground/20" : "bg-muted")}>
                            {action.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">{action.label}</div>
                            <div className={cn("text-xs", action.primary ? "text-primary-foreground/80" : "text-muted-foreground")}>
                              {action.description}
                            </div>
                          </div>
                          <ExternalLink className={cn("h-4 w-4 shrink-0", action.primary ? "text-primary-foreground/80" : "text-muted-foreground")} />
                        </div>
                      </motion.button>
                    ))}

                    {getResolutionActions(selectedConflict).length === 0 && (
                      <div className="p-4 text-center text-muted-foreground text-sm">
                        This conflict type will be handled automatically by the scheduling algorithm.
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex justify-between items-center pt-2 border-t">
                  <Button variant="ghost" size="sm" onClick={handleMarkResolved} disabled={resolving}>
                    {resolving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                    Mark as Resolved
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setResolveDialogOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Batch Resolve Confirmation */}
      <AlertDialog open={batchResolveConfirmOpen} onOpenChange={setBatchResolveConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Batch Resolve Conflicts?</AlertDialogTitle>
            <AlertDialogDescription>
              This will automatically resolve {selectedIds.size} selected conflict(s). The system will apply the best available resolution for each. This may change schedule assignments and cannot be easily undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={batchResolve}
            >
              Resolve {selectedIds.size} Conflict(s)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
