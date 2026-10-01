export function generateId(): string {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDate(dateStr: string | Date, options?: Intl.DateTimeFormatOptions): string {
  try {
    const date = typeof dateStr === 'string' ? new Date(dateStr + (dateStr.length === 10 ? 'T00:00:00' : '')) : dateStr;
    if (isNaN(date.getTime())) return String(dateStr);
    return date.toLocaleDateString('en-US', options || {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return String(dateStr);
  }
}

export function formatShortDate(dateStr: string): string {
  try {
    const date = new Date(dateStr + (dateStr.length === 10 ? 'T00:00:00' : ''));
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const MONTH_ABBR = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'
];

export function calculateHabitStreak(completedDates: Record<string, boolean>): { currentStreak: number; longestStreak: number } {
  const dates = Object.keys(completedDates)
    .filter(k => completedDates[k])
    .sort();

  if (dates.length === 0) return { currentStreak: 0, longestStreak: 0 };

  const todayStr = getTodayDateString();
  const today = new Date(todayStr);

  let currentStreak = 0;
  let checkDate = new Date(today);

  // Check if today or yesterday was completed
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  if (!completedDates[todayStr] && !completedDates[yesterdayStr]) {
    currentStreak = 0;
  } else {
    if (!completedDates[todayStr]) {
      checkDate = yesterday;
    }
    while (true) {
      const dStr = checkDate.toISOString().split('T')[0];
      if (completedDates[dStr]) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
  }

  // Calculate longest streak
  let longestStreak = 0;
  let tempStreak = 0;
  let prevDate: Date | null = null;

  for (const dStr of dates) {
    const curDate = new Date(dStr + 'T00:00:00');
    if (!prevDate) {
      tempStreak = 1;
    } else {
      const diffTime = curDate.getTime() - prevDate.getTime();
      const diffDays = Math.round(diffTime / (1000 * 3600 * 24));
      if (diffDays === 1) {
        tempStreak++;
      } else if (diffDays > 1) {
        tempStreak = 1;
      }
    }
    if (tempStreak > longestStreak) {
      longestStreak = tempStreak;
    }
    prevDate = curDate;
  }

  return { currentStreak, longestStreak: Math.max(longestStreak, currentStreak) };
}

export function calculateChallengeProgress(completedDays: number[], totalDays: number) {
  const count = completedDays.length;
  const percentage = totalDays > 0 ? Math.round((count / totalDays) * 100) : 0;
  
  // consecutive streak
  const sorted = [...completedDays].sort((a, b) => a - b);
  let streak = 0;
  let maxStreak = 0;
  for (let i = 0; i < sorted.length; i++) {
    if (i === 0 || sorted[i] === sorted[i - 1] + 1) {
      streak++;
    } else {
      streak = 1;
    }
    if (streak > maxStreak) maxStreak = streak;
  }

  return {
    completedCount: count,
    percentage,
    currentStreak: streak,
    longestStreak: maxStreak,
  };
}

/**
 * Split a walking session across local 1-hour boundaries.
 * For example: 10:57 PM to 11:06 PM (9 min) -> 3 min at 10 PM, 6 min at 11 PM.
 */
export interface WalkHourSegment {
  date: string; // YYYY-MM-DD
  hour: number; // 0..23
  minutes: number;
  seconds: number;
}

export function splitWalkSessionByHours(session: {
  started_at: string;
  ended_at?: string;
  duration_seconds: number;
}): WalkHourSegment[] {
  const startMs = new Date(session.started_at).getTime();
  if (isNaN(startMs)) return [];

  const endMs = session.ended_at
    ? new Date(session.ended_at).getTime()
    : startMs + (session.duration_seconds || 0) * 1000;

  if (isNaN(endMs) || endMs <= startMs) return [];

  const segments: WalkHourSegment[] = [];
  let currentMs = startMs;

  while (currentMs < endMs) {
    const curDate = new Date(currentMs);
    const nextHour = new Date(
      curDate.getFullYear(),
      curDate.getMonth(),
      curDate.getDate(),
      curDate.getHours() + 1,
      0,
      0,
      0
    );

    const segmentEndMs = Math.min(endMs, nextHour.getTime());
    const durationMs = segmentEndMs - currentMs;
    const durationSec = durationMs / 1000;
    const durationMin = durationMs / (60 * 1000);

    const year = curDate.getFullYear();
    const month = String(curDate.getMonth() + 1).padStart(2, '0');
    const day = String(curDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    const hour = curDate.getHours();

    segments.push({
      date: dateStr,
      hour,
      minutes: Math.round(durationMin * 100) / 100,
      seconds: Math.round(durationSec),
    });

    currentMs = segmentEndMs;
  }

  return segments;
}

/**
 * Format 24-hour integer (0..23) to 12-hour AM/PM label
 */
export function formatHourLabel(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
}

/**
 * Format hour range (e.g. 15 -> "3:00 PM – 3:59 PM")
 */
export function formatHourRange(hour: number): string {
  const start = formatHourLabel(hour);
  const nextHour = (hour + 1) % 24;
  const end = formatHourLabel(nextHour);
  return `${start} – ${end}`;
}

/**
 * Format seconds to MM:SS or Xm Ys
 */
export function formatDuration(totalSeconds: number): string {
  const sec = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Clean & safe HTML sanitizer for rich text content
 */
export function sanitizeHtml(rawHtml: string): string {
  if (!rawHtml) return '';
  if (typeof window === 'undefined') {
    // Basic regex-based strip for SSR
    return rawHtml
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+="[^"]*"/g, '')
      .replace(/on\w+='[^']*'/g, '')
      .replace(/javascript:[^"']*/gi, '');
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(rawHtml, 'text/html');

    // Allowed tags
    const allowedTags = new Set([
      'B', 'STRONG', 'I', 'EM', 'U', 'UL', 'OL', 'LI', 'P', 'BR', 'SPAN', 'DIV'
    ]);

    function cleanNode(node: Node) {
      const children = Array.from(node.childNodes);
      for (const child of children) {
        if (child.nodeType === Node.ELEMENT_NODE) {
          const el = child as HTMLElement;
          if (!allowedTags.has(el.tagName)) {
            // Replace disallowed tag with its inner text
            const textNode = doc.createTextNode(el.textContent || '');
            node.replaceChild(textNode, el);
          } else {
            // Remove all attributes except safe ones
            const attrs = Array.from(el.attributes);
            for (const attr of attrs) {
              if (attr.name.startsWith('on') || attr.value.toLowerCase().includes('javascript:')) {
                el.removeAttribute(attr.name);
              }
            }
            cleanNode(el);
          }
        }
      }
    }

    cleanNode(doc.body);
    return doc.body.innerHTML;
  } catch {
    return rawHtml;
  }
}

