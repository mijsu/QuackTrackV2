'use client';

import { useState, useEffect, useMemo, useRef, React } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from './DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Plus, MoreHorizontal, Pencil, Trash2, GraduationCap, Users, Filter, X, ChevronDown, ChevronUp, Layers, Building2, UserPlus, Download, BookOpen, FlaskConical, Presentation, Crown, LayoutGrid, List, Calendar, Loader2 } from 'lucide-react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import type { Section, Department, Program } from '@/types';
import { EmptyState } from '@/components/ui/EmptyState';
import { CsvImportButton } from '@/components/ui/CsvImportButton';
import { ExportButton } from '@/components/ui/ExportButton';
import { BatchActionBar, SelectAllCheckbox } from '@/components/ui/BatchActionBar';
import { useCountUp } from '@/hooks/use-count-up';
import { cn } from '@/lib/utils';

const SECTIONS_CSV_TEMPLATE = [
  { SectionName: 'CS-1A', YearLevel: '1', ProgramName: 'Bachelor of Science in Computer Science' },
  { SectionName: 'IT-2B', YearLevel: '2', ProgramName: 'Bachelor of Science in Information Technology' },
];

// Section card color sets for gradient left borders and icon styling
const CARD_COLOR_SETS = [
  { border: 'from-emerald-500 to-emerald-400', iconBg: 'bg-emerald-100 dark:bg-emerald-500/20', iconText: 'text-emerald-600 dark:text-emerald-400' },
  { border: 'from-teal-500 to-teal-400', iconBg: 'bg-teal-100 dark:bg-teal-500/20', iconText: 'text-teal-600 dark:text-teal-400' },
  { border: 'from-amber-500 to-amber-400', iconBg: 'bg-amber-100 dark:bg-amber-500/20', iconText: 'text-amber-600 dark:text-amber-400' },
  { border: 'from-violet-500 to-violet-400', iconBg: 'bg-violet-100 dark:bg-violet-500/20', iconText: 'text-violet-600 dark:text-violet-400' },
  { border: 'from-rose-500 to-rose-400', iconBg: 'bg-rose-100 dark:bg-rose-500/20', iconText: 'text-rose-600 dark:text-rose-400' },
  { border: 'from-cyan-500 to-cyan-400', iconBg: 'bg-cyan-100 dark:bg-cyan-500/20', iconText: 'text-cyan-600 dark:text-cyan-400' },
];

// Year level color mapping for badges
const YEAR_COLORS: Record<number, string> = {
  1: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25',
  2: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/25',
  3: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/25',
  4: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/25',
  5: 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/25',
};

// Stat card configuration for animated stats
interface StatCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  gradientFrom: string;
  gradientTo: string;
  iconBg: string;
  iconText: string;
  delay?: number;
  formatFn?: (n: number) => string;
}

function StatCardItem({ label, value, icon: Icon, gradientFrom, gradientTo, iconBg, iconText, delay = 0, formatFn }: StatCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const animatedValue = useCountUp(value, 800, isInView);
  const displayValue = formatFn ? formatFn(animatedValue) : String(animatedValue);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.4, ease: 'easeOut', delay }}
    >
      <Card className="card-hover gradient-border stat-card-shine transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
        <div className={cn('h-1 rounded-t-lg bg-gradient-to-r', gradientFrom, gradientTo)} />
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
              <div className="text-2xl font-bold mt-1 tabular-nums">{displayValue}</div>
            </div>
            <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center', iconBg)}>
              <Icon className={cn('h-5 w-5', iconText)} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function getSectionTypeBadge(section: Section) {
  const name = section.sectionName?.toLowerCase() || '';
  let type = 'lecture';
  let badgeClass = 'section-badge-lecture';
  let Icon = BookOpen;

  if (name.includes('lab') || name.includes('laboratory')) {
    type = 'lab';
    badgeClass = 'section-badge-lab';
    Icon = FlaskConical;
  } else if (name.includes('seminar') || name.includes('sem')) {
    type = 'seminar';
    badgeClass = 'section-badge-seminar';
    Icon = Presentation;
  }

  return (
    <Badge variant="outline" className={cn('text-[10px] sm:text-xs px-1.5 sm:px-2 py-0', badgeClass)}>
      <Icon className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
      {type.charAt(0).toUpperCase() + type.slice(1)}
    </Badge>
  );
}

export function SectionsView() {
  const [sections, setSections] = useState<Section[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Display mode: cards vs table
  const [displayMode, setDisplayMode] = useState<'cards' | 'table'>('cards');

  // Filter state
  const [filters, setFilters] = useState({
    departmentId: 'all',
    programId: 'all',
    yearLevel: 'all',
    classType: 'all',
  });
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  
  // Form state for cascading dropdown
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('');

  // Computed stats
  const totalStudents = useMemo(() => sections.reduce((sum, s) => sum + (s.studentCount || 0), 0), [sections]);
  const uniquePrograms = useMemo(() => new Set(sections.map(s => s.programId).filter(Boolean)).size, [sections]);
  const avgClassSize = useMemo(() => sections.length > 0 ? Math.round(totalStudents / sections.length) : 0, [sections, totalStudents]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [sectionsRes, deptsRes, programsRes] = await Promise.all([
        fetch('/api/sections'),
        fetch('/api/departments'),
        fetch('/api/programs?includeInactive=false'),
      ]);

      const sectionsData = await sectionsRes.json();
      const deptsData = await deptsRes.json();
      const programsData = await programsRes.json();

      setSections(Array.isArray(sectionsData) ? sectionsData : []);
      setDepartments(Array.isArray(deptsData) ? deptsData : []);
      setPrograms(Array.isArray(programsData) ? programsData : []);
    } catch (error) {
      console.error('Error fetching sections:', error);
      toast.error('Failed to load sections');
    } finally {
      setLoading(false);
    }
  };

  // Filter programs by selected department (for cascading dropdown)
  const filteredPrograms = useMemo(() => {
    if (!selectedDepartmentId) return [];
    return programs.filter(p => p.departmentId === selectedDepartmentId);
  }, [programs, selectedDepartmentId]);

  // Filter programs for filter dropdown
  const filterProgramOptions = useMemo(() => {
    if (filters.departmentId === 'all') return programs;
    return programs.filter(p => p.departmentId === filters.departmentId);
  }, [programs, filters.departmentId]);

  const handleCreate = () => {
    setSelectedSection(null);
    setSelectedDepartmentId('');
    setFormData({
      sectionName: '',
      sectionCode: '',
      yearLevel: 1,
      departmentId: '',
      programId: '',
      studentCount: 40,
      classType: 'regular',
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleEdit = (section: Section) => {
    setSelectedSection(section);
    // Find the program to get its department
    const sectionProgram = section.programId ? programs.find(p => p.id === section.programId) : null;
    const deptId = sectionProgram?.departmentId || section.departmentId || '';
    setSelectedDepartmentId(deptId);
    
    setFormData({
      sectionName: section.sectionName,
      sectionCode: section.sectionCode || '',
      yearLevel: section.yearLevel,
      departmentId: section.departmentId,
      programId: section.programId || '',
      studentCount: section.studentCount,
      classType: (section as Record<string, unknown>).classType as string || 'regular',
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleDelete = (section: Section) => {
    setSelectedSection(section);
    setDeleteDialogOpen(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.sectionName || (formData.sectionName as string).trim() === '') {
      errors.sectionName = 'Section name is required';
    }

    if (!formData.yearLevel || (formData.yearLevel as number) < 1 || (formData.yearLevel as number) > 5) {
      errors.yearLevel = 'Year level must be between 1 and 5';
    }

    if (!formData.departmentId) {
      errors.departmentId = 'Department is required';
    }

    if (!formData.studentCount || (formData.studentCount as number) < 1) {
      errors.studentCount = 'Student count must be at least 1';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const url = selectedSection ? `/api/sections/${selectedSection.id}` : '/api/sections';
      const method = selectedSection ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success(selectedSection ? 'Section updated' : 'Section created');
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
    if (!selectedSection) return;

    try {
      const res = await fetch(`/api/sections/${selectedSection.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Section deleted');
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

  const handleImportSections = async (data: Record<string, string>[]) => {
    let successCount = 0;
    let errorCount = 0;

    for (const row of data) {
      try {
        const sectionName = row['SectionName'] || row['sectionName'] || '';
        const yearLevel = parseInt(row['YearLevel'] || row['yearLevel'] || '1', 10) || 1;
        const programName = row['ProgramName'] || row['programName'] || '';

        if (!sectionName) {
          errorCount++;
          continue;
        }

        // Find matching program to get departmentId
        let departmentId = '';
        let programId = '';
        if (programName) {
          const prog = programs.find(
            (p) => p.name.toLowerCase() === programName.toLowerCase()
          );
          if (prog) {
            departmentId = prog.departmentId;
            programId = prog.id;
          }
        }

        if (!departmentId) {
          errorCount++;
          continue;
        }

        const res = await fetch('/api/sections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sectionName,
            sectionCode: '',
            yearLevel,
            departmentId,
            programId,
            studentCount: 40,
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
      toast.success(`Successfully imported ${successCount} section${successCount !== 1 ? 's' : ''}`);
    }
    if (errorCount > 0) {
      toast.error(`Failed to import ${errorCount} record${errorCount !== 1 ? 's' : ''}. Check that section names are unique and programs exist.`);
    }

    fetchData();
  };

  // Handle department selection change in form
  const handleDepartmentChange = (deptId: string) => {
    setSelectedDepartmentId(deptId);
    setFormData(prev => ({ ...prev, departmentId: deptId, programId: '' }));
  };

  // Filter sections based on selected filters
  const filteredSections = useMemo(() => {
    return sections.filter(section => {
      if (filters.departmentId !== 'all' && section.departmentId !== filters.departmentId) return false;
      if (filters.programId !== 'all' && section.programId !== filters.programId) return false;
      if (filters.yearLevel !== 'all' && section.yearLevel !== parseInt(filters.yearLevel)) return false;
      if (filters.classType !== 'all' && (section as Record<string, unknown>).classType !== filters.classType) return false;
      return true;
    });
  }, [sections, filters]);

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
    setSelectedRows(new Set(filteredSections.map(s => s.id)));
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
        const res = await fetch(`/api/sections/${id}`, { method: 'DELETE' });
        if (res.ok) successCount++;
        else errorCount++;
      } catch {
        errorCount++;
      }
    }
    if (successCount > 0) toast.success(`Deleted ${successCount} section${successCount !== 1 ? 's' : ''}`);
    if (errorCount > 0) toast.error(`Failed to delete ${errorCount} section${errorCount !== 1 ? 's' : ''}`);
    setIsDeleting(false);
    clearSelection();
    setBatchDeleteDialogOpen(false);
    fetchData();
  };

  const exportSelected = (ids: string[]) => {
    const selected = filteredSections.filter(s => ids.includes(s.id));
    if (selected.length === 0) return;
    const data = selected.map(s => ({
      'Section Name': s.sectionName,
      'Year Level': s.yearLevel,
      'Program': getProgramName(s.programId) || '',
      'Department': getDepartmentName(s.departmentId),
      'Students': s.studentCount,
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
    a.download = 'selected-sections.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${selected.length} sections`);
  };

  // Get program name helper
  const getProgramName = (programId: string | null) => {
    if (!programId) return null;
    const program = programs.find(p => p.id === programId);
    return program?.name || null;
  };

  // Get department name helper
  const getDepartmentName = (departmentId: string) => {
    const dept = departments.find(d => d.id === departmentId);
    return dept?.name || 'Unknown';
  };

  const columns: ColumnDef<Section>[] = [
    {
      id: 'select',
      size: 40,
      header: () => (
        <SelectAllCheckbox
          selectedCount={selectedRows.size}
          totalCount={filteredSections.length}
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
      accessorKey: 'sectionName',
      header: 'Section Name',
      cell: ({ row }) => (
        <div className="hover:-translate-y-0.5 transition-all duration-200">
          <p className="font-medium">{row.original.sectionName}</p>
          {row.original.sectionCode && (
            <p className="text-xs text-muted-foreground font-mono">{row.original.sectionCode}</p>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'yearLevel',
      header: 'Year Level',
      cell: ({ row }) => {
        const year = row.original.yearLevel;
        const colorClass = YEAR_COLORS[year] || 'bg-muted text-muted-foreground';
        return (
          <Badge variant="outline" className={colorClass}>
            Year {year}
          </Badge>
        );
      },
    },
    {
      id: 'program',
      header: 'Program',
      cell: ({ row }) => {
        const programName = getProgramName(row.original.programId);
        const deptName = getDepartmentName(row.original.departmentId);
        const programIndex = programs.findIndex(p => p.id === row.original.programId);
        const dotColors = ['bg-emerald-500', 'bg-blue-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500', 'bg-teal-500', 'bg-sky-500'];
        const dotColor = programIndex >= 0 ? dotColors[programIndex % dotColors.length] : 'bg-muted-foreground';
        return (
          <div className="flex flex-col gap-0.5">
            {programName ? (
              <Badge variant="outline" className="w-fit">
                <span className={`h-2 w-2 rounded-full ${dotColor} mr-1.5 shrink-0`} />
                <Layers className="h-3 w-3 mr-1" />
                {programName}
              </Badge>
            ) : (
              <span className="text-xs text-muted-foreground italic">No program</span>
            )}
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {deptName}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: 'studentCount',
      header: 'Students',
      cell: ({ row }) => {
        const count = row.original.studentCount;
        let badgeColor = 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25';
        let sizeLabel = 'Small';
        if (count > 45) {
          badgeColor = 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/25';
          sizeLabel = 'Large';
        } else if (count >= 30) {
          badgeColor = 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/25';
          sizeLabel = 'Medium';
        }
        return (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn(badgeColor, 'transition-all duration-200')}>
              <Users className="h-3 w-3 mr-1" />
              {count}
            </Badge>
            <span className="text-[10px] sm:text-xs text-muted-foreground hidden sm:inline">{sizeLabel}</span>
          </div>
        );
      },
    },
    {
      id: 'sectionType',
      header: 'Type',
      cell: ({ row }) => {
        const classType = (row.original as Record<string, unknown>).classType as string || 'regular';
        if (classType === 'executive') {
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
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const section = row.original;
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
              <DropdownMenuItem onClick={() => handleEdit(section)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(section)}>
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
        <GraduationCap className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-600">Sections</h1>
          <div className="h-1 w-20 mt-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" />
          <p className="text-muted-foreground">Manage student sections organized by program</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Display Mode Toggle */}
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
            data={filteredSections.map(s => ({
              'Section Name': s.sectionName,
              'Year Level': s.yearLevel,
              'Program': getProgramName(s.programId) || '',
              'Department': getDepartmentName(s.departmentId),
              'Students': s.studentCount,
            }))}
            filename="sections-export"
          />
          <CsvImportButton
            onImport={handleImportSections}
            templateData={SECTIONS_CSV_TEMPLATE}
            templateFilename="sections-template.csv"
          />
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Section
          </Button>
        </div>
      </div>

      {/* Enhanced Stats Cards with useCountUp */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCardItem
          label="Total Sections"
          value={sections.length}
          icon={GraduationCap}
          gradientFrom="from-emerald-500"
          gradientTo="to-emerald-400"
          iconBg="bg-emerald-50 dark:bg-emerald-500/10"
          iconText="text-emerald-600 dark:text-emerald-400"
          delay={0}
        />
        <StatCardItem
          label="Programs"
          value={uniquePrograms}
          icon={Layers}
          gradientFrom="from-teal-500"
          gradientTo="to-teal-400"
          iconBg="bg-teal-50 dark:bg-teal-500/10"
          iconText="text-teal-600 dark:text-teal-400"
          delay={0.08}
        />
        <StatCardItem
          label="Total Students"
          value={totalStudents}
          icon={Users}
          gradientFrom="from-amber-500"
          gradientTo="to-amber-400"
          iconBg="bg-amber-50 dark:bg-amber-500/10"
          iconText="text-amber-600 dark:text-amber-400"
          delay={0.16}
          formatFn={(n) => n.toLocaleString()}
        />
        <StatCardItem
          label="Avg Class Size"
          value={avgClassSize}
          icon={UserPlus}
          gradientFrom="from-rose-500"
          gradientTo="to-rose-400"
          iconBg="bg-rose-50 dark:bg-rose-500/10"
          iconText="text-rose-600 dark:text-rose-400"
          delay={0.24}
        />
      </div>

      {/* Filters */}
      <Card className="p-0 sm:p-0 filter-section-glass">
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
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-4">
                  <div className="space-y-1 min-w-0">
                    <label className="text-[10px] sm:text-xs font-medium text-muted-foreground">Department</label>
                    <Select
                      value={filters.departmentId}
                      onValueChange={(value) => setFilters({ ...filters, departmentId: value, programId: 'all' })}
                    >
                      <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm w-full">
                        <span className="truncate">
                          <SelectValue placeholder="All" />
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
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
                          <SelectItem key={prog.id} value={prog.id}>{prog.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 min-w-0">
                    <label className="text-[10px] sm:text-xs font-medium text-muted-foreground">Year Level</label>
                    <Select
                      value={filters.yearLevel}
                      onValueChange={(value) => setFilters({ ...filters, yearLevel: value })}
                    >
                      <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm w-full">
                        <span className="truncate">
                          <SelectValue placeholder="All" />
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Years</SelectItem>
                        <SelectItem value="1">Year 1</SelectItem>
                        <SelectItem value="2">Year 2</SelectItem>
                        <SelectItem value="3">Year 3</SelectItem>
                        <SelectItem value="4">Year 4</SelectItem>
                        <SelectItem value="5">Year 5</SelectItem>
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

      {/* Results count + display mode toggle on the row */}
      <div className="flex items-center justify-between">
        <div className="text-xs sm:text-sm text-muted-foreground">
          Showing {filteredSections.length} of {sections.length} sections
        </div>
      </div>

      {/* Empty State */}
      {filteredSections.length === 0 && (
        <EmptyState
          icon={GraduationCap}
          title="No sections found"
          description={activeFilterCount > 0
            ? 'No sections match the current filters. Try adjusting your filter criteria.'
            : 'Get started by adding your first student section.'}
          action={{
            label: activeFilterCount > 0 ? 'Clear Filters' : 'Add Section',
            onClick: activeFilterCount > 0 ? clearFilters : handleCreate,
          }}
          secondaryAction={activeFilterCount > 0 ? {
            label: 'Add Section',
            onClick: handleCreate,
          } : undefined}
        />
      )}

      {/* Card View */}
      {filteredSections.length > 0 && displayMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSections.map((section, index) => {
            const colors = CARD_COLOR_SETS[index % CARD_COLOR_SETS.length];
            const programName = getProgramName(section.programId);
            const deptName = getDepartmentName(section.departmentId);
            const yearColor = YEAR_COLORS[section.yearLevel] || 'bg-muted text-muted-foreground';
            const classType = (section as Record<string, unknown>).classType as string || 'regular';

            // Student count color logic
            let studentBadgeColor = 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400';
            if (section.studentCount > 45) {
              studentBadgeColor = 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400';
            } else if (section.studentCount >= 30) {
              studentBadgeColor = 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400';
            }

            return (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:scale-[1.02] border-l-4 border-l-transparent">
                  {/* Gradient left border overlay */}
                  <div className={cn('absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b', colors.border)} />

                  <CardContent className="pt-5 pl-5">
                    {/* Top row: Icon + Name + Year badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', colors.iconBg)}>
                          <Users className={cn('h-5 w-5', colors.iconText)} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-sm truncate">{section.sectionName}</h3>
                          {section.sectionCode && (
                            <p className="text-xs text-muted-foreground font-mono truncate">{section.sectionCode}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 h-5', yearColor)}>
                              Year {section.yearLevel}
                            </Badge>
                            {classType === 'executive' && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/25">
                                <Crown className="h-2.5 w-2.5 mr-0.5" />
                                Exec
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Hover actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => handleEdit(section)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(section)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Program & Department info */}
                    <div className="mt-3 space-y-1">
                      {programName ? (
                        <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                          <Layers className="h-3 w-3 shrink-0" />
                          <span className="truncate">{programName}</span>
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground italic flex items-center gap-1">
                          <Layers className="h-3 w-3 shrink-0" />
                          No program assigned
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                        <Building2 className="h-3 w-3 shrink-0" />
                        <span className="truncate">{deptName}</span>
                      </p>
                    </div>

                    {/* Stats row: Student count + Schedule count */}
                    <div className="flex items-center gap-2 mt-3">
                      <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium', studentBadgeColor)}>
                        <Users className="h-3.5 w-3.5" />
                        <span>{section.studentCount} Students</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>1st Semester</span>
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Table View */}
      {filteredSections.length > 0 && displayMode === 'table' && (
      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={filteredSections}
            searchKey="sectionName"
            searchPlaceholder="Search sections by name, code, or program..."
            isRowSelected={(section) => selectedRows.has(section.id)}
          />
        </CardContent>
      </Card>
      )}

      {/* Batch Action Bar */}
      <BatchActionBar
        selectedIds={Array.from(selectedRows)}
        totalCount={filteredSections.length}
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
        <DialogContent className="sm:max-w-xl dialog-header-accent">
          <div className="h-1 w-full bg-gradient-to-r from-emerald-500 to-teal-500 -mt-6 -mx-6 mb-4 rounded-t-lg" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                <Layers className="h-4 w-4 text-emerald-600" />
              </div>
              {selectedSection ? 'Edit Section' : 'Add New Section'}
            </DialogTitle>
            <DialogDescription>
              {selectedSection ? 'Update section information below.' : 'Fill in the details to add a new section.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
            <div className="space-y-2">
              <Label htmlFor="sectionName">Section Name <span className="text-destructive">*</span></Label>
              <Input
                id="sectionName"
                value={formData.sectionName as string || ''}
                onChange={(e) => setFormData({ ...formData, sectionName: e.target.value })}
                className={formErrors.sectionName ? 'border-destructive' : ''}
                placeholder="e.g., BSCS 1-A"
              />
              {formErrors.sectionName && <p className="text-xs text-destructive">{formErrors.sectionName}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="sectionCode">Section Code</Label>
              <Input
                id="sectionCode"
                value={formData.sectionCode as string || ''}
                onChange={(e) => setFormData({ ...formData, sectionCode: e.target.value })}
                placeholder="e.g., BSCS-1A"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="yearLevel">Year Level <span className="text-destructive">*</span></Label>
              <Select
                value={String(formData.yearLevel || 1)}
                onValueChange={(value) => setFormData({ ...formData, yearLevel: parseInt(value) })}
              >
                <SelectTrigger id="yearLevel" className={formErrors.yearLevel ? 'border-destructive' : ''}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((year) => (
                    <SelectItem key={year} value={String(year)}>Year {year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.yearLevel && <p className="text-xs text-destructive">{formErrors.yearLevel}</p>}
            </div>

            {/* Cascading Department → Program selector */}
            <div className="space-y-2">
              <Label htmlFor="departmentId">Department <span className="text-destructive">*</span></Label>
              <Select
                value={formData.departmentId as string || ''}
                onValueChange={handleDepartmentChange}
              >
                <SelectTrigger id="departmentId" className={formErrors.departmentId ? 'border-destructive' : ''}>
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
              <Label htmlFor="programId">Program</Label>
              <Select
                value={formData.programId as string || 'none'}
                onValueChange={(value) => setFormData({ ...formData, programId: value === 'none' ? '' : value })}
                disabled={!formData.departmentId}
              >
                <SelectTrigger id="programId">
                  <SelectValue placeholder={formData.departmentId ? "Select program (optional)" : "Select department first"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific program</SelectItem>
                  {filteredPrograms.map((prog) => (
                    <SelectItem key={prog.id} value={prog.id}>{prog.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Optionally link this section to a specific program</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="classType">Class Type</Label>
              <Select
                value={formData.classType as string || 'regular'}
                onValueChange={(value) => setFormData({ ...formData, classType: value, yearLevel: value === 'executive' ? 5 : (formData.yearLevel || 1) })}
              >
                <SelectTrigger id="classType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">Regular</SelectItem>
                  <SelectItem value="executive">Executive (Masteral)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Executive classes are for masteral degree students</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="studentCount">Students <span className="text-destructive">*</span></Label>
              <Input
                id="studentCount"
                type="number"
                value={formData.studentCount as number || 40}
                onChange={(e) => setFormData({ ...formData, studentCount: parseInt(e.target.value) })}
                className={formErrors.studentCount ? 'border-destructive' : ''}
                min={1}
              />
              {formErrors.studentCount && <p className="text-xs text-destructive">{formErrors.studentCount}</p>}
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="w-full sm:w-auto" disabled={saving}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving} className="w-full sm:w-auto">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {selectedSection ? 'Update Section' : 'Create Section'}
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
              Delete Section
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{selectedSection?.sectionName}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
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
              Delete Selected Sections
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedRows.size} selected section{selectedRows.size !== 1 ? 's' : ''}? This action cannot be undone.
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
