// ═══════════════════════════════════════════════════════════════════════════════
// QuackTrack V2 — Service Worker
// ═══════════════════════════════════════════════════════════════════════════════

const CACHE_NAME = 'quacktrack-v2-v3'
const STATIC_CACHE = 'quacktrack-static-v2'
const API_CACHE = 'quacktrack-api-v2'
const OFFLINE_URL = '/offline.html'

// Files to pre-cache on install — keep it minimal; Next.js assets are versioned
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  OFFLINE_URL,
]

// ─── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  )
})

// ─── Activate — clean old caches ─────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  const expectedCaches = [CACHE_NAME, STATIC_CACHE, API_CACHE]
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => !expectedCaches.includes(key))
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  )
})

// ─── Helper: is this a same-origin navigation request? ────────────────────────
function isNavigationRequest(request) {
  return request.mode === 'navigate'
}

// ─── Helper: is this an API call? ────────────────────────────────────────────
function isApiRequest(url) {
  return url.pathname.startsWith('/api/')
}

// ─── Helper: is this a static asset? ─────────────────────────────────────────
function isStaticAsset(url) {
  const extensions = ['.js', '.css', '.woff2', '.woff', '.ttf', '.eot', '.svg', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.ico', '.json']
  return extensions.some((ext) => url.pathname.endsWith(ext))
}

// ─── Helper: network-first strategy ──────────────────────────────────────────
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request)
    const clone = response.clone()
    if (response.ok) {
      caches.open(cacheName).then((cache) => cache.put(request, clone))
    }
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached
    // For navigation requests, show offline page
    if (isNavigationRequest(request)) {
      return caches.match(OFFLINE_URL)
    }
    return new Response(JSON.stringify({ error: 'You are offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

// ─── Helper: cache-first strategy ────────────────────────────────────────────
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request)
  if (cached) return cached
  try {
    const response = await fetch(request)
    const clone = response.clone()
    if (response.ok) {
      caches.open(cacheName).then((cache) => cache.put(request, clone))
    }
    return response
  } catch {
    return caches.match(OFFLINE_URL)
  }
}

// ─── Helper: stale-while-revalidate strategy ─────────────────────────────────
async function staleWhileRevalidate(request, cacheName) {
  const cached = await caches.match(request)
  const fetchPromise = fetch(request).then((response) => {
    const clone = response.clone()
    if (response.ok) {
      caches.open(cacheName).then((cache) => cache.put(request, clone))
    }
    return response
  }).catch(() => cached)
  return cached || fetchPromise
}

// ─── Fetch ──────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return

  // ── API calls: network-first with dedicated cache ──
  if (isApiRequest(url)) {
    event.respondWith(networkFirst(request, API_CACHE))
    return
  }

  // ── Static assets: cache-first ──
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }

  // ── Navigation / pages: network-first with offline fallback ──
  if (isNavigationRequest(request)) {
    event.respondWith(networkFirst(request, CACHE_NAME))
    return
  }

  // ── Everything else: stale-while-revalidate ──
  event.respondWith(staleWhileRevalidate(request, CACHE_NAME))
})

// ─── Message handling (for update notifications) ─────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
  if (event.data?.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME)
    caches.delete(STATIC_CACHE)
    caches.delete(API_CACHE)
  }
})

// ─── Periodic background sync (if supported) ────────────────────────────────
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'refresh-cache') {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => cache.add('/'))
    )
  }
})
