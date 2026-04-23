'use client';

import { Badge } from '@/components/ui/badge';
import { X, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FilterItem {
  key: string;
  label: string;
  value: string;
}

interface FilterChipsProps {
  filters: FilterItem[];
  onRemove: (key: string) => void;
  onClearAll: () => void;
}

export function FilterChips({ filters, onRemove, onClearAll }: FilterChipsProps) {
  if (filters.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-wrap items-center gap-2"
    >
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mr-1">
        <Filter className="h-3.5 w-3.5" />
        <span className="font-medium">Active</span>
        <span className="filter-chip-count filter-chip-count-bounce">{filters.length}</span>
      </div>
      <AnimatePresence mode="popLayout">
        {filters.map((filter, index) => (
          <motion.div
            key={filter.key}
            layout
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{
              duration: 0.3,
              type: 'spring',
              stiffness: 400,
              damping: 25,
              delay: index * 0.03,
            }}
          >
            <div className={cn(
              'filter-chip filter-chip-active filter-chip-spring',
            )}>
              <span className="opacity-80">
                {filter.label}:
              </span>
              <span className="font-semibold">{filter.value}</span>
              <button
                onClick={() => onRemove(filter.key)}
                className="ml-0.5 inline-flex items-center justify-center h-4 w-4 rounded-full hover:bg-white/25 transition-colors duration-150"
                aria-label={`Remove ${filter.label} filter`}
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      {filters.length > 1 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            duration: 0.3,
            type: 'spring',
            stiffness: 400,
            damping: 25,
            delay: filters.length * 0.03,
          }}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="h-7 px-2.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
          >
            <X className="h-3 w-3 mr-1" />
            Clear All
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}
