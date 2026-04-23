/**
 * API Configuration for QuackTrack
 *
 * This module provides API configuration that works across:
 * - Web (local API routes)
 * - Desktop Electron (local server)
 * - Mobile Capacitor (production server)
 *
 * IMPORTANT: For mobile apps, the API URL is hardcoded because
 * environment variables are embedded at build time.
 */

// Production server URL - HARDCODED for mobile builds
// This ensures the APK always knows where to connect
const PRODUCTION_API_URL = 'https://quacktrack-dsvr.onrender.com';

// Check if we're in a mobile/Capacitor environment
function checkIsMobileApp(): boolean {
  if (typeof window === 'undefined') return false;

  // Check for Capacitor
  if (typeof (window as any).Capacitor !== 'undefined') return true;
  if (typeof (window as any).capacitorPlugins !== 'undefined') return true;

  // Check for file:// protocol (Capacitor serves from file://)
  if (window.location.protocol === 'file:') return true;

  // Check for Capacitor's special localhost
  if (window.location.hostname === 'localhost' &&
      (window.location.port === '' || window.location.port === '8100')) {
    // Additional check - if we're loading from capacitor assets
    if (document.querySelector('script[src*="capacitor"]')) return true;
  }

  return false;
}

// Cache the result
let _isMobileApp: boolean | null = null;

/**
 * Check if running in a mobile app (Capacitor)
 */
export function isMobileApp(): boolean {
  if (_isMobileApp === null) {
    _isMobileApp = checkIsMobileApp();
  }
  return _isMobileApp;
}

/**
 * Check if running in Electron desktop app
 */
export function isElectronApp(): boolean {
  if (typeof window === 'undefined') return false;
  return typeof (window as any).electronAPI !== 'undefined' ||
         navigator.userAgent.toLowerCase().includes('electron');
}

/**
 * Get the base URL for API calls
 */
export function getApiBaseUrl(): string {
  // Mobile app - ALWAYS use production server
  if (isMobileApp()) {
    console.log('[API Config] Mobile app detected, using production URL:', PRODUCTION_API_URL);
    return PRODUCTION_API_URL;
  }

  // Electron app or web - use local server (relative URLs)
  return '';
}

/**
 * Build full API URL
 */
export function getApiUrl(path: string): string {
  const base = getApiBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${cleanPath}` : cleanPath;
}

/**
 * Fetch wrapper that handles mobile/web differences
 */
export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = getApiUrl(path);

  console.log('[API Config] Fetching:', url);

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };

  // Add credentials for session cookies
  const fetchOptions: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    credentials: 'include',
    mode: 'cors', // Important for cross-origin requests
  };

  return fetch(url, fetchOptions);
}

/**
 * Convenience methods for common HTTP verbs
 */
export const api = {
  get: (path: string) => apiFetch(path),

  post: (path: string, data?: unknown) => apiFetch(path, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  }),

  put: (path: string, data?: unknown) => apiFetch(path, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  }),

  patch: (path: string, data?: unknown) => apiFetch(path, {
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined,
  }),

  delete: (path: string) => apiFetch(path, {
    method: 'DELETE',
  }),
};

// Export the production URL for reference
export { PRODUCTION_API_URL };

// Global fetch override for mobile apps - runs immediately
if (typeof window !== 'undefined') {
  // Store original fetch
  const _originalFetch = window.fetch;

  // Override fetch
  window.fetch = function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    let url: string | URL | Request = input;

    // Check if this is a relative API call that needs to be redirected
    if (typeof input === 'string' && input.startsWith('/api/')) {
      // Check if we're in mobile mode
      if (isMobileApp()) {
        url = PRODUCTION_API_URL + input;
        console.log('[API Config] Redirecting API call:', input, '->', url);

        // Ensure CORS and credentials are set
        init = {
          ...init,
          credentials: 'include',
          mode: 'cors',
          headers: {
            'Content-Type': 'application/json',
            ...init?.headers,
          },
        };
      }
    }

    return _originalFetch(url, init);
  };

  console.log('[API Config] Fetch interceptor installed. Mobile mode:', isMobileApp());
}
