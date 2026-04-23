'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tour, type TourStep } from '@/components/ui/tour';
import { toast } from 'sonner';
import {
  Settings,
  Clock,
  Calendar,
  Save,
  Loader2,
  CheckCircle,
  AlertTriangle,
  HelpCircle,
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { FacultyPreference } from '@/types';
import { DAYS, TIME_OPTIONS } from '@/types';
import { formatTimeRange } from '@/lib/utils';
import { useAppStore } from '@/store';

interface UserWithDepartment {
  id: string;
  name: string;
  email: string;
  departmentId: string | null;
  department?: { id: string; name: string; code: string | null } | null;
  specialization: string[];
  preferences: FacultyPreference | null;
}

export function PreferencesView() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<UserWithDepartment | null>(null);
  const [preferences, setPreferences] = useState<FacultyPreference | null>(null);
  const [formData, setFormData] = useState({
    preferredDays: [] as string[],
    preferredTimeStart: '08:00',
    preferredTimeEnd: '17:00',
    unavailableDays: [] as string[],
  });

  // Tour state
  const [showTour, setShowTour] = useState(false);
  
  // Get conflict resolution context from store
  const { conflictResolutionContext, clearConflictResolutionContext } = useAppStore();
  // Track if we're editing another faculty's preferences (admin mode)
  const [editingFacultyId, setEditingFacultyId] = useState<string | null>(null);

  // Check if user has seen the preferences tour
  useEffect(() => {
    if (session?.user?.id) {
      const hasSeenTour = localStorage.getItem(`ptc-preferences-tour-completed-${session.user.id}`);
      if (!hasSeenTour) {
        const timer = setTimeout(() => setShowTour(true), 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [session?.user?.id]);

  // Preferences tour steps
  const preferencesTourSteps: TourStep[] = [
    {
      target: '#preferences-header',
      title: 'My Preferences',
      description: 'This page allows you to set your teaching preferences. The system will use these preferences when generating schedules for you.',
      placement: 'bottom',
      showOn: 'all',
    },
    {
      target: '#preferences-status',
      title: 'Status Card',
      description: 'This card shows your current department and whether you have saved preferences. Make sure to save your preferences after making changes.',
      placement: 'bottom',
      showOn: 'all',
    },
    {
      target: '#preferred-days-card',
      title: 'Preferred Teaching Days',
      description: 'Select the days you prefer to teach. Click on a day to toggle it. The system will try to schedule your classes on these days when possible.',
      placement: 'top',
      showOn: 'all',
    },
    {
      target: '#preferred-time-card',
      title: 'Preferred Time Range',
      description: 'Set your preferred start and end times for teaching. Choose times when you are most available for classes.',
      placement: 'top',
      showOn: 'all',
    },
    {
      target: '#save-preferences-btn',
      title: 'Save Your Preferences',
      description: 'Important! Click this button to save your changes. Your preferences will not be applied until you save them.',
      placement: 'bottom',
      showOn: 'all',
    },
  ];

  const handleTourFinish = () => {
    if (session?.user?.id) {
      localStorage.setItem(`ptc-preferences-tour-completed-${session.user.id}`, 'true');
    }
    setShowTour(false);
  };

  const handleTourClose = () => {
    setShowTour(false);
  };

  useEffect(() => {
    if (session?.user?.id) {
      fetchData();
    }
  }, [session?.user?.id]);

  // Handle conflict resolution context - admin editing another faculty's preferences
  useEffect(() => {
    if (!loading && conflictResolutionContext) {
      const { editPreferencesFor } = conflictResolutionContext;
      
      if (editPreferencesFor && editPreferencesFor !== session?.user?.id) {
        // Admin is editing another faculty's preferences
        setEditingFacultyId(editPreferencesFor);
        fetchFacultyPreferences(editPreferencesFor);
        clearConflictResolutionContext();
        toast.info('Editing faculty preferences for conflict resolution');
      }
    }
  }, [loading, conflictResolutionContext]);

  const fetchData = async () => {
    try {
      // Fetch user data to get their department
      const userRes = await fetch(`/api/users/${session?.user?.id}`);
      const userData = await userRes.json();
      setUser(userData);

      if (userData.preferences) {
        setPreferences(userData.preferences);
        setFormData({
          preferredDays: userData.preferences.preferredDays || [],
          preferredTimeStart: userData.preferences.preferredTimeStart || '08:00',
          preferredTimeEnd: userData.preferences.preferredTimeEnd || '17:00',
          unavailableDays: userData.preferences.unavailableDays || [],
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load preferences');
    } finally {
      setLoading(false);
    }
  };

  // Fetch another faculty's preferences (admin mode)
  const fetchFacultyPreferences = async (facultyId: string) => {
    try {
      const userRes = await fetch(`/api/users/${facultyId}`);
      const userData = await userRes.json();
      setUser(userData);

      if (userData.preferences) {
        setPreferences(userData.preferences);
        setFormData({
          preferredDays: userData.preferences.preferredDays || [],
          preferredTimeStart: userData.preferences.preferredTimeStart || '08:00',
          preferredTimeEnd: userData.preferences.preferredTimeEnd || '17:00',
          unavailableDays: userData.preferences.unavailableDays || [],
        });
      } else {
        // Reset form if no preferences exist
        setFormData({
          preferredDays: [],
          preferredTimeStart: '08:00',
          preferredTimeEnd: '17:00',
          unavailableDays: [],
        });
      }
    } catch (error) {
      console.error('Error fetching faculty preferences:', error);
      toast.error('Failed to load faculty preferences');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Use editingFacultyId if set (admin mode), otherwise use current user's id
      const facultyIdToSave = editingFacultyId || session?.user?.id;
      
      const res = await fetch('/api/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facultyId: facultyIdToSave,
          ...formData,
        }),
      });

      if (res.ok) {
        toast.success(editingFacultyId 
          ? 'Faculty preferences saved successfully' 
          : 'Preferences saved successfully');
        // Clear admin mode after saving
        if (editingFacultyId) {
          setEditingFacultyId(null);
        }
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to save preferences');
      }
    } catch {
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (day: string) => {
    setFormData(prev => ({
      ...prev,
      preferredDays: prev.preferredDays.includes(day)
        ? prev.preferredDays.filter(d => d !== day)
        : [...prev.preferredDays, day],
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Settings className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6 max-w-4xl mx-auto"
      >
        {/* Header */}
        <div id="preferences-header" className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-600">My Preferences</h1>
            <div className="h-1 w-20 mt-1 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600" />
            <p className="text-muted-foreground mt-1">
              Set your scheduling preferences for better schedule allocation
            </p>
          </div>
          <Button id="save-preferences-btn" onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Preferences
              </>
            )}
          </Button>
        </div>

        {/* Department Warning */}
        {!user?.departmentId && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>No Department Assigned:</strong> You have not been assigned to a department yet. 
              Please contact an administrator to assign you to a department before you can be scheduled for classes.
            </AlertDescription>
          </Alert>
        )}

        {/* Current Status */}
        <Card id="preferences-status" className="border-primary/20 bg-primary/5 preference-section-card">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-primary/10">
              <CheckCircle className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-medium">Preference Status</p>
              <p className="text-sm text-muted-foreground">
                {user?.department ? (
                  <>
                    Department: <strong>{user.department.name}</strong>
                    {user.department.code && ` (${user.department.code})`} • {' '}
                    {preferences
                      ? 'Your preferences are saved and will be considered during schedule generation.'
                      : 'Set your preferences to get schedules that match your availability.'}
                  </>
                ) : (
                  'No department assigned. Please contact an administrator.'
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Preferred Days */}
        <Card id="preferred-days-card" className="preference-section-card hover:shadow-md transition-all duration-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Preferred Teaching Days
            </CardTitle>
            <CardDescription>
              Select the days you prefer to teach
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {DAYS.map((day) => (
                <div
                  key={day}
                  className={`flex items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    formData.preferredDays.includes(day)
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-muted hover:border-primary/50'
                  }`}
                  onClick={() => toggleDay(day)}
                >
                  <span className="text-sm font-medium">{day.slice(0, 3)}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Selected: {formData.preferredDays.length} day(s)
            </p>
          </CardContent>
        </Card>

        {/* Preferred Time */}
        <Card id="preferred-time-card" className="preference-section-card hover:shadow-md transition-all duration-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Preferred Time Range
            </CardTitle>
            <CardDescription>
              Set your preferred teaching hours
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Select
                  value={formData.preferredTimeStart}
                  onValueChange={(value) =>
                    setFormData(prev => ({ ...prev, preferredTimeStart: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map((time) => (
                      <SelectItem key={time.value} value={time.value}>{time.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Select
                  value={formData.preferredTimeEnd}
                  onValueChange={(value) =>
                    setFormData(prev => ({ ...prev, preferredTimeEnd: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map((time) => (
                      <SelectItem key={time.value} value={time.value}>{time.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {formatTimeRange(formData.preferredTimeStart, formData.preferredTimeEnd)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      </motion.div>

      {/* Preferences Tour */}
      <Tour
        steps={preferencesTourSteps}
        open={showTour}
        onClose={handleTourClose}
        onFinish={handleTourFinish}
      />
    </>
  );
}
