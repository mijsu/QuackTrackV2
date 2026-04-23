'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Database, Server, Shield, RefreshCw, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type HealthStatus = 'ok' | 'degraded' | 'error' | 'loading' | 'unknown';

interface ServiceCheck {
  id: string;
  label: string;
  endpoint: string;
  icon: React.ElementType;
  status: HealthStatus;
  responseTime: number | null; // ms
  lastChecked: Date | null;
}

type OverallStatus = 'operational' | 'partial' | 'issues';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REFRESH_INTERVAL_MS = 60_000;

const INITIAL_SERVICES: ServiceCheck[] = [
  {
    id: 'database',
    label: 'Database',
    endpoint: '/api/stats',
    icon: Database,
    status: 'loading',
    responseTime: null,
    lastChecked: null,
  },
  {
    id: 'api',
    label: 'API Server',
    endpoint: '/api/health',
    icon: Server,
    status: 'loading',
    responseTime: null,
    lastChecked: null,
  },
  {
    id: 'auth',
    label: 'Auth Service',
    endpoint: '/api/auth/session',
    icon: Shield,
    status: 'loading',
    responseTime: null,
    lastChecked: null,
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map individual service status to a CSS dot class. */
function dotClass(status: HealthStatus): string {
  switch (status) {
    case 'ok':
      return 'health-dot health-dot-ok pulse-dot';
    case 'degraded':
      return 'health-dot health-dot-warning pulse-dot';
    case 'error':
      return 'health-dot health-dot-error pulse-dot';
    default:
      return 'health-dot bg-muted-foreground/30';
  }
}

/** Map individual service status to a Tailwind text color. */
function statusTextColor(status: HealthStatus): string {
  switch (status) {
    case 'ok':
      return 'text-emerald-600 dark:text-emerald-400';
    case 'degraded':
      return 'text-amber-600 dark:text-amber-400';
    case 'error':
      return 'text-red-600 dark:text-red-400';
    default:
      return 'text-muted-foreground';
  }
}

/** Map overall status to visual config. */
function overallConfig(
  services: ServiceCheck[],
): { label: string; color: string; barClass: string } {
  const okCount = services.filter((s) => s.status === 'ok').length;
  const errorCount = services.filter((s) => s.status === 'error').length;

  if (okCount === services.length) {
    return {
      label: 'All Systems Operational',
      color: 'text-emerald-600 dark:text-emerald-400',
      barClass: 'health-bar health-bar-ok',
    };
  }
  if (errorCount > 0) {
    return {
      label: 'System Issues',
      color: 'text-red-600 dark:text-red-400',
      barClass: 'health-bar bg-red-500',
    };
  }
  return {
    label: 'Partial Issues',
    color: 'text-amber-600 dark:text-amber-400',
    barClass: 'health-bar health-bar-warning',
  };
}

/** Perform a health check against a single endpoint. */
async function checkService(
  service: ServiceCheck,
): Promise<Pick<ServiceCheck, 'status' | 'responseTime' | 'lastChecked'>> {
  const start = performance.now();
  try {
    const res = await fetch(service.endpoint, { method: 'GET', cache: 'no-store' });
    const elapsed = Math.round(performance.now() - start);

    if (res.ok) {
      return { status: 'ok', responseTime: elapsed, lastChecked: new Date() };
    }
    // Non-200 responses are degraded rather than full error
    return { status: 'degraded', responseTime: elapsed, lastChecked: new Date() };
  } catch {
    const elapsed = Math.round(performance.now() - start);
    return { status: 'error', responseTime: elapsed, lastChecked: new Date() };
  }
}

// ---------------------------------------------------------------------------
// Stagger animation variants for framer-motion
// ---------------------------------------------------------------------------

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: 'easeOut' as const },
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SystemHealthWidget() {
  const [services, setServices] = useState<ServiceCheck[]>(INITIAL_SERVICES);
  const [checking, setChecking] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  /** Run health checks against all services in parallel. */
  const runChecks = useCallback(async () => {
    setChecking(true);

    const results = await Promise.all(
      INITIAL_SERVICES.map(async (svc) => {
        const result = await checkService(svc);
        return { ...svc, ...result };
      }),
    );

    setServices(results);
    setLastRefresh(new Date());
    setChecking(false);
  }, []);

  // Initial check + auto-refresh
  const runChecksRef = useRef<() => Promise<void>>(() => Promise.resolve());
  useEffect(() => {
    runChecksRef.current = runChecks;
    runChecksRef.current();

    const interval = setInterval(() => {
      runChecksRef.current();
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  // Derived
  const overall = overallConfig(services);
  const okRatio = services.filter((s) => s.status === 'ok').length / services.length;

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <Card className="h-full flex flex-col">
        {/* ---- Header ---- */}
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-sm font-medium">
            <span className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              System Health
            </span>
            <button
              onClick={runChecks}
              disabled={checking}
              className={cn(
                'rounded-md p-1 transition-colors',
                'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                checking && 'animate-spin',
              )}
              aria-label="Refresh system health"
            >
              <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </CardTitle>
        </CardHeader>

        {/* ---- Body ---- */}
        <CardContent className="pt-0 flex-1 flex flex-col gap-3">
          {/* Overall status bar */}
          <motion.div
            initial={{ opacity: 0, scaleX: 0.8 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="space-y-1.5"
          >
            <p className={cn('text-xs font-semibold', overall.color)}>
              {overall.label}
            </p>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <motion.div
                className={cn(
                  'h-full rounded-full transition-colors duration-500',
                  overall.barClass,
                )}
                initial={{ width: 0 }}
                animate={{ width: `${okRatio * 100}%` }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
              />
            </div>
          </motion.div>

          {/* Service rows */}
          {checking && lastRefresh === null ? (
            /* ---- Loading skeleton ---- */
            <div className="space-y-2.5 animate-fade-in">
              {INITIAL_SERVICES.map((svc) => (
                <div key={svc.id} className="flex items-center gap-2.5">
                  <div className="skeleton-line w-2.5 h-2.5 rounded-full shrink-0" />
                  <div className="skeleton-line w-24 h-3" />
                  <div className="skeleton-line w-12 h-3 ml-auto" />
                </div>
              ))}
            </div>
          ) : (
            /* ---- Status rows with stagger ---- */
            <motion.div
              className="space-y-1 stagger-children"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {services.map((svc) => {
                const Icon = svc.icon;
                return (
                  <motion.div
                    key={svc.id}
                    variants={itemVariants}
                    className="flex items-center gap-2.5"
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2.5 flex-1 min-w-0 cursor-default">
                          <div className={dotClass(svc.status)} />
                          <Icon
                            className={cn(
                              'h-3.5 w-3.5 shrink-0',
                              statusTextColor(svc.status),
                            )}
                          />
                          <span className="text-xs text-foreground truncate">
                            {svc.label}
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p className="text-xs">
                          {svc.status === 'ok'
                            ? `${svc.label} is healthy`
                            : svc.status === 'degraded'
                              ? `${svc.label} is degraded`
                              : svc.status === 'error'
                                ? `${svc.label} is unreachable`
                                : `Checking ${svc.label}…`}
                        </p>
                      </TooltipContent>
                    </Tooltip>

                    <span
                      className={cn(
                        'text-[11px] tabular-nums shrink-0',
                        svc.responseTime !== null
                          ? statusTextColor(svc.status)
                          : 'text-muted-foreground',
                      )}
                    >
                      {svc.responseTime !== null ? `${svc.responseTime}ms` : '—'}
                    </span>
                  </motion.div>
                );
              })}
            </motion.div>
          )}

          {/* Last refreshed timestamp */}
          {lastRefresh && (
            <p className="text-[10px] text-muted-foreground/60 mt-auto pt-1">
              Last checked{' '}
              {lastRefresh.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
