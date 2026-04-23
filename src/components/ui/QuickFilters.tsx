'use client';

import { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

interface QuickFiltersProps {
  filters: FilterOption[];
  activeFilters: string[];
  onFilterChange: (values: string[]) => void;
  mode?: 'single' | 'multi';
  label?: string;
  className?: string;
}

export function QuickFilters({
  filters,
  activeFilters,
  onFilterChange,
  mode = 'single',
  label,
  className,
}: QuickFiltersProps) {
  // Handle pill click
  const handleClick = useCallback(
    (value: string) => {
      if (mode === 'single') {
        // Single mode: toggle — if already active, clear; otherwise set
        onFilterChange(activeFilters.includes(value) ? [] : [value]);
      } else {
        // Multi mode: toggle individual
        if (value === 'all') {
          onFilterChange([]);
        } else if (activeFilters.includes(value)) {
          onFilterChange(activeFilters.filter((v) => v !== value));
        } else {
          onFilterChange([...activeFilters, value]);
        }
      }
    },
    [mode, activeFilters, onFilterChange]
  );

  // Determine if a pill is active
  const isActive = (value: string) => {
    if (value === 'all') return activeFilters.length === 0;
    return activeFilters.includes(value);
  };

  // Build the list of options to render
  const allOption: FilterOption | null =
    mode === 'multi'
      ? { value: 'all', label: 'All' }
      : null;

  const displayFilters = allOption ? [allOption, ...filters] : filters;

  if (filters.length === 0) return null;

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <AnimatePresence mode="popLayout">
          {displayFilters.map((filter) => {
            const active = isActive(filter.value);
            return (
              <motion.button
                key={filter.value}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.15 }}
                onClick={() => handleClick(filter.value)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border cursor-pointer select-none',
                  active
                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-500/25'
                    : 'bg-background border-border text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
                aria-pressed={active}
              >
                {filter.icon && (
                  <span className="flex-shrink-0">{filter.icon}</span>
                )}
                <span>{filter.label}</span>
                {filter.count !== undefined && (
                  <span
                    className={cn(
                      'text-[10px] ml-1 px-1.5 py-0 rounded-full leading-none',
                      active
                        ? 'bg-white/25 text-white'
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
    </div>
  );
}
