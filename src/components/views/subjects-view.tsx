'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, apiThrow, extractArray } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BookOpen, Plus, Search, Pencil, Trash2 } from 'lucide-react'
import { formatYearLevel, formatSemester } from '@/lib/utils'
import { canPerformAction } from '@/lib/roles'
import { useAppStore } from '@/store/app-store'

/* ── Types ─────────────────────────────────────────────────── */
interface Department {
  id: string
  name: string
  code: string
}

interface Program {
  id: string
  name: string
  code: string
}

interface Subject {
  id: string
  subjectCode: string
  subjectName: string
  description: string | null
  units: number
  subjectType: string
  yearLevel: number
  semester: string
  programId: string
  departmentId: string
  classType: string
  requiredSpecialization: string | null
  requiredEquipment: string | null
  defaultDurationHours: number
  lectureHours: number
  labHours: number
  isActive: boolean
  department: Department
  program: Program
  _count: {
    schedules: number
  }
}

const emptyForm = {
  subjectCode: '',
  subjectName: '',
  description: '',
  units: '3',
  programId: '',
  departmentId: '',
  subjectType: 'lecture',
  classType: 'regular',
  yearLevel: '1',
  semester: '1st',
  requiredSpecialization: '',
  requiredEquipment: '',
  defaultDurationHours: '1.5',
  lectureHours: '1.5',
  labHours: '0',
}

function subjectTypeLabel(t: string) {
  return t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function subjectTypeColor(t: string) {
  switch (t) {
    case 'lecture': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    case 'lab': case 'laboratory': return 'bg-sky-500/20 text-sky-400 border-sky-500/30'
    case 'lecture_and_lab': return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    default: return 'bg-secondary/50 text-muted-foreground border-border'
  }
}

/* ── Component ─────────────────────────────────────────────── */
export function SubjectsView() {
  const qc = useQueryClient()
  const { user } = useAppStore()
  const canEdit = canPerformAction(user?.role, 'editCurriculum')

  const [search, setSearch] = useState('')
  const [filterDept, setFilterDept] = useState('all')
  const [filterProgram, setFilterProgram] = useState('all')
  const [filterSemester, setFilterSemester] = useState('all')
  const [filterYear, setFilterYear] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  /* Queries */
  const { data: subjectsData, isLoading } = useQuery({
    queryKey: ['subjects', search, filterDept, filterProgram, filterSemester, filterYear],
    queryFn: () => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (filterDept !== 'all') params.set('departmentId', filterDept)
      if (filterProgram !== 'all') params.set('programId', filterProgram)
      if (filterSemester !== 'all') params.set('semester', filterSemester)
      if (filterYear !== 'all') params.set('yearLevel', filterYear)
      return api.get<{ data: Subject[]; pagination: { total: number } }>(`/subjects?${params.toString()}`)
    },
  })

  const { data: departmentsData } = useQuery({
    queryKey: ['departments-list'],
    queryFn: () => api.get<Department[]>('/departments'),
  })

  const { data: programsData } = useQuery({
    queryKey: ['programs-list'],
    queryFn: () => api.get<Program[]>('/programs'),
  })

  const deptList = extractArray<Department>(departmentsData)
  const progList = extractArray<Program>(programsData)
  const subjects = extractArray<Subject>(subjectsData)

  /* Mutations */
  const createMut = useMutation({
    mutationFn: (body: unknown) => apiThrow(api.post('/subjects', body)),
    onSuccess: () => { setError(null); qc.invalidateQueries({ queryKey: ['subjects'] }); closeDialog() },
    onError: (error: Error) => { console.error('Create subject failed:', error); setError(error.message || 'An unexpected error occurred') },
  })

  const updateMut = useMutation({
    mutationFn: ({ id, ...body }: Record<string, unknown>) => apiThrow(api.put(`/subjects/${id}`, body)),
    onSuccess: () => { setError(null); qc.invalidateQueries({ queryKey: ['subjects'] }); closeDialog() },
    onError: (error: Error) => { console.error('Update subject failed:', error); setError(error.message || 'An unexpected error occurred') },
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiThrow(api.delete(`/subjects/${id}`)),
    onSuccess: () => { setError(null); qc.invalidateQueries({ queryKey: ['subjects'] }); setDeleteId(null) },
    onError: (error: Error) => { console.error('Delete subject failed:', error); setError(error.message || 'An unexpected error occurred') },
  })

  /* Handlers */
  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEdit(s: Subject) {
    setEditingId(s.id)
    setForm({
      subjectCode: s.subjectCode,
      subjectName: s.subjectName,
      description: s.description || '',
      units: String(s.units),
      programId: s.programId,
      departmentId: s.departmentId,
      subjectType: s.subjectType,
      classType: s.classType || 'regular',
      yearLevel: String(s.yearLevel),
      semester: s.semester,
      requiredSpecialization: s.requiredSpecialization || '',
      requiredEquipment: s.requiredEquipment || '',
      defaultDurationHours: String(s.defaultDurationHours),
      lectureHours: String(s.lectureHours),
      labHours: String(s.labHours),
    })
    setDialogOpen(true)
  }

  function closeDialog() {
    setDialogOpen(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const lecHrs = Number(form.lectureHours) || 0
    const labHrs = Number(form.labHours) || 0
    // Auto-calculate total duration from lecture + lab hours
    const totalDuration = lecHrs + labHrs
    const payload = {
      ...form,
      units: Number(form.units),
      yearLevel: Number(form.yearLevel),
      defaultDurationHours: totalDuration > 0 ? totalDuration : Number(form.defaultDurationHours),
      lectureHours: lecHrs,
      labHours: labHrs,
      requiredSpecialization: form.requiredSpecialization || undefined,
      requiredEquipment: form.requiredEquipment || undefined,
    }
    if (editingId) {
      updateMut.mutate({ id: editingId, ...payload })
    } else {
      createMut.mutate(payload)
    }
  }

  /* ── Render ──────────────────────────────────────────────── */
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
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground flex items-center gap-3">
            <BookOpen className="size-8 text-[#10B981]" />
            Subjects
          </h1>
          <p className="text-muted-foreground mt-1">Manage course subjects and their curricula details</p>
        </div>
        {canEdit && (
          <Button onClick={openCreate} className="bg-gradient-to-r from-[#059669] to-[#10B981] text-white font-bold rounded-full hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all">
            <Plus className="size-4 mr-1" /> Add Subject
          </Button>
        )}
      </div>

      {/* Search / Filter */}
      <div className="bg-card border border-border rounded-2xl p-4 flex flex-col md:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search subjects..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-secondary border-0 border-b-2 border-border rounded-none focus-visible:border-[#10B981] focus-visible:ring-0 text-foreground placeholder:text-muted-foreground/60"
          />
        </div>
        <Select value={filterDept} onValueChange={setFilterDept}>
          <SelectTrigger className="w-full md:w-44 bg-secondary border-border text-foreground">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            <SelectItem value="all">All Departments</SelectItem>
            {deptList.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterProgram} onValueChange={setFilterProgram}>
          <SelectTrigger className="w-full md:w-44 bg-secondary border-border text-foreground">
            <SelectValue placeholder="Program" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            <SelectItem value="all">All Programs</SelectItem>
            {progList.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterSemester} onValueChange={setFilterSemester}>
          <SelectTrigger className="w-full md:w-32 bg-secondary border-border text-foreground">
            <SelectValue placeholder="Semester" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="1st">1st</SelectItem>
            <SelectItem value="2nd">2nd</SelectItem>
            <SelectItem value="3rd">3rd</SelectItem>
            <SelectItem value="summer">Summer</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterYear} onValueChange={setFilterYear}>
          <SelectTrigger className="w-full md:w-32 bg-secondary border-border text-foreground">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="1">1st Year</SelectItem>
            <SelectItem value="2">2nd Year</SelectItem>
            <SelectItem value="3">3rd Year</SelectItem>
            <SelectItem value="4">4th Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Data Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full bg-secondary/50" />)}
          </div>
        ) : subjects.length === 0 ? (
          <div className="p-12 text-center">
            <BookOpen className="size-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground text-lg">No subjects found</p>
            <p className="text-muted-foreground/60 text-sm mt-1">Add a subject or adjust your filters</p>
          </div>
        ) : (
          <div className="max-h-[50vh] sm:max-h-[65vh] overflow-auto custom-scrollbar">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent sticky top-0 bg-card z-10">
                <TableHead className="text-muted-foreground">Code</TableHead>
                <TableHead className="text-muted-foreground">Name</TableHead>
                <TableHead className="text-muted-foreground text-right">Units</TableHead>
                <TableHead className="text-muted-foreground">Type</TableHead>
                <TableHead className="text-muted-foreground">Class</TableHead>
                <TableHead className="text-muted-foreground">Hours</TableHead>
                <TableHead className="text-muted-foreground">Year</TableHead>
                <TableHead className="text-muted-foreground">Sem</TableHead>
                <TableHead className="text-muted-foreground">Program</TableHead>
                <TableHead className="text-muted-foreground">Dept</TableHead>
                <TableHead className="text-muted-foreground">Spec Req</TableHead>
                <TableHead className="text-muted-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subjects.map(s => (
                <TableRow key={s.id} className="border-border hover:bg-secondary/50 transition-all">
                  <TableCell className="font-mono text-[#10B981] font-bold text-sm">{s.subjectCode}</TableCell>
                  <TableCell className="text-foreground font-medium max-w-[200px] truncate">{s.subjectName}</TableCell>
                  <TableCell className="text-foreground font-mono text-right">{s.units}</TableCell>
                  <TableCell>
                    <Badge className={`${subjectTypeColor(s.subjectType)} border text-xs`}>
                      {subjectTypeLabel(s.subjectType)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={s.classType === 'executive'
                      ? 'bg-purple-500/20 text-purple-400 border-purple-500/30 border text-xs'
                      : s.classType === 'both'
                      ? 'bg-blue-500/20 text-blue-400 border-blue-500/30 border text-xs'
                      : 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30 border text-xs'
                    }>
                      {s.classType ? s.classType.charAt(0).toUpperCase() + s.classType.slice(1) : 'Regular'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5 text-xs">
                      {s.lectureHours > 0 && <span className="text-blue-400 font-mono">{s.lectureHours}h lec</span>}
                      {s.labHours > 0 && <span className="text-purple-400 font-mono">{s.labHours}h lab</span>}
                      {s.lectureHours === 0 && s.labHours === 0 && (
                        <span className="text-muted-foreground font-mono">{s.defaultDurationHours}h</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatYearLevel(s.yearLevel)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatSemester(s.semester)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{s.program?.name || '—'}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{s.department?.code || '—'}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{s.requiredSpecialization || '—'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {canEdit && (
                        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-[#10B981]" onClick={() => openEdit(s)}>
                          <Pencil className="size-4" />
                        </Button>
                      )}
                      {canEdit && (
                        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-red-400" onClick={() => setDeleteId(s.id)}>
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border text-foreground max-h-[90vh] overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <DialogTitle className="text-foreground">{editingId ? 'Edit Subject' : 'Add Subject'}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {editingId ? 'Update subject details' : 'Create a new course subject'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Subject Code *</Label>
                <Input value={form.subjectCode} onChange={e => setForm({ ...form, subjectCode: e.target.value.toUpperCase() })} required className="bg-secondary border-border text-foreground font-mono" placeholder="e.g. CS101" />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Subject Name *</Label>
                <Input value={form.subjectName} onChange={e => setForm({ ...form, subjectName: e.target.value })} required className="bg-secondary border-border text-foreground" placeholder="e.g. Intro to Computing" />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Units *</Label>
                <Input type="number" min="1" max="6" value={form.units} onChange={e => setForm({ ...form, units: e.target.value })} required className="bg-secondary border-border text-foreground font-mono" />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Subject Type</Label>
                <Select value={form.subjectType} onValueChange={v => {
                  const updates: Partial<typeof form> = { subjectType: v }
                  if (v === 'lecture') {
                    // Keep lectureHours as-is, but if both are 0 set lectureHours to 1.5
                    if (Number(form.lectureHours) === 0 && Number(form.labHours) === 0) updates.lectureHours = '1.5'
                  } else if (v === 'lab') {
                    // Keep labHours as-is, but if both are 0 set labHours to 1.5
                    if (Number(form.lectureHours) === 0 && Number(form.labHours) === 0) updates.labHours = '1.5'
                  } else if (v === 'lecture_and_lab') {
                    // If both are 0, set sensible defaults
                    if (Number(form.lectureHours) === 0) updates.lectureHours = '2'
                    if (Number(form.labHours) === 0) updates.labHours = '3'
                  }
                  setForm({ ...form, ...updates })
                }}>
                  <SelectTrigger className="bg-secondary border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="lecture">Lecture</SelectItem>
                    <SelectItem value="lab">Laboratory</SelectItem>
                    <SelectItem value="lecture_and_lab">Lecture &amp; Laboratory</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Duration fields — always show both Lecture and Lab hours */}
              <div className="space-y-2">
                <Label className="text-muted-foreground">Lecture Hours</Label>
                <Input type="number" step="0.5" min="0" value={form.lectureHours} onChange={e => setForm({ ...form, lectureHours: e.target.value })} className="bg-secondary border-border text-foreground font-mono" placeholder="e.g. 2" />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Lab Hours</Label>
                <Input type="number" step="0.5" min="0" value={form.labHours} onChange={e => setForm({ ...form, labHours: e.target.value })} className="bg-secondary border-border text-foreground font-mono" placeholder="e.g. 3" />
              </div>
              {form.classType !== 'executive' && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Year Level</Label>
                  <Select value={form.yearLevel} onValueChange={v => setForm({ ...form, yearLevel: v })}>
                    <SelectTrigger className="bg-secondary border-border text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="1">1st Year</SelectItem>
                      <SelectItem value="2">2nd Year</SelectItem>
                      <SelectItem value="3">3rd Year</SelectItem>
                      <SelectItem value="4">4th Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-muted-foreground">Class Type</Label>
                <Select value={form.classType} onValueChange={v => {
                  const updates: Partial<typeof form> = { classType: v }
                  // Executive subjects don't use year level — set to 0
                  if (v === 'executive') updates.yearLevel = '0'
                  // Switching back from executive: reset year level to 1st
                  if (v === 'regular' && form.yearLevel === '0') updates.yearLevel = '1'
                  setForm({ ...form, ...updates })
                }}>
                  <SelectTrigger className="bg-secondary border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="regular">Regular</SelectItem>
                    <SelectItem value="executive">Executive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Semester</Label>
                <Select value={form.semester} onValueChange={v => setForm({ ...form, semester: v })}>
                  <SelectTrigger className="bg-secondary border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="1st">1st Semester</SelectItem>
                    <SelectItem value="2nd">2nd Semester</SelectItem>
                    <SelectItem value="3rd">3rd Semester</SelectItem>
                    <SelectItem value="summer">Summer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Program *</Label>
                <Select value={form.programId || '_none'} onValueChange={v => setForm({ ...form, programId: v === '_none' ? '' : v })}>
                  <SelectTrigger className="bg-secondary border-border text-foreground">
                    <SelectValue placeholder="Select program" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {progList.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Department *</Label>
                <Select value={form.departmentId || '_none'} onValueChange={v => setForm({ ...form, departmentId: v === '_none' ? '' : v })}>
                  <SelectTrigger className="bg-secondary border-border text-foreground">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {deptList.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Required Specialization</Label>
                <Input value={form.requiredSpecialization} onChange={e => setForm({ ...form, requiredSpecialization: e.target.value })} className="bg-secondary border-border text-foreground" placeholder="e.g. Database Systems" />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Required Equipment</Label>
                <Input value={form.requiredEquipment} onChange={e => setForm({ ...form, requiredEquipment: e.target.value })} className="bg-secondary border-border text-foreground" placeholder="e.g. Lab Computers" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Description</Label>
              <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="bg-secondary border-border text-foreground" placeholder="Brief course description" />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={closeDialog} className="text-muted-foreground">Cancel</Button>
              <Button type="submit" disabled={createMut.isPending || updateMut.isPending} className="bg-gradient-to-r from-[#059669] to-[#10B981] text-white font-bold rounded-full">
                {(createMut.isPending || updateMut.isPending) ? 'Saving...' : editingId ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={v => !v && setDeleteId(null)}>
        <AlertDialogContent className="bg-card border-border text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete Subject</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This will permanently delete the subject. Any associated schedules may be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-border text-muted-foreground hover:bg-secondary/50">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMut.mutate(deleteId)} disabled={deleteMut.isPending} className="bg-red-600 text-white hover:bg-red-700">
              {deleteMut.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
