'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import {
  User,
  Monitor,
  Bell,
  Info,
  Save,
  GraduationCap,
  Building2,
  RefreshCw,
  Shield,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface UserPreferences {
  defaultView: string;
  tableDensity: 'compact' | 'comfortable';
  showQuickStats: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  conflictAlerts: boolean;
}

const PREFERENCES_STORAGE_KEY = 'quacktrack-user-preferences';

const DEFAULT_PREFERENCES: UserPreferences = {
  defaultView: 'dashboard',
  tableDensity: 'comfortable',
  showQuickStats: true,
  emailNotifications: true,
  pushNotifications: true,
  conflictAlerts: true,
};

const APP_VERSION = 'v2.1.0';
const SCHOOL_NAME = 'Pateros Technological College';
const DEPARTMENT = 'IT Department';

// ============================================================================
// Hook: useUserPreferences
// ============================================================================

function loadStoredPreferences(): UserPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
  try {
    const stored = localStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_PREFERENCES, ...parsed };
    }
  } catch {
    // Use defaults if localStorage is unavailable
  }
  return DEFAULT_PREFERENCES;
}

function useUserPreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>(() => loadStoredPreferences());
  const isLoaded = true;

  useEffect(() => {
    const handler = () => {
      setPreferences(loadStoredPreferences());
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const updatePreferences = useCallback((updates: Partial<UserPreferences>) => {
    setPreferences((prev) => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Silently fail if localStorage is unavailable
      }
      return next;
    });
  }, []);

  return { preferences, updatePreferences, isLoaded };
}

// ============================================================================
// SettingsDialog Component
// ============================================================================

export function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: session } = useSession();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { preferences, updatePreferences, isLoaded } = useUserPreferences();
  const [activeTab, setActiveTab] = useState('profile');

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      onOpenChange(false);
    }
  };

  const handleSave = () => {
    toast({
      title: 'Preferences saved',
      description: 'Your settings have been updated successfully.',
    });
    onOpenChange(false);
  };

  // Derive tab reset from open prop
  const effectiveTab = open ? activeTab : 'profile';
  const handleTabChange = (value: string) => setActiveTab(value);

  const roleLabel = session?.user?.role === 'admin' ? 'Administrator' : 'Faculty';
  const roleBadgeVariant = session?.user?.role === 'admin' ? 'default' : 'outline';

  // ==========================================================================
  // Tab Content: Profile
  // ==========================================================================
  const profileContent = (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      {/* Avatar & Identity Card */}
      <div className="flex flex-col items-center gap-4 py-4">
        <UserAvatar
          name={session?.user?.name}
          role={session?.user?.role}
          image={session?.user?.image}
          size="lg"
          showOnlineStatus
          isOnline
        />
        <div className="text-center space-y-1">
          <h3 className="text-lg font-semibold text-foreground">
            {session?.user?.name || 'Unknown User'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {session?.user?.email || 'No email'}
          </p>
          <Badge variant={roleBadgeVariant} className="mt-2">
            <Shield className="mr-1 h-3 w-3" />
            {roleLabel}
          </Badge>
        </div>
      </div>

      <Separator />

      {/* Profile Info Details */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Account Information
        </h4>
        <div className="rounded-lg border bg-muted/30 divide-y">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-muted-foreground">Name</span>
            <span className="text-sm font-medium">{session?.user?.name}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-muted-foreground">Email</span>
            <span className="text-sm font-medium truncate max-w-[200px]">
              {session?.user?.email}
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-muted-foreground">Role</span>
            <span className="text-sm font-medium">{roleLabel}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-muted-foreground">Status</span>
            <span className="flex items-center gap-1.5 text-sm font-medium text-green-600 dark:text-green-400">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              Online
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );

  // ==========================================================================
  // Tab Content: Display
  // ==========================================================================
  const displayContent = (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      {/* Default View Mode */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Default View
        </h4>
        <div className="space-y-2">
          <Label htmlFor="default-view" className="text-sm">
            Default view mode
          </Label>
          <Select
            value={preferences.defaultView}
            onValueChange={(val) => updatePreferences({ defaultView: val })}
            disabled={!isLoaded}
          >
            <SelectTrigger id="default-view" className="w-full">
              <SelectValue placeholder="Select default view" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dashboard">Dashboard</SelectItem>
              <SelectItem value="calendar">Calendar</SelectItem>
              <SelectItem value="schedules">Schedules</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            The page that loads when you open the app.
          </p>
        </div>
      </div>

      <Separator />

      {/* Table Density */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Table & Data
        </h4>
        <div className="space-y-2">
          <Label htmlFor="table-density" className="text-sm">
            Table density
          </Label>
          <Select
            value={preferences.tableDensity}
            onValueChange={(val: 'compact' | 'comfortable') =>
              updatePreferences({ tableDensity: val })
            }
            disabled={!isLoaded}
          >
            <SelectTrigger id="table-density" className="w-full">
              <SelectValue placeholder="Select density" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="compact">Compact</SelectItem>
              <SelectItem value="comfortable">Comfortable</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Adjust the spacing in data tables.
          </p>
        </div>
      </div>

      <Separator />

      {/* Quick Stats Bar */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="quick-stats" className="text-sm font-medium">
            Quick Stats Bar
          </Label>
          <p className="text-xs text-muted-foreground">
            Show summary stats on the dashboard
          </p>
        </div>
        <Switch
          id="quick-stats"
          checked={preferences.showQuickStats}
          onCheckedChange={(checked) => updatePreferences({ showQuickStats: checked })}
          disabled={!isLoaded}
        />
      </div>
    </motion.div>
  );

  // ==========================================================================
  // Tab Content: Notifications
  // ==========================================================================
  const notificationContent = (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <div className="space-y-1">
        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Notification Channels
        </h4>
        <p className="text-xs text-muted-foreground">
          Choose how you want to receive notifications.
        </p>
      </div>

      {/* Email Notifications */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="email-notifications" className="text-sm font-medium">
            Email Notifications
          </Label>
          <p className="text-xs text-muted-foreground">
            Receive updates via your email address
          </p>
        </div>
        <Switch
          id="email-notifications"
          checked={preferences.emailNotifications}
          onCheckedChange={(checked) =>
            updatePreferences({ emailNotifications: checked })
          }
          disabled={!isLoaded}
        />
      </div>

      <Separator />

      {/* Push Notifications */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="push-notifications" className="text-sm font-medium">
            Push Notifications
          </Label>
          <p className="text-xs text-muted-foreground">
            Get browser push notifications for real-time alerts
          </p>
        </div>
        <Switch
          id="push-notifications"
          checked={preferences.pushNotifications}
          onCheckedChange={(checked) =>
            updatePreferences({ pushNotifications: checked })
          }
          disabled={!isLoaded}
        />
      </div>

      <Separator />

      {/* Conflict Alerts */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="conflict-alerts" className="text-sm font-medium">
            Conflict Alerts
          </Label>
          <p className="text-xs text-muted-foreground">
            Get notified when schedule conflicts are detected
          </p>
        </div>
        <Switch
          id="conflict-alerts"
          checked={preferences.conflictAlerts}
          onCheckedChange={(checked) =>
            updatePreferences({ conflictAlerts: checked })
          }
          disabled={!isLoaded}
        />
      </div>
    </motion.div>
  );

  // ==========================================================================
  // Tab Content: About
  // ==========================================================================
  const aboutContent = (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      {/* App Logo & Name */}
      <div className="flex flex-col items-center gap-3 py-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20">
          <GraduationCap className="h-7 w-7" />
        </div>
        <div className="text-center space-y-1">
          <h3 className="text-lg font-bold text-foreground">QuackTrack</h3>
          <p className="text-sm text-muted-foreground">
            Academic Schedule Management System
          </p>
        </div>
      </div>

      <Separator />

      {/* App Details */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Application Info
        </h4>
        <div className="rounded-lg border bg-muted/30 divide-y">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Version</span>
            </div>
            <Badge variant="secondary" className="font-mono text-xs">
              {APP_VERSION}
            </Badge>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">School</span>
            </div>
            <span className="text-sm font-medium text-right">{SCHOOL_NAME}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Department</span>
            </div>
            <span className="text-sm font-medium">{DEPARTMENT}</span>
          </div>
        </div>
      </div>

      <Separator />

      {/* Check for Updates */}
      <Button
        variant="outline"
        className="w-full"
        disabled
      >
        <RefreshCw className="mr-2 h-4 w-4" />
        Check for Updates
      </Button>
      <p className="text-xs text-center text-muted-foreground">
        You&apos;re running the latest version of QuackTrack.
      </p>
    </motion.div>
  );

  // ==========================================================================
  // Shared Tab Navigation
  // ==========================================================================
  const tabNavigation = (
    <TabsList className="w-full grid grid-cols-4">
      <TabsTrigger value="profile" className="gap-1.5 text-xs sm:text-sm">
        <User className="h-3.5 w-3.5 hidden sm:block" />
        Profile
      </TabsTrigger>
      <TabsTrigger value="display" className="gap-1.5 text-xs sm:text-sm">
        <Monitor className="h-3.5 w-3.5 hidden sm:block" />
        Display
      </TabsTrigger>
      <TabsTrigger value="notifications" className="gap-1.5 text-xs sm:text-sm">
        <Bell className="h-3.5 w-3.5 hidden sm:block" />
        Alerts
      </TabsTrigger>
      <TabsTrigger value="about" className="gap-1.5 text-xs sm:text-sm">
        <Info className="h-3.5 w-3.5 hidden sm:block" />
        About
      </TabsTrigger>
    </TabsList>
  );

  const tabsContent = (
    <Tabs value={effectiveTab} onValueChange={handleTabChange} className="w-full">
      {tabNavigation}
      <div className="mt-4">
        <AnimatePresence mode="wait">
          {effectiveTab === 'profile' && (
            <TabsContent value="profile" forceMount>
              {profileContent}
            </TabsContent>
          )}
          {effectiveTab === 'display' && (
            <TabsContent value="display" forceMount>
              {displayContent}
            </TabsContent>
          )}
          {effectiveTab === 'notifications' && (
            <TabsContent value="notifications" forceMount>
              {notificationContent}
            </TabsContent>
          )}
          {effectiveTab === 'about' && (
            <TabsContent value="about" forceMount>
              {aboutContent}
            </TabsContent>
          )}
        </AnimatePresence>
      </div>
    </Tabs>
  );

  // ==========================================================================
  // Render: Desktop Dialog
  // ==========================================================================
  if (!isMobile) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-hidden flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle className="text-xl flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                <User className="h-4 w-4" />
              </div>
              Settings
            </DialogTitle>
            <DialogDescription>
              Manage your profile, display preferences, and notifications.
            </DialogDescription>
          </DialogHeader>

          <Separator className="mx-6" />

          <div className="flex-1 overflow-y-auto px-6 py-2">
            {tabsContent}
          </div>

          <Separator />

          <div className="px-6 py-4 flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-500/20"
            >
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ==========================================================================
  // Render: Mobile Sheet
  // ==========================================================================
  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 gap-0 overflow-hidden flex flex-col">
        <SheetHeader className="px-4 pt-6 pb-2">
          <SheetTitle className="text-lg flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
              <User className="h-3.5 w-3.5" />
            </div>
            Settings
          </SheetTitle>
          <SheetDescription>
            Manage your preferences.
          </SheetDescription>
        </SheetHeader>

        <Separator className="mx-4" />

        <div className="flex-1 overflow-y-auto px-4 py-2">
          {tabsContent}
        </div>

        <Separator />

        <div className="px-4 py-3 flex gap-3">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-500/20"
          >
            <Save className="mr-2 h-4 w-4" />
            Save
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
