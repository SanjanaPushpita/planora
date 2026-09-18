'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePlanner } from '@/lib/storage';
import { getDaysInMonth, MONTH_NAMES, getTodayDateString, formatDate } from '@/lib/utils';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Sparkles, 
  Calendar as CalendarIcon,
  CheckCircle2
} from 'lucide-react';

export default function CalendarPage() {
  const router = useRouter();
  const { pages, createPage } = usePlanner();

  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sunday

  const handleMonthChange = (delta: number) => {
    let nextM = currentMonth + delta;
    let nextY = currentYear;
    if (nextM < 0) {
      nextM = 11;
      nextY -= 1;
    } else if (nextM > 11) {
      nextM = 0;
      nextY += 1;
    }
    setCurrentMonth(nextM);
    setCurrentYear(nextY);
  };

  const getDateString = (day: number) => {
    const m = String(currentMonth + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${currentYear}-${m}-${d}`;
  };

  // Find daily planners or pages on selected date
  const pagesForSelectedDate = pages.filter(
    (p) => p.date === selectedDate || p.created_at.startsWith(selectedDate)
  );

  const handleDateClick = (day: number) => {
    const dStr = getDateString(day);
    setSelectedDate(dStr);
  };

  const handleOpenOrCreatePlanner = async (dateStr: string) => {
    // Check if daily planner already exists for this date
    const existing = pages.find((p) => p.page_type === 'daily' && p.date === dateStr);
    if (existing) {
      router.push(`/pages/${existing.id}`);
    } else {
      const newPlanner = await createPage({
        title: `Daily Planner - ${dateStr}`,
        page_type: 'daily',
        date: dateStr,
      });
      router.push(`/pages/${newPlanner.id}`);
    }
  };

  const todayStr = getTodayDateString();

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-color)] pb-4">
        <div>
          <h2 className="font-serif-aesthetic text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
            Interactive Calendar
          </h2>
          <p className="font-serif-aesthetic italic text-xs text-[var(--text-secondary)] mt-0.5">
            Click any date to view entries or instantly open that day&apos;s daily planner
          </p>
        </div>

        {/* Month Navigator */}
        <div className="flex items-center gap-2 bg-[var(--bg-paper)] p-1 rounded-xl border border-[var(--border-color)]">
          <button
            onClick={() => handleMonthChange(-1)}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-paper-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-serif-aesthetic font-semibold text-sm px-3 min-w-[130px] text-center">
            {MONTH_NAMES[currentMonth]} {currentYear}
          </span>
          <button
            onClick={() => handleMonthChange(1)}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-paper-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Calendar Grid */}
      <div className="journal-paper p-4 sm:p-6 space-y-4">
        {/* Days of week header */}
        <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] pb-2 border-b border-[var(--border-color)]">
          <div>Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
        </div>

        {/* Date cells */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {/* Empty offset days for beginning of month */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[60px] sm:min-h-[85px] rounded-xl bg-transparent" />
          ))}

          {/* Actual days */}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const dateStr = getDateString(day);
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;
            const matchingPages = pages.filter(
              (p) => p.date === dateStr || p.created_at.startsWith(dateStr)
            );
            const hasDailyPlanner = matchingPages.some((p) => p.page_type === 'daily');

            return (
              <div
                key={day}
                onClick={() => handleDateClick(day)}
                onDoubleClick={() => handleOpenOrCreatePlanner(dateStr)}
                className={`min-h-[65px] sm:min-h-[90px] p-2 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                  isSelected
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] shadow-2xs'
                    : isToday
                    ? 'border-[var(--accent)]/50 bg-[var(--bg-paper-subtle)]'
                    : 'border-[var(--border-color)] bg-[var(--bg-paper)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-paper-hover)]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-mono font-medium w-5 h-5 flex items-center justify-center rounded-full ${
                      isToday
                        ? 'bg-[var(--accent)] text-[var(--accent-contrast)] font-bold'
                        : 'text-[var(--text-primary)]'
                    }`}
                  >
                    {day}
                  </span>

                  {hasDailyPlanner && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" title="Has Daily Planner" />
                  )}
                </div>

                {/* Subtle indicators */}
                <div className="space-y-1">
                  {matchingPages.slice(0, 2).map((p) => (
                    <div
                      key={p.id}
                      className="text-[10px] truncate px-1 py-0.5 rounded bg-[var(--bg-paper-subtle)] text-[var(--text-secondary)] font-medium leading-none"
                    >
                      {p.icon} {p.title}
                    </div>
                  ))}
                  {matchingPages.length > 2 && (
                    <div className="text-[9px] text-[var(--text-muted)] text-right">
                      +{matchingPages.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Date Drawer / Details */}
      <div className="journal-paper p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Selected Date
          </span>
          <h3 className="font-serif-aesthetic text-xl font-bold text-[var(--text-primary)]">
            {formatDate(selectedDate)}
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            {pagesForSelectedDate.length > 0
              ? `${pagesForSelectedDate.length} planner page(s) attached to this day`
              : 'No planner created for this day yet'}
          </p>
        </div>

        <button
          onClick={() => handleOpenOrCreatePlanner(selectedDate)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-contrast)] text-xs font-semibold transition-transform active:scale-95 shadow-xs"
        >
          <Sparkles className="w-4 h-4" />
          <span>
            {pagesForSelectedDate.some((p) => p.page_type === 'daily')
              ? 'Open Day Planner'
              : 'Create Day Planner'}
          </span>
        </button>
      </div>
    </div>
  );
}
