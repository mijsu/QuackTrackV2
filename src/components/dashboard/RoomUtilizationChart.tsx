'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import { DoorOpen, Users, Building2, ArrowRight } from 'lucide-react';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';
import type { Room, Schedule } from '@/types';

// ============================================================================
// TYPES
// ============================================================================

interface RoomUtilizationEntry {
  id: string;
  roomName: string;
  building: string;
  capacity: number;
  usedSlots: number;
  totalSlots: number;
  utilizationPercent: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TOTAL_TIME_SLOTS = 6 * 12; // 6 days × 12 one-hour slots (7am–7pm)

const UTILIZATION_COLORS = {
  high: 'bg-emerald-500',
  highBg: 'bg-emerald-500/10',
  highText: 'text-emerald-600 dark:text-emerald-400',
  medium: 'bg-amber-500',
  mediumBg: 'bg-amber-500/10',
  mediumText: 'text-amber-600 dark:text-amber-400',
  low: 'bg-red-500',
  lowBg: 'bg-red-500/10',
  lowText: 'text-red-600 dark:text-red-400',
};

// ============================================================================
// SKELETON
// ============================================================================

function ChartSkeleton() {
  return (
    <Card className="card-hover">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-5 w-36 rounded" />
          </div>
          <Skeleton className="h-7 w-24 rounded" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3.5 w-28 rounded" />
                <Skeleton className="h-3.5 w-10 rounded" />
              </div>
              <Skeleton className="h-2.5 w-full rounded-full" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// HELPER
// ============================================================================

function getUtilizationColor(percent: number) {
  if (percent > 60) return { bar: UTILIZATION_COLORS.high, bg: UTILIZATION_COLORS.highBg, text: UTILIZATION_COLORS.highText };
  if (percent >= 30) return { bar: UTILIZATION_COLORS.medium, bg: UTILIZATION_COLORS.mediumBg, text: UTILIZATION_COLORS.mediumText };
  return { bar: UTILIZATION_COLORS.low, bg: UTILIZATION_COLORS.lowBg, text: UTILIZATION_COLORS.lowText };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function RoomUtilizationChart() {
  const [rooms, setRooms] = useState<RoomUtilizationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const setViewMode = useAppStore((state) => state.setViewMode);

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

      // Build utilization entries
      const entries: RoomUtilizationEntry[] = allRooms
        .filter((r) => r.isActive)
        .map((r) => {
          const usedSlots = roomSlots.get(r.id)?.size || 0;
          const utilizationPercent = TOTAL_TIME_SLOTS > 0
            ? Math.round((usedSlots / TOTAL_TIME_SLOTS) * 100)
            : 0;
          return {
            id: r.id,
            roomName: r.roomName,
            building: r.building,
            capacity: r.capacity,
            usedSlots,
            totalSlots: TOTAL_TIME_SLOTS,
            utilizationPercent,
          };
        })
        .sort((a, b) => b.utilizationPercent - a.utilizationPercent)
        .slice(0, 8);

      setRooms(entries);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <ChartSkeleton />;

  if (error) {
    return (
      <Card className="card-hover">
        <CardHeader className="pb-2">
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
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <DoorOpen className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
          Room Utilization
        </CardTitle>
        <CardAction>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setViewMode('rooms')}
          >
            View All Rooms
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {rooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <DoorOpen className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm font-medium">No room data</p>
            <p className="text-xs text-muted-foreground mt-1">Add rooms to see utilization</p>
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto scrollbar-styled space-y-3 pr-1">
            {rooms.map((room) => {
              const colors = getUtilizationColor(room.utilizationPercent);
              return (
                <Tooltip key={room.id}>
                  <TooltipTrigger asChild>
                    <div
                      className="group cursor-default rounded-lg p-2 -mx-2 transition-colors hover:bg-muted/50"
                    >
                      {/* Room info row */}
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-medium truncate">{room.roomName}</span>
                          <span className="text-[10px] text-muted-foreground hidden sm:inline">
                            {room.building}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                            <Users className="h-3 w-3" />
                            {room.capacity}
                          </span>
                          <span
                            className={cn('text-xs font-semibold tabular-nums', colors.text)}
                          >
                            {room.utilizationPercent}%
                          </span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all duration-500 ease-out',
                            colors.bar
                          )}
                          style={{ width: `${Math.min(room.utilizationPercent, 100)}%` }}
                        />
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-[220px]">
                    <div className="space-y-1">
                      <p className="font-semibold">{room.roomName}</p>
                      <div className="flex items-center gap-1 text-[10px] opacity-80">
                        <Building2 className="h-3 w-3" />
                        {room.building}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] opacity-80">
                        <Users className="h-3 w-3" />
                        Capacity: {room.capacity}
                      </div>
                      <p className="text-[10px] opacity-80">
                        {room.usedSlots} of {room.totalSlots} time slots used
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mt-3 pt-3 border-t text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500" />
            High (&gt;60%)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-amber-500" />
            Medium (30–60%)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-500" />
            Low (&lt;30%)
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
