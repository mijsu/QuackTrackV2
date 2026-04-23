'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Building2, AlertCircle, TrendingUp, TrendingDown, Grid3X3, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { DAYS } from '@/types';
import type { Schedule, Room } from '@/types';

// ============================================================================
// CONSTANTS
// ============================================================================

const TIME_SLOTS = [
  '07:00', '08:00', '09:00', '10:00',
  '11:00', '12:00', '13:00', '14:00',
  '15:00', '16:00', '17:00', '18:00',
  '19:00', '20:00',
];

const MAX_ROOMS_DISPLAY = 10;

// ============================================================================
// TYPES
// ============================================================================

type OccupancyLevel = 0 | 1 | 2 | '3+';

interface OccupancyCell {
  count: number;
  level: OccupancyLevel;
}

type OccupancyGrid = Record<string, OccupancyCell>;

interface SummaryStats {
  mostUsedRoom: { name: string; count: number } | null;
  mostAvailableRoom: { name: string; count: number } | null;
  avgOccupancy: number;
  totalSlots: number;
  filledSlots: number;
}

// ============================================================================
// HELPERS
// ============================================================================

function getOccupancyLevel(count: number): OccupancyLevel {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  return '3+';
}

function getCellColor(level: OccupancyLevel) {
  switch (level) {
    case 0: return 'bg-muted/60 dark:bg-muted/40 text-muted-foreground/60';
    case 1: return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/20';
    case 2: return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20';
    case '3+': return 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/20';
    default: return 'bg-muted/60 text-muted-foreground/60';
  }
}

function getCellDotColor(level: OccupancyLevel) {
  switch (level) {
    case 0: return 'bg-muted-foreground/30';
    case 1: return 'bg-emerald-500';
    case 2: return 'bg-amber-500';
    case '3+': return 'bg-rose-500';
    default: return 'bg-muted-foreground/30';
  }
}

function formatTimeSlot(time: string): string {
  const [h] = time.split(':').map(Number);
  if (h === 0) return '12am';
  if (h < 12) return `${h}am`;
  if (h === 12) return '12pm';
  return `${h - 12}pm`;
}

// ============================================================================
// SKELETON
// ============================================================================

function LoadingSkeleton() {
  return (
    <Card className="card-hover">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-40 rounded" />
        </div>
        <div className="flex gap-3 mt-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 flex-1 rounded-lg" />
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {/* Day header skeleton */}
        <div className="flex gap-1 mb-2">
          <Skeleton className="h-5 w-16 shrink-0 rounded" />
          <div className="flex gap-1 flex-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-5 flex-1 rounded" />
            ))}
          </div>
        </div>
        {/* Grid rows skeleton */}
        <div className="space-y-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-1">
              <Skeleton className="h-8 w-16 shrink-0 rounded" />
              <div className="flex gap-1 flex-1">
                {Array.from({ length: 6 }).map((_, j) => (
                  <Skeleton key={j} className="h-8 flex-1 rounded" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// ERROR STATE
// ============================================================================

function ErrorState({ message }: { message: string }) {
  return (
    <Card className="card-hover">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Grid3X3 className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
          Room Occupancy Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// EMPTY STATE
// ============================================================================

function EmptyState() {
  return (
    <Card className="card-hover">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Grid3X3 className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
          Room Occupancy Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Building2 className="h-8 w-8 text-muted-foreground/50 mb-2" />
          <p className="text-sm font-medium">No room or schedule data</p>
          <p className="text-xs text-muted-foreground mt-1">
            Add rooms and schedules to see occupancy data
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// LEGEND
// ============================================================================

function Legend() {
  const items = [
    { level: 0 as OccupancyLevel, label: 'Empty' },
    { level: 1 as OccupancyLevel, label: 'Low (1)' },
    { level: 2 as OccupancyLevel, label: 'Med (2)' },
    { level: '3+' as OccupancyLevel, label: 'High (3+)' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
      {items.map((item) => (
        <div key={String(item.level)} className="flex items-center gap-1">
          <div className={cn('h-3 w-3 rounded-sm border', getCellColor(item.level))} />
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// SUMMARY STATS CARDS
// ============================================================================

function SummaryCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex-1 min-w-0 rounded-lg border bg-muted/30 dark:bg-muted/20 p-2.5 space-y-1">
      <div className="flex items-center gap-1.5">
        <Icon className={cn('h-3.5 w-3.5', color)} />
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider truncate">
          {label}
        </span>
      </div>
      <p className={cn('text-sm font-bold truncate', color)}>{value}</p>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function RoomOccupancyWidget() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [schedulesRes, roomsRes] = await Promise.all([
        fetch('/api/schedules'),
        fetch('/api/rooms'),
      ]);

      if (!schedulesRes.ok || !roomsRes.ok) throw new Error('Failed to fetch data');

      const schedulesData = await schedulesRes.json();
      const roomsData = await roomsRes.json();

      setSchedules(Array.isArray(schedulesData) ? schedulesData : []);
      setRooms(Array.isArray(roomsData) ? roomsData : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Build occupancy grid: key = "roomId-day-time" → count of schedules
  const occupancyGrid = useMemo<OccupancyGrid>(() => {
    const grid: OccupancyGrid = {};

    schedules.forEach((schedule) => {
      if (!schedule.roomId || !schedule.day || !schedule.startTime) return;

      const [startHour] = schedule.startTime.split(':').map(Number);
      const [endHour] = schedule.endTime.split(':').map(Number);

      // For each hour the schedule spans, increment the cell
      for (let hour = startHour; hour < endHour; hour++) {
        const timeKey = `${hour.toString().padStart(2, '0')}:00`;
        const cellKey = `${schedule.roomId}-${schedule.day}-${timeKey}`;
        const existing = grid[cellKey];
        const newCount = (existing?.count || 0) + 1;
        grid[cellKey] = {
          count: newCount,
          level: getOccupancyLevel(newCount),
        };
      }
    });

    return grid;
  }, [schedules]);

  // Display rooms (limited to MAX_ROOMS_DISPLAY)
  const displayRooms = useMemo(() => rooms.slice(0, MAX_ROOMS_DISPLAY), [rooms]);

  // Compute summary stats
  const summaryStats = useMemo<SummaryStats>(() => {
    if (rooms.length === 0 || schedules.length === 0) {
      return {
        mostUsedRoom: null,
        mostAvailableRoom: null,
        avgOccupancy: 0,
        totalSlots: 0,
        filledSlots: 0,
      };
    }

    // Count how many time slots each room is used
    const roomUsage = new Map<string, number>();
    const totalSlotsPerRoom = DAYS.length * TIME_SLOTS.length;

    rooms.forEach((room) => {
      let count = 0;
      DAYS.forEach((day) => {
        TIME_SLOTS.forEach((time) => {
          const key = `${room.id}-${day}-${time}`;
          if (occupancyGrid[key] && occupancyGrid[key].count > 0) {
            count++;
          }
        });
      });
      roomUsage.set(room.id, count);
    });

    // Most used room
    let mostUsed: { name: string; count: number } | null = null;
    let mostAvailable: { name: string; count: number } | null = null;

    rooms.forEach((room) => {
      const usage = roomUsage.get(room.id) || 0;
      if (!mostUsed || usage > mostUsed.count) {
        mostUsed = { name: room.roomName, count: usage };
      }
      if (!mostAvailable || usage < mostAvailable.count) {
        mostAvailable = { name: room.roomName, count: usage };
      }
    });

    // Average occupancy
    let filledSlots = 0;
    rooms.forEach((room) => {
      filledSlots += roomUsage.get(room.id) || 0;
    });
    const totalSlots = rooms.length * totalSlotsPerRoom;
    const avgOccupancy = totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0;

    return { mostUsedRoom: mostUsed, mostAvailableRoom: mostAvailable, avgOccupancy, totalSlots, filledSlots };
  }, [rooms, schedules, occupancyGrid]);

  // Render states
  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorState message={error} />;
  if (rooms.length === 0 || schedules.length === 0) return <EmptyState />;

  return (
    <Card className="card-hover">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Grid3X3 className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
            Room Occupancy Overview
          </CardTitle>
          <Badge variant="outline" className="text-[10px] font-normal gap-1">
            <BarChart3 className="h-3 w-3" />
            {rooms.length} rooms × {DAYS.length} days
          </Badge>
        </div>

        {/* Summary stats */}
        <div className="flex gap-3 mt-2">
          <SummaryCard
            icon={TrendingUp}
            label="Most Used Room"
            value={summaryStats.mostUsedRoom?.name || '—'}
            color="text-emerald-600 dark:text-emerald-400"
          />
          <SummaryCard
            icon={TrendingDown}
            label="Most Available"
            value={summaryStats.mostAvailableRoom?.name || '—'}
            color="text-sky-600 dark:text-sky-400"
          />
          <SummaryCard
            icon={Grid3X3}
            label="Avg Occupancy"
            value={`${summaryStats.avgOccupancy}%`}
            color="text-amber-600 dark:text-amber-400"
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Legend */}
        <Legend />

        {/* Scrollable grid */}
        <div className="overflow-x-auto scrollbar-styled -mx-1 px-1">
          <div className="min-w-[640px]">
            {/* Day headers */}
            <div className="flex gap-1 mb-1">
              <div className="w-20 shrink-0" />
              {DAYS.map((day) => (
                <div
                  key={day}
                  className="flex-1 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider py-1"
                >
                  {day.slice(0, 3)}
                </div>
              ))}
            </div>

            {/* Grid rows (rooms) */}
            {displayRooms.map((room, roomIndex) => (
              <motion.div
                key={room.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: roomIndex * 0.04 }}
                className="flex gap-1 mb-1"
              >
                {/* Room name */}
                <div className="w-20 shrink-0 flex items-center">
                  <span className="text-[10px] font-medium text-muted-foreground truncate" title={room.roomName}>
                    {room.roomName}
                  </span>
                </div>

                {/* Cells for each day — show the occupancy at the busiest hour */}
                {DAYS.map((day) => {
                  // Find the maximum occupancy for this room on this day across all time slots
                  let maxCount = 0;
                  TIME_SLOTS.forEach((time) => {
                    const key = `${room.id}-${day}-${time}`;
                    const cell = occupancyGrid[key];
                    if (cell && cell.count > maxCount) {
                      maxCount = cell.count;
                    }
                  });

                  const level = getOccupancyLevel(maxCount);

                  return (
                    <div
                      key={`${room.id}-${day}`}
                      className={cn(
                        'flex-1 h-8 rounded flex items-center justify-center text-[10px] font-bold border transition-colors',
                        getCellColor(level)
                      )}
                      title={`${room.roomName} — ${day}: ${maxCount} schedule${maxCount !== 1 ? 's' : ''} at peak hour`}
                    >
                      {maxCount > 0 ? (
                        <div className="flex items-center gap-0.5">
                          <div className={cn('h-1.5 w-1.5 rounded-full', getCellDotColor(level))} />
                          {maxCount}
                        </div>
                      ) : (
                        <span className="opacity-40">—</span>
                      )}
                    </div>
                  );
                })}
              </motion.div>
            ))}

            {/* Time slot detail rows */}
            {displayRooms.length > 0 && TIME_SLOTS.length > 0 && (
              <div className="mt-3 pt-2 border-t">
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-2">
                  Hourly Detail (Mon–Fri, first {Math.min(5, displayRooms.length)} rooms)
                </p>
                <div className="space-y-0.5">
                  {TIME_SLOTS.map((time, slotIndex) => (
                    <motion.div
                      key={time}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2, delay: displayRooms.length * 0.04 + slotIndex * 0.02 }}
                      className="flex gap-1"
                    >
                      <div className="w-20 shrink-0 flex items-center">
                        <span className="text-[10px] font-medium text-muted-foreground tabular-nums">
                          {formatTimeSlot(time)}
                        </span>
                      </div>
                      {DAYS.slice(0, 6).map((day) => {
                        // Aggregate across rooms for this day+time
                        let totalOccupancy = 0;
                        displayRooms.slice(0, 5).forEach((room) => {
                          const key = `${room.id}-${day}-${time}`;
                          const cell = occupancyGrid[key];
                          if (cell && cell.count > 0) {
                            totalOccupancy += cell.count;
                          }
                        });

                        const level = getOccupancyLevel(totalOccupancy);

                        return (
                          <div
                            key={`${time}-${day}`}
                            className={cn(
                              'flex-1 h-6 rounded flex items-center justify-center text-[9px] font-semibold border',
                              getCellColor(level)
                            )}
                            title={`${day} ${formatTimeSlot(time)}: ${totalOccupancy} total schedule${totalOccupancy !== 1 ? 's' : ''}`}
                          >
                            {totalOccupancy > 0 ? (
                              <div className="flex items-center gap-0.5">
                                <div className={cn('h-1 w-1 rounded-full', getCellDotColor(level))} />
                                {totalOccupancy}
                              </div>
                            ) : (
                              <span className="opacity-30">·</span>
                            )}
                          </div>
                        );
                      })}
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {rooms.length > MAX_ROOMS_DISPLAY && (
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            Showing {MAX_ROOMS_DISPLAY} of {rooms.length} rooms
          </p>
        )}
      </CardContent>
    </Card>
  );
}
