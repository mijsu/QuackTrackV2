'use client'

import { useMemo, useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api, extractArray } from '@/lib/api'
import { useAppStore } from '@/store/app-store'
import { canPerformAction } from '@/lib/roles'
import {
  Users,
  Calendar,
  AlertTriangle,
  Zap,
  Clock,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Megaphone,
  BookOpen,
  Eye,
  GraduationCap,
  Loader2,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { ScheduleSummaryModal } from './schedule-summary-modal'
import { formatTime12, formatSpecialization } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

// ─── Types ───────────────────────────────────────────────────────────────────

interface AnalyticsOverview {
  totalFaculty: number
  totalDepartments: number
  totalSubjects: number
  totalSections: number
  totalSchedules: number
}

interface FacultyWorkloadItem {
  id: string
  name: string
  uid: string
  department: string | null
  specialization: string | null
  maxUnits: number
  assignedUnits: number
  totalHours: number
  scheduleCount: number
  utilizationPercent: number
}

interface AnalyticsData {
  overview: AnalyticsOverview
  schedulesByStatus: { status: string; count: number }[]
  facultyWorkload: {
    distribution: FacultyWorkloadItem[]
    overloaded: number
    underloaded: number
    averageUtilization: number
  }
  conflictSummary: {
    byType: { type: string; severity: string; count: number }[]
    totalUnresolved: number
    totalResolved: number
  }
  scheduleVersions: { status: string; count: number }[]
  recentActivity: {
    schedules: unknown[]
    auditLogs: unknown[]
  }
}

interface ScheduleVersionItem {
  id: string
  name: string
  description: string | null
  semester: string
  academicYear: string
  status: string
  createdAt: string
  publisher: { id: string; name: string; uid: string } | null
  _count: { schedules: number }
}

interface AnnouncementItem {
  id: string
  title: string
  content: string
  priority: string
  isActive: boolean
  createdAt: string
  author: { id: string; name: string; uid: string } | null
}

// ─── Custom Tooltip for Charts ───────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
      <p className="font-mono text-sm text-foreground">{label}</p>
      <p className="font-mono text-sm text-[#10B981]">{payload[0].value}</p>
    </div>
  )
}

// ─── Status Badge ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, string> = {
    draft: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
    published: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50',
    archived: 'bg-slate-500/20 text-slate-400 border-slate-500/50',
    active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50',
  }
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-xs font-medium uppercase ${config[status] || 'bg-slate-500/20 text-slate-400 border-slate-500/50'}`}>
      {status}
    </span>
  )
}

// ─── Priority Badge ──────────────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: string }) {
  const config: Record<string, string> = {
    urgent: 'bg-red-500/20 text-red-400 border-red-500/50',
    high: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
    normal: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
    low: 'bg-slate-500/20 text-slate-400 border-slate-500/50',
  }
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider ${config[priority] || 'bg-slate-500/20 text-slate-400 border-slate-500/50'}`}>
      {priority}
    </span>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function DashboardView() {
  const { user, setCurrentView } = useAppStore()

  // ─── Schedule Summary Modal State ───────────────────────────────────────
  const [summaryVersionId, setSummaryVersionId] = useState<string | null>(null)
  const [summaryModalOpen, setSummaryModalOpen] = useState(false)

  // ─── Data Fetching ──────────────────────────────────────────────────────

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['analytics'],
    queryFn: async () => {
      const res = await api.get<AnalyticsData>('/analytics')
      return res.data
    },
  })

  const { data: versionsData, isLoading: versionsLoading } = useQuery({
    queryKey: ['schedule-versions', 'dashboard'],
    queryFn: async () => {
      const res = await api.get<{ data: ScheduleVersionItem[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>('/schedule-versions?limit=5')
      return res.data
    },
  })

  const { data: announcements, isLoading: announcementsLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const res = await api.get<AnnouncementItem[]>('/announcements')
      return res.data
    },
  })

  // ─── Faculty-specific data ────────────────────────────────────────────
  const isFacultyUser = user?.role === 'faculty'

  const { data: mySchedules, isLoading: mySchedulesLoading } = useQuery({
    queryKey: ['my-schedules', user?.id],
    queryFn: async () => {
      const res = await api.get<{ data: unknown[] }>(`/schedules?facultyId=${user?.id}`)
      return res.data
    },
    enabled: isFacultyUser,
  })

  const { data: myPreferences } = useQuery({
    queryKey: ['my-preferences', user?.id],
    queryFn: async () => {
      const res = await api.get<unknown>(`/preferences?userId=${user?.id}`)
      return res.data
    },
    enabled: isFacultyUser,
  })

  // ─── Derived Data ───────────────────────────────────────────────────────

  const analyticsData = analytics
  const versions = extractArray<ScheduleVersionItem>(versionsData)
  const announcementsList = extractArray<AnnouncementItem>(announcements)

  const activeSchedules = useMemo(() => {
    if (!analyticsData?.scheduleVersions) return 0
    const published = analyticsData.scheduleVersions.find(v => v.status === 'published')
    return published?.count ?? analyticsData.overview.totalSchedules
  }, [analyticsData])

  const facultyChartData = useMemo(() => {
    if (!analyticsData?.facultyWorkload?.distribution) return []
    return [...analyticsData.facultyWorkload.distribution]
      .sort((a, b) => b.assignedUnits - a.assignedUnits)
      .slice(0, 10)
      .map(f => ({
        name: f.name.length > 15 ? f.name.slice(0, 15) + '…' : f.name,
        units: f.assignedUnits,
        maxUnits: f.maxUnits,
      }))
  }, [analyticsData])

  // ─── Current Date/Time ─────────────────────────────────────────────────

  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

  // ─── Change Indicators (simulated) ─────────────────────────────────────

  const statsCards = useMemo(() => {
    if (!analyticsData) return []
    return [
      {
        label: 'Total Faculty',
        value: analyticsData.overview.totalFaculty,
        icon: Users,
        change: '',
        trend: 'neutral' as 'up' | 'down' | 'neutral',
        color: '#10B981',
      },
      {
        label: 'Active Schedules',
        value: activeSchedules,
        icon: Calendar,
        change: '',
        trend: 'neutral' as 'up' | 'down' | 'neutral',
        color: '#10B981',
      },
      {
        label: 'Conflicts Detected',
        value: analyticsData.conflictSummary.totalUnresolved,
        icon: AlertTriangle,
        change: '',
        trend: 'neutral' as 'up' | 'down' | 'neutral',
        color: analyticsData.conflictSummary.totalUnresolved > 0 ? '#EF4444' : '#10B981',
      },
      {
        label: 'Total Subjects',
        value: analyticsData.overview.totalSubjects,
        icon: BookOpen,
        change: '',
        trend: 'neutral' as 'up' | 'down' | 'neutral',
        color: '#10B981',
      },
    ]
  }, [analyticsData, activeSchedules])

  // ─── Loading Skeleton ──────────────────────────────────────────────────

  if (analyticsLoading || versionsLoading || announcementsLoading) {
    return (
      <div className="space-y-6 min-w-0 w-full overflow-x-hidden">
        {/* Hero skeleton */}
        <div className="bg-card border border-border rounded-2xl p-8 animate-pulse">
          <div className="h-10 w-80 bg-secondary/50 rounded-lg mb-3" />
          <div className="h-5 w-48 bg-secondary/50 rounded-lg" />
        </div>
        {/* Stats skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 min-w-0">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-6 animate-pulse">
              <div className="h-10 w-10 bg-secondary/50 rounded-lg mb-4" />
              <div className="h-8 w-20 bg-secondary/50 rounded-lg mb-2" />
              <div className="h-4 w-28 bg-secondary/50 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 min-w-0 w-full overflow-x-hidden">
      {/* ── Section 1: Hero Welcome ──────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-card border border-border rounded-2xl p-6 md:p-8">
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none" />
        {/* Radial glow */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#10B981]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-2">
            Welcome back,{' '}
            <span className="text-gradient-emerald">{user?.name || 'Admin'}</span>
          </h1>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground bg-[#10B981]/10 border border-[#10B981]/30 rounded-full px-3 py-1">
              {user?.role || 'admin'}
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground bg-secondary/50 border border-border rounded-full px-3 py-1">
              {user?.departmentId ? 'Department Assigned' : 'System Administrator'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="size-4" />
            <span className="font-mono text-sm">{dateStr}</span>
            <span className="text-foreground/30">|</span>
            <span className="font-mono text-sm text-[#10B981]">{timeStr}</span>
          </div>
        </div>
      </div>

      {isFacultyUser ? (
        /* ── Faculty Dashboard ──────────────────────────────────────────── */
        <>
          {/* Personal Stats Row */}
          <div className="grid grid-cols-3 gap-4 min-w-0">
            <div className="bg-card border border-border rounded-2xl p-5 transition-all duration-300 hover:border-[#10B981]/50 hover:shadow-[0_0_30px_-10px_rgba(16,185,129,0.2)]">
              <div className="bg-[#059669]/20 border border-[#059669]/50 rounded-lg p-2 w-fit mb-3">
                <Calendar className="size-4 text-[#059669]" />
              </div>
              <div className="font-mono text-2xl font-bold text-gradient-emerald mb-1">
                {mySchedulesLoading ? <Loader2 className="size-5 animate-spin text-muted-foreground" /> : extractArray<Record<string, unknown>>(mySchedules).length}
              </div>
              <div className="text-muted-foreground text-xs">My Classes</div>
            </div>
            <div className="bg-card border border-border rounded-2xl p-5 transition-all duration-300 hover:border-[#10B981]/50 hover:shadow-[0_0_30px_-10px_rgba(16,185,129,0.2)]">
              <div className="bg-[#059669]/20 border border-[#059669]/50 rounded-lg p-2 w-fit mb-3">
                <BookOpen className="size-4 text-[#059669]" />
              </div>
              <div className="font-mono text-2xl font-bold text-gradient-emerald mb-1">
                {mySchedulesLoading ? <Loader2 className="size-5 animate-spin text-muted-foreground" /> : (
                  extractArray<Record<string, unknown>>(mySchedules).reduce((sum: number, s: Record<string, unknown>) => sum + ((s.subject as Record<string, unknown>)?.units as number || 0), 0)
                )}
              </div>
              <div className="text-muted-foreground text-xs">My Units</div>
            </div>
            <div className="bg-card border border-border rounded-2xl p-5 transition-all duration-300 hover:border-[#10B981]/50 hover:shadow-[0_0_30px_-10px_rgba(16,185,129,0.2)]">
              <div className="bg-[#059669]/20 border border-[#059669]/50 rounded-lg p-2 w-fit mb-3">
                <TrendingUp className="size-4 text-[#059669]" />
              </div>
              <div className="font-mono text-2xl font-bold text-gradient-emerald mb-1">
                {mySchedulesLoading ? <Loader2 className="size-5 animate-spin text-muted-foreground" /> : (
                  (() => {
                    const assigned = extractArray<Record<string, unknown>>(mySchedules).reduce((sum: number, s: Record<string, unknown>) => sum + ((s.subject as Record<string, unknown>)?.units as number || 0), 0)
                    const max = user?.facultyType === 'masteral' ? 15 : 30
                    return `${Math.round((assigned / max) * 100)}%`
                  })()
                )}
              </div>
              <div className="text-muted-foreground text-xs">Utilization</div>
            </div>
          </div>

          {/* My Schedule + Quick Actions two-column */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-6 min-w-0">
            {/* Left: My Schedule */}
            <div className="lg:col-span-3 min-w-0 bg-card border border-border rounded-2xl p-4 md:p-6 transition-all duration-300 hover:border-[#10B981]/50 hover:shadow-[0_0_30px_-10px_rgba(16,185,129,0.2)]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="size-5 text-[#10B981]" />
                  <h2 className="font-heading font-bold text-lg text-foreground">My Schedule</h2>
                </div>
                <button
                  onClick={() => setCurrentView('schedules')}
                  className="flex items-center gap-1 text-[#10B981] hover:text-[#34D399] transition-colors font-mono text-xs uppercase tracking-wider"
                >
                  View Full
                  <ArrowRight className="size-3" />
                </button>
              </div>

              {mySchedulesLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="size-8 animate-spin text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">Loading your schedule…</p>
                </div>
              ) : (() => {
                const schedules = extractArray<Record<string, unknown>>(mySchedules)
                if (schedules.length === 0) {
                  return (
                    <div className="text-center py-8">
                      <Calendar className="size-10 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-muted-foreground text-sm">No classes assigned yet</p>
                      <p className="text-muted-foreground/60 text-xs mt-1">Your schedule will appear once generated</p>
                    </div>
                  )
                }
                const dayOrder = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
                const sorted = [...schedules].sort((a, b) => {
                  const da = dayOrder.indexOf(a.day as string)
                  const db = dayOrder.indexOf(b.day as string)
                  if (da !== db) return da - db
                  return (a.startTime as string).localeCompare(b.startTime as string)
                })
                return (
                  <div className="space-y-2">
                    {sorted.slice(0, 8).map((s: Record<string, unknown>) => {
                      const subj = s.subject as Record<string, unknown> | undefined
                      const sec = s.section as Record<string, unknown> | undefined
                      return (
                        <div key={s.id as string} className="flex items-center gap-3 p-2.5 rounded-xl bg-secondary/20 border border-border/50 hover:bg-secondary/40 transition-colors">
                          <div className="shrink-0 w-12 text-center">
                            <div className="font-mono text-[10px] font-bold text-[#10B981] uppercase leading-tight">{String(s.day).slice(0, 3)}</div>
                          </div>
                          <div className="shrink-0 w-16 text-center">
                            <span className="font-mono text-[10px] text-muted-foreground">{formatTime12(s.startTime as string)} - {formatTime12(s.endTime as string)}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-foreground truncate">{subj?.subjectName as string || subj?.subjectCode as string}</div>
                            <div className="text-[10px] text-muted-foreground truncate">{sec?.sectionName as string}{sec?.program ? ` — ${(sec.program as Record<string, string>).code}` : ''}</div>
                          </div>
                          <Badge variant="outline" className="shrink-0 text-[10px] font-mono h-5 px-1.5">{subj?.units as string} units</Badge>
                        </div>
                      )
                    })}
                    {schedules.length > 8 && (
                      <button
                        onClick={() => setCurrentView('schedules')}
                        className="w-full text-center py-2 text-[10px] font-mono uppercase tracking-wider text-[#10B981] hover:text-[#34D399] transition-colors"
                      >
                        +{schedules.length - 8} more classes
                      </button>
                    )}
                  </div>
                )
              })()}
            </div>

            {/* Right: Quick Actions */}
            <div className="lg:col-span-2 min-w-0 bg-card border border-border rounded-2xl p-4 md:p-6 transition-all duration-300 hover:border-[#10B981]/50 hover:shadow-[0_0_30px_-10px_rgba(16,185,129,0.2)]">
              <div className="flex items-center gap-2 mb-6">
                <Zap className="size-5 text-[#10B981]" />
                <h2 className="font-heading font-bold text-lg text-foreground">Quick Actions</h2>
              </div>
              <div className="space-y-3">
                <button
                  onClick={() => setCurrentView('schedules')}
                  className="w-full flex items-center gap-2 border border-border bg-secondary/30 text-foreground font-heading font-medium text-sm py-2.5 px-4 rounded-xl transition-all duration-300 hover:border-[#10B981]/50 hover:bg-[#10B981]/5 hover:-translate-y-0.5"
                >
                  <Calendar className="size-4 text-[#10B981]" />
                  View My Schedule
                </button>
                <button
                  onClick={() => setCurrentView('preferences')}
                  className="w-full flex items-center gap-2 border border-border bg-secondary/30 text-foreground font-heading font-medium text-sm py-2.5 px-4 rounded-xl transition-all duration-300 hover:border-[#10B981]/50 hover:bg-[#10B981]/5 hover:-translate-y-0.5"
                >
                  <Clock className="size-4 text-[#10B981]" />
                  Preferences
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* ── Admin Dashboard ─────────────────────────────────────────────── */
        <>
          {/* ── Section 2: Stats Grid ───────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 min-w-0">
            {statsCards.map((stat) => {
              const Icon = stat.icon
              return (
                <div
                  key={stat.label}
                  className="bg-card border border-border rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#10B981]/50 hover:shadow-[0_0_30px_-10px_rgba(16,185,129,0.2)]"
                >
                  <div className="bg-[#059669]/20 border border-[#059669]/50 rounded-lg p-2 w-fit mb-4">
                    <Icon className="size-5 text-[#059669]" />
                  </div>
                  <div className="font-mono text-3xl font-bold text-gradient-emerald mb-1">
                    {stat.value}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">{stat.label}</span>
                    <span className={`font-mono text-xs flex items-center gap-0.5 ${
                      stat.trend === 'up'
                        ? stat.label === 'Conflicts Detected'
                          ? 'text-red-400'
                          : 'text-emerald-400'
                        : stat.trend === 'down'
                          ? 'text-red-400'
                          : 'text-muted-foreground'
                    }`}>
                      {stat.trend === 'up' ? (
                        <TrendingUp className="size-3" />
                      ) : stat.trend === 'down' ? (
                        <TrendingDown className="size-3" />
                      ) : (
                        <Minus className="size-3" />
                      )}
                      {stat.change}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* ── Section 3: Two-column Layout ────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-6 min-w-0">
            {/* Left: Schedule Overview (3 cols) */}
            <div className="lg:col-span-3 min-w-0 bg-card border border-border rounded-2xl p-4 md:p-6 transition-all duration-300 hover:border-[#10B981]/50 hover:shadow-[0_0_30px_-10px_rgba(16,185,129,0.2)]">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <BookOpen className="size-5 text-[#10B981]" />
                  <h2 className="font-heading font-bold text-lg text-foreground">Schedule Overview</h2>
                </div>
                <button
                  onClick={() => setCurrentView('schedules')}
                  className="flex items-center gap-1 text-[#10B981] hover:text-[#34D399] transition-colors font-mono text-xs uppercase tracking-wider"
                >
                  View All
                  <ArrowRight className="size-3" />
                </button>
              </div>

              {versions.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="size-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">No schedule versions yet</p>
                  <p className="text-muted-foreground/60 text-xs mt-1">Generate your first schedule to get started</p>
                </div>
              ) : (
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left font-mono text-xs uppercase tracking-wider text-muted-foreground pb-3 pr-4">Name</th>
                        <th className="text-left font-mono text-xs uppercase tracking-wider text-muted-foreground pb-3 pr-4">Semester</th>
                        <th className="text-left font-mono text-xs uppercase tracking-wider text-muted-foreground pb-3 pr-4">Status</th>
                        <th className="text-left font-mono text-xs uppercase tracking-wider text-muted-foreground pb-3 pr-4">Academic Year</th>
                        <th className="text-right font-mono text-xs uppercase tracking-wider text-muted-foreground pb-3">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {versions.map((v) => (
                        <tr
                          key={v.id}
                          onClick={() => {
                            setSummaryVersionId(v.id)
                            setSummaryModalOpen(true)
                          }}
                          className="border-b border-border hover:bg-secondary/30 transition-colors cursor-pointer"
                        >
                          <td className="py-3 pr-4">
                            <span className="text-foreground text-sm font-medium">{v.name}</span>
                            <span className="block text-muted-foreground text-xs font-mono">{v._count.schedules} schedules</span>
                          </td>
                          <td className="py-3 pr-4 font-mono text-sm text-muted-foreground">{v.semester}</td>
                          <td className="py-3 pr-4"><StatusBadge status={v.status} /></td>
                          <td className="py-3 font-mono text-sm text-muted-foreground">{v.academicYear}</td>
                          <td className="py-3 pl-4 text-right">
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-[#10B981] hover:text-[#34D399] transition-colors">
                              <Eye className="size-3" />
                              Details
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Right: Quick Actions (2 cols) */}
            <div className="lg:col-span-2 min-w-0 bg-card border border-border rounded-2xl p-4 md:p-6 transition-all duration-300 hover:border-[#10B981]/50 hover:shadow-[0_0_30px_-10px_rgba(16,185,129,0.2)]">
              <div className="flex items-center gap-2 mb-6">
                <Zap className="size-5 text-[#10B981]" />
                <h2 className="font-heading font-bold text-lg text-foreground">Quick Actions</h2>
              </div>

              <div className="space-y-3">
                {/* Generate Schedule - Primary action */}
                {canPerformAction(user?.role, 'generateSchedule') && (
                  <button
                    onClick={() => setCurrentView('generate')}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#059669] to-[#10B981] text-white font-heading font-bold text-sm py-3 px-4 rounded-xl transition-all duration-300 hover:shadow-[0_0_20px_-5px_rgba(16,185,129,0.5)] hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <Zap className="size-4" />
                    Generate Schedule
                  </button>
                )}

                {/* Outline actions */}
                <button
                  onClick={() => setCurrentView('conflicts')}
                  className="w-full flex items-center gap-2 border border-border bg-secondary/30 text-foreground font-heading font-medium text-sm py-2.5 px-4 rounded-xl transition-all duration-300 hover:border-[#10B981]/50 hover:bg-[#10B981]/5 hover:-translate-y-0.5"
                >
                  <AlertTriangle className="size-4 text-[#10B981]" />
                  View Conflicts
                </button>

                {canPerformAction(user?.role, 'viewFaculty') && (
                  <button
                    onClick={() => setCurrentView('faculty')}
                    className="w-full flex items-center gap-2 border border-border bg-secondary/30 text-foreground font-heading font-medium text-sm py-2.5 px-4 rounded-xl transition-all duration-300 hover:border-[#10B981]/50 hover:bg-[#10B981]/5 hover:-translate-y-0.5"
                  >
                    <Users className="size-4 text-[#10B981]" />
                    Manage Faculty
                  </button>
                )}

                <button
                  onClick={() => setCurrentView('preferences')}
                  className="w-full flex items-center gap-2 border border-border bg-secondary/30 text-foreground font-heading font-medium text-sm py-2.5 px-4 rounded-xl transition-all duration-300 hover:border-[#10B981]/50 hover:bg-[#10B981]/5 hover:-translate-y-0.5"
                >
                  <Clock className="size-4 text-[#10B981]" />
                  Preferences
                </button>
              </div>
            </div>
          </div>

          {/* ── Section 5: Faculty Workload Distribution (Chart) ────────────── */}
          <div className="bg-card border border-border rounded-2xl p-4 md:p-6 min-w-0 transition-all duration-300 hover:border-[#10B981]/50 hover:shadow-[0_0_30px_-10px_rgba(16,185,129,0.2)]">
            <div className="flex items-center gap-2 mb-6">
              <Users className="size-5 text-[#10B981]" />
              <h2 className="font-heading font-bold text-lg text-foreground">Faculty Workload Distribution</h2>
              <span className="ml-auto font-mono text-xs text-muted-foreground">Top 10 by Assigned Units</span>
            </div>

            {facultyChartData.length === 0 ? (
              <div className="text-center py-12">
                <Users className="size-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">No faculty workload data available</p>
              </div>
            ) : (
              <div className="h-80 min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={facultyChartData} margin={{ top: 5, right: 10, left: 0, bottom: 60 }}>
                    <XAxis
                      dataKey="name"
                      tick={{ fill: '#94A3B8', fontSize: 11 }}
                      tickLine={false}
                      axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                      angle={-35}
                      textAnchor="end"
                      interval={0}
                    />
                    <YAxis
                      tick={{ fill: '#94A3B8', fontSize: 11 }}
                      tickLine={false}
                      axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                      tickFormatter={(v: number) => `${v}`}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(16,185,129,0.08)' }} />
                    <Bar dataKey="units" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Announcements (common) ──────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Megaphone className="size-5 text-[#10B981]" />
          <h2 className="font-heading font-bold text-lg text-foreground">Announcements</h2>
        </div>

        {announcementsList.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-8 text-center">
            <Megaphone className="size-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No announcements at this time</p>
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pt-2 pb-3 custom-scrollbar snap-x snap-mandatory min-w-0">
            {announcementsList.map((a) => (
              <div
                key={a.id}
                className="min-w-[260px] sm:min-w-[300px] max-w-[360px] snap-start bg-card border border-border rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#10B981]/50 hover:shadow-[0_0_30px_-10px_rgba(16,185,129,0.2)] flex-shrink-0"
              >
                <div className="flex items-center justify-between mb-3">
                  <PriorityBadge priority={a.priority} />
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                <h3 className="font-heading font-bold text-foreground text-sm mb-2 line-clamp-1">{a.title}</h3>
                <p className="text-muted-foreground text-xs leading-relaxed line-clamp-3">{a.content}</p>
                {a.author && (
                  <p className="mt-3 font-mono text-[10px] text-muted-foreground/60">
                    by {a.author.name}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Schedule Summary Modal */}
      {summaryVersionId && (
        <ScheduleSummaryModal
          open={summaryModalOpen}
          onOpenChange={(open) => {
            setSummaryModalOpen(open)
            if (!open) setSummaryVersionId(null)
          }}
          versionId={summaryVersionId}
        />
      )}

    </div>
  )
}
