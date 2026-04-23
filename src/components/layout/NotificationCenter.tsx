'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Bell,
  CheckCheck,
  ChevronRight,
  Info,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  BellOff,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ApiNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'urgent';
  read: boolean;
  actionUrl: string | null;
  createdAt: string;
}

type TimeGroup = 'today' | 'yesterday' | 'earlier';

// ---------------------------------------------------------------------------
// Type → icon + color mapping
// ---------------------------------------------------------------------------
function getTypeConfig(type: ApiNotification['type']) {
  switch (type) {
    case 'info':
      return {
        icon: Info,
        accentClass: 'bg-sky-100 dark:bg-sky-900/40',
        iconClass: 'text-sky-600 dark:text-sky-400',
      };
    case 'warning':
      return {
        icon: AlertTriangle,
        accentClass: 'bg-amber-100 dark:bg-amber-900/40',
        iconClass: 'text-amber-600 dark:text-amber-400',
      };
    case 'success':
      return {
        icon: CheckCircle2,
        accentClass: 'bg-emerald-100 dark:bg-emerald-900/40',
        iconClass: 'text-emerald-600 dark:text-emerald-400',
      };
    case 'urgent':
      return {
        icon: AlertCircle,
        accentClass: 'bg-red-100 dark:bg-red-900/40',
        iconClass: 'text-red-600 dark:text-red-400',
      };
    default:
      return {
        icon: Bell,
        accentClass: 'bg-muted',
        iconClass: 'text-muted-foreground',
      };
  }
}

// ---------------------------------------------------------------------------
// Group helpers
// ---------------------------------------------------------------------------
const GROUP_LABELS: Record<TimeGroup, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  earlier: 'Earlier',
};

const GROUP_ORDER: TimeGroup[] = ['today', 'yesterday', 'earlier'];

function getTimeGroup(createdAt: string): TimeGroup {
  const now = Date.now();
  const created = new Date(createdAt).getTime();
  const hoursDiff = (now - created) / (1000 * 60 * 60);
  if (hoursDiff <= 24) return 'today';
  if (hoursDiff <= 48) return 'yesterday';
  return 'earlier';
}

// ---------------------------------------------------------------------------
// Animation variants (kept from original)
// ---------------------------------------------------------------------------
const panelVariants = {
  hidden: { opacity: 0, y: -8, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 400, damping: 25 },
  },
  exit: {
    opacity: 0,
    y: -6,
    scale: 0.97,
    transition: { duration: 0.15 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.04, duration: 0.25, ease: 'easeOut' },
  }),
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** 3-row loading skeleton */
function NotificationSkeleton() {
  return (
    <div className="py-1">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-start gap-3 px-4 py-2.5">
          <Skeleton className="mt-0.5 h-8 w-8 rounded-lg shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-2.5 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Empty state */
function EmptyStateInner() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="flex items-center justify-center h-12 w-12 rounded-full bg-muted/60 mb-3">
        <BellOff className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">
        No notifications yet
      </p>
      <p className="text-xs text-muted-foreground/70 mt-1">
        You&apos;re all caught up!
      </p>
    </div>
  );
}

/** Error state */
function ErrorStateInner({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 mb-3">
        <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">
        Failed to load notifications
      </p>
      <Button
        variant="ghost"
        size="sm"
        className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 gap-1.5"
        onClick={onRetry}
      >
        <RefreshCw className="w-3.5 h-3.5" />
        Try again
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export function NotificationCenter() {
  const { data: session } = useSession();
  const { setViewMode } = useAppStore();

  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [retryTrigger, setRetryTrigger] = useState(0);

  const userId = session?.user?.id ?? '';

  // -----------------------------------------------------------------------
  // Fetch notifications (all or unread-only)
  // -----------------------------------------------------------------------
  const fetchNotifications = useCallback(
    async (unreadOnly = false) => {
      if (!userId) return;
      try {
        const res = await fetch(
          `/api/notifications?userId=${encodeURIComponent(userId)}&unreadOnly=${String(unreadOnly)}`,
        );
        if (!res.ok) throw new Error('Fetch failed');
        const data: ApiNotification[] = await res.json();
        return data;
      } catch {
        return null;
      }
    },
    [userId],
  );

  // -----------------------------------------------------------------------
  // Initial load + reload when popover opens
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!userId || !open) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(false);
      const data = await fetchNotifications(false);
      if (cancelled) return;
      if (data === null) {
        setError(true);
      } else {
        setNotifications(data);
        setUnreadCount(data.filter((n) => !n.read).length);
      }
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [open, userId, fetchNotifications, retryTrigger]);

  // -----------------------------------------------------------------------
  // Poll unread count every 30s
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    async function poll() {
      const data = await fetchNotifications(true);
      if (cancelled) return;
      if (data !== null) {
        setUnreadCount(data.length);
        // If popover is closed, merge unread count without fetching full list
        // If popover is open, the open-dependent effect handles the full list
      }
    }

    // Initial poll
    poll();

    const interval = setInterval(poll, 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [userId, fetchNotifications]);

  // -----------------------------------------------------------------------
  // Derived: grouped notifications
  // -----------------------------------------------------------------------
  const grouped = useMemo(() => {
    const map = new Map<TimeGroup, ApiNotification[]>();
    for (const g of GROUP_ORDER) {
      const items = notifications.filter((n) => getTimeGroup(n.createdAt) === g);
      if (items.length > 0) map.set(g, items);
    }
    return map;
  }, [notifications]);

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------
  const handleMarkAllRead = async () => {
    if (!userId || markingAll) return;
    setMarkingAll(true);
    try {
      const res = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true, userId }),
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch {
      // silently fail — user can retry
    } finally {
      setMarkingAll(false);
    }
  };

  const handleNotificationClick = async (notification: ApiNotification) => {
    if (!notification.read) {
      // Mark as read optimistically
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      // Fire-and-forget API call
      try {
        await fetch('/api/notifications', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: notification.id }),
        });
      } catch {
        // If API fails, revert optimistic update
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, read: false } : n,
          ),
        );
        setUnreadCount((prev) => prev + 1);
      }
    }

    // Navigate if actionUrl is provided
    if (notification.actionUrl) {
      setOpen(false);
      // Support both /view-mode and full URLs
      if (notification.actionUrl.startsWith('/')) {
        const viewMatch = notification.actionUrl.match(/^\/(\w+)/);
        if (viewMatch) {
          setViewMode(viewMatch[1] as ReturnType<typeof setViewMode>);
        }
      }
    }
  };

  const handleViewAll = () => {
    setOpen(false);
    setViewMode('notifications');
  };

  const handleRetry = () => {
    setError(false);
    setRetryTrigger((prev) => prev + 1);
  };

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  let itemIndex = 0;

  const isEmpty = !loading && !error && notifications.length === 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {/* ---- Trigger ---- */}
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "relative h-9 w-9 sm:h-11 sm:w-11 touch-manipulation text-muted-foreground hover:text-foreground transition-colors duration-200",
            unreadCount > 0 && "text-foreground"
          )}
          aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        >
          <Bell className={cn("h-5 w-5", unreadCount > 0 && "bell-pulse-animate text-emerald-500 dark:text-emerald-400")} />
          {unreadCount > 0 && (
            <Badge className="absolute -top-0.5 -right-0.5 h-5 min-w-[20px] px-1 text-[10px] font-bold rounded-full bg-emerald-500 text-white border-2 border-background flex items-center justify-center pointer-events-none pulse-ring">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      {/* ---- Dropdown Panel ---- */}
      <AnimatePresence>
        {open && (
          <PopoverContent
            asChild
            align="end"
            sideOffset={12}
            className="w-[340px] sm:w-[400px] p-0 rounded-xl border shadow-xl overflow-hidden @container"
          >
            <motion.div
              variants={panelVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold">Notifications</h3>
                  {unreadCount > 0 && (
                    <Badge className="h-5 px-1.5 text-[10px] font-semibold rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25">
                      {unreadCount} new
                    </Badge>
                  )}
                </div>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 gap-1"
                    onClick={handleMarkAllRead}
                    disabled={markingAll}
                  >
                    <CheckCheck className={cn('w-3.5 h-3.5', markingAll && 'animate-pulse')} />
                    Mark all as read
                  </Button>
                )}
              </div>

              {/* Body */}
              <ScrollArea className="max-h-[340px]">
                {loading && <NotificationSkeleton />}
                {error && <ErrorStateInner onRetry={handleRetry} />}
                {isEmpty && <EmptyStateInner />}

                {!loading && !error && notifications.length > 0 && (
                  <div className="py-1">
                    {GROUP_ORDER.map((group, gi) => {
                      const items = grouped.get(group);
                      if (!items) return null;

                      return (
                        <div key={group}>
                          {gi > 0 && <Separator className="my-1" />}
                          {/* Group label */}
                          <div className="px-4 pt-2 pb-1">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                              {GROUP_LABELS[group]}
                            </span>
                          </div>
                          {/* Items */}
                          {items.map((notification) => {
                            const idx = itemIndex++;
                            const typeConfig = getTypeConfig(notification.type);
                            const TypeIcon = typeConfig.icon;

                            return (
                              <motion.button
                                key={notification.id}
                                custom={idx}
                                variants={itemVariants}
                                initial="hidden"
                                animate="visible"
                                className={cn(
                                  'w-full flex items-start gap-3 px-4 py-2.5 text-left transition-colors cursor-pointer hover:bg-muted/60 group',
                                  !notification.read &&
                                    'bg-emerald-50/50 dark:bg-emerald-950/20',
                                )}
                                onClick={() => handleNotificationClick(notification)}
                              >
                                {/* Icon */}
                                <div
                                  className={cn(
                                    'mt-0.5 flex items-center justify-center h-8 w-8 rounded-lg shrink-0',
                                    typeConfig.accentClass,
                                  )}
                                >
                                  <TypeIcon className={cn('h-4 w-4', typeConfig.iconClass)} />
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p
                                      className={cn(
                                        'text-sm truncate',
                                        !notification.read
                                          ? 'font-semibold text-foreground'
                                          : 'font-medium text-muted-foreground',
                                      )}
                                    >
                                      {notification.title}
                                    </p>
                                    {!notification.read && (
                                      <span className="shrink-0 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-background" />
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                    {notification.message}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground/70 mt-1">
                                    {formatDistanceToNow(new Date(notification.createdAt), {
                                      addSuffix: true,
                                    })}
                                  </p>
                                </div>
                              </motion.button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>

              {/* View All footer */}
              <Separator />
              <div className="px-1 py-1">
                <Button
                  variant="ghost"
                  className="w-full justify-center text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg h-9 gap-1.5 font-medium"
                  onClick={handleViewAll}
                >
                  View All Notifications
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          </PopoverContent>
        )}
      </AnimatePresence>
    </Popover>
  );
}
