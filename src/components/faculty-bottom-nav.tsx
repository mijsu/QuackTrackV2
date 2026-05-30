'use client'

import { LayoutDashboard, Calendar, Clock, Bell, Settings } from 'lucide-react'
import { useAppStore, type ViewId } from '@/store/app-store'

const NAV_ITEMS: { title: string; view: ViewId; icon: React.ElementType }[] = [
  { title: 'Home', view: 'dashboard', icon: LayoutDashboard },
  { title: 'Schedules', view: 'schedules', icon: Calendar },
  { title: 'Preferences', view: 'preferences', icon: Clock },
  { title: 'Notifications', view: 'notifications', icon: Bell },
  { title: 'Settings', view: 'settings', icon: Settings },
]

export function FacultyBottomNav() {
  const { currentView, setCurrentView, unreadNotifications } = useAppStore()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around bg-card border-t border-border px-2 pb-2 h-16 safe-area-bottom md:hidden">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon
        const isActive = currentView === item.view
        return (
          <button
            key={item.view}
            onClick={() => setCurrentView(item.view)}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl transition-colors relative ${
              isActive
                ? 'text-[#10B981]'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="relative">
              <Icon className="size-5" />
              {item.view === 'notifications' && unreadNotifications > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-[#10B981] text-[8px] font-bold text-white">
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium leading-none">{item.title}</span>
            {isActive && (
              <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-[#10B981]" />
            )}
          </button>
        )
      })}
    </nav>
  )
}
