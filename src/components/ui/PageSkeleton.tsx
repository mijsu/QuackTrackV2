'use client';

import { cn } from '@/lib/utils';

interface PageSkeletonProps {
  view?: string;
  rowCount?: number;
}

function SkeletonCard({ className }: { className?: string }) {
  return <div className={cn('skeleton-card-new', className)} />;
}

function SkeletonLine({ width, className }: { width?: string; className?: string }) {
  return <div className={cn('skeleton-line-new', className)} style={{ width }} />;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 skeleton-stagger animate-fade-in">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <SkeletonCard className="h-8 w-48" />
        <SkeletonCard className="h-9 w-32" />
      </div>

      {/* Stat Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton-card-new rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <SkeletonLine width="96px" />
              <SkeletonCard className="h-8 w-8 rounded-lg" />
            </div>
            <SkeletonLine width="80px" className="h-8" />
            <SkeletonLine width="128px" className="h-3" />
          </div>
        ))}
      </div>

      {/* Chart Cards Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="skeleton-card-new rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <SkeletonLine width="128px" className="h-5" />
              <SkeletonCard className="h-8 w-8 rounded-md" />
            </div>
            <SkeletonCard className="h-[200px] w-full rounded-lg" />
          </div>
        ))}
      </div>

      {/* Activity Section */}
      <div className="skeleton-card-new rounded-xl p-6 space-y-4">
        <SkeletonLine width="160px" className="h-5" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <SkeletonCard className="h-9 w-9 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <SkeletonLine width="75%" />
                <SkeletonLine width="40%" className="h-3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TableSkeleton({ rowCount }: { rowCount: number }) {
  const columnCount = 5;

  return (
    <div className="space-y-4 skeleton-stagger animate-fade-in">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <SkeletonCard className="h-8 w-48" />
        <div className="flex gap-2">
          <SkeletonCard className="h-9 w-64 rounded-md" />
          <SkeletonCard className="h-9 w-9 rounded-md" />
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton-card-new rounded-xl p-4 space-y-2">
            <SkeletonLine width="60px" className="h-3" />
            <SkeletonLine width="48px" className="h-7" />
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="skeleton-card-new rounded-xl overflow-hidden">
        {/* Header */}
        <div className="border-b border-border/50 px-4 py-3">
          <div className="flex gap-4">
            {Array.from({ length: columnCount }).map((_, i) => (
              <SkeletonLine
                key={i}
                className={cn('h-4 flex-shrink-0', i === 0 ? 'w-12' : i === 1 ? 'flex-1' : 'w-24')}
              />
            ))}
          </div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-border/30">
          {Array.from({ length: rowCount }).map((_, i) => (
            <div key={i} className="flex gap-4 px-4 py-3">
              {Array.from({ length: columnCount }).map((_, j) => (
                <SkeletonLine
                  key={j}
                  className={cn(
                    'h-4 flex-shrink-0',
                    j === 0 && 'w-12',
                    j === 1 && 'flex-1',
                    j > 1 && 'w-24'
                  )}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
          <SkeletonLine width="160px" className="h-4" />
          <div className="flex gap-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} className="h-8 w-8 rounded-md" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function GenericSkeleton({ rowCount }: { rowCount: number }) {
  return (
    <div className="space-y-6 skeleton-stagger animate-fade-in">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <SkeletonCard className="h-8 w-48" />
        <SkeletonCard className="h-9 w-32 rounded-md" />
      </div>

      {/* Card Skeletons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: Math.min(rowCount, 4) }).map((_, i) => (
          <div key={i} className="skeleton-card-new rounded-xl p-6 space-y-4 card-hover-lift">
            <div className="flex items-center gap-3">
              <SkeletonCard className="h-12 w-12 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <SkeletonLine width="75%" className="h-4" />
                <SkeletonLine width="50%" className="h-3" />
              </div>
              <SkeletonCard className="h-8 w-8 rounded-md" />
            </div>
            <div className="flex gap-3 pt-1">
              <div className="flex gap-1.5">
                <SkeletonCard className="h-6 w-16 rounded-full" />
                <SkeletonCard className="h-6 w-20 rounded-full" />
              </div>
              <SkeletonLine width="60px" className="h-3 ml-auto" />
            </div>
            {/* Card bottom area */}
            <div className="pt-2 border-t border-border/30">
              <div className="flex gap-6">
                <SkeletonLine width="48px" className="h-3" />
                <SkeletonLine width="64px" className="h-3" />
                <SkeletonLine width="56px" className="h-3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PageSkeleton({ view = 'default', rowCount = 5 }: PageSkeletonProps) {
  if (view === 'dashboard') {
    return <DashboardSkeleton />;
  }

  if (
    view === 'tables' ||
    view === 'faculty' ||
    view === 'subjects' ||
    view === 'rooms' ||
    view === 'sections' ||
    view === 'departments' ||
    view === 'programs' ||
    view === 'users' ||
    view === 'schedules' ||
    view === 'conflicts' ||
    view === 'audit'
  ) {
    return <TableSkeleton rowCount={rowCount} />;
  }

  return <GenericSkeleton rowCount={rowCount} />;
}
