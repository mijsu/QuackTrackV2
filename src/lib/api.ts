const API_BASE = '/api'

interface ApiResponse<T> {
  data: T | null
  error: string | null
  status: number
}

export async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 60000)
  try {
    const url = `${API_BASE}${endpoint}`
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
      signal: controller.signal,
    })

    clearTimeout(timeout)

    const data = await res.json()

    if (!res.ok) {
      return { data: null, error: data.error || 'Request failed', status: res.status }
    }

    return { data: data as T, error: null, status: res.status }
  } catch (err) {
    clearTimeout(timeout)
    const message =
      err instanceof DOMException && err.name === 'AbortError'
        ? 'Request timed out — please check your connection and try again'
        : err instanceof Error
          ? err.message
          : 'Network error'
    return { data: null, error: message, status: 0 }
  }
}

/**
 * Safely extract an array from an API response that may be wrapped in
 * one or two layers of `{ data: ... }`.
 *
 * Handles these shapes:
 *   - `[...]`                          — raw array
 *   - `{ data: [...] }`                — unwrapped once (queryFn returns `res.data`)
 *   - `{ data: { data: [...] } }`      — full api.get() result (queryFn returns full response)
 *   - `{ data: { data: [...] }, ... }` — full api.get() result with extra fields
 */
export function extractArray<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw
  if (raw && typeof raw === 'object') {
    // Try { data: [...] }
    const d = (raw as Record<string, unknown>).data
    if (Array.isArray(d)) return d as T[]
    // Try { data: { data: [...] } }
    if (d && typeof d === 'object' && !Array.isArray(d)) {
      const inner = (d as Record<string, unknown>).data
      if (Array.isArray(inner)) return inner as T[]
    }
  }
  return []
}

// Convenience methods
export const api = {
  get: <T>(endpoint: string) => apiFetch<T>(endpoint),

  post: <T>(endpoint: string, body: unknown) =>
    apiFetch<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  put: <T>(endpoint: string, body: unknown) =>
    apiFetch<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  delete: <T>(endpoint: string) =>
    apiFetch<T>(endpoint, { method: 'DELETE' }),
}

/**
 * Wraps an API call that returns ApiResponse<T> and throws on error.
 * This is useful for React Query mutationFn/queryFn callbacks which
 * expect thrown errors to trigger their error/retry handling.
 *
 * Usage:
 *   mutationFn: async (id: string) => apiThrow(api.delete(`/items/${id}`)),
 */
export async function apiThrow<T>(promise: Promise<ApiResponse<T>>): Promise<T> {
  const res = await promise
  if (res.error) throw new Error(res.error)
  return res.data as T
}
