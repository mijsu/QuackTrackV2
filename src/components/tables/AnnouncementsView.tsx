'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
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
  Megaphone,
  Plus,
  Search,
  Pencil,
  Trash2,
  Flame,
  CheckCircle2,
  BarChart3,
  AlertTriangle,
  Info,
  Pin,
  Users,
  ShieldCheck,
  CalendarClock,
  Loader2,
  ChevronDown,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AnnouncementType = 'info' | 'warning' | 'success' | 'urgent';
type Priority = 'low' | 'medium' | 'high' | 'urgent';
type TargetAudience = 'all' | 'faculty' | 'admin';

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: AnnouncementType;
  priority: Priority;
  targetAudience: TargetAudience;
  date: string;
  author: string;
  pinned?: boolean;
  expiryDate?: string | null;
}

// ---------------------------------------------------------------------------
// Priority config
// ---------------------------------------------------------------------------

const priorityConfig: Record<
  Priority,
  {
    icon: React.ElementType;
    badgeVariant: 'secondary' | 'outline' | 'destructive';
    classes: string;
    cardBorderClass: string;
  }
> = {
  low: {
    icon: CheckCircle2,
    badgeVariant: 'secondary',
    classes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400',
    cardBorderClass: '',
  },
  medium: {
    icon: BarChart3,
    badgeVariant: 'outline',
    classes: 'border-amber-500/30 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30',
    cardBorderClass: '',
  },
  high: {
    icon: Flame,
    badgeVariant: 'destructive',
    classes: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400',
    cardBorderClass: 'border-l-red-400 dark:border-l-red-500',
  },
  urgent: {
    icon: AlertTriangle,
    badgeVariant: 'destructive',
    classes: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400',
    cardBorderClass: 'border-l-red-500 dark:border-l-red-400',
  },
};

const audienceLabels: Record<TargetAudience, string> = {
  all: 'All Users',
  faculty: 'Faculty Only',
  admin: 'Admin Only',
};

const audienceConfig: Record<TargetAudience, { icon: React.ElementType; classes: string }> = {
  all: { icon: Users, classes: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300 border-sky-200 dark:border-sky-800/50' },
  faculty: { icon: Users, classes: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 border-violet-200 dark:border-violet-800/50' },
  admin: { icon: ShieldCheck, classes: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200 dark:border-orange-800/50' },
};

const priorityFilterOptions: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'All Priorities' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.35, ease: [0.25, 0.8, 0.25, 1] },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.2 },
  },
};

// ---------------------------------------------------------------------------
// Skeleton card
// ---------------------------------------------------------------------------

function SkeletonCard() {
  return (
    <div className="rounded-xl border p-5 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <Skeleton className="h-5 w-3/4" />
        <div className="flex gap-1.5">
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
      <div className="flex items-center justify-between pt-2">
        <div className="flex gap-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="flex gap-1">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function AnnouncementsView() {
  // Data state
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sortNewest, setSortNewest] = useState(true);

  // Dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Form fields
  const [formTitle, setFormTitle] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [formPriority, setFormPriority] = useState<Priority>('medium');
  const [formAudience, setFormAudience] = useState<TargetAudience>('all');
  const [formPinned, setFormPinned] = useState(false);
  const [formExpiryDate, setFormExpiryDate] = useState('');
  const [formType, setFormType] = useState<AnnouncementType>('info');

  // -------------------------------------------------------------------------
  // Data fetching
  // -------------------------------------------------------------------------

  const fetchAnnouncements = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/announcements');
      if (!res.ok) throw new Error('Failed to fetch announcements');
      const data = await res.json();
      setAnnouncements(data);
    } catch {
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  // -------------------------------------------------------------------------
  // Filtered & sorted data
  // -------------------------------------------------------------------------

  const filteredAnnouncements = useMemo(() => {
    let result = [...announcements];

    // Filter by priority
    if (priorityFilter !== 'all') {
      result = result.filter((a) => a.priority === priorityFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.message.toLowerCase().includes(q) ||
          a.author.toLowerCase().includes(q)
      );
    }

    // Sort: pinned first, then by date
    result.sort((a, b) => {
      // Pinned items always first
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      // Then by date
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortNewest ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [announcements, priorityFilter, searchQuery, sortNewest]);

  // Stats
  const totalCount = announcements.length;
  const pinnedCount = announcements.filter((a) => a.pinned).length;
  const urgentCount = announcements.filter(
    (a) => a.priority === 'urgent' || a.priority === 'high'
  ).length;

  // -------------------------------------------------------------------------
  // Form handlers
  // -------------------------------------------------------------------------

  const resetForm = useCallback(() => {
    setFormTitle('');
    setFormMessage('');
    setFormPriority('medium');
    setFormAudience('all');
    setFormPinned(false);
    setFormExpiryDate('');
    setFormType('info');
    setEditingId(null);
  }, []);

  const openCreateForm = useCallback(() => {
    resetForm();
    setFormOpen(true);
  }, [resetForm]);

  const openEditForm = useCallback((announcement: Announcement) => {
    setEditingId(announcement.id);
    setFormTitle(announcement.title);
    setFormMessage(announcement.message);
    setFormPriority(announcement.priority as Priority);
    setFormAudience(announcement.targetAudience);
    setFormPinned(!!announcement.pinned);
    setFormExpiryDate(
      announcement.expiryDate
        ? new Date(announcement.expiryDate).toISOString().split('T')[0]
        : ''
    );
    // Map type from the existing data
    setFormType(announcement.type);
    setFormOpen(true);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!formTitle.trim() || !formMessage.trim()) {
      toast.error('Please fill in the title and content fields');
      return;
    }

    try {
      setSubmitting(true);

      if (editingId) {
        // Update existing announcement
        const res = await fetch('/api/announcements', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingId,
            title: formTitle.trim(),
            message: formMessage.trim(),
            type: formType,
            priority: formPriority,
            targetAudience: formAudience,
            pinned: formPinned,
            expiryDate: formExpiryDate || null,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Failed to update announcement');
        }

        toast.success('Announcement updated successfully');
      } else {
        // Create new announcement
        const res = await fetch('/api/announcements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: formTitle.trim(),
            message: formMessage.trim(),
            type: formType,
            priority: formPriority,
            targetAudience: formAudience,
            pinned: formPinned,
            expiryDate: formExpiryDate || null,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Failed to create announcement');
        }

        toast.success('Announcement created successfully');
      }

      setFormOpen(false);
      resetForm();
      fetchAnnouncements();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save announcement');
    } finally {
      setSubmitting(false);
    }
  }, [
    editingId,
    formTitle,
    formMessage,
    formType,
    formPriority,
    formAudience,
    formPinned,
    formExpiryDate,
    resetForm,
    fetchAnnouncements,
  ]);

  const handleDelete = useCallback(async () => {
    if (!deletingId) return;

    try {
      setDeleting(true);
      const res = await fetch(`/api/announcements?id=${deletingId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to delete announcement');
      }

      toast.success('Announcement deleted');
      setDeleteOpen(false);
      setDeletingId(null);
      fetchAnnouncements();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete announcement');
    } finally {
      setDeleting(false);
    }
  }, [deletingId, fetchAnnouncements]);

  const confirmDelete = useCallback((id: string) => {
    setDeletingId(id);
    setDeleteOpen(true);
  }, []);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col gap-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-600">Announcements</h1>
          <div className="h-1 w-20 mt-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" />
          <p className="text-muted-foreground mt-1">
            Manage and broadcast announcements to your team
          </p>
        </div>
        <Button onClick={openCreateForm} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          New Announcement
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <Card className="card-hover gradient-border stat-card-shine transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
          <div className="h-1 rounded-t-lg bg-gradient-to-r from-emerald-500 to-emerald-400" />
          <CardContent className="pt-4 pb-4 px-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total</p>
                <div className="text-2xl font-bold mt-1 counter-animate">{totalCount}</div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                <Megaphone className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover gradient-border stat-card-shine transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
          <div className="h-1 rounded-t-lg bg-gradient-to-r from-amber-500 to-amber-400" />
          <CardContent className="pt-4 pb-4 px-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Pinned</p>
                <div className="text-2xl font-bold mt-1 counter-animate">{pinnedCount}</div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
                <Pin className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover gradient-border stat-card-shine transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
          <div className="h-1 rounded-t-lg bg-gradient-to-r from-red-500 to-red-400" />
          <CardContent className="pt-4 pb-4 px-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Urgent/High</p>
                <div className="text-2xl font-bold mt-1 counter-animate">{urgentCount}</div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
                <Flame className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title, content, or author..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Priority filter */}
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {priorityFilterOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort toggle */}
        <Button
          variant="outline"
          onClick={() => setSortNewest(!sortNewest)}
          className="gap-2 shrink-0"
        >
          <CalendarClock className="h-4 w-4" />
          <span className="hidden sm:inline">
            {sortNewest ? 'Newest first' : 'Oldest first'}
          </span>
          <ChevronDown
            className={cn(
              'h-3 w-3 transition-transform',
              !sortNewest && 'rotate-180'
            )}
          />
        </Button>
      </div>

      {/* Announcements Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filteredAnnouncements.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="rounded-full bg-muted/50 p-6 mb-5">
            <Megaphone className="h-10 w-10 text-muted-foreground/60" />
          </div>
          <h3 className="text-lg font-semibold mb-1">No announcements yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm mb-6">
            {searchQuery || priorityFilter !== 'all'
              ? 'No announcements match your current filters. Try adjusting your search or filters.'
              : 'Create your first announcement to keep everyone informed'}
          </p>
          {!searchQuery && priorityFilter === 'all' && (
            <Button onClick={openCreateForm} variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Create Announcement
            </Button>
          )}
        </motion.div>
      ) : (
        <motion.div
          key={`${priorityFilter}-${searchQuery}-${sortNewest}`}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
        >
          <AnimatePresence mode="popLayout">
            {filteredAnnouncements.map((announcement) => {
              const priority = priorityConfig[announcement.priority as Priority] || priorityConfig.low;
              const PriorityIcon = priority.icon;
              const audience = audienceConfig[announcement.targetAudience] || audienceConfig.all;
              const AudienceIcon = audience.icon;
              const isPinned = !!announcement.pinned;
              const isUrgent = announcement.priority === 'urgent';

              return (
                <motion.div
                  key={announcement.id}
                  variants={cardVariants}
                  layout
                  exit="exit"
                >
                  <Card
                    className={cn(
                      'relative overflow-hidden transition-all duration-200 hover:shadow-md group',
                      'border-l-[4px]',
                      isPinned ? 'border-l-emerald-500 dark:border-l-emerald-400' : priority.cardBorderClass
                    )}
                  >
                    {/* Pinned indicator bar */}
                    {isPinned && (
                      <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-bl-lg flex items-center gap-1">
                        <Pin className="h-2.5 w-2.5" />
                        Pinned
                      </div>
                    )}

                    <CardContent className="p-5">
                      {/* Badges row */}
                      <div className="flex items-center gap-1.5 flex-wrap mb-3">
                        <Badge
                          variant={priority.badgeVariant}
                          className={cn(
                            'text-[10px] px-2 py-0.5 font-medium gap-1',
                            priority.classes,
                            isUrgent && 'animate-pulse'
                          )}
                        >
                          <PriorityIcon className="h-3 w-3" />
                          {announcement.priority}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] px-2 py-0.5 font-medium gap-1 border',
                            audience.classes
                          )}
                        >
                          <AudienceIcon className="h-3 w-3" />
                          {audienceLabels[announcement.targetAudience]}
                        </Badge>
                      </div>

                      {/* Title */}
                      <h3 className="font-semibold text-base leading-snug mb-2 line-clamp-2 pr-14">
                        {announcement.title}
                      </h3>

                      {/* Content preview */}
                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 mb-4">
                        {announcement.message}
                      </p>

                      {/* Footer */}
                      <div className="flex items-center justify-between gap-3 pt-3 border-t border-border/50">
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(announcement.date), {
                              addSuffix: true,
                            })}
                          </span>
                          <span className="text-[11px] text-muted-foreground/70 truncate">
                            by {announcement.author}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => openEditForm(announcement)}
                            aria-label="Edit announcement"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => confirmDelete(announcement.id)}
                            aria-label="Delete announcement"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Results count */}
      {!loading && filteredAnnouncements.length > 0 && (
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Showing {filteredAnnouncements.length} of {totalCount} announcements
            {(searchQuery || priorityFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setPriorityFilter('all');
                }}
                className="ml-2 text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                Clear filters
              </button>
            )}
          </p>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="sm:max-w-lg dialog-header-accent">
          <div className="h-1 w-full bg-gradient-to-r from-emerald-500 to-teal-500 -mt-6 -mx-6 mb-4 rounded-t-lg" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                <Megaphone className="h-4 w-4 text-emerald-600" />
              </div>
              {editingId ? 'Edit Announcement' : 'Create Announcement'}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Update the details of this announcement.'
                : 'Broadcast a new announcement to the specified audience.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-2 max-h-[65vh] overflow-y-auto pr-1">
            {/* Title */}
            <div className="grid gap-2">
              <Label htmlFor="ann-title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="ann-title"
                placeholder="Announcement title..."
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                maxLength={120}
              />
              <p className="text-[10px] text-muted-foreground text-right">
                {formTitle.length}/120
              </p>
            </div>

            {/* Content */}
            <div className="grid gap-2">
              <Label htmlFor="ann-message">
                Content <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="ann-message"
                placeholder="Write your announcement content..."
                value={formMessage}
                onChange={(e) => setFormMessage(e.target.value)}
                rows={4}
                className="min-h-[100px] resize-y"
                maxLength={1000}
              />
              <p className="text-[10px] text-muted-foreground text-right">
                {formMessage.length}/1000
              </p>
            </div>

            {/* Priority & Audience */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Priority</Label>
                <Select
                  value={formPriority}
                  onValueChange={(v) => setFormPriority(v as Priority)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        Low
                      </span>
                    </SelectItem>
                    <SelectItem value="medium">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                        Medium
                      </span>
                    </SelectItem>
                    <SelectItem value="high">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-red-500" />
                        High
                      </span>
                    </SelectItem>
                    <SelectItem value="urgent">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />
                        Urgent
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Target Audience</Label>
                <Select
                  value={formAudience}
                  onValueChange={(v) => setFormAudience(v as TargetAudience)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <span className="flex items-center gap-1.5">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        All Users
                      </span>
                    </SelectItem>
                    <SelectItem value="faculty">
                      <span className="flex items-center gap-1.5">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        Faculty Only
                      </span>
                    </SelectItem>
                    <SelectItem value="admin">
                      <span className="flex items-center gap-1.5">
                        <ShieldCheck className="h-3 w-3 text-muted-foreground" />
                        Admin Only
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Type */}
            <div className="grid gap-2">
              <Label>Type</Label>
              <Select value={formType} onValueChange={(v) => setFormType(v as AnnouncementType)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">
                    <span className="flex items-center gap-1.5">
                      <Info className="h-3 w-3 text-sky-500" />
                      Information
                    </span>
                  </SelectItem>
                  <SelectItem value="success">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                      Success
                    </span>
                  </SelectItem>
                  <SelectItem value="warning">
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle className="h-3 w-3 text-amber-500" />
                      Warning
                    </span>
                  </SelectItem>
                  <SelectItem value="urgent">
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle className="h-3 w-3 text-red-500" />
                      Urgent
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Pin & Expiry */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="ann-pinned" className="text-sm font-medium">
                    Pin announcement
                  </Label>
                  <p className="text-[10px] text-muted-foreground">
                    Shows at the top
                  </p>
                </div>
                <Switch
                  id="ann-pinned"
                  checked={formPinned}
                  onCheckedChange={setFormPinned}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="ann-expiry" className="text-sm">
                  Expiry date{' '}
                  <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Input
                  id="ann-expiry"
                  type="date"
                  value={formExpiryDate}
                  onChange={(e) => setFormExpiryDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="text-sm"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setFormOpen(false);
                resetForm();
              }}
              disabled={submitting}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !formTitle.trim() || !formMessage.trim()}
              className="w-full sm:w-auto"
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingId ? 'Update Announcement' : 'Publish Announcement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10">
                <Trash2 className="h-4 w-4 text-destructive" />
              </div>
              Delete Announcement
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this announcement? This action cannot be
              undone and the announcement will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
