'use client';

import { useState, useEffect, useCallback } from 'react';
import { Tour, type TourStep } from '@/components/ui/tour';

const ONBOARDING_KEY = 'quacktrack-onboarding-complete';

const tourSteps: TourStep[] = [
  {
    target: '[data-tour="welcome-banner"]',
    title: '🦆 Welcome to QuackTrack!',
    description:
      'Your smart scheduling companion is ready! This dashboard is your home base — see key metrics, quick actions, and recent activity at a glance. Let us show you around!',
    placement: 'bottom',
    showOn: 'all',
  },
  {
    target: '#sidebar-navigation',
    title: '🧭 Sidebar Navigation',
    description:
      'Use the sidebar to navigate between all major sections — Dashboard, Calendar, Schedules, Faculty, Rooms, Subjects, Sections, Departments, and more. Click any item to switch views instantly.',
    placement: 'right',
    showOn: 'desktop',
  },
  {
    target: '[data-tour="search-trigger"]',
    title: '🔍 Quick Search',
    description:
      'Press ⌘K (Mac) or Ctrl+K (Windows) to open the global search dialog. Quickly find faculty, rooms, subjects, and schedules without navigating through menus.',
    placement: 'bottom',
    showOn: 'desktop',
  },
  {
    target: '[data-tour="quick-stats-bar"]',
    title: '📊 Quick Stats Bar',
    description:
      'See real-time metrics at a glance — total faculty, subjects, active schedules, conflicts, room utilization, and current semester info. Click any card to jump to that section.',
    placement: 'bottom',
    showOn: 'all',
  },
  {
    target: '[data-tour="quick-actions"]',
    title: '⚡ Quick Actions',
    description:
      'Perform common tasks in one click — add faculty, rooms, subjects, view conflicts, print schedules, or export data. These shortcuts save you time on everyday operations.',
    placement: 'bottom',
    showOn: 'all',
  },
  {
    target: '[data-tour="quick-gen-panel"]',
    title: '🗓️ Schedule Generation',
    description:
      'Generate conflict-free schedules with a single click! The Quick Generation panel shows your current stats and lets you configure and run the CSP scheduling algorithm. View generation history and reports too.',
    placement: 'left',
    showOn: 'all',
  },
  {
    target: '[data-tour="sidebar-bottom-nav"]',
    title: '⚙️ Profile & Settings',
    description:
      'Access your notifications, profile settings, and app configuration from the bottom of the sidebar. Admins can manage system settings, maintenance mode, and more. That wraps up the tour — happy scheduling!',
    placement: 'right',
    showOn: 'desktop',
  },
];

/**
 * Hook to programmatically start the onboarding tour.
 * Used by the "Take the Tour" button in WelcomeBanner.
 */
export function useOnboardingTour() {
  const startTour = useCallback(() => {
    // Clear the flag so the tour can start fresh
    localStorage.removeItem(ONBOARDING_KEY);
    // Dispatch a custom event that OnboardingTourWithTrigger listens to
    window.dispatchEvent(new CustomEvent('quacktrack-start-tour'));
  }, []);

  return { startTour };
}

/**
 * Main onboarding tour component.
 * - Auto-starts for first-time users (no localStorage flag)
 * - Listens for manual trigger via custom event
 * - Sets localStorage flag on close/finish to prevent re-showing
 */
export function OnboardingTourWithTrigger() {
  const [open, setOpen] = useState(false);

  // Auto-start tour for first-time users after a short delay
  useEffect(() => {
    const isComplete = localStorage.getItem(ONBOARDING_KEY);
    if (!isComplete) {
      const timer = setTimeout(() => setOpen(true), 1500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, []);

  // Listen for manual tour trigger from "Take the Tour" button
  useEffect(() => {
    const handleStartTour = () => {
      setOpen(true);
    };
    window.addEventListener('quacktrack-start-tour', handleStartTour);
    return () => {
      window.removeEventListener('quacktrack-start-tour', handleStartTour);
    };
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    localStorage.setItem(ONBOARDING_KEY, 'true');
  }, []);

  const handleFinish = useCallback(() => {
    setOpen(false);
    localStorage.setItem(ONBOARDING_KEY, 'true');
  }, []);

  return (
    <Tour
      steps={tourSteps}
      open={open}
      onClose={handleClose}
      onFinish={handleFinish}
    />
  );
}
