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
import { Building2, Plus, Search, Pencil, Trash2, Eye, X, Users, GraduationCap, BookOpen, Layers } from 'lucide-react'
import { canPerformAction } from '@/lib/roles'
import { useAppStore } from '@/store/app-store'

/* ── Types ─────────────────────────────────────────────────── */
interface Department {
  id: string
  name: string
  code: string
  college: string | null
  classType: string
  _count: {
    users: number
    programs: number
    subjects: number
    sections: number
  }
}

const emptyForm = { name: '', code: '', college: '', classType: 'regular' }

/* ── Component ─────────────────────────────────────────────── */
export function DepartmentsView() {
  const qc = useQueryClient()
  const { user } = useAppStore()
  const canEdit = canPerformAction(user?.role, 'editCurriculum')

  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  /* Queries */
  const { data: departmentsData, isLoading } = useQuery({
    queryKey: ['departments', search],
    queryFn: () => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      return api.get<Department[]>(`/departments?${params.toString()}`)
    },
  })

  const departments = extractArray<Department>(departmentsData)
  const detailDept = detailId ? departments.find(d => d.id === detailId) : null

  /* Mutations */
  const createMut = useMutation({
    mutationFn: (body: unknown) => apiThrow(api.post('/departments', body)),
    onSuccess: () => { setError(null); qc.invalidateQueries({ queryKey: ['departments'] }); closeDialog() },
    onError: (error: Error) => { console.error('Create department failed:', error); setError(error.message || 'An unexpected error occurred') },
  })

  const updateMut = useMutation({
    mutationFn: ({ id, ...body }: Record<string, unknown>) => apiThrow(api.put(`/departments/${id}`, body)),
    onSuccess: () => { setError(null); qc.invalidateQueries({ queryKey: ['departments'] }); closeDialog() },
    onError: (error: Error) => { console.error('Update department failed:', error); setError(error.message || 'An unexpected error occurred') },
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiThrow(api.delete(`/departments/${id}`)),
    onSuccess: () => { setError(null); qc.invalidateQueries({ queryKey: ['departments'] }); setDeleteId(null) },
    onError: (error: Error) => { console.error('Delete department failed:', error); setError(error.message || 'An unexpected error occurred') },
  })

  /* Handlers */
  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEdit(d: Department, e?: React.MouseEvent) {
    e?.stopPropagation()
    setEditingId(d.id)
    setForm({ name: d.name, code: d.code, college: d.college || '', classType: d.classType || 'regular' })
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
            <Building2 className="size-8 text-[#10B981]" />
            Departments
          </h1>
          <p className="text-muted-foreground mt-1">Organize academic departments and track their resources</p>
        </div>
        {canEdit && (
          <Button onClick={openCreate} className="bg-gradient-to-r from-[#059669] to-[#10B981] text-white font-bold rounded-full hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all">
            <Plus className="size-4 mr-1" /> Add Department
          </Button>
        )}
      </div>

      {/* Search Bar */}
      <div className="bg-card border border-border rounded-2xl p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search departments..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-secondary border-0 border-b-2 border-border rounded-none focus-visible:border-[#10B981] focus-visible:ring-0 text-foreground placeholder:text-muted-foreground/60"
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full bg-secondary/50" />)}
          </div>
        ) : departments.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="size-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground text-lg">No departments found</p>
            <p className="text-muted-foreground/60 text-sm mt-1">Create your first department to get started</p>
          </div>
        ) : (
          <div className="max-h-[50vh] sm:max-h-[65vh] overflow-auto custom-scrollbar">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent sticky top-0 bg-card z-10">
                <TableHead className="text-muted-foreground">Code</TableHead>
                <TableHead className="text-muted-foreground">Name</TableHead>
                <TableHead className="text-muted-foreground">College</TableHead>
                <TableHead className="text-muted-foreground">Class Type</TableHead>
                <TableHead className="text-muted-foreground text-right">Faculty</TableHead>
                <TableHead className="text-muted-foreground text-right">Programs</TableHead>
                <TableHead className="text-muted-foreground text-right">Subjects</TableHead>
                <TableHead className="text-muted-foreground text-right">Sections</TableHead>
                <TableHead className="text-muted-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments.map(d => (
                <TableRow
                  key={d.id}
                  className="border-border hover:bg-secondary/50 cursor-pointer transition-all"
                  onClick={() => setDetailId(d.id)}
                >
                  <TableCell className="font-mono text-[#10B981] font-bold">{d.code}</TableCell>
                  <TableCell className="text-foreground font-medium">{d.name}</TableCell>
                  <TableCell className="text-muted-foreground">{d.college || '—'}</TableCell>
                  <TableCell>
                    <Badge className={d.classType === 'executive'
                      ? 'bg-purple-500/20 text-purple-400 border-purple-500/30 border text-xs'
                      : 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30 border text-xs'
                    }>
                      {d.classType ? d.classType.charAt(0).toUpperCase() + d.classType.slice(1) : 'Regular'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-foreground font-mono text-right">{d._count.users}</TableCell>
                  <TableCell className="text-foreground font-mono text-right">{d._count.programs}</TableCell>
                  <TableCell className="text-foreground font-mono text-right">{d._count.subjects}</TableCell>
                  <TableCell className="text-foreground font-mono text-right">{d._count.sections}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-[#10B981]" onClick={() => setDetailId(d.id)}>
                        <Eye className="size-4" />
                      </Button>
                      {canEdit && (
                        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-[#10B981]" onClick={(e) => openEdit(d, e)}>
                          <Pencil className="size-4" />
                        </Button>
                      )}
                      {canEdit && (
                        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-red-400" onClick={() => setDeleteId(d.id)}>
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
            <DialogTitle className="text-foreground">{editingId ? 'Edit Department' : 'Add Department'}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {editingId ? 'Update department details' : 'Create a new academic department'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Department Name *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className="bg-secondary border-border text-foreground" placeholder="e.g. Computer Science" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Code *</Label>
                <Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} required className="bg-secondary border-border text-foreground font-mono" placeholder="e.g. CS" />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">College</Label>
                <Input value={form.college} onChange={e => setForm({ ...form, college: e.target.value })} className="bg-secondary border-border text-foreground" placeholder="e.g. COECSA" />
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
            <AlertDialogTitle className="text-foreground">Delete Department</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This will permanently delete the department and may affect associated programs, subjects, and faculty.
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

      {/* Detail Dialog */}
      <Dialog open={!!detailId} onOpenChange={v => { if (!v) setDetailId(null) }}>
        <DialogContent className="bg-card border-border text-foreground max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <DialogTitle className="text-foreground text-xl">{detailDept?.name || 'Department Details'}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {detailDept?.code} {detailDept?.college ? `· ${detailDept.college}` : ''}
            </DialogDescription>
          </DialogHeader>
          {detailDept && (
            <div className="space-y-4">
              {/* Info Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-muted rounded-xl p-3 text-center">
                  <p className="text-muted-foreground text-xs">College</p>
                  <p className="text-foreground font-medium text-sm mt-1">{detailDept.college || '—'}</p>
                </div>
                <div className="bg-muted rounded-xl p-3 text-center">
                  <p className="text-muted-foreground text-xs">Faculty</p>
                  <p className="text-foreground font-medium text-sm mt-1">{detailDept._count.users}</p>
                </div>
                <div className="bg-muted rounded-xl p-3 text-center">
                  <p className="text-muted-foreground text-xs">Programs</p>
                  <p className="text-foreground font-medium text-sm mt-1">{detailDept._count.programs}</p>
                </div>
                <div className="bg-muted rounded-xl p-3 text-center">
                  <p className="text-muted-foreground text-xs">Subjects</p>
                  <p className="text-foreground font-medium text-sm mt-1">{detailDept._count.subjects}</p>
                </div>
              </div>

              {/* Stats Overview */}
              <div className="bg-muted rounded-xl p-4 space-y-3">
                <h3 className="font-heading font-bold text-foreground text-sm">Department Overview</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-secondary/50 rounded-lg p-3 flex items-center gap-2">
                    <Users className="size-4 text-[#10B981]" />
                    <div>
                      <p className="text-foreground font-mono font-bold text-lg leading-none">{detailDept._count.users}</p>
                      <p className="text-muted-foreground text-xs">Faculty Members</p>
                    </div>
                  </div>
                  <div className="bg-secondary/50 rounded-lg p-3 flex items-center gap-2">
                    <GraduationCap className="size-4 text-[#10B981]" />
                    <div>
                      <p className="text-foreground font-mono font-bold text-lg leading-none">{detailDept._count.programs}</p>
                      <p className="text-muted-foreground text-xs">Programs</p>
                    </div>
                  </div>
                  <div className="bg-secondary/50 rounded-lg p-3 flex items-center gap-2">
                    <BookOpen className="size-4 text-[#10B981]" />
                    <div>
                      <p className="text-foreground font-mono font-bold text-lg leading-none">{detailDept._count.subjects}</p>
                      <p className="text-muted-foreground text-xs">Subjects</p>
                    </div>
                  </div>
                  <div className="bg-secondary/50 rounded-lg p-3 flex items-center gap-2">
                    <Layers className="size-4 text-[#10B981]" />
                    <div>
                      <p className="text-foreground font-mono font-bold text-lg leading-none">{detailDept._count.sections}</p>
                      <p className="text-muted-foreground text-xs">Sections</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDetailId(null)} className="text-muted-foreground">
              <X className="size-4 mr-1" /> Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
