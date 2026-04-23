'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/types';

type AvatarSize = 'sm' | 'md' | 'lg';

interface UserAvatarProps {
  name?: string | null;
  email?: string | null;
  role?: UserRole | string | null;
  image?: string | null;
  size?: AvatarSize;
  showOnlineStatus?: boolean;
  isOnline?: boolean;
  className?: string;
}

const sizeClasses: Record<AvatarSize, string> = {
  sm: 'h-7 w-7 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-12 w-12 text-base',
};

const statusDotSizes: Record<AvatarSize, string> = {
  sm: 'h-1.5 w-1.5 ring-1',
  md: 'h-2 w-2 ring-2',
  lg: 'h-2.5 w-2.5 ring-2',
};

const statusDotPositions: Record<AvatarSize, string> = {
  sm: 'bottom-0 right-0',
  md: 'bottom-0 right-0',
  lg: 'bottom-0.5 right-0.5',
};

function getInitials(name?: string | null): string {
  if (!name || !name.trim()) return 'U';

  const parts = name.trim().split(/\s+/);

  if (parts.length >= 2) {
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  return parts[0].charAt(0).toUpperCase();
}

function getRoleColor(role?: UserRole | string | null): string {
  switch (role) {
    case 'admin':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
    case 'faculty':
      return 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

export function UserAvatar({
  name,
  email,
  role,
  image,
  size = 'md',
  showOnlineStatus = true,
  isOnline = true,
  className,
}: UserAvatarProps) {
  const initials = getInitials(name);
  const roleColor = getRoleColor(role);

  return (
    <div className={cn('relative inline-flex shrink-0', className)}>
      <Avatar className={cn(sizeClasses[size])}>
        <AvatarImage src={image || ''} alt={name || 'User'} />
        <AvatarFallback
          className={cn(
            'font-semibold select-none',
            roleColor
          )}
        >
          {initials}
        </AvatarFallback>
      </Avatar>

      {showOnlineStatus && (
        <span
          className={cn(
            'absolute rounded-full ring-background z-10',
            statusDotPositions[size],
            statusDotSizes[size],
            isOnline
              ? 'bg-green-500 dark:bg-green-400'
              : 'bg-gray-400 dark:bg-gray-500'
          )}
        />
      )}
    </div>
  );
}
