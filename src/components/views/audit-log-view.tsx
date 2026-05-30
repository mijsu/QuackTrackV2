'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { ScrollText, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

interface AuditLogEntry {
  id: string
  userId: string | null
  action: string
  entity: string
  entityId: string | null
  details: string | null
  ipAddress: string | null
  createdAt: string
  user?: {
    id: string
    name: string
    uid: string
    email: string
  } | null
}

interface AuditResponse {
  data: AuditLogEntry[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

const ACTION_BADGE_MAP: Record<string, { bg: string; text: string }> = {
  created: { bg: 'bg-green-500/15', text: 'text-green-400' },
  updated: { bg: 'bg-blue-500/15', text: 'text-blue-400' },
  deleted: { bg: 'bg-red-500/15', text: 'text-red-400' },
  published: { bg: 'bg-[#10B981]/15', text: 'text-[#10B981]' },
  archived: { bg: 'bg-purple-500/15', text: 'text-purple-400' },
  resolved: { bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
  generated: { bg: 'bg-yellow-500/15', text: 'text-yellow-400' },
  login: { bg: 'bg-cyan-500/15', text: 'text-cyan-400' },
}

const ENTITY_TYPES = [
  'schedule', 'schedule_version', 'faculty', 'subject',
  'section', 'department', 'program', 'preference', 'user',
  'conflict', 'notification', 'announcement', 'generation_config',
  'generation_session',
]

const ACTION_TYPES = [
  'created', 'updated', 'deleted', 'published', 'archived',
  'resolved', 'generated', 'login',
]

function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

export function AuditLogView() {
  const [entityFilter, setEntityFilter] = useState<string>('all')
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  // Build query params
  const queryParams = new URLSearchParams()
  if (entityFilter !== 'all') queryParams.set('entity', entityFilter)
  if (actionFilter !== 'all') queryParams.set('action', actionFilter)
  queryParams.set('page', page.toString())
  queryParams.set('limit', '20')

  const { data, isLoading } = useQuery<AuditResponse>({
    queryKey: ['audit-log', entityFilter, actionFilter, page],
    queryFn: async () => {
      const res = await api.get<AuditResponse>(`/audit?${queryParams.toString()}`)
      return res.data ?? { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }
    },
  })

  const logs = data?.data ?? []
  const pagination = data?.pagination

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const getActionBadge = (action: string) => {
    const style = ACTION_BADGE_MAP[action] || { bg: 'bg-secondary', text: 'text-foreground' }
    return (
      <Badge className={`${style.bg} ${style.text} border-0 text-xs`}>
        {action}
      </Badge>
    )
  }

  const getEntityBadge = (entity: string) => (
    <Badge className="bg-secondary/50 text-muted-foreground border-border text-xs">
      {entity}
    </Badge>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ScrollText className="h-8 w-8 text-[#10B981]" />
        <h1 className="font-heading text-3xl font-bold text-foreground">Audit Log</h1>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="space-y-1">
            <label className="text-muted-foreground text-xs">Entity Type</label>
            <Select value={entityFilter} onValueChange={(v) => { setEntityFilter(v); setPage(1) }}>
              <SelectTrigger className="w-48 bg-secondary border-border text-foreground">
                <SelectValue placeholder="All entities" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border max-h-60">
                <SelectItem value="all" className="text-foreground focus:bg-accent focus:text-accent-foreground">All Entities</SelectItem>
                {ENTITY_TYPES.map((e) => (
                  <SelectItem key={e} value={e} className="text-foreground focus:bg-accent focus:text-accent-foreground">
                    {e.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-muted-foreground text-xs">Action</label>
            <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1) }}>
              <SelectTrigger className="w-40 bg-secondary border-border text-foreground">
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="all" className="text-foreground focus:bg-accent focus:text-accent-foreground">All Actions</SelectItem>
                {ACTION_TYPES.map((a) => (
                  <SelectItem key={a} value={a} className="text-foreground focus:bg-accent focus:text-accent-foreground">
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(entityFilter !== 'all' || actionFilter !== 'all') && (
            <button
              onClick={() => { setEntityFilter('all'); setActionFilter('all'); setPage(1) }}
              className="mt-5 text-sm text-[#10B981] hover:text-[#10B981]/80 transition-colors"
            >
              Clear filters
            </button>
          )}

          {pagination && (
            <div className="ml-auto text-muted-foreground text-sm font-mono mt-5">
              {pagination.total} log{pagination.total !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-8 w-8 text-[#10B981] animate-spin" />
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center">
          <ScrollText className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground">No audit logs found</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-[200px_140px_100px_140px_1fr_120px] gap-4 px-6 py-3 border-b border-border text-muted-foreground text-xs font-semibold uppercase tracking-wider sticky top-0 bg-card z-10">
            <div>Timestamp</div>
            <div>User</div>
            <div>Action</div>
            <div>Entity</div>
            <div>Details</div>
            <div>IP Address</div>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-border max-h-[50vh] sm:max-h-[65vh] overflow-auto custom-scrollbar">
            {logs.map((log) => (
              <div key={log.id} className="group">
                <div
                  className={`grid grid-cols-[200px_140px_100px_140px_1fr_120px] gap-4 px-6 py-3 items-center hover:bg-secondary/30 transition-colors ${
                    log.details ? 'cursor-pointer' : ''
                  }`}
                  onClick={() => log.details && toggleRow(log.id)}
                >
                  {/* Timestamp */}
                  <div className="font-mono text-xs text-muted-foreground">
                    {formatTimestamp(log.createdAt)}
                  </div>

                  {/* User */}
                  <div className="text-sm text-foreground truncate">
                    {log.user?.name || <span className="text-muted-foreground/50 italic">system</span>}
                  </div>

                  {/* Action */}
                  <div>{getActionBadge(log.action)}</div>

                  {/* Entity */}
                  <div>{getEntityBadge(log.entity)}</div>

                  {/* Details Preview */}
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm text-muted-foreground truncate">
                      {log.details
                        ? log.details.length > 60
                          ? log.details.substring(0, 60) + '...'
                          : log.details
                        : '—'}
                    </span>
                    {log.details && log.details.length > 60 && (
                      expandedRows.has(log.id)
                        ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    )}
                  </div>

                  {/* IP Address */}
                  <div className="font-mono text-xs text-muted-foreground">
                    {log.ipAddress || '—'}
                  </div>
                </div>

                {/* Expanded Details */}
                {log.details && expandedRows.has(log.id) && (
                  <div className="px-6 pb-3 pl-[356px]">
                    <div className="bg-secondary rounded-lg p-3 text-sm text-muted-foreground font-mono text-xs whitespace-pre-wrap break-all">
                      {log.details}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-4 py-2 rounded-lg bg-card border border-border text-muted-foreground text-sm hover:text-foreground hover:border-border transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-muted-foreground text-sm font-mono">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            disabled={page >= pagination.totalPages}
            className="px-4 py-2 rounded-lg bg-card border border-border text-muted-foreground text-sm hover:text-foreground hover:border-border transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
