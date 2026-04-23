'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Zap, UserPlus, AlertTriangle, Plus, X } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';

interface QuickAction {
  label: string;
  icon: React.ElementType;
  viewMode: string;
  color: string;
}

const ACTIONS: QuickAction[] = [
  {
    label: 'Generate Schedule',
    icon: Zap,
    viewMode: 'dashboard',
    color: 'bg-emerald-500 text-white hover:bg-emerald-600',
  },
  {
    label: 'Add Faculty',
    icon: UserPlus,
    viewMode: 'users',
    color: 'bg-teal-500 text-white hover:bg-teal-600',
  },
  {
    label: 'View Conflicts',
    icon: AlertTriangle,
    viewMode: 'conflicts',
    color: 'bg-amber-500 text-white hover:bg-amber-600',
  },
];

export function QuickActionsFab() {
  const [isOpen, setIsOpen] = useState(false);
  const { data: session } = useSession();
  const setViewMode = useAppStore((state) => state.setViewMode);
  const isAdmin = session?.user?.role === 'admin';

  const handleAction = useCallback(
    (viewMode: string) => {
      setIsOpen(false);
      setViewMode(viewMode as Parameters<typeof setViewMode>[0]);
    },
    [setViewMode]
  );

  // Only show for admin users
  if (!isAdmin) return null;

  return (
    <div className="fixed right-4 z-40 md:hidden" style={{ bottom: 'calc(4.5rem + env(safe-area-inset-bottom, 0px))' }}>
      {/* Backdrop overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/20 z-[-1]"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Expanded Actions */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute bottom-16 right-0 flex flex-col items-end gap-2 w-52"
          >
            {ACTIONS.map((action, index) => {
              const Icon = action.icon;
              return (
                <motion.div
                  key={action.label}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 + 0.1, duration: 0.15 }}
                >
                  <Button
                    onClick={() => handleAction(action.viewMode)}
                    className={cn(
                      'w-full justify-start gap-2.5 rounded-xl shadow-lg border-0',
                      action.color
                    )}
                    size="sm"
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="text-sm">{action.label}</span>
                  </Button>
                </motion.div>
              );
            })}

            {/* Label */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.05 }}
              className="text-[10px] text-muted-foreground mr-1"
            >
              Quick Actions
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div whileTap={{ scale: 0.9 }}>
            <Button
              onClick={() => setIsOpen(!isOpen)}
              size="icon"
              className={cn(
                'h-14 w-14 rounded-full shadow-xl transition-colors duration-200',
                isOpen
                  ? 'bg-destructive text-white hover:bg-destructive/90'
                  : 'bg-emerald-500 text-white hover:bg-emerald-600'
              )}
            >
              <motion.div
                animate={{ rotate: isOpen ? 135 : 0 }}
                transition={{ duration: 0.2 }}
              >
                {isOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Plus className="h-6 w-6" />
                )}
              </motion.div>
            </Button>
          </motion.div>
        </TooltipTrigger>
        <TooltipContent side="left" className="md:hidden">
          Quick Actions
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
