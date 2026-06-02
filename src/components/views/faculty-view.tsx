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
import { Users, Plus, Search, Pencil, Trash2, Eye, X, Zap, Copy, CheckCircle2, Mail, AlertCircle } from 'lucide-react'
import { formatTime12, formatSpecialization } from '@/lib/utils'
import { canPerformAction } from '@/lib/roles'
import { useAppStore } from '@/store/app-store'

/* ── Types ─────────────────────────────────────────────────── */
interface Department {
  id: string
  name: string
  code: string
}

interface FacultyMember {
  id: string
  uid: string
  name: string
  email: string
  role: string
  facultyType: string | null
  specialization: string | null
  maxUnits: number
  contractType: string | null
  status: string
  departmentId: string | null
  department: Department | null
}

interface WorkloadEntry {
  id: string
  name: string
  assignedUnits: number
  maxUnits: number
  utilizationPercent: number
  scheduleCount: number
  totalHours: number
  daysUsed: string[]
  schedules: {
    id: string
    day: string
    startTime: string
    endTime: string
    subject: string | null
    subjectCode: string | null
    units: number | null
    section: string | null
  }[]
}

/* ── Helpers ───────────────────────────────────────────────── */
function statusColor(status: string) {
  switch (status) {
    case 'active': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    case 'under_observation': return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    case 'paused': return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
    default: return 'bg-secondary/50 text-muted-foreground border-border'
  }
}

function facultyTypeLabel(t: string | null) {
  if (!t) return '—'
  const labels: Record<string, string> = { regular: 'Regular', masteral: 'Masteral', executive: 'Masteral' }
  return labels[t] ?? t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function contractTypeLabel(t: string | null) {
  if (!t) return '—'
  const labels: Record<string, string> = { full_time: 'Full Time', part_time: 'Part Time', casual: 'Casual', permanent: 'Permanent' }
  return labels[t] ?? t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function statusLabel(s: string) {
  const labels: Record<string, string> = { active: 'Active', under_observation: 'Under Observation', paused: 'Paused' }
  return labels[s] ?? s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

const emptyForm = {
  name: '',
  email: '',
  personalEmail: '',
  uid: '',
  password: '',
  facultyType: 'regular',
  departmentId: '',
  specialization: '',
  maxUnits: '21',
  contractType: 'permanent',
  status: 'active',
}

/* ── Component ─────────────────────────────────────────────── */
export function FacultyView() {
  const qc = useQueryClient()
  const { user } = useAppStore()

  /* Permission flags */
  const canCreate = canPerformAction(user?.role, 'createFaculty')
  const canEdit = canPerformAction(user?.role, 'editFaculty')
  const canDelete = canPerformAction(user?.role, 'deleteFaculty')

  /* State */
  const [search, setSearch] = useState('')
  const [filterDept, setFilterDept] = useState('all')
  const [filterContract, setFilterContract] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [credentialsData, setCredentialsData] = useState<{ email: string; tempPassword: string; personalEmail?: string; emailSent?: boolean } | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  /* Queries */
  const { data: facultyData, isLoading } = useQuery({
    queryKey: ['faculty', search, filterDept, filterContract, filterStatus],
    queryFn: () => {
      const params = new URLSearchParams()
      params.set('role', 'faculty')
      if (search) params.set('search', search)
      if (filterDept !== 'all') params.set('departmentId', filterDept)
      if (filterContract !== 'all') params.set('contractType', filterContract)
      if (filterStatus !== 'all') params.set('status', filterStatus)
      return api.get<{ data: FacultyMember[]; pagination: { total: number } }>(`/users?${params.toString()}`)
    },
  })

  const { data: departments } = useQuery({
    queryKey: ['departments-list'],
    queryFn: () => api.get<Department[]>('/departments'),
  })

  const { data: detailData } = useQuery({
    queryKey: ['faculty-detail', detailId],
    queryFn: () => api.get<FacultyMember & { schedules: unknown[] }>(`/users/${detailId}`),
    enabled: !!detailId,
  })

  const { data: workloadData } = useQuery({
    queryKey: ['faculty-workload', detailId],
    queryFn: () => api.get<{ workload: WorkloadEntry[] }>(`/workload?scheduleVersionId=latest&facultyId=${detailId}`),
    enabled: !!detailId,
  })

  const deptList = extractArray<Department>(departments)
  const faculty = extractArray<FacultyMember>(facultyData)
  const workload = workloadData?.data?.workload?.find(w => w.id === detailId) ?? workloadData?.data?.workload?.[0] ?? null

  /* Mutations */
  const createMut = useMutation({
    mutationFn: (body: unknown) => apiThrow(api.post('/users', { ...body, role: 'faculty' })),
    onSuccess: (res) => {
      setError(null)
      qc.invalidateQueries({ queryKey: ['faculty'] })
      // Show credentials modal instead of closing the dialog
      if (res?._tempCredentials) {
        setCredentialsData({
          email: res._tempCredentials.email,
          tempPassword: res._tempCredentials.tempPassword,
          personalEmail: res._tempCredentials.personalEmail || undefined,
          emailSent: res._tempCredentials.emailSent,
        })
        setDialogOpen(false) // close the form dialog
      } else {
        closeDialog()
      }
    },
    onError: (error: Error) => { console.error('Create faculty failed:', error); setError(error.message || 'An unexpected error occurred') },
  })

  const updateMut = useMutation({
    mutationFn: ({ id, ...body }: Record<string, unknown>) => apiThrow(api.put(`/users/${id}`, body)),
    onSuccess: () => { setError(null); qc.invalidateQueries({ queryKey: ['faculty'] }); closeDialog() },
    onError: (error: Error) => { console.error('Update faculty failed:', error); setError(error.message || 'An unexpected error occurred') },
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiThrow(api.delete(`/users/${id}`)),
    onSuccess: () => { setError(null); qc.invalidateQueries({ queryKey: ['faculty'] }); setDeleteId(null) },
    onError: (error: Error) => { console.error('Delete faculty failed:', error); setError(error.message || 'An unexpected error occurred') },
  })

  /* Handlers */
  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEdit(f: FacultyMember) {
    setEditingId(f.id)
    setForm({
      name: f.name,
      email: f.email,
      personalEmail: '',
      uid: f.uid,
      password: '',
      facultyType: f.facultyType || 'regular',
      departmentId: f.departmentId || '',
      specialization: formatSpecialization(f.specialization),
      maxUnits: String(f.maxUnits),
      contractType: f.contractType || 'full_time',
      status: f.status || 'active',
    })
    setDialogOpen(true)
  }

  function closeDialog() {
    setDialogOpen(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  function copyToClipboard(text: string, field: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload: Record<string, unknown> = {
      name: form.name,
      email: form.email || undefined,
      personalEmail: form.personalEmail || undefined,
      uid: form.uid,
      facultyType: form.facultyType,
      departmentId: form.departmentId || undefined,
      specialization: form.specialization
        ? JSON.stringify(form.specialization.split(',').map(s => s.trim()).filter(Boolean))
        : undefined,
      maxUnits: Number(form.maxUnits),
      contractType: form.contractType,
      status: form.status,
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
            <Users className="size-8 text-[#10B981]" />
            Faculty
          </h1>
          <p className="text-muted-foreground mt-1">Manage faculty members, assignments, and workload</p>
        </div>
        {canCreate && (
          <Button onClick={openCreate} className="bg-gradient-to-r from-[#059669] to-[#10B981] text-white font-bold rounded-full hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all">
            <Plus className="size-4 mr-1" /> Add Faculty
          </Button>
        )}
      </div>

      {/* Search / Filter Bar */}
      <div className="bg-card border border-border rounded-2xl p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-secondary border-0 border-b-2 border-border rounded-none focus-visible:border-[#10B981] focus-visible:ring-0 text-foreground placeholder:text-muted-foreground/60"
          />
        </div>
        <Select value={filterDept} onValueChange={setFilterDept}>
          <SelectTrigger className="w-full md:w-48 bg-secondary border-border text-foreground">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            <SelectItem value="all">All Departments</SelectItem>
            {deptList.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterContract} onValueChange={setFilterContract}>
          <SelectTrigger className="w-full md:w-40 bg-secondary border-border text-foreground">
            <SelectValue placeholder="Contract" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            <SelectItem value="all">All Contracts</SelectItem>
            <SelectItem value="permanent">Permanent</SelectItem>
            <SelectItem value="part_time">Part Time</SelectItem>
            <SelectItem value="permanent">Permanent</SelectItem>
            <SelectItem value="casual">Casual</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full md:w-36 bg-secondary border-border text-foreground">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="under_observation">Under Observation</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Data Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full bg-secondary/50" />)}
          </div>
        ) : faculty.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="size-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground text-lg">No faculty members found</p>
            <p className="text-muted-foreground/60 text-sm mt-1">Add a faculty member or adjust your filters</p>
          </div>
        ) : (
          <div className="max-h-[50vh] sm:max-h-[65vh] overflow-auto custom-scrollbar">
            {/* ── Desktop Table ── */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent sticky top-0 bg-card z-10">
                    <TableHead className="text-muted-foreground">Name</TableHead>
                    <TableHead className="text-muted-foreground">Email</TableHead>
                    <TableHead className="text-muted-foreground">Department</TableHead>
                    <TableHead className="text-muted-foreground">Contract</TableHead>
                    <TableHead className="text-muted-foreground">Specialization</TableHead>
                    <TableHead className="text-muted-foreground text-right">Max Units</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-muted-foreground text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {faculty.map(f => (
                    <TableRow
                      key={f.id}
                      className="border-border hover:bg-secondary/50 cursor-pointer transition-all"
                      onClick={() => setDetailId(f.id)}
                    >
                      <TableCell className="text-foreground font-medium">{f.name}</TableCell>
                      <TableCell className="text-muted-foreground font-mono text-sm">{f.email}</TableCell>
                      <TableCell className="text-muted-foreground">{f.department?.name || '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{contractTypeLabel(f.contractType)}</TableCell>
                      <TableCell className="text-muted-foreground">{formatSpecialization(f.specialization) || '—'}</TableCell>
                      <TableCell className="text-foreground font-mono text-right">{f.maxUnits}</TableCell>
                      <TableCell>
                        <Badge className={`${statusColor(f.status)} border text-xs`}>
                          {statusLabel(f.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-[#10B981]" onClick={() => setDetailId(f.id)}>
                            <Eye className="size-4" />
                          </Button>
                          {canEdit && (
                            <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-[#10B981]" onClick={() => openEdit(f)}>
                              <Pencil className="size-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-red-400" onClick={() => setDeleteId(f.id)}>
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

            {/* ── Mobile Cards ── */}
            <div className="block md:hidden divide-y divide-border">
              {faculty.map(f => (
                <div
                  key={f.id}
                  onClick={() => setDetailId(f.id)}
                  className="p-4 space-y-2 cursor-pointer hover:bg-secondary/30 transition-colors active:bg-secondary/50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-foreground truncate">{f.name}</div>
                      <div className="text-[11px] font-mono text-muted-foreground truncate">{f.email}</div>
                    </div>
                    <Badge className={`${statusColor(f.status)} border text-[10px] shrink-0`}>
                      {statusLabel(f.status)}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    <span>{f.department?.name || '—'}</span>
                    <span className="text-foreground/30">·</span>
                    <span className="capitalize">{contractTypeLabel(f.contractType)}</span>
                    <span className="text-foreground/30">·</span>
                    <span>Max {f.maxUnits}u</span>
                    {f.specialization && (
                      <>
                        <span className="text-foreground/30">·</span>
                        <span className="truncate max-w-[120px]">{formatSpecialization(f.specialization)}</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2 pt-1" onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-[#10B981]" onClick={() => setDetailId(f.id)}>
                      <Eye className="size-3.5" />
                    </Button>
                    {canEdit && (
                      <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-[#10B981]" onClick={() => openEdit(f)}>
                        <Pencil className="size-3.5" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-red-400" onClick={() => setDeleteId(f.id)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border text-foreground max-h-[90vh] overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <DialogTitle className="text-foreground">{editingId ? 'Edit Faculty' : 'Add Faculty'}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {editingId ? 'Update faculty member details' : 'Create a new faculty member account'}
            </DialogDescription>
          </DialogHeader>

          {/* Auto-credentials info banner for new faculty */}
          {!editingId && (
            <div className="px-4 py-3 rounded-lg bg-[#10B981]/10 border border-[#10B981]/20 text-sm flex items-start gap-2">
              <Zap className="size-4 text-[#10B981] mt-0.5 shrink-0" />
              <span className="text-[#10B981]">
                Institutional email and temporary password will be auto-generated. Credentials will be sent to the personal email below.
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Full Name *</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className="bg-secondary border-border text-foreground" />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Personal Email *</Label>
                <Input type="email" value={form.personalEmail} onChange={e => setForm({ ...form, personalEmail: e.target.value })} required={!editingId} className="bg-secondary border-border text-foreground" placeholder="Where credentials will be sent" />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">UID *</Label>
                <Input value={form.uid} onChange={e => setForm({ ...form, uid: e.target.value })} required className="bg-secondary border-border text-foreground font-mono" />
              </div>
              {!editingId && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Institutional Email</Label>
                  <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="bg-secondary border-border text-foreground" placeholder="Auto-generated if left blank" />
                </div>
              )}
              {editingId && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Email</Label>
                  <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required className="bg-secondary border-border text-foreground" />
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-muted-foreground">Faculty Type</Label>
                <Select value={form.facultyType} onValueChange={v => setForm({ ...form, facultyType: v })}>
                  <SelectTrigger className="bg-secondary border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="regular">Regular</SelectItem>
                    <SelectItem value="masteral">Masteral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Department</Label>
                <Select value={form.departmentId || '_none'} onValueChange={v => setForm({ ...form, departmentId: v === '_none' ? '' : v })}>
                  <SelectTrigger className="bg-secondary border-border text-foreground">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="_none">None</SelectItem>
                    {deptList.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Specialization</Label>
                <Input value={form.specialization} onChange={e => setForm({ ...form, specialization: e.target.value })} className="bg-secondary border-border text-foreground" placeholder="e.g. Computer Science, AI" />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Max Units</Label>
                <Input type="number" value={form.maxUnits} onChange={e => setForm({ ...form, maxUnits: e.target.value })} className="bg-secondary border-border text-foreground font-mono" />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Contract Type</Label>
                <Select value={form.contractType} onValueChange={v => setForm({ ...form, contractType: v })}>
                  <SelectTrigger className="bg-secondary border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="permanent">Permanent</SelectItem>
                    <SelectItem value="full_time">Full Time</SelectItem>
                    <SelectItem value="part_time">Part Time</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger className="bg-secondary border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="under_observation">Under Observation</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
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
            <AlertDialogTitle className="text-foreground">Delete Faculty Member</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This action cannot be undone. This will permanently delete the faculty member and remove their data from the system.
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

      {/* Credentials Display Dialog */}
      <Dialog open={!!credentialsData} onOpenChange={(v) => { if (!v) setCredentialsData(null) }}>
        <DialogContent className="bg-card border-border text-foreground max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 rounded-xl bg-[#10B981]/10">
                <CheckCircle2 className="size-5 text-[#10B981]" />
              </div>
              <DialogTitle className="text-foreground text-xl">Faculty Created Successfully</DialogTitle>
            </div>
            <DialogDescription className="text-muted-foreground">
              Save these credentials now. The temporary password will not be shown again.
            </DialogDescription>
          </DialogHeader>

          {credentialsData && (
            <div className="space-y-4">
              {/* Warning banner */}
              <div className="px-4 py-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
                <AlertCircle className="size-4 text-amber-400 mt-0.5 shrink-0" />
                <span className="text-amber-400 text-sm">
                  Make sure to copy and store these credentials before closing. The password cannot be retrieved later.
                </span>
              </div>

              {/* Email sent info */}
              {credentialsData.personalEmail && credentialsData.emailSent && (
                <div className="px-4 py-3 rounded-lg bg-[#10B981]/5 border border-[#10B981]/10 flex items-start gap-2">
                  <Mail className="size-4 text-[#10B981] mt-0.5 shrink-0" />
                  <span className="text-[#10B981]/80 text-sm">
                    Credentials are being sent to <strong className="text-[#10B981]">{credentialsData.personalEmail}</strong>
                  </span>
                </div>
              )}
              {credentialsData.personalEmail && !credentialsData.emailSent && (
                <div className="px-4 py-3 rounded-lg bg-yellow-500/5 border border-yellow-500/10 flex items-start gap-2">
                  <AlertCircle className="size-4 text-yellow-400 mt-0.5 shrink-0" />
                  <span className="text-yellow-400/80 text-sm">
                    Could not send credentials to <strong className="text-yellow-400">{credentialsData.personalEmail}</strong>. Please share these credentials manually.
                  </span>
                </div>
              )}

              {/* Credentials card */}
              <div className="bg-secondary/50 border border-border rounded-xl p-5 space-y-4">
                <p className="text-[#10B981] text-xs uppercase tracking-wider font-bold">Login Credentials</p>

                {/* Institutional Email */}
                <div className="space-y-1">
                  <p className="text-muted-foreground text-[10px] uppercase tracking-wider font-medium">Institutional Email</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-background border border-border rounded-lg px-3 py-2.5 text-foreground font-mono text-sm select-all break-all">
                      {credentialsData.email}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      className="shrink-0 size-10 border-border hover:bg-[#10B981]/10 hover:text-[#10B981] hover:border-[#10B981]/30"
                      onClick={() => copyToClipboard(credentialsData.email, 'email')}
                    >
                      {copiedField === 'email' ? <CheckCircle2 className="size-4 text-[#10B981]" /> : <Copy className="size-4" />}
                    </Button>
                  </div>
                </div>

                {/* Temporary Password */}
                <div className="space-y-1">
                  <p className="text-muted-foreground text-[10px] uppercase tracking-wider font-medium">Temporary Password</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-background border border-border rounded-lg px-3 py-2.5 text-foreground font-mono text-sm tracking-widest select-all">
                      {credentialsData.tempPassword}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      className="shrink-0 size-10 border-border hover:bg-[#10B981]/10 hover:text-[#10B981] hover:border-[#10B981]/30"
                      onClick={() => copyToClipboard(credentialsData.tempPassword, 'password')}
                    >
                      {copiedField === 'password' ? <CheckCircle2 className="size-4 text-[#10B981]" /> : <Copy className="size-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Copy all button */}
              <Button
                onClick={() => {
                  const all = `Email: ${credentialsData.email}\nPassword: ${credentialsData.tempPassword}`
                  copyToClipboard(all, 'all')
                }}
                variant="outline"
                className="w-full border-border hover:bg-[#10B981]/10 hover:text-[#10B981] hover:border-[#10B981]/30 rounded-full font-medium"
              >
                {copiedField === 'all' ? <CheckCircle2 className="size-4 text-[#10B981]" /> : <Copy className="size-4" />}
                {copiedField === 'all' ? 'All Credentials Copied!' : 'Copy All Credentials'}
              </Button>

              {/* Must change password note */}
              <p className="text-muted-foreground text-xs text-center">
                The faculty member will be required to change this password on first login.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              onClick={() => setCredentialsData(null)}
              className="w-full bg-gradient-to-r from-[#059669] to-[#10B981] text-white font-bold rounded-full"
            >
              I've Saved These Credentials
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!detailId} onOpenChange={v => { if (!v) setDetailId(null) }}>
        <DialogContent className="bg-card border-border text-foreground sm:max-w-5xl max-h-[90vh] overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <DialogTitle className="text-foreground text-xl">{detailData?.data?.name || 'Faculty Details'}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {detailData?.data?.email} &middot; {detailData?.data?.uid}
            </DialogDescription>
          </DialogHeader>
          {detailData?.data && (
            <div className="space-y-4">
              {/* Info Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-muted rounded-xl p-3 text-center">
                  <p className="text-muted-foreground text-xs">Department</p>
                  <p className="text-foreground font-medium text-sm mt-1">{detailData.data.department?.name || '—'}</p>
                </div>
                <div className="bg-muted rounded-xl p-3 text-center">
                  <p className="text-muted-foreground text-xs">Type</p>
                  <p className="text-foreground font-medium text-sm mt-1">{facultyTypeLabel(detailData.data.facultyType)}</p>
                </div>
                <div className="bg-muted rounded-xl p-3 text-center">
                  <p className="text-muted-foreground text-xs">Specialization</p>
                  <p className="text-foreground font-medium text-sm mt-1">{formatSpecialization(detailData.data.specialization) || '—'}</p>
                </div>
                <div className="bg-muted rounded-xl p-3 text-center">
                  <p className="text-muted-foreground text-xs">Status</p>
                  <Badge className={`${statusColor(detailData.data.status)} border text-xs mt-1`}>
                    {statusLabel(detailData.data.status)}
                  </Badge>
                </div>
              </div>

              {/* Workload */}
              {workload && (
                <div className="bg-muted rounded-xl p-4 space-y-3">
                  <h3 className="font-heading font-bold text-foreground text-sm">Workload Overview</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <p className="text-2xl font-mono font-bold text-[#10B981]">{workload.assignedUnits}</p>
                      <p className="text-muted-foreground text-xs">Assigned Units</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-mono font-bold text-foreground">{workload.maxUnits}</p>
                      <p className="text-muted-foreground text-xs">Max Units</p>
                    </div>
                    <div className="text-center">
                      <p className={`text-2xl font-mono font-bold ${workload.utilizationPercent > 100 ? 'text-red-400' : workload.utilizationPercent > 75 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                        {workload.utilizationPercent}%
                      </p>
                      <p className="text-muted-foreground text-xs">Utilization</p>
                    </div>
                  </div>
                  {/* Utilization bar */}
                  <div className="w-full h-2 bg-secondary/50 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${workload.utilizationPercent > 100 ? 'bg-red-500' : workload.utilizationPercent > 75 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(workload.utilizationPercent, 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Schedule List */}
              {workload && workload.schedules.length > 0 && (() => {
                // Merge consecutive slots for the same (day, subjectCode) into single entries
                type ScheduleEntry = typeof workload.schedules[0]
                const groups = new Map<string, ScheduleEntry[]>()
                workload.schedules.forEach((s: ScheduleEntry) => {
                  const key = `${s.day}|${s.subjectCode}`
                  const arr = groups.get(key) || []
                  arr.push(s)
                  groups.set(key, arr)
                })
                const merged: Array<ScheduleEntry & { displayEnd: string }> = []
                for (const [, items] of groups) {
                  items.sort((a: ScheduleEntry, b: ScheduleEntry) => a.startTime.localeCompare(b.startTime))
                  // Merge consecutive slots
                  let i = 0
                  while (i < items.length) {
                    let endTime = items[i].endTime
                    let j = i + 1
                    while (j < items.length && items[j].startTime === endTime) {
                      endTime = items[j].endTime
                      j++
                    }
                    merged.push({ ...items[i], endTime, displayEnd: endTime })
                    i = j
                  }
                }
                const mergedCount = merged.length
                return (
                <div className="bg-muted rounded-xl p-4 space-y-2">
                  <h3 className="font-heading font-bold text-foreground text-sm">Current Schedules ({mergedCount})</h3>
                  <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-2">
                    {merged.map((s, sIdx) => (
                      <div key={`${s.day}-${s.subjectCode}-${s.startTime}-${sIdx}`} className="flex items-center justify-between bg-secondary/50 rounded-lg px-3 py-2 text-sm">
                        <div>
                          <span className="text-foreground font-medium">{s.subjectCode}</span>
                          <span className="text-muted-foreground ml-2">{s.subject}</span>
                        </div>
                        <div className="text-muted-foreground font-mono text-xs">
                          {s.day} {formatTime12(s.startTime)}–{formatTime12(s.displayEnd || s.endTime)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                )
              })()}
              {workload && workload.schedules.length === 0 && (
                <div className="bg-muted rounded-xl p-4 text-center">
                  <p className="text-muted-foreground text-sm">No schedules assigned yet</p>
                </div>
              )}
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
