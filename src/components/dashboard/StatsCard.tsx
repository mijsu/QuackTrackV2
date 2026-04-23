'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { type LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
    positive?: boolean;
  };
  variant?: 'default' | 'success' | 'warning' | 'danger';
  className?: string;
  onClick?: () => void;
}

export function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  variant = 'default',
  className,
  onClick,
}: StatsCardProps) {
  const variantStyles = {
    default: 'from-card via-card to-primary/5 border-border/50',
    success: 'from-card via-card to-emerald-500/5 border-emerald-500/20',
    warning: 'from-card via-card to-amber-500/5 border-amber-500/20',
    danger: 'from-card via-card to-red-500/5 border-red-500/20',
  };

  const iconStyles = {
    default: 'bg-primary/10 text-primary',
    success: 'bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/15 dark:text-emerald-400',
    warning: 'bg-amber-500/10 text-amber-500 dark:bg-amber-500/15 dark:text-amber-400',
    danger: 'bg-red-500/10 text-red-500 dark:bg-red-500/15 dark:text-red-400',
  };

  const iconRingStyles = {
    default: 'ring-primary/5',
    success: 'ring-emerald-500/10',
    warning: 'ring-amber-500/10',
    danger: 'ring-red-500/10',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -2 }}
      className={cn(onClick && 'cursor-pointer')}
      onClick={onClick}
    >
      <Card className={cn(
        'relative overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border gradient-border',
        variantStyles[variant],
        onClick && 'hover:border-primary/30',
        className
      )}>
        {/* Top accent line */}
        <div className={cn(
          'absolute top-0 left-0 right-0 h-[2px] opacity-60',
          variant === 'default' && 'bg-gradient-to-r from-transparent via-primary/40 to-transparent',
          variant === 'success' && 'bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent',
          variant === 'warning' && 'bg-gradient-to-r from-transparent via-amber-500/50 to-transparent',
          variant === 'danger' && 'bg-gradient-to-r from-transparent via-red-500/50 to-transparent',
        )} />

        <div className={cn('absolute inset-0 bg-gradient-to-br pointer-events-none rounded-lg', variantStyles[variant])} />
        <div className="relative">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</CardTitle>
            <div className={cn(
              'flex items-center justify-center w-9 h-9 rounded-xl ring-1 transition-transform duration-200 group-hover:scale-110',
              iconStyles[variant],
              iconRingStyles[variant]
            )}>
              <Icon className="h-4.5 w-4.5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight animate-count-up">
              {value}
            </div>
            {(description || trend) && (
              <div className="flex items-center justify-between mt-1.5">
                {description && (
                  <p className="text-xs text-muted-foreground truncate">{description}</p>
                )}
                {trend && (
                  <div className="flex items-center gap-1 ml-auto">
                    <span className={cn(
                      'inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-md',
                      trend.positive
                        ? 'text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10'
                        : 'text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-500/10'
                    )}>
                      {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}%
                    </span>
                    <span className="text-[11px] text-muted-foreground">{trend.label}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </div>
      </Card>
    </motion.div>
  );
}
