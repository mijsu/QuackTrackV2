'use client'

import { useEffect, useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api, extractArray } from '@/lib/api'
import { useAppStore } from '@/store/app-store'
import { formatTime12 } from '@/lib/utils'
import { Minimize2 } from 'lucide-react'

interface ScheduleItem {
  id: string
  day: string
  startTime: string
  endTime: string
  subject: { subjectCode: string; subjectName: string; units: number }
  section: { sectionName: string; program?: { code: string } }
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
const DAY_FULL: Record<string, string> = {
  Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday',
  Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday',
}

export function ZenSchedule() {
  const { user, selectedScheduleVersionId, toggleZenMode } = useAppStore()

  // Clock state
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Day selector state
  const todayName = now.toLocaleDateString('en-US', { weekday: 'short' })

  // Fetch schedules
  const { data: schedulesData, isLoading } = useQuery({
    queryKey: ['zen-schedules', selectedScheduleVersionId, user?.id],
    queryFn: async () => {
      if (!selectedScheduleVersionId || !user?.id) return { data: [] }
      const r = await api.get<{ data: ScheduleItem[] }>(
        `/schedules?scheduleVersionId=${selectedScheduleVersionId}&facultyId=${user.id}&limit=100`
      )
      return r.data
    },
    enabled: !!selectedScheduleVersionId && !!user?.id,
  })

  const schedules = extractArray<ScheduleItem>(schedulesData)

  // Auto-select first day with data, or today
  const firstDayWithData = useMemo(() => {
    const todayKey = todayName as string
    if (schedules.some(s => s.day === todayKey)) return todayKey
    for (const d of DAYS) {
      if (schedules.some(s => s.day === d)) return d
    }
    return DAYS[0]
  }, [schedules, todayName])

  const [selectedDay, setSelectedDay] = useState<string>(() => firstDayWithData)

  const dayItems = useMemo(() =>
    schedules.filter(s => s.day === selectedDay)
      .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [schedules, selectedDay]
  )

  const timeStr = now.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  })
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  return (
    <div className="fixed inset-0 z-[999] bg-gradient-to-b from-background to-background/95 flex flex-col">
      {/* Exit button — floating, minimal */}
      <button
        onClick={toggleZenMode}
        className="absolute top-5 right-5 z-10 flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground/40 hover:text-foreground transition-all px-3 py-1.5 rounded-full border border-transparent hover:border-border/40"
      >
        <Minimize2 className="size-3" />
        Exit
      </button>

      {/* Main content — centered */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 overflow-y-auto">
        <div className="w-full max-w-md mx-auto text-center">

          {/* ── Large Live Clock ── */}
          <div className="mb-8">
            <p className="text-[10px] text-muted-foreground/40 font-mono uppercase tracking-[0.25em] mb-3">
              {dateStr}
            </p>
            <p className="text-6xl sm:text-8xl font-bold text-foreground font-mono tracking-tight leading-none mb-2 tabular-nums">
              {timeStr}
            </p>
            <p className="text-sm text-muted-foreground/60 font-medium">
              Good {now.getHours() < 12 ? 'morning' : now.getHours() < 18 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0] || 'there'}
            </p>
          </div>

          {/* ── Day Pills ── */}
          <div className="flex gap-1.5 justify-center mb-8">
            {DAYS.map(d => {
              const hasClass = schedules.some(s => s.day === d)
              const isToday = d === todayName
              const isActive = d === selectedDay
              return (
                <button
                  key={d}
                  onClick={() => setSelectedDay(d)}
                  disabled={!hasClass}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all uppercase tracking-widest ${
                    isActive
                      ? 'bg-foreground text-background shadow-sm'
                      : hasClass
                        ? 'text-muted-foreground/60 hover:text-foreground hover:bg-secondary/50'
                        : 'text-muted-foreground/15 cursor-default'
                  } ${isToday && !isActive ? 'ring-1 ring-foreground/10' : ''}`}
                >
                  {d}
                </button>
              )
            })}
          </div>

          {/* ── Schedule Cards ── */}
          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="size-4 border-[1.5px] border-foreground/20 border-t-foreground rounded-full animate-spin" />
            </div>
          ) : dayItems.length === 0 ? (
            <div className="py-10">
              <p className="text-sm text-muted-foreground/30 font-mono">No classes on {DAY_FULL[selectedDay]}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {dayItems.map((s) => (
                <div
                  key={s.id}
                  className="group flex items-center gap-4 px-4 py-3.5 rounded-xl bg-secondary/20 border border-border/30 transition-all hover:bg-secondary/40 hover:border-border/50"
                >
                  {/* Time column */}
                  <div className="shrink-0 w-14 text-right">
                    <p className="font-mono text-xs font-bold text-foreground/80 tabular-nums">
                      {formatTime12(s.startTime)}
                    </p>
                    <p className="font-mono text-[9px] text-muted-foreground/40 tabular-nums">
                      {formatTime12(s.endTime)}
                    </p>
                  </div>

                  {/* Divider */}
                  <div className="shrink-0 w-px h-10 bg-border/40" />

                  {/* Info */}
                  <div className="flex-1 min-w-0 text-left overflow-hidden">
                    <p className="text-sm font-semibold text-foreground whitespace-nowrap hover:animate-marquee">
                      {s.subject.subjectName}
                    </p>
                    <p className="text-[11px] text-muted-foreground/60 truncate mt-0.5">
                      {s.section.sectionName}
                      {s.section.program && <span className="ml-1 text-muted-foreground/40">— {s.section.program.code}</span>}
                    </p>
                  </div>

                  {/* Units badge */}
                  <div className="shrink-0">
                    <span className="font-mono text-[10px] text-muted-foreground/40 bg-secondary/50 px-2 py-1 rounded-md">
                      {s.subject.units}u
                    </span>
                  </div>
                </div>
              ))}

              {/* Summary */}
              <p className="text-center text-[9px] text-muted-foreground/25 font-mono pt-4 tracking-wider uppercase">
                {dayItems.length} class{dayItems.length !== 1 ? 'es' : ''} · {dayItems.reduce((a, s) => a + s.subject.units, 0)} total units
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
