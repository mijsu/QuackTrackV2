'use client';

import { useState, useEffect, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from './DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, MoreHorizontal, Pencil, Trash2, BookOpen, Filter, X, ChevronDown, ChevronUp, Clock, Layers, Building2, GraduationCap, Calendar, Hash, Download, Crown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Subject, Department, Program } from '@/types';
import { YEAR_LEVEL_OPTIONS, SEMESTER_OPTIONS, getYearLevelLabel } from '@/types';
import { SpecializationSelector } from '@/components/ui/SpecializationSelector';
import { useAppStore } from '@/store';
import { ExportButton } from '@/components/ui/ExportButton';
import { CsvImportButton } from '@/components/ui/CsvImportButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { BatchActionBar, SelectAllCheckbox } from '@/components/ui/BatchActionBar';
import { cn } from '@/lib/utils';
import { QuickFilters, type FilterOption } from '@/components/ui/QuickFilters';

const SUBJECTS_CSV_TEMPLATE = [
  { SubjectCode: 'CS101', SubjectName: 'Introduction to Computer Science', Units: '3', YearLevel: '1', Semester: '1st Semester', Duration: '3', Department: 'IT Department', Program: 'Bachelor of Science in Computer Science', Specialization: '', Type: 'lecture' },
  { SubjectCode: 'IT201', SubjectName: 'Web Development', Units: '3', YearLevel: '2', Semester: '1st Semester', Duration: '3', Department: 'IT Department', Program: 'Bachelor of Science in Information Technology', Specialization: '', Type: 'lecture' },
];

export function SubjectsView() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Filter state - now includes program, yearLevel, and semester
  const [filters, setFilters] = useState({
    departmentId: 'all',
    programId: 'all',
    yearLevel: 'all',
    semester: 'all',
    units: 'all',
    subjectType: 'all',
  });
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  
  // Form state for cascading dropdown
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('');
  
  // Get conflict resolution context from store
  const { conflictResolutionContext, clearConflictResolutionContext } = useAppStore();

  useEffect(() => {
    fetchData();
  }, []);

  // Handle conflict resolution context - open edit modal for subject
  useEffect(() => {
    if (!loading && conflictResolutionContext && subjects.length > 0) {
      const { subjectIdToEdit } = conflictResolutionContext;
      
      if (subjectIdToEdit) {
        const subject = subjects.find(s => s.id === subjectIdToEdit);
        if (subject) {
          handleEdit(subject);
          clearConflictResolutionContext();
          toast.info('Editing subject for conflict resolution');
        }
      }
    }
  }, [loading, conflictResolutionContext, subjects]);

  const fetchData = async () => {
    try {
      const [subjectsRes, deptsRes, programsRes] = await Promise.all([
        fetch('/api/subjects'),
        fetch('/api/departments'),
        fetch('/api/programs?includeInactive=false'),
      ]);

      const subjectsData = await subjectsRes.json();
      const deptsData = await deptsRes.json();
      const programsData = await programsRes.json();

      // Ensure we only set arrays - handle error responses
      setSubjects(Array.isArray(subjectsData) ? subjectsData : []);
      setDepartments(Array.isArray(deptsData) ? deptsData : []);
      setPrograms(Array.isArray(programsData) ? programsData : []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      toast.error('Failed to load subjects');
      setSubjects([]);
      setDepartments([]);
      setPrograms([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter programs by selected department (for cascading dropdown)
  const filteredPrograms = useMemo(() => {
    if (!selectedDepartmentId) return [];
    return programs.filter(p => p.departmentId === selectedDepartmentId);
  }, [programs, selectedDepartmentId]);

  // Filter programs for filter dropdown (when department filter is selected)
  const filterProgramOptions = useMemo(() => {
    if (filters.departmentId === 'all') return programs;
    return programs.filter(p => p.departmentId === filters.departmentId);
  }, [programs, filters.departmentId]);

  const handleCreate = () => {
    setSelectedSubject(null);
    setSelectedDepartmentId('');
    setFormData({
      subjectCode: '',
      subjectName: '',
      description: '',
      units: 3,
      programId: '',
      yearLevel: 1,
      semester: '1st Semester',
      requiredSpecialization: [],
      defaultDurationHours: 3,
      subjectType: 'regular',
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleEdit = (subject: Subject) => {
    setSelectedSubject(subject);
    // Find the program to get its department
    const subjectProgram = programs.find(p => p.id === subject.programId);
    const deptId = subjectProgram?.departmentId || subject.departmentId || '';
    setSelectedDepartmentId(deptId);
    
    setFormData({
      subjectCode: subject.subjectCode,
      subjectName: subject.subjectName,
      description: subject.description || '',
      units: subject.units,
      programId: subject.programId,
      yearLevel: subject.yearLevel || 1,
      semester: subject.semester || '1st Semester',
      requiredSpecialization: subject.requiredSpecialization,
      defaultDurationHours: subject.defaultDurationHours || 3,
      subjectType: (subject as Record<string, unknown>).subjectType as string || 'regular',
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleDelete = (subject: Subject) => {
    setSelectedSubject(subject);
    setDeleteDialogOpen(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.subjectCode || (formData.subjectCode as string).trim() === '') {
      errors.subjectCode = 'Subject code is required';
    }

    if (!formData.subjectName || (formData.subjectName as string).trim() === '') {
      errors.subjectName = 'Subject name is required';
    }

    if (!formData.units || (formData.units as number) < 1) {
      errors.units = 'Units must be at least 1';
    }

    if (!selectedDepartmentId) {
      errors.departmentId = 'Department is required';
    }

    if (!formData.programId) {
      errors.programId = 'Program is required';
    }

    if (!formData.yearLevel) {
      errors.yearLevel = 'Year Level is required';
    }

    if (!formData.semester) {
      errors.semester = 'Semester is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const url = selectedSubject ? `/api/subjects/${selectedSubject.id}` : '/api/subjects';
      const method = selectedSubject ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success(selectedSubject ? 'Subject updated' : 'Subject created');
        setDialogOpen(false);
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Operation failed');
      }
    } catch {
      toast.error('Operation failed');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!selectedSubject) return;

    try {
      const res = await fetch(`/api/subjects/${selectedSubject.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Subject deleted');
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

  const handleImportSubjects = async (data: Record<string, string>[]) => {
    try {
      const res = await fetch('/api/subjects/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: data }),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        if (result.imported > 0) {
          toast.success(result.message || `Successfully imported ${result.imported} subject${result.imported !== 1 ? 's' : ''}`);
        }
        if (result.failed > 0) {
          const errorDetails = result.errors
            ? ` — ${result.errors.map((e: { row: number; message: string }) => `Row ${e.row}: ${e.message}`).slice(0, 5).join('; ')}${result.errors.length > 5 ? '...' : ''}`
            : '';
          toast.error(`Failed to import ${result.failed} record${result.failed !== 1 ? 's' : ''}.${errorDetails}`);
        }
      } else {
        toast.error(result.error || 'Failed to import subjects');
      }
    } catch {
      toast.error('Failed to import subjects');
    }

    fetchData();
  };

  // Handle department selection change in form
  const handleDepartmentChange = (deptId: string) => {
    setSelectedDepartmentId(deptId);
    // Reset program selection when department changes
    setFormData(prev => ({ ...prev, programId: '' }));
  };

  // Filter subjects based on selected filters
  const filteredSubjects = useMemo(() => {
    return subjects.filter(subject => {
      if (filters.departmentId !== 'all' && subject.departmentId !== filters.departmentId) return false;
      if (filters.programId !== 'all' && subject.programId !== filters.programId) return false;
      if (filters.yearLevel !== 'all' && subject.yearLevel !== parseInt(filters.yearLevel)) return false;
      if (filters.semester !== 'all' && subject.semester !== filters.semester) return false;
      if (filters.subjectType !== 'all' && (subject as Record<string, unknown>).subjectType !== filters.subjectType) return false;
      if (filters.units !== 'all') {
        if (filters.units === '5+' && subject.units < 5) return false;
        if (filters.units !== '5+' && subject.units !== parseInt(filters.units)) return false;
      }
      return true;
    });
  }, [subjects, filters]);

  // Department filter options for QuickFilters
  const departmentFilterOptions: FilterOption[] = useMemo(() => {
    return departments.map((dept) => ({
      value: dept.id,
      label: dept.name,
      count: subjects.filter((s) => s.departmentId === dept.id).length || undefined,
      icon: <Building2 className="h-3.5 w-3.5" />,
    }));
  }, [departments, subjects]);

  // Year Level filter options for QuickFilters
  const yearLevelFilterOptions: FilterOption[] = useMemo(() => {
    return YEAR_LEVEL_OPTIONS.map((option) => ({
      value: String(option.value),
      label: option.label,
      count: subjects.filter((s) => s.yearLevel === option.value).length || undefined,
      icon: <GraduationCap className="h-3.5 w-3.5" />,
    }));
  }, [subjects]);

  // Semester filter options for QuickFilters
  const semesterFilterOptions: FilterOption[] = useMemo(() => {
    return SEMESTER_OPTIONS.map((option) => ({
      value: option.value,
      label: option.label,
      count: subjects.filter((s) => s.semester === option.value).length || undefined,
      icon: <Calendar className="h-3.5 w-3.5" />,
    }));
  }, [subjects]);

  // Quick filter active values derived from filters state
  const deptActiveFilters = useMemo(() => {
    return filters.departmentId !== 'all' ? [filters.departmentId] : [];
  }, [filters.departmentId]);

  const yearActiveFilters = useMemo(() => {
    return filters.yearLevel !== 'all' ? [filters.yearLevel] : [];
  }, [filters.yearLevel]);

  const semesterActiveFilters = useMemo(() => {
    return filters.semester !== 'all' ? [filters.semester] : [];
  }, [filters.semester]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    return Object.values(filters).filter(v => v !== 'all').length;
  }, [filters]);

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      departmentId: 'all',
      programId: 'all',
      yearLevel: 'all',
      semester: 'all',
      units: 'all',
      subjectType: 'all',
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
    setSelectedRows(new Set(filteredSubjects.map(s => s.id)));
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
        const res = await fetch(`/api/subjects/${id}`, { method: 'DELETE' });
        if (res.ok) successCount++;
        else errorCount++;
      } catch {
        errorCount++;
      }
    }
    if (successCount > 0) toast.success(`Deleted ${successCount} subject${successCount !== 1 ? 's' : ''}`);
    if (errorCount > 0) toast.error(`Failed to delete ${errorCount} subject${errorCount !== 1 ? 's' : ''}`);
    setIsDeleting(false);
    clearSelection();
    setBatchDeleteDialogOpen(false);
    fetchData();
  };

  const exportSelected = (ids: string[]) => {
    const selected = filteredSubjects.filter(s => ids.includes(s.id));
    if (selected.length === 0) return;
    const data = selected.map(s => ({
      SubjectCode: s.subjectCode,
      SubjectName: s.subjectName,
      YearLevel: s.yearLevel || 1,
      Semester: s.semester || '1st Semester',
      Units: s.units,
      Duration: `${s.defaultDurationHours || 3} hours`,
      Program: getProgramName(s.programId),
      Department: getDepartmentName(s.departmentId),
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
    a.download = 'selected-subjects.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${selected.length} subjects`);
  };

  // Get program name helper
  const getProgramName = (programId: string) => {
    const program = programs.find(p => p.id === programId);
    return program?.name || 'Unknown';
  };

  // Get department name helper
  const getDepartmentName = (departmentId: string) => {
    const dept = departments.find(d => d.id === departmentId);
    return dept?.name || 'Unknown';
  };

  const columns: ColumnDef<Subject>[] = [
    {
      id: 'select',
      size: 40,
      header: () => (
        <SelectAllCheckbox
          selectedCount={selectedRows.size}
          totalCount={filteredSubjects.length}
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
      accessorKey: 'subjectCode',
      header: 'Code',
      cell: ({ row }) => (
        <Badge variant="outline" className="font-mono">
          {row.original.subjectCode}
        </Badge>
      ),
    },
    {
      accessorKey: 'subjectName',
      header: 'Subject Name',
    },
    {
      accessorKey: 'yearLevel',
      header: 'Year',
      cell: ({ row }) => {
        const yearLevel = row.original.yearLevel || 1;
        return (
          <Badge variant="outline" className="gap-1">
            <GraduationCap className="h-3 w-3" />
            {getYearLevelLabel(yearLevel)}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'semester',
      header: 'Semester',
      cell: ({ row }) => {
        const semester = row.original.semester || '1st Semester';
        return (
          <Badge variant="secondary" className="gap-1">
            <Calendar className="h-3 w-3" />
            {semester}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'units',
      header: 'Units',
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.units} units</Badge>
      ),
    },
    {
      id: 'subjectType',
      header: 'Type',
      cell: ({ row }) => {
        const subjectType = (row.original as Record<string, unknown>).subjectType as string || 'regular';
        if (subjectType === 'executive') {
          return (
            <Badge variant="outline" className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/25">
              <Crown className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
              Executive
            </Badge>
          );
        }
        return (
          <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25">
            <GraduationCap className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
            Regular
          </Badge>
        );
      },
    },
    {
      accessorKey: 'defaultDurationHours',
      header: 'Duration',
      cell: ({ row }) => {
        const hours = row.original.defaultDurationHours || 3;
        return (
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm">{hours} {hours === 1 ? 'hour' : 'hours'}</span>
          </div>
        );
      },
    },
    {
      id: 'program',
      header: 'Program',
      cell: ({ row }) => {
        const programName = getProgramName(row.original.programId);
        const deptName = getDepartmentName(row.original.departmentId);
        return (
          <div className="flex flex-col gap-0.5">
            <Badge variant="outline" className="w-fit">
              <Layers className="h-3 w-3 mr-1" />
              {programName}
            </Badge>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {deptName}
            </span>
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const subject = row.original;
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
              <DropdownMenuItem onClick={() => handleEdit(subject)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(subject)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <BookOpen className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-600">Subjects</h1>
          <p className="text-muted-foreground">Manage course subjects organized by program</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton
            data={filteredSubjects.map(s => ({
              SubjectCode: s.subjectCode,
              SubjectName: s.subjectName,
              YearLevel: s.yearLevel || 1,
              Semester: s.semester || '1st Semester',
              Units: s.units,
              Duration: `${s.defaultDurationHours || 3} hours`,
              Program: getProgramName(s.programId),
              Department: getDepartmentName(s.departmentId),
              Specialization: (s.requiredSpecialization || []).join('; '),
            }))}
            filename="subjects-list"
          />
          <CsvImportButton
            onImport={handleImportSubjects}
            templateData={SUBJECTS_CSV_TEMPLATE}
            templateFilename="subjects-template.csv"
          />
          <Button onClick={handleCreate} disabled={programs.length === 0}>
            <Plus className="mr-2 h-4 w-4" />
            Add Subject
          </Button>
        </div>
      </div>

      {programs.length === 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <CardContent className="pt-4 flex items-center gap-3">
            <Layers className="h-5 w-5 text-amber-600" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">No programs available</p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Please create at least one program before adding subjects. 
                <a href="/admin?tab=programs" className="underline ml-1">Go to Programs</a>
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-hover gradient-border">
          <div className="h-1 rounded-t-lg bg-gradient-to-r from-emerald-500 to-emerald-400" />
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Subjects</p>
                <div className="text-2xl font-bold mt-1">{subjects.length}</div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover gradient-border">
          <div className="h-1 rounded-t-lg bg-gradient-to-r from-blue-500 to-blue-400" />
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Programs</p>
                <div className="text-2xl font-bold mt-1">{new Set(subjects.map(s => s.programId)).size}</div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                <Layers className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover gradient-border">
          <div className="h-1 rounded-t-lg bg-gradient-to-r from-amber-500 to-amber-400" />
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Departments</p>
                <div className="text-2xl font-bold mt-1">{new Set(subjects.map(s => s.departmentId)).size}</div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover gradient-border">
          <div className="h-1 rounded-t-lg bg-gradient-to-r from-violet-500 to-violet-400" />
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Avg Units</p>
                <div className="text-2xl font-bold mt-1">{subjects.length > 0 ? (subjects.reduce((sum, s) => sum + s.units, 0) / subjects.length).toFixed(1) : '0'}</div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center">
                <Hash className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Filters - Department, Year Level, Semester */}
      <div className="space-y-3">
        <QuickFilters
          label="Department"
          filters={departmentFilterOptions}
          activeFilters={deptActiveFilters}
          onFilterChange={(values) =>
            setFilters((prev) => ({ ...prev, departmentId: values.length > 0 ? values[0] : 'all', programId: 'all' }))
          }
          mode="single"
        />
        <QuickFilters
          label="Year Level"
          filters={yearLevelFilterOptions}
          activeFilters={yearActiveFilters}
          onFilterChange={(values) =>
            setFilters((prev) => ({ ...prev, yearLevel: values.length > 0 ? values[0] : 'all' }))
          }
          mode="single"
        />
        <QuickFilters
          label="Semester"
          filters={semesterFilterOptions}
          activeFilters={semesterActiveFilters}
          onFilterChange={(values) =>
            setFilters((prev) => ({ ...prev, semester: values.length > 0 ? values[0] : 'all' }))
          }
          mode="single"
        />
      </div>

      {/* Filters - Program, Units */}
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
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
                  <div className="space-y-1 min-w-0">
                    <label className="text-[10px] sm:text-xs font-medium text-muted-foreground">Program</label>
                    <Select
                      value={filters.programId}
                      onValueChange={(value) => setFilters({ ...filters, programId: value })}
                    >
                      <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm w-full">
                        <span className="truncate">
                          <SelectValue placeholder="All" />
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Programs</SelectItem>
                        {filterProgramOptions.map((prog) => (
                          <SelectItem key={prog.id} value={prog.id}>
                            {prog.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 min-w-0">
                    <label className="text-[10px] sm:text-xs font-medium text-muted-foreground">Units</label>
                    <Select
                      value={filters.units}
                      onValueChange={(value) => setFilters({ ...filters, units: value })}
                    >
                      <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm w-full">
                        <span className="truncate">
                          <SelectValue placeholder="All" />
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Units</SelectItem>
                        <SelectItem value="1">1 unit</SelectItem>
                        <SelectItem value="2">2 units</SelectItem>
                        <SelectItem value="3">3 units</SelectItem>
                        <SelectItem value="4">4 units</SelectItem>
                        <SelectItem value="5+">5+ units</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 min-w-0">
                    <label className="text-[10px] sm:text-xs font-medium text-muted-foreground">Subject Type</label>
                    <Select
                      value={filters.subjectType}
                      onValueChange={(value) => setFilters({ ...filters, subjectType: value })}
                    >
                      <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm w-full">
                        <span className="truncate">
                          <SelectValue placeholder="All" />
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="regular">Regular</SelectItem>
                        <SelectItem value="executive">Executive</SelectItem>
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

      {/* Results count */}
      <div className="text-xs sm:text-sm text-muted-foreground">
        Showing {filteredSubjects.length} of {subjects.length} subjects
      </div>

      {/* Empty State */}
      {filteredSubjects.length === 0 && (
        <EmptyState
          icon={BookOpen}
          title="No subjects found"
          description={activeFilterCount > 0
            ? 'No subjects match the current filters. Try adjusting your filter criteria.'
            : programs.length === 0
              ? 'Create a program first before adding subjects.'
              : 'Get started by adding your first subject.'}
          action={{
            label: activeFilterCount > 0 ? 'Clear Filters' : 'Add Subject',
            onClick: activeFilterCount > 0 ? clearFilters : handleCreate,
          }}
          secondaryAction={activeFilterCount > 0 ? {
            label: 'Add Subject',
            onClick: handleCreate,
          } : undefined}
        />
      )}

      {filteredSubjects.length > 0 && (
      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={filteredSubjects}
            searchKey="subjectName"
            searchPlaceholder="Search subjects..."
            isRowSelected={(subject) => selectedRows.has(subject.id)}
          />
        </CardContent>
      </Card>
      )}

      {/* Batch Action Bar */}
      <BatchActionBar
        selectedIds={Array.from(selectedRows)}
        totalCount={filteredSubjects.length}
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
        ]}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-5xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{selectedSubject ? 'Edit Subject' : 'Add New Subject'}</DialogTitle>
            <DialogDescription>
              Subjects must be assigned to a program within a department
            </DialogDescription>
          </DialogHeader>
          
          {/* Scrollable form content */}
          <div className="flex-1 overflow-y-auto py-4 pr-2 -mr-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              {/* Left Column */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="subjectCode">Subject Code *</Label>
                  <Input
                    id="subjectCode"
                    value={formData.subjectCode as string || ''}
                    onChange={(e) => setFormData({ ...formData, subjectCode: e.target.value })}
                    className={formErrors.subjectCode ? 'border-destructive' : ''}
                    placeholder="e.g., CS101"
                  />
                  {formErrors.subjectCode && <p className="text-xs text-destructive">{formErrors.subjectCode}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="subjectName">Subject Name *</Label>
                  <Input
                    id="subjectName"
                    value={formData.subjectName as string || ''}
                    onChange={(e) => setFormData({ ...formData, subjectName: e.target.value })}
                    className={formErrors.subjectName ? 'border-destructive' : ''}
                    placeholder="e.g., Introduction to Programming"
                  />
                  {formErrors.subjectName && <p className="text-xs text-destructive">{formErrors.subjectName}</p>}
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="units">Units *</Label>
                    <Input
                      id="units"
                      type="number"
                      value={formData.units as number || 3}
                      onChange={(e) => setFormData({ ...formData, units: parseInt(e.target.value) })}
                      className={formErrors.units ? 'border-destructive' : ''}
                      min={1}
                      max={6}
                    />
                    {formErrors.units && <p className="text-xs text-destructive">{formErrors.units}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration (hrs)</Label>
                    <Input
                      id="duration"
                      type="number"
                      min={1}
                      max={8}
                      value={formData.defaultDurationHours as number || 3}
                      onChange={(e) => setFormData({ ...formData, defaultDurationHours: parseInt(e.target.value) || 3 })}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="yearLevel">Year Level *</Label>
                  <Select
                    value={String(formData.yearLevel || 1)}
                    onValueChange={(value) => setFormData({ ...formData, yearLevel: parseInt(value) })}
                  >
                    <SelectTrigger id="yearLevel" className={formErrors.yearLevel ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Select year level" />
                    </SelectTrigger>
                    <SelectContent>
                      {YEAR_LEVEL_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={String(option.value)}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formErrors.yearLevel && <p className="text-xs text-destructive">{formErrors.yearLevel}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="semester">Semester *</Label>
                  <Select
                    value={formData.semester as string || '1st Semester'}
                    onValueChange={(value) => setFormData({ ...formData, semester: value })}
                  >
                    <SelectTrigger id="semester" className={formErrors.semester ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Select semester" />
                    </SelectTrigger>
                    <SelectContent>
                      {SEMESTER_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formErrors.semester && <p className="text-xs text-destructive">{formErrors.semester}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subjectType">Subject Type</Label>
                  <Select
                    value={formData.subjectType as string || 'regular'}
                    onValueChange={(value) => setFormData({ ...formData, subjectType: value })}
                  >
                    <SelectTrigger id="subjectType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="regular">Regular</SelectItem>
                      <SelectItem value="executive">Executive (Masteral)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Executive subjects are for masteral degree programs</p>
                </div>
              </div>
              
              {/* Right Column */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="department">Department *</Label>
                  <Select
                    value={selectedDepartmentId}
                    onValueChange={handleDepartmentChange}
                  >
                    <SelectTrigger id="department" className={formErrors.departmentId ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formErrors.departmentId && <p className="text-xs text-destructive">{formErrors.departmentId}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="program">Program *</Label>
                  <Select
                    value={formData.programId as string || ''}
                    onValueChange={(value) => setFormData({ ...formData, programId: value })}
                    disabled={!selectedDepartmentId}
                  >
                    <SelectTrigger id="program" className={formErrors.programId ? 'border-destructive' : ''}>
                      <SelectValue placeholder={selectedDepartmentId ? "Select program" : "Select department first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredPrograms.map((prog) => (
                        <SelectItem key={prog.id} value={prog.id}>{prog.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formErrors.programId && <p className="text-xs text-destructive">{formErrors.programId}</p>}
                  {selectedDepartmentId && filteredPrograms.length === 0 && (
                    <p className="text-xs text-amber-600">No programs available in this department</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <textarea
                    id="description"
                    className="w-full min-h-[80px] p-3 rounded-lg border bg-background resize-none text-sm"
                    placeholder="Enter subject description..."
                    value={formData.description as string || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <SpecializationSelector
                    selected={(formData.requiredSpecialization as string[]) || []}
                    onChange={(specs) => setFormData({ ...formData, requiredSpecialization: specs })}
                    isAdmin={true}
                    label="Required Specialization"
                    idPrefix="req-spec"
                    maxHeight="max-h-36"
                    hint="Select specializations required to teach this subject"
                  />
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter className="border-t pt-4 mt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Saving...' : selectedSubject ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Subject</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedSubject?.subjectName}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-white hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Batch Delete Confirmation Dialog */}
      <AlertDialog open={batchDeleteDialogOpen} onOpenChange={setBatchDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Selected Subjects</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedRows.size} selected subject{selectedRows.size !== 1 ? 's' : ''}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => batchDeleteSelected(Array.from(selectedRows))} disabled={isDeleting} className="bg-destructive text-white hover:bg-destructive/90">
              {isDeleting ? 'Deleting...' : 'Delete All'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
