'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { useAppStore, type ViewMode } from '@/store';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  motion,
  AnimatePresence,
} from 'framer-motion';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Building2,
  BookOpen,
  DoorOpen,
  GraduationCap,
  Settings,
  Bell,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  UserCog,
  User,
  BarChart3,
  History,
  Layers,
  Sparkles,
  Heart,
  Megaphone,
  BookMarked,
  type LucideIcon,
} from 'lucide-react';
import Image from 'next/image';

interface NavItem {
  id: ViewMode;
  label: string;
  icon: LucideIcon;
  roles: string[];
  badge?: number;
  indicator?: 'dot' | 'sparkle';
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'faculty'], indicator: 'dot' },
  { id: 'calendar', label: 'Calendar', icon: Calendar, roles: ['admin', 'faculty'] },
  { id: 'schedules', label: 'Schedules', icon: CalendarDays, roles: ['admin'] },
  { id: 'faculty', label: 'Faculty', icon: Users, roles: ['admin'] },
  { id: 'subjects', label: 'Subjects', icon: BookOpen, roles: ['admin'] },
  { id: 'rooms', label: 'Rooms', icon: DoorOpen, roles: ['admin'] },
  { id: 'sections', label: 'Sections', icon: GraduationCap, roles: ['admin'] },
  { id: 'departments', label: 'Departments', icon: Building2, roles: ['admin'] },
  { id: 'programs', label: 'Programs', icon: Layers, roles: ['admin'] },
  { id: 'curriculum', label: 'Curriculum', icon: BookMarked, roles: ['admin'] },
  { id: 'users', label: 'Users', icon: UserCog, roles: ['admin'] },
  { id: 'conflicts', label: 'Conflicts', icon: AlertTriangle, roles: ['admin'] },
  { id: 'reports', label: 'Reports', icon: BarChart3, roles: ['admin'], indicator: 'sparkle' },
  { id: 'audit', label: 'Audit Log', icon: History, roles: ['admin'] },
  { id: 'announcements', label: 'Announcements', icon: Megaphone, roles: ['admin'] },
];

const bottomNavItems: NavItem[] = [
  { id: 'notifications', label: 'Notifications', icon: Bell, roles: ['admin', 'faculty'] },
  { id: 'profile', label: 'Profile', icon: User, roles: ['admin', 'faculty'] },
  { id: 'settings', label: 'Settings', icon: Settings, roles: ['admin'] },
];

// Animation variants for sidebar width transition
const sidebarVariants = {
  expanded: {
    width: 220,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.8, 0.25, 1],
    },
  },
  collapsed: {
    width: 56,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.8, 0.25, 1],
    },
  },
};

// Fade/slide variants for label text
const labelVariants = {
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.2, ease: 'easeOut' },
  },
  hidden: {
    opacity: 0,
    x: -8,
    transition: { duration: 0.15, ease: 'easeIn' },
  },
};

// Active item spring animation
const activeItemVariants = {
  active: {
    scale: 1,
    transition: { type: 'spring', stiffness: 400, damping: 25 },
  },
  inactive: {
    scale: 1,
  },
};

export function Sidebar() {
  const { data: session } = useSession();
  const { viewMode, setViewMode, sidebarCollapsed, setSidebarCollapsed } = useAppStore();
  const [unreadCount, setUnreadCount] = useState(0);
  const [scrollPercent, setScrollPercent] = useState(0);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const userRole = session?.user?.role || '';
  const filteredNavItems = navItems.filter(item => item.roles.includes(userRole));
  const filteredBottomNavItems = bottomNavItems.filter(item => item.roles.includes(userRole));

  const handleNavClick = (id: ViewMode) => {
    setViewMode(id);
  };

  // Fetch unread notification count
  useEffect(() => {
    if (!session?.user?.id) return;

    async function fetchUnreadCount() {
      try {
        const res = await fetch(`/api/notifications?userId=${session.user.id}&unreadOnly=true`);
        if (res.ok) {
          const notifications = await res.json();
          setUnreadCount(Array.isArray(notifications) ? notifications.length : 0);
        }
      } catch {
        // Silently fail
      }
    }

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, [session?.user?.id]);

  // Scroll progress tracking
  const handleScroll = useCallback(() => {
    if (!scrollAreaRef.current) return;
    const viewport = scrollAreaRef.current.querySelector('[data-slot="scroll-area-viewport"]') as HTMLElement;
    if (!viewport) return;
    const { scrollTop, scrollHeight, clientHeight } = viewport;
    const maxScroll = scrollHeight - clientHeight;
    if (maxScroll > 0) {
      setScrollPercent(Math.round((scrollTop / maxScroll) * 100));
    } else {
      setScrollPercent(0);
    }
  }, []);

  useEffect(() => {
    if (!scrollAreaRef.current) return;
    const viewport = scrollAreaRef.current.querySelector('[data-slot="scroll-area-viewport"]') as HTMLElement;
    if (!viewport) return;
    viewport.addEventListener('scroll', handleScroll, { passive: true });
    return () => viewport.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return (
    <TooltipProvider delayDuration={0}>
      {/* Desktop Sidebar - Hidden on mobile */}
      <motion.aside
        id="sidebar-navigation"
        className={cn(
          'hidden md:flex fixed left-0 top-0 z-40 h-screen border-r bg-card flex-col overflow-hidden',
        )}
        variants={sidebarVariants}
        animate={sidebarCollapsed ? 'collapsed' : 'expanded'}
        initial={false}
      >
        {/* Subtle inner shadow for depth */}
        <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-border to-transparent opacity-60 pointer-events-none" />

        {/* Logo + Toggle */}
        <div className={cn(
          'border-b relative z-10 shrink-0',
          sidebarCollapsed
            ? 'flex flex-col items-center py-2 gap-1'
            : 'flex h-14 items-center justify-between px-3'
        )}>
          <AnimatePresence mode="wait">
            {!sidebarCollapsed && (
              <motion.div
                key="logo-expanded"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="flex items-center gap-2 min-w-0"
              >
                <Image 
                  src="/ptc-app-logo.jpg" 
                  alt="PTC Logo" 
                  width={32} 
                  height={32}
                  className="rounded-lg shrink-0"
                  unoptimized
                />
                <div className="overflow-hidden">
                  <h1 className="text-sm font-bold flex items-center gap-1 whitespace-nowrap">
                    <span className="text-gradient-emerald">QuackTrack</span>
                    <span className="text-sm">🦆</span>
                  </h1>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    Scheduling System
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {sidebarCollapsed && (
            <Image 
              src="/ptc-app-logo.jpg" 
              alt="PTC Logo" 
              width={32} 
              height={32}
              className="rounded-lg"
              unoptimized
            />
          )}
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className={cn(
                'shrink-0 relative z-10 rounded-full',
                sidebarCollapsed ? 'h-7 w-7' : 'h-7 w-7'
              )}
            >
              <motion.div
                initial={false}
                animate={{ rotate: sidebarCollapsed ? 0 : 180 }}
                transition={{ duration: 0.3, ease: [0.25, 0.8, 0.25, 1] }}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </motion.div>
            </Button>
          </motion.div>
        </div>

        {/* Scroll Progress Indicator */}
        <div
          className="sidebar-scroll-progress h-[2px] shrink-0 transition-[width] duration-150 ease-out"
          style={{
            '--scroll-percent': `${scrollPercent}`,
            width: `${Math.max(scrollPercent, 0)}%`,
          } as React.CSSProperties}
        />

        {/* Main Navigation - Scrollable */}
        <ScrollArea ref={scrollAreaRef} className="flex-1 py-2">
          <nav className="space-y-0.5 px-2 relative z-10">
            {filteredNavItems.map((item) => {
              const isActive = viewMode === item.id;
              const isHovered = hoveredItem === item.id;
              return (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>
                    <motion.button
                      onClick={() => handleNavClick(item.id)}
                      onMouseEnter={() => setHoveredItem(item.id)}
                      onMouseLeave={() => setHoveredItem(null)}
                      variants={activeItemVariants}
                      animate={isActive ? 'active' : 'inactive'}
                      whileHover={{ x: 2 }}
                      whileTap={{ scale: 0.97 }}
                      className={cn(
                        'relative flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-all duration-200',
                        isActive
                          ? 'bg-gradient-to-r from-emerald-50 via-emerald-50/80 to-transparent text-emerald-700 dark:from-emerald-500/15 dark:via-emerald-500/8 dark:to-transparent dark:text-emerald-400 shadow-sm shadow-emerald-500/5'
                          : 'text-muted-foreground sidebar-nav-hover hover:text-foreground',
                        sidebarCollapsed && 'justify-center px-0'
                      )}
                    >
                      {/* Active left border indicator with glow */}
                      <div className={cn(
                        'absolute left-0 top-1 bottom-1 w-[3px] rounded-r-full transition-all duration-200',
                        isActive
                          ? 'bg-gradient-to-b from-emerald-500 to-teal-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                          : isHovered
                            ? 'bg-emerald-500/40'
                            : 'bg-transparent'
                      )} />

                      <item.icon className={cn(
                        'h-4 w-4 shrink-0 transition-all duration-200',
                        isActive && 'text-emerald-600 dark:text-emerald-400 scale-110',
                        isHovered && !isActive && 'scale-105 text-emerald-600/70 dark:text-emerald-400/70'
                      )} />
                      <AnimatePresence>
                        {!sidebarCollapsed && (
                          <motion.span
                            initial="hidden"
                            animate="visible"
                            exit="hidden"
                            variants={labelVariants}
                            className={cn('truncate', isActive && 'font-semibold')}
                          >
                            {item.label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                      {/* Green dot indicator */}
                      {!sidebarCollapsed && item.indicator === 'dot' && !isActive && (
                        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-500 sidebar-active-dot" />
                      )}
                      {/* Active state pulsing indicator dot when collapsed */}
                      {isActive && sidebarCollapsed && (
                        <motion.span
                          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-[2px] h-1.5 w-1.5 rounded-full bg-emerald-500 sidebar-active-dot"
                          layoutId="sidebar-active-indicator"
                        />
                      )}
                      {/* Sparkle indicator */}
                      {!sidebarCollapsed && item.indicator === 'sparkle' && (
                        <Sparkles className="ml-auto h-3 w-3 text-amber-500" />
                      )}
                    </motion.button>
                  </TooltipTrigger>
                  {sidebarCollapsed && (
                    <TooltipContent side="right" className="font-medium">
                      {item.label}
                    </TooltipContent>
                  )}
                </Tooltip>
              );
            })}
          </nav>

          {/* Bottom Nav Section */}
          {filteredBottomNavItems.length > 0 && (
            <>
              <Separator className="my-3 mx-2" />
              <nav className="space-y-0.5 px-2 relative z-10" data-tour="sidebar-bottom-nav">
                {filteredBottomNavItems.map((item) => {
                  const isActive = viewMode === item.id;
                  const isHovered = hoveredItem === item.id;
                  const showBadge = item.id === 'notifications' && unreadCount > 0;
                  return (
                    <Tooltip key={item.id}>
                      <TooltipTrigger asChild>
                        <motion.button
                          onClick={() => handleNavClick(item.id)}
                          onMouseEnter={() => setHoveredItem(item.id)}
                          onMouseLeave={() => setHoveredItem(null)}
                          whileHover={{ x: 2 }}
                          whileTap={{ scale: 0.97 }}
                          className={cn(
                            'relative flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-all duration-200',
                            isActive
                              ? 'bg-gradient-to-r from-emerald-50 via-emerald-50/80 to-transparent text-emerald-700 dark:from-emerald-500/15 dark:via-emerald-500/8 dark:to-transparent dark:text-emerald-400 shadow-sm shadow-emerald-500/5'
                              : 'text-muted-foreground sidebar-nav-hover hover:text-foreground',
                            sidebarCollapsed && 'justify-center px-0'
                          )}
                        >
                          {/* Active left border indicator with glow */}
                          <div className={cn(
                            'absolute left-0 top-1 bottom-1 w-[3px] rounded-r-full transition-all duration-200',
                            isActive
                              ? 'bg-gradient-to-b from-emerald-500 to-teal-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                              : isHovered
                                ? 'bg-emerald-500/40'
                                : 'bg-transparent'
                          )} />

                          <span className="relative shrink-0">
                            <item.icon className={cn(
                              'h-4 w-4 transition-all duration-200',
                              isActive && 'text-emerald-600 dark:text-emerald-400 scale-110',
                              isHovered && !isActive && 'scale-105 text-emerald-600/70 dark:text-emerald-400/70'
                            )} />
                            {showBadge && (
                              <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute -top-1.5 -right-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold leading-none text-white"
                              >
                                {unreadCount > 99 ? '99+' : unreadCount}
                              </motion.span>
                            )}
                          </span>
                          <AnimatePresence>
                            {!sidebarCollapsed && (
                              <motion.span
                                initial="hidden"
                                animate="visible"
                                exit="hidden"
                                variants={labelVariants}
                                className={cn('truncate', isActive && 'font-semibold')}
                              >
                                {item.label}
                              </motion.span>
                            )}
                          </AnimatePresence>
                          {!sidebarCollapsed && showBadge && (
                            <motion.span
                              initial="hidden"
                              animate="visible"
                              exit="hidden"
                              variants={labelVariants}
                              className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white"
                            >
                              {unreadCount > 99 ? '99+' : unreadCount}
                            </motion.span>
                          )}
                        </motion.button>
                      </TooltipTrigger>
                      {sidebarCollapsed && (
                        <TooltipContent side="right" className="font-medium">
                          {showBadge ? `${item.label} (${unreadCount > 99 ? '99+' : unreadCount})` : item.label}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  );
                })}
              </nav>
            </>
          )}

          {/* PTC Branding Footer */}
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="px-2 pb-3 pt-1"
              >
                <div className="section-divider" />
                <div className="bg-muted/30 dark:bg-muted/10 rounded-xl p-3 mt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg leading-none">🦆</span>
                    <span className="text-xs font-bold text-gradient-emerald">QuackTrack</span>
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      v2.0
                    </span>
                  </div>
                  <p className="flex items-center gap-1 mt-1.5 text-[10px] text-muted-foreground">
                    Made with <Heart className="h-2.5 w-2.5 text-emerald-500 fill-emerald-500" /> by PTC
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </ScrollArea>
      </motion.aside>
    </TooltipProvider>
  );
}
