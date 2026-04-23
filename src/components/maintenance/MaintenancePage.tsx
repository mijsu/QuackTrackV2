'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Wrench, RefreshCw, LogOut, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface MaintenancePageProps {
  message?: string;
}

export function MaintenancePage({ message }: MaintenancePageProps) {
  const { data: session } = useSession();
  const [checking, setChecking] = useState(false);
  const [customMessage, setCustomMessage] = useState(message || '');

  const isAdmin = session?.user?.role === 'admin';

  useEffect(() => {
    // Fetch custom maintenance message
    const fetchMessage = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          if (data.maintenance_message) {
            setCustomMessage(data.maintenance_message);
          }
        }
      } catch (error) {
        console.error('Failed to fetch maintenance message:', error);
      }
    };
    
    if (!message) {
      fetchMessage();
    }
  }, [message]);

  const handleCheckAgain = async () => {
    setChecking(true);
    try {
      // Refresh the page to re-check maintenance status
      window.location.reload();
    } catch (error) {
      console.error('Error checking maintenance status:', error);
    } finally {
      setTimeout(() => setChecking(false), 2000);
    }
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="border-0 shadow-2xl bg-slate-800/90 backdrop-blur-sm">
          <CardContent className="pt-8 pb-8 px-6">
            {/* Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="flex justify-center mb-6"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-xl animate-pulse" />
                <div className="relative bg-gradient-to-br from-amber-500 to-orange-600 p-4 rounded-full">
                  <Wrench className="h-10 w-10 text-white" />
                </div>
              </div>
            </motion.div>

            {/* Title */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-center mb-6"
            >
              <h1 className="text-2xl font-bold text-white mb-2">
                Under Maintenance
              </h1>
              <p className="text-slate-400">
                QuackTrack is currently undergoing scheduled maintenance
              </p>
            </motion.div>

            {/* Custom Message */}
            {customMessage && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="bg-slate-700/50 border border-slate-600 rounded-lg p-4 mb-6"
              >
                <p className="text-slate-200 text-sm text-center">
                  {customMessage}
                </p>
              </motion.div>
            )}

            {/* Admin Notice */}
            {isAdmin && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 mb-6"
              >
                <div className="flex items-center gap-2 text-emerald-400 text-sm">
                  <Settings className="h-4 w-4" />
                  <span className="font-medium">Admin Access</span>
                </div>
                <p className="text-emerald-300/80 text-xs mt-1">
                  You can access the system. Disable maintenance mode in Settings when ready.
                </p>
              </motion.div>
            )}

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="space-y-3"
            >
              {!isAdmin && (
                <>
                  <Button
                    onClick={handleCheckAgain}
                    disabled={checking}
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
                  >
                    {checking ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Checking...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Check Again
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={handleSignOut}
                    variant="outline"
                    className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </Button>
                </>
              )}

              {isAdmin && (
                <Button
                  onClick={() => window.location.href = '/'}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
                >
                  Continue to Dashboard
                </Button>
              )}
            </motion.div>

            {/* Footer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="mt-8 text-center"
            >
              <p className="text-slate-500 text-xs">
                We apologize for any inconvenience. Please try again later.
              </p>
              <p className="text-slate-600 text-xs mt-2">
                © {new Date().getFullYear()} Pateros Technological College
              </p>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
