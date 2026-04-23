'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Building2, Users, Zap, X, Sparkles, Database, Loader2, Map } from 'lucide-react';
import { toast } from 'sonner';
import { useOnboardingTour } from '@/components/dashboard/OnboardingTour';

const STORAGE_KEY = 'quacktrack-welcome-dismissed';

/* ============================================================================
   CONFETTI PARTICLE COMPONENT
   ============================================================================ */
function ConfettiParticle({ delay, x, color }: { delay: number; x: number; color: string }) {
  return (
    <motion.div
      className="absolute w-2 h-2 rounded-full pointer-events-none"
      style={{ left: `${x}%`, backgroundColor: color }}
      initial={{ opacity: 0, y: 0, scale: 0 }}
      animate={{
        opacity: [0, 1, 1, 0],
        y: [0, -60, -120],
        x: [0, (Math.random() - 0.5) * 80],
        scale: [0, 1, 0.5],
        rotate: [0, Math.random() * 360],
      }}
      transition={{
        duration: 1.5,
        delay,
        ease: 'easeOut',
      }}
    />
  );
}

function ConfettiBurst({ show }: { show: boolean }) {
  const colors = ['#10b981', '#14b8a6', '#06b6d4', '#8b5cf6', '#f59e0b', '#ec4899'];
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    delay: Math.random() * 0.3,
    x: 30 + Math.random() * 40,
    color: colors[i % colors.length],
  }));

  return (
    <AnimatePresence>
      {show && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
          {particles.map((p) => (
            <ConfettiParticle key={p.id} delay={p.delay} x={p.x} color={p.color} />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}

export function WelcomeBanner() {
  const { data: session } = useSession();
  const { setViewMode } = useAppStore();
  const { startTour } = useOnboardingTour();
  const [visible, setVisible] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem(STORAGE_KEY) !== null;
  });
  const [seeding, setSeeding] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showSeedConfirm, setShowSeedConfirm] = useState(false);

  const isAdmin = session?.user?.role === 'admin';

  useEffect(() => {
    if (!isAdmin || dismissed) return;

    // Small delay for entrance animation
    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
  }, [isAdmin, dismissed]);

  const handleDismiss = useCallback(() => {
    setDismissing(true);
    // Wait for the exit animation to play, then hide
    setTimeout(() => {
      setVisible(false);
      setDismissing(false);
      localStorage.setItem(STORAGE_KEY, 'true');
      setDismissed(true);
    }, 400);
  }, []);

  const handleSeedDemoData = useCallback(async () => {
    setSeeding(true);
    try {
      const res = await fetch('/api/seed', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        toast.success('Demo data seeded successfully!', {
          description: `Created ${data.created?.departments || 0} departments, ${data.created?.faculty || 0} faculty, ${data.created?.subjects || 0} subjects, and more!`,
          duration: 5000,
        });
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 2000);
        // Reload page after a short delay to show confetti
        setTimeout(() => window.location.reload(), 1800);
      } else {
        const errorData = await res.json().catch(() => ({}));
        toast.error('Failed to seed demo data', {
          description: errorData.error || 'Please make sure you are logged in as admin.',
          duration: 5000,
        });
      }
    } catch (err) {
      toast.error('Failed to seed demo data', {
        description: 'Network error. Please try again.',
        duration: 5000,
      });
    } finally {
      setSeeding(false);
    }
  }, []);

  if (dismissed || !isAdmin) return null;

  return (
    <>
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.98 }}
          animate={dismissing
            ? { opacity: 0, scale: 0.95, y: -8 }
            : { opacity: 1, y: 0, scale: 1 }
          }
          exit={{ opacity: 0, scale: 0.95, y: -8 }}
          transition={{ duration: dismissing ? 0.4 : 0.4, ease: 'easeOut' }}
          className="welcome-banner-border"
          data-tour="welcome-banner"
        >
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 dark:from-emerald-700 dark:via-teal-700 dark:to-emerald-800 text-white shadow-lg">
            {/* Confetti burst */}
            <ConfettiBurst show={showConfetti} />

            {/* Decorative background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-white/10 dark:bg-white/5 blur-2xl" />
              <div className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-white/5 dark:bg-white/[0.03] blur-xl" />
              <div className="absolute top-1/2 right-1/4 h-16 w-16 rounded-full bg-white/5 dark:bg-white/[0.03] blur-lg" />
              {/* Animated sparkle accents */}
              <motion.div
                className="absolute top-4 right-20"
                animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8], rotate: [0, 180, 360] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Sparkles className="h-4 w-4 text-white/40" />
              </motion.div>
              <motion.div
                className="absolute bottom-6 left-1/3"
                animate={{ opacity: [0.2, 0.8, 0.2], scale: [0.9, 1.1, 0.9], rotate: [360, 180, 0] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
              >
                <Sparkles className="h-3 w-3 text-white/30" />
              </motion.div>
              {/* Dot pattern overlay */}
              <div className="absolute inset-0 welcome-dot-pattern" />
            </div>

            <div className="relative px-5 py-5 sm:px-6 sm:py-6">
              {/* Dismiss button */}
              <button
                onClick={handleDismiss}
                className="absolute top-3 right-3 sm:top-4 sm:right-4 rounded-full p-2 hover:bg-white/20 active:bg-white/25 transition-all touch-manipulation"
                aria-label="Dismiss welcome banner"
              >
                <X className="h-4 w-4 text-white/80 transition-all duration-200 hover:rotate-90" />
              </button>

              {/* Content */}
              <div className="flex flex-col gap-4">
                <div className="flex items-start gap-3">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                      Welcome to QuackTrack! <span className="welcome-emoji-float">🦆</span>
                    </h2>
                    <p className="mt-1 text-sm sm:text-base text-emerald-100 dark:text-emerald-200/90 leading-relaxed max-w-2xl">
                      Your smart scheduling companion is ready! Add your departments, faculty, and subjects to generate conflict-free schedules in seconds — or seed demo data to explore right away.
                    </p>
                  </div>
                  {/* Decorative floating duck */}
                  <span className="text-2xl hidden sm:block mt-1 select-none welcome-emoji-float" style={{ animationDelay: '1s' }}>🦆</span>
                </div>

                {/* Quick action buttons with enhanced hover states */}
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  <Button
                    onClick={() => setShowSeedConfirm(true)}
                    disabled={seeding}
                    size="sm"
                    className="welcome-action-btn bg-white/25 hover:bg-white/35 active:bg-white/40 text-white border border-white/30 backdrop-blur-sm transition-all touch-manipulation font-semibold shadow-lg shadow-black/10"
                  >
                    {seeding ? (
                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    ) : (
                      <Database className="h-4 w-4 mr-1.5" />
                    )}
                    {seeding ? 'Seeding...' : 'Seed Demo Data'}
                  </Button>
                  <Button
                    onClick={() => setViewMode('departments')}
                    size="sm"
                    className="welcome-action-btn btn-shiny bg-white/15 hover:bg-white/25 active:bg-white/30 text-white border border-white/20 backdrop-blur-sm transition-colors touch-manipulation"
                  >
                    <Building2 className="h-4 w-4 mr-1.5" />
                    Add Department
                  </Button>
                  <Button
                    onClick={() => setViewMode('users')}
                    size="sm"
                    className="welcome-action-btn btn-shiny bg-white/15 hover:bg-white/25 active:bg-white/30 text-white border border-white/20 backdrop-blur-sm transition-colors touch-manipulation"
                  >
                    <Users className="h-4 w-4 mr-1.5" />
                    Add Faculty
                  </Button>
                  <Button
                    onClick={() => setViewMode('dashboard')}
                    size="sm"
                    className="welcome-action-btn btn-shiny bg-white/15 hover:bg-white/25 active:bg-white/30 text-white border border-white/20 backdrop-blur-sm transition-colors touch-manipulation"
                  >
                    <Zap className="h-4 w-4 mr-1.5" />
                    Generate Schedule
                  </Button>
                  <Button
                    onClick={startTour}
                    size="sm"
                    className="welcome-action-btn btn-shiny bg-white/15 hover:bg-white/25 active:bg-white/30 text-white border border-white/20 backdrop-blur-sm transition-colors touch-manipulation"
                  >
                    <Map className="h-4 w-4 mr-1.5" />
                    Take the Tour
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Seed Demo Data Confirmation Dialog */}
    <AlertDialog open={showSeedConfirm} onOpenChange={setShowSeedConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Seed Demo Data?</AlertDialogTitle>
          <AlertDialogDescription>
            This will populate the database with sample data including faculty, subjects, rooms, and schedules. This may affect existing data and cannot be easily undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              setShowSeedConfirm(false);
              handleSeedDemoData();
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Seed Demo Data
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
