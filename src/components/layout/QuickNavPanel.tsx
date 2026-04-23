'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Calendar,
  CalendarDays,
  Users,
  BookOpen,
  DoorOpen,
  Layers,
  Building2,
  GraduationCap,
  UserCog,
  AlertTriangle,
  BarChart3,
  ScrollText,
  X,
  Navigation,
  Megaphone,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore, type ViewMode } from '@/store';
import { Button } from '@/components/ui/button';

// ---------------------------------------------------------------------------
// Navigation item definition
// ---------------------------------------------------------------------------

interface NavItem {
  viewMode: ViewMode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  { viewMode: 'dashboard',        label: 'Dashboard',    icon: LayoutDashboard, description: 'Overview & stats' },
  { viewMode: 'calendar',         label: 'Calendar',     icon: Calendar,        description: 'Weekly calendar view' },
  { viewMode: 'schedules',        label: 'Schedules',    icon: CalendarDays,    description: 'Manage schedules' },
  { viewMode: 'faculty',          label: 'Faculty',      icon: Users,           description: 'Faculty members' },
  { viewMode: 'subjects',         label: 'Subjects',     icon: BookOpen,        description: 'Subject offerings' },
  { viewMode: 'rooms',            label: 'Rooms',        icon: DoorOpen,        description: 'Room management' },
  { viewMode: 'sections',         label: 'Sections',     icon: Layers,          description: 'Section management' },
  { viewMode: 'departments',      label: 'Departments',  icon: Building2,       description: 'Department settings' },
  { viewMode: 'programs',         label: 'Programs',     icon: GraduationCap,   description: 'Academic programs' },
  { viewMode: 'users',            label: 'Users',        icon: UserCog,         description: 'User accounts' },
  { viewMode: 'conflicts',        label: 'Conflicts',    icon: AlertTriangle,   description: 'Conflict resolution' },
  { viewMode: 'reports',          label: 'Reports',      icon: BarChart3,       description: 'Analytics & reports' },
  { viewMode: 'audit',            label: 'Audit Log',    icon: ScrollText,      description: 'Activity history' },
  { viewMode: 'announcements',    label: 'Announcements', icon: Megaphone,      description: 'Manage announcements' },
];

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const panelVariants = {
  hidden:  { x: '-100%', opacity: 0 },
  visible: { x: 0,        opacity: 1, transition: { type: 'spring', stiffness: 350, damping: 32 } },
  exit:    { x: '-100%', opacity: 0, transition: { duration: 0.2, ease: 'easeIn' } },
};

const backdropVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit:    { opacity: 0, transition: { duration: 0.15 } },
};

const itemVariants = {
  hidden:  { opacity: 0, y: 12, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: i * 0.03, duration: 0.25, ease: 'easeOut' },
  }),
};

// ---------------------------------------------------------------------------
// Custom event for external components to open the panel
// ---------------------------------------------------------------------------

export function openQuickNavPanel() {
  window.dispatchEvent(new CustomEvent('quacktrack:open-quick-nav'));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function QuickNavPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const panelRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const viewMode  = useAppStore((s) => s.viewMode);
  const setViewMode = useAppStore((s) => s.setViewMode);

  // --- Keyboard shortcut: Alt+N to toggle --------------------------------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 'n') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // --- Listen for external open events ------------------------------------
  useEffect(() => {
    const handler = () => setIsOpen(true);
    window.addEventListener('quacktrack:open-quick-nav', handler);
    return () => window.removeEventListener('quacktrack:open-quick-nav', handler);
  }, []);

  // --- Close on Escape ----------------------------------------------------
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen]);

  // --- Focus active item when panel opens ---------------------------------
  // Using a ref-based approach to avoid setState in effects
  const initialFocusRef = useRef(false);

  useEffect(() => {
    if (isOpen && !initialFocusRef.current) {
      initialFocusRef.current = true;
      const activeIdx = NAV_ITEMS.findIndex((item) => item.viewMode === viewMode);
      const idx = activeIdx >= 0 ? activeIdx : 0;
      requestAnimationFrame(() => {
        buttonRefs.current[idx]?.focus();
      });
    }
    if (!isOpen) {
      initialFocusRef.current = false;
    }
  }, [isOpen, viewMode]);

  // --- Keyboard navigation within grid ------------------------------------
  const handleGridKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const cols = gridRef.current
        ? Math.max(1, Math.floor((gridRef.current.offsetWidth + 8) / (gridRef.current.querySelector('button')?.offsetWidth || 100 + 8)))
        : 3;

      let nextIndex = focusedIndex;

      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          nextIndex = focusedIndex + 1;
          break;
        case 'ArrowLeft':
          e.preventDefault();
          nextIndex = focusedIndex - 1;
          break;
        case 'ArrowDown':
          e.preventDefault();
          nextIndex = focusedIndex + cols;
          break;
        case 'ArrowUp':
          e.preventDefault();
          nextIndex = focusedIndex - cols;
          break;
        case 'Home':
          e.preventDefault();
          nextIndex = 0;
          break;
        case 'End':
          e.preventDefault();
          nextIndex = NAV_ITEMS.length - 1;
          break;
        default:
          return;
      }

      if (nextIndex >= 0 && nextIndex < NAV_ITEMS.length) {
        setFocusedIndex(nextIndex);
        buttonRefs.current[nextIndex]?.focus();
      }
    },
    [focusedIndex],
  );

  // --- Click handler for a nav item ---------------------------------------
  const handleNavigate = useCallback(
    (item: NavItem) => {
      setViewMode(item.viewMode);
      setIsOpen(false);
    },
    [setViewMode],
  );

  // --- Close on backdrop click --------------------------------------------
  const handleBackdropClick = useCallback(() => {
    setIsOpen(false);
    setFocusedIndex(-1);
  }, []);

  return (
    <>
      {/* Floating toggle button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsOpen(true)}
            className={cn(
              'fixed bottom-20 left-4 z-50',
              'flex items-center justify-center',
              'h-11 w-11 rounded-full',
              'bg-primary text-primary-foreground shadow-lg shadow-primary/25',
              'hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30',
              'active:scale-95',
              'transition-all duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            )}
            aria-label="Open quick navigation panel (Alt+N)"
            title="Quick Nav (Alt+N)"
          >
            <Navigation className="h-5 w-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Backdrop overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="quick-nav-backdrop"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={handleBackdropClick}
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[2px]"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Slide-in panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="quick-nav-panel"
            ref={panelRef}
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="dialog"
            aria-modal="true"
            aria-label="Quick navigation panel"
            className={cn(
              'fixed inset-y-0 left-0 z-[70]',
              'w-[320px] sm:w-[360px]',
              'bg-card border-r border-border/60 shadow-2xl',
              'flex flex-col',
            )}
          >
            {/* Panel header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10">
                  <Navigation className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold tracking-tight">Quick Navigation</h2>
                  <p className="text-[11px] text-muted-foreground">Jump to any view</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setIsOpen(false);
                  setFocusedIndex(-1);
                }}
                aria-label="Close quick navigation panel"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Navigation grid */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <div
                ref={gridRef}
                role="grid"
                aria-label="Navigation options"
                onKeyDown={handleGridKeyDown}
                className="grid grid-cols-3 gap-2"
              >
                {NAV_ITEMS.map((item, index) => {
                  const isActive = item.viewMode === viewMode;
                  const isFocused = focusedIndex === index;
                  const Icon = item.icon;

                  return (
                    <motion.button
                      key={item.viewMode}
                      ref={(el) => { buttonRefs.current[index] = el; }}
                      custom={index}
                      variants={itemVariants}
                      initial="hidden"
                      animate="visible"
                      onClick={() => handleNavigate(item)}
                      onFocus={() => setFocusedIndex(index)}
                      aria-label={`Navigate to ${item.label}`}
                      aria-current={isActive ? 'page' : undefined}
                      role="gridcell"
                      tabIndex={isFocused ? 0 : -1}
                      className={cn(
                        'group relative flex flex-col items-center justify-center gap-2 rounded-lg p-3 sm:p-3.5',
                        'outline-none cursor-pointer transition-all duration-150',
                        'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background',
                        isActive
                          ? 'bg-primary/15 text-primary ring-1 ring-primary/30'
                          : 'bg-muted/50 text-muted-foreground hover:bg-primary/10 hover:text-foreground',
                        isFocused && !isActive && 'bg-primary/10 ring-1 ring-primary/20',
                      )}
                    >
                      {/* Icon */}
                      <div
                        className={cn(
                          'flex items-center justify-center h-8 w-8 rounded-md transition-colors duration-150',
                          isActive
                            ? 'bg-primary/20'
                            : 'bg-muted group-hover:bg-primary/10',
                        )}
                      >
                        <Icon
                          className={cn(
                            'h-4 w-4 transition-colors duration-150',
                            isActive
                              ? 'text-primary'
                              : 'text-muted-foreground group-hover:text-foreground',
                          )}
                        />
                      </div>

                      {/* Label */}
                      <span
                        className={cn(
                          'text-[11px] sm:text-xs font-medium leading-tight text-center transition-colors duration-150',
                          isActive
                            ? 'text-primary'
                            : 'text-muted-foreground group-hover:text-foreground',
                        )}
                      >
                        {item.label}
                      </span>

                      {/* Active indicator dot */}
                      {isActive && (
                        <motion.div
                          layoutId="quick-nav-active-dot"
                          className="absolute -top-1 left-1/2 -translate-x-1/2 h-1.5 w-1.5 rounded-full bg-primary"
                          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        />
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* Footer hint */}
              <div className="mt-5 flex items-center justify-center gap-3 text-[11px] text-muted-foreground/70">
                <kbd className="inline-flex items-center gap-0.5 rounded border border-border/60 bg-muted/80 px-1.5 py-0.5 font-mono text-[10px]">
                  ←↑↓→
                </kbd>
                <span>navigate</span>
                <kbd className="inline-flex items-center gap-0.5 rounded border border-border/60 bg-muted/80 px-1.5 py-0.5 font-mono text-[10px]">
                  Esc
                </kbd>
                <span>close</span>
                <kbd className="inline-flex items-center gap-0.5 rounded border border-border/60 bg-muted/80 px-1.5 py-0.5 font-mono text-[10px]">
                  Enter
                </kbd>
                <span>select</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
