'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, Users, BookOpen, DoorOpen, AlertTriangle,
  Clock, Calendar, MapPin, Activity, RefreshCw, Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AnalyticsData {
  overview: {
    totalSchedules: number;
    totalFaculty: number;
    totalSubjects: number;
    totalSections: number;
    totalRooms: number;
  };
  conflicts: {
    total: number;
    active: number;
    critical: number;
    warning: number;
    resolved: number;
  };
  facultyWorkload: {
    averageUtilization: number;
    overloaded: number;
    underloaded: number;
    optimal: number;
    details: Array<{
      id: string;
      name: string;
      department: string;
      totalUnits: number;
      maxUnits: number;
      utilization: number;
      status: string;
      scheduleCount: number;
    }>;
  };
  timeDistribution: {
    morning: number;
    afternoon: number;
    evening: number;
    dayDistribution: Record<string, number>;
    peakHours: Record<string, number>;
  };
  roomUtilization: Array<{
    name: string;
    capacity: number;
    usage: number;
    utilization: number;
  }>;
  departmentStats: Array<{
    name: string;
    schedules: number;
    faculty: number;
    conflicts: number;
  }>;
  quality: {
    overallScore: number;
    preferenceMatchRate: number;
    loadBalanceScore: number;
  };
}

const overviewCards = [
  { label: 'Schedules', key: 'totalSchedules' as const, icon: Calendar, iconColor: 'text-primary/50' },
  { label: 'Faculty', key: 'totalFaculty' as const, icon: Users, iconColor: 'text-blue-500/50' },
  { label: 'Subjects', key: 'totalSubjects' as const, icon: BookOpen, iconColor: 'text-purple-500/50' },
  { label: 'Sections', key: 'totalSections' as const, icon: Users, iconColor: 'text-amber-500/50' },
  { label: 'Rooms', key: 'totalRooms' as const, icon: DoorOpen, iconColor: 'text-emerald-500/50' },
];

const statGradientClasses = [
  'analytics-stat-gradient-1',
  'analytics-stat-gradient-2',
  'analytics-stat-gradient-3',
  'analytics-stat-gradient-4',
  'analytics-stat-gradient-5',
];

const topBorderGradients = [
  'bg-gradient-to-r from-emerald-500 to-teal-500',
  'bg-gradient-to-r from-teal-500 to-cyan-500',
  'bg-gradient-to-r from-amber-500 to-yellow-500',
  'bg-gradient-to-r from-violet-500 to-purple-500',
  'bg-gradient-to-r from-rose-500 to-pink-500',
];

export function AnalyticsView() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/analytics');
      const analyticsData = await res.json();
      setData(analyticsData);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6"
      >
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-9 w-64 skeleton-line rounded-lg" />
            <div className="h-4 w-48 skeleton-line rounded" />
          </div>
          <div className="h-10 w-28 skeleton-line rounded-lg" />
        </div>

        {/* Stat cards skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <div className="h-[2px] skeleton-line rounded-none" />
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="h-3 w-16 skeleton-line rounded" />
                    <div className="h-7 w-12 skeleton-line rounded" />
                  </div>
                  <div className="h-8 w-8 skeleton-line rounded-lg" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Middle row skeleton */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <div className="h-5 w-28 skeleton-line rounded" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center py-4">
                <div className="h-24 w-24 rounded-full skeleton-line" />
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <div className="h-3 w-full skeleton-line rounded" />
                  <div className="h-2 w-full skeleton-line rounded" />
                </div>
                <div className="space-y-1.5">
                  <div className="h-3 w-full skeleton-line rounded" />
                  <div className="h-2 w-full skeleton-line rounded" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="md:col-span-2">
            <CardHeader>
              <div className="h-5 w-32 skeleton-line rounded" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="p-3 rounded-lg skeleton-line h-16" />
                ))}
              </div>
              <div className="space-y-1.5">
                <div className="h-3 w-full skeleton-line rounded" />
                <div className="h-2 w-full skeleton-line rounded" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom row skeleton */}
        <div className="grid md:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-5 w-32 skeleton-line rounded" />
              </CardHeader>
              <CardContent className="space-y-3">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="h-12 skeleton-line rounded-lg" />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Failed to load analytics</p>
      </div>
    );
  }

  // SVG circular progress ring config: radius=45, circumference=2*pi*45≈283
  const ringRadius = 45;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference - (data.quality.overallScore / 100) * ringCircumference;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Page header with gradient title + accent line + timestamp */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            Analytics Dashboard
          </h1>
          <div className="h-[2px] w-20 bg-gradient-to-r from-emerald-500 to-teal-500 mt-1 rounded-full" />
          <p className="text-muted-foreground mt-1">Comprehensive scheduling insights</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
          </div>
          <Button variant="outline" onClick={fetchAnalytics}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview stat cards with staggered animation, hover, gradient top borders */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {overviewCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.key}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: idx * 0.07, ease: 'easeOut' }}
            >
              <Card className={cn(
                'overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200',
                statGradientClasses[idx]
              )}>
                <div className={cn('h-[2px]', topBorderGradients[idx])} />
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="text-2xl font-bold">{data.overview[stat.key]}</p>
                    </div>
                    <Icon className={cn('h-8 w-8', stat.iconColor)} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Quality Score card with animated circular progress ring */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Quality Score
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-2">
              <div className="relative inline-flex items-center justify-center">
                <svg className="w-28 h-28 -rotate-90 analytics-quality-ring" viewBox="0 0 100 100">
                  {/* Background track */}
                  <circle
                    cx="50"
                    cy="50"
                    r={ringRadius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-muted/30"
                  />
                  {/* Animated progress ring */}
                  <circle
                    cx="50"
                    cy="50"
                    r={ringRadius}
                    fill="none"
                    stroke="url(#qualityGradient)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={ringOffset}
                    style={{
                      transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)',
                      animation: 'quality-ring-fill 1s ease-out',
                    }}
                  />
                  <defs>
                    <linearGradient id="qualityGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#14b8a6" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                    {data.quality.overallScore}%
                  </span>
                  <span className="text-[10px] text-muted-foreground -mt-0.5">Overall</span>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, delay: 0.2 }}
              >
                <div className="flex justify-between text-sm mb-1">
                  <span>Preference Match</span>
                  <span className="font-medium">{data.quality.preferenceMatchRate}%</span>
                </div>
                <Progress value={data.quality.preferenceMatchRate} className="h-2" />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, delay: 0.35 }}
              >
                <div className="flex justify-between text-sm mb-1">
                  <span>Load Balance</span>
                  <span className="font-medium">{data.quality.loadBalanceScore}%</span>
                </div>
                <Progress value={data.quality.loadBalanceScore} className="h-2" />
              </motion.div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Conflict Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold">{data.conflicts.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div className="text-center p-3 bg-red-500/10 rounded-lg">
                <p className="text-2xl font-bold text-red-500">{data.conflicts.critical}</p>
                <p className="text-xs text-muted-foreground">Critical</p>
              </div>
              <div className="text-center p-3 bg-amber-500/10 rounded-lg">
                <p className="text-2xl font-bold text-amber-500">{data.conflicts.warning}</p>
                <p className="text-xs text-muted-foreground">Warnings</p>
              </div>
              <div className="text-center p-3 bg-emerald-500/10 rounded-lg">
                <p className="text-2xl font-bold text-emerald-500">{data.conflicts.resolved}</p>
                <p className="text-xs text-muted-foreground">Resolved</p>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Resolution Progress</span>
                <span>{data.conflicts.total > 0 ? Math.round((data.conflicts.resolved / data.conflicts.total) * 100) : 100}%</span>
              </div>
              <Progress value={data.conflicts.total > 0 ? (data.conflicts.resolved / data.conflicts.total) * 100 : 100} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Faculty Workload
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-red-500/10 rounded-lg">
                <p className="text-xl font-bold text-red-500">{data.facultyWorkload.overloaded}</p>
                <p className="text-xs text-muted-foreground">Overloaded</p>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-lg">
                <p className="text-xl font-bold text-emerald-500">{data.facultyWorkload.optimal}</p>
                <p className="text-xs text-muted-foreground">Optimal</p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <p className="text-xl font-bold text-blue-500">{data.facultyWorkload.underloaded}</p>
                <p className="text-xs text-muted-foreground">Underloaded</p>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Average Utilization</span>
                <span className="font-medium">{data.facultyWorkload.averageUtilization}%</span>
              </div>
              <Progress value={data.facultyWorkload.averageUtilization} className="h-2" />
            </div>
            <ScrollArea className="h-[150px]">
              <div className="space-y-2">
                {data.facultyWorkload.details.slice(0, 8).map((faculty) => (
                  <div
                    key={faculty.id}
                    className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-default"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{faculty.name}</p>
                      <p className="text-xs text-muted-foreground">{faculty.department}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{faculty.utilization.toFixed(0)}%</p>
                      <Badge variant="outline" className={cn(
                        "text-xs",
                        faculty.status === 'overloaded' && "border-red-500 text-red-500",
                        faculty.status === 'optimal' && "border-emerald-500 text-emerald-500",
                        faculty.status === 'underloaded' && "border-blue-500 text-blue-500"
                      )}>
                        {faculty.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Time Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex h-8 rounded-lg overflow-hidden">
              <div 
                className="bg-amber-500/70 flex items-center justify-center text-xs font-medium text-white analytics-time-bar"
                style={{ width: `${(data.timeDistribution.morning / (data.overview.totalSchedules || 1)) * 100}%` }}
              >
                {data.timeDistribution.morning > 0 && 'AM'}
              </div>
              <div 
                className="bg-blue-500/70 flex items-center justify-center text-xs font-medium text-white analytics-time-bar"
                style={{ width: `${(data.timeDistribution.afternoon / (data.overview.totalSchedules || 1)) * 100}%` }}
              >
                {data.timeDistribution.afternoon > 0 && 'PM'}
              </div>
              <div 
                className="bg-purple-500/70 flex items-center justify-center text-xs font-medium text-white analytics-time-bar"
                style={{ width: `${(data.timeDistribution.evening / (data.overview.totalSchedules || 1)) * 100}%` }}
              >
                {data.timeDistribution.evening > 0 && 'EVE'}
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div className="p-2 bg-amber-500/10 rounded">
                <p className="font-bold text-amber-500">{data.timeDistribution.morning}</p>
                <p className="text-xs text-muted-foreground">Morning</p>
              </div>
              <div className="p-2 bg-blue-500/10 rounded">
                <p className="font-bold text-blue-500">{data.timeDistribution.afternoon}</p>
                <p className="text-xs text-muted-foreground">Afternoon</p>
              </div>
              <div className="p-2 bg-purple-500/10 rounded">
                <p className="font-bold text-purple-500">{data.timeDistribution.evening}</p>
                <p className="text-xs text-muted-foreground">Evening</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Day Distribution</p>
              <div className="flex gap-1">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => {
                  const count = data.timeDistribution.dayDistribution[day] || 0;
                  const maxCount = Math.max(...Object.values(data.timeDistribution.dayDistribution));
                  const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
                  return (
                    <div key={day} className="flex-1 flex flex-col items-center">
                      <div className="w-full h-16 bg-muted/30 rounded flex items-end">
                        <div 
                          className="w-full bg-primary/70 rounded transition-all analytics-time-bar"
                          style={{ height: `${height}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">{day.slice(0, 3)}</p>
                      <p className="text-xs font-medium">{count}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Room Utilization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-3">
                {data.roomUtilization.slice(0, 10).map((room, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{room.name}</span>
                      <span className="text-muted-foreground">{room.utilization.toFixed(0)}%</span>
                    </div>
                    <Progress value={room.utilization} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{room.usage} schedules</span>
                      <span>Cap: {room.capacity}</span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Department Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-3">
                {data.departmentStats.map((dept, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-muted/30 border border-transparent hover:border-emerald-500/30 transition-all cursor-default"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium">{dept.name}</p>
                        <p className="text-xs text-muted-foreground">{dept.faculty} faculty</p>
                      </div>
                      <Badge variant="outline">{dept.schedules} schedules</Badge>
                    </div>
                    {dept.conflicts > 0 && (
                      <p className="text-xs text-red-500">{dept.conflicts} conflicts</p>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
