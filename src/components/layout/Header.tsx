'use client';

import { useSession, signOut } from 'next-auth/react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sun,
  Moon,
  Settings,
  LogOut,
  User,
  Calendar,
  Clock,
  Search,
  GraduationCap,
  Keyboard,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import Image from 'next/image';
import { useAppStore } from '@/store';
import { useState, useEffect } from 'react';
import { NotificationBadge } from '@/components/layout/NotificationBadge';
import { ConnectionStatus } from '@/components/layout/ConnectionStatus';
import { SearchDialog, openSearchDialog } from '@/components/layout/SearchDialog';
import { SettingsDialog } from '@/components/layout/SettingsDialog';
import { cn } from '@/lib/utils';


export function Header() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const { setViewMode } = useAppStore();
  const [mounted, setMounted] = useState(false);
  const [userImage, setUserImage] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [semesterInfo, setSemesterInfo] = useState<string>('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  // Scroll listener for header shadow effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 8);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch semester info
  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          const semester = data.semester || '1st Semester';
          const academicYear = data.academic_year || '2024-2025';
          setSemesterInfo(`${semester} ${academicYear}`);
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      }
    }
    fetchSettings();
  }, []);



  // Format date and time
  const formatDate = () => {
    return currentTime.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = () => {
    return currentTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  // Fetch user image separately (not stored in JWT to prevent token size issues)
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

  const getRoleBadge = (role: string) => {
    const badges: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
      admin: { label: 'Admin', variant: 'default' },
      faculty: { label: 'Faculty', variant: 'outline' },
    };
    return badges[role] || { label: role, variant: 'outline' };
  };

  const roleBadge = getRoleBadge(session?.user?.role || '');

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    window.location.reload();
  };

  return (
    <>
      <header className={cn(
        'sticky top-0 z-30 flex flex-col relative glass-header',
        isScrolled && 'scrolled'
      )}>
        {/* Animated gradient border-bottom that shifts colors */}
        <div className="header-gradient-line" />
        <div className="flex h-14 sm:h-16 items-center gap-1.5 sm:gap-4 px-3 sm:px-4 lg:px-6 transition-all duration-300">
          {/* Logo for mobile - only shows on mobile */}
          <Image 
            src="/ptc-app-logo.jpg" 
            alt="PTC Logo" 
            width={40} 
            height={40}
            className="rounded-lg md:hidden shrink-0"
            unoptimized
          />

          {/* Search Trigger Button */}
          <Button
            variant="outline"
            data-tour="search-trigger"
            className="hidden sm:flex items-center gap-2 h-9 px-4 text-muted-foreground bg-muted/40 border-border/50 hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-foreground active:scale-[0.98] transition-all duration-200 shrink-0 focus-visible:ring-1 focus-visible:ring-emerald-500/50 shadow-sm hover:shadow-md"
            onClick={openSearchDialog}
          >
            <Search className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
            <span className="text-sm font-medium">Search...</span>
            <kbd className="pointer-events-none ml-4 hidden lg:inline-flex h-5 select-none items-center gap-1 rounded-md border border-border/60 bg-background/80 px-1.5 font-mono text-[10px] font-medium text-muted-foreground shadow-sm">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>

          {/* Mobile Search Icon Button - more prominent */}
          <Button
            variant="outline"
            size="icon"
            className="sm:hidden h-11 w-11 shrink-0 touch-manipulation active:scale-95 transition-transform duration-100 border-border/60 bg-muted/40 hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-600 dark:hover:text-emerald-400 shadow-sm"
            onClick={openSearchDialog}
            aria-label="Search"
          >
            <Search className="h-[18px] w-[18px]" />
            <span className="sr-only">Search</span>
          </Button>

          {/* Semester Selector Badge - Desktop only */}
          {semesterInfo && (
            <Badge
              variant="outline"
              className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 cursor-default transition-colors shrink-0"
            >
              <GraduationCap className="h-3 w-3" />
              {semesterInfo}
            </Badge>
          )}

          {/* Current Date and Time - Center */}
          <div className="hidden sm:flex flex-1 items-center justify-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/50 border border-border/50 hover:border-emerald-500/30 transition-colors duration-200">
                <Calendar className="h-4 w-4 text-emerald-500 dark:text-emerald-400 animate-emerald-pulse-icon" />
                <span className="text-xs text-muted-foreground">{formatDate()}</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/50 border border-border/50 hover:border-emerald-500/30 transition-colors duration-200">
                <Clock className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                <span className="text-xs font-mono text-muted-foreground/70 tabular-nums">{formatTime()}</span>
              </div>
            </div>
          </div>

          {/* Mobile: Show day and time */}
          <div className="flex sm:hidden flex-1 items-center justify-center gap-2 min-w-0 overflow-hidden">
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-muted/50 border border-border/50 min-w-0">
              <Calendar className="h-3 w-3 text-emerald-500 dark:text-emerald-400 animate-emerald-pulse-icon shrink-0" />
              <span className="text-[11px] font-medium truncate">{currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-muted/50 border border-border/50 shrink-0">
              <Clock className="h-3 w-3 text-emerald-500 dark:text-emerald-400" />
              <span className="text-[11px] font-medium font-mono">{currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
            </div>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-0.5 sm:gap-2 shrink-0">
            {/* Connection Status Indicator */}
            <ConnectionStatus />
            {/* Keyboard Shortcuts Hint */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden lg:flex h-9 w-9 text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10 transition-all duration-200"
                  onClick={() => {
                    // Dispatch keyboard event to trigger the shortcuts dialog
                    window.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }));
                  }}
                >
                  <Keyboard className="h-4 w-4" />
                  <span className="sr-only">Keyboard Shortcuts</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Keyboard Shortcuts</p>
              </TooltipContent>
            </Tooltip>

            {/* Theme Toggle */}
            {mounted && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="h-9 w-9 sm:h-11 sm:w-11 touch-manipulation hover:bg-muted/50 active:scale-95 transition-all duration-200 hover:text-amber-500 dark:hover:text-amber-400"
                aria-label="Toggle theme"
              >
                {theme === 'dark' 
                  ? <Sun className="h-[18px] w-[18px] sm:h-5 sm:w-5 transition-transform duration-500 rotate-0" /> 
                  : <Moon className="h-[18px] w-[18px] sm:h-5 sm:w-5 transition-transform duration-500 rotate-0" />}
              </Button>
            )}

            {/* Notification Badge - navigates to notifications view */}
            <NotificationBadge />

            {/* Settings Dialog Trigger */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSettingsOpen(true)}
              className="h-11 w-11 text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10 touch-manipulation transition-all duration-150"
              aria-label="Settings"
            >
              <Settings className="h-5 w-5" />
              <span className="sr-only">Settings</span>
            </Button>

            {/* User Menu - Hidden for faculty on mobile, shown for others and faculty on desktop */}
            {!(session?.user?.role === 'faculty') ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-11 w-11 rounded-full touch-manipulation hover:bg-muted/50 active:scale-95 transition-all duration-200" aria-label="User menu">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={userImage || ''} alt={session?.user?.name || ''} />
                      <AvatarFallback>
                        {session?.user?.name?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    {/* Online status dot */}
                    <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-green-500 ring-2 ring-background" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 rounded-xl bg-popover/95 backdrop-blur-xl border-border/50 shadow-xl" align="end" forceMount sideOffset={8}>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1.5">
                      <p className="text-sm font-medium leading-none">{session?.user?.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">{session?.user?.email}</p>
                      <div className="pt-2 flex items-center gap-2">
                        <Badge variant={roleBadge.variant}>{roleBadge.label}</Badge>
                        <span className="text-[10px] font-medium text-green-500 dark:text-green-400">Online</span>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setViewMode('profile')} className="rounded-lg mx-1 my-0.5 focus:bg-emerald-500/10 focus:text-emerald-600 dark:focus:text-emerald-400 transition-colors duration-150">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  {session?.user?.role === 'admin' && (
                    <DropdownMenuItem onClick={() => setViewMode('settings')} className="rounded-lg mx-1 my-0.5 focus:bg-emerald-500/10 focus:text-emerald-600 dark:focus:text-emerald-400 transition-colors duration-150">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive rounded-lg mx-1 my-0.5 focus:bg-destructive/10 transition-colors duration-150">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              /* Faculty - show profile dropdown on desktop only */
              <div className="hidden md:block">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-9 w-9 rounded-full hover:bg-muted/50 active:scale-95 transition-all duration-200">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={userImage || ''} alt={session?.user?.name || ''} />
                        <AvatarFallback>
                          {session?.user?.name?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      {/* Online status dot */}
                      <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-green-500 ring-2 ring-background" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 rounded-xl bg-popover/95 backdrop-blur-xl border-border/50 shadow-xl" align="end" forceMount sideOffset={8}>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1.5">
                        <p className="text-sm font-medium leading-none">{session?.user?.name}</p>
                        <p className="text-xs leading-none text-muted-foreground">{session?.user?.email}</p>
                        <div className="pt-2 flex items-center gap-2">
                          <Badge variant={roleBadge.variant}>{roleBadge.label}</Badge>
                          <span className="text-[10px] font-medium text-green-500 dark:text-green-400">Online</span>
                        </div>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setViewMode('profile')} className="rounded-lg mx-1 my-0.5 focus:bg-emerald-500/10 focus:text-emerald-600 dark:focus:text-emerald-400 transition-colors duration-150">
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="text-destructive rounded-lg mx-1 my-0.5 focus:bg-destructive/10 transition-colors duration-150">
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Global Search Dialog */}
      <SearchDialog />

      {/* Settings Dialog */}
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
