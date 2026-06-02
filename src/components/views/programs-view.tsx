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
import { GraduationCap, Plus, Search, Pencil, Trash2 } from 'lucide-react'
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
  description: string | null
  departmentId: string
  classType: string
  isActive: boolean
  department: Department
  _count: {
    subjects: number
    sections: number
  }
}

const emptyForm = { name: '', code: '', description: '', departmentId: '', classType: 'regular' }

/* ── Component ─────────────────────────────────────────────── */
export function ProgramsView() {
  const qc = useQueryClient()
  const { user } = useAppStore()
  const canEdit = canPerformAction(user?.role, 'editCurriculum')

  const [search, setSearch] = useState('')
  const [filterDept, setFilterDept] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  /* Queries */
  const { data: programsData, isLoading } = useQuery({
    queryKey: ['programs', search, filterDept],
    queryFn: () => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (filterDept !== 'all') params.set('departmentId', filterDept)
      return api.get<Program[]>(`/programs?${params.toString()}`)
    },
  })

  const { data: departmentsData } = useQuery({
    queryKey: ['departments-list'],
    queryFn: () => api.get<Department[]>('/departments'),
  })

  const deptList = extractArray<Department>(departmentsData)
  const programs = extractArray<Program>(programsData)

  /* Mutations */
  const createMut = useMutation({
    mutationFn: (body: unknown) => apiThrow(api.post('/programs', body)),
    onSuccess: () => { setError(null); qc.invalidateQueries({ queryKey: ['programs'] }); closeDialog() },
    onError: (error: Error) => { console.error('Create program failed:', error); setError(error.message || 'An unexpected error occurred') },
  })

  const updateMut = useMutation({
    mutationFn: ({ id, ...body }: Record<string, unknown>) => apiThrow(api.put(`/programs/${id}`, body)),
    onSuccess: () => { setError(null); qc.invalidateQueries({ queryKey: ['programs'] }); closeDialog() },
    onError: (error: Error) => { console.error('Update program failed:', error); setError(error.message || 'An unexpected error occurred') },
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiThrow(api.delete(`/programs/${id}`)),
    onSuccess: () => { setError(null); qc.invalidateQueries({ queryKey: ['programs'] }); setDeleteId(null) },
    onError: (error: Error) => { console.error('Delete program failed:', error); setError(error.message || 'An unexpected error occurred') },
  })

  /* Handlers */
  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEdit(p: Program) {
    setEditingId(p.id)
    setForm({
      name: p.name,
      code: p.code,
      description: p.description || '',
      departmentId: p.departmentId,
      classType: p.classType,
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
    if (editingId) {
      updateMut.mutate({ id: editingId, ...form })
    } else {
      createMut.mutate(form)
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
            <GraduationCap className="size-8 text-[#10B981]" />
            Programs
          </h1>
          <p className="text-muted-foreground mt-1">Manage academic programs and their curricula</p>
        </div>
        {canEdit && (
          <Button onClick={openCreate} className="bg-gradient-to-r from-[#059669] to-[#10B981] text-white font-bold rounded-full hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all">
            <Plus className="size-4 mr-1" /> Add Program
          </Button>
        )}
      </div>

      {/* Search / Filter */}
      <div className="bg-card border border-border rounded-2xl p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search programs..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-secondary border-0 border-b-2 border-border rounded-none focus-visible:border-[#10B981] focus-visible:ring-0 text-foreground placeholder:text-muted-foreground/60"
          />
        </div>
        <Select value={filterDept} onValueChange={setFilterDept}>
          <SelectTrigger className="w-full md:w-52 bg-secondary border-border text-foreground">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            <SelectItem value="all">All Departments</SelectItem>
            {deptList.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Data Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full bg-secondary/50" />)}
          </div>
        ) : programs.length === 0 ? (
          <div className="p-12 text-center">
            <GraduationCap className="size-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground text-lg">No programs found</p>
            <p className="text-muted-foreground/60 text-sm mt-1">Add a program or adjust your filters</p>
          </div>
        ) : (
          <div className="max-h-[50vh] sm:max-h-[65vh] overflow-auto custom-scrollbar">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent sticky top-0 bg-card z-10">
                <TableHead className="text-muted-foreground">Code</TableHead>
                <TableHead className="text-muted-foreground">Name</TableHead>
                <TableHead className="text-muted-foreground">Class Type</TableHead>
                <TableHead className="text-muted-foreground">Department</TableHead>
                <TableHead className="text-muted-foreground text-right">Subjects</TableHead>
                <TableHead className="text-muted-foreground text-right">Sections</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {programs.map(p => (
                <TableRow key={p.id} className="border-border hover:bg-secondary/50 transition-all">
                  <TableCell className="font-mono text-[#10B981] font-bold">{p.code}</TableCell>
                  <TableCell className="text-foreground font-medium">{p.name}</TableCell>
                  <TableCell>
                    <Badge className={p.classType === 'executive'
                      ? 'bg-purple-500/20 text-purple-400 border-purple-500/30 border text-xs'
                      : p.classType === 'both'
                      ? 'bg-blue-500/20 text-blue-400 border-blue-500/30 border text-xs'
                      : 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30 border text-xs'
                    }>
                      {p.classType ? p.classType.charAt(0).toUpperCase() + p.classType.slice(1) : 'Regular'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.department?.name || '—'}</TableCell>
                  <TableCell className="text-foreground font-mono text-right">{p._count.subjects}</TableCell>
                  <TableCell className="text-foreground font-mono text-right">{p._count.sections}</TableCell>
                  <TableCell>
                    <Badge className={p.isActive
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 border text-xs'
                      : 'bg-red-500/20 text-red-400 border-red-500/30 border text-xs'
                    }>
                      {p.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {canEdit && (
                        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-[#10B981]" onClick={() => openEdit(p)}>
                          <Pencil className="size-4" />
                        </Button>
                      )}
                      {canEdit && (
                        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-red-400" onClick={() => setDeleteId(p.id)}>
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
        <DialogContent className="bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-foreground">{editingId ? 'Edit Program' : 'Add Program'}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {editingId ? 'Update program details' : 'Create a new academic program'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Program Name *</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className="bg-secondary border-border text-foreground" placeholder="e.g. BS Computer Science" />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Code *</Label>
                <Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} required className="bg-secondary border-border text-foreground font-mono" placeholder="e.g. BSCS" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Description</Label>
              <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="bg-secondary border-border text-foreground" placeholder="Program description (optional)" />
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
            <AlertDialogTitle className="text-foreground">Delete Program</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This will permanently delete the program and may affect associated subjects and sections.
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
