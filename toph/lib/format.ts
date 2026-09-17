import type { ActivityType } from '@/lib/types/database';

/**
 * Display formatting. Kept separate from the data layer because the database
 * deliberately stores machine-shaped values — a `date` column sorts and filters
 * correctly in a way the string "April 19, 2026" never could.
 */

/**
 * "2026-04-19" -> "April 19, 2026"
 *
 * Built from parts rather than `new Date("2026-04-19")`. That constructor
 * reads a bare date string as UTC midnight, so every timezone west of
 * Greenwich renders the PREVIOUS day — the row would read "April 18, 2026"
 * for anyone in the US. Passing the parts to the Date constructor builds a
 * local date instead, which is what a farm work log means.
 */
export function formatLogDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/** "06:00:00" -> "6:00 AM" */
export function formatTime(time: string): string {
  const [rawHour, minute] = time.split(':');
  const hour = Number(rawHour);
  const suffix = hour < 12 ? 'AM' : 'PM';
  // 0 -> 12 (midnight), 13 -> 1, and 12 stays 12 (noon).
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${minute} ${suffix}`;
}

/** "06:00:00", "10:40:00" -> "6:00 AM - 10:40 AM" */
export function formatTimeRange(start: string, end: string): string {
  return `${formatTime(start)} - ${formatTime(end)}`;
}

/**
 * "spraying" -> "Spraying"
 *
 * The enum is stored lowercase so the database holds one canonical value;
 * capitalisation is a presentation choice made here.
 */
export function formatActivity(activity: ActivityType): string {
  return activity.charAt(0).toUpperCase() + activity.slice(1);
}
