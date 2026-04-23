'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { DoorOpen, CalendarDays, Building2, AlertTriangle } from 'lucide-react';
import { useTheme } from 'next-themes';
import { DAYS } from '@/types';
import type { Room, Schedule, User } from '@/types';

// ============================================================================
// TYPES
// ============================================================================

interface RoomUtilizationData {
  totalRooms: number;
  utilizedRooms: number;
  unusedRooms: number;
  percentage: number;
}

interface DayDistribution {
  day: string;
  count: number;
  isHighest: boolean;
}

interface DepartmentWorkload {
  department: string;
  units: number;
  maxUnits: number;
  percentage: number;
  fill: string;
}

type FetchStatus = 'loading' | 'success' | 'error';

// ============================================================================
// COLORS
// ============================================================================

const COLORS = {
  emerald500: '#10b981',
  slate300: '#cbd5e1',
  slate500: '#64748b',
  emerald600: '#059669',
  emerald400: '#34d399',
  amber500: '#f59e0b',
  red500: '#ef4444',
};

const COLORS_DARK = {
  unused: '#334155',
};

const WORKLOAD_THRESHOLD = 80;

// ============================================================================
// TOOLTIP STYLES
// ============================================================================

const tooltipContentStyle: React.CSSProperties = {
  backgroundColor: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  fontSize: '12px',
  color: 'var(--foreground)',
};

const tooltipItemStyle: React.CSSProperties = {
  color: 'var(--foreground)',
};

const tooltipCursorStyle = { fill: 'var(--muted)' };

const axisTickStyle: React.CSSProperties = { fontSize: 11, fill: 'var(--muted-foreground)' };
const axisLineStyle: React.CSSProperties = { stroke: 'var(--border)' };

// ============================================================================
// SKELETON LOADERS
// ============================================================================

function ChartSkeleton() {
  return (
    <Card className="card-hover">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-32 rounded" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[240px] w-full rounded-lg bg-muted/50 dark:bg-muted/30" />
      </CardContent>
    </Card>
  );
}

// ============================================================================
// 1. ROOM UTILIZATION CHART (Donut)
// ============================================================================

function RoomUtilizationChart({ status, data }: { status: FetchStatus; data: RoomUtilizationData | null }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  if (status === 'loading') return <ChartSkeleton />;
  if (status === 'error' || !data) {
    return (
      <Card className="card-hover">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <DoorOpen className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
            Room Utilization
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <AlertTriangle className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground dark:text-muted-foreground/80">Unable to load room data</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = [
    { name: 'Utilized', value: data.utilizedRooms },
    { name: 'Unused', value: data.unusedRooms },
  ];

  const roomFormatter = (value: number, name: string) => [`${value} rooms`, name];

  return (
    <Card className="card-hover">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <DoorOpen className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
          Room Utilization
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
                animationBegin={0}
                animationDuration={800}
              >
                <Cell fill={COLORS.emerald500} stroke="none" />
                <Cell fill={isDark ? COLORS_DARK.unused : COLORS.slate300} stroke="none" />
              </Pie>
              <Tooltip
                contentStyle={tooltipContentStyle}
                itemStyle={tooltipItemStyle}
                formatter={roomFormatter}
              />
              <Legend
                wrapperStyle={{ fontSize: '12px', color: 'var(--foreground)' }}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Center label overlay */}
          {data.totalRooms > 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ marginTop: '-4px' }}>
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{data.totalRooms}</p>
                <p className="text-[10px] text-muted-foreground">Total Rooms</p>
              </div>
            </div>
          )}
        </div>
        <div className="text-center mt-2">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">{data.percentage}%</span> <span className="dark:text-muted-foreground/80">of rooms are in use</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// 2. SCHEDULE DISTRIBUTION BY DAY (Bar Chart)
// ============================================================================

function ScheduleDistributionChart({ status, data }: { status: FetchStatus; data: DayDistribution[] | null }) {
  if (status === 'loading') return <ChartSkeleton />;
  if (status === 'error' || !data || data.length === 0) {
    return (
      <Card className="card-hover">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <CalendarDays className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
            Schedule Distribution
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <AlertTriangle className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground dark:text-muted-foreground/80">Unable to load schedule data</p>
        </CardContent>
      </Card>
    );
  }

  const scheduleFormatter = (value: number) => [`${value} schedules`, 'Count'];

  return (
    <Card className="card-hover">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <CalendarDays className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
          Schedule Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
            <defs>
              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLORS.emerald400} />
                <stop offset="100%" stopColor={COLORS.emerald600} />
              </linearGradient>
              <linearGradient id="barGradientHighlight" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="100%" stopColor="#047857" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.6} vertical={false} />
            <XAxis
              dataKey="day"
              tick={axisTickStyle}
              axisLine={axisLineStyle}
              tickLine={false}
              interval={0}
            />
            <YAxis
              tick={axisTickStyle}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={tooltipContentStyle}
              itemStyle={tooltipItemStyle}
              cursor={tooltipCursorStyle}
              formatter={scheduleFormatter}
            />
            <Bar
              dataKey="count"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
              animationDuration={800}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.isHighest ? 'url(#barGradientHighlight)' : 'url(#barGradient)'}
                  stroke={entry.isHighest ? COLORS.emerald600 : 'none'}
                  strokeWidth={entry.isHighest ? 1 : 0}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// 3. DEPARTMENT WORKLOAD OVERVIEW (Horizontal Bar Chart)
// ============================================================================

function DepartmentWorkloadChart({ status, data }: { status: FetchStatus; data: DepartmentWorkload[] | null }) {
  if (status === 'loading') return <ChartSkeleton />;
  if (status === 'error' || !data || data.length === 0) {
    return (
      <Card className="card-hover">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Building2 className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
            Department Workload
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <AlertTriangle className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground dark:text-muted-foreground/80">Unable to load workload data</p>
        </CardContent>
      </Card>
    );
  }

  // Sort by units descending
  const sortedData = [...data].sort((a, b) => b.units - a.units);

  const workloadFormatter = (value: number, _name: string, props: { payload: DepartmentWorkload }) => {
    const pct = props.payload.percentage;
    const loadStatus = pct > 100 ? 'Overloaded' : pct > WORKLOAD_THRESHOLD ? 'High' : 'Normal';
    return [`${value} units (${pct}%) — ${loadStatus}`, 'Workload'];
  };

  return (
    <Card className="card-hover">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Building2 className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
          Department Workload
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={Math.max(240, sortedData.length * 40 + 20)}>
          <BarChart
            data={sortedData}
            layout="vertical"
            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
          >
            <defs>
              <linearGradient id="hBarGreen" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={COLORS.emerald500} />
                <stop offset="100%" stopColor={COLORS.emerald400} />
              </linearGradient>
              <linearGradient id="hBarAmber" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#d97706" />
                <stop offset="100%" stopColor={COLORS.amber500} />
              </linearGradient>
              <linearGradient id="hBarRed" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#dc2626" />
                <stop offset="100%" stopColor={COLORS.red500} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.6} horizontal={false} />
            <XAxis
              type="number"
              tick={axisTickStyle}
              axisLine={axisLineStyle}
              tickLine={false}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="department"
              tick={axisTickStyle}
              axisLine={false}
              tickLine={false}
              width={120}
            />
            <Tooltip
              contentStyle={tooltipContentStyle}
              itemStyle={tooltipItemStyle}
              cursor={tooltipCursorStyle}
              formatter={workloadFormatter}
            />
            <Bar
              dataKey="units"
              radius={[0, 4, 4, 0]}
              maxBarSize={24}
              animationDuration={800}
            >
              {sortedData.map((entry, index) => {
                let fillUrl = 'url(#hBarGreen)';
                if (entry.percentage > 100) fillUrl = 'url(#hBarRed)';
                else if (entry.percentage > WORKLOAD_THRESHOLD) fillUrl = 'url(#hBarAmber)';
                return <Cell key={`dept-${index}`} fill={fillUrl} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        {/* Legend for workload levels */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mt-2 text-[11px] text-muted-foreground dark:text-muted-foreground/80">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: COLORS.emerald500 }} />
            Normal (&le;80%)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: COLORS.amber500 }} />
            High (&gt;80%)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: COLORS.red500 }} />
            Overloaded (&gt;100%)
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DashboardChartWidgets() {
  // Room utilization state
  const [roomStatus, setRoomStatus] = useState<FetchStatus>('loading');
  const [roomData, setRoomData] = useState<RoomUtilizationData | null>(null);

  // Schedule distribution state
  const [scheduleStatus, setScheduleStatus] = useState<FetchStatus>('loading');
  const [scheduleData, setScheduleData] = useState<DayDistribution[] | null>(null);

  // Department workload state
  const [workloadStatus, setWorkloadStatus] = useState<FetchStatus>('loading');
  const [workloadData, setWorkloadData] = useState<DepartmentWorkload[] | null>(null);

  // Fetch room utilization data
  const fetchRoomData = useCallback(async () => {
    try {
      setRoomStatus('loading');
      const [roomsRes, schedulesRes] = await Promise.all([
        fetch('/api/rooms'),
        fetch('/api/schedules'),
      ]);

      if (!roomsRes.ok || !schedulesRes.ok) throw new Error('Failed to fetch');

      const rooms: Room[] = await roomsRes.json();
      const schedules: Schedule[] = await schedulesRes.json();

      // Find rooms that have at least 1 schedule
      const usedRoomIds = new Set(schedules.map((s) => s.roomId));
      const utilizedRooms = rooms.filter((r) => usedRoomIds.has(r.id)).length;
      const totalRooms = rooms.length;
      const unusedRooms = totalRooms - utilizedRooms;
      const percentage = totalRooms > 0 ? Math.round((utilizedRooms / totalRooms) * 100) : 0;

      setRoomData({ totalRooms, utilizedRooms, unusedRooms, percentage });
      setRoomStatus('success');
    } catch (error) {
      console.error('Error fetching room utilization:', error);
      setRoomStatus('error');
    }
  }, []);

  // Fetch schedule distribution data
  const fetchScheduleData = useCallback(async () => {
    try {
      setScheduleStatus('loading');
      const res = await fetch('/api/schedules');

      if (!res.ok) throw new Error('Failed to fetch schedules');

      const schedules: Schedule[] = await res.json();

      // Count schedules per day
      const dayCounts = new Map<string, number>();
      for (const day of DAYS) {
        dayCounts.set(day, 0);
      }
      schedules.forEach((s) => {
        const count = dayCounts.get(s.day) || 0;
        dayCounts.set(s.day, count + 1);
      });

      // Find the day with the most schedules
      let maxCount = 0;
      dayCounts.forEach((count) => {
        if (count > maxCount) maxCount = count;
      });

      const distribution: DayDistribution[] = DAYS.map((day) => ({
        day,
        count: dayCounts.get(day) || 0,
        isHighest: (dayCounts.get(day) || 0) === maxCount && maxCount > 0,
      }));

      setScheduleData(distribution);
      setScheduleStatus('success');
    } catch (error) {
      console.error('Error fetching schedule distribution:', error);
      setScheduleStatus('error');
    }
  }, []);

  // Fetch department workload data
  const fetchWorkloadData = useCallback(async () => {
    try {
      setWorkloadStatus('loading');
      const [schedulesRes, usersRes] = await Promise.all([
        fetch('/api/schedules'),
        fetch('/api/users?role=faculty'),
      ]);

      if (!schedulesRes.ok || !usersRes.ok) throw new Error('Failed to fetch');

      const schedules: Schedule[] = await schedulesRes.json();
      const faculty: User[] = await usersRes.json();

      // Group faculty by department and track maxUnits vs assigned units
      const deptMap = new Map<string, { totalMaxUnits: number; assignedUnits: number }>();

      // Initialize with faculty maxUnits
      faculty.forEach((f) => {
        const deptName = f.department?.name || 'Unassigned';
        const existing = deptMap.get(deptName) || { totalMaxUnits: 0, assignedUnits: 0 };
        existing.totalMaxUnits += f.maxUnits;
        deptMap.set(deptName, existing);
      });

      // Count assigned units per faculty from schedules
      const facultyAssignedUnits = new Map<string, number>();
      schedules.forEach((s) => {
        const units = s.subject?.units || 3;
        const current = facultyAssignedUnits.get(s.facultyId) || 0;
        facultyAssignedUnits.set(s.facultyId, current + units);
      });

      // Add assigned units to department totals
      faculty.forEach((f) => {
        const deptName = f.department?.name || 'Unassigned';
        const existing = deptMap.get(deptName);
        if (existing) {
          existing.assignedUnits += facultyAssignedUnits.get(f.id) || 0;
        }
      });

      // Build final data array
      const workload: DepartmentWorkload[] = [];
      deptMap.forEach((val, deptName) => {
        const percentage = val.totalMaxUnits > 0 ? Math.round((val.assignedUnits / val.totalMaxUnits) * 100) : 0;
        workload.push({
          department: deptName,
          units: val.assignedUnits,
          maxUnits: val.totalMaxUnits,
          percentage,
          fill: '',
        });
      });

      setWorkloadData(workload);
      setWorkloadStatus('success');
    } catch (error) {
      console.error('Error fetching department workload:', error);
      setWorkloadStatus('error');
    }
  }, []);

  useEffect(() => {
    fetchRoomData();
    fetchScheduleData();
    fetchWorkloadData();
  }, [fetchRoomData, fetchScheduleData, fetchWorkloadData]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 stagger-children">
      <RoomUtilizationChart status={roomStatus} data={roomData} />
      <ScheduleDistributionChart status={scheduleStatus} data={scheduleData} />
      <DepartmentWorkloadChart status={workloadStatus} data={workloadData} />
    </div>
  );
}
