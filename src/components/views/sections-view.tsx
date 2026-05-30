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
import { Layers, Plus, Search, Pencil, Trash2, Users } from 'lucide-react'
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

interface Section {
  id: string
  sectionName: string
  yearLevel: number
  semester: string
  programId: string
  departmentId: string
  classType: string
  population: number
  isActive: boolean
  program: Program
  department: Department
  _count: {
    schedules: number
  }
}

const emptyForm = {
  sectionName: '',
  yearLevel: '1',
  semester: '1st',
  programId: '',
  departmentId: '',
  classType: 'regular',
  population: '40',
}

/* ── Component ─────────────────────────────────────────────── */
export function SectionsView() {
  const qc = useQueryClient()
  const { user } = useAppStore()
  const canEdit = canPerformAction(user?.role, 'editCurriculum')

  const [search, setSearch] = useState('')
  const [filterProgram, setFilterProgram] = useState('all')
  const [filterDept, setFilterDept] = useState('all')
  const [filterSemester, setFilterSemester] = useState('all')
  const [filterYear, setFilterYear] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  /* Queries */
  const { data: sectionsData, isLoading } = useQuery({
    queryKey: ['sections', search, filterProgram, filterDept, filterSemester, filterYear],
    queryFn: () => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (filterProgram !== 'all') params.set('programId', filterProgram)
      if (filterDept !== 'all') params.set('departmentId', filterDept)
      if (filterSemester !== 'all') params.set('semester', filterSemester)
      if (filterYear !== 'all') params.set('yearLevel', filterYear)
      return api.get<{ data: Section[]; pagination: { total: number } }>(`/sections?${params.toString()}`)
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
  const sections = extractArray<Section>(sectionsData)

  /* Mutations */
  const createMut = useMutation({
    mutationFn: (body: unknown) => apiThrow(api.post('/sections', body)),
    onSuccess: () => { setError(null); qc.invalidateQueries({ queryKey: ['sections'] }); closeDialog() },
    onError: (error: Error) => { console.error('Create section failed:', error); setError(error.message || 'An unexpected error occurred') },
  })

  const updateMut = useMutation({
    mutationFn: ({ id, ...body }: Record<string, unknown>) => apiThrow(api.put(`/sections/${id}`, body)),
    onSuccess: () => { setError(null); qc.invalidateQueries({ queryKey: ['sections'] }); closeDialog() },
    onError: (error: Error) => { console.error('Update section failed:', error); setError(error.message || 'An unexpected error occurred') },
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiThrow(api.delete(`/sections/${id}`)),
    onSuccess: () => { setError(null); qc.invalidateQueries({ queryKey: ['sections'] }); setDeleteId(null) },
    onError: (error: Error) => { console.error('Delete section failed:', error); setError(error.message || 'An unexpected error occurred') },
  })

  /* Handlers */
  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEdit(s: Section) {
    setEditingId(s.id)
    setForm({
      sectionName: s.sectionName,
      yearLevel: String(s.yearLevel),
      semester: s.semester,
      programId: s.programId,
      departmentId: s.departmentId,
      classType: s.classType || 'regular',
      population: String(s.population),
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
    const payload = {
      ...form,
      yearLevel: Number(form.yearLevel),
      population: Number(form.population),
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
            <Layers className="size-8 text-[#10B981]" />
            Sections
          </h1>
          <p className="text-muted-foreground mt-1">Manage student sections and groupings</p>
        </div>
        {canEdit && (
          <Button onClick={openCreate} className="bg-gradient-to-r from-[#059669] to-[#10B981] text-white font-bold rounded-full hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all">
            <Plus className="size-4 mr-1" /> Add Section
          </Button>
        )}
      </div>

      {/* Search / Filter */}
      <div className="bg-card border border-border rounded-2xl p-4 flex flex-col md:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search sections..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-secondary border-0 border-b-2 border-border rounded-none focus-visible:border-[#10B981] focus-visible:ring-0 text-foreground placeholder:text-muted-foreground/60"
          />
        </div>
        <Select value={filterProgram} onValueChange={setFilterProgram}>
          <SelectTrigger className="w-full md:w-44 bg-secondary border-border text-foreground">
            <SelectValue placeholder="Program" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            <SelectItem value="all">All Programs</SelectItem>
            {progList.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterDept} onValueChange={setFilterDept}>
          <SelectTrigger className="w-full md:w-44 bg-secondary border-border text-foreground">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            <SelectItem value="all">All Departments</SelectItem>
            {deptList.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
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
        ) : sections.length === 0 ? (
          <div className="p-12 text-center">
            <Layers className="size-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground text-lg">No sections found</p>
            <p className="text-muted-foreground/60 text-sm mt-1">Add a section or adjust your filters</p>
          </div>
        ) : (
          <div className="max-h-[50vh] sm:max-h-[65vh] overflow-auto custom-scrollbar">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent sticky top-0 bg-card z-10">
                <TableHead className="text-muted-foreground">Name</TableHead>
                <TableHead className="text-muted-foreground">Class Type</TableHead>
                <TableHead className="text-muted-foreground">Year Level</TableHead>
                <TableHead className="text-muted-foreground">Semester</TableHead>
                <TableHead className="text-muted-foreground">Program</TableHead>
                <TableHead className="text-muted-foreground">Department</TableHead>
                <TableHead className="text-muted-foreground text-right">Population</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sections.map(s => (
                <TableRow key={s.id} className="border-border hover:bg-secondary/50 transition-all">
                  <TableCell className="text-foreground font-medium">{s.sectionName}</TableCell>
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
                  <TableCell className="text-muted-foreground">{formatYearLevel(s.yearLevel)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatSemester(s.semester)}</TableCell>
                  <TableCell className="text-muted-foreground">{s.program?.name || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{s.department?.code || '—'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Users className="size-3 text-muted-foreground" />
                      <span className="font-mono text-foreground">{s.population}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={s.isActive
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 border text-xs'
                      : 'bg-red-500/20 text-red-400 border-red-500/30 border text-xs'
                    }>
                      {s.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
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
            <DialogTitle className="text-foreground">{editingId ? 'Edit Section' : 'Add Section'}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {editingId ? 'Update section details' : 'Create a new student section'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Section Name *</Label>
                <Input value={form.sectionName} onChange={e => setForm({ ...form, sectionName: e.target.value })} required className="bg-secondary border-border text-foreground" placeholder="e.g. CS-1A" />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Population</Label>
                <Input type="number" value={form.population} onChange={e => setForm({ ...form, population: e.target.value })} className="bg-secondary border-border text-foreground font-mono" />
              </div>
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
                <Label className="text-muted-foreground">Class Type</Label>
                <Select value={form.classType} onValueChange={v => setForm({ ...form, classType: v })}>
                  <SelectTrigger className="bg-secondary border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="regular">Regular</SelectItem>
                    <SelectItem value="executive">Executive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
            <AlertDialogTitle className="text-foreground">Delete Section</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This will permanently delete the section. Any associated schedules may be affected.
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
