'use client';

import { useState, useEffect, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from './DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  MoreHorizontal,
  Plus,
  Pencil,
  Trash2,
  Eye,
  Users,
  UserCheck,
  Clock,
  AlertTriangle,
  Mail,
  Phone,
  Building2,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  Download,
  Upload,
  Calendar,
  Award,
  UserPlus,
  UserCog,
  Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { User, Department, Schedule } from '@/types';
import { SpecializationSelector } from '@/components/ui/SpecializationSelector';
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
import { ExportButton } from '@/components/ui/ExportButton';
import { CsvImportButton } from '@/components/ui/CsvImportButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { BatchActionBar, SelectAllCheckbox } from '@/components/ui/BatchActionBar';
import { FilterChips } from '@/components/ui/FilterChips';
import { DataImportModal, type ColumnDefinition } from '@/components/ui/DataImportModal';
import { cn } from '@/lib/utils';
import { FacultyScheduleModal } from '@/components/dashboard/FacultyScheduleModal';

const getAvatarColor = (name: string) => {
  const colors = ['from-emerald-400 to-teal-500', 'from-amber-400 to-orange-500', 'from-rose-400 to-pink-500', 'from-violet-400 to-purple-500', 'from-sky-400 to-blue-500', 'from-teal-400 to-cyan-500'];
  const idx = name.charCodeAt(0) % colors.length;
  return colors[idx];
};

const FACULTY_CSV_TEMPLATE = [
  { Name: 'Juan Dela Cruz', Email: 'juan.delacruz@ptc.edu.ph', Department: 'Information Technology', ContractType: 'full-time', MaxUnits: '24' },
  { Name: 'Maria Santos', Email: 'maria.santos@ptc.edu.ph', Department: 'Computer Science', ContractType: 'part-time', MaxUnits: '12' },
];

export function FacultyView() {
  const [faculty, setFaculty] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState<User | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  // Filter state
  const [filters, setFilters] = useState({
    departmentId: 'all',
    contractType: 'all',
    loadStatus: 'all',
    facultyType: 'all',
  });
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  // Schedule modal state
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleFacultyId, setScheduleFacultyId] = useState('');
  const [scheduleFacultyName, setScheduleFacultyName] = useState('');
  const [scheduleFacultyDept, setScheduleFacultyDept] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, deptsRes, schedulesRes] = await Promise.all([
        fetch('/api/users?role=faculty'),
        fetch('/api/departments'),
        fetch('/api/schedules'),
      ]);

      const usersData = await usersRes.json();
      const deptsData = await deptsRes.json();
      const schedulesData = await schedulesRes.json();

      setFaculty(usersData);
      setDepartments(deptsData);
      setSchedules(schedulesData);
    } catch (error) {
      console.error('Error fetching faculty:', error);
      toast.error('Failed to load faculty data');
    } finally {
      setLoading(false);
    }
  };

  const getFacultyLoad = (facultyId: string) => {
    return schedules
      .filter((s) => s.facultyId === facultyId)
      .reduce((sum, s) => sum + (s.subject?.units || 0), 0);
  };

  // Filter faculty based on selected filters
  const filteredFaculty = useMemo(() => {
    return faculty.filter((f) => {
      if (filters.departmentId !== 'all' && f.departmentId !== filters.departmentId) return false;
      if (filters.contractType !== 'all' && f.contractType !== filters.contractType) return false;
      if (filters.facultyType !== 'all') {
        const specs = (f.specialization || []) as string[];
        const isMasteralEligible = specs.some(s => s.toLowerCase() === 'masteral');
        if (filters.facultyType === 'masteral' && !isMasteralEligible) return false;
        if (filters.facultyType === 'regular' && isMasteralEligible) return false;
      }
      if (filters.loadStatus !== 'all') {
        const load = getFacultyLoad(f.id);
        const maxUnits = f.maxUnits || 24;
        if (filters.loadStatus === 'overloaded' && load <= maxUnits) return false;
        if (filters.loadStatus === 'normal' && load !== maxUnits) return false;
        if (filters.loadStatus === 'underloaded' && load >= maxUnits) return false;
      }
      return true;
    });
  }, [faculty, filters, schedules]);

  // Build active filter chips for display
  const activeFilterChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; value: string }> = [];

    if (searchTerm.trim()) {
      chips.push({ key: 'search', label: 'Search', value: searchTerm.trim() });
    }

    if (filters.departmentId !== 'all') {
      const dept = departments.find((d) => d.id === filters.departmentId);
      if (dept) {
        chips.push({ key: 'departmentId', label: 'Department', value: dept.name });
      }
    }

    if (filters.contractType !== 'all') {
      chips.push({
        key: 'contractType',
        label: 'Contract',
        value: filters.contractType.charAt(0).toUpperCase() + filters.contractType.slice(1),
      });
    }

    if (filters.facultyType !== 'all') {
      chips.push({
        key: 'facultyType',
        label: 'Eligibility',
        value: filters.facultyType === 'masteral' ? 'Masteral Eligible' : 'Regular Only',
      });
    }

    if (filters.loadStatus !== 'all') {
      const labels: Record<string, string> = {
        overloaded: 'Overloaded',
        normal: 'Normal',
        underloaded: 'Underloaded',
      };
      chips.push({
        key: 'loadStatus',
        label: 'Load',
        value: labels[filters.loadStatus] || filters.loadStatus,
      });
    }

    return chips;
  }, [searchTerm, filters, departments]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    return activeFilterChips.length;
  }, [activeFilterChips]);

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      departmentId: 'all',
      contractType: 'all',
      loadStatus: 'all',
      facultyType: 'all',
    });
    setSearchTerm('');
  };

  // Remove individual filter
  const removeFilter = (key: string) => {
    if (key === 'search') {
      setSearchTerm('');
    } else if (key in filters) {
      setFilters({ ...filters, [key]: 'all' });
    }
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
    setSelectedRows(new Set(filteredFaculty.map(f => f.id)));
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
        const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
        if (res.ok) successCount++;
        else errorCount++;
      } catch {
        errorCount++;
      }
    }
    if (successCount > 0) toast.success(`Deleted ${successCount} faculty member${successCount !== 1 ? 's' : ''}`);
    if (errorCount > 0) toast.error(`Failed to delete ${errorCount} member${errorCount !== 1 ? 's' : ''}`);
    setIsDeleting(false);
    clearSelection();
    setBatchDeleteDialogOpen(false);
    fetchData();
  };

  const exportSelected = (ids: string[]) => {
    const selected = filteredFaculty.filter(f => ids.includes(f.id));
    if (selected.length === 0) return;
    const data = selected.map(f => ({
      Name: f.name,
      Email: f.email,
      Department: f.department?.name || 'Unassigned',
      Contract: f.contractType,
      MaxUnits: f.maxUnits || 24,
      CurrentLoad: getFacultyLoad(f.id),
      Specialization: (f.specialization || []).join('; '),
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
    a.download = 'selected-faculty.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${selected.length} faculty members`);
  };

  const handleCreate = () => {
    setSelectedFaculty(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'faculty',
      contractType: 'full-time',
      maxUnits: 24,
      departmentId: '',
      specialization: [],
      facultyType: 'regular',
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleEdit = (user: User) => {
    setSelectedFaculty(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      contractType: user.contractType,
      maxUnits: user.maxUnits,
      departmentId: user.departmentId || '',
      specialization: user.specialization,
      facultyType: (user as Record<string, unknown>).facultyType as string || 'regular',
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.name || (formData.name as string).trim() === '') {
      errors.name = 'Name is required';
    }
    
    if (!formData.email || (formData.email as string).trim() === '') {
      errors.email = 'Email is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email as string)) {
        errors.email = 'Please enter a valid email address';
      }
    }
    
    if (!selectedFaculty) {
      if (!formData.password || (formData.password as string).length < 6) {
        errors.password = 'Password must be at least 6 characters';
      }
    }
    
    if (!formData.departmentId) {
      errors.departmentId = 'Department is required';
    }
    
    if (!formData.maxUnits || (formData.maxUnits as number) < 1) {
      errors.maxUnits = 'Max units must be at least 1';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setSaving(true);
    try {
      const url = selectedFaculty ? `/api/users/${selectedFaculty.id}` : '/api/users';
      const method = selectedFaculty ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success(selectedFaculty ? 'Faculty updated successfully' : 'Faculty created successfully');
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

  const handleDelete = (user: User) => {
    setSelectedFaculty(user);
    setDeleteDialogOpen(true);
  };

  const handleImportFaculty = async (data: Record<string, string>[]) => {
    try {
      const res = await fetch('/api/faculty/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: data }),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        toast.success(result.message || `Imported ${result.imported} faculty member${result.imported !== 1 ? 's' : ''}`);
        if (result.failed > 0 && result.errors) {
          // Show details for first 3 errors
          const firstErrors = result.errors.slice(0, 3).map((e: { row: number; message: string }) => `Row ${e.row}: ${e.message}`).join('; ');
          toast.error(`${result.failed} record${result.failed !== 1 ? 's' : ''} failed: ${firstErrors}${result.errors.length > 3 ? '...' : ''}`);
        }
      } else {
        toast.error(result.error || 'Import failed. Please check your CSV data.');
      }

      fetchData();
    } catch {
      toast.error('Import failed. Unable to connect to server.');
    }
  };

  const handleViewSchedule = (user: User) => {
    setScheduleFacultyId(user.id);
    setScheduleFacultyName(user.name);
    setScheduleFacultyDept(user.department?.name || null);
    setScheduleModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedFaculty) return;

    try {
      const res = await fetch(`/api/users/${selectedFaculty.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Faculty deleted successfully');
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

  const columns: ColumnDef<User>[] = [
    {
      id: 'select',
      size: 40,
      header: () => (
        <SelectAllCheckbox
          selectedCount={selectedRows.size}
          totalCount={filteredFaculty.length}
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
      header: 'Name',
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8 avatar-ring-emerald">
              <AvatarImage src={user.image || ''} />
              <AvatarFallback className={cn('bg-gradient-to-br text-white', getAvatarColor(user.name))}>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'department',
      header: 'Department',
      cell: ({ row }) => {
        const dept = row.original.department;
        return dept ? (
          <Badge variant="secondary">{dept.name}</Badge>
        ) : (
          <span className="text-muted-foreground">Unassigned</span>
        );
      },
    },
    {
      accessorKey: 'contractType',
      header: 'Contract',
      cell: ({ row }) => (
        <Badge variant={row.original.contractType === 'full-time' ? 'default' : 'outline'}>
          {row.original.contractType}
        </Badge>
      ),
    },
    {
      id: 'facultyType',
      header: 'Eligibility',
      cell: ({ row }) => {
        const specs = (row.original.specialization || []) as string[];
        const isMasteralEligible = specs.some(s => s.toLowerCase() === 'masteral');
        if (isMasteralEligible) {
          return (
            <Badge variant="outline" className="bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/25">
              <Award className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
              Masteral
            </Badge>
          );
        }
        return (
          <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25">
            Regular
          </Badge>
        );
      },
    },
    {
      id: 'load',
      header: 'Load',
      cell: ({ row }) => {
        const user = row.original;
        const load = getFacultyLoad(user.id);
        const maxUnits = user.maxUnits || 24;
        const percentage = Math.round((load / maxUnits) * 100);
        const isOverloaded = load > maxUnits;

        return (
          <div className="w-32">
            <div className="flex justify-between text-xs mb-1">
              <span>{load}/{maxUnits} units</span>
              <span className={isOverloaded ? 'text-red-500' : ''}>{percentage}%</span>
            </div>
            <Progress
              value={Math.min(percentage, 100)}
              className={`h-1.5 ${isOverloaded ? '[&>div]:bg-red-500' : ''}`}
            />
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const user = row.original;
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
              <DropdownMenuItem onClick={() => handleViewSchedule(user)}>
                <Calendar className="mr-2 h-4 w-4" />
                View Schedule
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleEdit(user)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(user)}>
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
        <Users className="h-8 w-8 animate-spin text-primary" />
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
          <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-600">Faculty Management</h1>
          <div className="h-1 w-20 mt-1 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600" />
          <p className="text-muted-foreground mt-1">Manage faculty members and teaching loads</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton
            data={filteredFaculty.map(f => ({
              Name: f.name,
              Email: f.email,
              Department: f.department?.name || 'Unassigned',
              Contract: f.contractType,
              MaxUnits: f.maxUnits || 24,
              CurrentLoad: getFacultyLoad(f.id),
              Specialization: (f.specialization || []).join('; '),
            }))}
            filename="faculty-list"
          />
          <CsvImportButton
            onImport={handleImportFaculty}
            templateData={FACULTY_CSV_TEMPLATE}
            templateFilename="faculty-template.csv"
          />
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Import CSV
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Faculty
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-hover gradient-border card-shine">
          <div className="h-1 rounded-t-lg bg-gradient-to-r from-emerald-500 to-emerald-400" />
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Faculty</p>
        <div className="text-2xl font-bold mt-1 stat-number-gradient">{faculty.length}</div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover gradient-border card-shine">
          <div className="h-1 rounded-t-lg bg-gradient-to-r from-blue-500 to-blue-400" />
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Full-time</p>
                <div className="text-2xl font-bold mt-1 stat-number-gradient">{faculty.filter((f) => f.contractType === 'full-time').length}</div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                <UserCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover gradient-border card-shine">
          <div className="h-1 rounded-t-lg bg-gradient-to-r from-amber-500 to-amber-400" />
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Part-time</p>
                <div className="text-2xl font-bold mt-1 stat-number-gradient">{faculty.filter((f) => f.contractType === 'part-time').length}</div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover gradient-border card-shine">
          <div className="h-1 rounded-t-lg bg-gradient-to-r from-red-500 to-red-400" />
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Overloaded</p>
                <div className="text-2xl font-bold mt-1 stat-number-gradient">{faculty.filter((f) => getFacultyLoad(f.id) > f.maxUnits).length}</div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
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
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                  <div className="space-y-1 min-w-0">
                    <label className="text-[10px] sm:text-xs font-medium text-muted-foreground">Department</label>
                    <Select
                      value={filters.departmentId}
                      onValueChange={(value) => setFilters({ ...filters, departmentId: value })}
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
                    <label className="text-[10px] sm:text-xs font-medium text-muted-foreground">Contract Type</label>
                    <Select
                      value={filters.contractType}
                      onValueChange={(value) => setFilters({ ...filters, contractType: value })}
                    >
                      <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm w-full">
                        <span className="truncate">
                          <SelectValue placeholder="All" />
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="full-time">Full-time</SelectItem>
                        <SelectItem value="part-time">Part-time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 min-w-0">
                    <label className="text-[10px] sm:text-xs font-medium text-muted-foreground">Masteral Eligible</label>
                    <Select
                      value={filters.facultyType}
                      onValueChange={(value) => setFilters({ ...filters, facultyType: value })}
                    >
                      <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm w-full">
                        <span className="truncate">
                          <SelectValue placeholder="All" />
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Faculty</SelectItem>
                        <SelectItem value="masteral">Masteral Eligible</SelectItem>
                        <SelectItem value="regular">Regular Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 min-w-0">
                    <label className="text-[10px] sm:text-xs font-medium text-muted-foreground">Load Status</label>
                    <Select
                      value={filters.loadStatus}
                      onValueChange={(value) => setFilters({ ...filters, loadStatus: value })}
                    >
                      <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm w-full">
                        <span className="truncate">
                          <SelectValue placeholder="All" />
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="overloaded">Overloaded</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="underloaded">Underloaded</SelectItem>
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

      {/* Active Filter Chips */}
      <FilterChips
        filters={activeFilterChips}
        onRemove={removeFilter}
        onClearAll={clearFilters}
      />

      {/* Results count */}
      <div className="text-xs sm:text-sm text-muted-foreground">
        Showing {filteredFaculty.length} of {faculty.length} faculty
      </div>

      {/* Empty State */}
      {filteredFaculty.length === 0 && (
        <EmptyState
          icon={Users}
          title="No faculty found"
          description={activeFilterCount > 0
            ? 'No faculty match the current filters. Try adjusting your filter criteria.'
            : 'Get started by adding your first faculty member.'}
          action={{
            label: activeFilterCount > 0 ? 'Clear Filters' : 'Add Faculty',
            onClick: activeFilterCount > 0 ? clearFilters : handleCreate,
          }}
          secondaryAction={activeFilterCount > 0 ? {
            label: 'Add Faculty',
            onClick: handleCreate,
          } : undefined}
        />
      )}

      {/* Data Table */}
      {filteredFaculty.length > 0 && (
      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={filteredFaculty}
            searchKey="name"
            searchPlaceholder="Search faculty..."
            onSearchChange={setSearchTerm}
            isRowSelected={(user) => selectedRows.has(user.id)}
            mobileCardRender={(user) => {
              const isSelected = selectedRows.has(user.id);
              return (
              <div className={cn(
                'space-y-3',
                isSelected && '-m-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800'
              )}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleRow(user.id)}
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
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.image || ''} />
                      <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleViewSchedule(user)}>
                        <Calendar className="mr-2 h-4 w-4" />
                        View Schedule
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEdit(user)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(user)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{user.department?.name || 'Unassigned'}</Badge>
                  <Badge variant={user.contractType === 'full-time' ? 'default' : 'outline'}>
                    {user.contractType}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Load: {getFacultyLoad(user.id)}/{user.maxUnits || 24} units</span>
                    <span>{Math.round((getFacultyLoad(user.id) / (user.maxUnits || 24)) * 100)}%</span>
                  </div>
                  <Progress value={Math.min((getFacultyLoad(user.id) / (user.maxUnits || 24)) * 100, 100)} className="h-1.5" />
                </div>
              </div>
              );
            }}
          />
        </CardContent>
      </Card>
      )}

      {/* Batch Action Bar */}
      <BatchActionBar
        selectedIds={Array.from(selectedRows)}
        totalCount={filteredFaculty.length}
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
                {selectedFaculty ? <UserCog className="h-4 w-4 text-emerald-600" /> : <UserPlus className="h-4 w-4 text-emerald-600" />}
              </div>
              {selectedFaculty ? 'Edit Faculty' : 'Add New Faculty'}
            </DialogTitle>
            <DialogDescription>
              {selectedFaculty
                ? 'Update faculty information below.'
                : 'Fill in the details to add a new faculty member.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
            <div className="space-y-2">
              <Label htmlFor="name">Name <span className="text-destructive">*</span></Label>
              <Input
                id="name"
                value={formData.name as string || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter faculty name"
                className={formErrors.name ? 'border-destructive' : ''}
              />
              {formErrors.name && <p className="text-xs text-destructive">{formErrors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
              <Input
                id="email"
                type="email"
                value={formData.email as string || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter email address"
                className={formErrors.email ? 'border-destructive' : ''}
              />
              {formErrors.email && <p className="text-xs text-destructive">{formErrors.email}</p>}
            </div>
            {!selectedFaculty && (
              <div className="space-y-2">
                <Label htmlFor="password">Password <span className="text-destructive">*</span></Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password as string || ''}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter password (min 6 characters)"
                  className={formErrors.password ? 'border-destructive' : ''}
                />
                {formErrors.password && <p className="text-xs text-destructive">{formErrors.password}</p>}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="department">Department <span className="text-destructive">*</span></Label>
                <Select
                  value={formData.departmentId as string || ''}
                  onValueChange={(value) => setFormData({ ...formData, departmentId: value })}
                >
                  <SelectTrigger className={formErrors.departmentId ? 'border-destructive' : ''}>
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
                <Label htmlFor="contractType">Contract</Label>
                <Select
                  value={formData.contractType as string || 'full-time'}
                  onValueChange={(value) => setFormData({ ...formData, contractType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full-time">Full-time</SelectItem>
                    <SelectItem value="part-time">Part-time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="facultyType">Faculty Type</Label>
              <Select
                value={formData.facultyType as string || 'regular'}
                onValueChange={(value) => setFormData({ ...formData, facultyType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">Regular</SelectItem>
                  <SelectItem value="masteral">Masteral</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Note: Executive class assignment is determined by the &quot;Masteral&quot; specialization below, not this field.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxUnits">Max Units <span className="text-destructive">*</span></Label>
              <Input
                id="maxUnits"
                type="number"
                value={formData.maxUnits as number || 24}
                onChange={(e) => setFormData({ ...formData, maxUnits: parseInt(e.target.value) || 24 })}
                className={formErrors.maxUnits ? 'border-destructive' : ''}
              />
              {formErrors.maxUnits && <p className="text-xs text-destructive">{formErrors.maxUnits}</p>}
            </div>
            <SpecializationSelector
              selected={(formData.specialization as string[]) || []}
              onChange={(specs) => setFormData({ ...formData, specialization: specs })}
              isAdmin={true}
              idPrefix="fac-spec"
              hint="Select subjects this faculty can teach"
            />
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="w-full sm:w-auto" disabled={saving}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving} className="w-full sm:w-auto">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {selectedFaculty ? 'Update Faculty' : 'Create Faculty'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10">
                <Trash2 className="h-4 w-4 text-destructive" />
              </div>
              Delete Faculty
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{selectedFaculty?.name}</strong>? This action cannot be undone.
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
              Delete Selected Faculty
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedRows.size} selected faculty member{selectedRows.size !== 1 ? 's' : ''}? This action cannot be undone.
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

      {/* Faculty Schedule Quick View Modal */}
      <FacultyScheduleModal
        facultyId={scheduleFacultyId}
        facultyName={scheduleFacultyName}
        facultyDepartment={scheduleFacultyDept}
        isOpen={scheduleModalOpen}
        onOpenChange={setScheduleModalOpen}
      />

      {/* Data Import Modal */}
      <DataImportModal
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Import Faculty"
        description="Upload a CSV file to bulk import faculty members"
        columns={[
          { key: 'name', label: 'Full Name', required: true },
          { key: 'email', label: 'Email', required: true, type: 'email' },
          { key: 'department', label: 'Department' },
          { key: 'specialization', label: 'Specialization' },
          { key: 'contract', label: 'Contract Type' },
          { key: 'maxUnits', label: 'Max Units', type: 'number' },
        ]}
        onImport={async (data) => {
          let imported = 0;
          for (const row of data) {
            try {
              const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  name: row.name,
                  email: row.email,
                  department: row.department,
                  specialization: row.specialization,
                  contract: row.contract || 'full-time',
                  maxUnits: parseInt(row.maxUnits || '24', 10),
                  role: 'faculty',
                }),
              });
              if (res.ok) imported++;
            } catch { /* skip failed rows */ }
          }
          if (imported > 0) {
            toast.success(`Successfully imported ${imported} faculty members`);
            fetchData();
            setImportOpen(false);
          }
        }}
        templateData={{
          name: 'Juan Dela Cruz',
          email: 'juan.delacruz@ptc.edu.ph',
          department: 'Information Technology',
          specialization: 'Web Development',
          contract: 'full-time',
          maxUnits: '24',
        }}
      />
    </motion.div>
  );
}
