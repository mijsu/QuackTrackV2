'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { useAppStore, type ViewMode } from '@/store';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
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
  CalendarDays,
  UserCog,
  FileText,
  Shield,
  BookMarked,
  User,
  MessageSquareWarning,
  MoreHorizontal,
  LogOut,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

interface NavItem {
  id: ViewMode;
  label: string;
  icon: LucideIcon;
  roles: string[];
}

// Primary navigation items for mobile bottom nav
const primaryNavItems: NavItem[] = [
  { id: 'dashboard', label: 'Home', icon: LayoutDashboard, roles: ['admin', 'faculty'] },
  { id: 'calendar', label: 'Calendar', icon: Calendar, roles: ['admin', 'faculty'] },
  { id: 'schedules', label: 'Schedules', icon: CalendarDays, roles: ['admin'] },
  { id: 'faculty', label: 'Faculty', icon: Users, roles: ['admin'] },
  { id: 'subjects', label: 'Subjects', icon: BookOpen, roles: ['admin'] },
  { id: 'rooms', label: 'Rooms', icon: DoorOpen, roles: ['admin'] },
  { id: 'sections', label: 'Sections', icon: GraduationCap, roles: ['admin'] },
  { id: 'departments', label: 'Depts', icon: Building2, roles: ['admin'] },
  { id: 'curriculum', label: 'Curriculum', icon: BookMarked, roles: ['admin'] },
  { id: 'users', label: 'Users', icon: UserCog, roles: ['admin'] },
  { id: 'conflicts', label: 'Conflicts', icon: AlertTriangle, roles: ['admin'] },
  { id: 'reports', label: 'Reports', icon: FileText, roles: ['admin'] },
  { id: 'preferences', label: 'Prefs', icon: Settings, roles: ['faculty'] },
  { id: 'my-responses', label: 'Responses', icon: MessageSquareWarning, roles: ['faculty'] },
  { id: 'notifications', label: 'Alerts', icon: Bell, roles: ['admin', 'faculty'] },
  { id: 'profile', label: 'Profile', icon: User, roles: ['admin', 'faculty'] },
  { id: 'settings', label: 'Settings', icon: Shield, roles: ['admin'] },
];

export function MobileBottomNav() {
  const { data: session } = useSession();
  const { viewMode, setViewMode } = useAppStore();
  const navContainerRef = useRef<HTMLDivElement>(null);
  const [isNarrowScreen, setIsNarrowScreen] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [fabBouncing, setFabBouncing] = useState(false);

  const userRole = session?.user?.role || '';
  const filteredNavItems = primaryNavItems.filter(item => item.roles.includes(userRole));

  const handleNavClick = (id: ViewMode) => {
    setViewMode(id);
  };

  // Check for narrow screens (< 360px) and landscape mode
  useEffect(() => {
    const checkViewport = () => {
      setIsNarrowScreen(window.innerWidth < 360);
      setIsLandscape(window.innerHeight < window.innerWidth && window.innerHeight < 500);
    };

    checkViewport();
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  // Fetch unread notification count for badge dot
  useEffect(() => {
    if (!session?.user?.id) return;

    const fetchUnread = async () => {
      try {
        const res = await fetch(`/api/notifications?userId=${session.user.id}&unreadOnly=true`);
        if (res.ok) {
          const notifications = await res.json();
          setHasUnread(Array.isArray(notifications) && notifications.length > 0);
        }
      } catch {
        // Silent fail
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [session?.user?.id]);

  // Hide bottom nav in landscape mode with keyboard
  if (isLandscape) {
    return null;
  }

  return (
    <nav
      id="mobile-bottom-nav"
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 md:hidden',
        // Enhanced glass-morphism backdrop effect
        'mobile-nav-glass',
        // Subtle top shadow for depth
        'shadow-[0_-4px_24px_rgba(0,0,0,0.06)]',
        // Dark mode shadow
        'dark:shadow-[0_-4px_24px_rgba(0,0,0,0.25)]',
        // Safe area for notched devices
        'safe-area-inset-bottom',
        'pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]'
      )}
    >
      {/* Gradient top border line - reversed header style */}
      <div className="absolute top-0 left-0 right-0 mobile-nav-gradient-top" />

      <ScrollArea className="w-full whitespace-nowrap">
        <div className="relative flex items-center justify-around px-1 py-1.5 gap-0.5">
          {filteredNavItems.slice(0, 2).map((item) => {
            const isActive = viewMode === item.id;
            const Icon = item.icon;
            const isNotification = item.id === 'notifications';
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={cn(
                  'relative flex flex-col items-center justify-center rounded-2xl transition-all duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] touch-manipulation haptic-tap select-none press-effect active:scale-95',
                  // Minimum 44px touch target
                  isNarrowScreen
                    ? 'min-w-[44px] min-h-[44px] px-2'
                    : 'min-w-[56px] min-h-[44px] h-14 px-3',
                  // Active state styling
                  isActive
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
              >
                {/* Active background pill with glow */}
                <div
                  className={cn(
                    'absolute inset-x-1 top-0.5 bottom-1 rounded-2xl transition-all duration-300',
                    isActive
                      ? 'mobile-nav-pill-active'
                      : 'bg-transparent'
                  )}
                />

                {/* Animated icon container */}
                <div className="relative">
                  <div className={cn(
                    'transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
                    isActive ? 'scale-110 -translate-y-0.5' : 'scale-100 opacity-80',
                    !isActive && 'hover:opacity-100 hover:scale-105'
                  )}>
                    <Icon className={cn(
                      'transition-colors duration-200',
                      isNarrowScreen ? 'h-5 w-5' : 'h-5 w-5 mb-1'
                    )} />
                  </div>

                  {/* Unread notification badge with pulse-ring animation */}
                  {isNotification && hasUnread && !isActive && (
                    <span className="absolute -top-1.5 -right-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-[2px] ring-background dark:ring-background pulse-ring pulse-ring-red" />
                  )}
                  {isNotification && hasUnread && isActive && (
                    <span className="absolute -top-1.5 -right-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-[2px] ring-background dark:ring-background pulse-ring pulse-ring-red" />
                  )}
                </div>

                {/* Text label (hidden on very narrow screens) */}
                {!isNarrowScreen && (
                  <span className={cn(
                    'text-[10px] font-medium transition-all duration-300',
                    isActive && 'font-semibold text-emerald-600 dark:text-emerald-400',
                    !isActive && 'opacity-80'
                  )}>
                    {item.label}
                  </span>
                )}

                {/* iOS-style active indicator dot below icon */}
                {isActive && (
                  <span className="absolute bottom-0.5 h-[3px] w-3 rounded-full bg-emerald-500 dark:bg-emerald-400 transition-all duration-300 animate-in fade-in slide-in-from-bottom-1 duration-300" />
                )}
              </button>
            );
          })}

          {/* Center FAB - Floating Action Button for Schedule Generation */}
          <button
            onClick={() => {
              setFabBouncing(true);
              setViewMode('schedules');
              setTimeout(() => setFabBouncing(false), 400);
            }}
            className={cn(
              'relative z-10 flex items-center justify-center rounded-full transition-all duration-200 touch-manipulation select-none',
              'h-12 w-12 -mt-5',
              'bg-gradient-to-br from-emerald-500 to-teal-500',
              'text-white shadow-lg shadow-emerald-500/30',
              'hover:shadow-xl hover:shadow-emerald-500/40 hover:from-emerald-600 hover:to-teal-600',
              'active:scale-95',
              'animate-fab-glow',
              fabBouncing && 'animate-fab-bounce'
            )}
            aria-label="Generate schedules"
          >
            <Sparkles className={cn(
              'h-5 w-5 transition-transform duration-200',
              fabBouncing && 'scale-110'
            )} />
          </button>

          {filteredNavItems.slice(2, 4).map((item) => {
            const isActive = viewMode === item.id;
            const Icon = item.icon;
            const isNotification = item.id === 'notifications';
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={cn(
                  'relative flex flex-col items-center justify-center rounded-2xl transition-all duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] touch-manipulation haptic-tap select-none press-effect active:scale-95',
                  // Minimum 44px touch target
                  isNarrowScreen
                    ? 'min-w-[44px] min-h-[44px] px-2'
                    : 'min-w-[56px] min-h-[44px] h-14 px-3',
                  // Active state styling
                  isActive
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
              >
                {/* Active background pill with glow */}
                <div
                  className={cn(
                    'absolute inset-x-1 top-0.5 bottom-1 rounded-2xl transition-all duration-300',
                    isActive
                      ? 'mobile-nav-pill-active'
                      : 'bg-transparent'
                  )}
                />

                {/* Animated icon container */}
                <div className="relative">
                  <div className={cn(
                    'transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
                    isActive ? 'scale-110 -translate-y-0.5' : 'scale-100 opacity-80',
                    !isActive && 'hover:opacity-100 hover:scale-105'
                  )}>
                    <Icon className={cn(
                      'transition-colors duration-200',
                      isNarrowScreen ? 'h-5 w-5' : 'h-5 w-5 mb-1'
                    )} />
                  </div>

                  {/* Unread notification badge with pulse-ring animation */}
                  {isNotification && hasUnread && !isActive && (
                    <span className="absolute -top-1.5 -right-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-[2px] ring-background dark:ring-background pulse-ring pulse-ring-red" />
                  )}
                  {isNotification && hasUnread && isActive && (
                    <span className="absolute -top-1.5 -right-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-[2px] ring-background dark:ring-background pulse-ring pulse-ring-red" />
                  )}
                </div>

                {/* Text label (hidden on very narrow screens) */}
                {!isNarrowScreen && (
                  <span className={cn(
                    'text-[10px] font-medium transition-all duration-300',
                    isActive && 'font-semibold text-emerald-600 dark:text-emerald-400',
                    !isActive && 'opacity-80'
                  )}>
                    {item.label}
                  </span>
                )}

                {/* iOS-style active indicator dot below icon */}
                {isActive && (
                  <span className="absolute bottom-0.5 h-[3px] w-3 rounded-full bg-emerald-500 dark:bg-emerald-400 transition-all duration-300 animate-in fade-in slide-in-from-bottom-1 duration-300" />
                )}
              </button>
            );
          })}
          
          {/* More button - shows remaining items in a popover */}
          {filteredNavItems.length > 4 && (
            <MoreNavItems 
              items={filteredNavItems.slice(4)} 
              currentView={viewMode}
              onNavClick={handleNavClick}
              isNarrowScreen={isNarrowScreen}
            />
          )}
        </div>
        <ScrollBar orientation="horizontal" className="h-0" />
      </ScrollArea>
    </nav>
  );
}

function MoreNavItems({ 
  items, 
  currentView, 
  onNavClick,
  isNarrowScreen 
}: { 
  items: NavItem[]; 
  currentView: ViewMode;
  onNavClick: (id: ViewMode) => void;
  isNarrowScreen: boolean;
}) {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [userImage, setUserImage] = useState<string | null>(null);

  const handleItemClick = useCallback((id: ViewMode) => {
    onNavClick(id);
    setOpen(false);
  }, [onNavClick]);

  const handleSignOut = async () => {
    setOpen(false);
    await signOut({ redirect: false });
    window.location.reload();
  };

  // Fetch user image for all roles
  useEffect(() => {
    const fetchUserImage = async () => {
      if (!session?.user?.id) return;
      try {
        const res = await fetch(`/api/users/${session.user.id}`);
        if (res.ok) {
          const data = await res.json();
          setUserImage(data.image);
        }
      } catch (error) {
        console.error('Error fetching user image:', error);
      }
    };
    
    fetchUserImage();
  }, [session?.user?.id]);

  const hasActiveItem = items.some(item => item.id === currentView);

  // Get role badge info
  const getRoleBadge = (role: string) => {
    const badges: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
      admin: { label: 'Admin', variant: 'default' },
      faculty: { label: 'Faculty', variant: 'outline' },
    };
    return badges[role] || { label: role, variant: 'outline' };
  };

  const roleBadge = getRoleBadge(session?.user?.role || '');

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'relative flex flex-col items-center justify-center rounded-2xl transition-all duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] touch-manipulation haptic-tap select-none',
            isNarrowScreen
              ? 'min-w-[44px] min-h-[44px] px-2'
              : 'min-w-[56px] min-h-[44px] h-14 px-2',
            hasActiveItem
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-muted-foreground hover:text-foreground'
          )}
          aria-label="More options"
        >
          {/* Active background pill */}
          <div
            className={cn(
              'absolute inset-x-1 top-0.5 bottom-1 rounded-2xl transition-all duration-300',
              hasActiveItem
                ? 'bg-emerald-500/12 dark:bg-emerald-500/15 shadow-[0_1px_4px_rgba(16,185,129,0.15)]'
                : 'bg-transparent'
            )}
          />
          <div className="relative transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]">
            <MoreHorizontal className={cn(
              'h-5 w-5 transition-all duration-300',
              hasActiveItem ? 'scale-110 -translate-y-0.5' : 'scale-100 opacity-80',
              !hasActiveItem && 'hover:opacity-100',
              !isNarrowScreen && 'mb-1'
            )} />
            {/* Green dot indicator when there's an active item in the More section */}
            {hasActiveItem && (
              <span className="absolute -top-1 -right-1.5 h-2 w-2 rounded-full bg-emerald-500 ring-[1.5px] ring-background dark:ring-background" />
            )}
          </div>
          {!isNarrowScreen && (
            <span className={cn(
              'text-[10px] font-medium transition-all duration-300',
              hasActiveItem && 'font-semibold text-emerald-600 dark:text-emerald-400',
              !hasActiveItem && 'opacity-80'
            )}>
              More
            </span>
          )}
          {/* iOS-style active indicator */}
          {hasActiveItem && (
            <span className="absolute bottom-0.5 h-[3px] w-3 rounded-full bg-emerald-500 dark:bg-emerald-400 transition-all duration-300 animate-in fade-in slide-in-from-bottom-1 duration-300" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent 
        align="end"
        side="top"
        sideOffset={8}
        className="w-72 p-0 rounded-2xl shadow-xl border-2 overflow-hidden"
      >
        {/* User Profile Section - shown for ALL roles */}
        <div className="p-4 bg-muted/30 border-b">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 border-2 border-primary/20">
              <AvatarImage src={userImage || session?.user?.image || ''} alt={session?.user?.name || ''} />
              <AvatarFallback className="text-lg bg-primary/10 text-primary">
                {session?.user?.name?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{session?.user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">{session?.user?.email}</p>
              <Badge variant={roleBadge.variant} className="mt-1 text-[10px]">
                {roleBadge.label}
              </Badge>
            </div>
          </div>
          {/* View Profile Link */}
          <button
            onClick={() => { handleItemClick('profile'); }}
            className="mt-3 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
          >
            <User className="h-3.5 w-3.5" />
            View Profile
          </button>
        </div>

        {/* Navigation Items */}
        <div className="p-2">
          <p className="text-xs font-semibold text-muted-foreground px-3 py-2 uppercase tracking-wider">
            More Options
          </p>
          <div className="space-y-1">
            {items.map((item) => {
              const isActive = currentView === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200',
                    isActive
                      ? 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-sm font-medium">{item.label}</span>
                  {isActive && (
                    <div className="ml-auto h-2 w-2 rounded-full bg-emerald-500" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sign Out - shown for ALL roles */}
        <div className="p-2 border-t">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-destructive hover:bg-destructive/10 transition-all duration-200"
          >
            <LogOut className="h-5 w-5" />
            <span className="text-sm font-medium">Sign out</span>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
