'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Target, Clock, Users, Building, Calendar, 
  CheckCircle, AlertTriangle, Info
} from 'lucide-react';
import type { ScoreBreakdown } from '@/lib/scheduling-algorithm';

interface ScheduleScoreCardProps {
  score?: number;
  scoreBreakdown?: ScoreBreakdown | null;
  compact?: boolean;
}

const SCORE_LABELS = {
  specializationMatch: { label: 'Specialization Match', icon: <Target className="h-3 w-3" />, color: 'text-blue-500' },
  preferenceMatch: { label: 'Preference Match', icon: <Clock className="h-3 w-3" />, color: 'text-green-500' },
  loadBalance: { label: 'Load Balance', icon: <Users className="h-3 w-3" />, color: 'text-amber-500' },
  roomEfficiency: { label: 'Room Efficiency', icon: <Building className="h-3 w-3" />, color: 'text-purple-500' },
  timeQuality: { label: 'Time Quality', icon: <Clock className="h-3 w-3" />, color: 'text-cyan-500' },
  dayDistribution: { label: 'Day Distribution', icon: <Calendar className="h-3 w-3" />, color: 'text-pink-500' },
  departmentMatch: { label: 'Department Match', icon: <Building className="h-3 w-3" />, color: 'text-indigo-500' },
};

export function ScheduleScoreCard({ score, scoreBreakdown, compact = false }: ScheduleScoreCardProps) {
  if (!score && !scoreBreakdown) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Info className="h-4 w-4" />
        <span className="text-sm">No score data available</span>
      </div>
    );
  }

  const overallScore = score || scoreBreakdown?.total || 0;
  const scorePercent = Math.min(100, Math.max(0, overallScore * 100));
  
  const getScoreColor = (value: number) => {
    if (value >= 0.8) return 'text-green-500';
    if (value >= 0.6) return 'text-amber-500';
    return 'text-red-500';
  };

  const getScoreBadge = (value: number) => {
    if (value >= 0.8) return <Badge className="bg-green-500">Excellent</Badge>;
    if (value >= 0.6) return <Badge className="bg-amber-500">Good</Badge>;
    if (value >= 0.4) return <Badge className="bg-orange-500">Fair</Badge>;
    return <Badge variant="destructive">Poor</Badge>;
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className={`font-mono font-bold ${getScoreColor(overallScore)}`}>
          {(overallScore * 100).toFixed(0)}%
        </div>
        {getScoreBadge(overallScore)}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Schedule Quality Score</span>
          {getScoreBadge(overallScore)}
        </CardTitle>
        <CardDescription>
          How well this schedule matches constraints and preferences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Score */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Overall Score</span>
            <span className={`font-bold ${getScoreColor(overallScore)}`}>
              {(overallScore * 100).toFixed(1)}%
            </span>
          </div>
          <Progress value={scorePercent} className="h-3" />
        </div>

        {/* Breakdown */}
        {scoreBreakdown && (
          <div className="space-y-3">
            <div className="text-sm font-medium text-muted-foreground">Score Breakdown</div>
            {(Object.keys(SCORE_LABELS) as Array<keyof typeof SCORE_LABELS>).map(key => {
              const info = SCORE_LABELS[key];
              const value = scoreBreakdown[key];
              if (value === undefined) return null;
              
              const percent = Math.min(100, Math.max(0, value * 100));
              
              return (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className={info.color}>{info.icon}</span>
                      <span>{info.label}</span>
                    </div>
                    <span className="font-mono">{(value * 100).toFixed(0)}%</span>
                  </div>
                  <Progress value={percent} className="h-1.5" />
                </div>
              );
            })}
          </div>
        )}

        {/* Interpretation */}
        <div className="p-3 bg-muted rounded-lg text-sm space-y-2">
          <div className="font-medium flex items-center gap-2">
            {overallScore >= 0.7 ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-500" />
                This is a well-optimized schedule
              </>
            ) : overallScore >= 0.5 ? (
              <>
                <Info className="h-4 w-4 text-amber-500" />
                This schedule has room for improvement
              </>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4 text-red-500" />
                This schedule may need manual review
              </>
            )}
          </div>
          <p className="text-muted-foreground">
            {overallScore >= 0.7 && "Faculty preferences and constraints are well-matched."}
            {overallScore >= 0.5 && overallScore < 0.7 && "Consider adjusting faculty preferences or time slots."}
            {overallScore < 0.5 && "Multiple constraints may not be satisfied. Consider regenerating or manual adjustment."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// Compact inline version for table cells
export function ScheduleScoreInline({ score, scoreBreakdown }: { score?: number; scoreBreakdown?: ScoreBreakdown | null }) {
  const overallScore = score || scoreBreakdown?.total || 0;
  const scorePercent = Math.min(100, Math.max(0, overallScore * 100));
  
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1">
        <Progress value={scorePercent} className="h-2" />
      </div>
      <span className="text-xs font-mono w-10">{(overallScore * 100).toFixed(0)}%</span>
    </div>
  );
}
