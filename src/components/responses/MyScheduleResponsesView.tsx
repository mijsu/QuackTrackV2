'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Tour, type TourStep } from '@/components/ui/tour';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  MessageSquareWarning,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  User,
  MapPin,
  BookOpen,
  Users,
  RefreshCw,
  AlertCircle,
  Send,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { formatTime12Hour, formatTimeRange } from '@/lib/utils';

type Schedule = {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  subject: {
    subjectCode: string;
    subjectName: string;
    units: number;
  } | null;
  section: {
    sectionName: string;
    yearLevel: number;
  } | null;
  room: {
    roomName: string;
    building: string;
  } | null;
};

type ScheduleResponse = {
  id: string;
  scheduleId: string;
  status: 'pending' | 'accepted' | 'rejected';
  reason: string | null;
  respondedAt: string | null;
  schedule: Schedule;
};

export function MyScheduleResponsesView() {
  const { data: session } = useSession();
  const [pendingSchedules, setPendingSchedules] = useState<Schedule[]>([]);
  const [myResponses, setMyResponses] = useState<ScheduleResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'responded'>('pending');
  const [showTour, setShowTour] = useState(false);

  // Tour steps for My Schedule Responses page
  const scheduleResponsesTourSteps: TourStep[] = [
    {
      target: '#responses-header',
      title: 'Schedule Responses',
      description: 'This is where you can review and respond to schedule assignments. You can accept or reject schedules assigned to you.',
      placement: 'bottom',
      showOn: 'all',
    },
    {
      target: '#responses-stats-cards',
      title: 'Response Statistics',
      description: 'View your pending, accepted, and rejected schedule counts at a glance. Pending schedules require your action.',
      placement: 'bottom',
      showOn: 'all',
    },
    {
      target: '#responses-tabs',
      title: 'Switch Views',
      description: 'Use these tabs to switch between Pending schedules (waiting for your response) and Responded schedules (your previous responses).',
      placement: 'bottom',
      showOn: 'all',
    },
    {
      target: '#responses-pending-list',
      title: 'Pending Schedules',
      description: 'Review each schedule assignment here. You can see the subject, time, room, and section details. Click Accept or Reject to respond.',
      placement: 'top',
      showOn: 'all',
    },
    {
      target: '#responses-action-buttons',
      title: 'Take Action',
      description: 'Accept the schedule to confirm your assignment, or reject it with a reason. Rejections will be reviewed by the admin.',
      placement: 'bottom',
      offset: { y: 10 },
      showOn: 'desktop',
    },
    {
      target: '#responses-action-buttons-mobile',
      title: 'Take Action',
      description: 'Accept the schedule to confirm your assignment, or reject it with a reason. Rejections will be reviewed by the admin.',
      placement: 'bottom',
      offset: { y: 10 },
      showOn: 'mobile',
    },
  ];

  // Check if user has seen the tour for this page
  useEffect(() => {
    if (session?.user?.id) {
      const hasSeenTour = localStorage.getItem(`ptc-responses-tour-completed-${session.user.id}`);
      if (!hasSeenTour) {
        // Small delay to ensure DOM is ready
        const timer = setTimeout(() => setShowTour(true), 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [session?.user?.id]);

  const handleTourFinish = () => {
    if (session?.user?.id) {
      localStorage.setItem(`ptc-responses-tour-completed-${session.user.id}`, 'true');
    }
    setShowTour(false);
  };

  const handleTourClose = () => {
    setShowTour(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [pendingRes, responsesRes] = await Promise.all([
        fetch('/api/schedule-responses/pending'),
        fetch('/api/schedule-responses'),
      ]);

      const pendingData = await pendingRes.json();
      const responsesData = await responsesRes.json();

      setPendingSchedules(Array.isArray(pendingData) ? pendingData : []);
      setMyResponses(Array.isArray(responsesData) ? responsesData : []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch schedule data');
      setPendingSchedules([]);
      setMyResponses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (scheduleId: string) => {
    try {
      setSubmitting(true);
      const res = await fetch('/api/schedule-responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduleId,
          status: 'accepted',
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success('Schedule accepted successfully!');
        fetchData();
      } else {
        toast.error(data.error || 'Failed to accept schedule');
      }
    } catch (error) {
      console.error('Error accepting schedule:', error);
      toast.error('Failed to accept schedule');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedSchedule) return;
    
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/schedule-responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduleId: selectedSchedule.id,
          status: 'rejected',
          reason: rejectionReason.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success('Schedule rejected. The admin will be notified.');
        setShowRejectDialog(false);
        setSelectedSchedule(null);
        setRejectionReason('');
        fetchData();
      } else {
        toast.error(data.error || 'Failed to reject schedule');
      }
    } catch (error) {
      console.error('Error rejecting schedule:', error);
      toast.error('Failed to reject schedule');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Accepted</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Rejected</Badge>;
      default:
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Pending</Badge>;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div id="responses-header" className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <MessageSquareWarning className="h-8 w-8 text-primary" />
            My Schedule Responses
          </h1>
          <p className="text-muted-foreground">
            Review and respond to your schedule assignments
          </p>
        </div>
        <Button variant="outline" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div id="responses-stats-cards" className="grid grid-cols-3 gap-2 sm:gap-4">
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Pending</p>
                <p className="text-xl sm:text-2xl font-bold text-amber-500">{pendingSchedules.length}</p>
              </div>
              <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Accepted</p>
                <p className="text-xl sm:text-2xl font-bold text-emerald-500">
                  {myResponses.filter((r) => r.status === 'accepted').length}
                </p>
              </div>
              <CheckCircle2 className="h-6 w-6 sm:h-8 sm:w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Rejected</p>
                <p className="text-xl sm:text-2xl font-bold text-red-500">
                  {myResponses.filter((r) => r.status === 'rejected').length}
                </p>
              </div>
              <XCircle className="h-6 w-6 sm:h-8 sm:w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div id="responses-tabs" className="flex gap-2">
        <Button
          variant={activeTab === 'pending' ? 'default' : 'outline'}
          onClick={() => setActiveTab('pending')}
          className="relative"
        >
          <Clock className="h-4 w-4 mr-2" />
          Pending
          {pendingSchedules.length > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] text-white">
              {pendingSchedules.length}
            </span>
          )}
        </Button>
        <Button
          variant={activeTab === 'responded' ? 'default' : 'outline'}
          onClick={() => setActiveTab('responded')}
        >
          <CheckCircle2 className="h-4 w-4 mr-2" />
          Responded
        </Button>
      </div>

      {/* Content */}
      {activeTab === 'pending' ? (
        <Card id="responses-pending-list">
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Pending Schedules</CardTitle>
            <CardDescription className="text-[10px] sm:text-sm">
              Schedules waiting for your response. Please review and accept or reject them.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : pendingSchedules.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-emerald-500/10 p-4 mb-4">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                </div>
                <p className="font-medium">All schedules responded!</p>
                <p className="text-sm text-muted-foreground">
                  You have no pending schedule responses
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[500px] pr-4">
                <AnimatePresence>
                  <div className="space-y-2 sm:space-y-3">
                    {pendingSchedules.map((schedule, index) => (
                      <motion.div
                        key={schedule.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="p-2 sm:p-4 rounded-lg border bg-card"
                      >
                        <div className="flex items-center justify-between gap-2 sm:gap-4">
                          <div className="flex-1 min-w-0 space-y-0.5 sm:space-y-2">
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <p className="font-medium text-xs sm:text-lg truncate">
                                {schedule.subject?.subjectName || 'Unknown Subject'}
                              </p>
                              <Badge variant="outline" className="text-[9px] sm:text-xs shrink-0">{schedule.subject?.subjectCode}</Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-4 text-[10px] sm:text-sm text-muted-foreground">
                              <span className="flex items-center gap-0.5 sm:gap-1">
                                <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                                {schedule.day}
                              </span>
                              <span className="flex items-center gap-0.5 sm:gap-1">
                                <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                                {formatTimeRange(schedule.startTime, schedule.endTime)}
                              </span>
                              <span className="flex items-center gap-0.5 sm:gap-1">
                                <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
                                {schedule.room?.roomName || 'TBA'}
                              </span>
                              <span className="flex items-center gap-0.5 sm:gap-1">
                                <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                                {schedule.section?.sectionName || 'TBA'}
                              </span>
                            </div>
                            <div className="text-[10px] sm:text-sm text-muted-foreground">
                              <span className="font-medium">{schedule.subject?.units || 0} units</span>
                              {' • '}
                              {schedule.room?.building || 'Building TBA'}
                            </div>
                          </div>
                          <div
                            id={index === 0 ? 'responses-action-buttons' : undefined}
                            className="hidden sm:flex sm:flex-row sm:gap-2 shrink-0"
                          >
                            <Button
                              variant="default"
                              size="sm"
                              className="bg-emerald-500 hover:bg-emerald-600 h-9 px-4 text-sm"
                              onClick={() => handleAccept(schedule.id)}
                              disabled={submitting}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Accept
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="h-9 px-4 text-sm"
                              onClick={() => {
                                setSelectedSchedule(schedule);
                                setShowRejectDialog(true);
                              }}
                              disabled={submitting}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Reject
                            </Button>
                          </div>
                          {/* Mobile buttons */}
                          <div
                            id={index === 0 ? 'responses-action-buttons-mobile' : undefined}
                            className="flex flex-col gap-1.5 sm:hidden shrink-0"
                          >
                            <Button
                              variant="default"
                              size="sm"
                              className="bg-emerald-500 hover:bg-emerald-600 h-7 px-2 text-[11px]"
                              onClick={() => handleAccept(schedule.id)}
                              disabled={submitting}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                              Accept
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="h-7 px-2 text-[11px]"
                              onClick={() => {
                                setSelectedSchedule(schedule);
                                setShowRejectDialog(true);
                              }}
                              disabled={submitting}
                            >
                              <XCircle className="h-3.5 w-3.5 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </AnimatePresence>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Responded Schedules</CardTitle>
            <CardDescription className="text-[10px] sm:text-sm">
              Your previous responses to schedule assignments
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : myResponses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <MessageSquareWarning className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="font-medium">No responses yet</p>
                <p className="text-sm text-muted-foreground">
                  Your schedule responses will appear here
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[500px] pr-4">
                <AnimatePresence>
                  <div className="space-y-2 sm:space-y-3">
                    {myResponses.map((response, index) => (
                      <motion.div
                        key={response.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="p-2 sm:p-4 rounded-lg border bg-card"
                      >
                        <div className="flex items-center justify-between gap-2 sm:gap-4">
                          <div className="flex-1 min-w-0 space-y-0.5 sm:space-y-2">
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <p className="font-medium text-xs sm:text-base truncate">
                                {response.schedule.subject?.subjectName || 'Unknown Subject'}
                              </p>
                              {getStatusBadge(response.status)}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-4 text-[10px] sm:text-sm text-muted-foreground">
                              <span className="flex items-center gap-0.5 sm:gap-1">
                                <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                                {response.schedule.day}
                              </span>
                              <span className="flex items-center gap-0.5 sm:gap-1">
                                <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                                {formatTimeRange(response.schedule.startTime, response.schedule.endTime)}
                              </span>
                              <span className="flex items-center gap-0.5 sm:gap-1">
                                <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
                                {response.schedule.room?.roomName || 'TBA'}
                              </span>
                            </div>
                            {response.status === 'rejected' && response.reason && (
                              <div className="flex items-start gap-1 sm:gap-2 text-[10px] sm:text-sm text-red-500 mt-1">
                                <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 shrink-0 mt-0.5" />
                                <span>Reason: {response.reason}</span>
                              </div>
                            )}
                            {response.respondedAt && (
                              <p className="text-[9px] sm:text-xs text-muted-foreground">
                                Responded on {new Date(response.respondedAt).toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </AnimatePresence>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <XCircle className="h-5 w-5" />
              Reject Schedule
            </DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this schedule. This will be sent to the admin for review.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedSchedule && (
              <div className="p-3 bg-muted rounded-lg text-sm">
                <p className="font-medium">{selectedSchedule.subject?.subjectName}</p>
                <p className="text-muted-foreground">
                  {selectedSchedule.day} • {formatTimeRange(selectedSchedule.startTime, selectedSchedule.endTime)}
                </p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium">Reason for rejection *</label>
              <Textarea
                placeholder="Please explain why you cannot accept this schedule..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="mt-2"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={submitting || !rejectionReason.trim()}
            >
              {submitting ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Submit Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Responses Tour */}
      <Tour
        steps={scheduleResponsesTourSteps}
        open={showTour}
        onClose={handleTourClose}
        onFinish={handleTourFinish}
      />
    </motion.div>
  );
}
