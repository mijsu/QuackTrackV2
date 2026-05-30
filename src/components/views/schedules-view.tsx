'use client'

import React, { useState, useMemo, useEffect } from 'react'
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
  Calendar,
  Trash2,
  Upload,
  Zap,
  Users,
  Layers,
  ChevronRight,
  Search,
  Download,
  Loader2,
} from 'lucide-react'
import { formatTime12, formatSpecialization } from '@/lib/utils'
import { canPerformAction } from '@/lib/roles'
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

// --- Types ---
interface ScheduleVersion {
  id: string
  name: string
  description?: string
  semester: string
  academicYear: string
  status: string
  publishedAt?: string
  createdAt: string
  _count?: { schedules: number }
  publisher?: { id: string; name: string; uid: string }
}

interface ScheduleItem {
  id: string
  day: string
  startTime: string
  endTime: string
  subjectId: string
  facultyId: string
  sectionId: string
  scheduleVersionId: string
  status: string
  subject: { id: string; subjectCode: string; subjectName: string; units: number; subjectType: string }
  faculty: { id: string; name: string; uid: string; specialization?: string; facultyType?: string }
  section: { id: string; sectionName: string; yearLevel: number; program?: { code: string; name: string } }
}

interface FacultyItem {
  id: string
  name: string
  uid: string
  specialization?: string
  facultyType?: string
  department?: { name: string; code: string }
}

interface SectionItem {
  id: string
  sectionName: string
  yearLevel: number
  program?: { code: string; name: string }
}

// --- Constants ---
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
const DAY_LABELS: Record<string, string> = {
  Mon: 'MON', Tue: 'TUE', Wed: 'WED', Thu: 'THU', Fri: 'FRI', Sat: 'SAT',
}
const DAY_FULL: Record<string, string> = {
  Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday',
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status, type = 'version' }: { status: string; type?: 'version' | 'schedule' }) {
  const versionMap: Record<string, { cls: string; label: string }> = {
    draft: { cls: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20', label: 'Draft' },
    published: { cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', label: 'Finalized' },
    archived: { cls: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20', label: 'Archived' },
  }
  const scheduleMap: Record<string, { cls: string; label: string }> = {
    initial: { cls: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20', label: 'Initial Schedule' },
    finalized: { cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', label: 'Finalized Schedule' },
  }
  const map = type === 'version' ? versionMap : scheduleMap
  const entry = map[status] || (type === 'version' ? versionMap.draft : scheduleMap.initial)
  return <Badge className={`${entry.cls} border text-[10px] uppercase tracking-wider`}>{entry.label}</Badge>
}

// ─── Color mapping for class types (reference UI style) ───────────────────────
function getTypeColor(subjectType: string) {
  if (subjectType === 'lab') return { border: 'border-cyan-500', dot: 'bg-cyan-500', text: 'text-cyan-400' }
  if (subjectType === 'lecture_and_lab') return { border: 'border-amber-500', dot: 'bg-amber-500', text: 'text-amber-400' }
  return { border: 'border-emerald-500', dot: 'bg-emerald-500', text: 'text-emerald-400' }
}

// ─── Schedule Block Card (reference UI style) ─────────────────────────────────
function ClassCard({ classEntry, showSection, compact }: {
  classEntry: {
    startTime: string
    endTime: string
    subject: ScheduleItem['subject']
    section: ScheduleItem['section']
    faculty: ScheduleItem['faculty']
  }
  showSection?: boolean
  compact?: boolean
}) {
  const colors = getTypeColor(classEntry.subject.subjectType)
  const typeLabel = classEntry.subject.subjectType === 'lecture_and_lab' ? 'LEC & LAB' : classEntry.subject.subjectType === 'lab' ? 'LAB' : 'LEC'

  if (compact) {
    return (
      <div className={`bg-slate-800 border-l-4 ${colors.border} p-1.5 text-xs h-full overflow-hidden rounded-r`}>
        <p className={`${colors.text} font-semibold text-[10px] leading-snug`}>
          {formatTime12(classEntry.startTime)} – {formatTime12(classEntry.endTime)}
        </p>
        <p className="text-white font-bold text-[11px] mt-0.5 leading-tight truncate">
          {classEntry.subject.subjectCode}
        </p>
        <p className="text-slate-300 text-[10px] leading-tight line-clamp-1">
          {classEntry.subject.subjectName}
        </p>
        <p className={`${colors.text} font-semibold text-[9px] mt-0.5`}>
          {typeLabel}
        </p>
      </div>
    )
  }

  return (
    <div className={`bg-slate-800 border-l-4 ${colors.border} p-2 text-xs h-full overflow-hidden rounded-r`}>
      {/* Time range */}
      <p className={`${colors.text} font-semibold text-[11px] leading-snug`}>
        {formatTime12(classEntry.startTime)} – {formatTime12(classEntry.endTime)}
      </p>
      {/* Course code and name */}
      <p className="text-white font-bold text-[12px] mt-1">
        {classEntry.subject.subjectCode}
      </p>
      <p className="text-slate-300 text-[11px] leading-tight line-clamp-2">
        {classEntry.subject.subjectName}
      </p>
      {/* Section info (when viewing faculty schedule) */}
      {showSection && classEntry.section && (
        <p className="text-slate-400 text-[10px] mt-0.5">
          {classEntry.section.sectionName}{classEntry.section.program ? ` · ${classEntry.section.program.code}` : ''}
        </p>
      )}
      {/* Type tag */}
      <p className={`${colors.text} font-semibold text-[10px] mt-1`}>
        {typeLabel}
      </p>
    </div>
  )
}

// ─── Half-hour Grid Constants ─────────────────────────────────────────────────
const FIRST_HOUR = 7
const LAST_HOUR = 21
const HOUR_HEIGHT = 64  // px per hour
const HALF_HOUR_PX = 32 // px per half-hour

// Convert "HH:MM" 24h time to pixel Y offset from top of grid
function timeToY(time24: string): number {
  const [h, m] = time24.split(':').map(Number)
  return ((h - FIRST_HOUR) * 60 + m) / 60 * HOUR_HEIGHT
}

// Format hour number as 12h label
function formatHourLabel(hour: number): string {
  const period = hour >= 12 ? 'PM' : 'AM'
  const h12 = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour)
  return `${h12} ${period}`
}

// ─── Schedule Grid (half-hour offset grid) ────────────────────────────────────
function ScheduleGrid({
  schedules,
  filterFn,
  entityName,
  entitySub,
  onExportPdf,
  isExporting,
  showSection = false,
}: {
  schedules: ScheduleItem[]
  filterFn?: (s: ScheduleItem) => boolean
  entityName: string
  entitySub?: string
  onExportPdf?: () => void
  isExporting?: boolean
  showSection?: boolean
}) {
  // Merge consecutive slots for the same (day, subjectId, sectionId, facultyId)
  const mergedClasses = useMemo(() => {
    const groups = new Map<string, ScheduleItem[]>()
    schedules.forEach(s => {
      if (filterFn && !filterFn(s)) return
      const key = `${s.day}|${s.subjectId}|${s.sectionId}|${s.facultyId}`
      const arr = groups.get(key) || []
      arr.push(s)
      groups.set(key, arr)
    })

    const result: Array<{
      id: string
      day: string
      startTime: string
      endTime: string
      subject: ScheduleItem['subject']
      section: ScheduleItem['section']
      faculty: ScheduleItem['faculty']
    }> = []

    for (const [, items] of groups) {
      items.sort((a, b) => a.startTime.localeCompare(b.startTime))
      let i = 0
      while (i < items.length) {
        let mergedEnd = items[i].endTime
        let j = i + 1
        while (j < items.length && items[j].startTime === mergedEnd) {
          mergedEnd = items[j].endTime
          j++
        }
        result.push({
          id: `${items[i].id}-${i}`,
          day: items[i].day,
          startTime: items[i].startTime,
          endTime: mergedEnd,
          subject: items[i].subject,
          section: items[i].section,
          faculty: items[i].faculty,
        })
        i = j
      }
    }
    return result
  }, [schedules, filterFn])

  // Count classes per day
  const classesPerDay = DAYS.reduce((acc, day) => {
    acc[day] = mergedClasses.filter(c => c.day === day).length
    return acc
  }, {} as Record<string, number>)

  const total = mergedClasses.length

  // Generate hour list for grid lines and labels
  const hours = useMemo(() => {
    const list: number[] = []
    for (let h = FIRST_HOUR; h <= LAST_HOUR; h++) list.push(h)
    return list
  }, [])

  // Total grid height in pixels
  const gridHeight = (LAST_HOUR - FIRST_HOUR + 1) * HOUR_HEIGHT

  // Group merged classes by day
  const classesByDay = useMemo(() => {
    const map = new Map<string, typeof mergedClasses>()
    for (const c of mergedClasses) {
      const arr = map.get(c.day) || []
      arr.push(c)
      map.set(c.day, arr)
    }
    return map
  }, [mergedClasses])

  return (
    <div className="w-full bg-slate-950 text-slate-100 rounded-lg overflow-hidden flex flex-col" style={{ minHeight: gridHeight }}>
      {/* Header */}
      <div className="border-b border-slate-700 p-6 shrink-0">
        <div className="flex items-start justify-between mb-0">
          <div className="min-w-0">
            <h2 className="text-2xl font-bold text-white mb-1 truncate">
              {entityName}
            </h2>
            {entitySub && (
              <p className="text-sm text-slate-400 truncate">{entitySub}</p>
            )}
          </div>

          <div className="flex items-center gap-6 shrink-0 ml-4">
            {/* Legend */}
            <Legend />
            {/* Stats and PDF Button */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-300 font-mono whitespace-nowrap">
                {total} class{total !== 1 ? 'es' : ''}/wk
              </span>
              {onExportPdf && (
                <button
                  onClick={onExportPdf}
                  disabled={isExporting}
                  className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 px-4 py-2 rounded-full text-sm font-semibold transition-colors"
                >
                  {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  PDF
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Grid — half-hour offset grid */}
      <div className="hidden lg:flex lg:flex-col">
        {/* Header Row - Time Label + Days (fixed, not scrolling) */}
        <div className="flex shrink-0">
          {/* Time column header */}
          <div className="w-24 flex-shrink-0 border-r border-b border-slate-700 bg-emerald-600">
            <div className="h-12 flex items-center justify-center">
              <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                TIME
              </span>
            </div>
          </div>

          {/* Day headers */}
          <div className="flex flex-1">
            {DAYS.map((day) => (
              <div
                key={day}
                className="flex-1 border-r border-b border-slate-700 text-center bg-emerald-600"
              >
                <div className="px-2 py-2">
                  <p className="text-xs font-bold text-white uppercase tracking-wider">
                    {DAY_LABELS[day]}
                  </p>
                  <p className="text-[10px] text-white/70 mt-0.5">
                    {classesPerDay[day] || 0}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Grid body — full height, page scrolls */}
        <div>
          <div className="relative" style={{ height: gridHeight }}>
            {/* ── Time column background (continuous) ── */}
            <div className="absolute left-0 w-24 top-0 bottom-0 bg-slate-900 border-r border-slate-700" />

            {/* ── Time labels — absolutely positioned at exact Y coordinates ── */}
            {hours.map((hour) => {
              const top = (hour - FIRST_HOUR) * HOUR_HEIGHT
              return (
                <div
                  key={hour}
                  className="absolute left-0 w-24 flex items-center justify-center"
                  style={{ top, height: HOUR_HEIGHT }}
                >
                  <span className="text-[11px] font-semibold text-white tabular-nums relative z-10 bg-slate-900 px-1">
                    {formatHourLabel(hour)}
                  </span>
                </div>
              )
            })}

            {/* ── Full-hour grid lines — full width (spanning time column + calendar) ── */}
            {hours.map((hour) => (
              <div
                key={`h-${hour}`}
                className="absolute left-0 right-0 border-t border-slate-600/50"
                style={{ top: (hour - FIRST_HOUR) * HOUR_HEIGHT }}
              />
            ))}

            {/* ── Day columns container (same Y coordinate system) ── */}
            <div className="absolute left-24 right-0 top-0 bottom-0 flex">
              {/* Day columns with absolutely-positioned schedule cards */}
              {DAYS.map((day, dayIdx) => {
                const dayClasses = classesByDay.get(day) || []
                const colPercent = 100 / DAYS.length

                return (
                  <div
                    key={day}
                    className="flex-1 relative overflow-hidden"
                    style={{
                      borderRight: dayIdx < DAYS.length - 1 ? '1px solid rgba(51, 65, 85, 0.3)' : undefined,
                    }}
                  >
                    {dayClasses.map((classEntry) => {
                      // Card starts at the half-line of start hour (lower half of start)
                      // Card ends at the half-line of end hour (lower half of end)
                      const cardTop = timeToY(classEntry.startTime) + HALF_HOUR_PX
                      const cardBottom = timeToY(classEntry.endTime) + HALF_HOUR_PX
                      const cardHeight = Math.max(cardBottom - cardTop, 20)

                      // Use compact layout for short cards (< 1.5 hours)
                      const isCompact = cardHeight < HOUR_HEIGHT * 1.5

                      return (
                        <div
                          key={classEntry.id}
                          className="absolute left-1.5 right-1.5 z-10"
                          style={{ top: cardTop + 3, height: cardHeight - 6 }}
                        >
                          <ClassCard
                            classEntry={classEntry}
                            showSection={showSection}
                            compact={isCompact}
                          />
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile */}
      <div className="lg:hidden p-4">
        <MobileView schedules={schedules} filterFn={filterFn} />
      </div>
    </div>
  )
}

// ─── Legend ───────────────────────────────────────────────────────────────────
function Legend() {
  return (
    <div className="hidden sm:flex items-center gap-3">
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-emerald-500" />
        <span className="text-xs text-slate-300 whitespace-nowrap">Lecture</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-cyan-500" />
        <span className="text-xs text-slate-300 whitespace-nowrap">Laboratory</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-amber-500" />
        <span className="text-xs text-slate-300 whitespace-nowrap">Lec & Lab</span>
      </div>
    </div>
  )
}

// ─── Mobile Day View ──────────────────────────────────────────────────────────
function MobileView({ schedules, filterFn }: { schedules: ScheduleItem[]; filterFn?: (s: ScheduleItem) => boolean }) {
  const firstDayWithData = useMemo(() => {
    for (const d of DAYS) {
      if (schedules.some(s => (!filterFn || filterFn(s)) && s.day === d)) return d
    }
    return DAYS[0]
  }, [schedules, filterFn])

  const [day, setDay] = useState<string>(() => firstDayWithData)

  const items = useMemo(() => schedules.filter(s => (!filterFn || filterFn(s)) && s.day === day), [schedules, filterFn, day])

  // Merge consecutive slots for mobile view too — same logic as desktop grid
  const merged = useMemo(() => {
    // Group by (subjectId, sectionId, facultyId) for the selected day
    const groups = new Map<string, ScheduleItem[]>()
    for (const s of items) {
      const key = `${s.subjectId}|${s.sectionId}|${s.facultyId}`
      const arr = groups.get(key) || []
      arr.push(s)
      groups.set(key, arr)
    }

    const result: Array<{ start: string; end: string; items: ScheduleItem[] }> = []
    for (const [, groupItems] of groups) {
      groupItems.sort((a, b) => a.startTime.localeCompare(b.startTime))
      let i = 0
      while (i < groupItems.length) {
        let mergedStart = groupItems[i].startTime
        let mergedEnd = groupItems[i].endTime
        const mergedItems: ScheduleItem[] = [groupItems[i]]
        let j = i + 1
        while (j < groupItems.length && groupItems[j].startTime === mergedEnd) {
          mergedEnd = groupItems[j].endTime
          mergedItems.push(groupItems[j])
          j++
        }
        result.push({ start: mergedStart, end: mergedEnd, items: mergedItems })
        i = j
      }
    }

    result.sort((a, b) => a.start.localeCompare(b.start))
    return result
  }, [items])

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
        {DAYS.map(d => (
          <button key={d} onClick={() => setDay(d)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap uppercase tracking-wider ${
              day === d ? 'bg-emerald-600 text-white shadow-md' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {DAY_FULL[d]}
          </button>
        ))}
      </div>
      {merged.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">No classes on {DAY_FULL[day]}</div>
      ) : (
        <div className="space-y-3">
          {merged.map(({ start, end, items }) => {
            // Check if items are consecutive slots of same section vs merged classes
            const allSameSection = items.every(i => i.sectionId === items[0].sectionId)
            return (
              <div key={start} className="border border-border rounded-lg overflow-hidden">
                <div className="bg-muted/50 px-3 py-2 border-b border-border flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-foreground">{formatTime12(start)} – {formatTime12(end)}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">{items.length} class{items.length !== 1 ? 'es' : ''}</span>
                </div>
                <div className="divide-y divide-border">
                  {allSameSection && items.length > 1 ? (
                    // Consecutive slots — show one ClassCard with merged time
                    <div className="p-3">
                      <ClassCard classEntry={{ ...items[0], startTime: start, endTime: end }} />
                    </div>
                  ) : (
                    items.map(i => <div key={i.id} className="p-3"><ClassCard classEntry={i} /></div>)
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Sidebar Entity Card ──────────────────────────────────────────────────────
function EntityCard({ name, sub, badge, isSelected, onClick }: {
  name: string; sub?: string; badge?: string; isSelected: boolean; onClick: () => void
}) {
  return (
    <button onClick={onClick}
      className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all ${
        isSelected
          ? 'border-emerald-500/50 bg-emerald-500/5 shadow-sm ring-1 ring-emerald-500/20'
          : 'border-transparent hover:bg-muted/50 hover:border-border'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className={`text-xs font-semibold truncate ${isSelected ? 'text-emerald-700 dark:text-emerald-300' : 'text-foreground'}`}>
            {name}
          </p>
          {sub && <p className="text-[10px] text-muted-foreground truncate mt-0.5">{sub}</p>}
        </div>
        {badge && (
          <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-md shrink-0 ${
            isSelected ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground'
          }`}>
            {badge}
          </span>
        )}
      </div>
    </button>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function SchedulesView() {
  const queryClient = useQueryClient()
  const { user, selectedScheduleVersionId, setSelectedScheduleVersionId, setCurrentView } = useAppStore()
  const [viewMode, setViewMode] = useState<'faculty' | 'section'>('faculty')
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>('')
  const [selectedSectionId, setSelectedSectionId] = useState<string>('')
  const [classFilter, setClassFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [isExporting, setIsExporting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-select the logged-in faculty user
  const isFacultyUser = user?.role === 'faculty'
  useEffect(() => {
    if (isFacultyUser && user?.id && selectedFacultyId !== user.id) {
      setSelectedFacultyId(user.id)
    }
  }, [isFacultyUser, user?.id, selectedFacultyId])

  // Role-based permission flags
  const canFinalize = canPerformAction(user?.role, 'finalizeSchedule')
  const canDelete = canPerformAction(user?.role, 'deleteSchedule')
  const canExport = canPerformAction(user?.role, 'exportReport')
  const canGenerate = canPerformAction(user?.role, 'generateSchedule')

  const { data: versionsData, isLoading: versionsLoading } = useQuery({
    queryKey: ['schedule-versions'],
    queryFn: async () => { const r = await api.get<{ data: ScheduleVersion[]; pagination: { total: number } }>('/schedule-versions'); return r.data },
  })
  const versions: ScheduleVersion[] = extractArray<ScheduleVersion>(versionsData)

  // Always default to the latest version (versions[0] is newest per API sort).
  // Only use selectedScheduleVersionId if it's the latest or was explicitly
  // chosen by the user via the dropdown (which sets it in the store).
  const [userChosenVersion, setUserChosenVersion] = useState<string | null>(null)
  const currentVersionId = userChosenVersion || (versions.length > 0 ? versions[0].id : '')
  const currentVersion = versions.find(v => v.id === currentVersionId)

  // Sync the store when the latest version loads (but don't override user choice)
  useEffect(() => {
    if (versions.length > 0) {
      const latest = versions[0].id
      if (selectedScheduleVersionId !== latest && !userChosenVersion) {
        setSelectedScheduleVersionId(latest)
      }
    }
  }, [versions, selectedScheduleVersionId, setSelectedScheduleVersionId, userChosenVersion])

  const { data: schedulesData, isLoading: schedulesLoading } = useQuery({
    queryKey: ['schedules', currentVersionId],
    queryFn: async () => { if (!currentVersionId) return null; const r = await api.get<{ data: ScheduleItem[]; pagination: { total: number } }>(`/schedules?scheduleVersionId=${currentVersionId}&limit=500`); return r.data },
    enabled: !!currentVersionId,
  })
  const schedules: ScheduleItem[] = extractArray<ScheduleItem>(schedulesData)

  const { data: facultyData } = useQuery({
    queryKey: ['faculty-list', classFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ role: 'faculty', limit: '100' })
      if (classFilter === 'regular') params.set('facultyType', 'regular')
      else if (classFilter === 'executive') params.set('facultyType', 'masteral')
      const r = await api.get<{ data: FacultyItem[] }>(`/users?${params.toString()}`)
      return r.data
    },
  })
  const facultyList: FacultyItem[] = extractArray<FacultyItem>(facultyData)

  const { data: sectionsData } = useQuery({
    queryKey: ['sections-list'],
    queryFn: async () => { const r = await api.get<{ data: SectionItem[] }>('/sections?limit=100'); return r.data },
  })
  const sectionList: SectionItem[] = extractArray<SectionItem>(sectionsData)

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => apiThrow(api.put(`/schedule-versions/${id}`, { status })),
    onSuccess: () => { setError(null); queryClient.invalidateQueries({ queryKey: ['schedule-versions'] }) },
    onError: (error: Error) => { console.error('Status update failed:', error); setError(error.message || 'An unexpected error occurred') },
  })
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiThrow(api.delete(`/schedule-versions/${id}`)),
    onSuccess: () => { setError(null); setShowDeleteConfirm(false); setSelectedScheduleVersionId(null); queryClient.invalidateQueries({ queryKey: ['schedule-versions'] }) },
    onError: (error: Error) => { console.error('Delete schedule version failed:', error); setShowDeleteConfirm(false); setError(error.message || 'An unexpected error occurred') },
  })

  // Filter schedules by class type (faculty type of the assigned professor)
  const classFilteredSchedules = useMemo(() => {
    if (classFilter === 'all') return schedules
    if (classFilter === 'regular') return schedules.filter(s => s.faculty.facultyType === 'regular')
    if (classFilter === 'executive') return schedules.filter(s => s.faculty.facultyType === 'masteral')
    return schedules
  }, [schedules, classFilter])

  const facultyStats = useMemo(() => {
    const s: Record<string, { count: number; units: number }> = {}
    classFilteredSchedules.forEach(sc => { if (!s[sc.facultyId]) s[sc.facultyId] = { count: 0, units: 0 }; s[sc.facultyId].count++; s[sc.facultyId].units += sc.subject?.units || 0 })
    return s
  }, [classFilteredSchedules])

  const sectionStats = useMemo(() => {
    const s: Record<string, number> = {}
    classFilteredSchedules.forEach(sc => { s[sc.sectionId] = (s[sc.sectionId] || 0) + 1 })
    return s
  }, [classFilteredSchedules])

  const facultyFilter = useMemo(() => selectedFacultyId ? ((s: ScheduleItem) => s.facultyId === selectedFacultyId) : undefined, [selectedFacultyId])
  const sectionFilter = useMemo(() => selectedSectionId ? ((s: ScheduleItem) => s.sectionId === selectedSectionId) : undefined, [selectedSectionId])

  const selectedFaculty = facultyList.find(f => f.id === selectedFacultyId)
  const selectedSection = sectionList.find(s => s.id === selectedSectionId)

  const sortedFaculty = useMemo(() => {
    const q = search.toLowerCase()
    return [...facultyList]
      .filter(f => !q || f.name.toLowerCase().includes(q) || formatSpecialization(f.specialization).toLowerCase().includes(q))
      .sort((a, b) => {
        const ac = facultyStats[a.id]?.count || 0, bc = facultyStats[b.id]?.count || 0
        return bc - ac || a.name.localeCompare(b.name)
      })
  }, [facultyList, facultyStats, search])

  const sortedSections = useMemo(() => {
    const q = search.toLowerCase()
    return [...sectionList]
      .filter(s => !q || s.sectionName.toLowerCase().includes(q) || (s.program && s.program.code.toLowerCase().includes(q)))
      .sort((a, b) => (sectionStats[b.id] || 0) - (sectionStats[a.id] || 0) || a.sectionName.localeCompare(b.sectionName))
  }, [sectionList, sectionStats, search])

  const hasSelection = (viewMode === 'faculty' && selectedFacultyId) || (viewMode === 'section' && selectedSectionId)

  const handleExportPdf = async () => {
    if (!selectedFacultyId || !currentVersionId) return
    setIsExporting(true)
    try {
      const url = `/api/export/faculty-schedule?facultyId=${selectedFacultyId}&scheduleVersionId=${currentVersionId}`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Export failed')

      // Get the PDF blob and trigger automatic download
      const blob = await res.blob()
      const downloadUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      // Use filename from Content-Disposition header, or fallback
      const contentDisposition = res.headers.get('Content-Disposition')
      const match = contentDisposition?.match(/filename="?(.+?)"?$/)
      a.download = match?.[1] || 'schedule.pdf'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(downloadUrl)
    } catch (err) {
      console.error('Export error:', err)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="flex flex-col min-h-0 lg:min-h-[calc(100dvh-6.5rem)]">
      {/* Error Banner */}
      {error && (
        <div className="px-4 py-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center mb-4">
          {error}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-[#10B981]/10 sm:p-2">
            <Calendar className="size-4 sm:size-5 text-[#10B981]" />
          </div>
          <div className="min-w-0">
            <h1 className="font-heading text-xl sm:text-3xl font-bold text-foreground leading-tight">Schedules</h1>
            {currentVersion && (
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap text-[11px] sm:text-xs">
                <StatusBadge status={currentVersion.status} />
                <span className="text-muted-foreground">Sem: <span className="font-mono text-foreground">{currentVersion.semester}</span></span>
                <span className="text-muted-foreground">AY: <span className="font-mono text-foreground">{currentVersion.academicYear}</span></span>
                <span className="text-muted-foreground hidden sm:inline">Schedules: <span className="font-mono text-[#10B981]">{currentVersion._count?.schedules || schedules.length}</span></span>
              </div>
            )}
            {!currentVersion && (
              <p className="text-sm text-muted-foreground">Faculty &amp; section weekly timetables</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap sm:gap-3">
          <Select value={currentVersionId} onValueChange={(val) => {
            setUserChosenVersion(val)
            setSelectedScheduleVersionId(val)
          }}>
            <SelectTrigger className="w-full sm:w-[260px] bg-card border-border text-foreground text-xs sm:text-sm">
              <SelectValue placeholder="Select schedule version" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              {versions.map(v => (
                <SelectItem key={v.id} value={v.id} className="text-foreground focus:bg-accent focus:text-accent-foreground">
                  <div className="flex items-center gap-2"><span>{v.name}</span><StatusBadge status={v.status} /></div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {currentVersion && canFinalize && (
            <Button
              onClick={() => {
                const nextStatus = currentVersion.status === 'draft' ? 'published' : 'draft'
                statusMutation.mutate({ id: currentVersionId, status: nextStatus })
              }}
              disabled={statusMutation.isPending}
              className={`${
                currentVersion.status === 'draft'
                  ? 'bg-gradient-to-r from-[#059669] to-[#10B981] text-white shadow-[0_0_20px_-5px_rgba(5,150,105,0.5)] hover:shadow-[0_0_25px_-5px_rgba(5,150,105,0.7)]'
                  : 'bg-gradient-to-r from-yellow-500 to-amber-500 text-white shadow-[0_0_20px_-5px_rgba(245,158,11,0.5)] hover:shadow-[0_0_25px_-5px_rgba(245,158,11,0.7)]'
              } font-bold rounded-full transition-all`}
            >
              {currentVersion.status === 'draft' ? (
                <><Upload className="size-4" />Finalize</>
              ) : (
                <><Zap className="size-4" />Revert to Draft</>
              )}
            </Button>
          )}
          {currentVersion && canDelete && (
            <Button variant="outline" onClick={() => setShowDeleteConfirm(true)} disabled={deleteMutation.isPending}
              className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-full">
              <Trash2 className="size-4" />Delete
            </Button>
          )}
        </div>
      </div>

      {/* Empty State */}
      {!currentVersionId && !versionsLoading && (
        <div className="flex flex-col items-center justify-center py-20 flex-1">
          <div className="p-4 rounded-2xl bg-[#10B981]/10 mb-4"><Calendar className="size-10 text-[#10B981]" /></div>
          <h3 className="font-heading text-xl font-bold text-foreground mb-2">No Schedule Version Selected</h3>
          <p className="text-muted-foreground text-sm mb-6 text-center max-w-md">Generate a new schedule to get started, or select an existing version.</p>
          {canGenerate && (
            <Button onClick={() => setCurrentView('generate')}
              className="bg-gradient-to-r from-[#059669] to-[#10B981] text-white font-bold rounded-full shadow-[0_0_20px_-5px_rgba(5,150,105,0.5)] hover:shadow-[0_0_25px_-5px_rgba(5,150,105,0.7)] transition-all">
              <Zap className="size-4" />Generate Schedule<ChevronRight className="size-4" />
            </Button>
          )}
        </div>
      )}

      {/* Loading */}
      {(versionsLoading || schedulesLoading) && currentVersionId && (
        <div className="bg-card border border-border rounded-2xl p-12 flex items-center justify-center flex-1">
          <div className="flex items-center gap-3">
            <div className="size-5 border-2 border-[#10B981] border-t-transparent rounded-full animate-spin" />
            <span className="text-muted-foreground text-sm">Loading schedules...</span>
          </div>
        </div>
      )}

      {/* ─── Main Layout: Sidebar + Grid ─── */}
      {currentVersionId && !schedulesLoading && (
        <div className="relative mt-4">
          {/* Sidebar — absolute so it fills calendar height without pushing row taller */}
          {!isFacultyUser && <div className="absolute left-0 top-0 bottom-0 w-[280px] hidden lg:block">
            <div className="h-full bg-card border border-border rounded-xl overflow-hidden shadow-sm flex flex-col">

              {/* Filter controls at top */}
              <div className="p-3 border-b border-border space-y-2.5">
                {/* View Mode: Faculty / Section dropdown */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">View By</label>
                  <Select value={viewMode} onValueChange={(v: 'faculty' | 'section') => { setViewMode(v); setSearch(''); if (v === 'faculty') setSelectedSectionId(''); else setSelectedFacultyId('') }}>
                    <SelectTrigger className="w-full bg-secondary border-border text-foreground h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="faculty" className="text-foreground focus:bg-accent focus:text-accent-foreground">
                        <div className="flex items-center gap-2"><Users className="size-3" /> Faculty</div>
                      </SelectItem>
                      <SelectItem value="section" className="text-foreground focus:bg-accent focus:text-accent-foreground">
                        <div className="flex items-center gap-2"><Layers className="size-3" /> Sections</div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Class Type: All / Regular / Executive dropdown */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Class Type</label>
                  <Select value={classFilter} onValueChange={(v) => {
                    setClassFilter(v)
                    // Clear selection when switching class type since the selected
                    // faculty/section might not exist in the new filtered list
                    // The facultyStats will recalculate and the UI will show
                    // "Select a Faculty Member" prompt
                    setSelectedFacultyId('')
                    setSelectedSectionId('')
                  }}>
                    <SelectTrigger className="w-full bg-secondary border-border text-foreground h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="all" className="text-foreground focus:bg-accent focus:text-accent-foreground">
                        All Classes
                      </SelectItem>
                      <SelectItem value="regular" className="text-foreground focus:bg-accent focus:text-accent-foreground">
                        Regular
                      </SelectItem>
                      <SelectItem value="executive" className="text-foreground focus:bg-accent focus:text-accent-foreground">
                        Executive
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder={viewMode === 'faculty' ? 'Search faculty...' : 'Search sections...'}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50"
                  />
                </div>
              </div>

              {/* List */}
              <div className="flex-1 min-h-0 overflow-auto custom-scrollbar p-2 space-y-0.5">
                {viewMode === 'faculty' ? sortedFaculty.map(f => (
                  <EntityCard
                    key={f.id}
                    name={f.name}
                    sub={formatSpecialization(f.specialization) || (f.facultyType === 'masteral' ? 'Masteral' : 'Regular')}
                    badge={facultyStats[f.id]?.count ? `${facultyStats[f.id].count}` : undefined}
                    isSelected={selectedFacultyId === f.id}
                    onClick={() => setSelectedFacultyId(f.id)}
                  />
                )) : sortedSections.map(s => (
                  <EntityCard
                    key={s.id}
                    name={s.sectionName}
                    sub={s.program ? `${s.program.code} · Year ${s.yearLevel}` : undefined}
                    badge={sectionStats[s.id] ? `${sectionStats[s.id]}` : undefined}
                    isSelected={selectedSectionId === s.id}
                    onClick={() => setSelectedSectionId(s.id)}
                  />
                ))}
              </div>

              {/* Footer stat */}
              <div className="px-3 py-2.5 border-t border-border bg-muted/30">
                <p className="text-[10px] text-muted-foreground font-mono text-center">
                  {viewMode === 'faculty' ? sortedFaculty.length : sortedSections.length} {viewMode === 'faculty' ? 'faculty' : 'sections'}
                  {classFilter !== 'all' && <span className="ml-1 text-emerald-500">({classFilter === 'executive' ? 'Executive' : 'Regular'})</span>}
                </p>
              </div>
            </div>
          </div>}

          {!isFacultyUser && <div className="lg:hidden w-full space-y-4">
            <div className="flex gap-2 flex-wrap">
              <Select value={viewMode} onValueChange={(v: 'faculty' | 'section') => { setViewMode(v); setSearch(''); if (v === 'faculty') setSelectedSectionId(''); else setSelectedFacultyId('') }}>
                <SelectTrigger className="w-[120px] bg-card border-border text-foreground"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="faculty">Faculty</SelectItem>
                  <SelectItem value="section">Sections</SelectItem>
                </SelectContent>
              </Select>
              <Select value={classFilter} onValueChange={(v) => {
                setClassFilter(v)
                setSelectedFacultyId('')
                setSelectedSectionId('')
              }}>
                <SelectTrigger className="w-[140px] bg-card border-border text-foreground"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="all">All Classes</SelectItem>
                  <SelectItem value="regular">Regular</SelectItem>
                  <SelectItem value="executive">Executive</SelectItem>
                </SelectContent>
              </Select>
              {viewMode === 'faculty' ? (
                <Select value={selectedFacultyId || undefined} onValueChange={setSelectedFacultyId}>
                  <SelectTrigger className="flex-1 bg-card border-border text-foreground"><SelectValue placeholder="Select faculty..." /></SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {sortedFaculty.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Select value={selectedSectionId || undefined} onValueChange={setSelectedSectionId}>
                  <SelectTrigger className="flex-1 bg-card border-border text-foreground"><SelectValue placeholder="Select section..." /></SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {sortedSections.map(s => <SelectItem key={s.id} value={s.id}>{s.sectionName} {s.program ? `— ${s.program.code}` : ''}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>}

          {/* Calendar — determines row height; offset to leave room for the absolute sidebar */}
          <div className="lg:ml-[296px]">
            {viewMode === 'faculty' && selectedFacultyId && selectedFaculty ? (
              <ScheduleGrid
                schedules={classFilteredSchedules}
                filterFn={facultyFilter}
                entityName={selectedFaculty.name}
                entitySub={`${formatSpecialization(selectedFaculty.specialization) || (selectedFaculty.facultyType === 'masteral' ? 'Executive' : 'Regular')} · ${facultyStats[selectedFacultyId]?.units || 0} units · ${currentVersion?.academicYear} · ${currentVersion?.semester}`}
                onExportPdf={canExport ? handleExportPdf : undefined}
                isExporting={isExporting}
                showSection
              />
            ) : viewMode === 'section' && selectedSectionId && selectedSection ? (
              <ScheduleGrid
                schedules={classFilteredSchedules}
                filterFn={sectionFilter}
                entityName={selectedSection.sectionName}
                entitySub={`${selectedSection.program?.code || 'Section'} · Year ${selectedSection.yearLevel} · ${currentVersion?.academicYear} · ${currentVersion?.semester}`}
              />
            ) : (
              <div className="bg-card border border-border rounded-xl flex flex-col items-center justify-center py-24 shadow-sm h-full">
                <div className="p-5 rounded-2xl bg-muted/50 mb-5">
                  {viewMode === 'faculty'
                    ? <Users className="size-9 text-muted-foreground/50" />
                    : <Layers className="size-9 text-muted-foreground/50" />
                  }
                </div>
                <h3 className="font-heading text-lg font-bold text-foreground mb-1.5">
                  {viewMode === 'faculty' ? 'Select a Faculty Member' : 'Select a Section'}
                </h3>
                <p className="text-sm text-muted-foreground text-center max-w-xs">
                  {viewMode === 'faculty'
                    ? 'Choose a faculty member from the sidebar to view their individual weekly schedule.'
                    : 'Choose a section from the sidebar to view their weekly class schedule.'}
                </p>
                {classFilter !== 'all' && (
                  <Badge className="mt-3 bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20 border text-xs">
                    {classFilter === 'executive' ? 'Executive' : 'Regular'} class filter active
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="bg-card border-border text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete Schedule Version</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This will permanently delete this schedule version and all its schedules. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-border text-muted-foreground hover:bg-secondary/50">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { deleteMutation.mutate(currentVersionId); setShowDeleteConfirm(false) }}
              disabled={deleteMutation.isPending}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
