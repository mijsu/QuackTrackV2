'use client';

import { useState, useEffect, ReactNode, useSyncExternalStore } from 'react';

interface MobileViewportWrapperProps {
  children: ReactNode;
}

// Custom hook to get mobile state without setState in effect
function useIsMobile() {
  // useSyncExternalStore is the recommended way to subscribe to external values
  return useSyncExternalStore(
    // Subscribe function
    (onStoreChange) => {
      window.addEventListener('resize', onStoreChange);
      return () => window.removeEventListener('resize', onStoreChange);
    },
    // Get snapshot function (client)
    () => window.innerWidth < 768,
    // Get snapshot function (server)
    () => false // Default to desktop on server
  );
}

/**
 * MobileViewportWrapper
 * 
 * Provides consistent mobile viewport constraints across different browsers and webviews.
 * 
 * Desktop/Tablet (≥ 768px):
 * - Children are rendered directly without any wrapper
 * - Full responsive layout is preserved
 * - No changes to the existing desktop experience
 * 
 * Mobile (< 768px):
 * - Content is constrained to 430px max width
 * - Centered on screen with a subtle shadow
 * - Consistent experience across all mobile contexts (Facebook Messenger, Chrome, Safari, etc.)
 */
export function MobileViewportWrapper({ children }: MobileViewportWrapperProps) {
  const isMobile = useIsMobile();

  // Desktop/Tablet: Render children directly without any wrapper
  if (!isMobile) {
    return <>{children}</>;
  }

  // Mobile: Apply viewport constraints
  return (
    <div className="min-h-screen w-full flex justify-center bg-background">
      <div className="w-full max-w-[430px] min-h-screen shadow-2xl bg-background">
        {children}
      </div>
    </div>
  );
}
