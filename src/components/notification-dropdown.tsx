'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, apiThrow } from '@/lib/api'
import { useAppStore } from '@/store/app-store'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Bell,
  Info,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Check,
  Loader2,
  Settings,
} from 'lucide-react'

// --- Types ---
type NotificationType = 'info' | 'warning' | 'success' | 'error'

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

// --- Helpers ---
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

const TYPE_BG: Record<NotificationType, string> = {
  info: 'bg-blue-500/10',
  warning: 'bg-amber-500/10',
  success: 'bg-green-500/10',
  error: 'bg-red-500/10',
}

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

// --- Component ---
export function NotificationDropdown() {
  const queryClient = useQueryClient()
  const user = useAppStore((s) => s.user)
  const unreadNotifications = useAppStore((s) => s.unreadNotifications)
  const setUnreadNotifications = useAppStore((s) => s.setUnreadNotifications)
  const setCurrentView = useAppStore((s) => s.setCurrentView)
  const [open, setOpen] = useState(false)

  const { data, isLoading } = useQuery<NotificationResponse>({
    queryKey: ['notifications-dropdown', user?.id],
    queryFn: async () => {
      if (!user?.id) return { data: [], unreadCount: 0, pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }
      const res = await api.get<NotificationResponse>(`/notifications?userId=${user.id}&limit=20`)
      return res.data ?? { data: [], unreadCount: 0, pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }
    },
    enabled: !!user?.id && open,
  })

  const notifications = data?.data ?? []
  const unreadCount = data?.unreadCount ?? 0

  // Sync unread count to global store
  React.useEffect(() => {
    if (open && unreadCount !== undefined) setUnreadNotifications(unreadCount)
  }, [open, unreadCount, setUnreadNotifications])

  // Mark single as read
  const markReadMutation = useMutation({
    mutationFn: async (id: string) => apiThrow(api.put(`/notifications/${id}`, { isRead: true })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications-dropdown', user?.id] }),
  })

  // Mark all as read
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) return
      await apiThrow(api.post('/notifications/bulk-read', { userId: user.id }))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-dropdown', user?.id] })
      setUnreadNotifications(0)
    },
  })

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground hover:text-foreground relative"
        >
          <Bell className="size-4" />
          {unreadNotifications > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-[#10B981] text-[10px] font-bold text-white">
              {unreadNotifications > 9 ? '9+' : unreadNotifications}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[380px] p-0 bg-card border-border shadow-xl rounded-xl overflow-hidden"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-foreground">Notifications</h3>
            {unreadNotifications > 0 && (
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-full bg-[#10B981]/20 text-[#10B981]">
                {unreadNotifications} new
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
                className="text-[11px] text-muted-foreground hover:text-[#10B981] transition-colors flex items-center gap-1 px-2 py-1 rounded-md hover:bg-secondary/50 disabled:opacity-50"
              >
                {markAllReadMutation.isPending ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Check className="size-3" />
                )}
                Mark all read
              </button>
            )}
            <button
              onClick={() => { setOpen(false); setCurrentView('notifications') }}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-secondary/50"
              title="View all notifications"
            >
              <Settings className="size-3.5" />
            </button>
          </div>
        </div>

        {/* Notification list */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-5 text-[#10B981] animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Bell className="size-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">No notifications yet</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="divide-y divide-border">
              {notifications.map((notification) => {
                const Icon = TYPE_ICONS[notification.type] || Info
                const colorClass = TYPE_COLORS[notification.type] || 'text-blue-400'
                const bgClass = TYPE_BG[notification.type] || 'bg-blue-500/10'

                return (
                  <div
                    key={notification.id}
                    className={`px-4 py-3 transition-all duration-150 hover:bg-secondary/30 ${
                      notification.isRead ? 'opacity-50' : 'bg-card'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${bgClass}`}>
                        <Icon className={`size-3.5 ${colorClass}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className={`text-xs font-semibold leading-snug ${notification.isRead ? 'text-muted-foreground' : 'text-foreground'}`}>
                            {notification.title}
                          </h4>
                          <span className="text-[10px] text-muted-foreground/60 font-mono whitespace-nowrap mt-0.5">
                            {formatTimeAgo(notification.createdAt)}
                          </span>
                        </div>
                        <p className={`text-[11px] leading-relaxed mt-0.5 line-clamp-2 ${notification.isRead ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}>
                          {notification.message}
                        </p>
                      </div>

                      {/* Mark read */}
                      {!notification.isRead && (
                        <button
                          onClick={(e) => { e.stopPropagation(); markReadMutation.mutate(notification.id) }}
                          disabled={markReadMutation.isPending}
                          className="text-muted-foreground/40 hover:text-[#10B981] transition-colors p-1 rounded-md hover:bg-secondary/50 shrink-0 mt-0.5 disabled:opacity-50"
                          title="Mark as read"
                        >
                          <Check className="size-3" />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        )}

        {/* Footer */}
        {notifications.length > 0 && (
          <>
            <Separator className="bg-border" />
            <div className="px-4 py-2.5 bg-muted/20">
              <button
                onClick={() => { setOpen(false); setCurrentView('notifications') }}
                className="w-full text-center text-xs font-semibold text-[#10B981] hover:text-[#059669] transition-colors"
              >
                View All Notifications
              </button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
