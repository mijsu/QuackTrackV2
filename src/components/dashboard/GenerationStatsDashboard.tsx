'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, Users, Building, Clock, TrendingUp, AlertTriangle, 
  CheckCircle, Calendar, RefreshCw, ChevronRight, Activity
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

interface GenerationStats {
  overview: {
    totalSchedules: number;
    totalSubjects: number;
    totalFaculty: number;
    totalRooms: number;
    totalSections: number;
  };
  facultyLoad: Array<{
    id: string;
    name: string;
    department: string;
    load: number;
    maxUnits: number;
    schedules: number;
    utilization: number;
  }>;
  roomUtilization: Array<{
    id: string;
    name: string;
    building: string;
    capacity: number;
    schedules: number;
    hoursPerWeek: number;
    utilizationPercent: number;
  }>;
  timeSlotDistribution: Record<string, number>;
  dayDistribution: Record<string, number>;
  departmentDistribution: Array<{
    department: string;
    schedules: number;
    facultyCount: number;
  }>;
  scoreDistribution: {
    min: number;
    max: number;
    avg: number;
    median: number;
  };
  sectionCoverage: {
    total: number;
    withSchedules: number;
    coveragePercent: number;
  };
  utilizationStats: {
    overloaded: number;
    underloaded: number;
    optimal: number;
    avgUtilization: number;
  };
  generationHistory: Array<{
    id: string;
    status: string;
    progress: number;
    startedAt: string;
    completedAt: string | null;
    elapsedTimeMs: number;
    assignedCount: number;
    unassignedCount: number;
  }>;
  versions: Array<{
    id: string;
    versionName: string;
    semester: string;
    academicYear: string;
    scheduleCount: number;
    generatedAt: string;
    isActive: boolean;
  }>;
}

export function GenerationStatsDashboard() {
  const [stats, setStats] = useState<GenerationStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/generation-stats');
      if (!res.ok) throw new Error('Failed to fetch stats');
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Activity className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No statistics available. Generate schedules first.
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Total Schedules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.overview.totalSchedules}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" /> Faculty Used
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.overview.totalFaculty}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Building className="h-4 w-4" /> Rooms Used
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.overview.totalRooms}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Avg Utilization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats.utilizationStats.avgUtilization * 100).toFixed(0)}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4" /> Section Coverage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.sectionCoverage.coveragePercent.toFixed(0)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Utilization Alerts */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-green-500/30">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <div className="text-sm text-muted-foreground">Optimal Load</div>
                <div className="text-xl font-bold text-green-600">{stats.utilizationStats.optimal}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-500/30">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <div>
                <div className="text-sm text-muted-foreground">Underloaded</div>
                <div className="text-xl font-bold text-amber-600">{stats.utilizationStats.underloaded}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-500/30">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <div className="text-sm text-muted-foreground">Overloaded</div>
                <div className="text-xl font-bold text-red-600">{stats.utilizationStats.overloaded}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for detailed views */}
      <Tabs defaultValue="faculty" className="space-y-4">
        <TabsList>
          <TabsTrigger value="faculty">Faculty Load</TabsTrigger>
          <TabsTrigger value="rooms">Room Utilization</TabsTrigger>
          <TabsTrigger value="time">Time Distribution</TabsTrigger>
          <TabsTrigger value="scores">Score Analysis</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="faculty" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Faculty Load Distribution</CardTitle>
              <CardDescription>Current teaching load vs. maximum capacity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.facultyLoad.slice(0, 15).map((faculty) => (
                  <div key={faculty.id} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{faculty.name}</span>
                      <span className="text-muted-foreground">
                        {faculty.load}/{faculty.maxUnits} units ({faculty.utilization.toFixed(0)}%)
                      </span>
                    </div>
                    <Progress 
                      value={faculty.utilization} 
                      className={`h-2 ${
                        faculty.utilization > 100 ? '[&>div]:bg-red-500' : 
                        faculty.utilization > 85 ? '[&>div]:bg-amber-500' : 
                        faculty.utilization < 30 ? '[&>div]:bg-blue-500' : ''
                      }`}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rooms" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Room Utilization</CardTitle>
              <CardDescription>Hours used per week per room</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.roomUtilization.slice(0, 15).map((room) => (
                  <div key={room.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{room.name}</div>
                      <div className="text-sm text-muted-foreground">{room.building} • Cap: {room.capacity}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{room.hoursPerWeek.toFixed(1)} hrs/week</div>
                      <div className="text-sm text-muted-foreground">{room.schedules} classes</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="time" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Time Slot Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(stats.timeSlotDistribution)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([time, count]) => (
                    <div key={time} className="flex items-center gap-3">
                      <span className="w-16 text-sm font-mono">{time}</span>
                      <div className="flex-1 bg-muted rounded-full h-4">
                        <div 
                          className="bg-primary h-full rounded-full" 
                          style={{ width: `${(count / Math.max(...Object.values(stats.timeSlotDistribution))) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground w-8">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Day Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(stats.dayDistribution).map(([day, count]) => (
                    <div key={day} className="flex items-center gap-3">
                      <span className="w-24 text-sm font-medium">{day}</span>
                      <div className="flex-1 bg-muted rounded-full h-4">
                        <div 
                          className="bg-primary h-full rounded-full" 
                          style={{ width: `${(count / Math.max(...Object.values(stats.dayDistribution))) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground w-8">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="scores" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Schedule Quality Scores</CardTitle>
              <CardDescription>Based on preference match, specialization, load balance, etc.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4 text-center">
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Minimum</div>
                  <div className="text-2xl font-bold">{stats.scoreDistribution.min.toFixed(2)}</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Maximum</div>
                  <div className="text-2xl font-bold">{stats.scoreDistribution.max.toFixed(2)}</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Average</div>
                  <div className="text-2xl font-bold">{stats.scoreDistribution.avg.toFixed(2)}</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Median</div>
                  <div className="text-2xl font-bold">{stats.scoreDistribution.median.toFixed(2)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Generation History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.generationHistory.map((session) => (
                  <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant={
                        session.status === 'completed' ? 'default' :
                        session.status === 'failed' ? 'destructive' :
                        session.status === 'cancelled' ? 'outline' : 'secondary'
                      }>
                        {session.status}
                      </Badge>
                      <div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(session.startedAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{session.assignedCount} assigned</div>
                      <div className="text-sm text-muted-foreground">
                        {(session.elapsedTimeMs / 1000).toFixed(1)}s
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Saved Versions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.versions.map((version) => (
                  <div key={version.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {version.isActive && <Badge className="bg-green-500">Active</Badge>}
                      <div>
                        <div className="font-medium">{version.versionName}</div>
                        <div className="text-sm text-muted-foreground">
                          {version.semester} {version.academicYear}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{version.scheduleCount} schedules</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(version.generatedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
