'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DoorOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Room, Schedule } from '@/types';

// ============================================================================
// TYPES
// ============================================================================

interface RoomUsageEntry {
  id: string;
  roomName: string;
  building: string;
  usedSlots: number;
  totalSlots: number;
  usagePercent: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TOTAL_TIME_SLOTS = 6 * 12; // 6 days x 12 one-hour slots (7am-7pm)

// ============================================================================
// SKELETON
// ============================================================================

function WidgetSkeleton() {
  return (
    <Card className="card-hover">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-5 w-40 rounded" />
          </div>
          <Skeleton className="h-8 w-16 rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-1">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-24 rounded" />
              <Skeleton className="h-3.5 w-10 rounded" />
            </div>
            <Skeleton className="h-3 w-full rounded-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function getBarColor(percent: number): string {
  if (percent > 60) return 'from-emerald-500 to-emerald-400';
  if (percent >= 30) return 'from-amber-500 to-amber-400';
  return 'from-red-500 to-red-400';
}

function getBarTextColor(percent: number): string {
  if (percent > 60) return 'text-emerald-600 dark:text-emerald-400';
  if (percent >= 30) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function RoomUtilizationWidget() {
  const [rooms, setRooms] = useState<RoomUsageEntry[]>([]);
  const [totalUtilization, setTotalUtilization] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [roomsRes, schedulesRes] = await Promise.all([
        fetch('/api/rooms'),
        fetch('/api/schedules'),
      ]);

      if (!roomsRes.ok || !schedulesRes.ok) throw new Error('Failed to fetch data');

      const allRooms: Room[] = await roomsRes.json();
      const allSchedules: Schedule[] = await schedulesRes.json();

      // Count unique time slots used per room
      const roomSlots = new Map<string, Set<string>>();
      allSchedules.forEach((s) => {
        if (!s.roomId) return;
        const key = `${s.day}-${s.startTime}-${s.endTime}`;
        const existing = roomSlots.get(s.roomId) || new Set();
        existing.add(key);
        roomSlots.set(s.roomId, existing);
      });

      // Build utilization entries for active rooms
      const activeRooms = allRooms.filter((r) => r.isActive);
      const entries: RoomUsageEntry[] = activeRooms
        .map((r) => {
          const usedSlots = roomSlots.get(r.id)?.size || 0;
          const usagePercent = TOTAL_TIME_SLOTS > 0
            ? Math.round((usedSlots / TOTAL_TIME_SLOTS) * 100)
            : 0;
          return {
            id: r.id,
            roomName: r.roomName,
            building: r.building,
            usedSlots,
            totalSlots: TOTAL_TIME_SLOTS,
            usagePercent,
          };
        })
        .sort((a, b) => b.usagePercent - a.usagePercent);

      // Take top 10
      const topRooms = entries.slice(0, 10);

      // Calculate total utilization: average across all active rooms
      const avgUtilization = activeRooms.length > 0
        ? Math.round(entries.reduce((sum, r) => sum + r.usagePercent, 0) / activeRooms.length)
        : 0;

      setRooms(topRooms);
      setTotalUtilization(avgUtilization);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <WidgetSkeleton />;

  if (error) {
    return (
      <Card className="card-hover">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <DoorOpen className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
            Room Utilization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <DoorOpen className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Unable to load room data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-hover">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <DoorOpen className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
            Room Utilization
          </CardTitle>
          {/* Total utilization badge */}
          <div className={cn(
            'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tabular-nums',
            totalUtilization > 60
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
              : totalUtilization >= 30
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
          )}>
            {totalUtilization}% avg
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {rooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <DoorOpen className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm font-medium">No room data</p>
            <p className="text-xs text-muted-foreground mt-1">Add rooms to see utilization</p>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto scrollbar-styled space-y-3 pr-1">
            {rooms.map((room) => (
              <div key={room.id} className="group">
                {/* Room name and percentage */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-medium truncate">{room.roomName}</span>
                    <span className="text-[10px] text-muted-foreground hidden sm:inline shrink-0">
                      {room.building}
                    </span>
                  </div>
                  <span className={cn('text-xs font-bold tabular-nums shrink-0', getBarTextColor(room.usagePercent))}>
                    {room.usagePercent}%
                  </span>
                </div>

                {/* Horizontal bar */}
                <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full bg-gradient-to-r transition-all duration-700 ease-out',
                      getBarColor(room.usagePercent),
                    )}
                    style={{ width: `${Math.min(room.usagePercent, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mt-3 pt-3 border-t text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-6 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400" />
            High (&gt;60%)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-6 rounded-full bg-gradient-to-r from-amber-500 to-amber-400" />
            Medium (30-60%)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-6 rounded-full bg-gradient-to-r from-red-500 to-red-400" />
            Low (&lt;30%)
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
