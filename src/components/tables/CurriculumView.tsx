'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  BookOpen, Plus, Edit3, Trash2, Search, Building2, ArrowLeft,
  Loader2, RefreshCw, CheckCircle2, Circle, ChevronDown, ChevronUp,
  X, GraduationCap, Layers, CalendarDays, Clock, Eye, GripVertical,
  CheckCheck, XCircle, TrendingUp, Sparkles, Crown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/ui/EmptyState';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Department {
  id: string;
  name: string;
  code?: string | null;
}

interface Program {
  id: string;
  name: string;
  code?: string | null;
  departmentId: string;
}

interface CurriculumItem {
  id: string;
  curriculumId: string;
  subjectCode: string;
  subjectName: string;
  description?: string | null;
  units: number;
  yearLevel: number;
  semester: string;
  isComplete: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface Curriculum {
  id: string;
  name: string;
  description?: string | null;
  departmentId?: string | null;
  programId?: string | null;
  classType?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  department?: Department | null;
  program?: Program | null;
  _count?: { items: number };
  completedItems?: number;
  completionRate?: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const YEAR_LEVELS = [
  { value: 1, label: '1st Year' },
  { value: 2, label: '2nd Year' },
  { value: 3, label: '3rd Year' },
  { value: 4, label: '4th Year' },
];

const SEMESTERS = [
  { value: '1st Semester', label: '1st Semester' },
  { value: '2nd Semester', label: '2nd Semester' },
  { value: 'Summer', label: 'Summer' },
];

const YEAR_SEM_COLORS: Record<string, string> = {
  '1-1st Semester': 'from-emerald-500 to-teal-500',
  '1-2nd Semester': 'from-teal-500 to-cyan-500',
  '1-Summer': 'from-cyan-500 to-sky-500',
  '2-1st Semester': 'from-amber-500 to-orange-500',
  '2-2nd Semester': 'from-orange-500 to-red-500',
  '2-Summer': 'from-red-500 to-rose-500',
  '3-1st Semester': 'from-violet-500 to-purple-500',
  '3-2nd Semester': 'from-purple-500 to-fuchsia-500',
  '3-Summer': 'from-fuchsia-500 to-pink-500',
  '4-1st Semester': 'from-rose-500 to-pink-500',
  '4-2nd Semester': 'from-pink-500 to-fuchsia-500',
  '4-Summer': 'from-fuchsia-500 to-violet-500',
};

function getYearSemColor(year: number, semester: string): string {
  return YEAR_SEM_COLORS[`${year}-${semester}`] || 'from-emerald-500 to-teal-500';
}

function getYearSemBadgeStyle(year: number, semester: string): string {
  const colors: Record<string, string> = {
    '1-1st Semester': 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
    '1-2nd Semester': 'bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-500/20',
    '1-Summer': 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-500/20',
    '2-1st Semester': 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20',
    '2-2nd Semester': 'bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-500/20',
    '2-Summer': 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20',
    '3-1st Semester': 'bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-500/20',
    '3-2nd Semester': 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-500/20',
    '3-Summer': 'bg-fuchsia-50 dark:bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-400 border-fuchsia-200 dark:border-fuchsia-500/20',
    '4-1st Semester': 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20',
    '4-2nd Semester': 'bg-pink-50 dark:bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-200 dark:border-pink-500/20',
    '4-Summer': 'bg-fuchsia-50 dark:bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-400 border-fuchsia-200 dark:border-fuchsia-500/20',
  };
  return colors[`${year}-${semester}`] || 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CurriculumView() {
  // --- Main list state ---
  const [curricula, setCurricula] = useState<Curriculum[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // --- Detail view state ---
  const [selectedCurriculum, setSelectedCurriculum] = useState<Curriculum | null>(null);
  const [detailItems, setDetailItems] = useState<CurriculumItem[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // --- Dialog state ---
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingCurriculum, setEditingCurriculum] = useState<Curriculum | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // --- Item form state ---
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editItemDialogOpen, setEditItemDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<CurriculumItem | null>(null);
  const [deleteItemDialogOpen, setDeleteItemDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<CurriculumItem | null>(null);
  const [itemSaving, setItemSaving] = useState(false);

  // --- Department/Program selects ---
  const [departments, setDepartments] = useState<Department[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);

  // --- Collapsed sections ---
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [itemSearch, setItemSearch] = useState('');

  // --- Item form data ---
  const [itemForm, setItemForm] = useState({
    subjectCode: '',
    subjectName: '',
    description: '',
    units: 3,
    yearLevel: 1,
    semester: '1st Semester',
  });

  // --- Curriculum form data ---
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    departmentId: '',
    programId: '',
    classType: 'regular',
  });

  // --- Class Type filter ---
  const [classTypeFilter, setClassTypeFilter] = useState<string>('all');

  // =========================================================================
  // Fetch helpers
  // =========================================================================

  const fetchCurricula = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/curricula?includeInactive=true');
      if (!res.ok) throw new Error('Failed to fetch curricula');
      const data = await res.json();
      setCurricula(data);
    } catch (error) {
      console.error('Error fetching curricula:', error);
      toast.error('Failed to load curricula');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await fetch('/api/departments');
      if (!res.ok) throw new Error('Failed to fetch departments');
      const data = await res.json();
      setDepartments(data);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  }, []);

  const fetchPrograms = useCallback(async () => {
    try {
      const res = await fetch('/api/programs?includeInactive=true');
      if (!res.ok) throw new Error('Failed to fetch programs');
      const data = await res.json();
      setPrograms(data);
    } catch (error) {
      console.error('Error fetching programs:', error);
    }
  }, []);

  const fetchCurriculumDetail = useCallback(async (curriculumId: string) => {
    try {
      setDetailLoading(true);
      const res = await fetch(`/api/curricula/${curriculumId}`);
      if (!res.ok) throw new Error('Failed to fetch curriculum');
      const data = await res.json();
      setSelectedCurriculum(data);
      setDetailItems(data.items || []);
    } catch (error) {
      console.error('Error fetching curriculum detail:', error);
      toast.error('Failed to load curriculum details');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurricula();
    fetchDepartments();
    fetchPrograms();
  }, [fetchCurricula, fetchDepartments, fetchPrograms]);

  // =========================================================================
  // Computed values
  // =========================================================================

  const filteredCurricula = useMemo(() => {
    let result = curricula;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.description || '').toLowerCase().includes(q) ||
          (c.department?.name || '').toLowerCase().includes(q) ||
          (c.program?.name || '').toLowerCase().includes(q)
      );
    }
    if (classTypeFilter !== 'all') {
      result = result.filter((c) => (c.classType || 'regular') === classTypeFilter);
    }
    return result;
  }, [curricula, searchQuery, classTypeFilter]);

  const stats = useMemo(() => {
    const total = curricula.length;
    const active = curricula.filter((c) => c.isActive).length;
    const totalSubjects = curricula.reduce((sum, c) => sum + (c._count?.items || 0), 0);
    const completedSubjects = curricula.reduce((sum, c) => sum + (c.completedItems || 0), 0);
    const completionRate = totalSubjects > 0 ? Math.round((completedSubjects / totalSubjects) * 100) : 0;
    return { total, active, totalSubjects, completionRate };
  }, [curricula]);

  const filteredItems = useMemo(() => {
    if (!itemSearch) return detailItems;
    const q = itemSearch.toLowerCase();
    return detailItems.filter(
      (item) =>
        item.subjectCode.toLowerCase().includes(q) ||
        item.subjectName.toLowerCase().includes(q)
    );
  }, [detailItems, itemSearch]);

  // Group items by year level and semester
  const groupedItems = useMemo(() => {
    const groups: Record<string, CurriculumItem[]> = {};
    for (const item of filteredItems) {
      const key = `${item.yearLevel}-${item.semester}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }
    // Sort keys
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredItems]);

  // Per-year completion rates
  const yearProgress = useMemo(() => {
    const progress: Record<number, { total: number; completed: number; rate: number }> = {};
    for (const item of detailItems) {
      if (!progress[item.yearLevel]) progress[item.yearLevel] = { total: 0, completed: 0, rate: 0 };
      progress[item.yearLevel].total++;
      if (item.isComplete) progress[item.yearLevel].completed++;
    }
    for (const year of Object.keys(progress)) {
      const p = progress[Number(year)];
      p.rate = p.total > 0 ? Math.round((p.completed / p.total) * 100) : 0;
    }
    return progress;
  }, [detailItems]);

  // Filtered programs by selected department in form
  const filteredPrograms = useMemo(() => {
    if (!formData.departmentId) return programs;
    return programs.filter((p) => p.departmentId === formData.departmentId);
  }, [programs, formData.departmentId]);

  // =========================================================================
  // Handlers - Curricula
  // =========================================================================

  const openCreateDialog = () => {
    setEditingCurriculum(null);
    setFormData({ name: '', description: '', departmentId: '', programId: '', classType: 'regular' });
    setCreateDialogOpen(true);
  };

  const openEditDialog = (curriculum: Curriculum) => {
    setEditingCurriculum(curriculum);
    setFormData({
      name: curriculum.name,
      description: curriculum.description || '',
      departmentId: curriculum.departmentId || '',
      programId: curriculum.programId || '',
      classType: curriculum.classType || 'regular',
    });
    setEditDialogOpen(true);
  };

  const handleSaveCurriculum = async (isEdit: boolean) => {
    if (!formData.name.trim()) {
      toast.error('Curriculum name is required');
      return;
    }
    setSaving(true);
    try {
      const url = isEdit ? `/api/curricula/${editingCurriculum!.id}` : '/api/curricula';
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save curriculum');
      toast.success(isEdit ? 'Curriculum updated successfully' : 'Curriculum created successfully');
      if (isEdit) setEditDialogOpen(false);
      else setCreateDialogOpen(false);
      fetchCurricula();
    } catch (error) {
      console.error('Error saving curriculum:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save curriculum');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCurriculum = async () => {
    if (!editingCurriculum) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/curricula/${editingCurriculum.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete curriculum');
      toast.success('Curriculum deleted successfully');
      setDeleteDialogOpen(false);
      fetchCurricula();
    } catch (error) {
      console.error('Error deleting curriculum:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete curriculum');
    } finally {
      setDeleting(false);
    }
  };

  const handleViewDetails = (curriculum: Curriculum) => {
    setItemSearch('');
    setCollapsedSections(new Set());
    fetchCurriculumDetail(curriculum.id);
  };

  // =========================================================================
  // Handlers - Items
  // =========================================================================

  const openAddItemDialog = () => {
    setItemForm({
      subjectCode: '',
      subjectName: '',
      description: '',
      units: 3,
      yearLevel: 1,
      semester: '1st Semester',
    });
    setItemDialogOpen(true);
  };

  const openEditItemDialog = (item: CurriculumItem) => {
    setEditItem(item);
    setItemForm({
      subjectCode: item.subjectCode,
      subjectName: item.subjectName,
      description: item.description || '',
      units: item.units,
      yearLevel: item.yearLevel,
      semester: item.semester,
    });
    setEditItemDialogOpen(true);
  };

  const handleSaveItem = async (isEdit: boolean) => {
    if (!selectedCurriculum) return;
    if (!itemForm.subjectCode.trim() || !itemForm.subjectName.trim()) {
      toast.error('Subject code and name are required');
      return;
    }
    setItemSaving(true);
    try {
      let url: string;
      let method: string;
      if (isEdit && editItem) {
        url = `/api/curricula/items/${editItem.id}`;
        method = 'PUT';
      } else {
        url = `/api/curricula/${selectedCurriculum.id}/items`;
        method = 'POST';
      }
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save item');
      toast.success(isEdit ? 'Item updated successfully' : 'Item added successfully');
      if (isEdit) setEditItemDialogOpen(false);
      else setItemDialogOpen(false);
      fetchCurriculumDetail(selectedCurriculum.id);
      fetchCurricula();
    } catch (error) {
      console.error('Error saving item:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save item');
    } finally {
      setItemSaving(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!deletingItem || !selectedCurriculum) return;
    try {
      const res = await fetch(`/api/curricula/items/${deletingItem.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete item');
      toast.success('Item deleted successfully');
      setDeleteItemDialogOpen(false);
      setDeletingItem(null);
      fetchCurriculumDetail(selectedCurriculum.id);
      fetchCurricula();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete item');
    }
  };

  const handleToggleItemComplete = async (item: CurriculumItem) => {
    if (!selectedCurriculum) return;
    try {
      const res = await fetch(`/api/curricula/items/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isComplete: !item.isComplete }),
      });
      if (!res.ok) throw new Error('Failed to update item');
      // Optimistic update
      setDetailItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, isComplete: !item.isComplete } : i))
      );
      // Refresh detail to get accurate counts
      fetchCurriculumDetail(selectedCurriculum.id);
      fetchCurricula();
    } catch (error) {
      console.error('Error toggling item:', error);
      toast.error('Failed to update item');
    }
  };

  const handleBatchToggle = async (isComplete: boolean) => {
    if (!selectedCurriculum || detailItems.length === 0) return;
    const itemIds = detailItems.map((i) => i.id);
    try {
      const res = await fetch(`/api/curricula/${selectedCurriculum.id}/items/batch-toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds, isComplete }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to batch update');
      toast.success(data.message || `Items updated successfully`);
      fetchCurriculumDetail(selectedCurriculum.id);
      fetchCurricula();
    } catch (error) {
      console.error('Error batch toggling:', error);
      toast.error('Failed to batch update items');
    }
  };

  const handleMoveItem = async (item: CurriculumItem, direction: 'up' | 'down') => {
    if (!selectedCurriculum) return;
    const groupKey = `${item.yearLevel}-${item.semester}`;
    const groupItems = detailItems.filter((i) => `${i.yearLevel}-${i.semester}` === groupKey);
    const currentIndex = groupItems.findIndex((i) => i.id === item.id);
    if (direction === 'up' && currentIndex <= 0) return;
    if (direction === 'down' && currentIndex >= groupItems.length - 1) return;

    const swapItem = groupItems[currentIndex + (direction === 'up' ? -1 : 1)];
    try {
      await fetch(`/api/curricula/items/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sortOrder: swapItem.sortOrder }),
      });
      await fetch(`/api/curricula/items/${swapItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sortOrder: item.sortOrder }),
      });
      fetchCurriculumDetail(selectedCurriculum.id);
    } catch (error) {
      console.error('Error moving item:', error);
      toast.error('Failed to reorder item');
    }
  };

  const toggleSection = (key: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // =========================================================================
  // Loading skeleton
  // =========================================================================

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Header skeleton */}
        <div className="space-y-2">
          <div className="skeleton-line h-8 w-64" />
          <div className="skeleton-line h-1 w-20" />
          <div className="skeleton-line h-4 w-80 mt-2" />
        </div>
        {/* Stats skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="overflow-hidden">
              <div className="h-12 bg-gradient-to-br from-emerald-500/20 to-teal-500/20" />
              <CardContent className="pt-4 space-y-2">
                <div className="skeleton-line h-6 w-16" />
                <div className="skeleton-line h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
        {/* Cards skeleton */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden">
              <div className="skeleton-line h-1.5 w-full" />
              <CardContent className="pt-4 space-y-3">
                <div className="skeleton-line h-5 w-3/4" />
                <div className="skeleton-line h-3 w-full" />
                <div className="skeleton-line h-3 w-1/2" />
                <div className="skeleton-line h-2 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // =========================================================================
  // Detail view
  // =========================================================================

  if (selectedCurriculum) {
    const overallCompletion =
      detailItems.length > 0
        ? Math.round((detailItems.filter((i) => i.isComplete).length / detailItems.length) * 100)
        : 0;

    return (
      <motion.div
        key="detail"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        {/* Back button + header */}
        <div className="flex items-start gap-4">
          <Button
            variant="outline"
            size="sm"
            className="mt-1 shrink-0"
            onClick={() => setSelectedCurriculum(null)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-600">
                  {selectedCurriculum.name}
                </h1>
                <div className="h-1 w-20 mt-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" />
                <p className="text-muted-foreground mt-1 line-clamp-2">
                  {selectedCurriculum.description || 'No description'}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge
                  className={cn(
                    'border',
                    selectedCurriculum.isActive
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                      : 'bg-muted text-muted-foreground border-border'
                  )}
                >
                  {selectedCurriculum.isActive ? 'Active' : 'Inactive'}
                </Badge>
                {(selectedCurriculum.classType || 'regular') === 'executive' && (
                  <Badge variant="outline" className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/25">
                    <Crown className="h-3 w-3 mr-1" />
                    Executive
                  </Badge>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditDialog(selectedCurriculum)}
                >
                  <Edit3 className="h-4 w-4 mr-1.5" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    setEditingCurriculum(selectedCurriculum);
                    setDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Department / Program badges */}
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {selectedCurriculum.department && (
                <Badge variant="outline" className="gap-1.5">
                  <Building2 className="h-3 w-3" />
                  {selectedCurriculum.department.name}
                </Badge>
              )}
              {selectedCurriculum.program && (
                <Badge variant="outline" className="gap-1.5">
                  <GraduationCap className="h-3 w-3" />
                  {selectedCurriculum.program.name}
                </Badge>
              )}
              <Badge variant="secondary" className="gap-1.5">
                <Layers className="h-3 w-3" />
                {detailItems.length} item{detailItems.length !== 1 ? 's' : ''}
              </Badge>
              <Badge variant="secondary" className="gap-1.5">
                <CalendarDays className="h-3 w-3" />
                {new Date(selectedCurriculum.createdAt).toLocaleDateString()}
              </Badge>
            </div>
          </div>
        </div>

        {/* Overall progress */}
        <Card className="glass-card overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-lg">Overall Progress</h3>
                <p className="text-sm text-muted-foreground">
                  {detailItems.filter((i) => i.isComplete).length} of {detailItems.length} items completed
                </p>
              </div>
              <div className="relative flex items-center justify-center">
                {/* SVG progress ring */}
                <svg className="h-20 w-20 -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    className="text-muted/30"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="url(#progressGradient)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={`${overallCompletion}, 100`}
                    className="transition-all duration-700 ease-out"
                  />
                  <defs>
                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#14b8a6" />
                    </linearGradient>
                  </defs>
                </svg>
                <span className="absolute text-xl font-bold">{overallCompletion}%</span>
              </div>
            </div>
            <div className="h-3 rounded-full bg-muted overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${overallCompletion}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
              />
            </div>

            {/* Year-level progress breakdown */}
            {Object.keys(yearProgress).length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                {YEAR_LEVELS.map((yl) => {
                  const p = yearProgress[yl.value];
                  if (!p) return null;
                  return (
                    <div
                      key={yl.value}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50"
                    >
                      <span className="text-xs font-medium text-muted-foreground w-14 shrink-0">
                        {yl.label}
                      </span>
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                          style={{ width: `${p.rate}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold tabular-nums w-8 text-right">
                        {p.rate}%
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add item + search + bulk actions */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <Button onClick={openAddItemDialog} className="shrink-0">
            <Plus className="h-4 w-4 mr-2" />
            Add Subject
          </Button>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search subjects..."
              value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBatchToggle(true)}
              disabled={detailItems.length === 0}
            >
              <CheckCheck className="h-4 w-4 mr-1.5" />
              Mark All Complete
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBatchToggle(false)}
              disabled={detailItems.length === 0}
            >
              <XCircle className="h-4 w-4 mr-1.5" />
              Mark All Incomplete
            </Button>
          </div>
        </div>

        {/* Items grouped by year/semester */}
        {detailLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : groupedItems.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title={itemSearch ? 'No matching subjects' : 'No subjects yet'}
            description={
              itemSearch
                ? 'No subjects match your search. Try different keywords.'
                : 'Start building this curriculum by adding subjects.'
            }
            action={
              !itemSearch
                ? { label: 'Add First Subject', icon: Plus, onClick: openAddItemDialog }
                : undefined
            }
          />
        ) : (
          <div className="space-y-4">
            {groupedItems.map(([key, items], groupIdx) => {
              const [yearStr, semester] = key.split('-', 2);
              const year = Number(yearStr);
              const isCollapsed = collapsedSections.has(key);
              const completedInGroup = items.filter((i) => i.isComplete).length;
              const groupRate = items.length > 0 ? Math.round((completedInGroup / items.length) * 100) : 0;

              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: groupIdx * 0.05 }}
                >
                  {/* Section header */}
                  <button
                    onClick={() => toggleSection(key)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-card border border-border hover:border-emerald-500/30 transition-all duration-200 group"
                  >
                    <div
                      className={cn(
                        'h-8 w-1 rounded-full bg-gradient-to-b shrink-0 transition-opacity',
                        getYearSemColor(year, semester),
                        isCollapsed ? 'opacity-40' : 'opacity-100'
                      )}
                    />
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="font-semibold text-sm">
                        {YEAR_LEVELS.find((y) => y.value === year)?.label || `Year ${year}`}
                      </span>
                      <Separator orientation="vertical" className="h-4" />
                      <span className="text-sm text-muted-foreground">{semester}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {completedInGroup}/{items.length}
                      </span>
                      <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden hidden sm:block">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                          style={{ width: `${groupRate}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium tabular-nums w-8 text-right">{groupRate}%</span>
                      <motion.div
                        animate={{ rotate: isCollapsed ? 0 : 180 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      </motion.div>
                    </div>
                  </button>

                  {/* Items */}
                  <AnimatePresence>
                    {!isCollapsed && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-2 space-y-1.5 pl-2">
                          {items.map((item, itemIdx) => (
                            <motion.div
                              key={item.id}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: itemIdx * 0.03 }}
                            >
                              <div
                                className={cn(
                                  'flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all duration-150 group/item hover:shadow-sm',
                                  item.isComplete
                                    ? 'bg-emerald-50/50 dark:bg-emerald-500/5 border-emerald-200/50 dark:border-emerald-500/10'
                                    : 'bg-card border-border hover:border-emerald-500/20'
                                )}
                              >
                                {/* Checkbox */}
                                <Checkbox
                                  checked={item.isComplete}
                                  onCheckedChange={() => handleToggleItemComplete(item)}
                                  className="shrink-0"
                                />

                                {/* Grip + info */}
                                <div className="flex-1 min-w-0 flex items-center gap-2">
                                  <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0 hidden sm:block" />

                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-mono text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                        {item.subjectCode}
                                      </span>
                                      <span
                                        className={cn(
                                          'text-sm truncate',
                                          item.isComplete && 'line-through text-muted-foreground'
                                        )}
                                      >
                                        {item.subjectName}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                      <Badge
                                        variant="outline"
                                        className={cn('text-[10px] px-1.5 py-0', getYearSemBadgeStyle(year, semester))}
                                      >
                                        {YEAR_LEVELS.find((y) => y.value === year)?.label || `Y${year}`}
                                      </Badge>
                                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                        {semester}
                                      </Badge>
                                      <Badge
                                        variant="secondary"
                                        className="text-[10px] px-1.5 py-0"
                                      >
                                        {item.units} unit{item.units !== 1 ? 's' : ''}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover/item:opacity-100 transition-opacity duration-150">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={() => handleMoveItem(item, 'up')}
                                    disabled={items.indexOf(item) === 0}
                                  >
                                    <ChevronUp className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={() => handleMoveItem(item, 'down')}
                                    disabled={items.indexOf(item) === items.length - 1}
                                  >
                                    <ChevronDown className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={() => openEditItemDialog(item)}
                                  >
                                    <Edit3 className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                    onClick={() => {
                                      setDeletingItem(item);
                                      setDeleteItemDialogOpen(true);
                                    }}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* ================================================================= */}
        {/* DIALOGS - Detail View */}
        {/* ================================================================= */}

        {/* Add Item Dialog */}
        <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
          <DialogContent className="sm:max-w-lg dialog-header-accent">
            <div className="h-1 w-full bg-gradient-to-r from-emerald-500 to-teal-500 -mt-6 -mx-6 mb-4 rounded-t-lg" />
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                  <Plus className="h-4 w-4 text-emerald-600" />
                </div>
                Add Subject
              </DialogTitle>
              <DialogDescription>Add a new subject/topic to this curriculum.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="item-code">
                    Subject Code <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="item-code"
                    value={itemForm.subjectCode}
                    onChange={(e) => setItemForm({ ...itemForm, subjectCode: e.target.value })}
                    placeholder="e.g., CS101"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="item-units">
                    Units <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="item-units"
                    type="number"
                    min={1}
                    max={10}
                    value={itemForm.units}
                    onChange={(e) => setItemForm({ ...itemForm, units: Number(e.target.value) || 1 })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="item-name">
                  Subject Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="item-name"
                  value={itemForm.subjectName}
                  onChange={(e) => setItemForm({ ...itemForm, subjectName: e.target.value })}
                  placeholder="e.g., Introduction to Computer Science"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="item-desc">Description</Label>
                <Textarea
                  id="item-desc"
                  value={itemForm.description}
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  placeholder="Brief description (optional)"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Year Level</Label>
                  <Select
                    value={String(itemForm.yearLevel)}
                    onValueChange={(v) => setItemForm({ ...itemForm, yearLevel: Number(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {YEAR_LEVELS.map((yl) => (
                        <SelectItem key={yl.value} value={String(yl.value)}>
                          {yl.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Semester</Label>
                  <Select
                    value={itemForm.semester}
                    onValueChange={(v) => setItemForm({ ...itemForm, semester: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SEMESTERS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setItemDialogOpen(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button onClick={() => handleSaveItem(false)} disabled={itemSaving} className="w-full sm:w-auto">
                {itemSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Subject
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Item Dialog */}
        <Dialog open={editItemDialogOpen} onOpenChange={setEditItemDialogOpen}>
          <DialogContent className="sm:max-w-lg dialog-header-accent">
            <div className="h-1 w-full bg-gradient-to-r from-emerald-500 to-teal-500 -mt-6 -mx-6 mb-4 rounded-t-lg" />
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                  <Edit3 className="h-4 w-4 text-emerald-600" />
                </div>
                Edit Subject
              </DialogTitle>
              <DialogDescription>Update subject details.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-item-code">
                    Subject Code <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="edit-item-code"
                    value={itemForm.subjectCode}
                    onChange={(e) => setItemForm({ ...itemForm, subjectCode: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-item-units">Units</Label>
                  <Input
                    id="edit-item-units"
                    type="number"
                    min={1}
                    max={10}
                    value={itemForm.units}
                    onChange={(e) => setItemForm({ ...itemForm, units: Number(e.target.value) || 1 })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-item-name">
                  Subject Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-item-name"
                  value={itemForm.subjectName}
                  onChange={(e) => setItemForm({ ...itemForm, subjectName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-item-desc">Description</Label>
                <Textarea
                  id="edit-item-desc"
                  value={itemForm.description}
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Year Level</Label>
                  <Select
                    value={String(itemForm.yearLevel)}
                    onValueChange={(v) => setItemForm({ ...itemForm, yearLevel: Number(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {YEAR_LEVELS.map((yl) => (
                        <SelectItem key={yl.value} value={String(yl.value)}>
                          {yl.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Semester</Label>
                  <Select
                    value={itemForm.semester}
                    onValueChange={(v) => setItemForm({ ...itemForm, semester: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SEMESTERS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setEditItemDialogOpen(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button onClick={() => handleSaveItem(true)} disabled={itemSaving} className="w-full sm:w-auto">
                {itemSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Update Subject
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Item Confirmation */}
        <AlertDialog open={deleteItemDialogOpen} onOpenChange={setDeleteItemDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </div>
                Delete Subject
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove{' '}
                <strong>{deletingItem?.subjectCode} — {deletingItem?.subjectName}</strong> from the
                curriculum? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteItem}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Edit Curriculum Dialog (detail view) */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-lg dialog-header-accent">
            <div className="h-1 w-full bg-gradient-to-r from-emerald-500 to-teal-500 -mt-6 -mx-6 mb-4 rounded-t-lg" />
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                  <Edit3 className="h-4 w-4 text-emerald-600" />
                </div>
                Edit Curriculum
              </DialogTitle>
              <DialogDescription>Update curriculum information.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="edit-name">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Curriculum name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-desc">Description</Label>
                <Textarea
                  id="edit-desc"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description (optional)"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select
                    value={formData.departmentId || 'none'}
                    onValueChange={(v) =>
                      setFormData({ ...formData, departmentId: v === 'none' ? '' : v, programId: '' })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Program</Label>
                  <Select
                    value={formData.programId || 'none'}
                    onValueChange={(v) => setFormData({ ...formData, programId: v === 'none' ? '' : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select program" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {filteredPrograms.map((prog) => (
                        <SelectItem key={prog.id} value={prog.id}>
                          {prog.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Class Type</Label>
                <Select
                  value={formData.classType || 'regular'}
                  onValueChange={(v) => setFormData({ ...formData, classType: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select class type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular">Regular</SelectItem>
                    <SelectItem value="executive">Executive (Masteral)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Executive curricula are for masteral degree programs</p>
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button onClick={() => handleSaveCurriculum(true)} disabled={saving} className="w-full sm:w-auto">
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Update Curriculum
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Curriculum Dialog (detail view) */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </div>
                Delete Curriculum
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete <strong>{editingCurriculum?.name}</strong>? All{' '}
                {editingCurriculum?._count?.items || 0} associated subject items will also be permanently
                deleted. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteCurriculum}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </motion.div>
    );
  }

  // =========================================================================
  // Main list view
  // =========================================================================

  return (
    <motion.div
      key="list"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-600">
            Curriculum Management
          </h1>
          <div className="h-1 w-20 mt-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" />
          <p className="text-muted-foreground mt-1">
            Design and track academic curricula across departments and programs
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchCurricula}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Create Curriculum
          </Button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
        >
          <Card className="card-hover overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <div className="h-12 bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-between px-4">
              <Layers className="h-5 w-5 text-white/80" />
              <span className="text-xs font-medium text-white/70">TOTAL</span>
            </div>
            <CardContent className="pt-4">
              <div className="text-3xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground mt-1">Total Curricula</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card className="card-hover overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <div className="h-12 bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-between px-4">
              <CheckCircle2 className="h-5 w-5 text-white/80" />
              <span className="text-xs font-medium text-white/70">ACTIVE</span>
            </div>
            <CardContent className="pt-4">
              <div className="text-3xl font-bold">{stats.active}</div>
              <p className="text-xs text-muted-foreground mt-1">Active Curricula</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="card-hover overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <div className="h-12 bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-between px-4">
              <BookOpen className="h-5 w-5 text-white/80" />
              <span className="text-xs font-medium text-white/70">SUBJECTS</span>
            </div>
            <CardContent className="pt-4">
              <div className="text-3xl font-bold">{stats.totalSubjects}</div>
              <p className="text-xs text-muted-foreground mt-1">Total Subjects</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="card-hover overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <div className="h-12 bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-between px-4">
              <TrendingUp className="h-5 w-5 text-white/80" />
              <span className="text-xs font-medium text-white/70">COMPLETION</span>
            </div>
            <CardContent className="pt-4">
              <div className="text-3xl font-bold">{stats.completionRate}%</div>
              <p className="text-xs text-muted-foreground mt-1">Avg Completion</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Search + Class Type filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search curricula by name, description, department, or program..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
              onClick={() => setSearchQuery('')}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        <div className="w-full sm:w-48 shrink-0">
          <Select value={classTypeFilter} onValueChange={setClassTypeFilter}>
            <SelectTrigger className="h-9 w-full text-sm">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="regular">Regular</SelectItem>
              <SelectItem value="executive">Executive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Curriculum Cards Grid */}
      {filteredCurricula.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title={searchQuery ? 'No curricula found' : 'No curricula yet'}
          description={
            searchQuery
              ? 'No curricula match your search. Try adjusting your keywords.'
              : 'Create your first curriculum to start organizing subjects and tracking progress.'
          }
          action={
            !searchQuery
              ? { label: 'Create Curriculum', icon: Plus, onClick: openCreateDialog }
              : { label: 'Clear Search', icon: X, onClick: () => setSearchQuery('') }
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {filteredCurricula.map((curriculum, index) => {
              const totalItems = curriculum._count?.items || 0;
              const completed = curriculum.completedItems || 0;
              const rate = curriculum.completionRate || 0;

              return (
                <motion.div
                  key={curriculum.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.04 }}
                >
                  <Card
                    className={cn(
                      'group overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:border-emerald-500/30 card-shine',
                      !curriculum.isActive && 'opacity-60'
                    )}
                  >
                    {/* Gradient accent bar */}
                    <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 transition-opacity duration-200 opacity-60 group-hover:opacity-100" />

                    <CardContent className="pt-4 space-y-3">
                      {/* Name + status */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div
                            className={cn(
                              'p-2.5 rounded-lg shrink-0 transition-colors duration-200',
                              curriculum.isActive
                                ? 'bg-emerald-500/10 group-hover:bg-emerald-500/15'
                                : 'bg-muted'
                            )}
                          >
                            <BookOpen
                              className={cn(
                                'h-5 w-5',
                                curriculum.isActive
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-muted-foreground'
                              )}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-sm truncate">{curriculum.name}</h3>
                            {!curriculum.isActive && (
                              <Badge variant="secondary" className="text-[10px] mt-0.5">
                                Inactive
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {curriculum.description || 'No description provided'}
                      </p>

                      {/* Badges */}
                      <div className="flex items-center gap-1.5 flex-wrap text-xs text-muted-foreground">
                        {(curriculum.classType || 'regular') === 'executive' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 font-medium">
                            <Crown className="h-3 w-3 shrink-0" />
                            <span>Executive</span>
                          </span>
                        )}
                        {curriculum.department && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium">
                            <Building2 className="h-3 w-3 shrink-0" />
                            <span className="truncate max-w-[100px]">{curriculum.department.name}</span>
                          </span>
                        )}
                        {curriculum.program && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 font-medium">
                            <GraduationCap className="h-3 w-3 shrink-0" />
                            <span className="truncate max-w-[100px]">{curriculum.program.name}</span>
                          </span>
                        )}
                        {totalItems > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 font-medium">
                            <Layers className="h-3 w-3" />
                            {totalItems} items
                          </span>
                        )}
                      </div>

                      {/* Progress */}
                      {totalItems > 0 && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                              {completed}/{totalItems} completed
                            </span>
                            <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                              {rate}%
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${rate}%` }}
                              transition={{ duration: 0.6, ease: 'easeOut', delay: index * 0.04 }}
                              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                            />
                          </div>
                        </div>
                      )}

                      {/* Created date */}
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
                        <Clock className="h-3 w-3" />
                        {new Date(curriculum.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </div>

                      {/* Actions */}
                      <Separator />
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs flex-1"
                          onClick={() => handleViewDetails(curriculum)}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1.5" />
                          View Details
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                          onClick={() => openEditDialog(curriculum)}
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                          onClick={() => {
                            setEditingCurriculum(curriculum);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* =================================================================== */}
      {/* DIALOGS - List View */}
      {/* =================================================================== */}

      {/* Create Curriculum Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-lg dialog-header-accent">
          <div className="h-1 w-full bg-gradient-to-r from-emerald-500 to-teal-500 -mt-6 -mx-6 mb-4 rounded-t-lg" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                <Sparkles className="h-4 w-4 text-emerald-600" />
              </div>
              Create Curriculum
            </DialogTitle>
            <DialogDescription>
              Define a new curriculum to organize subjects and track progress.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="create-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="create-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., BS Computer Science Curriculum 2024"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-desc">Description</Label>
              <Textarea
                id="create-desc"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the curriculum (optional)"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Department</Label>
                <Select
                  value={formData.departmentId || 'none'}
                  onValueChange={(v) =>
                    setFormData({ ...formData, departmentId: v === 'none' ? '' : v, programId: '' })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Program</Label>
                <Select
                  value={formData.programId || 'none'}
                  onValueChange={(v) => setFormData({ ...formData, programId: v === 'none' ? '' : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select program (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {filteredPrograms.map((prog) => (
                      <SelectItem key={prog.id} value={prog.id}>
                        {prog.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Class Type</Label>
              <Select
                value={formData.classType || 'regular'}
                onValueChange={(v) => setFormData({ ...formData, classType: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select class type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">Regular</SelectItem>
                  <SelectItem value="executive">Executive (Masteral)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Executive curricula are for masteral degree programs</p>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button onClick={() => handleSaveCurriculum(false)} disabled={saving} className="w-full sm:w-auto">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Curriculum
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Curriculum Dialog (list view) */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg dialog-header-accent">
          <div className="h-1 w-full bg-gradient-to-r from-emerald-500 to-teal-500 -mt-6 -mx-6 mb-4 rounded-t-lg" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                <Edit3 className="h-4 w-4 text-emerald-600" />
              </div>
              Edit Curriculum
            </DialogTitle>
            <DialogDescription>Update curriculum information.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="list-edit-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="list-edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="list-edit-desc">Description</Label>
              <Textarea
                id="list-edit-desc"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Department</Label>
                <Select
                  value={formData.departmentId || 'none'}
                  onValueChange={(v) =>
                    setFormData({ ...formData, departmentId: v === 'none' ? '' : v, programId: '' })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Program</Label>
                <Select
                  value={formData.programId || 'none'}
                  onValueChange={(v) => setFormData({ ...formData, programId: v === 'none' ? '' : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select program" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {filteredPrograms.map((prog) => (
                      <SelectItem key={prog.id} value={prog.id}>
                        {prog.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Class Type</Label>
              <Select
                value={formData.classType || 'regular'}
                onValueChange={(v) => setFormData({ ...formData, classType: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select class type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">Regular</SelectItem>
                  <SelectItem value="executive">Executive (Masteral)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Executive curricula are for masteral degree programs</p>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button onClick={() => handleSaveCurriculum(true)} disabled={saving} className="w-full sm:w-auto">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Curriculum
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Curriculum Dialog (list view) */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10">
                <Trash2 className="h-4 w-4 text-destructive" />
              </div>
              Delete Curriculum
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{editingCurriculum?.name}</strong>? All{' '}
              {editingCurriculum?._count?.items || 0} associated subject items will be permanently
              deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedCurriculum) {
                  setSelectedCurriculum(null);
                }
                handleDeleteCurriculum();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
