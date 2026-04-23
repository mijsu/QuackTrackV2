'use client';

import { useState, useEffect } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

type ConnectionStatusType = 'connected' | 'reconnecting' | 'offline';

const STATUS_CONFIG: Record<ConnectionStatusType, {
  color: string;
  bgGlow: string;
  tooltip: string;
  pulseClass: string;
}> = {
  connected: {
    color: 'bg-emerald-500 dark:bg-emerald-400',
    bgGlow: 'shadow-[0_0_6px_rgba(16,185,129,0.5)]',
    tooltip: 'Connected',
    pulseClass: 'animate-connection-pulse-green',
  },
  reconnecting: {
    color: 'bg-amber-500 dark:bg-amber-400',
    bgGlow: 'shadow-[0_0_6px_rgba(245,158,11,0.5)]',
    tooltip: 'Reconnecting...',
    pulseClass: 'animate-connection-pulse-yellow',
  },
  offline: {
    color: 'bg-red-500 dark:bg-red-400',
    bgGlow: 'shadow-[0_0_6px_rgba(239,68,68,0.5)]',
    tooltip: 'Offline',
    pulseClass: 'animate-connection-pulse-red',
  },
};

/**
 * ConnectionStatus - A small indicator dot in the header that shows
 * real-time connection status by pinging /api/health every 30 seconds.
 *
 * States:
 * - Connected (green dot with gentle pulse)
 * - Reconnecting (yellow/amber dot with faster pulse — slow response)
 * - Offline (red dot with pulse — no response)
 */
export function ConnectionStatus() {
  const [status, setStatus] = useState<ConnectionStatusType>('connected');
  const [mounted, setMounted] = useState(false);

  // Hydration safety
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  // Initial check and polling every 30 seconds
  useEffect(() => {
    if (!mounted) return;

    let cancelled = false;

    async function check() {
      try {
        const startTime = Date.now();
        const controller = new AbortController();
        // 8 second timeout for the health check
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const res = await fetch('/api/health', { signal: controller.signal });
        clearTimeout(timeoutId);

        if (cancelled) return;

        const elapsed = Date.now() - startTime;

        if (res.ok) {
          // If response took more than 3 seconds, consider it "reconnecting"
          setStatus(elapsed > 3000 ? 'reconnecting' : 'connected');
        } else {
          setStatus('offline');
        }
      } catch {
        if (!cancelled) {
          setStatus('offline');
        }
      }
    }

    // Initial fetch
    check();

    const interval = setInterval(check, 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [mounted]);

  // Listen for browser online/offline events
  useEffect(() => {
    if (!mounted) return;

    const handleOnline = () => {
      setStatus('connected');
    };
    const handleOffline = () => {
      setStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [mounted]);

  if (!mounted) {
    return (
      <div className="flex items-center gap-1.5 px-1">
        <div className="h-[6px] w-[6px] rounded-full bg-muted" />
      </div>
    );
  }

  const config = STATUS_CONFIG[status];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1.5 px-1.5 py-1.5 cursor-default">
          <div className="relative flex items-center justify-center">
            <span
              className={cn(
                'block h-[6px] w-[6px] rounded-full transition-colors duration-300',
                config.color,
                config.bgGlow,
                config.pulseClass,
              )}
            />
            {/* Pulse ring for connected state */}
            {status === 'connected' && (
              <span
                className={cn(
                  'absolute h-[6px] w-[6px] rounded-full',
                  config.color,
                  'animate-ping opacity-30',
                )}
              />
            )}
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              'h-1.5 w-1.5 rounded-full',
              config.color,
            )}
          />
          {config.tooltip}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
