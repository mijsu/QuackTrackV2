'use client';

import { useState, useEffect, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from './DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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

import { toast } from 'sonner';
import {
  Plus, MoreHorizontal, Pencil, Trash2, UserCog, 
  UserPlus, Loader2, Mail, Copy, Check, AlertCircle,
  Filter, X, ChevronDown, Shield, Users,
  Building2, Calculator, LayoutGrid, List, BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { User, Department } from '@/types';
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
import { SpecializationSelector } from '@/components/ui/SpecializationSelector';
import { useAppStore } from '@/store';
import { useCountUp } from '@/hooks/use-count-up';

interface GeneratedCredentials {
  institutionalEmail: string;
  password: string;
  emailSent: boolean;
  emailDevMode?: boolean;
  emailError?: string;
}

// Stat card with count-up animation
function StatCard({ 
  label, 
  value, 
  icon: Icon, 
  gradientFrom, 
  gradientTo, 
  iconBg, 
  iconColor,
  delay = 0 
}: { 
  label: string; 
  value: number; 
  icon: React.ElementType; 
  gradientFrom: string; 
  gradientTo: string; 
  iconBg: string; 
  iconColor: string;
  delay?: number;
}) {
  const countValue = useCountUp(value, 800, true);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay }}>
      <Card className="card-hover gradient-border stat-card-shine transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
        <div className={cn('h-1 rounded-t-lg bg-gradient-to-r', gradientFrom, gradientTo)} />
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
              <div className="text-2xl font-bold mt-1 tabular-nums">{countValue}</div>
            </div>
            <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center', iconBg)}>
              <Icon className={cn('h-5 w-5', iconColor)} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function UsersView() {
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [credentialsDialogOpen, setCredentialsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState<GeneratedCredentials | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState<'cards' | 'table'>('cards');
  
  // Filter state
  const [filters, setFilters] = useState({
    role: 'all',
    departmentId: 'all',
    contractType: 'all',
  });
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  
  // Get conflict resolution context from store
  const { conflictResolutionContext, clearConflictResolutionContext } = useAppStore();

  useEffect(() => {
    fetchData();
  }, []);

  // Handle conflict resolution context - open add/edit modal when navigating from conflicts
  useEffect(() => {
    if (!loading && conflictResolutionContext && users.length >= 0) {
      const { addFacultySpecs, addFacultyDept, facultyIdToEdit } = conflictResolutionContext;
      
      if (facultyIdToEdit) {
        // Edit existing faculty
        const user = users.find(u => u.id === facultyIdToEdit);
        if (user) {
          handleEdit(user);
          clearConflictResolutionContext();
        }
      } else if (addFacultySpecs || addFacultyDept) {
        // Open add modal with pre-filled specializations
        setSelectedUser(null);
        setFormData({
          name: '',
          personalEmail: '',
          role: 'faculty',
          departmentId: addFacultyDept || '',
          contractType: 'full-time',
          maxUnits: 24,
          specialization: addFacultySpecs || [],
          isNew: true,
        });
        setFormErrors({});
        setDialogOpen(true);
        clearConflictResolutionContext();
        toast.info(`Adding faculty with specializations: ${(addFacultySpecs || []).join(', ')}`);
      }
    }
  }, [loading, conflictResolutionContext, users]);

  const fetchData = async () => {
    try {
      const [usersRes, deptsRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/departments'),
      ]);
      const usersData = await usersRes.json();
      const deptsData = await deptsRes.json();
      // Ensure we always set arrays
      setUsers(Array.isArray(usersData) ? usersData : []);
      setDepartments(Array.isArray(deptsData) ? deptsData : []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
      setUsers([]);
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedUser(null);
    setFormData({
      name: '',
      personalEmail: '',
      role: 'faculty',
      departmentId: '',
      contractType: 'full-time',
      maxUnits: 24,
      specialization: [],
      isNew: true,
    });
    setFormErrors({});
    setGeneratedCredentials(null);
    setDialogOpen(true);
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      personalEmail: user.personalEmail || '',
      role: user.role,
      departmentId: user.departmentId || '',
      contractType: user.contractType || 'full-time',
      maxUnits: user.maxUnits || 24,
      specialization: user.specialization || [],
      isNew: false,
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleDelete = (user: User) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.name) errors.name = 'Name is required';
    if (formData.isNew && formData.role === 'faculty' && !formData.personalEmail) {
      errors.personalEmail = 'Personal email is required for faculty accounts';
    }
    if (formData.personalEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.personalEmail as string)) {
      errors.personalEmail = 'Invalid email format';
    }
    if (!formData.role) errors.role = 'Role is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setSaving(true);
    try {
      if (selectedUser) {
        // Update existing user
        const res = await fetch(`/api/users/${selectedUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        if (res.ok) {
          toast.success('User updated');
          setDialogOpen(false);
          fetchData();
        } else {
          const data = await res.json();
          toast.error(data.error || 'Operation failed');
        }
      } else {
        // Create new user - credentials will be auto-generated
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        if (res.ok) {
          const data = await res.json();
          setGeneratedCredentials(data.generatedCredentials);
          setDialogOpen(false);
          setCredentialsDialogOpen(true);
          fetchData();
        } else {
          const data = await res.json();
          toast.error(data.error || 'Operation failed');
        }
      }
    } catch {
      toast.error('Operation failed');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!selectedUser) return;
    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('User deleted');
        setDeleteDialogOpen(false);
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to delete user');
      }
    } catch {
      toast.error('Failed to delete user');
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const getRoleBadge = (role: string) => {
    if (role === 'admin') {
      return <Badge variant="outline" className="role-badge-admin"><Shield className="h-3 w-3 mr-1" />Admin</Badge>;
    }
    if (role === 'staff') {
      return <Badge variant="outline" className="role-badge-staff"><Building2 className="h-3 w-3 mr-1" />Staff</Badge>;
    }
    return <Badge variant="outline" className="role-badge-faculty"><Users className="h-3 w-3 mr-1" />Faculty</Badge>;
  };

  // Filter users based on selected filters
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      if (filters.role !== 'all' && user.role !== filters.role) return false;
      if (filters.departmentId !== 'all' && user.departmentId !== filters.departmentId) return false;
      if (filters.contractType !== 'all' && user.contractType !== filters.contractType) return false;
      return true;
    });
  }, [users, filters]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    return Object.values(filters).filter(v => v !== 'all').length;
  }, [filters]);

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      role: 'all',
      departmentId: 'all',
      contractType: 'all',
    });
  };

  // Computed stats
  const totalUsers = users.length;
  const adminCount = users.filter(u => u.role === 'admin').length;
  const facultyCount = users.filter(u => u.role === 'faculty').length;
  const deptCount = new Set(users.filter(u => u.departmentId).map(u => u.departmentId)).size;
  const avgMaxUnits = users.length > 0 ? Math.round(users.reduce((sum, u) => sum + (u.maxUnits || 0), 0) / users.length) : 0;

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: 'name',
      header: 'User',
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="flex items-center gap-3">
            <Avatar className={cn(
              "h-9 w-9 ring-2 ring-offset-background transition-all duration-200 hover:scale-105",
              user.role === 'admin' ? "ring-rose-500" : user.role === 'staff' ? "ring-teal-500" : "ring-emerald-500"
            )}>
              <AvatarImage src={user.image || ''} alt={user.name || ''} />
              <AvatarFallback className={cn(
                "text-sm",
                user.role === 'admin' ? "bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400" : user.role === 'staff' ? "bg-teal-100 dark:bg-teal-500/20 text-teal-700 dark:text-teal-400" : "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
              )}>
                {user.name?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-2">
              <div>
                <p className="font-medium">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>
          </div>
        );
      },
    },
    { accessorKey: 'role', header: 'Role', cell: ({ row }) => getRoleBadge(row.original.role) },
    {
      accessorKey: 'department',
      header: 'Department',
      cell: ({ row }) => row.original.department?.name || <span className="text-muted-foreground">-</span>,
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleEdit(row.original)}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(row.original)}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  if (loading) return <div className="flex justify-center p-8"><UserCog className="h-8 w-8 animate-spin" /></div>;

  // Color sets for user cards (rotating gradient borders)
  const userColorSets = [
    { border: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', iconBg: 'bg-emerald-100 dark:bg-emerald-500/20' },
    { border: 'from-teal-500 to-cyan-500', bg: 'bg-teal-50 dark:bg-teal-500/10', text: 'text-teal-600 dark:text-teal-400', iconBg: 'bg-teal-100 dark:bg-teal-500/20' },
    { border: 'from-amber-500 to-orange-500', bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', iconBg: 'bg-amber-100 dark:bg-amber-500/20' },
    { border: 'from-violet-500 to-purple-500', bg: 'bg-violet-50 dark:bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400', iconBg: 'bg-violet-100 dark:bg-violet-500/20' },
    { border: 'from-rose-500 to-pink-500', bg: 'bg-rose-50 dark:bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400', iconBg: 'bg-rose-100 dark:bg-rose-500/20' },
    { border: 'from-cyan-500 to-blue-500', bg: 'bg-cyan-50 dark:bg-cyan-500/10', text: 'text-cyan-600 dark:text-cyan-400', iconBg: 'bg-cyan-100 dark:bg-cyan-500/20' },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-600">Users Management</h1>
          <div className="h-1 w-20 mt-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" />
          <p className="text-muted-foreground">Manage system users and roles</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleCreate}><Plus className="mr-2 h-4 w-4" />Add Faculty</Button>
        </div>
      </div>

      {/* Stats with count-up animation */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          label="Total Users"
          value={totalUsers}
          icon={UserCog}
          gradientFrom="from-emerald-500"
          gradientTo="to-emerald-400"
          iconBg="bg-emerald-50 dark:bg-emerald-500/10"
          iconColor="text-emerald-600 dark:text-emerald-400"
          delay={0}
        />
        <StatCard
          label="Admins"
          value={adminCount}
          icon={Shield}
          gradientFrom="from-rose-500"
          gradientTo="to-rose-400"
          iconBg="bg-rose-50 dark:bg-rose-500/10"
          iconColor="text-rose-600 dark:text-rose-400"
          delay={0.08}
        />
        <StatCard
          label="Faculty"
          value={facultyCount}
          icon={Users}
          gradientFrom="from-teal-500"
          gradientTo="to-teal-400"
          iconBg="bg-teal-50 dark:bg-teal-500/10"
          iconColor="text-teal-600 dark:text-teal-400"
          delay={0.16}
        />
        <StatCard
          label="Departments"
          value={deptCount}
          icon={Building2}
          gradientFrom="from-amber-500"
          gradientTo="to-amber-400"
          iconBg="bg-amber-50 dark:bg-amber-500/10"
          iconColor="text-amber-600 dark:text-amber-400"
          delay={0.24}
        />
        <StatCard
          label="Avg Max Units"
          value={avgMaxUnits}
          icon={Calculator}
          gradientFrom="from-violet-500"
          gradientTo="to-violet-400"
          iconBg="bg-violet-50 dark:bg-violet-500/10"
          iconColor="text-violet-600 dark:text-violet-400"
          delay={0.32}
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
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
                  <div className="space-y-1 min-w-0">
                    <label className="text-[10px] sm:text-xs font-medium text-muted-foreground">Role</label>
                    <Select
                      value={filters.role}
                      onValueChange={(value) => setFilters({ ...filters, role: value })}
                    >
                      <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm w-full">
                        <span className="truncate">
                          <SelectValue placeholder="All" />
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="admin"><span className="flex items-center gap-1.5"><Shield className="h-3 w-3" />Admin ({users.filter(u => u.role === 'admin').length})</span></SelectItem>
                        <SelectItem value="faculty"><span className="flex items-center gap-1.5"><Users className="h-3 w-3" />Faculty ({users.filter(u => u.role === 'faculty').length})</span></SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
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
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="full-time">Full-time</SelectItem>
                        <SelectItem value="part-time">Part-time</SelectItem>
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
          Showing {filteredUsers.length} of {users.length} users
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

      {/* Cards View */}
      {filteredUsers.length > 0 && displayMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map((user, index) => {
            const colors = userColorSets[index % userColorSets.length];
            const isActive = user.role === 'admin' || user.contractType === 'full-time';
            const userDept = user.department?.name || null;
            const specCount = (user.specialization || []).length;

            return (
              <motion.div
                key={user.id}
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
                          <Avatar className="h-9 w-9 ring-2 ring-offset-background">
                            <AvatarImage src={user.image || ''} alt={user.name || ''} />
                            <AvatarFallback className={cn(
                              "text-sm font-semibold",
                              user.role === 'admin' 
                                ? "bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400" 
                                : "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                            )}>
                              {user.name?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-sm truncate">{user.name}</h3>
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleEdit(user)}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(user)}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Badges row */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-3">
                      {/* Role badge */}
                      {user.role === 'admin' ? (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30">
                          <Shield className="h-3 w-3 mr-1" />Admin
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30">
                          <Users className="h-3 w-3 mr-1" />Faculty
                        </Badge>
                      )}

                      {/* Department badge */}
                      {userDept && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-500/30">
                          <Building2 className="h-3 w-3 mr-1" />{userDept}
                        </Badge>
                      )}
                    </div>

                    {/* Status indicator */}
                    <div className="flex items-center gap-2 mt-2.5">
                      <div className={cn(
                        'flex items-center gap-1.5 text-[10px] font-medium',
                        isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
                      )}>
                        <div className={cn(
                          'h-1.5 w-1.5 rounded-full',
                          isActive ? 'bg-emerald-500' : 'bg-muted-foreground/50'
                        )} />
                        {isActive ? 'Active' : 'Inactive'}
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {user.contractType === 'full-time' ? 'Full-time' : 'Part-time'}
                      </span>
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center gap-3 mt-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                        <BookOpen className="h-3.5 w-3.5" />
                        <span>{specCount} Spec{specCount !== 1 ? 's' : ''}</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-violet-50 dark:bg-violet-500/10 text-xs font-medium text-violet-700 dark:text-violet-400">
                        <Calculator className="h-3.5 w-3.5" />
                        <span>{user.maxUnits || 24} Units</span>
                      </span>
                    </div>

                    {/* Hover action buttons */}
                    <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => handleEdit(user)}
                      >
                        <Pencil className="h-3 w-3" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(user)}
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Table View */}
      {filteredUsers.length > 0 && displayMode === 'table' && (
        <Card className="transition-all duration-200 hover:shadow-md">
          <CardContent className="pt-6">
            <DataTable columns={columns} data={filteredUsers} searchKey="name" />
          </CardContent>
        </Card>
      )}

      {/* Empty state when no users match filter */}
      {filteredUsers.length === 0 && (
        <Card className="p-8">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="h-16 w-16 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-emerald-500" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No users found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {activeFilterCount > 0
                ? 'No users match the current filters. Try adjusting your filter criteria.'
                : 'Get started by adding your first faculty member.'}
            </p>
            <Button onClick={activeFilterCount > 0 ? clearFilters : handleCreate}>
              {activeFilterCount > 0 ? (
                <><X className="mr-2 h-4 w-4" />Clear Filters</>
              ) : (
                <><Plus className="mr-2 h-4 w-4" />Add Faculty</>
              )}
            </Button>
          </div>
        </Card>
      )}

      {/* Create/Edit User Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl dialog-header-accent">
          <div className="h-1 w-full bg-gradient-to-r from-emerald-500 to-teal-500 -mt-6 -mx-6 mb-4 rounded-t-lg" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                {selectedUser ? <UserCog className="h-4 w-4 text-emerald-600" /> : <UserPlus className="h-4 w-4 text-emerald-600" />}
              </div>
              {selectedUser ? 'Edit User' : 'Add New User'}
            </DialogTitle>
            <DialogDescription>
              {selectedUser
                ? 'Update user information below.'
                : 'Fill in the details to create a new user account. The institutional email and password will be auto-generated.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
            <div className="space-y-2">
              <Label htmlFor="userName">Full Name <span className="text-destructive">*</span></Label>
              <Input
                id="userName"
                placeholder="Enter first and last name (e.g., Juan Dela Cruz)"
                value={formData.name as string || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              {formErrors.name && <p className="text-xs text-destructive">{formErrors.name}</p>}
              {!selectedUser && formData.name && (
                <p className="text-xs text-muted-foreground">
                  Institutional email will be: <span className="font-mono font-medium">
                    {(formData.name as string).toLowerCase().trim().split(/\s+/).pop()}.{(formData.name as string).toLowerCase().trim().split(/\s+/).slice(0, -1).join('') || (formData.name as string).toLowerCase().trim().split(/\s+/)[0]}@ptc.edu.ph
                  </span>
                </p>
              )}
            </div>

            {selectedUser && (
              <div className="space-y-2">
                <Label htmlFor="userEmail">Institutional Email (Login Email)</Label>
                <Input
                  id="userEmail"
                  type="email"
                  value={formData.email as string || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">This is the email used for login</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="userPersonalEmail">Personal Email {formData.role === 'faculty' && !selectedUser ? <span className="text-destructive">*</span> : ''}</Label>
              <Input
                id="userPersonalEmail"
                type="email"
                placeholder="Enter personal email address"
                value={formData.personalEmail as string || ''}
                onChange={(e) => setFormData({ ...formData, personalEmail: e.target.value })}
              />
              {formErrors.personalEmail && <p className="text-xs text-destructive">{formErrors.personalEmail}</p>}
              {!selectedUser && (
                <p className="text-xs text-muted-foreground">Credentials will be sent to this email</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="userRole">Role <span className="text-destructive">*</span></Label>
                <Select value={formData.role as string || 'faculty'} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                  <SelectTrigger id="userRole"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="faculty">Faculty</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="userContract">Contract Type</Label>
                <Select value={formData.contractType as string || 'full-time'} onValueChange={(v) => setFormData({ ...formData, contractType: v })}>
                  <SelectTrigger id="userContract"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full-time">Full-time</SelectItem>
                    <SelectItem value="part-time">Part-time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="userDept">Department</Label>
              <Select value={formData.departmentId as string || ''} onValueChange={(v) => setFormData({ ...formData, departmentId: v })}>
                <SelectTrigger id="userDept"><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>{departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="userMaxUnits">Max Units</Label>
              <Input id="userMaxUnits" type="number" value={formData.maxUnits as number || 24} onChange={(e) => setFormData({ ...formData, maxUnits: parseInt(e.target.value) || 24 })} />
              <p className="text-xs text-muted-foreground">Maximum teaching units per semester</p>
            </div>
            <SpecializationSelector
              selected={(formData.specialization as string[]) || []}
              onChange={(specs) => setFormData({ ...formData, specialization: specs })}
              isAdmin={true}
              idPrefix="user-spec"
              hint="Select subjects this user can teach"
            />
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="w-full sm:w-auto" disabled={saving}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving} className="w-full sm:w-auto">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {selectedUser ? 'Update User' : 'Create & Send Credentials'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credentials Display Dialog */}
      <Dialog open={credentialsDialogOpen} onOpenChange={setCredentialsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Faculty Account Created
            </DialogTitle>
            <DialogDescription>
              {generatedCredentials?.emailDevMode 
                ? 'The credentials have been generated. Email is in development mode.'
                : 'The credentials have been generated and sent to the personal email.'}
            </DialogDescription>
          </DialogHeader>
          
          {generatedCredentials && (
            <div className="space-y-4 py-4">
              {/* Email Status Banner */}
              {generatedCredentials.emailDevMode ? (
                <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 mb-2">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Development Mode</span>
                  </div>
                  <p className="text-xs text-amber-600 dark:text-amber-500">
                    Email service is not configured. To send real emails:
                  </p>
                  <ol className="text-xs text-amber-600 dark:text-amber-500 mt-2 list-decimal list-inside space-y-1">
                    <li>Get a free API key at <strong>resend.com</strong></li>
                    <li>Add <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">RESEND_API_KEY</code> to .env</li>
                    <li>Restart the server</li>
                  </ol>
                  <p className="text-xs text-amber-600 dark:text-amber-500 mt-2">
                    Credentials are logged to the server console.
                  </p>
                </div>
              ) : generatedCredentials.emailSent ? (
                <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-2">
                    <Check className="h-4 w-4" />
                    <span className="text-sm font-medium">Email sent successfully</span>
                  </div>
                  <p className="text-xs text-green-600 dark:text-green-500">
                    The faculty member will receive their login credentials at their personal email.
                  </p>
                </div>
              ) : (
                <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-400 mb-2">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Email failed to send</span>
                  </div>
                  <p className="text-xs text-red-600 dark:text-red-500">
                    {generatedCredentials.emailError || 'An error occurred while sending the email. Please share credentials manually.'}
                  </p>
                </div>
              )}
              
              {/* Credentials */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Institutional Email (Login)</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-muted px-3 py-2 rounded-md text-sm font-mono">
                      {generatedCredentials.institutionalEmail}
                    </code>
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => copyToClipboard(generatedCredentials.institutionalEmail, 'email')}
                    >
                      {copiedField === 'email' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Generated Password</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-muted px-3 py-2 rounded-md text-sm font-mono font-bold text-primary">
                      {generatedCredentials.password}
                    </code>
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => copyToClipboard(generatedCredentials.password, 'password')}
                    >
                      {copiedField === 'password' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  <strong>Important:</strong> Please share these credentials securely with the faculty member. 
                  They should change their password after first login.
                </p>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={() => setCredentialsDialogOpen(false)}>
              Done
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
              Delete User
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{selectedUser?.name}</strong>? This action cannot be undone.
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
    </motion.div>
  );
}
