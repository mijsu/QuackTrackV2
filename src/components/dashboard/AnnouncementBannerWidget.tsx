'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Megaphone, X, Check, Clock, AlertCircle, Info, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'urgent';
  priority: 'low' | 'medium' | 'high';
  targetAudience: 'all' | 'faculty' | 'admin';
  date: string;
  author: string;
}

type BannerState = 'loading' | 'visible' | 'dismissed' | 'empty' | 'error';

const AUTO_DISMISS_MS = 30_000;

function getTypeBadge(type: Announcement['type']) {
  switch (type) {
    case 'urgent':
      return { variant: 'destructive' as const, icon: AlertCircle, label: 'Urgent' };
    case 'warning':
      return { variant: 'outline' as const, icon: AlertCircle, label: 'Warning', className: 'border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10' };
    case 'success':
      return { variant: 'outline' as const, icon: Check, label: 'Success', className: 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' };
    default:
      return { variant: 'outline' as const, icon: Info, label: 'Info', className: 'border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/10' };
  }
}

function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function AnnouncementBannerWidget() {
  const { data: session } = useSession();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [bannerState, setBannerState] = useState<BannerState>('loading');
  const [isMarkingRead, setIsMarkingRead] = useState(false);

  const isAdmin = session?.user?.role === 'admin';

  const fetchAnnouncements = useCallback(async () => {
    try {
      const res = await fetch('/api/announcements');
      if (!res.ok) {
        setBannerState('error');
        return;
      }
      const data: Announcement[] = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        // Sort by date descending and pick the most recent
        const sorted = [...data].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setAnnouncement(sorted[0]);
        setBannerState('visible');
      } else {
        setBannerState('empty');
      }
    } catch {
      setBannerState('error');
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    fetchAnnouncements();
  }, [isAdmin, fetchAnnouncements]);

  // Auto-dismiss timer
  useEffect(() => {
    if (bannerState !== 'visible') return;
    const timer = setTimeout(() => {
      setBannerState('dismissed');
    }, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [bannerState]);

  const handleDismiss = useCallback(() => {
    setBannerState('dismissed');
  }, []);

  const handleMarkAsRead = useCallback(async () => {
    if (!announcement || isMarkingRead) return;
    setIsMarkingRead(true);
    try {
      await fetch(`/api/announcements/${announcement.id}/read`, { method: 'POST' });
    } catch {
      // API may not exist, handle gracefully
    } finally {
      setIsMarkingRead(false);
      setBannerState('dismissed');
    }
  }, [announcement, isMarkingRead]);

  // Don't render for non-admin users
  if (!isAdmin) return null;

  // Loading state
  if (bannerState === 'loading') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full"
      >
        <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-4 overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-muted animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-48 bg-muted rounded animate-pulse" />
              <div className="h-3 w-32 bg-muted rounded animate-pulse" />
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Empty or dismissed or error state — show nothing
  if (bannerState === 'empty' || bannerState === 'dismissed' || bannerState === 'error') {
    return null;
  }

  if (!announcement) return null;

  const typeInfo = getTypeBadge(announcement.type);
  const TypeIcon = typeInfo.icon;

  return (
    <AnimatePresence mode="wait">
      {bannerState === 'visible' && (
        <motion.div
          key={`announcement-${announcement.id}`}
          initial={{ opacity: 0, y: -12, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -8, height: 0 }}
          transition={{ duration: 0.35, ease: [0.25, 0.8, 0.25, 1] }}
          className="w-full overflow-hidden"
        >
          <div
            className={cn(
              'relative rounded-xl border overflow-hidden',
              'bg-card/80 backdrop-blur-sm',
              'border-l-[3px] border-l-emerald-500 dark:border-l-emerald-400',
              'border-border/50',
              'shadow-sm',
            )}
          >
            {/* Subtle emerald glow on left */}
            <div
              className="absolute left-0 top-0 bottom-0 w-16 pointer-events-none"
              style={{
                background: 'linear-gradient(90deg, oklch(0.72 0.19 142 / 0.06), transparent)',
              }}
            />

            <div className="relative flex items-start gap-3 p-4">
              {/* Icon */}
              <div className="shrink-0 mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 dark:bg-emerald-500/15">
                <Megaphone className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-semibold text-foreground truncate">
                    {announcement.title}
                  </h3>
                  <Badge
                    variant={typeInfo.variant}
                    className={cn(
                      'text-[10px] px-1.5 py-0 h-4 font-medium',
                      typeInfo.className,
                    )}
                  >
                    <TypeIcon className="h-2.5 w-2.5 mr-0.5" />
                    {typeInfo.label}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {announcement.message}
                </p>
                <div className="flex items-center gap-1.5 mt-2 text-[10px] text-muted-foreground/70">
                  <Clock className="h-3 w-3" />
                  <span>{formatTimestamp(announcement.date)}</span>
                  <span className="mx-0.5">·</span>
                  <span>{announcement.author}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAsRead}
                  disabled={isMarkingRead}
                  className={cn(
                    'h-7 px-2 text-[11px] font-medium',
                    'text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300',
                    'hover:bg-emerald-500/10',
                  )}
                >
                  {isMarkingRead ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <Check className="h-3 w-3 mr-1" />
                  )}
                  Mark as Read
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDismiss}
                  className="h-7 w-7 text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/50"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
