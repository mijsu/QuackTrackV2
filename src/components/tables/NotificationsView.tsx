'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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
import { toast } from 'sonner';
import {
  Bell,
  CheckCircle,
  AlertTriangle,
  Info,
  XCircle,
  Trash2,
  Check,
  ExternalLink,
  Loader2,
  RefreshCw,
  Calendar,
  Users,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Notification } from '@/types';
import { cn } from '@/lib/utils';
import { QuickFilters } from '@/components/ui/QuickFilters';
import { useAppStore } from '@/store';

export function NotificationsView() {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearAllOpen, setClearAllOpen] = useState(false);
  const [deleteNotificationId, setDeleteNotificationId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const setViewMode = useAppStore((state) => state.setViewMode);

  // Handle navigation to action URL using view mode
  const handleActionClick = (actionUrl: string) => {
    // Convert URL path to view mode (e.g., '/calendar' or 'calendar' -> 'calendar')
    const normalizedViewMode = actionUrl.replace(/^\//, '');
    
    // Valid view modes
    const validViewModes = ['dashboard', 'schedules', 'calendar', 'faculty', 'rooms', 'subjects', 'sections', 'departments', 'users', 'preferences', 'conflicts', 'notifications', 'profile', 'settings', 'reports'] as const;
    
    // Check if the view mode is valid
    if (validViewModes.includes(normalizedViewMode as typeof validViewModes[number])) {
      setViewMode(normalizedViewMode as typeof validViewModes[number]);
    } else {
      // Default to dashboard if invalid view mode
      console.warn(`Invalid action URL: ${actionUrl}, defaulting to dashboard`);
      setViewMode('dashboard');
    }
  };

  useEffect(() => {
    if (session?.user?.id) {
      fetchNotifications();
    }
  }, [session?.user?.id]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`/api/notifications?userId=${session?.user?.id}`);
      const data = await res.json();
      setNotifications(data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
    } catch {
      toast.error('Failed to update notification');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true, userId: session?.user?.id }),
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Failed to update notifications');
    }
  };

  const handleDelete = (id: string) => {
    setDeleteNotificationId(id);
  };

  const confirmDelete = async () => {
    if (!deleteNotificationId) return;
    try {
      await fetch(`/api/notifications?id=${deleteNotificationId}`, { method: 'DELETE' });
      setNotifications(prev => prev.filter(n => n.id !== deleteNotificationId));
      toast.success('Notification deleted');
    } catch {
      toast.error('Failed to delete notification');
    } finally {
      setDeleteNotificationId(null);
    }
  };

  const handleClearAll = async () => {
    try {
      const readNotifications = notifications.filter(n => n.read);
      await Promise.all(readNotifications.map(n =>
        fetch(`/api/notifications?id=${n.id}`, { method: 'DELETE' })
      ));
      setNotifications(prev => prev.filter(n => !n.read));
      setClearAllOpen(false);
      toast.success('Cleared all read notifications');
    } catch {
      toast.error('Failed to clear notifications');
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success': return <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/10"><CheckCircle className="h-5 w-5 text-emerald-500" /></div>;
      case 'warning': return <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/10"><AlertTriangle className="h-5 w-5 text-amber-500" /></div>;
      case 'error': return <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500/10"><XCircle className="h-5 w-5 text-red-500" /></div>;
      default: return <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500/10"><Info className="h-5 w-5 text-blue-500" /></div>;
    }
  };

  const getTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      info: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      success: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
      warning: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
      error: 'bg-red-500/10 text-red-600 border-red-500/20',
    };
    return styles[type] || styles.info;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) !== 1 ? 's' : ''} ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  // Filtered notifications by type
  const filteredNotifications = typeFilter.length === 0
    ? notifications
    : notifications.filter(n => typeFilter.includes(n.type));

  // Count by type for filter badges
  const typeCounts = notifications.reduce((acc, n) => {
    acc[n.type] = (acc[n.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Bell className="h-8 w-8 animate-pulse text-primary" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col gap-3 sm:gap-6 h-[calc(100vh-180px)] sm:h-auto"
    >
      {/* Header */}
      <div className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-600 flex items-center gap-3">
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadCount} new
              </Badge>
            )}
          </h1>
          <div className="h-1 w-20 mt-1 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600" />
          <p className="text-muted-foreground">
            Stay updated with your schedule changes and system alerts
          </p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button onClick={handleMarkAllRead} className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-md hover:shadow-lg transition-all duration-200">
              <Check className="mr-2 h-4 w-4" />
              Mark All as Read
            </Button>
          )}
          {notifications.some(n => n.read) && (
            <Button variant="outline" onClick={() => setClearAllOpen(true)} className="transition-all duration-200 hover:shadow-md">
              <Trash2 className="mr-2 h-4 w-4" />
              Clear read
            </Button>
          )}
        </div>
      </div>

      {/* Stats - Hidden on mobile */}
      <div className="hidden sm:grid grid-cols-3 gap-4">
        <Card className="transition-all duration-200 hover:shadow-md stat-card-shine">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold tabular-nums stat-number-gradient">{notifications.length}</div>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="transition-all duration-200 hover:shadow-md stat-card-shine">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <AlertCircle className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <div className="text-2xl font-bold tabular-nums stat-number-gradient">{unreadCount}</div>
                <p className="text-sm text-muted-foreground">Unread</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="transition-all duration-200 hover:shadow-md stat-card-shine">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Check className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <div className="text-2xl font-bold tabular-nums stat-number-gradient">{notifications.filter(n => n.read).length}</div>
                <p className="text-sm text-muted-foreground">Read</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Type Filter QuickFilters */}
      <QuickFilters
        filters={[
          { value: 'info', label: 'Info', count: typeCounts['info'] || 0, icon: <Info className="h-3 w-3" /> },
          { value: 'success', label: 'Success', count: typeCounts['success'] || 0, icon: <CheckCircle className="h-3 w-3" /> },
          { value: 'warning', label: 'Warning', count: typeCounts['warning'] || 0, icon: <AlertTriangle className="h-3 w-3" /> },
          { value: 'error', label: 'Error', count: typeCounts['error'] || 0, icon: <XCircle className="h-3 w-3" /> },
        ]}
        activeFilters={typeFilter}
        onFilterChange={setTypeFilter}
        mode="multi"
        label="Filter by type"
      />

      {/* Notifications List */}
      <Card className="flex flex-col flex-1 min-h-0">
        <CardHeader className="flex-shrink-0 p-3 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
            Recent Notifications
          </CardTitle>
          <CardDescription className="text-[10px] sm:text-sm">
            {filteredNotifications.length === 0
              ? 'No notifications match the current filter'
              : `Showing ${filteredNotifications.length} of ${notifications.length} notification${notifications.length === 1 ? '' : 's'}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 overflow-hidden p-3 sm:p-6 pt-0 sm:pt-0">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="relative mb-6">
                <div className="rounded-full bg-gradient-to-br from-emerald-500/10 to-teal-500/10 p-6">
                  <Bell className="h-12 w-12 text-emerald-500/60" />
                </div>
                <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 flex items-center justify-center">
                  <span className="text-[10px] text-white font-bold">0</span>
                </div>
              </div>
              <p className="font-semibold text-lg bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">No notifications yet</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                We'll notify you when something important happens with your schedules or system alerts
              </p>
            </div>
          ) : (
            <ScrollArea className="h-full sm:h-[500px] pr-4">
              <AnimatePresence initial={false}>
                {filteredNotifications.map((notification, index) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <div
                      className={cn(
                        'flex items-start gap-1.5 sm:gap-4 p-1.5 sm:p-4 rounded-lg transition-all duration-200 hover:shadow-md hover:bg-muted/30',
                        !notification.read && 'bg-emerald-50/50 dark:bg-emerald-500/5 border-l-4 border-l-emerald-500',
                        notification.read && (
                          (notification as Record<string, unknown>).priority === 'high' || notification.type?.includes('urgent')
                            ? 'border-l-4 border-l-rose-500'
                            : (notification as Record<string, unknown>).priority === 'medium'
                              ? 'border-l-4 border-l-amber-500'
                              : 'border-l-4 border-l-emerald-500/30'
                        )
                      )}
                    >
                      <div className="mt-0.5 sm:mt-1 shrink-0 relative">
                        {getTypeIcon(notification.type)}
                        {!notification.read && (
                          <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-emerald-500 unread-dot-pulse" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1.5 sm:gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-[11px] sm:text-sm truncate">{notification.title}</p>
                            <p className="text-[10px] sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 line-clamp-2">
                              {notification.message}
                            </p>
                          </div>
                          <Badge variant="outline" className={cn('shrink-0 text-[8px] sm:text-xs px-1 sm:px-2.5 py-0.5', getTypeBadge(notification.type))}>
                            {notification.type}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-4 mt-1 sm:mt-3">
                          <span className="text-[9px] sm:text-xs text-muted-foreground">
                            {formatTime(notification.createdAt)}
                          </span>
                          <div className="flex items-center gap-1 sm:gap-2">
                            {!notification.read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 text-[9px] px-1 sm:h-8 sm:text-xs sm:px-3"
                                onClick={() => handleMarkAsRead(notification.id)}
                              >
                                <Check className="mr-0.5 sm:mr-1 h-2 w-2 sm:h-3 sm:w-3" />
                                Mark read
                              </Button>
                            )}
                            {notification.actionUrl && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 text-[9px] px-1 sm:h-8 sm:text-xs sm:px-3"
                                onClick={() => handleActionClick(notification.actionUrl!)}
                              >
                                <ExternalLink className="mr-0.5 sm:mr-1 h-2 w-2 sm:h-3 sm:w-3" />
                                View
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-[10px] px-1.5 sm:h-8 sm:text-xs sm:px-3 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(notification.id)}
                            >
                              <Trash2 className="mr-0.5 sm:mr-1 h-2.5 w-2.5 sm:h-3 sm:w-3" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                    {index < filteredNotifications.length - 1 && <Separator className="my-2" />}
                  </motion.div>
                ))}
              </AnimatePresence>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Clear All Dialog */}
      <AlertDialog open={clearAllOpen} onOpenChange={setClearAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear read notifications</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete all notifications that have been marked as read. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearAll}>Clear</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Single Notification Dialog */}
      <AlertDialog open={!!deleteNotificationId} onOpenChange={(open) => !open && setDeleteNotificationId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Delete Notification
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this notification? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteNotificationId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
