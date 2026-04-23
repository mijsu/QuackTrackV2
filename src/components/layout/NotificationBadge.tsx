'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';

/**
 * NotificationBadge - A simple bell icon with unread count badge.
 * Follows the same data-fetching pattern as NotificationCenter,
 * but navigates directly to the notifications view on click
 * instead of opening a popover.
 */
export function NotificationBadge() {
  const { data: session } = useSession();
  const { setViewMode } = useAppStore();
  const [unreadCount, setUnreadCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  const userId = session?.user?.id ?? '';

  // Mount detection for hydration safety
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  // Fetch unread notification count + polling every 30s
  useEffect(() => {
    if (!userId || !mounted) return;

    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(
          `/api/notifications?userId=${encodeURIComponent(userId)}&unreadOnly=true`,
        );
        if (!cancelled && res.ok) {
          const data = await res.json();
          setUnreadCount(Array.isArray(data) ? data.length : 0);
        }
      } catch {
        // silently fail
      }
    }

    // Initial fetch
    poll();

    const interval = setInterval(poll, 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [userId, mounted]);

  const handleClick = () => {
    setViewMode('notifications');
  };

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 sm:h-11 sm:w-11"
        disabled
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClick}
          className={cn(
            'relative h-9 w-9 sm:h-11 sm:w-11 touch-manipulation text-muted-foreground hover:text-foreground transition-colors duration-200',
            unreadCount > 0 && 'text-foreground'
          )}
          aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        >
          <Bell className={cn(
            'h-5 w-5 transition-colors duration-200',
            unreadCount > 0 && 'text-emerald-500 dark:text-emerald-400'
          )} />
          {unreadCount > 0 && (
            <Badge className="absolute -top-0.5 -right-0.5 h-5 min-w-[20px] px-1 text-[10px] font-bold rounded-full bg-emerald-500 text-white border-2 border-background flex items-center justify-center pointer-events-none">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'No new notifications'}</p>
      </TooltipContent>
    </Tooltip>
  );
}
