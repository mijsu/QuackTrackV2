'use client'
/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, extractArray } from '@/lib/api'
import { useAppStore } from '@/store/app-store'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Settings2, Save, Loader2, Plus, X, Clock, CheckCircle2, AlertCircle } from 'lucide-react'
import { formatTime12, formatSpecialization } from '@/lib/utils'
import { Button } from '@/components/ui/button'


const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const TIME_OPTIONS = [
  '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
  '19:00', '19:30', '20:00', '20:30', '21:00',
]

interface FacultyUser {
  id: string
  name: string
  uid: string
  email: string
  specialization?: string | null
}

interface Subject {
  id: string
  subjectCode: string
  subjectName: string
  units: number
}

interface TimeSlotEntry {
  day: string
  start: string
  end: string
}

interface PreferenceData {
  id: string
  facultyId: string
  preferredDays: string | null
  preferredTimeStart: string | null
  preferredTimeEnd: string | null
  unavailableDays: string | null
  unavailableTimeSlots: string | null
  preferredSubjects: string | null
  maxUnitsOverride: number | null
  notes: string | null
  semester: string
  academicYear: string | null
  faculty?: { id: string; name: string; uid: string }
}

function parseTimeSlots(raw: string | null): TimeSlotEntry[] {
  if (!raw || !raw.trim()) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (s): s is TimeSlotEntry =>
          typeof s === 'object' && s !== null && typeof s.day === 'string' && typeof s.start === 'string' && typeof s.end === 'string'
      )
    }
  } catch {
    // not valid JSON, ignore
  }
  return []
}

function serializeTimeSlots(slots: TimeSlotEntry[]): string {
  return slots.length > 0 ? JSON.stringify(slots) : ''
}

export function PreferencesView() {
  const queryClient = useQueryClient()
  const user = useAppStore((s) => s.user)

  const [selectedFacultyId, setSelectedFacultyId] = useState<string>('')
  const [preferredDays, setPreferredDays] = useState<string[]>([])
  const [preferredTimeStart, setPreferredTimeStart] = useState('07:30')
  const [preferredTimeEnd, setPreferredTimeEnd] = useState('17:00')
  const [unavailableDays, setUnavailableDays] = useState<string[]>([])
  const [unavailableTimeSlots, setUnavailableTimeSlots] = useState<TimeSlotEntry[]>([])
  const [newSlotDay, setNewSlotDay] = useState('Mon')
  const [newSlotStart, setNewSlotStart] = useState('13:00')
  const [newSlotEnd, setNewSlotEnd] = useState('17:00')
  const [isAddingSlot, setIsAddingSlot] = useState(false)
  const [preferredSubjects, setPreferredSubjects] = useState<string[]>([])
  const [maxUnitsOverride, setMaxUnitsOverride] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [semester, setSemester] = useState('1st')
  const [academicYear, setAcademicYear] = useState(new Date().getFullYear().toString())

  // Track whether we have auto-selected the initial faculty
  const hasAutoSelectedRef = useRef(false)
  // Save feedback state
  const [saveFeedback, setSaveFeedback] = useState<'success' | 'error' | null>(null)

  // Fetch faculty list
  const { data: facultyData, isLoading: facultyLoading } = useQuery({
    queryKey: ['faculty-list'],
    queryFn: async () => {
      const r = await api.get<{ data: FacultyUser[]; pagination: unknown }>('/users?role=faculty&limit=100')
      return r.data
    },
  })
  const facultyList: FacultyUser[] = extractArray<FacultyUser>(facultyData)

  // Fetch subjects
  const { data: subjectsData } = useQuery({
    queryKey: ['subjects-list'],
    queryFn: async () => {
      const r = await api.get<{ data: Subject[]; pagination: unknown }>('/subjects?limit=200')
      return r.data
    },
  })
  const subjectsList: Subject[] = extractArray<Subject>(subjectsData)

  // Fetch preferences for selected faculty
  const { data: preferenceRaw, isLoading: prefLoading } = useQuery({
    queryKey: ['preferences', selectedFacultyId],
    queryFn: async () => {
      if (!selectedFacultyId) return null
      const r = await api.get<{ data: PreferenceData[]; pagination: unknown }>(`/preferences?facultyId=${selectedFacultyId}`)
      return r.data
    },
    enabled: !!selectedFacultyId,
  })
  const preferenceData: PreferenceData[] = extractArray<PreferenceData>(preferenceRaw)

  // Auto-select current user if they are faculty (runs once)
  useEffect(() => {
    if (facultyList.length > 0 && !selectedFacultyId && !hasAutoSelectedRef.current) {
      hasAutoSelectedRef.current = true
      if (user?.role === 'faculty' || user?.role === 'department_dean' || user?.role === 'program_head') {
        const found = facultyList.find((f) => f.id === user.id)
         
        setSelectedFacultyId(found ? found.id : facultyList[0].id)
      } else {
         
        setSelectedFacultyId(facultyList[0].id)
      }
    }
  }, [facultyList, selectedFacultyId, user])

  // Populate form when preference data changes
  const lastLoadedPrefIdRef = useRef<string | null>(null)
  const currentPrefId = preferenceData?.[0]?.id ?? null
  useEffect(() => {
    if (lastLoadedPrefIdRef.current === currentPrefId) return
    lastLoadedPrefIdRef.current = currentPrefId

    if (preferenceData && preferenceData.length > 0) {
      const pref = preferenceData[0]
       
      setPreferredDays(pref.preferredDays ? pref.preferredDays.split(',').filter(Boolean) : [])
       
      setPreferredTimeStart(pref.preferredTimeStart || '07:30')
       
      setPreferredTimeEnd(pref.preferredTimeEnd || '17:00')
       
      setUnavailableDays(pref.unavailableDays ? pref.unavailableDays.split(',').filter(Boolean) : [])
       
      setUnavailableTimeSlots(parseTimeSlots(pref.unavailableTimeSlots))
       
      setPreferredSubjects(pref.preferredSubjects ? pref.preferredSubjects.split(',').filter(Boolean) : [])
       
      setMaxUnitsOverride(pref.maxUnitsOverride?.toString() || '')
       
      setNotes(pref.notes || '')
       
      setSemester(pref.semester || '1st')
       
      setAcademicYear(pref.academicYear || new Date().getFullYear().toString())
    } else if (currentPrefId === null && selectedFacultyId) {
      // Reset form when there's no preference data (switched to a faculty with no prefs)
       
      setPreferredDays([])
       
      setPreferredTimeStart('07:30')
       
      setPreferredTimeEnd('17:00')
       
      setUnavailableDays([])
       
      setUnavailableTimeSlots([])
       
      setPreferredSubjects([])
       
      setMaxUnitsOverride('')
       
      setNotes('')
       
      setSemester('1st')
       
      setAcademicYear(new Date().getFullYear().toString())
    }
  }, [currentPrefId, preferenceData, selectedFacultyId])

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      return api.post<PreferenceData>('/preferences', {
        facultyId: selectedFacultyId,
        preferredDays: preferredDays.join(','),
        preferredTimeStart,
        preferredTimeEnd,
        unavailableDays: unavailableDays.join(','),
        unavailableTimeSlots: serializeTimeSlots(unavailableTimeSlots),
        preferredSubjects: preferredSubjects.join(','),
        maxUnitsOverride: maxUnitsOverride ? parseInt(maxUnitsOverride) : null,
        notes,
        semester,
        academicYear,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preferences', selectedFacultyId] })
      setSaveFeedback('success')
      setTimeout(() => setSaveFeedback(null), 3000)
    },
    onError: () => {
      setSaveFeedback('error')
      setTimeout(() => setSaveFeedback(null), 4000)
    },
  })

  const toggleDay = (day: string, list: string[], setter: (v: string[]) => void) => {
    setter(list.includes(day) ? list.filter((d) => d !== day) : [...list, day])
  }

  const toggleSubject = (subjectId: string) => {
    setPreferredSubjects((prev) =>
      prev.includes(subjectId) ? prev.filter((s) => s !== subjectId) : [...prev, subjectId]
    )
  }

  if (facultyLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 text-[#10B981] animate-spin" />
        <span className="ml-3 text-muted-foreground text-sm">Loading preferences...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[#10B981]/10">
            <Settings2 className="size-5 text-[#10B981]" />
          </div>
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">Preferences</h1>
            <p className="text-sm text-muted-foreground">Configure faculty scheduling preferences and constraints</p>
          </div>
        </div>
      </div>

      {/* Faculty Selector (hidden for faculty — they only see their own) */}
      {user?.role !== 'faculty' && (
      <div className="bg-card border border-border rounded-2xl p-6">
        <Label className="text-muted-foreground text-sm mb-2 block">Select Faculty</Label>
        <Select value={selectedFacultyId} onValueChange={setSelectedFacultyId}>
          <SelectTrigger className="w-full max-w-md bg-secondary border-border text-foreground">
            <SelectValue placeholder="Choose a faculty member..." />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            {facultyList.map((f) => (
              <SelectItem key={f.id} value={f.id} className="text-foreground focus:bg-accent focus:text-accent-foreground">
                {f.name} {f.specialization ? `— ${formatSpecialization(f.specialization)}` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      )}

      {prefLoading && selectedFacultyId ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-6 w-6 text-[#10B981] animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Preferred Days */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h2 className="font-heading font-bold text-foreground text-lg">Preferred Days</h2>
            <div className="flex flex-wrap gap-3">
              {DAYS.map((day) => (
                <label
                  key={day}
                  className="flex items-center gap-2 cursor-pointer select-none"
                >
                  <Checkbox
                    checked={preferredDays.includes(day)}
                    onCheckedChange={() => toggleDay(day, preferredDays, setPreferredDays)}
                    className="data-[state=checked]:bg-[#10B981] data-[state=checked]:border-[#10B981]"
                  />
                  <span className={`text-sm ${preferredDays.includes(day) ? 'text-[#10B981] font-medium' : 'text-muted-foreground'}`}>
                    {day}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Preferred Time Range */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h2 className="font-heading font-bold text-foreground text-lg">Preferred Time Range</h2>
            <div className="flex items-center gap-4">
              <div className="flex-1 space-y-1">
                <Label className="text-muted-foreground text-xs">Start Time</Label>
                <Select value={preferredTimeStart} onValueChange={setPreferredTimeStart}>
                  <SelectTrigger className="w-full bg-secondary border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border max-h-60">
                    {TIME_OPTIONS.map((t) => (
                      <SelectItem key={t} value={t} className="text-foreground focus:bg-accent focus:text-accent-foreground">
                        {formatTime12(t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <span className="text-muted-foreground mt-5">to</span>
              <div className="flex-1 space-y-1">
                <Label className="text-muted-foreground text-xs">End Time</Label>
                <Select value={preferredTimeEnd} onValueChange={setPreferredTimeEnd}>
                  <SelectTrigger className="w-full bg-secondary border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border max-h-60">
                    {TIME_OPTIONS.map((t) => (
                      <SelectItem key={t} value={t} className="text-foreground focus:bg-accent focus:text-accent-foreground">
                        {formatTime12(t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Unavailable Days/Times */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
            <h2 className="font-heading font-bold text-foreground text-lg">Unavailable Days & Times</h2>

            {/* Full-day unavailability */}
            <div className="space-y-3">
              <p className="text-muted-foreground text-xs uppercase tracking-wider font-medium">Entire days unavailable</p>
              <div className="flex flex-wrap gap-3">
                {DAYS.map((day) => (
                  <label
                    key={day}
                    className="flex items-center gap-2 cursor-pointer select-none"
                  >
                    <Checkbox
                      checked={unavailableDays.includes(day)}
                      onCheckedChange={() => toggleDay(day, unavailableDays, setUnavailableDays)}
                      className="data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"
                    />
                    <span className={`text-sm ${unavailableDays.includes(day) ? 'text-red-400 font-medium' : 'text-muted-foreground'}`}>
                      {day}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-border" />

            {/* Specific time-slot unavailability */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground text-xs uppercase tracking-wider font-medium">Specific unavailable time ranges</p>
                {!isAddingSlot && (
                  <button
                    type="button"
                    onClick={() => setIsAddingSlot(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[#10B981] hover:text-[#059669] transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Slot
                  </button>
                )}
              </div>

              {/* Add new slot form */}
              {isAddingSlot && (
                <div className="bg-secondary/60 border border-border rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Select value={newSlotDay} onValueChange={setNewSlotDay}>
                      <SelectTrigger className="w-24 bg-secondary border-border text-foreground font-mono text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        {DAYS.map((d) => (
                          <SelectItem key={d} value={d} className="text-foreground focus:bg-accent focus:text-accent-foreground">{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={newSlotStart} onValueChange={setNewSlotStart}>
                      <SelectTrigger className="w-28 bg-secondary border-border text-foreground font-mono text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border max-h-48">
                        {TIME_OPTIONS.map((t) => (
                          <SelectItem key={t} value={t} className="text-foreground font-mono focus:bg-accent focus:text-accent-foreground">{formatTime12(t)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-muted-foreground text-sm">–</span>
                    <Select value={newSlotEnd} onValueChange={setNewSlotEnd}>
                      <SelectTrigger className="w-28 bg-secondary border-border text-foreground font-mono text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border max-h-48">
                        {TIME_OPTIONS.map((t) => (
                          <SelectItem key={t} value={t} className="text-foreground font-mono focus:bg-accent focus:text-accent-foreground">{formatTime12(t)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (newSlotStart >= newSlotEnd) return // start must be before end
                        const entry: TimeSlotEntry = { day: newSlotDay, start: newSlotStart, end: newSlotEnd }
                        setUnavailableTimeSlots((prev) => [...prev, entry])
                        setIsAddingSlot(false)
                      }}
                      disabled={newSlotStart >= newSlotEnd}
                      className="px-4 py-1.5 rounded-lg bg-[#10B981] text-white text-xs font-semibold hover:bg-[#059669] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingSlot(false)}
                      className="px-4 py-1.5 rounded-lg border border-border text-muted-foreground text-xs font-medium hover:text-foreground transition-colors"
                    >
                      Cancel
                    </button>
                    {newSlotStart >= newSlotEnd && (
                      <span className="text-red-400 text-xs">End time must be after start time</span>
                    )}
                  </div>
                </div>
              )}

              {/* Display existing slots */}
              {unavailableTimeSlots.length === 0 && !isAddingSlot ? (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center mb-2">
                    <Clock className="h-5 w-5 text-muted-foreground/50" />
                  </div>
                  <p className="text-muted-foreground text-sm">No specific unavailable time ranges set</p>
                  <p className="text-muted-foreground/60 text-xs mt-0.5">Click "Add Slot" above to add one</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {unavailableTimeSlots.map((slot, idx) => (
                    <div
                      key={`${slot.day}-${slot.start}-${slot.end}-${idx}`}
                      className="flex items-center justify-between bg-secondary/40 border border-border/60 rounded-lg px-4 py-2.5"
                    >
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center justify-center w-12 h-7 rounded-md bg-red-500/10 text-red-400 text-xs font-bold">
                          {slot.day}
                        </span>
                        <span className="text-foreground text-sm font-medium">
                          {formatTime12(slot.start)} – {formatTime12(slot.end)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setUnavailableTimeSlots((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-muted-foreground/50 hover:text-red-400 transition-colors p-1 rounded-md hover:bg-red-500/10"
                        aria-label={`Remove ${slot.day} ${slot.start}–${slot.end}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Subject Preferences */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h2 className="font-heading font-bold text-foreground text-lg">Subject Preferences</h2>
            <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-2 pr-1">
              {subjectsList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center mb-2">
                    <Settings2 className="h-5 w-5 text-muted-foreground/50" />
                  </div>
                  <p className="text-muted-foreground text-sm">No subjects available</p>
                  <p className="text-muted-foreground/60 text-xs mt-0.5">Add subjects in the Curriculum section first</p>
                </div>
              ) : (
                subjectsList.map((subject) => (
                  <label
                    key={subject.id}
                    className="flex items-start gap-2 cursor-pointer select-none p-1.5 rounded-lg hover:bg-secondary/50 transition-colors"
                  >
                    <Checkbox
                      checked={preferredSubjects.includes(subject.id)}
                      onCheckedChange={() => toggleSubject(subject.id)}
                      className="mt-0.5 data-[state=checked]:bg-[#10B981] data-[state=checked]:border-[#10B981]"
                    />
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm ${preferredSubjects.includes(subject.id) ? 'text-[#10B981]' : 'text-foreground'}`}>
                        {subject.subjectCode}
                      </span>
                      <span className={`text-sm ml-2 ${preferredSubjects.includes(subject.id) ? 'text-[#10B981]/80' : 'text-muted-foreground'}`}>
                        {subject.subjectName}
                      </span>
                      <span className="text-muted-foreground text-xs ml-1 font-mono">({subject.units}u)</span>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Max Units Override */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h2 className="font-heading font-bold text-foreground text-lg">Max Units</h2>
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">Max Units Override</Label>
              <Input
                type="number"
                value={maxUnitsOverride}
                onChange={(e) => setMaxUnitsOverride(e.target.value)}
                placeholder="Leave empty for default"
                className="bg-secondary border-border text-foreground font-mono"
              />
              <p className="text-muted-foreground text-xs">Override the default max units for this faculty</p>
            </div>
          </div>

          {/* Additional Notes & Semester Info */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h2 className="font-heading font-bold text-foreground text-lg">Additional Info</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">Semester</Label>
                <Select value={semester} onValueChange={setSemester}>
                  <SelectTrigger className="w-full bg-secondary border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="1st" className="text-foreground focus:bg-accent focus:text-accent-foreground">1st Semester</SelectItem>
                    <SelectItem value="2nd" className="text-foreground focus:bg-accent focus:text-accent-foreground">2nd Semester</SelectItem>
                    <SelectItem value="summer" className="text-foreground focus:bg-accent focus:text-accent-foreground">Summer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">Academic Year</Label>
                <Input
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  placeholder="2025-2026"
                  className="bg-secondary border-border text-foreground font-mono"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">Additional Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional scheduling preferences or constraints..."
                className="bg-secondary border-border text-foreground min-h-[100px] resize-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Save Button & Feedback */}
      <div className="flex items-center justify-end gap-3">
        {saveFeedback === 'success' && (
          <div className="flex items-center gap-1.5 text-emerald-400 text-sm animate-in fade-in slide-in-from-right-2 duration-300">
            <CheckCircle2 className="size-4" />
            Preferences saved successfully!
          </div>
        )}
        {saveFeedback === 'error' && (
          <div className="flex items-center gap-1.5 text-red-400 text-sm animate-in fade-in slide-in-from-right-2 duration-300">
            <AlertCircle className="size-4" />
            Failed to save. Please try again.
          </div>
        )}
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !selectedFacultyId}
          className="h-11 px-8 bg-gradient-to-r from-[#059669] to-[#10B981] text-white font-bold rounded-full shadow-[0_0_20px_-5px_rgba(5,150,105,0.5)] hover:shadow-[0_0_25px_-5px_rgba(5,150,105,0.7)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saveMutation.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Save Preferences
        </Button>
      </div>
    </div>
  )
}
