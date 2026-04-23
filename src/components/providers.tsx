'use client';

// Import API config FIRST - this sets up the fetch interceptor for mobile
import '@/lib/api-config';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { useState, useEffect } from 'react';
import { useNotifications } from '@/hooks/use-notifications';
import { MobileViewportWrapper } from '@/components/mobile-viewport-wrapper';
import { isMobileApp, PRODUCTION_API_URL } from '@/lib/api-config';

// Component that initializes notifications when user is logged in
function NotificationProvider({ children }: { children: React.ReactNode }) {
  // This hook will connect to WebSocket when user is logged in
  useNotifications();
  return <>{children}</>;
}

// Debug component to log mobile status
function MobileDebug() {
  useEffect(() => {
    console.log('=== QuackTrack App Initialized ===');
    console.log('Mobile App:', isMobileApp());
    console.log('API URL:', PRODUCTION_API_URL);
    console.log('Location:', window.location.href);
    console.log('Protocol:', window.location.protocol);
    console.log('===================================');
  }, []);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
      },
    },
  }));

  return (
    <SessionProvider 
        refetchInterval={5 * 60} // Refetch session every 5 minutes
        refetchOnWindowFocus={false} // Don't refetch on window focus
      >
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <MobileDebug />
          <NotificationProvider>
            <MobileViewportWrapper>
              {children}
            </MobileViewportWrapper>
          </NotificationProvider>
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
