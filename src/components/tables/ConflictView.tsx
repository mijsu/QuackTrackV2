'use client';

import { useState, useEffect } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from './DataTable';
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
import { toast } from 'sonner';
import { 
  AlertTriangle, CheckCircle, RefreshCw, User, MapPin, Users, Clock, BookOpen, Calendar, 
  AlertCircle, Info, Wrench, UserPlus, Building, ExternalLink, ArrowRight,
  FileEdit, Settings, Plus, Edit3, Loader2, XCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { Conflict, ConflictType } from '@/types';
import { getConflictTypeLabel, getConflictCategory, getConflictResolution } from '@/types';
import { useAppStore, type ConflictResolutionContext } from '@/store';
import { StatusBadge, resolveStatus } from '@/components/ui/StatusBadge';
import { ExportButton } from '@/components/ui/ExportButton';

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

export function ConflictsView() {
  const [conflicts, setConflicts] = useState<ConflictWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConflict, setSelectedConflict] = useState<ConflictWithDetails | null>(null);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [resolving, setResolving] = useState(false);
  
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

  // Navigation helpers - use Zustand store for SPA navigation with context
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

  const getTypeIcon = (type: ConflictType | string) => {
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
    return icons[type] || <Info className="h-4 w-4" />;
  };

  const getSeverityBadge = (type: ConflictType | string) => {
    const category = getConflictCategory(type as ConflictType);
    const styles = {
      critical: <Badge variant="destructive" className="font-medium">Critical</Badge>,
      warning: <Badge variant="outline" className="border-amber-500 text-amber-400 bg-amber-950 font-medium">Warning</Badge>,
      info: <Badge variant="outline" className="border-blue-500 text-blue-400 bg-blue-950 font-medium">Info</Badge>,
    };
    return styles[category as keyof typeof styles] || <Badge variant="outline">Unknown</Badge>;
  };

  const columns: ColumnDef<ConflictWithDetails>[] = [
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {getTypeIcon(row.original.type)}
          <span>{getConflictTypeLabel(row.original.type as ConflictType)}</span>
        </div>
      ),
    },
    { accessorKey: 'severity', header: 'Severity', cell: ({ row }) => getSeverityBadge(row.original.type) },
    { accessorKey: 'description', header: 'Description', cell: ({ row }) => <p className="text-sm text-muted-foreground max-w-md truncate">{row.original.description}</p> },
    { accessorKey: 'resolved', header: 'Status', cell: ({ row }) => {
      const statusStr = row.original.resolved ? 'resolved' : 'active';
      return <StatusBadge status={resolveStatus(statusStr)} label={row.original.resolved ? 'Resolved' : 'Active'} />;
    }},
    { id: 'actions', header: '', cell: ({ row }) => row.original.resolved ? null : (
      <Button size="sm" onClick={() => openResolveDialog(row.original)}>
        <Wrench className="mr-2 h-4 w-4" /> Resolve
      </Button>
    )},
  ];

  const activeConflicts = conflicts.filter(c => !c.resolved);
  const resolvedConflicts = conflicts.filter(c => c.resolved);
  const criticalConflicts = activeConflicts.filter(c => getConflictCategory(c.type as ConflictType) === 'critical');
  const warningConflicts = activeConflicts.filter(c => getConflictCategory(c.type as ConflictType) === 'warning');
  const infoConflicts = activeConflicts.filter(c => getConflictCategory(c.type as ConflictType) === 'info');

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
        // Get subject from either schedule1 or direct subject reference (pre-generation)
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

  if (loading) {
    return <div className="flex items-center justify-center h-64"><AlertTriangle className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const conflictCategory = selectedConflict ? getConflictCategory(selectedConflict.type as ConflictType) : 'info';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Conflict Resolution</h1>
          <div className="h-1 w-20 mt-1 rounded-full bg-gradient-to-r from-red-500 to-amber-500" />
          <p className="text-muted-foreground mt-1">Detect and resolve scheduling conflicts</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton
            data={conflicts.map(c => ({
              'Type': getConflictTypeLabel(c.type as ConflictType),
              'Severity': getConflictCategory(c.type as ConflictType),
              'Status': c.resolved ? 'Resolved' : 'Active',
              'Description': c.description,
            }))}
            filename="conflicts-export"
          />
          <Button onClick={fetchConflicts} variant="outline"><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
        </div>
      </div>

      <motion.div
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm text-muted-foreground">Total</CardTitle>
              <AlertTriangle className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{conflicts.length}</div></CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-red-500/50 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm text-muted-foreground">Critical</CardTitle>
              <XCircle className="h-5 w-5 text-red-500" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold text-red-500">{criticalConflicts.length}</div></CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="border-amber-500/50 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm text-muted-foreground">Warnings</CardTitle>
              <AlertCircle className="h-5 w-5 text-amber-500" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold text-amber-500">{warningConflicts.length}</div></CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-emerald-500/50 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm text-muted-foreground">Resolved</CardTitle>
              <CheckCircle className="h-5 w-5 text-emerald-500" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold text-emerald-500">{resolvedConflicts.length}</div></CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {criticalConflicts.length > 0 && (
        <Card className="border-l-4 border-l-red-500 border-red-500/50 flex flex-col transition-all duration-200 hover:shadow-md">
          <CardHeader className="flex-shrink-0"><CardTitle className="flex items-center gap-2 text-red-600"><AlertTriangle className="h-5 w-5" />Critical Conflicts</CardTitle><CardDescription>Must be resolved immediately</CardDescription></CardHeader>
          <CardContent className="flex-1 min-h-0 overflow-hidden">
            <ScrollArea className="h-[min(400px,calc(100vh-500px))]">
              <DataTable columns={columns} data={criticalConflicts} searchKey="description" searchPlaceholder="Search..." />
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {warningConflicts.length > 0 && (
        <Card className="border-l-4 border-l-amber-500 border-amber-500/50 flex flex-col transition-all duration-200 hover:shadow-md">
          <CardHeader className="flex-shrink-0"><CardTitle className="flex items-center gap-2 text-amber-600"><AlertCircle className="h-5 w-5" />Warning Conflicts</CardTitle><CardDescription>May affect scheduling</CardDescription></CardHeader>
          <CardContent className="flex-1 min-h-0 overflow-hidden">
            <ScrollArea className="h-[min(400px,calc(100vh-500px))]">
              <DataTable columns={columns} data={warningConflicts} searchKey="description" searchPlaceholder="Search..." />
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {infoConflicts.length > 0 && (
        <Card className="border-l-4 border-l-blue-500 border-blue-500/50 flex flex-col transition-all duration-200 hover:shadow-md">
          <CardHeader className="flex-shrink-0"><CardTitle className="flex items-center gap-2 text-blue-600"><Info className="h-5 w-5" />Informational</CardTitle><CardDescription>Algorithm handles automatically</CardDescription></CardHeader>
          <CardContent className="flex-1 min-h-0 overflow-hidden">
            <ScrollArea className="h-[min(400px,calc(100vh-500px))]">
              <DataTable columns={columns} data={infoConflicts} searchKey="description" searchPlaceholder="Search..." />
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {activeConflicts.length === 0 && (
        <Card className="relative transition-all duration-200 hover:shadow-md overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/80 via-teal-50/40 to-transparent dark:from-emerald-950/30 dark:via-teal-950/20 dark:to-transparent pointer-events-none" />
          <CardContent className="relative flex flex-col items-center justify-center py-16">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/20">
              <CheckCircle className="h-10 w-10 text-white" />
            </div>
            <p className="font-semibold text-lg">No Active Conflicts</p>
            <p className="text-muted-foreground">All schedules are conflict-free</p>
          </CardContent>
        </Card>
      )}

      {resolvedConflicts.length > 0 && (
        <Card className="border-l-4 border-l-emerald-500 transition-all duration-200 hover:shadow-md">
          <CardHeader><CardTitle className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-emerald-500" />Resolved Conflicts</CardTitle></CardHeader>
          <CardContent><DataTable columns={columns} data={resolvedConflicts} searchKey="description" searchPlaceholder="Search..." /></CardContent>
        </Card>
      )}

      {/* Resolution Dialog */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent className="sm:max-w-xl">
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
            <div className="space-y-5 py-4">
              {/* Conflict Info */}
              <div className={`p-4 rounded-lg ${
                conflictCategory === 'critical' ? 'bg-red-950/50 border border-red-800' :
                conflictCategory === 'warning' ? 'bg-amber-950/50 border border-amber-800' :
                'bg-blue-950/50 border border-blue-800'
              }`}>
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg shrink-0 ${
                    conflictCategory === 'critical' ? 'bg-red-900 text-red-300' :
                    conflictCategory === 'warning' ? 'bg-amber-900 text-amber-300' :
                    'bg-blue-900 text-blue-300'
                  }`}>
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

              {/* Cause Details */}
              <div className="p-4 border rounded-lg bg-muted/50">
                <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Root Cause
                </h4>
                <div className="text-sm space-y-2">
                  {/* Critical Conflicts */}
                  {selectedConflict.type === 'faculty_double_booking' && (
                    <div className="space-y-2">
                      {selectedConflict.schedule1 && selectedConflict.schedule2 ? (
                        <>
                          <p><strong>{selectedConflict.schedule1.faculty?.name}</strong> is assigned to two classes at the same time:</p>
                          <div className="bg-background p-2 rounded border text-xs space-y-1">
                            <div><strong>{selectedConflict.schedule1.subject?.subjectCode}</strong> • {selectedConflict.schedule1.day} {selectedConflict.schedule1.startTime}-{selectedConflict.schedule1.endTime} • {selectedConflict.schedule1.room?.roomName}</div>
                            <div><strong>{selectedConflict.schedule2.subject?.subjectCode}</strong> • {selectedConflict.schedule2.day} {selectedConflict.schedule2.startTime}-{selectedConflict.schedule2.endTime} • {selectedConflict.schedule2.room?.roomName}</div>
                          </div>
                        </>
                      ) : (
                        <p className="text-muted-foreground">Schedule details not available. The conflicting schedules may have been deleted or modified.</p>
                      )}
                    </div>
                  )}

                  {selectedConflict.type === 'room_double_booking' && (
                    <div className="space-y-2">
                      {selectedConflict.schedule1 && selectedConflict.schedule2 ? (
                        <>
                          <p>Room <strong>{selectedConflict.schedule1.room?.roomName}</strong> is double-booked:</p>
                          <div className="bg-background p-2 rounded border text-xs space-y-1">
                            <div><strong>{selectedConflict.schedule1.subject?.subjectCode}</strong> with {selectedConflict.schedule1.faculty?.name} • {selectedConflict.schedule1.day} {selectedConflict.schedule1.startTime}-{selectedConflict.schedule1.endTime}</div>
                            <div><strong>{selectedConflict.schedule2.subject?.subjectCode}</strong> with {selectedConflict.schedule2.faculty?.name} • {selectedConflict.schedule2.day} {selectedConflict.schedule2.startTime}-{selectedConflict.schedule2.endTime}</div>
                          </div>
                        </>
                      ) : (
                        <p className="text-muted-foreground">Schedule details not available. The conflicting schedules may have been deleted or modified.</p>
                      )}
                    </div>
                  )}

                  {selectedConflict.type === 'section_overlap' && (
                    <div className="space-y-2">
                      {selectedConflict.schedule1 && selectedConflict.schedule2 ? (
                        <>
                          <p>Section <strong>{selectedConflict.schedule1.section?.sectionName}</strong> has overlapping classes:</p>
                          <div className="bg-background p-2 rounded border text-xs space-y-1">
                            <div><strong>{selectedConflict.schedule1.subject?.subjectCode}</strong> • {selectedConflict.schedule1.day} {selectedConflict.schedule1.startTime}-{selectedConflict.schedule1.endTime}</div>
                            <div><strong>{selectedConflict.schedule2.subject?.subjectCode}</strong> • {selectedConflict.schedule2.day} {selectedConflict.schedule2.startTime}-{selectedConflict.schedule2.endTime}</div>
                          </div>
                        </>
                      ) : (
                        <p className="text-muted-foreground">Schedule details not available. The conflicting schedules may have been deleted or modified.</p>
                      )}
                    </div>
                  )}

                  {/* Warning Conflicts */}
                  {selectedConflict.type === 'specialization_gap' && (
                    <div className="space-y-2">
                      {(() => {
                        const subjectData = selectedConflict.schedule1?.subject || selectedConflict.subject;
                        if (!subjectData) {
                          return (
                            <p className="text-muted-foreground">
                              Subject information not available. This may be a pre-generation conflict for a subject that was removed or modified.
                            </p>
                          );
                        }
                        const requiredSpecs = subjectData.requiredSpecialization 
                          ? JSON.parse(subjectData.requiredSpecialization) 
                          : [];
                        return (
                          <>
                            <p>Subject <strong>{subjectData.subjectCode || subjectData.subjectName}</strong> requires specializations that no faculty has:</p>
                            {requiredSpecs.length > 0 ? (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {requiredSpecs.map((s: string) => (
                                  <Badge key={s} variant="outline" className="bg-red-950 border-red-800 text-red-300">{s}</Badge>
                                ))}
                              </div>
                            ) : (
                              <p className="text-muted-foreground text-xs">No specific specializations defined for this subject.</p>
                            )}
                            {subjectData.department && (
                              <p className="text-xs text-muted-foreground">Department: {subjectData.department.name}</p>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}

                  {selectedConflict.type === 'specialization_limited' && (
                    <div className="space-y-2">
                      {selectedConflict.faculty && selectedConflict.faculty.length > 0 ? (
                        <>
                          <p>Only <strong>{selectedConflict.faculty.length} faculty member(s)</strong> have the required specialization. This creates dependency risk.</p>
                          <div className="bg-background p-2 rounded border text-xs">
                            {selectedConflict.faculty.map(f => (
                              <div key={f.id} className="flex items-center justify-between py-1">
                                <span>{f.name}</span>
                                <div className="flex gap-1">
                                  {(f.specialization || []).map(s => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <p className="text-muted-foreground">Faculty information not available. The affected faculty may have been removed.</p>
                      )}
                    </div>
                  )}

                  {selectedConflict.type === 'room_capacity_gap' && (
                    <div className="space-y-2">
                      {selectedConflict.schedule1?.section ? (
                        <>
                          <p>Section <strong>{selectedConflict.schedule1.section.sectionName}</strong> has <strong>{selectedConflict.schedule1.section.studentCount} students</strong> but no room is large enough.</p>
                          {selectedConflict.schedule1.room && (
                            <p className="text-xs text-muted-foreground">Current room: {selectedConflict.schedule1.room.roomName} (capacity: {selectedConflict.schedule1.room.capacity})</p>
                          )}
                        </>
                      ) : (
                        <p className="text-muted-foreground">Section information not available. The section may have been removed or modified.</p>
                      )}
                    </div>
                  )}

                  {selectedConflict.type === 'fully_unavailable' && (
                    <div className="space-y-2">
                      {selectedConflict.faculty && selectedConflict.faculty.length > 0 ? (
                        <>
                          <p><strong>{selectedConflict.faculty[0]?.name}</strong> has marked all days as unavailable and cannot be assigned any schedules.</p>
                          {selectedConflict.faculty[0]?.email && (
                            <p className="text-xs text-muted-foreground">Contact: {selectedConflict.faculty[0].email}</p>
                          )}
                        </>
                      ) : (
                        <p className="text-muted-foreground">Faculty information not available. The faculty member may have been removed.</p>
                      )}
                    </div>
                  )}

                  {/* Info Conflicts */}
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
                  {getResolutionActions(selectedConflict).map(action => (
                    <button
                      key={action.id}
                      onClick={action.action}
                      className={`w-full p-3 rounded-lg border text-left transition-all hover:shadow-md ${
                        action.primary 
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                          : 'bg-background hover:bg-muted border-border'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`shrink-0 ${action.primary ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
                          {action.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{action.label}</div>
                          <div className={`text-xs ${action.primary ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                            {action.description}
                          </div>
                        </div>
                        <ExternalLink className={`h-4 w-4 shrink-0 ${action.primary ? 'text-primary-foreground/80' : 'text-muted-foreground'}`} />
                      </div>
                    </button>
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
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
