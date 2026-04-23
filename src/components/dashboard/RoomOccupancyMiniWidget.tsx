'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DoorOpen, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RoomItem {
  id: string;
  roomName: string;
  roomCode?: string | null;
  capacity: number;
  building: string;
  _count: { schedules: number };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_ROOMS = 5;
const MAX_WEEKLY_SLOTS = 36; // 6 days × 6 time slots per day

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getUtilizationColor(pct: number) {
  if (pct > 80) return 'bg-red-500';
  if (pct >= 50) return 'bg-amber-500';
  return 'bg-emerald-500';
}

function getUtilizationTextColor(pct: number) {
  if (pct > 80) return 'text-red-600 dark:text-red-400';
  if (pct >= 50) return 'text-amber-600 dark:text-amber-400';
  return 'text-emerald-600 dark:text-emerald-400';
}

function getUtilizationLabel(pct: number) {
  if (pct > 80) return 'High';
  if (pct >= 50) return 'Moderate';
  return 'Low';
}

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------

function BarsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 w-8" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stagger animation variants
// ---------------------------------------------------------------------------

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.07 },
  },
};

const barVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RoomOccupancyMiniWidget() {
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRooms() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/rooms');
        if (!res.ok) throw new Error('Failed to fetch rooms');
        const json = await res.json();
        setRooms(json as RoomItem[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchRooms();
  }, []);

  // Compute utilization and sort by most utilized
  const topRooms = useMemo(() => {
    return [...rooms]
      .map((room) => {
        const utilization =
          MAX_WEEKLY_SLOTS > 0
            ? Math.round((room._count.schedules / MAX_WEEKLY_SLOTS) * 100)
            : 0;
        return { ...room, utilization: Math.min(utilization, 100) };
      })
      .sort((a, b) => b.utilization - a.utilization)
      .slice(0, MAX_ROOMS);
  }, [rooms]);

  const avgUtilization = useMemo(() => {
    if (topRooms.length === 0) return 0;
    const sum = topRooms.reduce((acc, r) => acc + r.utilization, 0);
    return Math.round(sum / topRooms.length);
  }, [topRooms]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
    >
      <Card className="h-full flex flex-col max-w-lg">
        {/* Header */}
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-sm font-medium">
            <span className="flex items-center gap-2">
              <DoorOpen className="h-4 w-4 text-primary" />
              Room Occupancy
            </span>
            {topRooms.length > 0 && (
              <span
                className={cn(
                  'text-xs font-semibold tabular-nums',
                  getUtilizationTextColor(avgUtilization)
                )}
              >
                Avg {avgUtilization}%
              </span>
            )}
          </CardTitle>
        </CardHeader>

        <CardContent className="pt-0 flex-1 flex flex-col">
          {/* Error state */}
          {error && (
            <div className="text-center py-6">
              <p className="text-xs text-red-500">{error}</p>
            </div>
          )}

          {/* Loading skeleton */}
          {loading && <BarsSkeleton />}

          {/* Data view */}
          {!loading && !error && (
            <>
              {topRooms.length === 0 ? (
                <div className="text-center py-6">
                  <DoorOpen className="h-6 w-6 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No rooms found</p>
                </div>
              ) : (
                <motion.div
                  className="space-y-3"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {topRooms.map((room) => (
                    <motion.div key={room.id} variants={barVariants}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="cursor-default">
                            {/* Label row */}
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-xs font-medium truncate">
                                  {room.roomName}
                                </span>
                                <span className="text-[10px] text-muted-foreground shrink-0">
                                  ({room._count.schedules})
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {room.utilization > 80 && (
                                  <TrendingUp className="h-3 w-3 text-red-500" />
                                )}
                                <span
                                  className={cn(
                                    'text-xs font-semibold tabular-nums',
                                    getUtilizationTextColor(room.utilization)
                                  )}
                                >
                                  {room.utilization}%
                                </span>
                              </div>
                            </div>
                            {/* Progress bar */}
                            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                              <motion.div
                                className={cn(
                                  'h-full rounded-full transition-all duration-700 ease-out',
                                  getUtilizationColor(room.utilization)
                                )}
                                initial={{ width: 0 }}
                                animate={{ width: `${room.utilization}%` }}
                                transition={{ duration: 0.8, ease: 'easeOut' }}
                              />
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          <div className="space-y-0.5">
                            <p className="font-medium">{room.roomName}</p>
                            <p className="text-muted-foreground">
                              Building: {room.building}
                            </p>
                            <p className="text-muted-foreground">
                              Capacity: {room.capacity} seats
                            </p>
                            <p className="text-muted-foreground">
                              Scheduled: {room._count.schedules} slots
                            </p>
                            <p
                              className={cn(
                                'font-medium',
                                getUtilizationTextColor(room.utilization)
                              )}
                            >
                              Utilization: {room.utilization}% ({getUtilizationLabel(room.utilization)})
                            </p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {/* Legend */}
              {topRooms.length > 0 && (
                <div className="flex items-center gap-4 mt-4 pt-3 border-t">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-[10px] text-muted-foreground">&lt;50%</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-amber-500" />
                    <span className="text-[10px] text-muted-foreground">50-80%</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-red-500" />
                    <span className="text-[10px] text-muted-foreground">&gt;80%</span>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
