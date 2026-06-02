'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, apiThrow } from '@/lib/api'
import { useAppStore } from '@/store/app-store'
import { Bell, Info, AlertTriangle, CheckCircle, XCircle, Check, Loader2 } from 'lucide-react'

type NotificationType = 'info' | 'warning' | 'success' | 'error'
type FilterType = 'all' | 'unread' | NotificationType

interface Notification {
  id: string
  userId: string
  title: string
  message: string
  type: NotificationType
  isRead: boolean
  link?: string | null
  createdAt: string
}

interface NotificationResponse {
  data: Notification[]
  unreadCount: number
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

const TYPE_ICONS: Record<NotificationType, typeof Info> = {
  info: Info,
  warning: AlertTriangle,
  success: CheckCircle,
  error: XCircle,
}

const TYPE_COLORS: Record<NotificationType, string> = {
  info: 'text-blue-400',
  warning: 'text-amber-400',
  success: 'text-green-400',
  error: 'text-red-400',
}

const FILTER_OPTIONS: { label: string; value: FilterType }[] = [
  { label: 'All', value: 'all' },
  { label: 'Unread', value: 'unread' },
  { label: 'Info', value: 'info' },
  { label: 'Warning', value: 'warning' },
  { label: 'Success', value: 'success' },
  { label: 'Error', value: 'error' },
]

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHour < 24) return `${diffHour}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  return date.toLocaleDateString()
}

export function NotificationsView() {
  const queryClient = useQueryClient()
  const user = useAppStore((s) => s.user)
  const setUnreadNotifications = useAppStore((s) => s.setUnreadNotifications)

  const [filter, setFilter] = useState<FilterType>('all')
  const [page, setPage] = useState(1)

  // Build query params
  const queryParams = new URLSearchParams()
  if (user?.id) queryParams.set('userId', user.id)
  if (filter === 'unread') queryParams.set('isRead', 'false')
  else if (filter !== 'all') queryParams.set('type', filter)
  queryParams.set('page', page.toString())
  queryParams.set('limit', '20')

  const { data, isLoading } = useQuery<NotificationResponse>({
    queryKey: ['notifications', user?.id, filter, page],
    queryFn: async () => {
      if (!user?.id) return { data: [], unreadCount: 0, pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }
      const res = await api.get<NotificationResponse>(`/notifications?${queryParams.toString()}`)
      return res.data ?? { data: [], unreadCount: 0, pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }
    },
    enabled: !!user?.id,
  })

  // Update unread count in store
  const unreadCount = data?.unreadCount ?? 0

  // Sync unread count to global store for sidebar badge
  React.useEffect(() => {
    if (unreadCount !== undefined) setUnreadNotifications(unreadCount)
  }, [unreadCount, setUnreadNotifications])

  // Mark single as read
  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiThrow(api.put(`/notifications/${id}`, { isRead: true }))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] })
    },
  })

  // Mark all as read
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) return
      await apiThrow(api.post('/notifications/bulk-read', { userId: user.id }))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] })
      setUnreadNotifications(0)
    },
  })

  const notifications = data?.data ?? []
  const pagination = data?.pagination

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-8 w-8 text-[#10B981]" />
          <h1 className="font-heading text-3xl font-bold text-foreground">Notifications</h1>
          {unreadCount > 0 && (
            <span className="font-mono text-sm bg-[#10B981] text-white px-2.5 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            {markAllReadMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            Mark All Read
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => { setFilter(opt.value); setPage(1) }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
              filter === opt.value
                ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30'
                : 'bg-card text-muted-foreground border border-border hover:text-foreground hover:border-border'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Notification List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-8 w-8 text-[#10B981] animate-spin" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center">
          <Bell className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground">No notifications found</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[50vh] sm:max-h-[65vh] overflow-auto custom-scrollbar">
          {notifications.map((notification) => {
            const Icon = TYPE_ICONS[notification.type] || Info
            const colorClass = TYPE_COLORS[notification.type] || 'text-blue-400'

            return (
              <div
                key={notification.id}
                className={`bg-card border rounded-2xl p-4 transition-all duration-200 ${
                  notification.isRead
                    ? 'border-border opacity-60'
                    : 'border-l-[#10B981] border-l-2 border-r-border border-t-border border-b-border bg-card/90'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={`mt-0.5 ${colorClass}`}>
                    <Icon className="h-5 w-5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className={`text-sm font-semibold ${notification.isRead ? 'text-muted-foreground' : 'text-foreground'}`}>
                        {notification.title}
                      </h3>
                      <span className="text-muted-foreground text-xs font-mono whitespace-nowrap">
                        {formatTimeAgo(notification.createdAt)}
                      </span>
                    </div>
                    <p className={`text-sm mt-0.5 ${notification.isRead ? 'text-muted-foreground/60' : 'text-muted-foreground'}`}>
                      {notification.message}
                    </p>
                  </div>

                  {/* Mark read button */}
                  {!notification.isRead && (
                    <button
                      onClick={() => markReadMutation.mutate(notification.id)}
                      disabled={markReadMutation.isPending}
                      className="text-muted-foreground hover:text-[#10B981] transition-colors p-1 rounded-lg hover:bg-secondary/50 disabled:opacity-50"
                      title="Mark as read"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
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
