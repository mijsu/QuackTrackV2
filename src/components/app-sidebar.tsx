'use client'

import * as React from 'react'
import {
  AlertTriangle,
  Bell,
  BookOpen,
  Calendar,
  ChevronRight,
  ChevronsUpDown,
  Moon,
  Sun,
  User,
  LayoutDashboard,
  LogOut,
  Settings,
  Sparkles,
  Zap,
} from 'lucide-react'

import {
  Avatar,
  AvatarFallback,
} from '@/components/ui/avatar'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
import { useAppStore, type ViewId } from '@/store/app-store'
import { canAccessView, getRoleLabel } from '@/lib/roles'
import Image from 'next/image'

import { useTheme } from '@/lib/theme'

// ─── Nav Main (Collapsible sections) ────────────────────────────────────────

interface NavItem {
  title: string
  icon?: React.ElementType
  isActive?: boolean
  items?: {
    title: string
    view: ViewId
  }[]
  view?: ViewId // for single-item groups
}

function NavMain({ items }: { items: NavItem[] }) {
  const { currentView, setCurrentView, user, unreadNotifications } = useAppStore()
  const role = user?.role

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          // Single item (no sub-items) — only render if role can access the view
          if (!item.items || item.items.length === 0) {
            if (item.view && !canAccessView(role, item.view)) return null
            const isActive = currentView === item.view
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  tooltip={item.title}
                  isActive={isActive}
                  onClick={() => item.view && setCurrentView(item.view)}
                >
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          }

          // Collapsible group with sub-items — filter sub-items by role
          const visibleSubItems = item.items.filter((subItem) =>
            canAccessView(role, subItem.view)
          )
          // Hide the entire group if no sub-items are visible
          if (visibleSubItems.length === 0) return null

          const hasActiveChild = visibleSubItems.some((sub) => sub.view === currentView)
          return (
            <Collapsible
              key={item.title}
              asChild
              defaultOpen={hasActiveChild || item.isActive}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip={item.title}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {visibleSubItems.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton
                          isActive={currentView === subItem.view}
                          onClick={() => setCurrentView(subItem.view)}
                        >
                          <span>{subItem.title}</span>
                        </SidebarMenuSubButton>
                        {subItem.view === 'notifications' && unreadNotifications > 0 && (
                          <SidebarMenuAction>
                            <span className="flex size-5 items-center justify-center rounded-full bg-[#10B981] text-[10px] font-bold text-white">
                              {unreadNotifications > 9 ? '9+' : unreadNotifications}
                            </span>
                          </SidebarMenuAction>
                        )}
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}

// ─── Theme Toggle ───────────────────────────────────────────────────────────

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <SidebarMenuButton
        tooltip="Toggle Theme"
        className="text-sidebar-foreground/70"
      >
        <Sun className="size-4" />
        <span>Toggle Theme</span>
      </SidebarMenuButton>
    )
  }

  return (
    <SidebarMenuButton
      tooltip="Toggle Theme"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="text-sidebar-foreground/70 hover:text-sidebar-foreground"
    >
      {theme === 'dark' ? (
        <>
          <Sun className="size-4" />
          <span>Light Mode</span>
        </>
      ) : (
        <>
          <Moon className="size-4" />
          <span>Dark Mode</span>
        </>
      )}
    </SidebarMenuButton>
  )
}

// ─── Nav User ───────────────────────────────────────────────────────────────

function NavUser({
  user,
}: {
  user: {
    name: string
    email: string
    role: string
  }
}) {
  const { isMobile } = useSidebar()
  const { logout, setCurrentView } = useAppStore()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarFallback className="rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  {user.name?.charAt(0)?.toUpperCase() || 'A'}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                      {user.name?.charAt(0)?.toUpperCase() || 'A'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="truncate text-xs">{getRoleLabel(user.role)}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => setCurrentView('settings')}>
                <Sparkles />
                Settings
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => setCurrentView('settings')}>
                <User />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCurrentView('notifications')}>
                <Bell />
                Notifications
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={logout}>
                <LogOut />
                Log out
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

// ─── Navigation Data ────────────────────────────────────────────────────────

const navItems: NavItem[] = [
  {
    title: 'Overview',
    icon: LayoutDashboard,
    view: 'dashboard',
  },
  {
    title: 'Curriculum',
    icon: BookOpen,
    isActive: true,
    items: [
      { title: 'Departments', view: 'departments' },
      { title: 'Programs', view: 'programs' },
      { title: 'Subjects', view: 'subjects' },
      { title: 'Sections', view: 'sections' },
    ],
  },
  {
    title: 'Scheduling',
    icon: Calendar,
    items: [
      { title: 'Faculty', view: 'faculty' },
      { title: 'Schedules', view: 'schedules' },
      { title: 'Generate', view: 'generate' },
      { title: 'Conflicts', view: 'conflicts' },
      { title: 'Preferences', view: 'preferences' },
    ],
  },
  {
    title: 'System',
    icon: Settings,
    items: [
      { title: 'Notifications', view: 'notifications' },
      { title: 'Audit Log', view: 'audit-log' },
      { title: 'Settings', view: 'settings' },
    ],
  },
]

// ─── Main App Sidebar ───────────────────────────────────────────────────────

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, unreadNotifications } = useAppStore()

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="hover:bg-transparent cursor-default"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg overflow-hidden">
                <Image
                  src="/logo.jpg"
                  alt="QuackTrack Logo"
                  width={32}
                  height={32}
                  className="object-cover rounded-lg"
                />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-bold tracking-tight">
                  QuackTrack
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  Pateros Technological College
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <ThemeToggle />
          </SidebarMenuItem>
        </SidebarMenu>
        {user && <NavUser user={user} />}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
