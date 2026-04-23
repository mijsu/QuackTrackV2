'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Trash2, X, MoreVertical, Download, Copy, CheckSquare, Square } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface BatchAction {
  id: string;
  label: string;
  icon?: React.ElementType;
  variant?: 'default' | 'destructive';
  onClick: (selectedIds: string[]) => void;
}

interface BatchActionBarProps {
  selectedIds: string[];
  totalCount?: number;
  onClearSelection: () => void;
  onSelectAll: () => void;
  actions?: BatchAction[];
  className?: string;
}

export function BatchActionBar({
  selectedIds,
  totalCount = 0,
  onClearSelection,
  onSelectAll,
  actions = [],
  className,
}: BatchActionBarProps) {
  if (selectedIds.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.2 }}
        className={cn(
          'fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50',
          'flex items-center gap-2 px-4 py-2.5 rounded-xl',
          'batch-bar-glass',
          className
        )}
      >
        {/* Selection count */}
        <div className="flex items-center gap-2 pr-3 border-r border-border">
          <div className="flex items-center justify-center h-6 w-6 rounded-md bg-primary/10">
            <CheckSquare className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="text-sm font-medium">
            <span className="text-primary font-bold">{selectedIds.length}</span>
            <span className="text-muted-foreground"> selected</span>
          </span>
        </div>

        {/* Select All / Deselect */}
        {totalCount > 0 && selectedIds.length < totalCount && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={onSelectAll}
          >
            <Square className="h-3.5 w-3.5" />
            Select All ({totalCount})
          </Button>
        )}

        {/* Actions */}
        {actions.length > 0 && (
          <div className="flex items-center gap-1">
            {/* Primary actions (first 2) */}
            {actions.slice(0, 2).map((action) => {
              const Icon = action.icon || Trash2;
              return (
                <Button
                  key={action.id}
                  variant={action.variant === 'destructive' ? 'destructive' : 'ghost'}
                  size="sm"
                  className={cn(
                    'h-8 text-xs gap-1.5',
                    action.variant !== 'destructive' && 'hover:bg-muted'
                  )}
                  onClick={() => action.onClick(selectedIds)}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {action.label}
                </Button>
              );
            })}

            {/* More actions dropdown */}
            {actions.length > 2 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">More actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-48">
                  {actions.slice(2).map((action) => {
                    const Icon = action.icon || Trash2;
                    return (
                      <DropdownMenuItem
                        key={action.id}
                        onClick={() => action.onClick(selectedIds)}
                        className={cn(
                          'text-xs gap-2 cursor-pointer',
                          action.variant === 'destructive' && 'text-destructive focus:text-destructive'
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {action.label}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )}

        {/* Clear selection */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 ml-1 text-muted-foreground hover:text-foreground"
          onClick={onClearSelection}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Clear selection</span>
        </Button>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Select All checkbox for table headers
 */
export function SelectAllCheckbox({
  selectedCount,
  totalCount,
  onSelectAll,
  onClearSelection,
}: {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
}) {
  const isAllSelected = selectedCount === totalCount && totalCount > 0;
  const isSomeSelected = selectedCount > 0 && !isAllSelected;

  return (
    <button
      onClick={isAllSelected ? onClearSelection : onSelectAll}
      className={cn(
        'flex items-center justify-center h-4 w-4 rounded border transition-all duration-150',
        isAllSelected
          ? 'bg-primary border-primary text-primary-foreground'
          : isSomeSelected
            ? 'bg-primary/20 border-primary/50'
            : 'border-input bg-background hover:bg-muted'
      )}
      aria-label={isAllSelected ? 'Deselect all' : 'Select all'}
    >
      {isAllSelected && (
        <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {isSomeSelected && (
        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
      )}
    </button>
  );
}
