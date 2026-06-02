'use client'

import { Minimize2, MoonStar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/store/app-store'
import { useIsMobile } from '@/hooks/use-mobile'

export function ZenModeToggle() {
  const { zenMode, toggleZenMode, user } = useAppStore()
  const isMobile = useIsMobile()
  const isFaculty = user?.role === 'faculty'

  // Only show for faculty on mobile
  if (!isFaculty || !isMobile) return null

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleZenMode}
      className="size-8 text-muted-foreground hover:text-foreground relative"
      title={zenMode ? 'Exit focus mode' : 'Focus mode'}
    >
      {zenMode ? <Minimize2 className="size-4" /> : <MoonStar className="size-4" />}
    </Button>
  )
}
