'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { type LucideIcon, Inbox, Plus, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    icon?: LucideIcon;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    icon?: LucideIcon;
    onClick: () => void;
  };
  className?: string;
  children?: React.ReactNode;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  secondaryAction,
  className,
  children,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'flex flex-col items-center justify-center py-16 px-4 text-center',
        className
      )}
    >
      {/* Icon with floating animation, radial glow, and dotted circle */}
      <div className="bg-muted/30 rounded-xl p-4">
      <div className="relative mb-6 empty-state-illustration-bg p-4">
        {/* Radial gradient glow behind icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="empty-state-icon-glow">
            <div className="h-16 w-16" />
          </div>
        </div>
        {/* Dotted circle ring */}
        <div className="dotted-circle-ring inline-flex">
          <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-muted/80 border border-border/50 animate-bounce [animation-duration:2s]">
            <Icon className="h-8 w-8 text-muted-foreground/60" />
          </div>
        </div>
        {/* Decorative dot */}
        <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary/20 animate-float-delayed" />
      </div>
      </div>

      {/* Title with gradient text */}
      <h3 className="text-lg font-semibold mb-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent inline-block">
        {title}
      </h3>

      {/* Description with gradient and improved line-height */}
      {description && (
        <p className={cn(
          'text-sm max-w-md mb-6 leading-relaxed',
          'empty-state-description'
        )}>
          {description}
        </p>
      )}

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex items-center gap-3">
          {secondaryAction && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.icon && <secondaryAction.icon className="h-4 w-4" />}
              {secondaryAction.label}
            </Button>
          )}
          {action && (
            <Button
              size="sm"
              className="gap-2 animate-action-pulse"
              onClick={action.onClick}
            >
              {action.icon || <Plus className="h-4 w-4" />}
              {action.label}
            </Button>
          )}
        </div>
      )}

      {/* Custom children */}
      {children}
    </motion.div>
  );
}

/**
 * Error State variant
 */
interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'We encountered an error while loading this data. Please try again.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <EmptyState
      icon={RefreshCw}
      title={title}
      description={message}
      action={onRetry ? {
        label: 'Try Again',
        icon: RefreshCw,
        onClick: onRetry,
      } : undefined}
      className={className}
    />
  );
}
