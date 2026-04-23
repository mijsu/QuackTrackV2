'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Footer } from './Footer';
import { MobileBottomNav } from './MobileBottomNav';
import { NotificationProvider } from '@/components/notifications/NotificationProvider';
import { MaintenancePage } from '@/components/maintenance/MaintenancePage';
import { BackToTopButton } from './BackToTopButton';
import { KeyboardShortcutsDialog } from './KeyboardShortcutsDialog';
import { Breadcrumb } from './Breadcrumb';
import { QuickActionsFab } from './QuickActionsFab';
import { OnboardingTourWithTrigger } from '@/components/dashboard/OnboardingTour';
import { Toaster } from 'sonner';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { status, data: session } = useSession();
  const { sidebarCollapsed } = useAppStore();
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [checkingMaintenance, setCheckingMaintenance] = useState(true);

  // Check maintenance mode
  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          setMaintenanceMode(data.maintenance_mode === 'true');
          setMaintenanceMessage(data.maintenance_message || '');
        }
      } catch (error) {
        console.error('Error checking maintenance mode:', error);
      } finally {
        setCheckingMaintenance(false);
      }
    };

    if (status !== 'loading') {
      checkMaintenance();
    }
  }, [status]);

  // Branded loading state
  if (status === 'loading' || checkingMaintenance) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-background z-50">
        {/* Background decoration */}
        <div className="absolute inset-0 mesh-gradient opacity-50" />
        <div className="absolute inset-0 dot-pattern opacity-30" />

        <div className="relative flex flex-col items-center gap-6">
          {/* Branded Loader */}
          <div className="brand-loader" />

          {/* App Name */}
          <div className="text-center animate-fade-in">
            <h1 className="text-xl font-bold tracking-tight">
              <span className="text-gradient-green">Quack</span>
              <span>Track</span>
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Loading your workspace...
            </p>
          </div>

          {/* Progress dots */}
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
          </div>
        </div>
      </div>
    );
  }

  // Maintenance mode check - admins can still access
  const isAdmin = session?.user?.role === 'admin';
  if (maintenanceMode && !isAdmin && session) {
    return <MaintenancePage message={maintenanceMessage} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background relative">
      {/* Subtle background decoration for light mode */}
      <div className="fixed inset-0 mesh-gradient pointer-events-none z-0 dark:hidden" />

      {/* Notification Provider for real-time toast notifications */}
      <NotificationProvider />

      {/* Sonner Toast Container */}
      <Toaster
        position="top-right"
        toastOptions={{
          className: 'toast-styles',
          style: {
            background: 'var(--card)',
            border: '1px solid var(--border)',
            color: 'var(--card-foreground)',
          },
        }}
        richColors
        closeButton
      />

      {/* Keyboard Shortcuts Dialog */}
      <KeyboardShortcutsDialog />

      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div
        className={cn(
          'flex-1 flex flex-col transition-all duration-300 ease-in-out relative z-10',
          // Desktop: apply margin for sidebar
          'md:transition-all',
          sidebarCollapsed ? 'md:ml-14' : 'md:ml-[220px]',
          // Mobile: no margin, full width
          'ml-0'
        )}
      >
        {/* Header */}
        <Header />

        {/* Breadcrumb Navigation */}
        <div className="px-4 lg:px-6 pt-4">
          <Breadcrumb />
        </div>

        {/* Main Content with bottom padding for mobile nav */}
        <main className="scrollbar-styled flex-1 px-4 lg:px-6 pb-24 md:pb-6 border-t border-border/50">
          {children}
        </main>

        {/* Footer */}
        <Footer />
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />

      {/* Quick Actions FAB (mobile, admin only) */}
      <QuickActionsFab />

      {/* Back to Top Button */}
      <BackToTopButton />

      {/* Onboarding Tour */}
      <OnboardingTourWithTrigger />
    </div>
  );
}
