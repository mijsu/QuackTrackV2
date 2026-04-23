'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, Users, ChevronRight } from 'lucide-react';
import { useAppStore } from '@/store';

// ============================================================================
// TYPES
// ============================================================================

interface Department {
  id: string;
  name: string;
  code?: string;
  _count?: {
    users: number;
    programs: number;
    sections: number;
  };
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_VISIBLE_DEPARTMENTS = 6;

// ============================================================================
// SKELETON
// ============================================================================

function DepartmentSkeleton() {
  return (
    <Card className="card-hover h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-32 rounded" />
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2 rounded-lg p-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-36 rounded" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
            <Skeleton className="h-1 w-full rounded-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export function DepartmentOverviewWidget() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const setViewMode = useAppStore((state) => state.setViewMode);

  const fetchDepartments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/departments');
      if (!res.ok) throw new Error('Failed to fetch departments');
      const data: Department[] = await res.json();
      setDepartments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const navigateToDepartments = () => {
    setViewMode('departments');
  };

  // Calculate max faculty count for relative progress bars
  const maxFacultyCount = Math.max(
    ...departments.map((d) => d._count?.users ?? 0),
    1
  );

  // Loading state
  if (loading) return <DepartmentSkeleton />;

  // Error state
  if (error) {
    return (
      <Card className="card-hover h-full flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Building2 className="h-4 w-4 text-emerald-500" />
            Department Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="text-center py-4">
            <p className="text-xs text-muted-foreground">
              Unable to load departments
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 text-xs"
              onClick={fetchDepartments}
            >
              Try again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (departments.length === 0) {
    return (
      <Card className="card-hover h-full flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Building2 className="h-4 w-4 text-emerald-500" />
            Department Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="text-center py-4">
            <Building2 className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm font-medium text-muted-foreground">
              No departments yet
            </p>
            <button
              onClick={navigateToDepartments}
              className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              Add your first department
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const visibleDepartments = departments.slice(0, MAX_VISIBLE_DEPARTMENTS);
  const hasMore = departments.length > MAX_VISIBLE_DEPARTMENTS;

  return (
    <Card className="card-hover h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Building2 className="h-4 w-4 text-emerald-500" />
          Department Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto space-y-1">
        {visibleDepartments.map((dept) => {
          const facultyCount = dept._count?.users ?? 0;
          const percentage = maxFacultyCount > 0
            ? Math.round((facultyCount / maxFacultyCount) * 100)
            : 0;

          return (
            <button
              key={dept.id}
              onClick={navigateToDepartments}
              className="w-full flex flex-col gap-1.5 rounded-lg p-2 text-left hover:bg-muted/70 transition-colors group cursor-pointer"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  {dept.name}
                </span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 shrink-0">
                  <Users className="h-2.5 w-2.5 mr-1" />
                  {facultyCount}
                </Badge>
              </div>
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </button>
          );
        })}
      </CardContent>
      {hasMore && (
        <CardFooter className="pt-0 pb-4">
          <button
            onClick={navigateToDepartments}
            className="w-full flex items-center justify-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors py-1"
          >
            View All ({departments.length} departments)
            <ChevronRight className="h-3 w-3" />
          </button>
        </CardFooter>
      )}
    </Card>
  );
}
