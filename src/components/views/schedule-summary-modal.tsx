'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAppStore } from '@/store/app-store'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2, ChevronRight, ShieldAlert, XCircle } from 'lucide-react'

// ─── Mini stat block ─────────────────────────────────────────────────────────

function StatBlock({ label, value, color = 'text-foreground' }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="text-center min-w-0">
      <div className={`font-mono text-xl font-extrabold ${color}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground mt-0.5 whitespace-nowrap">{label}</div>
    </div>
  )
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface FacultySubject {
  subjectCode: string
  subjectName: string
  units: number
  subjectType: string
  defaultDurationHours: number
}

interface FacultyLoad {
  id: string
  name: string
  uid: string
  maxUnits: number
  assignedUnits: number
  assignmentCount: number
  totalHours: number
  lectureHours: number
  labHours: number
  subjectCount: number
  subjects: FacultySubject[]
  department: { name: string; code: string } | null
}

interface LoadSummary {
  totalFaculty: number
  totalAssignedUnits: number
  totalAssignments: number
  totalHours: number
  totalLectureHours: number
  totalLabHours: number
  overloadedCount: number
  heavyCount: number
  normalCount: number
  unassignedCount: number
  avgLoad: number
  avgUtilization: number
}

interface ScheduleVersionDetail {
  id: string
  name: string
  description: string | null
  semester: string
  academicYear: string
  status: string
  createdAt: string
  schedules?: { id: string }[]
  generationSession?: {
    id: string
    totalSchedules: number
    conflictCount: number
    status: string
  } | null
  _count?: { schedules: number }
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface ScheduleSummaryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  versionId: string
  onViewSchedule?: (versionId: string) => void
  onViewConflicts?: (versionId: string) => void
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ScheduleSummaryModal({
  open,
  onOpenChange,
  versionId,
  onViewSchedule,
  onViewConflicts,
}: ScheduleSummaryModalProps) {
  const { setCurrentView, setSelectedScheduleVersionId } = useAppStore()

  // Fetch version detail (includes generation session info)
  const { data: versionDetail, isLoading: versionLoading } = useQuery({
    queryKey: ['schedule-version', versionId],
    queryFn: async () => {
      const res = await api.get<ScheduleVersionDetail>(`/schedule-versions/${versionId}`)
      return res.data
    },
    enabled: open && !!versionId,
  })

  // Fetch faculty load
  const { data: loadData, isLoading: loadLoading } = useQuery({
    queryKey: ['faculty-loads', versionId],
    queryFn: async () => {
      const res = await api.get<{ faculty: FacultyLoad[]; summary: LoadSummary }>(
        `/schedule-versions/${versionId}/faculty-load`
      )
      return res.data
    },
    enabled: open && !!versionId,
  })

  const facultyLoads = loadData?.faculty ?? []
  const loadSummary = loadData?.summary ?? null
  const isLoading = versionLoading || loadLoading

  // Derive generation stats from version detail
  const totalSchedules = versionDetail?.generationSession?.totalSchedules ?? versionDetail?.schedules?.length ?? 0
  const conflictCount = versionDetail?.generationSession?.conflictCount ?? 0
  const genStatus = versionDetail?.generationSession?.status ?? 'unknown'

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-7xl w-[95vw] bg-card border-border max-h-[92vh] overflow-hidden flex flex-col p-0">
        <DialogTitle className="sr-only">Schedule Summary</DialogTitle>

        {/* Header Banner */}
        <div className={`px-8 pt-5 pb-4 text-left border-b border-border shrink-0 ${
          genStatus === 'failed'
            ? 'bg-gradient-to-b from-red-500/5 to-transparent'
            : 'bg-gradient-to-b from-[#10B981]/5 to-transparent'
        }`}>
          {genStatus === 'failed' ? (
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-full bg-red-500/10 flex items-center justify-center">
                <XCircle className="size-5 text-red-400" />
              </div>
              <div>
                <DialogTitle className="font-heading text-lg font-bold">Generation Failed</DialogTitle>
                <DialogDescription className="text-muted-foreground text-sm mt-0.5">
                  {versionDetail?.name || 'Schedule'} — {versionDetail?.semester} {versionDetail?.academicYear}
                </DialogDescription>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="font-heading text-sm font-semibold uppercase tracking-wider text-[#10B981]">
                  Schedule Summary
                </DialogTitle>
                <DialogDescription className="sr-only">Detailed summary of the schedule version</DialogDescription>
                <p className="text-foreground font-bold text-lg mt-1">{versionDetail?.name || 'Schedule'}</p>
                <p className="text-muted-foreground text-xs font-mono">
                  {versionDetail?.semester} {versionDetail?.academicYear}
                  {versionDetail?.createdAt && ` · ${new Date(versionDetail.createdAt).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                  })}`}
                </p>
              </div>
              {versionDetail?.status && (
                <span className={`inline-flex items-center rounded-md border px-3 py-1 font-mono text-xs font-medium uppercase ${
                  versionDetail.status === 'published'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : versionDetail.status === 'draft'
                    ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                    : 'bg-slate-500/20 text-slate-400 border-slate-500/30'
                }`}>
                  {versionDetail.status}
                </span>
              )}
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center py-16">
            <Loader2 className="size-6 text-[#10B981] animate-spin" />
            <span className="ml-3 text-sm text-muted-foreground">Loading schedule details...</span>
          </div>
        ) : genStatus === 'failed' ? (
          <div className="flex-1 flex items-center justify-center py-16 text-muted-foreground">
            <p className="text-sm">This generation session failed or has no schedule data.</p>
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
            <div className="px-8 py-6 space-y-6">

              {/* ── Compact Stats Row ──────────────────────────────────── */}
              <div className="flex flex-wrap items-center gap-x-8 gap-y-3 justify-center py-3 bg-secondary/20 border border-border rounded-xl">
                <StatBlock label="Schedules" value={totalSchedules} color="text-[#10B981]" />
                <div className="w-px h-8 bg-border hidden sm:block" />
                <StatBlock label="Conflicts" value={conflictCount} color={conflictCount > 0 ? 'text-red-400' : 'text-muted-foreground'} />
                {loadSummary && (
                  <>
                    <div className="w-px h-8 bg-border hidden sm:block" />
                    <StatBlock label="Faculty" value={loadSummary.totalFaculty} />
                    <div className="w-px h-8 bg-border hidden sm:block" />
                    <StatBlock label="Avg Load" value={`${loadSummary.avgLoad}u`} />
                    <div className="w-px h-8 bg-border hidden sm:block" />
                    <StatBlock label="Utilization" value={`${loadSummary.avgUtilization}%`} color={
                      loadSummary.avgUtilization >= 90 ? 'text-red-400' :
                      loadSummary.avgUtilization >= 70 ? 'text-[#10B981]' :
                      'text-yellow-400'
                    } />
                    <div className="w-px h-8 bg-border hidden sm:block" />
                    <StatBlock label="Lecture" value={`${loadSummary.totalLectureHours}h`} color="text-blue-400" />
                    <div className="w-px h-8 bg-border hidden sm:block" />
                    <StatBlock label="Lab" value={`${loadSummary.totalLabHours}h`} color="text-amber-400" />
                  </>
                )}
              </div>

              {/* ── Load Tier + Utilization ────────────────────────────── */}
              {loadSummary && (
                <div className="flex items-stretch gap-4 bg-secondary/20 border border-border rounded-xl p-4">
                  {/* Tier badges */}
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Load:</span>
                    {loadSummary.normalCount > 0 && (
                      <span className="inline-flex items-center gap-1 bg-[#10B981]/10 border border-[#10B981]/20 rounded-md px-2 py-1">
                        <span className="font-mono text-xs font-bold text-[#10B981]">{loadSummary.normalCount}</span>
                        <span className="text-[9px] text-[#10B981]/70">Normal</span>
                      </span>
                    )}
                    {loadSummary.heavyCount > 0 && (
                      <span className="inline-flex items-center gap-1 bg-yellow-500/10 border border-yellow-500/20 rounded-md px-2 py-1">
                        <span className="font-mono text-xs font-bold text-yellow-400">{loadSummary.heavyCount}</span>
                        <span className="text-[9px] text-yellow-400/70">Heavy</span>
                      </span>
                    )}
                    {loadSummary.overloadedCount > 0 && (
                      <span className="inline-flex items-center gap-1 bg-red-500/10 border border-red-500/20 rounded-md px-2 py-1">
                        <span className="font-mono text-xs font-bold text-red-400">{loadSummary.overloadedCount}</span>
                        <span className="text-[9px] text-red-400/70">Overloaded</span>
                      </span>
                    )}
                    {loadSummary.unassignedCount > 0 && (
                      <span className="inline-flex items-center gap-1 bg-secondary/40 border border-border rounded-md px-2 py-1">
                        <span className="font-mono text-xs font-bold text-muted-foreground">{loadSummary.unassignedCount}</span>
                        <span className="text-[9px] text-muted-foreground/60">Unassigned</span>
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {loadSummary.totalAssignments} assigns · {loadSummary.totalAssignedUnits}u
                    </span>
                  </div>

                  <div className="w-px bg-border self-stretch" />

                  {/* Utilization bar */}
                  <div className="flex-1 min-w-[120px] flex items-center gap-3">
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">Utilization</span>
                    <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          loadSummary.avgUtilization >= 90 ? 'bg-red-400' :
                          loadSummary.avgUtilization >= 70 ? 'bg-gradient-to-r from-[#059669] to-[#10B981]' :
                          'bg-yellow-400'
                        }`}
                        style={{ width: `${Math.min(loadSummary.avgUtilization, 100)}%` }}
                      />
                    </div>
                    <span className="font-mono text-xs font-bold text-foreground min-w-[3ch] text-right">{loadSummary.avgUtilization}%</span>
                  </div>
                </div>
              )}

              {/* ── Faculty Load Table ─────────────────────────────────── */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Faculty Load Details</h4>
                  <span className="text-[11px] text-muted-foreground font-mono">{facultyLoads.length} faculty</span>
                </div>
                <div className="max-h-[55vh] overflow-y-auto custom-scrollbar rounded-xl border border-border">
                  {facultyLoads.length === 0 ? (
                    <div className="text-center py-10 text-sm text-muted-foreground">No faculty data available</div>
                  ) : (
                    <table className="w-full">
                      <thead className="sticky top-0 bg-card z-10">
                        <tr className="border-b border-border">
                          <th className="text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-4 py-2.5">Faculty</th>
                          <th className="text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-4 py-2.5">Dept</th>
                          <th className="text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-4 py-2.5">Classes</th>
                          <th className="text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-4 py-2.5">Subjects</th>
                          <th className="text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-4 py-2.5">Lec Hrs</th>
                          <th className="text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-4 py-2.5">Lab Hrs</th>
                          <th className="text-right text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-4 py-2.5">Load</th>
                        </tr>
                      </thead>
                      <tbody>
                        {facultyLoads.map(faculty => {
                          const ratio = faculty.maxUnits > 0 ? faculty.assignedUnits / faculty.maxUnits : 0
                          const loadColor = ratio >= 1 ? 'text-red-400' : ratio >= 0.75 ? 'text-yellow-400' : 'text-[#10B981]'
                          const barColor = ratio >= 1 ? 'bg-red-400' : ratio >= 0.75 ? 'bg-yellow-400' : 'bg-gradient-to-r from-[#059669] to-[#10B981]'
                          const statusLabel = ratio >= 1 ? 'Overloaded' : ratio >= 0.75 ? 'Heavy' : 'Normal'
                          const statusColor = ratio >= 1 ? 'bg-red-500/10 text-red-400' : ratio >= 0.75 ? 'bg-yellow-500/10 text-yellow-400' : 'bg-[#10B981]/10 text-[#10B981]'
                          return (
                            <tr key={faculty.id} className="border-b border-border/50 last:border-b-0 hover:bg-secondary/30 transition-colors">
                              <td className="px-4 py-2.5">
                                <div className="text-sm text-foreground font-medium">{faculty.name}</div>
                                <div className="text-[10px] text-muted-foreground font-mono">{faculty.uid}</div>
                              </td>
                              <td className="px-4 py-2.5">
                                <span className="text-xs text-muted-foreground font-medium">{faculty.department?.code || '—'}</span>
                              </td>
                              <td className="px-4 py-2.5 text-center font-mono text-sm text-foreground">{faculty.assignmentCount}</td>
                              <td className="px-4 py-2.5 text-center font-mono text-sm text-muted-foreground">{faculty.subjectCount}</td>
                              <td className="px-4 py-2.5 text-center font-mono text-sm text-blue-400">{faculty.lectureHours}h</td>
                              <td className="px-4 py-2.5 text-center font-mono text-sm text-amber-400">{faculty.labHours}h</td>
                              <td className="px-4 py-2.5 text-right">
                                <div className="flex flex-col items-end gap-1">
                                  <div className="flex items-center gap-2">
                                    <span className={`text-sm font-mono font-bold ${loadColor}`}>
                                      {faculty.assignedUnits}/{faculty.maxUnits}
                                    </span>
                                    <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${statusColor}`}>
                                      {statusLabel}
                                    </span>
                                  </div>
                                  <div className="w-20 h-1.5 bg-secondary rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(ratio * 100, 100)}%` }} />
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="px-8 py-5 border-t border-border bg-muted/20 shrink-0">
          <div className="flex gap-3 justify-center">
            <Button
              onClick={() => {
                if (onViewSchedule) {
                  onViewSchedule(versionId)
                } else {
                  setSelectedScheduleVersionId(versionId)
                  setCurrentView('schedules')
                  onOpenChange(false)
                }
              }}
              className="h-11 px-8 bg-gradient-to-r from-[#059669] to-[#10B981] text-white font-bold rounded-full shadow-[0_0_20px_-5px_rgba(5,150,105,0.5)] hover:shadow-[0_0_25px_-5px_rgba(5,150,105,0.7)] transition-all"
            >
              View Schedule
              <ChevronRight className="size-4" />
            </Button>
            <Button
              onClick={() => {
                if (onViewConflicts) {
                  onViewConflicts(versionId)
                } else {
                  setSelectedScheduleVersionId(versionId)
                  setCurrentView('conflicts')
                  onOpenChange(false)
                }
              }}
              variant="outline"
              className="h-11 px-8 border-border text-foreground hover:bg-secondary/50 rounded-full"
            >
              <ShieldAlert className="size-4" />
              View Conflicts
            </Button>
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="h-11 px-6 text-muted-foreground hover:text-foreground rounded-full"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
