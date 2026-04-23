'use client';

import { useState, useEffect, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from './DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Layers, Plus, Edit3, Trash2, Search, Building2, BookOpen, Users,
  Loader2, RefreshCw, CheckCircle, X, GraduationCap, Power, TrendingUp,
  ArrowDownAZ, ArrowUpZA, LayoutGrid, List, Download, MoreHorizontal,
  Pencil,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { Program, Department } from '@/types';
import { EmptyState } from '@/components/ui/EmptyState';
import { CsvImportButton } from '@/components/ui/CsvImportButton';
import { ExportButton } from '@/components/ui/ExportButton';
import { BatchActionBar, SelectAllCheckbox } from '@/components/ui/BatchActionBar';
import { FilterBar, type FilterBarFilter } from '@/components/ui/FilterBar';
import { useCountUp } from '@/hooks/use-count-up';

const PROGRAMS_CSV_TEMPLATE = [
  { ProgramName: 'Bachelor of Science in Computer Science', ProgramCode: 'BSCS', DepartmentName: 'Computer Science', Duration: '4', Type: 'Undergraduate' },
  { ProgramName: 'Bachelor of Science in Information Technology', ProgramCode: 'BSIT', DepartmentName: 'Information Technology', Duration: '4', Type: 'Undergraduate' },
];

type DisplayMode = 'cards' | 'table';
type SortOption = 'name-asc' | 'name-desc' | 'subjects-desc' | 'sections-desc';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'name-asc', label: 'Name A–Z' },
  { value: 'name-desc', label: 'Name Z–A' },
  { value: 'subjects-desc', label: 'Most Subjects' },
  { value: 'sections-desc', label: 'Most Sections' },
];

// Color sets for rotating card gradient borders and icon containers
const CARD_COLOR_SETS = [
  { border: 'from-emerald-500 to-teal-500', iconBg: 'bg-emerald-100 dark:bg-emerald-500/20', iconText: 'text-emerald-600 dark:text-emerald-400' },
  { border: 'from-teal-500 to-cyan-500', iconBg: 'bg-teal-100 dark:bg-teal-500/20', iconText: 'text-teal-600 dark:text-teal-400' },
  { border: 'from-amber-500 to-orange-500', iconBg: 'bg-amber-100 dark:bg-amber-500/20', iconText: 'text-amber-600 dark:text-amber-400' },
  { border: 'from-violet-500 to-purple-500', iconBg: 'bg-violet-100 dark:bg-violet-500/20', iconText: 'text-violet-600 dark:text-violet-400' },
  { border: 'from-rose-500 to-pink-500', iconBg: 'bg-rose-100 dark:bg-rose-500/20', iconText: 'text-rose-600 dark:text-rose-400' },
  { border: 'from-cyan-500 to-sky-500', iconBg: 'bg-cyan-100 dark:bg-cyan-500/20', iconText: 'text-cyan-600 dark:text-cyan-400' },
];

export function ProgramsView() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDepartmentFilter, setActiveDepartmentFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('cards');
  const [sortOption, setSortOption] = useState<SortOption>('name-asc');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    departmentId: '',
  });

  useEffect(() => {
    fetchPrograms();
    fetchDepartments();
  }, []);

  // Count-up animation values for stat cards
  const totalProgramsCount = useCountUp(programs.length, 800, !loading);
  const activeProgramsCount = useCountUp(programs.filter(p => p.isActive).length, 800, !loading);
  const totalSubjectsCount = useCountUp(programs.reduce((sum, p) => sum + (p._count?.subjects || 0), 0), 800, !loading);
  const departmentsCount = useCountUp(departments.length, 800, !loading);

  const fetchPrograms = async () => {
    try {
      const res = await fetch('/api/programs?includeInactive=true');
      if (!res.ok) throw new Error('Failed to fetch programs');
      const data = await res.json();
      setPrograms(data);
    } catch (error) {
      console.error('Error fetching programs:', error);
      toast.error('Failed to load programs');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/departments');
      if (!res.ok) throw new Error('Failed to fetch departments');
      const data = await res.json();
      setDepartments(data);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const openCreateDialog = () => {
    setSelectedProgram(null);
    setFormData({
      name: '',
      code: '',
      description: '',
      departmentId: departments.length > 0 ? departments[0].id : '',
    });
    setDialogOpen(true);
  };

  const openEditDialog = (program: Program) => {
    setSelectedProgram(program);
    setFormData({
      name: program.name,
      code: program.code || '',
      description: program.description || '',
      departmentId: program.departmentId,
    });
    setDialogOpen(true);
  };

  const openDeleteConfirm = (program: Program) => {
    setSelectedProgram(program);
    setDeleteConfirmOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.departmentId) {
      toast.error('Program name and department are required');
      return;
    }

    setSaving(true);
    try {
      const url = selectedProgram
        ? `/api/programs/${selectedProgram.id}`
        : '/api/programs';

      const res = await fetch(url, {
        method: selectedProgram ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save program');
      }

      toast.success(selectedProgram ? 'Program updated successfully' : 'Program created successfully');
      setDialogOpen(false);
      fetchPrograms();
    } catch (error) {
      console.error('Error saving program:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save program');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedProgram) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/programs/${selectedProgram.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete program');
      }

      toast.success('Program deleted successfully');
      setDeleteConfirmOpen(false);
      fetchPrograms();
    } catch (error) {
      console.error('Error deleting program:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete program');
    } finally {
      setDeleting(false);
    }
  };

  const toggleActive = async (program: Program) => {
    try {
      const res = await fetch(`/api/programs/${program.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !program.isActive }),
      });

      if (!res.ok) throw new Error('Failed to update program');

      toast.success(program.isActive ? 'Program deactivated' : 'Program activated');
      fetchPrograms();
    } catch (error) {
      console.error('Error toggling program status:', error);
      toast.error('Failed to update program status');
    }
  };

  const handleImportPrograms = async (data: Record<string, string>[]) => {
    let successCount = 0;
    let errorCount = 0;

    for (const row of data) {
      try {
        const name = row['ProgramName'] || row['programName'] || row['Name'] || row['name'] || '';
        const code = row['ProgramCode'] || row['programCode'] || row['Code'] || row['code'] || '';
        const departmentName = row['DepartmentName'] || row['departmentName'] || row['Department'] || row['department'] || '';

        if (!name || !departmentName) {
          errorCount++;
          continue;
        }

        // Find matching department
        let departmentId = '';
        const dept = departments.find(
          (d) => d.name.toLowerCase() === departmentName.toLowerCase()
        );
        if (dept) {
          departmentId = dept.id;
        }

        if (!departmentId) {
          errorCount++;
          continue;
        }

        const res = await fetch('/api/programs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            code,
            description: '',
            departmentId,
          }),
        });

        if (res.ok) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch {
        errorCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`Successfully imported ${successCount} program${successCount !== 1 ? 's' : ''}`);
    }
    if (errorCount > 0) {
      toast.error(`Failed to import ${errorCount} record${errorCount !== 1 ? 's' : ''}. Check that program names are unique and departments exist.`);
    }

    fetchPrograms();
  };

  // Build filter bar for departments
  const departmentFilters: FilterBarFilter[] = useMemo(() =>
    departments.map((dept) => {
      const count = programs.filter((p) => p.departmentId === dept.id).length;
      return {
        key: dept.id,
        label: dept.name,
        icon: Building2,
        count,
        active: activeDepartmentFilter === dept.id,
      };
    }),
    [departments, programs, activeDepartmentFilter]
  );

  const handleDeptFilterToggle = (key: string) => {
    setActiveDepartmentFilter((prev) => (prev === key ? 'all' : key));
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setActiveDepartmentFilter('all');
  };

  const filteredPrograms = useMemo(() => {
    let result = programs.filter(program => {
      const matchesSearch =
        program.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (program.code?.toLowerCase() || '').includes(searchQuery.toLowerCase());
      const matchesDepartment = activeDepartmentFilter === 'all' || program.departmentId === activeDepartmentFilter;
      return matchesSearch && matchesDepartment;
    });

    // Sort
    switch (sortOption) {
      case 'name-asc':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        result.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'subjects-desc':
        result.sort((a, b) => (b._count?.subjects || 0) - (a._count?.subjects || 0));
        break;
      case 'sections-desc':
        result.sort((a, b) => (b._count?.sections || 0) - (a._count?.sections || 0));
        break;
    }

    return result;
  }, [programs, searchQuery, activeDepartmentFilter, sortOption]);

  const getDepartmentName = (departmentId: string) => {
    const dept = departments.find(d => d.id === departmentId);
    return dept?.name || 'Unknown';
  };

  const getDepartmentBadgeStyle = (departmentId: string) => {
    const idx = departments.findIndex(d => d.id === departmentId);
    const styles = [
      'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
      'bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400',
      'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400',
      'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400',
      'bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400',
    ];
    return styles[idx % styles.length];
  };

  const activeFilterCount = (searchQuery ? 1 : 0) + (activeDepartmentFilter !== 'all' ? 1 : 0);
  const currentSort = SORT_OPTIONS.find((s) => s.value === sortOption);

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
    setSelectedRows(new Set(filteredPrograms.map(p => p.id)));
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
        const res = await fetch(`/api/programs/${id}`, { method: 'DELETE' });
        if (res.ok) successCount++;
        else errorCount++;
      } catch {
        errorCount++;
      }
    }
    if (successCount > 0) toast.success(`Deleted ${successCount} program${successCount !== 1 ? 's' : ''}`);
    if (errorCount > 0) toast.error(`Failed to delete ${errorCount} program${errorCount !== 1 ? 's' : ''}`);
    setIsDeleting(false);
    clearSelection();
    setBatchDeleteDialogOpen(false);
    fetchPrograms();
  };

  const exportSelected = (ids: string[]) => {
    const selected = filteredPrograms.filter(p => ids.includes(p.id));
    if (selected.length === 0) return;
    const data = selected.map(p => ({
      'Program Name': p.name,
      'Code': p.code || '',
      'Department': getDepartmentName(p.departmentId),
      'Status': p.isActive ? 'Active' : 'Inactive',
      'Subjects': p._count?.subjects || 0,
      'Sections': p._count?.sections || 0,
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
    a.download = 'selected-programs.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${selected.length} programs`);
  };

  // DataTable columns for table view
  const columns: ColumnDef<Program>[] = [
    {
      id: 'select',
      size: 40,
      header: () => (
        <SelectAllCheckbox
          selectedCount={selectedRows.size}
          totalCount={filteredPrograms.length}
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
      accessorKey: 'name',
      header: 'Program',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-500/10">
            <GraduationCap className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="font-medium">{row.original.name}</p>
            {row.original.code && (
              <p className="text-xs text-muted-foreground font-mono">{row.original.code}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'departmentId',
      header: 'Department',
      cell: ({ row }) => (
        <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium text-xs", getDepartmentBadgeStyle(row.original.departmentId))}>
          <Building2 className="h-3.5 w-3.5" />
          <span>{getDepartmentName(row.original.departmentId)}</span>
        </span>
      ),
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => (
        row.original.isActive ? (
          <Badge className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 border-0">
            Active
          </Badge>
        ) : (
          <Badge variant="secondary">Inactive</Badge>
        )
      ),
    },
    {
      accessorKey: '_count',
      header: 'Stats',
      cell: ({ row }) => {
        const count = row.original._count;
        return (
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400">
              <BookOpen className="h-3.5 w-3.5" />
              <span>{count?.subjects || 0}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400">
              <Users className="h-3.5 w-3.5" />
              <span>{count?.sections || 0}</span>
            </span>
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const program = row.original;
        return (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleActive(program)}
              className="h-8 w-8 p-0"
            >
              {program.isActive ? (
                <X className="h-4 w-4" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openEditDialog(program)}
              className="h-8 w-8 p-0"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openDeleteConfirm(program)}
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-600">Programs</h1>
          <div className="h-1 w-20 mt-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" />
          <p className="text-muted-foreground mt-1">
            Manage academic programs within departments
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Display mode toggle */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <button
              onClick={() => setDisplayMode('cards')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200',
                displayMode === 'cards'
                  ? 'bg-background shadow-sm text-emerald-600 dark:text-emerald-400'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Cards
            </button>
            <button
              onClick={() => setDisplayMode('table')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200',
                displayMode === 'table'
                  ? 'bg-background shadow-sm text-emerald-600 dark:text-emerald-400'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <List className="h-3.5 w-3.5" />
              Table
            </button>
          </div>

          <ExportButton
            data={filteredPrograms.map(p => ({
              'Program Name': p.name,
              'Code': p.code || '',
              'Department': getDepartmentName(p.departmentId),
              'Status': p.isActive ? 'Active' : 'Inactive',
              'Subjects': p._count?.subjects || 0,
              'Sections': p._count?.sections || 0,
            }))}
            filename="programs-export"
          />
          <CsvImportButton
            onImport={handleImportPrograms}
            templateData={PROGRAMS_CSV_TEMPLATE}
            templateFilename="programs-template.csv"
          />
          <Button variant="outline" onClick={fetchPrograms}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={openCreateDialog} disabled={departments.length === 0}>
            <Plus className="h-4 w-4 mr-2" />
            Add Program
          </Button>
        </div>
      </div>

      {/* Enhanced Stats Cards with Count-Up Animation and Gradient Headers */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="card-hover overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
          <div className="h-12 bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-between px-4">
            <GraduationCap className="h-5 w-5 text-white/80" />
            <span className="text-xs font-medium text-white/70">TOTAL</span>
          </div>
          <CardContent className="pt-4">
            <div className="text-3xl font-bold">{totalProgramsCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Total Programs</p>
          </CardContent>
        </Card>
        <Card className="card-hover overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
          <div className="h-12 bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-between px-4">
            <Power className="h-5 w-5 text-white/80" />
            <span className="text-xs font-medium text-white/70">ACTIVE</span>
          </div>
          <CardContent className="pt-4">
            <div className="text-3xl font-bold">{activeProgramsCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Active Programs</p>
          </CardContent>
        </Card>
        <Card className="card-hover overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
          <div className="h-12 bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-between px-4">
            <TrendingUp className="h-5 w-5 text-white/80" />
            <span className="text-xs font-medium text-white/70">SUBJECTS</span>
          </div>
          <CardContent className="pt-4">
            <div className="text-3xl font-bold">{totalSubjectsCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Total Subjects</p>
          </CardContent>
        </Card>
        <Card className="card-hover overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
          <div className="h-12 bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-between px-4">
            <Building2 className="h-5 w-5 text-white/80" />
            <span className="text-xs font-medium text-white/70">DEPARTMENTS</span>
          </div>
          <CardContent className="pt-4">
            <div className="text-3xl font-bold">{departmentsCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Departments</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters + Search + Sort */}
      <div className="space-y-3">
        {/* Department filter chips */}
        {departments.length > 0 && (
          <FilterBar
            filters={departmentFilters}
            onToggle={handleDeptFilterToggle}
            onClearAll={handleClearFilters}
          />
        )}

        {/* Search + Sort row */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search programs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Sort dropdown */}
            <Select value={sortOption} onValueChange={(v) => setSortOption(v as SortOption)}>
              <SelectTrigger className="w-[160px] h-9 text-xs">
                <span className="flex items-center gap-1.5">
                  {sortOption === 'name-asc' && <ArrowDownAZ className="h-3.5 w-3.5" />}
                  {sortOption === 'name-desc' && <ArrowUpZA className="h-3.5 w-3.5" />}
                  {sortOption.startsWith('subjects') && <BookOpen className="h-3.5 w-3.5" />}
                  {sortOption.startsWith('sections') && <Users className="h-3.5 w-3.5" />}
                  <span>{currentSort?.label ?? 'Sort'}</span>
                </span>
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="h-9 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Results count */}
        <div className="text-xs text-muted-foreground">
          Showing {filteredPrograms.length} of {programs.length} programs
          {activeFilterCount > 0 && (
            <span className="text-emerald-600 dark:text-emerald-400 ml-1">
              ({activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active)
            </span>
          )}
        </div>
      </div>

      {/* Programs Display */}
      {filteredPrograms.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No programs found"
          description={programs.length === 0
            ? 'Create your first academic program to get started.'
            : 'No programs match your current search or filters. Try adjusting your criteria.'}
          action={{
            label: programs.length === 0 && departments.length > 0 ? 'Add Program' : activeFilterCount > 0 ? 'Clear Filters' : 'Add Program',
            onClick: activeFilterCount > 0
              ? handleClearFilters
              : openCreateDialog,
          }}
          secondaryAction={programs.length === 0 && departments.length > 0 ? undefined : activeFilterCount > 0 ? {
            label: 'Add Program',
            onClick: openCreateDialog,
          } : undefined}
        />
      ) : displayMode === 'cards' ? (
        /* Card View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredPrograms.map((program, index) => {
              const colors = CARD_COLOR_SETS[index % CARD_COLOR_SETS.length];
              const sectionsCount = program._count?.sections || 0;
              const subjectsCount = program._count?.subjects || 0;

              return (
                <motion.div
                  key={program.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className={cn(
                    "group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:scale-[1.02] border-l-4 border-l-transparent",
                    !program.isActive && "opacity-60",
                    selectedRows.has(program.id) && "ring-2 ring-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30"
                  )}>
                    {/* Gradient left border overlay */}
                    <div className={cn('absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b', colors.border)} />

                    <CardContent className="pt-5 pl-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleRow(program.id); }}
                            className={cn(
                              "flex-shrink-0 flex items-center justify-center h-5 w-5 rounded border transition-all duration-150 mt-1",
                              selectedRows.has(program.id)
                                ? "bg-emerald-600 border-emerald-600 text-white"
                                : "border-input bg-background hover:bg-muted"
                            )}
                            aria-label={selectedRows.has(program.id) ? 'Deselect' : 'Select'}
                          >
                            {selectedRows.has(program.id) && (
                              <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </button>
                          <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', colors.iconBg)}>
                            <GraduationCap className={cn('h-5 w-5', colors.iconText)} />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-sm truncate">{program.name}</h3>
                            <div className="flex items-center gap-2 mt-0.5">
                              {program.code && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 font-mono">{program.code}</Badge>
                              )}
                              {!program.isActive && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">Inactive</Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Hover actions */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditDialog(program)}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => openDeleteConfirm(program)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Department info */}
                      <div className="flex items-center gap-2 mt-3">
                        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium text-xs truncate max-w-[160px]", getDepartmentBadgeStyle(program.departmentId))}>
                          <Building2 className="h-3 w-3 shrink-0" />
                          <span className="truncate">{getDepartmentName(program.departmentId)}</span>
                        </span>
                      </div>

                      {/* Stats row */}
                      <div className="flex items-center gap-3 mt-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-500/10 text-xs font-medium text-teal-700 dark:text-teal-400">
                          <BookOpen className="h-3.5 w-3.5" />
                          <span>{subjectsCount} Subjects</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-violet-50 dark:bg-violet-500/10 text-xs font-medium text-violet-700 dark:text-violet-400">
                          <Users className="h-3.5 w-3.5" />
                          <span>{sectionsCount} Sections</span>
                        </span>
                      </div>

                      {/* Toggle active button */}
                      <div className="flex items-center gap-1 mt-3 pt-2 border-t">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs flex-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                          onClick={() => toggleActive(program)}
                        >
                          {program.isActive ? (
                            <>
                              <X className="h-3 w-3 mr-1" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Activate
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        /* Table View */
        <Card className="transition-all duration-200 hover:shadow-md">
          <CardContent className="pt-6">
            <DataTable
              columns={columns}
              data={filteredPrograms}
              searchKey="name"
              searchPlaceholder="Search programs..."
              isRowSelected={(program) => selectedRows.has(program.id)}
            />
          </CardContent>
        </Card>
      )}

      {/* Batch Action Bar */}
      <BatchActionBar
        selectedIds={Array.from(selectedRows)}
        totalCount={filteredPrograms.length}
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl dialog-header-accent">
          <div className="h-1 w-full bg-gradient-to-r from-emerald-500 to-teal-500 -mt-6 -mx-6 mb-4 rounded-t-lg" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                <GraduationCap className="h-4 w-4 text-emerald-600" />
              </div>
              {selectedProgram ? 'Edit Program' : 'Add New Program'}
            </DialogTitle>
            <DialogDescription>
              {selectedProgram
                ? 'Update program information below.'
                : 'Fill in the details to create a new program.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
            <div className="space-y-2">
              <Label htmlFor="name">Program Name <span className="text-destructive">*</span></Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Bachelor of Science in Computer Science"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Program Code</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                placeholder="e.g., BSCS"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department <span className="text-destructive">*</span></Label>
              <Select
                value={formData.departmentId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, departmentId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(dept => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the program"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="w-full sm:w-auto" disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {selectedProgram ? 'Update Program' : 'Create Program'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10">
                <Trash2 className="h-4 w-4 text-destructive" />
              </div>
              Delete Program
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{selectedProgram?.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedProgram(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
            >
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Batch Delete Confirmation Dialog */}
      <AlertDialog open={batchDeleteDialogOpen} onOpenChange={setBatchDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10">
                <Trash2 className="h-4 w-4 text-destructive" />
              </div>
              Delete Selected Programs
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedRows.size} selected program{selectedRows.size !== 1 ? 's' : ''}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBatchDeleteDialogOpen(false)} disabled={isDeleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => batchDeleteSelected(Array.from(selectedRows))}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
