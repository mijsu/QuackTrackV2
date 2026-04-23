'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Bell, BellOff, CheckCircle, Trash2, Settings, BellRing, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import type { Notification } from '@/types';

interface NotificationBellProps {
  onViewAll?: () => void;
  onNotificationClick?: (notification: Notification) => void;
}

interface PushNotificationStatus {
  supported: boolean;
  permission: NotificationPermission | null;
  subscribed: boolean;
}

export function NotificationBell({ onViewAll, onNotificationClick }: NotificationBellProps) {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [pushStatus, setPushStatus] = useState<PushNotificationStatus>({
    supported: false,
    permission: null,
    subscribed: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      const res = await fetch(`/api/notifications?userId=${session.user.id}`);
      const data = await res.json();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, [session?.user?.id]);

  // Initialize push notification status
  const initializePushStatus = useCallback(async () => {
    if (typeof window === 'undefined') return;

    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    const permission = supported ? Notification.permission : null;

    let subscribed = false;
    if (supported && permission === 'granted') {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        subscribed = !!subscription;
      } catch {
        subscribed = false;
      }
    }

    setPushStatus({ supported, permission, subscribed });
  }, []);

  useEffect(() => {
    if (session?.user?.id) {
      fetchNotifications();
      initializePushStatus();
      
      // Poll for new notifications
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [session?.user?.id, fetchNotifications, initializePushStatus]);

  // Enable push notifications
  const enablePushNotifications = async () => {
    if (!pushStatus.supported) {
      toast.error('Push notifications are not supported in this browser');
      return;
    }

    setIsLoading(true);
    try {
      // Request permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast.error('Notification permission denied');
        setPushStatus((prev) => ({ ...prev, permission }));
        return;
      }

      // Register service worker
      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        registration = await navigator.serviceWorker.register('/sw.js');
      }

      // Wait for the service worker to be ready
      await navigator.serviceWorker.ready;

      // Get existing subscription or create new one
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        // Use VAPID key (in production, this should be from env)
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 
          'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
        
        const applicationServerKey = urlBase64ToUint8Array(vapidKey);
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
      }

      // Save subscription to server
      const subData = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.toJSON().keys?.p256dh || '',
          auth: subscription.toJSON().keys?.auth || '',
        },
      };

      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subData),
      });

      if (response.ok) {
        toast.success('Push notifications enabled!');
        setPushStatus((prev) => ({ ...prev, permission, subscribed: true }));
      } else {
        throw new Error('Failed to save subscription');
      }
    } catch (error) {
      console.error('Error enabling push notifications:', error);
      toast.error('Failed to enable push notifications');
    } finally {
      setIsLoading(false);
    }
  };

  // Disable push notifications
  const disablePushNotifications = async () => {
    setIsLoading(true);
    try {
      // Get current subscription
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe from push manager
        await subscription.unsubscribe();

        // Remove from server
        await fetch('/api/notifications/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
      }

      toast.success('Push notifications disabled');
      setPushStatus((prev) => ({ ...prev, subscribed: false }));
    } catch (error) {
      console.error('Error disabling push notifications:', error);
      toast.error('Failed to disable push notifications');
    } finally {
      setIsLoading(false);
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true, userId: session?.user?.id }),
      });
      fetchNotifications();
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
      toast.error('Failed to mark as read');
    }
  };

  // Delete notification
  const handleDeleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/notifications?id=${id}`, { method: 'DELETE' });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (error) {
      console.error('Failed to delete notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  // Get notification type color
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'info':
        return 'bg-blue-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'success':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Format relative time
  const formatRelativeTime = (date: Date | string) => {
    const now = new Date();
    const notificationDate = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - notificationDate.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return notificationDate.toLocaleDateString();
  };

  // Calculate unread count
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Helper function to convert VAPID key
  function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-primary hover:text-primary"
              onClick={handleMarkAllRead}
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              Mark All Read
            </Button>
          )}
        </div>

        {/* Push Notification Toggle */}
        {pushStatus.supported && (
          <div className="px-4 py-3 border-b bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {pushStatus.subscribed ? (
                  <BellRing className="h-4 w-4 text-green-500" />
                ) : (
                  <BellOff className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="text-sm">
                  {pushStatus.subscribed ? 'Push Enabled' : 'Push Disabled'}
                </span>
              </div>
              <Switch
                checked={pushStatus.subscribed}
                disabled={isLoading}
                onCheckedChange={(checked) => {
                  if (checked) {
                    enablePushNotifications();
                  } else {
                    disablePushNotifications();
                  }
                }}
              />
            </div>
            {!pushStatus.subscribed && pushStatus.permission !== 'denied' && (
              <p className="text-xs text-muted-foreground mt-1">
                Enable to receive real-time notifications
              </p>
            )}
            {pushStatus.permission === 'denied' && (
              <p className="text-xs text-destructive mt-1">
                Notifications blocked. Enable in browser settings.
              </p>
            )}
          </div>
        )}

        {/* Notification List */}
        {notifications.length === 0 ? (
          <div className="p-6 text-center">
            <Bell className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">No notifications</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[300px]">
            {notifications.slice(0, 5).map((n) => (
              <div
                key={n.id}
                className={`flex items-start gap-3 p-3 hover:bg-muted/50 relative group cursor-pointer ${
                  !n.read ? 'bg-muted/30' : ''
                }`}
                onClick={() => {
                  setIsOpen(false);
                  onNotificationClick?.(n);
                }}
              >
                {/* Type indicator dot with unread ring */}
                <div className="relative mt-2 shrink-0">
                  <div className={`w-2 h-2 rounded-full ${getTypeColor(n.type)}`} />
                  {!n.read && (
                    <div
                      className={`absolute inset-0 w-2 h-2 rounded-full ${getTypeColor(n.type)} animate-ping opacity-50`}
                    />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pl-1">
                  {n.title && (
                    <p className="text-sm font-medium leading-tight truncate">{n.title}</p>
                  )}
                  <p className="text-sm leading-tight line-clamp-2">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatRelativeTime(n.createdAt)}
                  </p>
                </div>

                {/* Delete button (visible on hover) */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={(e) => handleDeleteNotification(n.id, e)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </ScrollArea>
        )}

        {/* View All Link */}
        {notifications.length > 5 && (
          <>
            <DropdownMenuSeparator className="m-0" />
            <DropdownMenuItem
              className="justify-center text-primary cursor-pointer"
              onClick={() => {
                setIsOpen(false);
                onViewAll?.();
              }}
            >
              View all {notifications.length} notifications
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
