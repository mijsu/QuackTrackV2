'use client';

import { useState, useEffect, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from './DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { toast } from 'sonner';
import { Plus, MoreHorizontal, Pencil, Trash2, Building2, Users, BookOpen, GraduationCap, Filter, X, ChevronDown, ChevronUp, Layers, Landmark, Eye, Download, BookMarked, LayoutGrid, List, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Department } from '@/types';
import { EmptyState } from '@/components/ui/EmptyState';
import { CsvImportButton } from '@/components/ui/CsvImportButton';
import { ExportButton } from '@/components/ui/ExportButton';
import { BatchActionBar, SelectAllCheckbox } from '@/components/ui/BatchActionBar';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store';

const DEPARTMENTS_CSV_TEMPLATE = [
  { DepartmentName: 'Information Technology', DepartmentCode: 'IT', College: 'College of Computer Studies' },
  { DepartmentName: 'Computer Science', DepartmentCode: 'CS', College: 'College of Computer Studies' },
];

export function DepartmentsView() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter state
  const [filters, setFilters] = useState({
    college: 'all',
  });
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [displayMode, setDisplayMode] = useState<'cards' | 'table'>('cards');
  const [totalSubjects, setTotalSubjects] = useState(0);

  useEffect(() => {
    fetchDepartments();
    fetchSubjectsCount();
  }, []);

  const fetchSubjectsCount = async () => {
    try {
      const res = await fetch('/api/subjects');
      const data = await res.json();
      setTotalSubjects(Array.isArray(data) ? data.length : 0);
    } catch {
      // Silently fail
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/departments');
      const data = await res.json();
      setDepartments(data);
    } catch (error) {
      console.error('Error fetching departments:', error);
      toast.error('Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedDept(null);
    setFormData({
      name: '',
      code: '',
      college: '',
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleEdit = (dept: Department) => {
    setSelectedDept(dept);
    setFormData({
      name: dept.name,
      code: dept.code || '',
      college: dept.college,
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleDelete = (dept: Department) => {
    setSelectedDept(dept);
    setDeleteDialogOpen(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.name || (formData.name as string).trim() === '') {
      errors.name = 'Department name is required';
    }

    if (!formData.college || (formData.college as string).trim() === '') {
      errors.college = 'College is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const url = selectedDept ? `/api/departments/${selectedDept.id}` : '/api/departments';
      const method = selectedDept ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success(selectedDept ? 'Department updated' : 'Department created');
        setDialogOpen(false);
        fetchDepartments();
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
    if (!selectedDept) return;

    try {
      const res = await fetch(`/api/departments/${selectedDept.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Department deleted');
        setDeleteDialogOpen(false);
        fetchDepartments();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Delete failed');
      }
    } catch {
      toast.error('Delete failed');
    }
  };

  const handleImportDepartments = async (data: Record<string, string>[]) => {
    let successCount = 0;
    let errorCount = 0;

    for (const row of data) {
      try {
        const name = row['DepartmentName'] || row['departmentName'] || row['Name'] || row['name'] || '';
        const code = row['DepartmentCode'] || row['departmentCode'] || row['Code'] || row['code'] || '';
        const college = row['College'] || row['college'] || 'General';

        if (!name || !college) {
          errorCount++;
          continue;
        }

        const res = await fetch('/api/departments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            code,
            college,
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
      toast.success(`Successfully imported ${successCount} department${successCount !== 1 ? 's' : ''}`);
    }
    if (errorCount > 0) {
      toast.error(`Failed to import ${errorCount} record${errorCount !== 1 ? 's' : ''}. Check that department names are unique.`);
    }

    fetchDepartments();
  };

  // Get unique colleges from departments
  const uniqueColleges = useMemo(() => {
    const colleges = departments.map(d => d.college).filter(Boolean);
    return [...new Set(colleges)];
  }, [departments]);

  // Filter departments based on selected filters
  const filteredDepartments = useMemo(() => {
    return departments.filter(dept => {
      if (filters.college !== 'all' && dept.college !== filters.college) return false;
      return true;
    });
  }, [departments, filters]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    return Object.values(filters).filter(v => v !== 'all').length;
  }, [filters]);

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      college: 'all',
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
    setSelectedRows(new Set(filteredDepartments.map(d => d.id)));
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
        const res = await fetch(`/api/departments/${id}`, { method: 'DELETE' });
        if (res.ok) successCount++;
        else errorCount++;
      } catch {
        errorCount++;
      }
    }
    if (successCount > 0) toast.success(`Deleted ${successCount} department${successCount !== 1 ? 's' : ''}`);
    if (errorCount > 0) toast.error(`Failed to delete ${errorCount} department${errorCount !== 1 ? 's' : ''}`);
    setIsDeleting(false);
    clearSelection();
    setBatchDeleteDialogOpen(false);
    fetchDepartments();
  };

  const exportSelected = (ids: string[]) => {
    const selected = filteredDepartments.filter(d => ids.includes(d.id));
    if (selected.length === 0) return;
    const data = selected.map(d => ({
      'Department Name': d.name,
      'Code': d.code || '',
      'College': d.college || '',
      'Faculty Count': d._count?.users || 0,
      'Programs': d._count?.programs || 0,
      'Sections': d._count?.sections || 0,
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
    a.download = 'selected-departments.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${selected.length} departments`);
  };

  const setViewMode = useAppStore((state) => state.setViewMode);
  const setSelectedDepartment = useAppStore((state) => state.setSelectedDepartment);

  const handleViewFaculty = (dept: Department) => {
    setSelectedDepartment(dept.id);
    setViewMode('faculty');
  };

  const columns: ColumnDef<Department>[] = [
    {
      id: 'select',
      size: 40,
      header: () => (
        <SelectAllCheckbox
          selectedCount={selectedRows.size}
          totalCount={filteredDepartments.length}
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
      header: 'Department',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium">{row.original.name}</p>
            {row.original.code && (
              <p className="text-xs text-muted-foreground">{row.original.code}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'college',
      header: 'College',
    },
    {
      accessorKey: '_count',
      header: 'Stats',
      cell: ({ row }) => {
        const count = row.original._count;
        const facultyCount = count?.users || 0;
        return (
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {facultyCount > 0 ? (
              <button
                onClick={(e) => { e.stopPropagation(); handleViewFaculty(row.original); }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors cursor-pointer font-medium"
                title={`View ${facultyCount} faculty member${facultyCount !== 1 ? 's' : ''}`}
              >
                <Users className="h-3.5 w-3.5" />
                <span>{facultyCount}</span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                <span>0</span>
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-50 dark:bg-teal-500/10 text-muted-foreground">
              <Layers className="h-3.5 w-3.5" />
              <span>{count?.programs || 0}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-50 dark:bg-violet-500/10 text-muted-foreground">
              <GraduationCap className="h-3.5 w-3.5" />
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
        const dept = row.original;
        const hasFaculty = (dept._count?.users || 0) > 0;
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
              {hasFaculty && (
                <DropdownMenuItem onClick={() => handleViewFaculty(dept)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Faculty
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => handleEdit(dept)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(dept)}>
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
        <Building2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-600">Departments</h1>
          <div className="h-1 w-20 mt-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" />
          <p className="text-muted-foreground mt-1">Manage academic departments</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton
            data={filteredDepartments.map(d => ({
              'Department Name': d.name,
              'Code': d.code || '',
              'College': d.college || '',
              'Faculty Count': d._count?.users || 0,
              'Programs': d._count?.programs || 0,
              'Sections': d._count?.sections || 0,
            }))}
            filename="departments-export"
          />
          <CsvImportButton
            onImport={handleImportDepartments}
            templateData={DEPARTMENTS_CSV_TEMPLATE}
            templateFilename="departments-template.csv"
          />
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Department
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-hover gradient-border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
          <div className="h-1 rounded-t-lg bg-gradient-to-r from-emerald-500 to-emerald-400" />
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Departments</p>
                <div className="text-2xl font-bold mt-1">{departments.length}</div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover gradient-border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
          <div className="h-1 rounded-t-lg bg-gradient-to-r from-blue-500 to-blue-400" />
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Faculty</p>
                <div className="text-2xl font-bold mt-1">{departments.reduce((sum, d) => sum + (d._count?.users || 0), 0)}</div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover gradient-border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
          <div className="h-1 rounded-t-lg bg-gradient-to-r from-teal-500 to-teal-400" />
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Subjects</p>
                <div className="text-2xl font-bold mt-1">{totalSubjects}</div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center">
                <BookMarked className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover gradient-border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
          <div className="h-1 rounded-t-lg bg-gradient-to-r from-violet-500 to-violet-400" />
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Colleges</p>
                <div className="text-2xl font-bold mt-1">{uniqueColleges.length}</div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center">
                <Landmark className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-0 sm:p-0">
        <div className="px-3 py-2 sm:px-4 sm:py-2.5 cursor-pointer select-none flex items-center justify-between" onClick={() => setFiltersExpanded(!filtersExpanded)}>
          <div className="text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2">
            <Filter className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Filters</span>
            <span className="sm:hidden">Filter</span>
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
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4">
                  <div className="space-y-1 min-w-0">
                    <label className="text-[10px] sm:text-xs font-medium text-muted-foreground">College</label>
                    <Select
                      value={filters.college}
                      onValueChange={(value) => setFilters({ ...filters, college: value })}
                    >
                      <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm w-full">
                        <span className="truncate">
                          <SelectValue placeholder="All" />
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Colleges</SelectItem>
                        {uniqueColleges.map((college) => (
                          <SelectItem key={college} value={college}>
                            {college}
                          </SelectItem>
                        ))}
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

      {/* Results count & View Toggle */}
      <div className="flex items-center justify-between">
        <div className="text-xs sm:text-sm text-muted-foreground">
          Showing {filteredDepartments.length} of {departments.length} departments
        </div>
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
      </div>

      {/* Empty State */}
      {filteredDepartments.length === 0 && (
        <EmptyState
          icon={Building2}
          title="No departments found"
          description={activeFilterCount > 0
            ? 'No departments match the current filters. Try adjusting your filter criteria.'
            : 'Get started by adding your first academic department.'}
          action={{
            label: activeFilterCount > 0 ? 'Clear Filters' : 'Add Department',
            onClick: activeFilterCount > 0 ? clearFilters : handleCreate,
          }}
          secondaryAction={activeFilterCount > 0 ? {
            label: 'Add Department',
            onClick: handleCreate,
          } : undefined}
        />
      )}

      {filteredDepartments.length > 0 && displayMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDepartments.map((dept, index) => {
            const facultyCount = dept._count?.users || 0;
            const programsCount = dept._count?.programs || 0;
            const sectionsCount = dept._count?.sections || 0;
            const hasFaculty = facultyCount > 0;
            // Assign colors based on index for variety
            const colorSets = [
              { border: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', iconBg: 'bg-emerald-100 dark:bg-emerald-500/20' },
              { border: 'from-blue-500 to-indigo-500', bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', iconBg: 'bg-blue-100 dark:bg-blue-500/20' },
              { border: 'from-violet-500 to-purple-500', bg: 'bg-violet-50 dark:bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400', iconBg: 'bg-violet-100 dark:bg-violet-500/20' },
              { border: 'from-teal-500 to-cyan-500', bg: 'bg-teal-50 dark:bg-teal-500/10', text: 'text-teal-600 dark:text-teal-400', iconBg: 'bg-teal-100 dark:bg-teal-500/20' },
              { border: 'from-amber-500 to-orange-500', bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', iconBg: 'bg-amber-100 dark:bg-amber-500/20' },
              { border: 'from-rose-500 to-pink-500', bg: 'bg-rose-50 dark:bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400', iconBg: 'bg-rose-100 dark:bg-rose-500/20' },
            ];
            const colors = colorSets[index % colorSets.length];

            return (
              <motion.div
                key={dept.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:scale-[1.02] border-l-4 border-l-transparent">
                  {/* Gradient left border overlay */}
                  <div className={cn('absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b', colors.border)} />

                  <CardContent className="pt-5 pl-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', colors.iconBg)}>
                          <Building2 className={cn('h-5 w-5', colors.text)} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-sm truncate">{dept.name}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            {dept.code && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 font-mono">{dept.code}</Badge>
                            )}
                            <span className="text-xs text-muted-foreground truncate">{dept.college}</span>
                          </div>
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {hasFaculty && (
                            <DropdownMenuItem onClick={() => handleViewFaculty(dept)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Faculty
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleEdit(dept)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(dept)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center gap-3 mt-4">
                      <button
                        onClick={() => hasFaculty && handleViewFaculty(dept)}
                        className={cn(
                          'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
                          hasFaculty
                            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 cursor-pointer'
                            : 'bg-muted/50 text-muted-foreground cursor-default'
                        )}
                      >
                        <Users className="h-3.5 w-3.5" />
                        <span>{facultyCount} Faculty</span>
                      </button>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-xs font-medium text-blue-700 dark:text-blue-400">
                        <Layers className="h-3.5 w-3.5" />
                        <span>{programsCount} Programs</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-violet-50 dark:bg-violet-500/10 text-xs font-medium text-violet-700 dark:text-violet-400">
                        <GraduationCap className="h-3.5 w-3.5" />
                        <span>{sectionsCount} Sections</span>
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {filteredDepartments.length > 0 && displayMode === 'table' && (
      <Card className="transition-all duration-200 hover:shadow-md">
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={filteredDepartments}
            searchKey="name"
            searchPlaceholder="Search departments..."
            isRowSelected={(dept) => selectedRows.has(dept.id)}
          />
        </CardContent>
      </Card>
      )}

      {/* Batch Action Bar */}
      <BatchActionBar
        selectedIds={Array.from(selectedRows)}
        totalCount={filteredDepartments.length}
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
        <DialogContent className="sm:max-w-lg dialog-header-accent">
          <div className="h-1 w-full bg-gradient-to-r from-emerald-500 to-teal-500 -mt-6 -mx-6 mb-4 rounded-t-lg" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                <Building2 className="h-4 w-4 text-emerald-600" />
              </div>
              {selectedDept ? 'Edit Department' : 'Add New Department'}
            </DialogTitle>
            <DialogDescription>
              {selectedDept ? 'Update department information below.' : 'Fill in the details to create a new department.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
            <div className="space-y-2">
              <Label htmlFor="deptName">Name <span className="text-destructive">*</span></Label>
              <Input
                id="deptName"
                value={formData.name as string || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={formErrors.name ? 'border-destructive' : ''}
              />
              {formErrors.name && <p className="text-xs text-destructive">{formErrors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="deptCode">Code</Label>
              <Input
                id="deptCode"
                value={formData.code as string || ''}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deptCollege">College <span className="text-destructive">*</span></Label>
              <Input
                id="deptCollege"
                value={formData.college as string || ''}
                onChange={(e) => setFormData({ ...formData, college: e.target.value })}
                className={formErrors.college ? 'border-destructive' : ''}
              />
              {formErrors.college && <p className="text-xs text-destructive">{formErrors.college}</p>}
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="w-full sm:w-auto" disabled={saving}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving} className="w-full sm:w-auto">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {selectedDept ? 'Update Department' : 'Create Department'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10">
                <Trash2 className="h-4 w-4 text-destructive" />
              </div>
              Delete Department
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{selectedDept?.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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
              Delete Selected Departments
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedRows.size} selected department{selectedRows.size !== 1 ? 's' : ''}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => batchDeleteSelected(Array.from(selectedRows))} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isDeleting ? 'Deleting...' : 'Delete All'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
