'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  Settings,
  Save,
  Loader2,
  Building2,
  Calendar,
  Bell,
  Shield,
  Database,
  Globe,
  Mail,
  Clock,
  Lock,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Send,
  Monitor,
  Smartphone,
  AlertTriangle,
  CalendarDays,
  FileText,
  Info,
  RotateCcw,
  Download,
  Trash2,
  ExternalLink,
  GraduationCap,
  UserPlus,
  Timer,
  Layers,
  Zap,
  Crown,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/store';
import { SEMESTER_OPTIONS } from '@/types';

interface SystemSettings {
  institution_name: string;
  institution_code: string;
  max_faculty_units: string;
  min_faculty_units: string;
  academic_year: string;
  semester: string;
  semester_start_date: string;
  semester_end_date: string;
  default_class_duration: string;
  min_class_start_time: string;
  max_class_end_time: string;
  auto_assign_rooms: boolean;
  prefer_consecutive_slots: boolean;
  auto_generate_enabled: boolean;
  conflict_detection_enabled: boolean;
  email_notifications: boolean;
  schedule_reminders: boolean;
  conflict_notification_threshold: string;
  maintenance_mode: boolean;
  maintenance_message: string;
  allow_faculty_self_registration: boolean;
  last_backup: string;
  executive_semester: string;
  executive_academic_year: string;
}

interface NotificationPrefs {
  push_notifications: boolean;
  schedule_change_alerts: boolean;
  conflict_warnings: boolean;
  weekly_summary: boolean;
}

interface DisplayPrefs {
  default_view: string;
  schedule_view_mode: string;
  compact_tables: boolean;
  show_weekends: boolean;
}

const ACADEMIC_YEARS = ['2023-2024', '2024-2025', '2025-2026', '2026-2027'];

const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  push_notifications: true,
  schedule_change_alerts: true,
  conflict_warnings: true,
  weekly_summary: false,
};

const DEFAULT_DISPLAY_PREFS: DisplayPrefs = {
  default_view: 'dashboard',
  schedule_view_mode: 'calendar',
  compact_tables: false,
  show_weekends: true,
};

const NOTIFICATION_STORAGE_KEY = 'quacktrack-notification-prefs';
const DISPLAY_STORAGE_KEY = 'quacktrack-display-prefs';

export function SettingsView() {
  const { data: session } = useSession();
  const { setViewMode } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seededStatus, setSeededStatus] = useState<boolean | null>(null);
  const [backingUp, setBackingUp] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);
  const [sendingReminders, setSendingReminders] = useState(false);
  const [settings, setSettings] = useState<SystemSettings>({
    institution_name: 'Pateros Technological College',
    institution_code: 'PTC',
    max_faculty_units: '24',
    min_faculty_units: '12',
    academic_year: '2024-2025',
    semester: '1st Semester',
    semester_start_date: '',
    semester_end_date: '',
    default_class_duration: '60',
    min_class_start_time: '07:00',
    max_class_end_time: '21:00',
    auto_assign_rooms: false,
    prefer_consecutive_slots: false,
    auto_generate_enabled: true,
    conflict_detection_enabled: true,
    email_notifications: true,
    schedule_reminders: true,
    conflict_notification_threshold: '5',
    maintenance_mode: false,
    maintenance_message: '',
    allow_faculty_self_registration: false,
    last_backup: '',
    executive_semester: '',
    executive_academic_year: '',
  });
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>(DEFAULT_NOTIFICATION_PREFS);
  const [displayPrefs, setDisplayPrefs] = useState<DisplayPrefs>(DEFAULT_DISPLAY_PREFS);
  const [exporting, setExporting] = useState(false);
  const [showSeedConfirm, setShowSeedConfirm] = useState(false);
  const [showClearCacheConfirm, setShowClearCacheConfirm] = useState(false);

  useEffect(() => {
    fetchSettings();
    checkSeedStatus();
    loadNotificationPrefs();
    loadDisplayPrefs();
  }, []);

  // Role-based access control - redirect non-admin users
  useEffect(() => {
    if (session && session.user?.role !== 'admin') {
      toast.error('Access denied. Admin privileges required.');
      setViewMode('dashboard');
    }
  }, [session, setViewMode]);

  const loadNotificationPrefs = useCallback(() => {
    try {
      const stored = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
      if (stored) {
        setNotifPrefs({ ...DEFAULT_NOTIFICATION_PREFS, ...JSON.parse(stored) });
      }
    } catch {
      // Use defaults if localStorage is unavailable
    }
  }, []);

  const loadDisplayPrefs = useCallback(() => {
    try {
      const stored = localStorage.getItem(DISPLAY_STORAGE_KEY);
      if (stored) {
        setDisplayPrefs({ ...DEFAULT_DISPLAY_PREFS, ...JSON.parse(stored) });
      }
    } catch {
      // Use defaults if localStorage is unavailable
    }
  }, []);

  const saveNotificationPrefs = useCallback((prefs: NotificationPrefs) => {
    try {
      localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // Silently fail if localStorage is unavailable
    }
  }, []);

  const saveDisplayPrefs = useCallback((prefs: DisplayPrefs) => {
    try {
      localStorage.setItem(DISPLAY_STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // Silently fail if localStorage is unavailable
    }
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(prev => ({
          ...prev,
          ...data,
          // Convert string booleans to actual booleans
          auto_generate_enabled: data.auto_generate_enabled === 'true',
          conflict_detection_enabled: data.conflict_detection_enabled === 'true',
          email_notifications: data.email_notifications === 'true',
          schedule_reminders: data.schedule_reminders === 'true',
          auto_assign_rooms: data.auto_assign_rooms === 'true',
          prefer_consecutive_slots: data.prefer_consecutive_slots === 'true',
          maintenance_mode: data.maintenance_mode === 'true',
          allow_faculty_self_registration: data.allow_faculty_self_registration === 'true',
          maintenance_message: data.maintenance_message || '',
          last_backup: data.last_backup || '',
          semester_start_date: data.semester_start_date || '',
          semester_end_date: data.semester_end_date || '',
          executive_semester: data.executive_semester || '',
          executive_academic_year: data.executive_academic_year || '',
          default_class_duration: data.default_class_duration || '60',
          min_class_start_time: data.min_class_start_time || '07:00',
          max_class_end_time: data.max_class_end_time || '21:00',
          conflict_notification_threshold: data.conflict_notification_threshold || '5',
        }));
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkSeedStatus = async () => {
    try {
      const res = await fetch('/api/seed');
      if (res.ok) {
        const data = await res.json();
        setSeededStatus(data.seeded);
      }
    } catch (error) {
      console.error('Error checking seed status:', error);
    }
  };

  const handleSeedDatabase = async () => {
    setSeeding(true);
    try {
      const res = await fetch('/api/seed', { method: 'POST' });
      const data = await res.json();

      if (res.ok && data.success) {
        toast.success('Database seeded successfully! Demo data has been added.');
        setSeededStatus(true);
      } else {
        toast.error(data.error || 'Failed to seed database');
      }
    } catch {
      toast.error('Failed to seed database');
    } finally {
      setSeeding(false);
    }
  };

  const handleBackupDatabase = async () => {
    setBackingUp(true);
    try {
      const res = await fetch('/api/backup', { method: 'POST' });
      const data = await res.json();

      if (res.ok && data.success) {
        toast.success('Database backup created successfully!');
        if (data.lastBackup) {
          setSettings(prev => ({ ...prev, last_backup: data.lastBackup }));
        }
      } else {
        toast.error(data.error || 'Failed to backup database');
      }
    } catch {
      toast.error('Failed to backup database');
    } finally {
      setBackingUp(false);
    }
  };

  const handleClearCache = async () => {
    setClearingCache(true);
    try {
      localStorage.clear();
      sessionStorage.clear();

      const res = await fetch('/api/cache', { method: 'POST' });
      const data = await res.json();

      if (res.ok && data.success) {
        toast.success('Cache cleared successfully! Refreshing page...');

        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        toast.error(data.error || 'Failed to clear server cache');
        setClearingCache(false);
      }
    } catch {
      toast.error('Failed to clear cache');
      setClearingCache(false);
    }
  };

  const handleExportAllData = async () => {
    setExporting(true);
    try {
      // Collect all settings data
      const settingsRes = await fetch('/api/settings');
      let settingsData = {};
      if (settingsRes.ok) {
        settingsData = await settingsRes.json();
      }

      const exportData = {
        systemSettings: settingsData,
        notificationPreferences: notifPrefs,
        displayPreferences: displayPrefs,
        exportedAt: new Date().toISOString(),
        version: 'v1.0.0',
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `quacktrack-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Settings exported successfully!');
    } catch {
      toast.error('Failed to export settings');
    } finally {
      setExporting(false);
    }
  };

  const handleResetToDefaults = async () => {
    try {
      // Reset notification prefs
      setNotifPrefs(DEFAULT_NOTIFICATION_PREFS);
      saveNotificationPrefs(DEFAULT_NOTIFICATION_PREFS);

      // Reset display prefs
      setDisplayPrefs(DEFAULT_DISPLAY_PREFS);
      saveDisplayPrefs(DEFAULT_DISPLAY_PREFS);

      // Reset system settings to defaults
      const defaultSettingsData: Record<string, string> = {
        institution_name: 'Pateros Technological College',
        institution_code: 'PTC',
        max_faculty_units: '24',
        min_faculty_units: '12',
        academic_year: '2024-2025',
        semester: '1st Semester',
        semester_start_date: '',
        semester_end_date: '',
        default_class_duration: '60',
        min_class_start_time: '07:00',
        max_class_end_time: '21:00',
        auto_assign_rooms: 'false',
        prefer_consecutive_slots: 'false',
        auto_generate_enabled: 'true',
        conflict_detection_enabled: 'true',
        email_notifications: 'true',
        schedule_reminders: 'true',
        conflict_notification_threshold: '5',
        maintenance_mode: 'false',
        maintenance_message: '',
        allow_faculty_self_registration: 'false',
      };

      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(defaultSettingsData),
      });

      if (res.ok) {
        setSettings(prev => ({
          ...prev,
          ...defaultSettingsData,
          auto_generate_enabled: defaultSettingsData.auto_generate_enabled === 'true',
          conflict_detection_enabled: defaultSettingsData.conflict_detection_enabled === 'true',
          email_notifications: defaultSettingsData.email_notifications === 'true',
          schedule_reminders: defaultSettingsData.schedule_reminders === 'true',
          auto_assign_rooms: defaultSettingsData.auto_assign_rooms === 'true',
          prefer_consecutive_slots: defaultSettingsData.prefer_consecutive_slots === 'true',
          maintenance_mode: defaultSettingsData.maintenance_mode === 'true',
          allow_faculty_self_registration: defaultSettingsData.allow_faculty_self_registration === 'true',
          maintenance_message: defaultSettingsData.maintenance_message,
          semester_start_date: defaultSettingsData.semester_start_date,
          semester_end_date: defaultSettingsData.semester_end_date,
          default_class_duration: defaultSettingsData.default_class_duration,
          min_class_start_time: defaultSettingsData.min_class_start_time,
          max_class_end_time: defaultSettingsData.max_class_end_time,
          conflict_notification_threshold: defaultSettingsData.conflict_notification_threshold,
        }));
        toast.success('All settings reset to defaults!');
      } else {
        toast.error('Failed to reset system settings');
      }
    } catch {
      toast.error('Failed to reset settings');
    }
  };

  const handleSendReminders = async () => {
    setSendingReminders(true);
    try {
      const res = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hoursAhead: 2 }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        toast.success(data.message || `Sent ${data.sentCount} reminder(s)`);
      } else {
        toast.error(data.error || 'Failed to send reminders');
      }
    } catch {
      toast.error('Failed to send reminders');
    } finally {
      setSendingReminders(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...settings,
          // Convert booleans to strings for API
          auto_generate_enabled: String(settings.auto_generate_enabled),
          conflict_detection_enabled: String(settings.conflict_detection_enabled),
          email_notifications: String(settings.email_notifications),
          schedule_reminders: String(settings.schedule_reminders),
          auto_assign_rooms: String(settings.auto_assign_rooms),
          prefer_consecutive_slots: String(settings.prefer_consecutive_slots),
          maintenance_mode: String(settings.maintenance_mode),
          allow_faculty_self_registration: String(settings.allow_faculty_self_registration),
          maintenance_message: settings.maintenance_message,
        }),
      });

      if (res.ok) {
        toast.success('Settings saved successfully');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to save settings');
      }
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: keyof SystemSettings, value: string | boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const updateNotifPref = (key: keyof NotificationPrefs, value: boolean) => {
    const updated = { ...notifPrefs, [key]: value };
    setNotifPrefs(updated);
    saveNotificationPrefs(updated);
    toast.success('Notification preference updated');
  };

  const updateDisplayPref = (key: keyof DisplayPrefs, value: string | boolean) => {
    const updated = { ...displayPrefs, [key]: value };
    setDisplayPrefs(updated);
    saveDisplayPrefs(updated);
    toast.success('Display preference updated');
  };

  // Format last backup date
  const formatLastBackup = (dateStr: string) => {
    if (!dateStr) return 'Never';
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Never';
    }
  };

  // Check admin access
  if (session && session.user?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Lock className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Access Denied</h2>
        <p className="text-muted-foreground">You need administrator privileges to access this page.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Settings className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 max-w-4xl mx-auto"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-600">System Settings</h1>
          <div className="h-1 w-20 mt-1 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600" />
          <p className="text-muted-foreground mt-1">Configure system-wide preferences and options</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5">
          <TabsTrigger value="general">
            <Building2 className="mr-2 h-4 w-4 hidden sm:inline-block" />
            General
          </TabsTrigger>
          <TabsTrigger value="schedule">
            <Calendar className="mr-2 h-4 w-4 hidden sm:inline-block" />
            Schedule
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="mr-2 h-4 w-4 hidden sm:inline-block" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="display">
            <Monitor className="mr-2 h-4 w-4 hidden sm:inline-block" />
            Display
          </TabsTrigger>
          <TabsTrigger value="system">
            <Shield className="mr-2 h-4 w-4 hidden sm:inline-block" />
            System
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0 }}>
          <Card className="card-hover gradient-border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <CardTitle>Institution Settings</CardTitle>
                  <CardDescription>Basic institution information and configuration</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="institution_name">Institution Name</Label>
                  <Input
                    id="institution_name"
                    value={settings.institution_name}
                    onChange={(e) => updateSetting('institution_name', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="institution_code">Institution Code</Label>
                  <Input
                    id="institution_code"
                    value={settings.institution_code}
                    onChange={(e) => updateSetting('institution_code', e.target.value)}
                  />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Academic Year</Label>
                  <Select
                    value={settings.academic_year}
                    onValueChange={(value) => updateSetting('academic_year', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACADEMIC_YEARS.map((year) => (
                        <SelectItem key={year} value={year}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Semester</Label>
                  <Select
                    value={settings.semester}
                    onValueChange={(value) => updateSetting('semester', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SEMESTER_OPTIONS.map((sem) => (
                        <SelectItem key={sem.value} value={sem.value}>{sem.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
          </motion.div>

          {/* Academic Calendar */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
          <Card className="card-hover gradient-border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                  <GraduationCap className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <CardTitle>Academic Calendar</CardTitle>
                  <CardDescription>Define semester start and end dates</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="semester_start_date">Semester Start Date</Label>
                  <Input
                    id="semester_start_date"
                    type="date"
                    value={settings.semester_start_date}
                    onChange={(e) => updateSetting('semester_start_date', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    First day of the current semester
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="semester_end_date">Semester End Date</Label>
                  <Input
                    id="semester_end_date"
                    type="date"
                    value={settings.semester_end_date}
                    onChange={(e) => updateSetting('semester_end_date', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Last day of the current semester
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          </motion.div>
        </TabsContent>

        {/* Schedule Settings */}
        <TabsContent value="schedule">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0 }}>
          <Card className="card-hover gradient-border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <CardTitle>Schedule Configuration</CardTitle>
                  <CardDescription>Configure schedule generation and management settings</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="max_faculty_units">Maximum Faculty Units</Label>
                  <Input
                    id="max_faculty_units"
                    type="number"
                    value={settings.max_faculty_units}
                    onChange={(e) => updateSetting('max_faculty_units', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum teaching units allowed per faculty
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="min_faculty_units">Minimum Faculty Units</Label>
                  <Input
                    id="min_faculty_units"
                    type="number"
                    value={settings.min_faculty_units}
                    onChange={(e) => updateSetting('min_faculty_units', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum teaching units required per faculty
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto Schedule Generation</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically generate schedules based on faculty preferences
                    </p>
                  </div>
                  <Switch
                    checked={settings.auto_generate_enabled}
                    onCheckedChange={(checked) => updateSetting('auto_generate_enabled', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Conflict Detection</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically detect scheduling conflicts
                    </p>
                  </div>
                  <Switch
                    checked={settings.conflict_detection_enabled}
                    onCheckedChange={(checked) => updateSetting('conflict_detection_enabled', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          </motion.div>

          {/* Schedule Generation Settings */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
          <Card className="card-hover gradient-border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                  <Timer className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <CardTitle>Schedule Generation</CardTitle>
                  <CardDescription>Configure defaults for automatic schedule generation</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="default_class_duration">Default Class Duration (minutes)</Label>
                  <Input
                    id="default_class_duration"
                    type="number"
                    min={15}
                    max={240}
                    value={settings.default_class_duration}
                    onChange={(e) => updateSetting('default_class_duration', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Default duration for each class session
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_faculty_units_gen">Max Faculty Units</Label>
                  <Input
                    id="max_faculty_units_gen"
                    type="number"
                    min={1}
                    max={36}
                    value={settings.max_faculty_units}
                    onChange={(e) => updateSetting('max_faculty_units', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum teaching load per faculty member
                  </p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="min_class_start_time">Min Class Start Time</Label>
                  <Input
                    id="min_class_start_time"
                    type="time"
                    value={settings.min_class_start_time}
                    onChange={(e) => updateSetting('min_class_start_time', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Earliest time a class can be scheduled
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_class_end_time">Max Class End Time</Label>
                  <Input
                    id="max_class_end_time"
                    type="time"
                    value={settings.max_class_end_time}
                    onChange={(e) => updateSetting('max_class_end_time', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Latest time a class can end
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-muted-foreground" />
                      <Label>Auto-assign Rooms</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Automatically assign available rooms during schedule generation
                    </p>
                  </div>
                  <Switch
                    className="data-[state=checked]:bg-emerald-600"
                    checked={settings.auto_assign_rooms}
                    onCheckedChange={(checked) => updateSetting('auto_assign_rooms', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-muted-foreground" />
                      <Label>Prefer Consecutive Time Slots</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Group class sessions into consecutive time blocks where possible
                    </p>
                  </div>
                  <Switch
                    className="data-[state=checked]:bg-emerald-600"
                    checked={settings.prefer_consecutive_slots}
                    onCheckedChange={(checked) => updateSetting('prefer_consecutive_slots', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          </motion.div>

          {/* Executive Class Settings */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
          <Card className="card-hover gradient-border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
                  <Crown className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <CardTitle>Executive Class Settings</CardTitle>
                  <CardDescription>Configure separate semester settings for executive (masteral) classes. Executive classes use masteral-only faculty and can have different semester schedules.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="executive_semester">Executive Semester</Label>
                  <Input
                    id="executive_semester"
                    value={settings.executive_semester}
                    onChange={(e) => updateSetting('executive_semester', e.target.value)}
                    placeholder={settings.semester || 'Same as regular semester'}
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty to use the same semester as regular classes
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="executive_academic_year">Executive Academic Year</Label>
                  <Input
                    id="executive_academic_year"
                    value={settings.executive_academic_year}
                    onChange={(e) => updateSetting('executive_academic_year', e.target.value)}
                    placeholder={settings.academic_year || 'Same as regular academic year'}
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty to use the same academic year as regular classes
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          </motion.div>
        </TabsContent>
        {/* Notification Settings */}
        <TabsContent value="notifications">
          <div className="space-y-6">
            {/* Notification Preferences */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0 }}>
            <Card className="card-hover gradient-border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                    <Bell className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <CardTitle>Notification Preferences</CardTitle>
                    <CardDescription>Choose which notifications you want to receive</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Email Notifications */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <Label>Email Notifications</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Receive email notifications for important schedule updates and changes
                    </p>
                  </div>
                  <Switch
                    className="data-[state=checked]:bg-emerald-600"
                    checked={settings.email_notifications}
                    onCheckedChange={(checked) => updateSetting('email_notifications', checked)}
                  />
                </div>

                <Separator />

                {/* Push Notifications */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4 text-muted-foreground" />
                      <Label>Push Notifications</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Get instant browser push notifications for real-time alerts
                    </p>
                  </div>
                  <Switch
                    className="data-[state=checked]:bg-emerald-600"
                    checked={notifPrefs.push_notifications}
                    onCheckedChange={(checked) => updateNotifPref('push_notifications', checked)}
                  />
                </div>

                <Separator />

                {/* Schedule Change Alerts */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                      <Label>Schedule Change Alerts</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Be notified whenever a schedule is modified, added, or removed
                    </p>
                  </div>
                  <Switch
                    className="data-[state=checked]:bg-emerald-600"
                    checked={notifPrefs.schedule_change_alerts}
                    onCheckedChange={(checked) => updateNotifPref('schedule_change_alerts', checked)}
                  />
                </div>

                <Separator />

                {/* Conflict Warnings */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                      <Label>Conflict Warnings</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Receive warnings when scheduling conflicts are detected
                    </p>
                  </div>
                  <Switch
                    className="data-[state=checked]:bg-emerald-600"
                    checked={notifPrefs.conflict_warnings}
                    onCheckedChange={(checked) => updateNotifPref('conflict_warnings', checked)}
                  />
                </div>

                <Separator />

                {/* Weekly Schedule Summary */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-muted-foreground" />
                      <Label>Weekly Schedule Summary</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Get a weekly digest email summarizing your schedule for the week ahead
                    </p>
                  </div>
                  <Switch
                    className="data-[state=checked]:bg-emerald-600"
                    checked={notifPrefs.weekly_summary}
                    onCheckedChange={(checked) => updateNotifPref('weekly_summary', checked)}
                  />
                </div>

                <Separator />

                {/* Conflict Notification Threshold */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    <Label>Conflict Notification Threshold</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Number of conflicts before sending a batch notification alert
                  </p>
                  <Input
                    id="conflict_notification_threshold"
                    type="number"
                    min={1}
                    max={100}
                    className="max-w-[200px]"
                    value={settings.conflict_notification_threshold}
                    onChange={(e) => updateSetting('conflict_notification_threshold', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
            </motion.div>

            {/* Schedule Reminders */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
            <Card className="card-hover gradient-border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-emerald-600" />
                  </div>
                  Schedule Reminders
                </CardTitle>
                <CardDescription>Configure class reminders and manual triggers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Schedule Reminders</Label>
                    <p className="text-sm text-muted-foreground">
                      Send reminders before scheduled classes
                    </p>
                  </div>
                  <Switch
                    className="data-[state=checked]:bg-emerald-600"
                    checked={settings.schedule_reminders}
                    onCheckedChange={(checked) => updateSetting('schedule_reminders', checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                  <div className="space-y-0.5">
                    <Label>Send Class Reminders Now</Label>
                    <p className="text-sm text-muted-foreground">
                      Send reminders for upcoming classes within the next 2 hours
                    </p>
                  </div>
                  <Button
                    onClick={handleSendReminders}
                    disabled={sendingReminders || !settings.schedule_reminders}
                    variant="outline"
                    size="sm"
                  >
                    {sendingReminders ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Send Reminders
                      </>
                    )}
                  </Button>
                </div>
                {!settings.schedule_reminders && (
                  <p className="text-xs text-amber-600">
                    Enable schedule reminders above to use this feature
                  </p>
                )}
              </CardContent>
            </Card>
            </motion.div>
          </div>
        </TabsContent>

        {/* Display Preferences */}
        <TabsContent value="display">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0 }}>
          <Card className="card-hover gradient-border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                  <Monitor className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <CardTitle>Display Preferences</CardTitle>
                  <CardDescription>Customize how QuackTrack looks and behaves for you</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Default View */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Default View</Label>
                  <Select
                    value={displayPrefs.default_view}
                    onValueChange={(value) => updateDisplayPref('default_view', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select default view" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dashboard">Dashboard</SelectItem>
                      <SelectItem value="calendar">Calendar</SelectItem>
                      <SelectItem value="schedules">Schedules</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Choose the page that loads when you open QuackTrack
                  </p>
                </div>

                {/* Schedule View Mode */}
                <div className="space-y-2">
                  <Label>Schedule View Mode</Label>
                  <Select
                    value={displayPrefs.schedule_view_mode}
                    onValueChange={(value) => updateDisplayPref('schedule_view_mode', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select view mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="calendar">Calendar</SelectItem>
                      <SelectItem value="grid">Grid</SelectItem>
                      <SelectItem value="list">List</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Set how schedules are displayed in the schedule view
                  </p>
                </div>
              </div>

              <Separator />

              {/* Compact Tables Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Compact Tables</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable zebra striping and condensed row padding for data tables
                  </p>
                </div>
                <Switch
                  className="data-[state=checked]:bg-emerald-600"
                  checked={displayPrefs.compact_tables}
                  onCheckedChange={(checked) => updateDisplayPref('compact_tables', checked)}
                />
              </div>

              <Separator />

              {/* Show Weekends Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Show Weekends</Label>
                  <p className="text-sm text-muted-foreground">
                    Display Saturday and Sunday columns in the calendar view
                  </p>
                </div>
                <Switch
                  className="data-[state=checked]:bg-emerald-600"
                  checked={displayPrefs.show_weekends}
                  onCheckedChange={(checked) => updateDisplayPref('show_weekends', checked)}
                />
              </div>

              <Separator />

              {/* Current Preferences Preview */}
              <div className="p-4 rounded-lg bg-muted/50 border">
                <h4 className="text-sm font-medium mb-3">Current Preferences</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Default View</p>
                    <p className="font-medium capitalize">{displayPrefs.default_view}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Schedule View</p>
                    <p className="font-medium capitalize">{displayPrefs.schedule_view_mode}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Compact Tables</p>
                    <p className="font-medium">{displayPrefs.compact_tables ? 'Enabled' : 'Disabled'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Show Weekends</p>
                    <p className="font-medium">{displayPrefs.show_weekends ? 'Yes' : 'No'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          </motion.div>
        </TabsContent>

        {/* System Settings */}
        <TabsContent value="system">
          <div className="space-y-6">
            {/* Maintenance Mode */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0 }}>
            <Card className="card-hover gradient-border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <CardTitle>System Configuration</CardTitle>
                    <CardDescription>Advanced system settings and maintenance</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/50 bg-destructive/5">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-destructive" />
                        <Label className="text-destructive">Maintenance Mode</Label>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Enable to temporarily disable user access (admins can still access)
                      </p>
                    </div>
                    <Switch
                      checked={settings.maintenance_mode}
                      onCheckedChange={(checked) => updateSetting('maintenance_mode', checked)}
                    />
                  </div>

                  {settings.maintenance_mode && (
                    <div className="space-y-2">
                      <Label htmlFor="maintenance_message">Maintenance Message</Label>
                      <Textarea
                        id="maintenance_message"
                        placeholder="We are currently performing scheduled maintenance. Please check back soon."
                        value={settings.maintenance_message}
                        onChange={(e) => updateSetting('maintenance_message', e.target.value)}
                        rows={3}
                      />
                      <p className="text-xs text-muted-foreground">
                        This message will be displayed to non-admin users during maintenance
                      </p>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Allow Faculty Self-Registration */}
                <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4 text-emerald-600" />
                      <Label>Allow Faculty Self-Registration</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Permit faculty members to create their own accounts without admin invitation
                    </p>
                  </div>
                  <Switch
                    className="data-[state=checked]:bg-emerald-600"
                    checked={settings.allow_faculty_self_registration}
                    onCheckedChange={(checked) => updateSetting('allow_faculty_self_registration', checked)}
                  />
                </div>

                <Separator />

                {/* System Information */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">System Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">Version</p>
                      <p className="font-medium">2.0.0</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">Database</p>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">PostgreSQL</p>
                        <Badge variant="outline" className="text-xs">Connected</Badge>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">Last Backup</p>
                      <p className="font-medium">{formatLastBackup(settings.last_backup)}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">Environment</p>
                      <Badge variant="secondary">Development</Badge>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Database Seed Section */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Demo Data</h4>
                  <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        {seededStatus ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-amber-500" />
                        )}
                        <Label>Database Seed Status</Label>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {seededStatus
                          ? 'Demo data has been loaded (faculty, subjects, rooms, sections)'
                          : 'Load demo data to test the scheduling system with sample faculty, subjects, rooms, and sections'}
                      </p>
                    </div>
                    <Button
                      onClick={() => setShowSeedConfirm(true)}
                      disabled={seeding || seededStatus === true}
                      variant={seededStatus ? 'outline' : 'default'}
                    >
                      {seeding ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Seeding...
                        </>
                      ) : seededStatus ? (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Seeded
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Seed Database
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            </motion.div>

            {/* Data Management */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
            <Card className="card-hover gradient-border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                    <Database className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <CardTitle>Data Management</CardTitle>
                    <CardDescription>Export, backup, and manage your application data</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Export All Data */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border bg-muted/30">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Download className="h-4 w-4 text-muted-foreground" />
                      <Label>Export All Data</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Download all system settings, notification preferences, and display preferences as a JSON file
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportAllData}
                    disabled={exporting}
                    className="shrink-0"
                  >
                    {exporting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Exporting...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Export JSON
                      </>
                    )}
                  </Button>
                </div>

                <Separator />

                {/* Clear Cache */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border bg-muted/30">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                      <Label>Clear Cache</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Clear server-side cache and browser storage. The page will refresh after clearing.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowClearCacheConfirm(true)}
                    disabled={clearingCache}
                    className="shrink-0"
                  >
                    {clearingCache ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Clearing...
                      </>
                    ) : (
                      <>
                        <Globe className="mr-2 h-4 w-4" />
                        Clear Cache
                      </>
                    )}
                  </Button>
                </div>

                <Separator />

                {/* Reset to Defaults */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border border-destructive/30 bg-destructive/5">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <RotateCcw className="h-4 w-4 text-destructive" />
                      <Label className="text-destructive">Reset to Defaults</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Restore all settings, notification preferences, and display preferences to their factory defaults. This cannot be undone.
                    </p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="shrink-0"
                      >
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Reset All
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader className="dialog-header-accent">
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action will reset all system settings, notification preferences, and display
                          preferences to their default values. This includes institution settings, schedule
                          configuration, and all your personalized preferences. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleResetToDefaults}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Yes, reset everything
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
            </motion.div>

            {/* Maintenance Actions (legacy) */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
            <Card className="card-hover gradient-border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                    <RefreshCw className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <CardTitle>Maintenance Actions</CardTitle>
                    <CardDescription>Quick actions for database backup</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={handleBackupDatabase} disabled={backingUp}>
                    <Database className="mr-2 h-4 w-4" />
                    {backingUp ? 'Backing up...' : 'Backup Database'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Create a full database backup. Use the Data Management section above for more options.
                </p>
              </CardContent>
            </Card>
            </motion.div>
          </div>
        </TabsContent>
      </Tabs>

      {/* About Section */}
      <Separator />

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0 }}>
      <Card className="card-hover gradient-border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
              <Info className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <CardTitle>About QuackTrack</CardTitle>
              <CardDescription>Application information and resources</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <p className="text-xs text-muted-foreground mb-1">Version</p>
              <div className="flex items-center justify-center gap-2">
                <p className="text-lg font-bold">v1.0.0</p>
                <Badge variant="secondary" className="text-xs">Stable</Badge>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <p className="text-xs text-muted-foreground mb-1">Application</p>
              <p className="text-sm font-medium">Academic Scheduling System</p>
              <p className="text-xs text-muted-foreground">Pateros Technological College</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <p className="text-xs text-muted-foreground mb-1">Developed By</p>
              <p className="text-sm font-medium">PTC IT Department</p>
              <p className="text-xs text-muted-foreground">Software Development Team</p>
            </div>
          </div>

          <Separator />

          <div className="flex flex-wrap gap-3">
            <Button variant="outline" size="sm" asChild>
              <a href="#" onClick={(e) => { e.preventDefault(); toast.info('Documentation coming soon!'); }}>
                <FileText className="mr-2 h-4 w-4" />
                Documentation
                <ExternalLink className="ml-2 h-3 w-3" />
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="#" onClick={(e) => { e.preventDefault(); toast.info('Support portal coming soon!'); }}>
                <Settings className="mr-2 h-4 w-4" />
                Support
                <ExternalLink className="ml-2 h-3 w-3" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
      </motion.div>

      {/* Seed Demo Data Confirmation Dialog */}
      <AlertDialog open={showSeedConfirm} onOpenChange={setShowSeedConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Seed Demo Data?</AlertDialogTitle>
            <AlertDialogDescription>
              This will populate the database with sample data. Existing records may be affected and this cannot be easily undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowSeedConfirm(false);
                handleSeedDatabase();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Seed Demo Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear Cache Confirmation Dialog */}
      <AlertDialog open={showClearCacheConfirm} onOpenChange={setShowClearCacheConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Caches?</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear both client-side and server-side caches, then reload the page. Any unsaved changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowClearCacheConfirm(false);
                handleClearCache();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Clear Caches
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
