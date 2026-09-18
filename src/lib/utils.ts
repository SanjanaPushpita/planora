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
