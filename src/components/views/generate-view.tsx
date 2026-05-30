'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, extractArray } from '@/lib/api'
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
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  AnimatedBeam,
  BeamContainer,
  BeamNode,
} from '@/components/ui/animated-beam'
import {
  Zap,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  ChevronRight,
  Database,
  Users,
  CalendarRange,
  ShieldAlert,
  Sparkles,
  Server,
  Cpu,
  AlertTriangle,

} from 'lucide-react'

// --- Types ---
interface GenerationSession {
  id: string
  name: string
  status: string
  semester: string
  academicYear: string
  totalSchedules: number
  conflictCount: number
  score: number | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  _count?: { scheduleVersions: number }
  scheduleVersions?: { id: string }[]
}

interface GenerationResult {
  sessionId: string
  versionId: string
  totalSchedules: number
  conflictCount: number
  status: 'completed' | 'partial' | 'failed'
  message: string
  missingItems?: Array<{ label: string; found: number; totalInSemester: number; needed: string }>
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
  subjects: { subjectCode: string; subjectName: string; units: number; subjectType: string; defaultDurationHours: number }[]
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

// --- Status Badge ---
function SessionStatusBadge({ status }: { status: string }) {
  const config: Record<string, { icon: React.ReactNode; className: string }> = {
    pending: {
      icon: <Clock className="size-3" />,
      className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    },
    running: {
      icon: <Loader2 className="size-3 animate-spin" />,
      className: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    },
    completed: {
      icon: <CheckCircle2 className="size-3" />,
      className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    },
    failed: {
      icon: <XCircle className="size-3" />,
      className: 'bg-red-500/10 text-red-400 border-red-500/20',
    },
  }
  const cfg = config[status] || config.pending
  return (
    <Badge className={`${cfg.className} border text-[10px] uppercase tracking-wider flex items-center gap-1`}>
      {cfg.icon}
      {status}
    </Badge>
  )
}

// --- Generation Pipeline Visualizer (AnimatedBeam) ---
function GenerationPipelineVisualizer({ progress }: { progress: number }) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLDivElement>(null)
  const engineRef = React.useRef<HTMLDivElement>(null)
  const facultyRef = React.useRef<HTMLDivElement>(null)
  const scheduleRef = React.useRef<HTMLDivElement>(null)
  const conflictRef = React.useRef<HTMLDivElement>(null)
  const dbRef = React.useRef<HTMLDivElement>(null)

  // Beam speed increases as progress goes up
  const beamDuration = Math.max(1.5, 4 - (progress / 100) * 2.5)

  return (
    <BeamContainer
      ref={containerRef}
      className="mx-auto flex w-full items-center justify-center gap-8 rounded-xl border border-border bg-secondary/20 p-8"
    >
      {/* Input Layer */}
      <div className="flex flex-col items-center gap-2">
        <BeamNode
          ref={inputRef}
          className="h-14 w-14 border-2 border-emerald-500/30 bg-emerald-500/10"
        >
          <Database className="h-6 w-6 text-emerald-500" />
        </BeamNode>
        <span className="font-medium text-[10px] text-muted-foreground uppercase tracking-wider">
          Data
        </span>
      </div>

      {/* Algorithm Layer */}
      <div className="flex flex-col items-center gap-2">
        <BeamNode
          ref={engineRef}
          className="h-16 w-16 border-2 border-[#10B981]/30 bg-[#10B981]/10"
        >
          <Cpu className="h-8 w-8 text-[#10B981]" />
        </BeamNode>
        <span className="font-medium text-[10px] text-muted-foreground uppercase tracking-wider">
          Algorithm
        </span>
      </div>

      {/* Services Layer */}
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <BeamNode
            ref={facultyRef}
            className="h-12 w-12 border-2 border-blue-500/30 bg-blue-500/10"
          >
            <Users className="h-5 w-5 text-blue-500" />
          </BeamNode>
          <span className="font-medium text-[10px] text-muted-foreground uppercase tracking-wider">
            Faculty
          </span>
        </div>

        <div className="flex items-center gap-3">
          <BeamNode
            ref={scheduleRef}
            className="h-12 w-12 border-2 border-amber-500/30 bg-amber-500/10"
          >
            <CalendarRange className="h-5 w-5 text-amber-500" />
          </BeamNode>
          <span className="font-medium text-[10px] text-muted-foreground uppercase tracking-wider">
            Schedule
          </span>
        </div>

        <div className="flex items-center gap-3">
          <BeamNode
            ref={conflictRef}
            className="h-12 w-12 border-2 border-rose-500/30 bg-rose-500/10"
          >
            <ShieldAlert className="h-5 w-5 text-rose-500" />
          </BeamNode>
          <span className="font-medium text-[10px] text-muted-foreground uppercase tracking-wider">
            Conflicts
          </span>
        </div>
      </div>

      {/* Database Layer */}
      <div className="flex flex-col items-center gap-2">
        <BeamNode
          ref={dbRef}
          className="h-14 w-14 border-2 border-slate-500/30 bg-slate-500/10"
        >
          <Server className="h-6 w-6 text-slate-500" />
        </BeamNode>
        <span className="font-medium text-[10px] text-muted-foreground uppercase tracking-wider">
          Store
        </span>
      </div>

      {/* Input → Algorithm */}
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={inputRef}
        toRef={engineRef}
        duration={beamDuration}
        curvature={0}
        gradientStartColor="#10B981"
        gradientStopColor="#059669"
      />

      {/* Algorithm → Services */}
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={engineRef}
        toRef={facultyRef}
        duration={beamDuration}
        delay={0.2}
        curvature={-0.3}
        gradientStartColor="#059669"
        gradientStopColor="#3b82f6"
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={engineRef}
        toRef={scheduleRef}
        duration={beamDuration}
        delay={0.4}
        curvature={0}
        gradientStartColor="#059669"
        gradientStopColor="#f59e0b"
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={engineRef}
        toRef={conflictRef}
        duration={beamDuration}
        delay={0.6}
        curvature={0.3}
        gradientStartColor="#059669"
        gradientStopColor="#f43f5e"
      />

      {/* Services → DB */}
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={facultyRef}
        toRef={dbRef}
        duration={beamDuration}
        delay={1}
        curvature={0.3}
        gradientStartColor="#3b82f6"
        gradientStopColor="#64748b"
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={scheduleRef}
        toRef={dbRef}
        duration={beamDuration}
        delay={1.2}
        curvature={0}
        gradientStartColor="#f59e0b"
        gradientStopColor="#64748b"
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={conflictRef}
        toRef={dbRef}
        duration={beamDuration}
        delay={1.4}
        curvature={-0.3}
        gradientStartColor="#f43f5e"
        gradientStopColor="#64748b"
      />
    </BeamContainer>
  )
}

// --- Main Component ---
export function GenerateView() {
  const queryClient = useQueryClient()
  const { setIsGenerating, setSelectedScheduleVersionId, setCurrentView } = useAppStore()

  // Form state
  const [semester, setSemester] = useState('1st')
  const [academicYear, setAcademicYear] = useState('2025-2026')
  const [classType, setClassType] = useState<string>('all')

  // Generation state
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [isGenerating, setLocalGenerating] = useState(false)
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null)
  const [progress, setProgress] = useState(0)
  const [progressPhase, setProgressPhase] = useState('')
  const [showResultModal, setShowResultModal] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  // Fetch faculty loads when result modal opens
  const { data: facultyLoadsData, isLoading: facultyLoadsLoading } = useQuery({
    queryKey: ['faculty-loads', generationResult?.versionId],
    queryFn: async () => {
      if (!generationResult?.versionId) return null
      const res = await api.get<{ faculty: FacultyLoad[]; summary: LoadSummary }>(`/schedule-versions/${generationResult.versionId}/faculty-load`)
      return res.data
    },
    enabled: showResultModal && !!generationResult?.versionId && generationResult.status !== 'failed',
  })
  const facultyLoadResponse = facultyLoadsData as { faculty: FacultyLoad[]; summary: LoadSummary } | null | undefined
  const facultyLoads: FacultyLoad[] = facultyLoadResponse?.faculty || []
  const loadSummary: LoadSummary | null = facultyLoadResponse?.summary || null

  // Fetch generation sessions
  const { data: sessionsData, isLoading: sessionsLoading } = useQuery({
    queryKey: ['generation-sessions'],
    queryFn: async () => {
      const res = await api.get<{ data: GenerationSession[]; pagination: { total: number } }>(
        '/generation-sessions?limit=20'
      )
      return res.data
    },
  })
  const sessions: GenerationSession[] = extractArray<GenerationSession>(sessionsData)

  // Generate mutation
  const generateMutation = useMutation({
    mutationFn: async (params: { semester: string; academicYear: string; classType?: string }) => {
      const body: Record<string, string> = {
        semester: params.semester,
        academicYear: params.academicYear,
      }
      if (params.classType && params.classType !== 'all') {
        body.classType = params.classType
      }
      const res = await api.post<GenerationResult>('/generate', body)
      return res
    },
    onMutate: () => {
      setLocalGenerating(true)
      setIsGenerating(true)
      setGenerationResult(null)
      setProgress(10)
      setProgressPhase('Scanning subjects & sections...')

      // Start slow progress animation to show activity while API runs
      const PHASES = [
        { threshold: 0.1, label: 'Scanning subjects & sections...' },
        { threshold: 0.2, label: 'Matching faculty specializations...' },
        { threshold: 0.4, label: 'Building time slot assignments...' },
        { threshold: 0.6, label: 'Detecting conflicts & overlaps...' },
        { threshold: 0.8, label: 'Optimizing schedule quality...' },
        { threshold: 0.9, label: 'Persisting results...' },
      ]

      const interval = setInterval(() => {
        setProgress((prev) => {
          const next = Math.min(prev + 2, 90) // Cap at 90% until API responds
          const progressFraction = next / 100
          const currentPhase = [...PHASES].reverse().find(p => progressFraction >= p.threshold) || PHASES[0]
          setProgressPhase(currentPhase.label)
          return next
        })
      }, 500)

      progressIntervalRef.current = interval
    },
    onSuccess: (res) => {
      // API responded — clear the slow interval and jump to 100%
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }
      setProgress(100)
      setProgressPhase('Complete!')

      // Small delay to show "Complete" before revealing results modal
      setTimeout(() => {
        if (res.data) {
          setGenerationResult(res.data)
        } else if (res.error) {
          // Network or unexpected error — show the error message
          setGenerationResult({
            sessionId: '',
            versionId: '',
            totalSchedules: 0,
            conflictCount: 0,
            status: 'failed',
            message: res.error,
          })
        }
        setLocalGenerating(false)
        setIsGenerating(false)
        setShowResultModal(true)
        queryClient.invalidateQueries({ queryKey: ['generation-sessions'] })
        queryClient.invalidateQueries({ queryKey: ['schedule-versions'] })
      }, 800)
    },
    onError: () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }
      setLocalGenerating(false)
      setIsGenerating(false)
      setProgress(0)
      setGenerationResult({
        sessionId: '',
        versionId: '',
        totalSchedules: 0,
        conflictCount: 0,
        status: 'failed',
        message: 'Generation failed. Please check your data and try again.',
      })
      setShowResultModal(true)
    },
  })

  // Cleanup interval on unmount to prevent memory leak
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }
    }
  }, [])

  const handleGenerateClick = () => {
    setShowConfirmModal(true)
  }

  const handleConfirmGenerate = () => {
    setShowConfirmModal(false)
    generateMutation.mutate({
      semester,
      academicYear,
      classType: classType === 'all' ? undefined : classType,
    })
  }

  const handleViewSession = (session: GenerationSession) => {
    const versionId = session.scheduleVersions?.[0]?.id
    if (!versionId) return

    setGenerationResult({
      sessionId: session.id,
      versionId,
      totalSchedules: session.totalSchedules,
      conflictCount: session.conflictCount,
      status: session.status === 'completed' ? 'completed' : session.status === 'failed' ? 'failed' : 'partial',
      message: `Generated ${session.totalSchedules} schedules with ${session.conflictCount} conflicts`,
    })
    setShowResultModal(true)
  }

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-card border border-border p-8 sm:p-10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#10B981]/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#059669]/5 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/4" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-[#10B981]/10">
              <Zap className="size-6 text-[#10B981]" />
            </div>
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-foreground mb-2">
            Generate Schedule
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base max-w-lg">
            Configure generation parameters and create optimized timetables with automated conflict detection.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-6">
        {/* Configuration Card */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <h2 className="font-heading font-bold text-foreground text-lg mb-6">Configuration</h2>

          <div className="space-y-5">
            {/* Semester */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Semester</label>
              <Select value={semester} onValueChange={setSemester}>
                <SelectTrigger className="w-full bg-secondary border-border text-foreground">
                  <SelectValue placeholder="Select semester" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="1st" className="text-foreground focus:bg-accent focus:text-accent-foreground">1st Semester</SelectItem>
                  <SelectItem value="2nd" className="text-foreground focus:bg-accent focus:text-accent-foreground">2nd Semester</SelectItem>
                  <SelectItem value="3rd" className="text-foreground focus:bg-accent focus:text-accent-foreground">3rd Semester</SelectItem>
                  <SelectItem value="summer" className="text-foreground focus:bg-accent focus:text-accent-foreground">Summer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Academic Year */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Academic Year</label>
              <Input
                type="text"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                placeholder="e.g., 2024-2025"
                className="w-full bg-secondary border-border text-foreground font-mono placeholder:text-foreground/20"
              />
            </div>

            {/* Class Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Class Type <span className="text-foreground/30">(required)</span>
              </label>
              <Select value={classType} onValueChange={setClassType}>
                <SelectTrigger className="w-full bg-secondary border-border text-foreground">
                  <SelectValue placeholder="Select class type" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="all" className="text-foreground focus:bg-accent focus:text-accent-foreground">
                    All Types
                  </SelectItem>
                  <SelectItem value="regular" className="text-foreground focus:bg-accent focus:text-accent-foreground">
                    Regular Only
                  </SelectItem>
                  <SelectItem value="executive" className="text-foreground focus:bg-accent focus:text-accent-foreground">
                    Executive Only
                  </SelectItem>
                </SelectContent>
              </Select>
              {classType !== 'all' && (
                <p className="text-[11px] text-amber-400/80 flex items-center gap-1.5 mt-1">
                  <AlertTriangle className="size-3 shrink-0" />
                  {classType === 'executive'
                    ? 'Only masteral faculty (with master\'s degrees) can teach executive classes.'
                    : 'Both regular and masteral faculty will be assigned to regular classes.'}
                </p>
              )}
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerateClick}
              disabled={isGenerating || !academicYear}
              className="w-full h-12 bg-gradient-to-r from-[#059669] to-[#10B981] text-white font-bold rounded-full shadow-[0_0_20px_-5px_rgba(5,150,105,0.5)] hover:shadow-[0_0_25px_-5px_rgba(5,150,105,0.7)] transition-all text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="size-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Play className="size-5" />
                  Generate Schedule
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Progress / Results Card */}
        <div className="bg-card border border-border rounded-2xl p-6">
          {isGenerating ? (
            <div className="space-y-6 py-4">
              <div className="text-center">
                <h3 className="font-heading font-bold text-foreground text-lg mb-1">Generating Schedules...</h3>
                <p className="text-sm text-muted-foreground transition-all duration-500">{progressPhase}</p>
              </div>
              <GenerationPipelineVisualizer progress={progress} />
              <div className="space-y-2 pt-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-mono text-[#10B981] tabular-nums">{Math.round(progress)}%</span>
                </div>
                <div className="h-2.5 bg-secondary/50 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#059669] to-[#10B981] transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-4 rounded-2xl bg-secondary/50 mb-4">
                <Zap className="size-8 text-muted-foreground" />
              </div>
              <h3 className="font-heading text-foreground font-bold text-lg mb-1">Ready to Generate</h3>
              <p className="text-sm text-muted-foreground max-w-[240px]">
                Configure the parameters and click Generate to create a new schedule.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Result Modal */}
      <Dialog open={showResultModal} onOpenChange={(open) => {
        setShowResultModal(open)
        if (!open) setGenerationResult(null)
      }}>
        <DialogContent className="sm:max-w-7xl w-[95vw] bg-card border-border max-h-[92vh] overflow-hidden flex flex-col p-0">
          <DialogTitle className="sr-only">Schedule Generation Result</DialogTitle>
          {generationResult && (
            <>
              {/* Header Banner */}
              <div className={`px-8 pt-5 pb-4 text-left border-b border-border shrink-0 ${
                generationResult.status === 'failed'
                  ? 'bg-gradient-to-b from-red-500/5 to-transparent'
                  : 'bg-gradient-to-b from-[#10B981]/5 to-transparent'
              }`}>
                {generationResult.status === 'failed' ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-full bg-red-500/10 flex items-center justify-center">
                        <XCircle className="size-5 text-red-400" />
                      </div>
                      <div>
                        <DialogTitle className="font-heading text-lg font-bold">Generation Failed</DialogTitle>
                        <DialogDescription className="text-muted-foreground text-sm mt-0.5">
                          {generationResult.message}
                        </DialogDescription>
                      </div>
                    </div>
                    {generationResult.missingItems && generationResult.missingItems.length > 0 && (
                      <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 space-y-3">
                        <p className="text-xs font-semibold text-red-400 uppercase tracking-wider">Missing Data</p>
                        {generationResult.missingItems.map((item, i) => (
                          <div key={i} className="flex items-start gap-3">
                            <div className="size-7 rounded-full bg-red-500/10 flex items-center justify-center shrink-0 mt-0.5">
                              <span className="text-[11px] font-bold text-red-400">{item.found}</span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground">{item.label}</p>
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                {item.totalInSemester > 0
                                  ? `${item.totalInSemester} total in this semester — but none match the class type filter`
                                  : `No ${item.label.toLowerCase().split(' (')[0]} found in this semester at all`
                                }
                              </p>
                              <p className="text-[11px] text-muted-foreground/70 mt-0.5">{item.needed}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <DialogTitle className="font-heading text-sm font-semibold uppercase tracking-wider text-[#10B981]">Summary of Schedule</DialogTitle>
                    <DialogDescription className="sr-only">{generationResult.message}</DialogDescription>
                  </div>
                )}
              </div>

              {generationResult.status !== 'failed' ? (
                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                  <div className="px-8 py-6 space-y-6">
                    {/* Top Row: Stats + Distribution Summary */}
                    <div className="space-y-6">
                      {/* Stats Cards */}
                      <div className="grid grid-cols-2 gap-3 max-w-md">
                          <div className="bg-[#10B981]/5 border border-[#10B981]/20 rounded-xl p-4 text-center">
                            <div className="font-mono text-3xl font-extrabold text-[#10B981]">{generationResult.totalSchedules}</div>
                            <div className="text-[11px] text-muted-foreground mt-1 font-medium">Schedules Created</div>
                          </div>
                          <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 text-center">
                            <div className="font-mono text-3xl font-extrabold text-red-400">{generationResult.conflictCount}</div>
                            <div className="text-[11px] text-muted-foreground mt-1 font-medium">Conflicts Found</div>
                          </div>
                        </div>

                      {/* Load Distribution Summary */}
                      <div className="space-y-4 min-w-0">
                        <h4 className="text-sm font-bold text-foreground uppercase tracking-wider">Load Distribution</h4>

                        {facultyLoadsLoading ? (
                          <div className="flex items-center justify-center py-10">
                            <Loader2 className="size-5 text-[#10B981] animate-spin" />
                            <span className="ml-2 text-sm text-muted-foreground">Loading distribution data...</span>
                          </div>
                        ) : loadSummary ? (
                          <>
                            {/* Distribution Stats Grid */}
                            <div className="grid grid-cols-5 gap-3">
                              <div className="bg-secondary/40 border border-border rounded-xl p-3.5 text-center">
                                <div className="font-mono text-xl font-bold text-foreground">{loadSummary.totalFaculty}</div>
                                <div className="text-[10px] text-muted-foreground mt-0.5 font-medium">Faculty Assigned</div>
                              </div>
                              <div className="bg-secondary/40 border border-border rounded-xl p-3.5 text-center">
                                <div className="font-mono text-xl font-bold text-foreground">{loadSummary.avgLoad}</div>
                                <div className="text-[10px] text-muted-foreground mt-0.5 font-medium">Avg Load (units)</div>
                              </div>
                              <div className="bg-secondary/40 border border-border rounded-xl p-3.5 text-center">
                                <div className="font-mono text-xl font-bold text-foreground">{loadSummary.avgUtilization}%</div>
                                <div className="text-[10px] text-muted-foreground mt-0.5 font-medium">Avg Utilization</div>
                              </div>
                              <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3.5 text-center">
                                <div className="font-mono text-xl font-bold text-blue-400">{loadSummary.totalLectureHours}</div>
                                <div className="text-[10px] text-muted-foreground mt-0.5 font-medium">Lecture Hours</div>
                              </div>
                              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3.5 text-center">
                                <div className="font-mono text-xl font-bold text-amber-400">{loadSummary.totalLabHours}</div>
                                <div className="text-[10px] text-muted-foreground mt-0.5 font-medium">Lab Hours</div>
                              </div>
                            </div>

                            {/* Load Tier Bar */}
                            <div className="bg-secondary/30 border border-border rounded-xl p-4">
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Faculty by Load Tier</span>
                                <span className="text-[11px] text-muted-foreground font-mono">{loadSummary.totalAssignments} assignments · {loadSummary.totalAssignedUnits} units</span>
                              </div>
                              <div className="flex gap-2">
                                {loadSummary.normalCount > 0 && (
                                  <div className="flex-1 bg-[#10B981]/10 border border-[#10B981]/20 rounded-lg p-3 text-center">
                                    <div className="font-mono text-lg font-bold text-[#10B981]">{loadSummary.normalCount}</div>
                                    <div className="text-[9px] text-[#10B981]/70 font-semibold uppercase tracking-wider">Normal</div>
                                    <div className="text-[9px] text-muted-foreground mt-0.5">&lt; 75%</div>
                                  </div>
                                )}
                                {loadSummary.heavyCount > 0 && (
                                  <div className="flex-1 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-center">
                                    <div className="font-mono text-lg font-bold text-yellow-400">{loadSummary.heavyCount}</div>
                                    <div className="text-[9px] text-yellow-400/70 font-semibold uppercase tracking-wider">Heavy</div>
                                    <div className="text-[9px] text-muted-foreground mt-0.5">75–99%</div>
                                  </div>
                                )}
                                {loadSummary.overloadedCount > 0 && (
                                  <div className="flex-1 bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-center">
                                    <div className="font-mono text-lg font-bold text-red-400">{loadSummary.overloadedCount}</div>
                                    <div className="text-[9px] text-red-400/70 font-semibold uppercase tracking-wider">Overloaded</div>
                                    <div className="text-[9px] text-muted-foreground mt-0.5">≥ 100%</div>
                                  </div>
                                )}
                                {loadSummary.unassignedCount > 0 && (
                                  <div className="flex-1 bg-secondary/40 border border-border rounded-lg p-3 text-center">
                                    <div className="font-mono text-lg font-bold text-muted-foreground">{loadSummary.unassignedCount}</div>
                                    <div className="text-[9px] text-muted-foreground/60 font-semibold uppercase tracking-wider">Unassigned</div>
                                    <div className="text-[9px] text-muted-foreground mt-0.5">0 units</div>
                                  </div>
                                )}
                              </div>

                              {/* Utilization bar */}
                              <div className="mt-4">
                                <div className="flex justify-between text-[10px] text-muted-foreground mb-1.5">
                                  <span>Overall Utilization</span>
                                  <span className="font-mono font-bold text-foreground">{loadSummary.avgUtilization}%</span>
                                </div>
                                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-700 ease-out ${
                                      loadSummary.avgUtilization >= 90 ? 'bg-red-400' :
                                      loadSummary.avgUtilization >= 70 ? 'bg-gradient-to-r from-[#059669] to-[#10B981]' :
                                      'bg-yellow-400'
                                    }`}
                                    style={{ width: `${Math.min(loadSummary.avgUtilization, 100)}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-8 text-sm text-muted-foreground">No distribution data available</div>
                        )}
                      </div>
                    </div>

                    {/* Faculty Load Detail Table */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-foreground uppercase tracking-wider">Faculty Load Details</h4>
                        <span className="text-[11px] text-muted-foreground font-mono">{facultyLoads.length} faculty</span>
                      </div>
                      <div className="max-h-[55vh] overflow-y-auto custom-scrollbar rounded-xl border border-border bg-secondary/20">
                        {facultyLoadsLoading ? (
                          <div className="flex items-center justify-center py-10">
                            <Loader2 className="size-5 text-[#10B981] animate-spin" />
                            <span className="ml-2 text-sm text-muted-foreground">Loading faculty data...</span>
                          </div>
                        ) : facultyLoads.length === 0 ? (
                          <div className="text-center py-10 text-sm text-muted-foreground">No faculty data available</div>
                        ) : (
                          <table className="w-full">
                            <thead className="sticky top-0 bg-card/95 backdrop-blur-sm z-10">
                              <tr className="border-b border-border">
                                <th className="text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-4 py-3">Faculty</th>
                                <th className="text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-4 py-3">Dept</th>
                                <th className="text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-4 py-3">Classes</th>
                                <th className="text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-4 py-3">Subjects</th>
                                <th className="text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-4 py-3">Lec Hrs</th>
                                <th className="text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-4 py-3">Lab Hrs</th>
                                <th className="text-right text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-4 py-3">Load</th>
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
                                  <tr key={faculty.id} className="border-b border-border/50 last:border-b-0 hover:bg-secondary/40 transition-colors">
                                    <td className="px-4 py-2.5">
                                      <div className="text-sm text-foreground font-semibold">{faculty.name}</div>
                                      <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{faculty.uid}</div>
                                    </td>
                                    <td className="px-4 py-2.5">
                                      <span className="text-[11px] text-muted-foreground font-medium">{faculty.department?.code || '—'}</span>
                                    </td>
                                    <td className="px-4 py-2.5 text-center">
                                      <span className="text-sm font-mono font-semibold text-foreground">{faculty.assignmentCount}</span>
                                    </td>
                                    <td className="px-4 py-2.5 text-center">
                                      <span className="text-sm font-mono text-muted-foreground">{faculty.subjectCount}</span>
                                    </td>
                                    <td className="px-4 py-2.5 text-center">
                                      <span className="text-sm font-mono font-semibold text-blue-400">{faculty.lectureHours}h</span>
                                    </td>
                                    <td className="px-4 py-2.5 text-center">
                                      <span className="text-sm font-mono font-semibold text-amber-400">{faculty.labHours}h</span>
                                    </td>
                                    <td className="px-4 py-2.5">
                                      <div className="flex flex-col items-end gap-1.5">
                                        <div className="flex items-center gap-2">
                                          <span className={`text-sm font-mono font-bold ${loadColor}`}>
                                            {faculty.assignedUnits}/{faculty.maxUnits}
                                          </span>
                                          <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${statusColor}`}>
                                            {statusLabel}
                                          </span>
                                        </div>
                                        <div className="w-24 h-1.5 bg-secondary rounded-full overflow-hidden">
                                          <div
                                            className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
                                            style={{ width: `${Math.min(ratio * 100, 100)}%` }}
                                          />
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
              ) : null}

              {/* Footer Actions */}
              <div className="px-8 py-5 border-t border-border bg-muted/20 shrink-0">
                {generationResult.versionId ? (
                  <div className="flex gap-3 justify-center">
                    <Button
                      onClick={() => {
                        setSelectedScheduleVersionId(generationResult.versionId)
                        setCurrentView('schedules')
                        setShowResultModal(false)
                      }}
                      className="h-11 px-8 bg-gradient-to-r from-[#059669] to-[#10B981] text-white font-bold rounded-full shadow-[0_0_20px_-5px_rgba(5,150,105,0.5)] hover:shadow-[0_0_25px_-5px_rgba(5,150,105,0.7)] transition-all"
                    >
                      View Schedule
                      <ChevronRight className="size-4" />
                    </Button>
                    <Button
                      onClick={() => {
                        setSelectedScheduleVersionId(generationResult.versionId)
                        setCurrentView('conflicts')
                        setShowResultModal(false)
                      }}
                      variant="outline"
                      className="h-11 px-8 border-border text-foreground hover:bg-secondary/50 rounded-full"
                    >
                      <ShieldAlert className="size-4" />
                      View Conflicts
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setShowResultModal(false)
                        setGenerationResult(null)
                      }}
                      className="h-11 px-6 text-muted-foreground hover:text-foreground rounded-full"
                    >
                      Close
                    </Button>
                  </div>
                ) : (
                  <div className="flex justify-center">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setShowResultModal(false)
                        setGenerationResult(null)
                      }}
                      className="h-11 px-8 text-muted-foreground hover:text-foreground rounded-full"
                    >
                      Close
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Generation History */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h2 className="font-heading font-bold text-foreground text-lg mb-4">Generation History</h2>

        {sessionsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-5 text-[#10B981] animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No generation sessions yet. Generate your first schedule above.
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto custom-scrollbar">
            <table className="w-full min-w-[600px]">
              <thead className="sticky top-0 bg-card z-10">
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-mono text-muted-foreground pb-3 pr-4">Name</th>
                  <th className="text-left text-xs font-mono text-muted-foreground pb-3 pr-4">Status</th>
                  <th className="text-right text-xs font-mono text-muted-foreground pb-3 pr-4">Schedules</th>
                  <th className="text-right text-xs font-mono text-muted-foreground pb-3 pr-4">Conflicts</th>
                  <th className="text-right text-xs font-mono text-muted-foreground pb-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map(session => {
                  const hasVersion = !!session.scheduleVersions?.[0]?.id
                  return (
                    <tr
                      key={session.id}
                      onClick={() => hasVersion && handleViewSession(session)}
                      className={`border-b border-border transition-colors ${
                        hasVersion
                          ? 'cursor-pointer hover:bg-secondary/30'
                          : 'cursor-default opacity-60'
                      }`}
                    >
                      <td className="py-3 pr-4">
                        <div className="text-sm text-foreground">{session.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{session.semester} {session.academicYear}</div>
                      </td>
                      <td className="py-3 pr-4">
                        <SessionStatusBadge status={session.status} />
                      </td>
                      <td className="py-3 pr-4 text-right">
                        <span className="font-mono text-sm text-[#10B981]">{session.totalSchedules}</span>
                      </td>
                      <td className="py-3 pr-4 text-right">
                        <span className={`font-mono text-sm ${session.conflictCount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                          {session.conflictCount}
                        </span>
                      </td>
                      <td className="py-3 text-right text-xs text-muted-foreground">
                        {new Date(session.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <AlertDialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <AlertDialogContent className="bg-card border-border max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl bg-[#10B981]/10">
                <Zap className="size-5 text-[#10B981]" />
              </div>
              <AlertDialogTitle className="font-heading text-lg font-bold text-foreground">
                Confirm Schedule Generation
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription asChild className="text-muted-foreground text-sm space-y-3 pt-1">
              <div>
                <span className="block">You are about to generate schedules with the following configuration:</span>
                <div className="bg-secondary/50 border border-border rounded-xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-xs">Semester</span>
                    <span className="text-foreground text-xs font-semibold">
                      {semester === '1st' ? '1st Semester' : semester === '2nd' ? '2nd Semester' : semester === '3rd' ? '3rd Semester' : 'Summer'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-xs">Academic Year</span>
                    <span className="text-foreground text-xs font-mono font-semibold">{academicYear}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-xs">Class Type</span>
                    <span className="text-xs font-semibold flex items-center gap-1.5">
                      {classType === 'executive' ? (
                        <span className="text-amber-400">Executive Only</span>
                      ) : classType === 'regular' ? (
                        <span className="text-[#10B981]">Regular Only</span>
                      ) : (
                        <span className="text-foreground">All Types</span>
                      )}
                    </span>
                  </div>
                </div>
                {classType !== 'all' && (
                  <div className="flex items-start gap-2 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                    <AlertTriangle className="size-4 text-amber-400 shrink-0 mt-0.5" />
                    <span className="text-amber-400/90 text-xs">
                      {classType === 'executive'
                        ? 'Executive classes will be taught by masteral faculty (those with master\'s degrees). Regular schedules will not be affected.'
                        : 'Both regular and masteral faculty will be scheduled for regular classes. Executive schedules will not be affected.'}
                    </span>
                  </div>
                )}
                <span className="block text-muted-foreground/70 text-[11px]">
                  This action will create a new schedule version. Existing schedules will not be modified.
                </span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 pt-2">
            <AlertDialogCancel className="border-border bg-secondary text-foreground hover:bg-secondary/80">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmGenerate}
              className="bg-gradient-to-r from-[#059669] to-[#10B981] text-white font-bold hover:shadow-[0_0_20px_-5px_rgba(5,150,105,0.5)]"
            >
              <Play className="size-4 mr-1.5" />
              Generate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
