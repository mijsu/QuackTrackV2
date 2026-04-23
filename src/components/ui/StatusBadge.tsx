'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { type LucideIcon, CheckCircle2, XCircle, Clock, AlertTriangle, MinusCircle, Pause } from 'lucide-react';

export type StatusType = 'success' | 'error' | 'warning' | 'info' | 'neutral' | 'pending';

interface StatusBadgeProps {
  status: StatusType;
  label: string;
  icon?: LucideIcon;
  pulse?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

const statusConfig: Record<StatusType, {
  variant: 'default' | 'secondary' | 'outline' | 'destructive';
  classes: string;
  defaultIcon: LucideIcon;
}> = {
  success: {
    variant: 'outline',
    classes: 'border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30',
    defaultIcon: CheckCircle2,
  },
  error: {
    variant: 'outline',
    classes: 'border-red-500/30 bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30',
    defaultIcon: XCircle,
  },
  warning: {
    variant: 'outline',
    classes: 'border-amber-500/30 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30',
    defaultIcon: AlertTriangle,
  },
  info: {
    variant: 'outline',
    classes: 'border-blue-500/30 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30',
    defaultIcon: Clock,
  },
  neutral: {
    variant: 'secondary',
    classes: 'text-muted-foreground',
    defaultIcon: MinusCircle,
  },
  pending: {
    variant: 'outline',
    classes: 'border-violet-500/30 bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/30',
    defaultIcon: Pause,
  },
};

export function StatusBadge({
  status,
  label,
  icon: IconProp,
  pulse = false,
  className,
  size = 'sm',
}: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = IconProp || config.defaultIcon;

  return (
    <Badge
      variant={config.variant}
      className={cn(
        'font-medium gap-1 transition-all',
        config.classes,
        size === 'sm' && 'text-[10px] px-1.5 py-0',
        size === 'md' && 'text-xs px-2 py-0.5',
        pulse && 'animate-pulse',
        className
      )}
    >
      <Icon className={cn(size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
      {label}
    </Badge>
  );
}

/**
 * Quick status resolver - converts common status strings to StatusType
 */
export function resolveStatus(status: string): StatusType {
  const s = status.toLowerCase().trim();

  if (['active', 'approved', 'published', 'resolved', 'confirmed', 'completed', 'finalized', 'yes', 'true', 'open'].includes(s)) {
    return 'success';
  }
  if (['cancelled', 'rejected', 'failed', 'error', 'deleted', 'conflict', 'no', 'false', 'closed'].includes(s)) {
    return 'error';
  }
  if (['pending', 'draft', 'waiting', 'review', 'in-progress', 'processing', 'submitted'].includes(s)) {
    return 'pending';
  }
  if (['warning', 'caution', 'low-stock', 'almost-full', 'high-utilization'].includes(s)) {
    return 'warning';
  }
  if (['inactive', 'archived', 'disabled', 'expired'].includes(s)) {
    return 'neutral';
  }

  return 'info';
}
