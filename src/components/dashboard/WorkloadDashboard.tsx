'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from 'recharts';
import {
  Users,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  ArrowRightLeft,
  RefreshCw,
  Loader2,
  AlertCircle,
  BarChart3,
  Clock,
  BookOpen,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store';

// Types matching the API response
interface FacultyWorkload {
  id: string;
  name: string;
  email: string;
  department?: string | null;
  maxUnits: number;
  totalUnits: number;
  utilizationPercent: number;
  hoursPerDay: Record<string, number>;
  unitsPerDay: Record<string, number>;
  scheduleCount: number;
  status: 'overloaded' | 'underloaded' | 'balanced';
  loadBalanceScore: number;
}

interface WorkloadSwap {
  scheduleId: string;
  subjectCode: string;
  subjectName: string;
  currentFacultyId: string;
  currentFacultyName: string;
  suggestedFacultyId: string;
  suggestedFacultyName: string;
  day: string;
  startTime: string;
  endTime: string;
  units: number;
  reason: string;
  impact: string;
}

interface WorkloadAnalysis {
  faculty: FacultyWorkload[];
  overloadedFaculty: FacultyWorkload[];
  underloadedFaculty: FacultyWorkload[];
  balancedFaculty: FacultyWorkload[];
  averageUtilization: number;
  totalSchedules: number;
  suggestedSwaps: WorkloadSwap[];
  dayDistribution: Record<string, { total: number; faculty: Record<string, number> }>;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Color scheme for status
const STATUS_COLORS = {
  overloaded: { bg: 'bg-red-500/10', text: 'text-red-600', border: 'border-red-500/20', chart: '#ef4444' },
  underloaded: { bg: 'bg-amber-500/10', text: 'text-amber-600', border: 'border-amber-500/20', chart: '#f59e0b' },
  balanced: { bg: 'bg-emerald-500/10', text: 'text-emerald-600', border: 'border-emerald-500/20', chart: '#22c55e' },
};

export function WorkloadDashboard() {
  const { selectedDepartment } = useAppStore();
  const [analysis, setAnalysis] = useState<WorkloadAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [balancing, setBalancing] = useState(false);
  const [selectedSwaps, setSelectedSwaps] = useState<Set<string>>(new Set());
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Fetch workload analysis
  const fetchWorkload = async () => {
    setLoading(true);
    try {
      const url = selectedDepartment 
        ? `/api/workload?departmentId=${selectedDepartment}` 
        : '/api/workload';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch workload');
      const data = await response.json();
      setAnalysis(data);
    } catch (error) {
      console.error('Error fetching workload:', error);
      toast.error('Failed to load workload analysis');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkload();
  }, [selectedDepartment]);

  // Toggle swap selection
  const toggleSwapSelection = (scheduleId: string) => {
    setSelectedSwaps((prev) => {
      const next = new Set(prev);
      if (next.has(scheduleId)) {
        next.delete(scheduleId);
      } else {
        next.add(scheduleId);
      }
      return next;
    });
  };

  // Select all suggested swaps
  const selectAllSwaps = () => {
    if (!analysis) return;
    setSelectedSwaps(new Set(analysis.suggestedSwaps.map((s) => s.scheduleId)));
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedSwaps(new Set());
  };

  // Apply selected swaps
  const applySwaps = async (dryRun: boolean = false) => {
    if (!analysis || selectedSwaps.size === 0) return;

    setBalancing(true);
    try {
      const swaps = analysis.suggestedSwaps
        .filter((s) => selectedSwaps.has(s.scheduleId))
        .map((s) => ({
          scheduleId: s.scheduleId,
          suggestedFacultyId: s.suggestedFacultyId,
        }));

      const response = await fetch('/api/workload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ swaps, dryRun }),
      });

      if (!response.ok) throw new Error('Failed to apply swaps');
      
      const result = await response.json();
      
      if (dryRun) {
        toast.success(`Validated ${result.summary.successful} swaps`);
      } else {
        toast.success(`Applied ${result.summary.successful} swaps successfully`);
        if (result.summary.failed > 0) {
          toast.warning(`${result.summary.failed} swaps failed`);
        }
        // Refresh data after applying
        await fetchWorkload();
        setSelectedSwaps(new Set());
      }
    } catch (error) {
      console.error('Error applying swaps:', error);
      toast.error('Failed to apply swaps');
    } finally {
      setBalancing(false);
      setShowConfirmDialog(false);
    }
  };

  // Prepare chart data for faculty workload by day
  const getWorkloadChartData = () => {
    if (!analysis) return [];
    
    return analysis.faculty.map((f) => ({
      name: f.name.length > 15 ? f.name.slice(0, 15) + '...' : f.name,
      fullName: f.name,
      units: f.totalUnits,
      maxUnits: f.maxUnits,
      utilization: f.utilizationPercent,
      status: f.status,
      balanceScore: f.loadBalanceScore,
    }));
  };

  // Prepare day distribution chart data
  const getDayDistributionData = () => {
    if (!analysis) return [];
    
    return DAYS.map((day) => ({
      day: day.slice(0, 3),
      units: analysis.dayDistribution[day]?.total || 0,
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!analysis) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No workload data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-card via-card to-emerald-500/5" />
          <CardContent className="relative p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Users className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{analysis.faculty.length}</p>
                <p className="text-xs text-muted-foreground">Total Faculty</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-card via-card to-red-500/5" />
          <CardContent className="relative p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <TrendingUp className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{analysis.overloadedFaculty.length}</p>
                <p className="text-xs text-muted-foreground">Overloaded</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-card via-card to-amber-500/5" />
          <CardContent className="relative p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <TrendingDown className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">{analysis.underloadedFaculty.length}</p>
                <p className="text-xs text-muted-foreground">Underloaded</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-card via-card to-primary/5" />
          <CardContent className="relative p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{analysis.averageUtilization}%</p>
                <p className="text-xs text-muted-foreground">Avg. Utilization</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="faculty">Faculty Details</TabsTrigger>
          <TabsTrigger value="swaps">Suggested Swaps ({analysis.suggestedSwaps.length})</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Faculty Utilization Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Faculty Utilization
                </CardTitle>
                <CardDescription>Units assigned vs maximum capacity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getWorkloadChartData()} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                      <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                      <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(value: number, name: string) => [`${value}%`, 'Utilization']}
                        labelFormatter={(label, payload) => payload[0]?.payload?.fullName || label}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar dataKey="utilization" radius={[0, 4, 4, 0]}>
                        {getWorkloadChartData().map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={STATUS_COLORS[entry.status].chart}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Day Distribution Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Units by Day
                </CardTitle>
                <CardDescription>Distribution of teaching units across the week</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getDayDistributionData()}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar dataKey="units" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Status Summary */}
          <div className="grid md:grid-cols-3 gap-4">
            {/* Overloaded Faculty */}
            <Card className="border-red-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-4 w-4" />
                  Overloaded Faculty
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-48">
                  {analysis.overloadedFaculty.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No overloaded faculty</p>
                  ) : (
                    <div className="space-y-2">
                      {analysis.overloadedFaculty.map((f) => (
                        <div key={f.id} className="flex items-center justify-between p-2 rounded-lg bg-red-500/5">
                          <div>
                            <p className="text-sm font-medium">{f.name}</p>
                            <p className="text-xs text-muted-foreground">{f.department || 'No department'}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-red-600">{f.utilizationPercent}%</p>
                            <p className="text-xs text-muted-foreground">{f.totalUnits}/{f.maxUnits} units</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Underloaded Faculty */}
            <Card className="border-amber-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-amber-600">
                  <TrendingDown className="h-4 w-4" />
                  Underloaded Faculty
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-48">
                  {analysis.underloadedFaculty.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No underloaded faculty</p>
                  ) : (
                    <div className="space-y-2">
                      {analysis.underloadedFaculty.map((f) => (
                        <div key={f.id} className="flex items-center justify-between p-2 rounded-lg bg-amber-500/5">
                          <div>
                            <p className="text-sm font-medium">{f.name}</p>
                            <p className="text-xs text-muted-foreground">{f.department || 'No department'}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-amber-600">{f.utilizationPercent}%</p>
                            <p className="text-xs text-muted-foreground">{f.totalUnits}/{f.maxUnits} units</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Balanced Faculty */}
            <Card className="border-emerald-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                  Balanced Faculty
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-48">
                  {analysis.balancedFaculty.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No balanced faculty</p>
                  ) : (
                    <div className="space-y-2">
                      {analysis.balancedFaculty.map((f) => (
                        <div key={f.id} className="flex items-center justify-between p-2 rounded-lg bg-emerald-500/5">
                          <div>
                            <p className="text-sm font-medium">{f.name}</p>
                            <p className="text-xs text-muted-foreground">{f.department || 'No department'}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-emerald-600">{f.utilizationPercent}%</p>
                            <p className="text-xs text-muted-foreground">{f.totalUnits}/{f.maxUnits} units</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Faculty Details Tab */}
        <TabsContent value="faculty">
          <Card>
            <CardHeader>
              <CardTitle>Faculty Workload Details</CardTitle>
              <CardDescription>Complete breakdown of each faculty member's workload</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[600px]">
                <div className="space-y-3">
                  {analysis.faculty.map((f) => (
                    <motion.div
                      key={f.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        'p-4 rounded-lg border transition-colors',
                        STATUS_COLORS[f.status].bg,
                        STATUS_COLORS[f.status].border
                      )}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{f.name}</p>
                            <Badge 
                              variant="outline" 
                              className={cn(STATUS_COLORS[f.status].text)}
                            >
                              {f.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{f.email}</p>
                          {f.department && (
                            <p className="text-xs text-muted-foreground">{f.department}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold">{f.utilizationPercent}%</p>
                          <p className="text-xs text-muted-foreground">{f.totalUnits} / {f.maxUnits} units</p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Utilization</span>
                          <span className="font-medium">{f.utilizationPercent}%</span>
                        </div>
                        <Progress 
                          value={f.utilizationPercent} 
                          className={cn(
                            'h-2',
                            f.status === 'overloaded' && '[&>div]:bg-red-500',
                            f.status === 'underloaded' && '[&>div]:bg-amber-500',
                            f.status === 'balanced' && '[&>div]:bg-emerald-500'
                          )}
                        />
                        
                        <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t">
                          <div>
                            <p className="text-xs text-muted-foreground">Schedules</p>
                            <p className="text-sm font-medium">{f.scheduleCount}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Balance Score</p>
                            <p className="text-sm font-medium">{f.loadBalanceScore}%</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Days Active</p>
                            <p className="text-sm font-medium">
                              {Object.values(f.hoursPerDay).filter(h => h > 0).length} / 6
                            </p>
                          </div>
                        </div>

                        {/* Daily breakdown */}
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-xs text-muted-foreground mb-2">Hours per day</p>
                          <div className="grid grid-cols-6 gap-2">
                            {DAYS.map((day) => (
                              <div key={day} className="text-center">
                                <p className="text-[10px] text-muted-foreground">{day.slice(0, 3)}</p>
                                <p className="text-sm font-medium">{f.hoursPerDay[day]?.toFixed(1) || 0}h</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Suggested Swaps Tab */}
        <TabsContent value="swaps">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Suggested Workload Swaps</CardTitle>
                  <CardDescription>
                    Recommendations to balance faculty workload
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={selectAllSwaps}>
                    Select All
                  </Button>
                  <Button variant="outline" size="sm" onClick={clearSelection}>
                    Clear
                  </Button>
                  <Button
                    onClick={() => setShowConfirmDialog(true)}
                    disabled={selectedSwaps.size === 0 || balancing}
                    className="gap-2"
                  >
                    {balancing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowRightLeft className="h-4 w-4" />
                    )}
                    Apply Selected ({selectedSwaps.size})
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {analysis.suggestedSwaps.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-500 mb-4" />
                  <p className="font-medium">Workload is well balanced</p>
                  <p className="text-sm text-muted-foreground">
                    No swap suggestions at this time
                  </p>
                </div>
              ) : (
                <ScrollArea className="max-h-[500px]">
                  <div className="space-y-3">
                    <AnimatePresence>
                      {analysis.suggestedSwaps.map((swap) => (
                        <motion.div
                          key={swap.scheduleId}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          className={cn(
                            'p-4 rounded-lg border cursor-pointer transition-all',
                            selectedSwaps.has(swap.scheduleId)
                              ? 'border-primary bg-primary/5'
                              : 'hover:border-muted-foreground/30'
                          )}
                          onClick={() => toggleSwapSelection(swap.scheduleId)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <div className={cn(
                                'w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5',
                                selectedSwaps.has(swap.scheduleId)
                                  ? 'border-primary bg-primary'
                                  : 'border-muted-foreground/30'
                              )}>
                                {selectedSwaps.has(swap.scheduleId) && (
                                  <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className="text-xs">
                                    {swap.subjectCode}
                                  </Badge>
                                  <span className="text-sm font-medium">{swap.subjectName}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                  <span className="text-red-600 font-medium">{swap.currentFacultyName}</span>
                                  <ArrowRightLeft className="h-4 w-4" />
                                  <span className="text-emerald-600 font-medium">{swap.suggestedFacultyName}</span>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {swap.day} {swap.startTime}-{swap.endTime}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <BookOpen className="h-3 w-3" />
                                    {swap.units} units
                                  </span>
                                </div>
                              </div>
                            </div>
                            <Badge variant="secondary">{swap.units} units</Badge>
                          </div>
                          <div className="mt-3 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
                            <p className="font-medium mb-1">Impact:</p>
                            <p>{swap.impact}</p>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply Workload Swaps?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reassign {selectedSwaps.size} schedule(s) to balance faculty workload.
              Both affected faculty members will receive notifications about the changes.
              This action can be undone from the audit log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => applySwaps(false)}
              className="bg-primary text-primary-foreground"
            >
              Apply Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
