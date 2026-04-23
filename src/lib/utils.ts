import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Convert 24-hour time format to 12-hour format with AM/PM
 * @param time - Time in "HH:MM" format (24-hour)
 * @returns Time in "h:MM AM/PM" format
 */
export function formatTime12Hour(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12; // Convert 0 to 12 for midnight
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Convert 24-hour time format to short 12-hour format (no minutes if :00)
 * @param time - Time in "HH:MM" format (24-hour)
 * @returns Time in "h AM/PM" or "h:MM AM/PM" format
 */
export function formatTime12HourShort(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  if (minutes === 0) {
    return `${displayHours} ${period}`;
  }
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Format a time range from 24-hour to 12-hour format
 * @param startTime - Start time in "HH:MM" format
 * @param endTime - End time in "HH:MM" format
 * @returns Time range in "h:MM AM/PM - h:MM AM/PM" format
 */
export function formatTimeRange(startTime: string, endTime: string): string {
  return `${formatTime12Hour(startTime)} - ${formatTime12Hour(endTime)}`;
}

/**
 * Parse 12-hour time to 24-hour format
 * @param time12 - Time in "h:MM AM/PM" format
 * @returns Time in "HH:MM" format (24-hour)
 */
export function parseTime12Hour(time12: string): string {
  const match = time12.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)/i);
  if (!match) return time12;
  
  let hours = parseInt(match[1], 10);
  const minutes = match[2] || '00';
  const period = match[3].toUpperCase();
  
  if (period === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }
  
  return `${hours.toString().padStart(2, '0')}:${minutes}`;
}

/**
 * Calculate the number of blocks for a time range
 * Rules:
 * - Starting time counts as 0.5 blocks
 * - Each hour adds 1 block
 * - End time is included
 * 
 * Examples:
 * - 8:00 - 11:00 = 0.5 + 3 = 3.5 blocks
 * - 8:00 - 10:00 = 0.5 + 2 = 2.5 blocks
 * - 9:00 - 12:00 = 0.5 + 3 = 3.5 blocks
 * 
 * @param startTime - Start time in "HH:MM" format
 * @param endTime - End time in "HH:MM" format
 * @returns Number of blocks (decimal)
 */
export function calculateBlocks(startTime: string, endTime: string): number {
  const [startHours, startMinutes] = startTime.split(':').map(Number);
  const [endHours, endMinutes] = endTime.split(':').map(Number);
  
  // Convert to decimal hours
  const startDecimal = startHours + (startMinutes / 60);
  const endDecimal = endHours + (endMinutes / 60);
  
  // Calculate duration in hours
  const durationHours = endDecimal - startDecimal;
  
  // Formula: 0.5 (start) + duration hours
  // This gives us: 8:00-11:00 = 0.5 + 3 = 3.5 blocks
  const blocks = 0.5 + durationHours;
  
  return Math.round(blocks * 10) / 10; // Round to 1 decimal place
}

/**
 * Get the number of hour slots a schedule occupies (for calendar row span)
 * This counts each hour slot including the end time
 * 
 * Examples:
 * - 8:00 - 11:00 occupies slots: 8:00, 9:00, 10:00, 11:00 = 4 slots
 * - 8:00 - 10:00 occupies slots: 8:00, 9:00, 10:00 = 3 slots
 * 
 * @param startTime - Start time in "HH:MM" format
 * @param endTime - End time in "HH:MM" format
 * @returns Number of hour slots
 */
export function calculateHourSlots(startTime: string, endTime: string): number {
  const [startHours] = startTime.split(':').map(Number);
  const [endHours] = endTime.split(':').map(Number);
  
  // Count each hour from start to end (inclusive)
  return endHours - startHours + 1;
}
