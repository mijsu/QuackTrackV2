'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HealthScore {
  score: number;
  label: string;
  color: string;
  icon: typeof TrendingUp;
}

export function ScheduleHealthScoreWidget() {
  const [score, setScore] = useState<HealthScore | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHealthScore() {
      try {
        const res = await fetch('/api/stats');
        if (res.ok) {
          const data = await res.json();
          const total = data.totalSchedules || 0;
          const conflicts = data.totalConflicts || 0;
          const resolved = data.resolvedConflicts || 0;
          const faculty = data.totalFaculty || 1;
          const overloaded = data.overloadedFaculty || 0;
          
          // Calculate health score (0-100)
          let healthScore = 100;
          
          // Deduct for conflicts
          if (total > 0) {
            healthScore -= Math.round((conflicts / total) * 30);
          }
          
          // Deduct for unresolved conflicts
          if (conflicts > 0 && resolved < conflicts) {
            const unresolvedRate = (conflicts - resolved) / conflicts;
            healthScore -= Math.round(unresolvedRate * 25);
          }
          
          // Deduct for overloaded faculty
          if (faculty > 0) {
            healthScore -= Math.round((overloaded / faculty) * 20);
          }
          
          // Deduct for underloaded faculty
          const underloaded = data.underloadedFaculty || 0;
          if (faculty > 0) {
            healthScore -= Math.round((underloaded / faculty) * 10);
          }
          
          // Deduct for low faculty utilization
          const avgUtil = data.facultyUtilizationAvg || 0;
          if (avgUtil < 40) healthScore -= 15;
          
          healthScore = Math.max(0, Math.min(100, healthScore));
          
          let label: string;
          let color: string;
          let icon: typeof TrendingUp;
          
          if (healthScore >= 80) {
            label = 'Excellent';
            color = 'text-emerald-600 dark:text-emerald-400';
            icon = TrendingUp;
          } else if (healthScore >= 60) {
            label = 'Good';
            color = 'text-teal-600 dark:text-teal-400';
            icon = TrendingUp;
          } else if (healthScore >= 40) {
            label = 'Needs Attention';
            color = 'text-amber-600 dark:text-amber-400';
            icon = Minus;
          } else {
            label = 'Critical';
            color = 'text-red-600 dark:text-red-400';
            icon = TrendingDown;
          }
          
          setScore({ score: healthScore, label, color, icon });
        }
      } catch {
        setScore({ score: 0, label: 'Unavailable', color: 'text-muted-foreground', icon: Activity });
      } finally {
        setLoading(false);
      }
    }
    fetchHealthScore();
  }, []);

  return (
    <Card className="card-hover overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Schedule Health
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <div className="skeleton-line w-20 h-8 rounded-full" />
          </div>
        ) : score ? (
          <div className="space-y-3">
            {/* Score ring */}
            <div className="flex items-center gap-4">
              <div className="relative h-20 w-20 shrink-0">
                <svg className="h-20 w-20 -rotate-90" viewBox="0 0 36 36">
                  <circle
                    cx="18" cy="18" r="16"
                    fill="none"
                    className="stroke-muted"
                    strokeWidth="3"
                  />
                  <circle
                    cx="18" cy="18" r="16"
                    fill="none"
                    className={cn(
                      "transition-all duration-1000 ease-out",
                      score.score >= 80 ? "stroke-emerald-500" :
                      score.score >= 60 ? "stroke-teal-500" :
                      score.score >= 40 ? "stroke-amber-500" : "stroke-red-500"
                    )}
                    strokeWidth="3"
                    strokeDasharray={`${score.score * 1.005} 100`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={cn("text-lg font-bold tabular-nums", score.color)}>
                    {score.score}
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <p className={cn("text-sm font-semibold", score.color)}>
                  {score.label}
                </p>
                <p className="text-xs text-muted-foreground">
                  Overall schedule quality
                </p>
              </div>
            </div>
            
            {/* Metrics breakdown */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Schedules</p>
                <p className="text-sm font-semibold tabular-nums" id="health-total-schedules">-</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Conflicts</p>
                <p className="text-sm font-semibold tabular-nums" id="health-conflicts">-</p>
              </div>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
