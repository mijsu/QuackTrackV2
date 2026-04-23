'use client';

import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { X, Plus, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

export interface FilterBarFilter {
  key: string;
  label: string;
  icon?: LucideIcon;
  count?: number;
  active: boolean;
}

interface FilterBarProps {
  filters: FilterBarFilter[];
  onToggle: (key: string) => void;
  onClearAll: () => void;
  onAddFilter?: () => void;
  className?: string;
}

export function FilterBar({
  filters,
  onToggle,
  onClearAll,
  onAddFilter,
  className,
}: FilterBarProps) {
  const [expanded, setExpanded] = useState(false);
  const isMobile = useIsMobile();

  const activeCount = filters.filter((f) => f.active).length;

  // On mobile, show a collapsed badge that expands on tap
  if (isMobile) {
    return (
      <div className={cn('w-full', className)}>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg border bg-background hover:bg-accent/50 transition-colors text-sm"
        >
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground flex-1 text-left">Filters</span>
          {activeCount > 0 && (
            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25 hover:bg-emerald-500/25 text-xs">
              {activeCount}
            </Badge>
          )}
          <ChevronDown
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform duration-200',
              expanded && 'rotate-180'
            )}
          />
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap gap-2 px-1 pt-3 pb-1">
                <AnimatePresence mode="popLayout">
                  {filters.map((filter) => {
                    const Icon = filter.icon;
                    return (
                      <motion.button
                        key={filter.key}
                        layout
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.85 }}
                        transition={{ duration: 0.15 }}
                        onClick={() => onToggle(filter.key)}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-150 border',
                          filter.active
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 shadow-sm shadow-emerald-500/10'
                            : 'bg-background text-muted-foreground border-border hover:border-emerald-500/30 hover:text-foreground'
                        )}
                      >
                        {Icon && <Icon className="h-3 w-3" />}
                        <span>{filter.label}</span>
                        {filter.count !== undefined && (
                          <span
                            className={cn(
                              'text-[10px] rounded-full px-1.5 py-0.5 leading-none',
                              filter.active
                                ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-200'
                                : 'bg-muted text-muted-foreground'
                            )}
                          >
                            {filter.count}
                          </span>
                        )}
                      </motion.button>
                    );
                  })}
                </AnimatePresence>
              </div>

              {activeCount > 0 && (
                <div className="flex justify-end px-1 pb-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      onClearAll();
                      setExpanded(false);
                    }}
                    className="h-7 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear All
                  </Button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Desktop: full bar with filter chips
  return (
    <div
      className={cn(
        'flex items-center gap-2 flex-wrap',
        className
      )}
    >
      <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />

      <AnimatePresence mode="popLayout">
        {filters.map((filter) => {
          const Icon = filter.icon;
          return (
            <motion.button
              key={filter.key}
              layout
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.15 }}
              onClick={() => onToggle(filter.key)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-150 border cursor-pointer select-none',
                filter.active
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 shadow-sm shadow-emerald-500/10'
                  : 'bg-background text-muted-foreground border-border hover:border-emerald-500/30 hover:text-foreground'
              )}
            >
              {Icon && <Icon className="h-3 w-3" />}
              <span>{filter.label}</span>
              {filter.count !== undefined && (
                <span
                  className={cn(
                    'text-[10px] rounded-full px-1.5 py-0.5 leading-none',
                    filter.active
                      ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-200'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {filter.count}
                </span>
              )}
            </motion.button>
          );
        })}
      </AnimatePresence>

      {onAddFilter && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-7 rounded-full gap-1 text-xs border-dashed"
            >
              <Plus className="h-3 w-3" />
              Add Filter
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel>Add Filter</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {filters
              .filter((f) => !f.active)
              .map((filter) => {
                const Icon = filter.icon;
                return (
                  <DropdownMenuItem
                    key={filter.key}
                    onClick={() => onToggle(filter.key)}
                  >
                    {Icon && <Icon className="h-4 w-4 mr-2" />}
                    {filter.label}
                  </DropdownMenuItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {activeCount > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.15 }}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 ml-1"
          >
            <X className="h-3 w-3 mr-1" />
            Clear All
          </Button>
        </motion.div>
      )}
    </div>
  );
}
