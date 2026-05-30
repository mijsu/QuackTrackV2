'use client'

import { useEffect, useState, useCallback } from 'react'

// ─── Install Prompt UI ───────────────────────────────────────────────────────
function InstallPrompt({
  onInstall,
  onDismiss,
}: {
  onInstall: () => void
  onDismiss: () => void
}) {
  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[90vw] max-w-md -translate-x-1/2 animate-in slide-in-from-bottom-4 rounded-2xl border border-emerald-500/20 bg-card/95 p-4 shadow-2xl shadow-emerald-500/10 backdrop-blur-xl">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
          <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0-3-3m3 3 3-3M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">Install QuackTrack</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Get the best experience with our standalone app.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onDismiss}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent"
          >
            Not now
          </button>
          <button
            onClick={onInstall}
            className="rounded-lg bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-400 active:scale-95"
          >
            Install
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Update Notification ─────────────────────────────────────────────────────
function UpdateNotification({
  onUpdate,
  onDismiss,
}: {
  onUpdate: () => void
  onDismiss: () => void
}) {
  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-4 rounded-2xl border border-emerald-500/20 bg-card/95 p-4 shadow-2xl shadow-emerald-500/10 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
          <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 0 0 4.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 0 1-15.357-2m15.357 2H15" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Update available</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            A new version is ready. Refresh to update.
          </p>
        </div>
        <button
          onClick={onUpdate}
          className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-400 active:scale-95"
        >
          Refresh
        </button>
        <button
          onClick={onDismiss}
          className="rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

// ─── Offline Banner ──────────────────────────────────────────────────────────
function OfflineBanner() {
  return (
    <div className="fixed left-0 right-0 top-0 z-[60] bg-amber-500/90 px-4 py-1.5 text-center text-xs font-medium text-white backdrop-blur-sm">
      You are currently offline. Some features may be limited.
    </div>
  )
}

// ─── PwaInstaller ────────────────────────────────────────────────────────────
export function PwaInstaller() {
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null)
  const [showInstallBanner, setShowInstallBanner] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches) return false
    try {
      const dismissed = localStorage.getItem('quacktrack-pwa-dismissed')
      if (dismissed) {
        const elapsed = Date.now() - Number(dismissed)
        if (elapsed < 7 * 24 * 60 * 60 * 1000) return false
        localStorage.removeItem('quacktrack-pwa-dismissed')
      }
    } catch { /* noop */ }
    return false
  })
  const [showUpdateBanner, setShowUpdateBanner] = useState(false)
  const [isOffline, setIsOffline] = useState(false)
  const [updateSw, setUpdateSw] = useState<ServiceWorker | null>(null)

  // ── Track online/offline status ──
  useEffect(() => {
    const goOnline = () => setIsOffline(false)
    const goOffline = () => setIsOffline(true)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  // ── Register service worker & handle updates ──
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    // Unregister any existing service workers first to avoid stale chunk issues
    navigator.serviceWorker.getRegistrations().then(regs => {
      regs.forEach(reg => reg.unregister())
    })

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js')

        // Check for updates on page load
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (!newWorker) return

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available — show update banner
              setUpdateSw(newWorker)
              setShowUpdateBanner(true)
            }
          })
        })
      } catch {
        // Service worker registration failed — non-critical
      }
    }

    registerSW()
  }, [])

  // ── Listen for beforeinstallprompt ──
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e)
      setShowInstallBanner(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
  }, [])

  // ── Handle install ──
  const handleInstall = useCallback(() => {
    if (!installPrompt) return
    const prompt = installPrompt as Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }
    prompt.prompt()
    prompt.userChoice.then(() => {
      setInstallPrompt(null)
      setShowInstallBanner(false)
    })
  }, [installPrompt])

  // ── Handle update ──
  const handleUpdate = useCallback(() => {
    if (updateSw) {
      updateSw.postMessage({ type: 'SKIP_WAITING' })
    }
    setShowUpdateBanner(false)
    window.location.reload()
  }, [updateSw])

  // ── Auto-fullscreen on mobile ──
  useEffect(() => {
    if (window.innerWidth >= 768) return
    if (document.fullscreenElement !== null) return

    const enterFullscreen = () => {
      try {
        const el = document.documentElement
        if (el.requestFullscreen) {
          el.requestFullscreen().catch(() => {})
        }
      } catch {
        // Fullscreen API not supported
      }
    }

    enterFullscreen()
    document.addEventListener('click', enterFullscreen, { once: true })
    document.addEventListener('touchstart', enterFullscreen, { once: true })

    return () => {
      document.removeEventListener('click', enterFullscreen)
      document.removeEventListener('touchstart', enterFullscreen)
    }
  }, [])

  // ── Dismiss install banner for 7 days ──
  const handleDismissInstall = useCallback(() => {
    setShowInstallBanner(false)
    try {
      localStorage.setItem('quacktrack-pwa-dismissed', Date.now().toString())
    } catch { /* noop */ }
  }, [])

  // ── Dismiss update banner ──
  const handleDismissUpdate = useCallback(() => {
    setShowUpdateBanner(false)
  }, [])



  return (
    <>
      {isOffline && <OfflineBanner />}
      {showInstallBanner && installPrompt && (
        <InstallPrompt onInstall={handleInstall} onDismiss={handleDismissInstall} />
      )}
      {showUpdateBanner && (
        <UpdateNotification onUpdate={handleUpdate} onDismiss={handleDismissUpdate} />
      )}
    </>
  )
}
