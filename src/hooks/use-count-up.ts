'use client';

import { useState, useEffect, useRef } from 'react';

/**
 * Animated count-up hook.
 * Animates a number from 0 to `end` over `duration` ms when `trigger` is true.
 */
export function useCountUp(end: number, duration = 800, trigger = true) {
  const [count, setCount] = useState(trigger ? 0 : end);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!trigger) return;

    startTimeRef.current = null;

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(end * eased));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [end, duration, trigger]);

  return count;
}
