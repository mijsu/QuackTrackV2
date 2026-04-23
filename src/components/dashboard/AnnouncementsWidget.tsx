'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  Bell,
  Megaphone,
  X,
  ArrowRight,
  Plus,
  Loader2,
  Flame,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type AnnouncementType = 'info' | 'warning' | 'success' | 'urgent';

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: AnnouncementType;
  priority?: 'low' | 'medium' | 'high';
  targetAudience?: 'all' | 'faculty' | 'admin';
  date: string;
  author: string;
}

const typeConfig: Record<
  AnnouncementType,
  {
    icon: React.ElementType;
    colorClass: string;
    bgColorClass: string;
    borderColorClass: string;
    badgeClasses: string;
    gradientAccent: string;
  }
> = {
  success: {
    icon: CheckCircle2,
    colorClass: 'text-emerald-600 dark:text-emerald-400',
    bgColorClass: 'bg-emerald-50 dark:bg-emerald-950/50',
    borderColorClass: 'border-l-emerald-500',
    badgeClasses: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400',
    gradientAccent: 'from-emerald-500 to-teal-500',
  },
  warning: {
    icon: AlertTriangle,
    colorClass: 'text-amber-600 dark:text-amber-400',
    bgColorClass: 'bg-amber-50 dark:bg-amber-950/50',
    borderColorClass: 'border-l-amber-500',
    badgeClasses: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400',
    gradientAccent: 'from-amber-500 to-orange-500',
  },
  info: {
    icon: Info,
    colorClass: 'text-sky-600 dark:text-sky-400',
    bgColorClass: 'bg-sky-50 dark:bg-sky-950/50',
    borderColorClass: 'border-l-sky-500',
    badgeClasses: 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-400',
    gradientAccent: 'from-sky-500 to-blue-500',
  },
  urgent: {
    icon: AlertTriangle,
    colorClass: 'text-red-600 dark:text-red-400',
    bgColorClass: 'bg-red-50 dark:bg-red-950/50',
    borderColorClass: 'border-l-red-500',
    badgeClasses: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400',
    gradientAccent: 'from-red-500 to-rose-600',
  },
};

const priorityConfig: Record<string, { icon: React.ElementType; classes: string }> = {
  high: { icon: Flame, classes: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400' },
  medium: { icon: BarChart3, classes: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400' },
  low: { icon: CheckCircle2, classes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400' },
};

function SkeletonRow() {
  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-5 rounded-full shrink-0" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-1/4" />
    </div>
  );
}

export function AnnouncementsWidget() {
  const { data: session } = useSession();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [formPriority, setFormPriority] = useState('medium');
  const [formAudience, setFormAudience] = useState('all');
  const [formType, setFormType] = useState('info');

  const isAdmin = session?.user?.role === 'admin';

  const fetchAnnouncements = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/announcements');
      if (!res.ok) throw new Error('Failed to fetch announcements');
      const data = await res.json();
      setAnnouncements(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  // Show top 3 non-dismissed announcements
  const visibleAnnouncements = announcements
    .filter((a) => !dismissedIds.has(a.id))
    .slice(0, 3);

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => new Set(prev).add(id));
  };

  const resetForm = () => {
    setFormTitle('');
    setFormMessage('');
    setFormPriority('medium');
    setFormAudience('all');
    setFormType('info');
  };

  const handleSubmit = async () => {
    if (!formTitle.trim() || !formMessage.trim()) {
      toast.error('Please fill in the title and message fields');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle.trim(),
          message: formMessage.trim(),
          type: formType,
          priority: formPriority,
          targetAudience: formAudience,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create announcement');
      }

      toast.success('Announcement created successfully');
      setDialogOpen(false);
      resetForm();
      fetchAnnouncements();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create announcement');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25 }}
    >
      <Card className="glass-card-elevated h-full flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Megaphone className="h-4 w-4 text-muted-foreground" />
            Announcements
          </CardTitle>
          <CardAction>
            {isAdmin && (
              <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-300"
                  >
                    <Plus className="h-3 w-3" />
                    Create
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Megaphone className="h-4 w-4" />
                      Create Announcement
                    </DialogTitle>
                    <DialogDescription>
                      Broadcast a new announcement to the specified audience.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-2">
                    <div className="grid gap-2">
                      <Label htmlFor="ann-title">Title</Label>
                      <Input
                        id="ann-title"
                        placeholder="Announcement title..."
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        maxLength={120}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="ann-message">Message</Label>
                      <Textarea
                        id="ann-message"
                        placeholder="Write your announcement content..."
                        value={formMessage}
                        onChange={(e) => setFormMessage(e.target.value)}
                        rows={4}
                        maxLength={1000}
                      />
                      <p className="text-[10px] text-muted-foreground text-right">
                        {formMessage.length}/1000
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-2">
                        <Label>Priority</Label>
                        <Select value={formPriority} onValueChange={setFormPriority}>
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
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>Audience</Label>
                        <Select value={formAudience} onValueChange={setFormAudience}>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Users</SelectItem>
                            <SelectItem value="faculty">Faculty</SelectItem>
                            <SelectItem value="admin">Admin Only</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label>Type</Label>
                      <Select value={formType} onValueChange={setFormType}>
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
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => { setDialogOpen(false); resetForm(); }}
                      disabled={submitting}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={submitting || !formTitle.trim() || !formMessage.trim()}>
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Megaphone className="h-4 w-4 mr-1.5" />
                          Publish
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground hover:text-foreground"
              disabled
            >
              View All
              <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="px-4 pb-4 flex-1">
          <div className="space-y-2">
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <SkeletonRow key={i} />
                ))}
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Bell className="h-8 w-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  Unable to load announcements
                </p>
              </div>
            ) : visibleAnnouncements.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Bell className="h-8 w-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  No announcements
                </p>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {visibleAnnouncements.map((announcement, idx) => {
                  const config = typeConfig[announcement.type];
                  const Icon = config.icon;
                  const priorityCfg = announcement.priority
                    ? priorityConfig[announcement.priority]
                    : null;
                  const PriorityIcon = priorityCfg?.icon;

                  return (
                    <motion.div
                      key={announcement.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 12, height: 0, marginBottom: 0, overflow: 'hidden' }}
                      transition={{ duration: 0.25, delay: idx * 0.08 }}
                      whileHover={{ scale: 1.01 }}
                      className={cn(
                        'rounded-lg border border-l-[3px] overflow-hidden transition-colors hover:bg-muted/30 relative',
                        config.borderColorClass
                      )}
                    >
                      {/* Gradient accent bar at top */}
                      <div className={cn('h-0.5 w-full bg-gradient-to-r', config.gradientAccent)} />

                      <div className="p-3">
                        <div className="flex items-start gap-2.5">
                          <div
                            className={cn(
                              'flex h-5 w-5 items-center justify-center rounded-full shrink-0 mt-0.5',
                              config.bgColorClass
                            )}
                          >
                            <Icon
                              className={cn('h-3 w-3', config.colorClass)}
                            />
                          </div>
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium text-foreground truncate">
                                {announcement.title}
                              </p>
                              <button
                                onClick={() => handleDismiss(announcement.id)}
                                className="shrink-0 text-muted-foreground/60 hover:text-muted-foreground transition-colors p-0.5 rounded-sm hover:bg-muted/50"
                                aria-label="Dismiss announcement"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                              {announcement.message}
                            </p>
                            <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                              <Badge
                                variant="secondary"
                                className={cn(
                                  'text-[10px] px-1.5 py-0 h-4 font-medium',
                                  config.badgeClasses
                                )}
                              >
                                {announcement.type}
                              </Badge>
                              {announcement.priority && priorityCfg && (
                                <Badge
                                  variant="secondary"
                                  className={cn(
                                    'text-[10px] px-1.5 py-0 h-4 font-medium gap-0.5',
                                    priorityCfg.classes
                                  )}
                                >
                                  {PriorityIcon && <PriorityIcon className="h-2.5 w-2.5" />}
                                  {announcement.priority}
                                </Badge>
                              )}
                              {announcement.targetAudience && announcement.targetAudience !== 'all' && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] px-1.5 py-0 h-4 font-medium"
                                >
                                  {announcement.targetAudience}
                                </Badge>
                              )}
                              <span className="text-[10px] text-muted-foreground">
                                {formatDistanceToNow(new Date(announcement.date), {
                                  addSuffix: true,
                                })}
                              </span>
                              <span className="text-[10px] text-muted-foreground/60 hidden sm:inline">
                                · {announcement.author}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
