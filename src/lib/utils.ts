import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Convert a 24-hour time string (e.g. "07:30", "13:00") to 12-hour format (e.g. "7:30 AM", "1:00 PM").
 * Returns the original string unchanged if it doesn't match the expected format.
 */
export function formatTime12(time24: string): string {
  if (!time24 || !time24.includes(':')) return time24
  const [h, m] = time24.split(':').map(Number)
  if (isNaN(h) || isNaN(m)) return time24
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`
}

/**
 * Format a time range from two 24-hour strings into a readable 12-hour range.
 * e.g. formatTimeRange("07:30", "09:00") → "7:30 AM – 9:00 AM"
 */
export function formatTimeRange(start24: string, end24: string, separator: string = ' – '): string {
  return `${formatTime12(start24)}${separator}${formatTime12(end24)}`
}

/**
 * Format a year level number or string into a readable label.
 * e.g. formatYearLevel(1) → "1st Year", formatYearLevel("2") → "2nd Year"
 */
export function formatYearLevel(level: number | string): string {
  const n = typeof level === 'string' ? parseInt(level, 10) : level
  if (isNaN(n)) return String(level)
  if (n === 0) return 'Executive'
  const suffixes: Record<number, string> = { 1: 'st', 2: 'nd', 3: 'rd' }
  const suffix = suffixes[n] || 'th'
  return `${n}${suffix} Year`
}

/**
 * Format a semester string into a readable label.
 * e.g. formatSemester("1st") → "1st Semester", "summer" → "Summer"
 */
export function formatSemester(sem: string): string {
  if (!sem) return sem
  if (sem.toLowerCase() === 'summer') return 'Summer'
  return `${sem} Semester`
}

/**
 * Parse specialization which may be a JSON array string like '["CS","SE"]' or a plain string.
 * Returns a comma-separated readable string, e.g. "Computer Science, Software Engineering".
 */
export function formatSpecialization(val?: string | null): string {
  if (!val) return ''
  try {
    const parsed = JSON.parse(val)
    if (Array.isArray(parsed)) return parsed.join(', ')
    return String(parsed)
  } catch {
    return val
  }
}
