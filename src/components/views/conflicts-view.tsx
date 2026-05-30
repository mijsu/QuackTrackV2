'use client'

import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, apiThrow, extractArray } from '@/lib/api'
import { useAppStore } from '@/store/app-store'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertTriangle,
  ShieldAlert,
  AlertCircle,
  CheckCircle2,
  Search,
  Loader2,
  Users,
  Layers,
  GraduationCap,
} from 'lucide-react'
import { formatTime12 } from '@/lib/utils'
import { canPerformAction } from '@/lib/roles'

// --- Types ---
interface ConflictItem {
  id: string
  type: string
  severity: string
  scheduleId1: string
  scheduleId2: string | null
  details: string | null
  isResolved: boolean
  resolvedAt: string | null
  createdAt: string
  schedule1: {
    id: string
    day: string
    startTime: string
    endTime: string
    subject: { subjectCode: string; subjectName: string }
    faculty: { id: string; name: string }
    section: { sectionName: string }
  }
  schedule2: {
    id: string
    day: string
    startTime: string
    endTime: string
    subject: { subjectCode: string; subjectName: string }
    faculty: { id: string; name: string }
    section: { sectionName: string }
  } | null
}

interface ScheduleVersion {
  id: string
  name: string
  status: string
  semester: string
  academicYear: string
  _count?: { schedules: number }
}

// --- Conflict Type Config ---
const CONFLICT_TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; badgeClass: string }> = {
  faculty_overload: {
    label: 'Faculty Overload',
    icon: <Users className="size-3" />,
    badgeClass: 'bg-red-500/10 text-red-400 border-red-500/20',
  },
  invalid_merge: {
    label: 'Invalid Merge',
    icon: <AlertTriangle className="size-3" />,
    badgeClass: 'bg-red-500/10 text-red-400 border-red-500/20',
  },
  merge_limit_exceeded: {
    label: 'Merge Limit Exceeded',
    icon: <AlertTriangle className="size-3" />,
    badgeClass: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  },
}

function SeverityBadge({ severity }: { severity: string }) {
  const config: Record<string, { icon: React.ReactNode; className: string }> = {
    error: {
      icon: <ShieldAlert className="size-3" />,
      className: 'bg-red-500/10 text-red-400 border-red-500/20',
    },
    warning: {
      icon: <AlertCircle className="size-3" />,
      className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    },
  }
  const cfg = config[severity] || config.warning
  return (
    <Badge className={`${cfg.className} border text-[10px] uppercase tracking-wider flex items-center gap-1`}>
      {cfg.icon}
      {severity}
    </Badge>
  )
}

function ConflictTypeBadge({ type }: { type: string }) {
  const cfg = CONFLICT_TYPE_CONFIG[type] || {
    label: type,
    icon: <AlertTriangle className="size-3" />,
    badgeClass: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  }
  return (
    <Badge className={`${cfg.badgeClass} border text-[10px] uppercase tracking-wider flex items-center gap-1`}>
      {cfg.icon}
      {cfg.label}
    </Badge>
  )
}

// --- Stat Card ---
function StatCard({
  icon,
  label,
  value,
  colorClass,
}: {
  icon: React.ReactNode
  label: string
  value: number
  colorClass: string
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
      <div className={`p-2.5 rounded-xl ${colorClass}`}>
        {icon}
      </div>
      <div>
        <div className="font-mono text-2xl font-bold text-foreground">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  )
}

// --- Main Component ---
export function ConflictsView() {
  const queryClient = useQueryClient()
  const { selectedScheduleVersionId, setSelectedScheduleVersionId, user } = useAppStore()
  const [error, setError] = useState<string | null>(null)

  // Fetch schedule versions
  const { data: versionsData } = useQuery({
    queryKey: ['schedule-versions-conflicts'],
    queryFn: async () => {
      const res = await api.get<{ data: ScheduleVersion[]; pagination: { total: number } }>('/schedule-versions')
      return res.data
    },
  })
  const versions: ScheduleVersion[] = extractArray<ScheduleVersion>(versionsData)
  const currentVersionId = selectedScheduleVersionId || (versions.length > 0 ? versions[0].id : '')

  // Fetch conflicts
  const { data: conflictsData, isLoading: conflictsLoading } = useQuery({
    queryKey: ['conflicts', currentVersionId],
    queryFn: async () => {
      if (!currentVersionId) return null
      const res = await api.get<{ data: ConflictItem[]; pagination: { total: number } }>(
        `/conflicts?scheduleVersionId=${currentVersionId}&limit=100`
      )
      return res.data
    },
    enabled: !!currentVersionId,
  })
  const conflicts: ConflictItem[] = extractArray<ConflictItem>(conflictsData)

  // Stats
  const stats = useMemo(() => {
    const total = conflicts.length
    const errors = conflicts.filter(c => c.severity === 'error').length
    const warnings = conflicts.filter(c => c.severity === 'warning').length
    const resolved = conflicts.filter(c => c.isResolved).length
    return { total, errors, warnings, resolved }
  }, [conflicts])

  // Run detection mutation
  const detectMutation = useMutation({
    mutationFn: async () => {
      if (!currentVersionId) return null
      return apiThrow(api.post('/conflicts', { scheduleVersionId: currentVersionId }))
    },
    onSuccess: () => {
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['conflicts', currentVersionId] })
    },
    onError: (error: Error) => { console.error('Conflict detection failed:', error); setError(error.message || 'An unexpected error occurred') },
  })

  // Resolve conflict mutation
  const resolveMutation = useMutation({
    mutationFn: async (conflictId: string) => {
      return apiThrow(api.put(`/conflicts/${conflictId}`, { isResolved: true }))
    },
    onSuccess: () => {
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['conflicts', currentVersionId] })
    },
    onError: (error: Error) => { console.error('Resolve conflict failed:', error); setError(error.message || 'An unexpected error occurred') },
  })

  return (
    <div className="space-y-6">
      {/* Error Banner */}
      {error && (
        <div className="px-4 py-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center">
          {error}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-red-500/10">
            <AlertTriangle className="size-5 text-red-400" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">Conflicts</h1>
              {stats.total > 0 && (
                <Badge className="bg-red-500/10 text-red-400 border border-red-500/20 font-mono">
                  {stats.total}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">Detect and resolve scheduling conflicts</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Version Selector */}
          <Select
            value={currentVersionId}
            onValueChange={(val) => setSelectedScheduleVersionId(val)}
          >
            <SelectTrigger className="w-[260px] bg-card border-border text-foreground">
              <SelectValue placeholder="Select schedule version" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              {versions.map(v => (
                <SelectItem key={v.id} value={v.id} className="text-foreground focus:bg-accent focus:text-accent-foreground">
                  {v.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Run Detection Button */}
          {canPerformAction(user?.role, 'generateSchedule') && (
            <Button
              onClick={() => detectMutation.mutate()}
              disabled={detectMutation.isPending || !currentVersionId}
              className="bg-gradient-to-r from-[#059669] to-[#10B981] text-white font-bold rounded-full shadow-[0_0_20px_-5px_rgba(5,150,105,0.5)] hover:shadow-[0_0_25px_-5px_rgba(5,150,105,0.7)] transition-all disabled:opacity-50"
            >
              {detectMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Search className="size-4" />
              )}
              Run Detection
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<AlertTriangle className="size-5 text-muted-foreground" />}
          label="Total Conflicts"
          value={stats.total}
          colorClass="bg-muted-foreground/10"
        />
        <StatCard
          icon={<ShieldAlert className="size-5 text-red-400" />}
          label="Errors"
          value={stats.errors}
          colorClass="bg-red-500/10"
        />
        <StatCard
          icon={<AlertCircle className="size-5 text-yellow-400" />}
          label="Warnings"
          value={stats.warnings}
          colorClass="bg-yellow-500/10"
        />
        <StatCard
          icon={<CheckCircle2 className="size-5 text-emerald-400" />}
          label="Resolved"
          value={stats.resolved}
          colorClass="bg-emerald-500/10"
        />
      </div>

      {/* Conflicts List */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h2 className="font-heading font-bold text-foreground text-lg mb-4">
          Conflict Details
        </h2>

        {!currentVersionId ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-4 rounded-2xl bg-secondary/50 mb-4">
              <AlertTriangle className="size-8 text-muted-foreground" />
            </div>
            <h3 className="font-heading text-foreground font-bold text-lg mb-1">No Version Selected</h3>
            <p className="text-sm text-muted-foreground max-w-[280px]">
              Select a schedule version above to view and detect conflicts.
            </p>
          </div>
        ) : conflictsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-5 text-[#10B981] animate-spin" />
            <span className="ml-2 text-muted-foreground text-sm">Loading conflicts...</span>
          </div>
        ) : conflicts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-4 rounded-2xl bg-emerald-500/10 mb-4">
              <CheckCircle2 className="size-8 text-emerald-400" />
            </div>
            <h3 className="font-heading text-foreground font-bold text-lg mb-1">No Conflicts Found</h3>
            <p className="text-sm text-muted-foreground max-w-[280px]">
              This schedule version has no detected conflicts. Run detection to check for new conflicts.
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[50vh] sm:max-h-[65vh] overflow-auto custom-scrollbar pr-1">
            {conflicts.map(conflict => (
              <div
                key={conflict.id}
                className={`rounded-xl border p-4 transition-all ${
                  conflict.isResolved
                    ? 'bg-secondary/50 border-border opacity-60'
                    : conflict.severity === 'error'
                    ? 'bg-card border-red-500/20 hover:border-red-500/30'
                    : 'bg-card border-yellow-500/20 hover:border-yellow-500/30'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    {/* Badges row */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <ConflictTypeBadge type={conflict.type} />
                      <SeverityBadge severity={conflict.severity} />
                      {conflict.isResolved ? (
                        <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] uppercase tracking-wider flex items-center gap-1">
                          <CheckCircle2 className="size-3" />
                          Resolved
                        </Badge>
                      ) : (
                        <Badge className="bg-slate-500/10 text-slate-400 border border-slate-500/20 text-[10px] uppercase tracking-wider">
                          Unresolved
                        </Badge>
                      )}
                    </div>

                    {/* Details */}
                    <p className="text-sm text-foreground/80 leading-relaxed">
                      {conflict.details || 'No details available'}
                    </p>

                    {/* Schedule references */}
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="font-mono bg-secondary/50 px-2 py-1 rounded text-muted-foreground">
                        {conflict.schedule1.subject.subjectCode} · {conflict.schedule1.day} {formatTime12(conflict.schedule1.startTime)}–{formatTime12(conflict.schedule1.endTime)}
                      </span>
                      {conflict.schedule2 && (
                        <span className="font-mono bg-secondary/50 px-2 py-1 rounded text-muted-foreground">
                          {conflict.schedule2.subject.subjectCode} · {conflict.schedule2.day} {formatTime12(conflict.schedule2.startTime)}–{formatTime12(conflict.schedule2.endTime)}
                        </span>
                      )}
                    </div>

                    {/* Timestamps */}
                    <div className="text-[10px] text-muted-foreground/60 font-mono">
                      Created: {new Date(conflict.createdAt).toLocaleString()}
                      {conflict.resolvedAt && (
                        <> · Resolved: {new Date(conflict.resolvedAt).toLocaleString()}</>
                      )}
                    </div>
                  </div>

                  {/* Resolve Button */}
                  {!conflict.isResolved && canPerformAction(user?.role, 'generateSchedule') && (
                    <Button
                      size="sm"
                      onClick={() => resolveMutation.mutate(conflict.id)}
                      disabled={resolveMutation.isPending}
                      className="bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/30 hover:text-emerald-300 rounded-full shrink-0 disabled:opacity-50"
                    >
                      <CheckCircle2 className="size-3.5" />
                      Resolve
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
