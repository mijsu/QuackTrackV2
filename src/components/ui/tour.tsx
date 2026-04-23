'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

export interface TourStep {
  target: string;
  title: string;
  description: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  offset?: { x?: number; y?: number };
  // Optional: only show on specific screen sizes
  showOn?: 'desktop' | 'mobile' | 'all';
}

interface TourProps {
  steps: TourStep[];
  open: boolean;
  onClose: () => void;
  onFinish: () => void;
}

export function Tour({ steps: originalSteps, open, onClose, onFinish }: TourProps) {
  const [currentStepIndex, setCurrentStepIndex] = React.useState(0);
  const [position, setPosition] = React.useState({ top: 0, left: 0 });
  const [arrowPosition, setArrowPosition] = React.useState({ top: 0, left: 0 });
  const [isVisible, setIsVisible] = React.useState(false);

  // Filter steps based on screen size
  const steps = React.useMemo(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    return originalSteps.filter(step => {
      if (!step.showOn || step.showOn === 'all') return true;
      if (step.showOn === 'mobile' && isMobile) return true;
      if (step.showOn === 'desktop' && !isMobile) return true;
      return false;
    });
  }, [originalSteps]);

  const step = steps[currentStepIndex];

  // Find the next valid step (one that exists in DOM)
  const findNextValidStep = (startIndex: number, direction: 'next' | 'prev'): number => {
    const checkIndex = direction === 'next' ? startIndex + 1 : startIndex - 1;
    
    if (checkIndex < 0 || checkIndex >= steps.length) {
      return startIndex;
    }
    
    const element = document.querySelector(steps[checkIndex].target);
    if (element) {
      return checkIndex;
    }
    
    // Skip this step and find the next valid one
    return findNextValidStep(checkIndex, direction);
  };

  React.useEffect(() => {
    if (!open || !step) return;

    const updatePosition = () => {
      const element = document.querySelector(step.target) as HTMLElement;
      if (!element) {
        // Element not found, skip to next step
        setIsVisible(false);
        const nextIndex = findNextValidStep(currentStepIndex, 'next');
        if (nextIndex !== currentStepIndex) {
          setCurrentStepIndex(nextIndex);
        }
        return;
      }

      setIsVisible(true);
      const rect = element.getBoundingClientRect();
      const placement = step.placement || 'bottom';
      const offset = step.offset || { x: 0, y: 0 };

      // Check if element is fixed/sticky positioned
      const computedStyle = window.getComputedStyle(element);
      const isFixedOrSticky = computedStyle.position === 'fixed' || computedStyle.position === 'sticky';
      
      // Calculate safe viewport boundaries accounting for fixed elements
      let safeTop = 16;
      let safeBottom = window.innerHeight - 16;
      
      // If element is fixed at bottom, adjust safe bottom boundary
      if (isFixedOrSticky && rect.bottom >= window.innerHeight - 10) {
        safeBottom = rect.top - 16; // Leave space above the fixed bottom element
      }
      
      // If element is fixed at top, adjust safe top boundary
      if (isFixedOrSticky && rect.top <= 10) {
        safeTop = rect.bottom + 16; // Leave space below the fixed top element
      }

      // Calculate position based on placement
      let top = 0;
      let left = 0;
      let arrowTop = 0;
      let arrowLeft = 0;

      const tooltipWidth = 320;
      const tooltipHeight = 200;
      const spacing = 12;

      switch (placement) {
        case 'top':
          top = rect.top - tooltipHeight - spacing + (offset.y || 0);
          left = rect.left + rect.width / 2 - tooltipWidth / 2 + (offset.x || 0);
          arrowTop = tooltipHeight - 6;
          arrowLeft = tooltipWidth / 2 - 6;
          break;
        case 'bottom':
          top = rect.bottom + spacing + (offset.y || 0);
          left = rect.left + rect.width / 2 - tooltipWidth / 2 + (offset.x || 0);
          arrowTop = -6;
          arrowLeft = tooltipWidth / 2 - 6;
          break;
        case 'left':
          top = rect.top + rect.height / 2 - tooltipHeight / 2 + (offset.y || 0);
          left = rect.left - tooltipWidth - spacing + (offset.x || 0);
          arrowTop = tooltipHeight / 2 - 6;
          arrowLeft = tooltipWidth - 6;
          break;
        case 'right':
          top = rect.top + rect.height / 2 - tooltipHeight / 2 + (offset.y || 0);
          left = rect.right + spacing + (offset.x || 0);
          arrowTop = tooltipHeight / 2 - 6;
          arrowLeft = -6;
          break;
      }

      // Keep tooltip within viewport with safe boundaries
      left = Math.max(16, Math.min(left, window.innerWidth - tooltipWidth - 16));
      
      // For fixed bottom elements with 'top' placement, don't apply the bottom constraint
      // that would push the tooltip down over the element
      if (isFixedOrSticky && rect.bottom >= window.innerHeight - 10 && placement === 'top') {
        // Keep tooltip above the fixed bottom element
        top = Math.max(safeTop, Math.min(top, safeBottom - tooltipHeight));
      } else if (isFixedOrSticky && rect.top <= 10 && placement === 'bottom') {
        // Keep tooltip below the fixed top element
        top = Math.max(safeTop, Math.min(top, safeBottom - tooltipHeight));
      } else {
        // Normal constraint
        top = Math.max(16, Math.min(top, window.innerHeight - tooltipHeight - 16));
      }

      setPosition({ top, left });
      setArrowPosition({ top: arrowTop, left: arrowLeft });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    // Scroll to element only if it's not fixed/sticky positioned
    const element = document.querySelector(step.target) as HTMLElement;
    if (element) {
      const computedStyle = window.getComputedStyle(element);
      const isFixedOrSticky = computedStyle.position === 'fixed' || computedStyle.position === 'sticky';
      
      // Don't scroll fixed/sticky elements - they're always visible
      if (!isFixedOrSticky) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, step, currentStepIndex]);

  // Add/remove highlight class on target
  React.useEffect(() => {
    if (!open || !step) return;

    const element = document.querySelector(step.target) as HTMLElement;
    if (element) {
      element.classList.add('tour-highlight');
      
      // Check if element is fixed or sticky positioned
      const computedStyle = window.getComputedStyle(element);
      const isFixedOrSticky = computedStyle.position === 'fixed' || computedStyle.position === 'sticky';
      
      // Store original styles
      const originalPosition = element.style.position;
      const originalZIndex = element.style.zIndex;
      
      // Only change position if not fixed/sticky
      if (!isFixedOrSticky) {
        element.style.position = 'relative';
      }
      element.style.zIndex = '9999';

      return () => {
        element.classList.remove('tour-highlight');
        element.style.position = originalPosition;
        element.style.zIndex = originalZIndex;
      };
    }
  }, [open, step]);

  // Reset step index when tour opens
  React.useEffect(() => {
    if (open) {
      setCurrentStepIndex(0);
    }
  }, [open]);

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      const nextIndex = findNextValidStep(currentStepIndex, 'next');
      if (nextIndex === currentStepIndex) {
        // No more valid steps, finish
        onFinish();
      } else {
        setCurrentStepIndex(nextIndex);
      }
    } else {
      onFinish();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      const prevIndex = findNextValidStep(currentStepIndex, 'prev');
      setCurrentStepIndex(prevIndex);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  if (!open || !step || !isVisible) return null;

  return (
    <AnimatePresence>
      {/* Overlay */}
      <motion.div
        key="tour-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9998] bg-black/50"
        onClick={handleSkip}
      />

      {/* Tooltip */}
      <motion.div
        key={`tour-tooltip-${currentStepIndex}`}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.2 }}
        className="fixed z-[10000]"
        style={{
          top: position.top,
          left: position.left,
          width: 320,
        }}
      >
        {/* Arrow */}
        <div
          className="absolute w-3 h-3 bg-background border-l border-t border-border rotate-45"
          style={{
            top: arrowPosition.top,
            left: arrowPosition.left,
          }}
        />

        <Card className="shadow-xl border">
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{step.title}</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={handleSkip}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-2">
            <p className="text-sm text-muted-foreground">{step.description}</p>
          </CardContent>
          <CardFooter className="pt-2 pb-4 px-4 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {currentStepIndex + 1} of {steps.length}
            </span>
            <div className="flex gap-2">
              {currentStepIndex > 0 && (
                <Button variant="outline" size="sm" onClick={handlePrev}>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
              )}
              <Button size="sm" onClick={handleNext}>
                {currentStepIndex === steps.length - 1 ? 'Finish' : 'Next'}
                {currentStepIndex < steps.length - 1 && <ChevronRight className="h-4 w-4 ml-1" />}
              </Button>
            </div>
          </CardFooter>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
