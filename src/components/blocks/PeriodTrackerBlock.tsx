'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { PeriodTrackerContent, PeriodDayLog, PeriodFlow, PeriodCycleHistory } from '@/lib/types';
import { getTodayDateString, MONTH_NAMES, formatDate } from '@/lib/utils';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Droplet, 
  Heart, 
  Sparkles, 
  Plus, 
  Check, 
  Activity,
  Smile,
  AlertCircle,
  FileText,
  Clock
} from 'lucide-react';

interface PeriodTrackerBlockProps {
  content: PeriodTrackerContent;
  onChange: (updated: PeriodTrackerContent) => void;
}

const DEFAULT_SYMPTOMS = [
  'Cramps',
  'Headache',
  'Bloating',
  'Fatigue',
  'Back Pain',
  'Acne',
  'Mood Changes',
  'Cravings',
  'Breast Tenderness',
  'Nausea'
];

const FLOW_LEVELS: { id: PeriodFlow; label: string; icon: string; desc: string }[] = [
  { id: 'spotting', label: 'Spotting', icon: '💧', desc: 'Very light droplets' },
  { id: 'light', label: 'Light', icon: '🌸', desc: 'Minimal flow' },
  { id: 'medium', label: 'Medium', icon: '🌺', desc: 'Normal steady flow' },
  { id: 'heavy', label: 'Heavy', icon: '🌹', desc: 'Full heavy flow' },
];

const MOODS = [
  { id: 'calm', label: 'Calm', emoji: '🍃' },
  { id: 'happy', label: 'Happy', emoji: '✨' },
  { id: 'sensitive', label: 'Sensitive', emoji: '🌸' },
  { id: 'irritable', label: 'Irritable', emoji: '⚡' },
  { id: 'tired', label: 'Low Energy', emoji: '☕' },
  { id: 'anxious', label: 'Anxious', emoji: '🌧️' },
];

export function PeriodTrackerBlock({ content, onChange }: PeriodTrackerBlockProps) {
  const todayStr = getTodayDateString();
  const [data, setData] = useState<PeriodTrackerContent>(content || { logs: {}, customSymptoms: [], notes: '' });

  // Sync with prop changes (e.g. from draft restoration or remote fetch)
  useEffect(() => {
    if (content) {
      setData(content);
    }
  }, [content]);

  // Calendar navigation state
  const today = new Date();
  const [viewYear, setViewYear] = useState<number>(today.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(today.getMonth()); // 0-indexed
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Custom symptom input state
  const [newSymptomText, setNewSymptomText] = useState('');
  const [isAddingSymptom, setIsAddingSymptom] = useState(false);

  // Immediate save dispatcher
  const updateData = (next: PeriodTrackerContent) => {
    setData(next);
    onChange(next);
  };

  // Calendar navigation handlers
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  const handleJumpToToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setSelectedDate(todayStr);
  };

  // Days matrix for current viewing month
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sunday
    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

    // Previous month trailing days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1;
      const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      days.push({ dateStr, dayNum, isCurrentMonth: false });
    }

    // Current month days
    for (let dayNum = 1; dayNum <= daysInCurrentMonth; dayNum++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      days.push({ dateStr, dayNum, isCurrentMonth: true });
    }

    // Next month leading days to complete 35 or 42 grid cells
    const remainingCells = (7 - (days.length % 7)) % 7;
    for (let dayNum = 1; dayNum <= remainingCells; dayNum++) {
      const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
      const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
      const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      days.push({ dateStr, dayNum, isCurrentMonth: false });
    }

    return days;
  }, [viewYear, viewMonth]);

  // All logged period dates sorted
  const sortedPeriodDates = useMemo(() => {
    const logs = data.logs || {};
    return Object.keys(logs)
      .filter((d) => logs[d]?.isPeriod)
      .sort();
  }, [data.logs]);

  // Group sorted dates into distinct period cycles (consecutive days within 2-day threshold)
  const detectedCycles: PeriodCycleHistory[] = useMemo(() => {
    if (sortedPeriodDates.length === 0) return [];

    const cycles: { start: string; end: string; days: string[] }[] = [];
    let currentCycle: { start: string; end: string; days: string[] } | null = null;

    for (let i = 0; i < sortedPeriodDates.length; i++) {
      const dateStr = sortedPeriodDates[i];
      const curDate = new Date(dateStr + 'T00:00:00');

      if (!currentCycle) {
        currentCycle = { start: dateStr, end: dateStr, days: [dateStr] };
      } else {
        const lastDate = new Date(currentCycle.end + 'T00:00:00');
        const diffDays = Math.round((curDate.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));

        if (diffDays <= 2) {
          // Continuous period episode
          currentCycle.end = dateStr;
          currentCycle.days.push(dateStr);
        } else {
          // Gap > 2 days means a new cycle started
          cycles.push(currentCycle);
          currentCycle = { start: dateStr, end: dateStr, days: [dateStr] };
        }
      }
    }

    if (currentCycle) {
      cycles.push(currentCycle);
    }

    // Calculate cycle lengths (gap between start of cycle N and start of cycle N+1)
    const history: PeriodCycleHistory[] = cycles.map((c, idx) => {
      let cycleLengthDays: number | undefined = undefined;
      if (idx < cycles.length - 1) {
        const thisStart = new Date(c.start + 'T00:00:00');
        const nextStart = new Date(cycles[idx + 1].start + 'T00:00:00');
        cycleLengthDays = Math.round((nextStart.getTime() - thisStart.getTime()) / (1000 * 3600 * 24));
      }

      return {
        id: `cycle-${c.start}`,
        startDate: c.start,
        endDate: c.end,
        durationDays: c.days.length,
        cycleLengthDays,
      };
    });

    return history.reverse(); // Newest first
  }, [sortedPeriodDates]);

  // Cycle Metrics calculations
  const metrics = useMemo(() => {
    if (detectedCycles.length === 0) {
      return {
        currentCycleDay: null,
        lastPeriodStart: null,
        avgCycleLength: null,
        avgPeriodLength: null,
        estimatedNextPeriod: null,
      };
    }

    const latestCycle = detectedCycles[0];
    const lastPeriodStart = latestCycle.startDate;

    // Calculate Current Cycle Day relative to latest period start
    const lastStart = new Date(lastPeriodStart + 'T00:00:00');
    const now = new Date(todayStr + 'T00:00:00');
    const diffToToday = Math.round((now.getTime() - lastStart.getTime()) / (1000 * 3600 * 24));
    const currentCycleDay = diffToToday >= 0 ? diffToToday + 1 : null;

    // Average period length
    const durations = detectedCycles.map((c) => c.durationDays);
    const avgPeriodLength = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);

    // Average cycle length (only from completed intervals)
    const intervalLengths = detectedCycles
      .map((c) => c.cycleLengthDays)
      .filter((len): len is number => typeof len === 'number' && len > 15 && len < 60);

    let avgCycleLength: number | null = null;
    let estimatedNextPeriod: string | null = null;

    if (intervalLengths.length >= 1) {
      avgCycleLength = Math.round(intervalLengths.reduce((a, b) => a + b, 0) / intervalLengths.length);
      const estDate = new Date(lastStart);
      estDate.setDate(estDate.getDate() + avgCycleLength);
      estimatedNextPeriod = estDate.toISOString().split('T')[0];
    }

    return {
      currentCycleDay,
      lastPeriodStart,
      avgCycleLength,
      avgPeriodLength,
      estimatedNextPeriod,
    };
  }, [detectedCycles, todayStr]);

  // Active day log being edited
  const activeLog: PeriodDayLog = (data.logs && data.logs[selectedDate]) || {
    date: selectedDate,
    isPeriod: false,
  };

  const updateActiveLog = (updates: Partial<PeriodDayLog>) => {
    const nextLog: PeriodDayLog = {
      ...activeLog,
      ...updates,
      date: selectedDate,
    };

    const nextLogs = {
      ...(data.logs || {}),
      [selectedDate]: nextLog,
    };

    updateData({
      ...data,
      logs: nextLogs,
    });
  };

  // Toggle Period Day for selected date
  const handleTogglePeriodDay = () => {
    const nextState = !activeLog.isPeriod;
    updateActiveLog({
      isPeriod: nextState,
      flow: nextState ? (activeLog.flow || 'medium') : undefined,
    });
  };

  // Quick Start Period Action
  const handleStartPeriod = () => {
    updateActiveLog({
      isPeriod: true,
      flow: activeLog.flow || 'medium',
    });
  };

  // Quick End Period Action
  const handleEndPeriod = () => {
    updateActiveLog({
      isPeriod: false,
    });
  };

  // Symptom toggling
  const handleToggleSymptom = (symptomName: string) => {
    const current = activeLog.symptoms || [];
    const exists = current.includes(symptomName);
    const updated = exists ? current.filter((s) => s !== symptomName) : [...current, symptomName];
    updateActiveLog({ symptoms: updated });
  };

  // Add Custom Symptom Tag
  const handleAddCustomSymptom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSymptomText.trim()) return;

    const trimmed = newSymptomText.trim();
    const existingCustom = data.customSymptoms || [];
    if (!existingCustom.includes(trimmed)) {
      const nextCustom = [...existingCustom, trimmed];
      const nextLogSymptoms = [...(activeLog.symptoms || []), trimmed];
      updateData({
        ...data,
        customSymptoms: nextCustom,
        logs: {
          ...(data.logs || {}),
          [selectedDate]: {
            ...activeLog,
            symptoms: nextLogSymptoms,
          },
        },
      });
    }
    setNewSymptomText('');
    setIsAddingSymptom(false);
  };

  const allAvailableSymptoms = [
    ...DEFAULT_SYMPTOMS,
    ...(data.customSymptoms || []),
  ];

  return (
    <div className="space-y-6 journal-paper p-4 sm:p-6 rounded-3xl border border-[var(--border-color)]">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-color)] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/40 text-rose-500 dark:text-rose-400 flex items-center justify-center text-xl shadow-xs">
            🌸
          </div>
          <div>
            <h3 className="font-serif-aesthetic text-lg sm:text-xl font-bold text-[var(--text-primary)]">
              Period Tracker & Cycle Sanctuary
            </h3>
            <p className="font-serif-aesthetic italic text-xs text-[var(--text-secondary)]">
              Private, respectful health and cycle tracking tailored to your natural rhythms
            </p>
          </div>
        </div>

        {/* Month Navigation & Today Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleJumpToToday}
            className="px-2.5 py-1 text-xs font-medium rounded-xl bg-[var(--bg-paper-subtle)] hover:bg-[var(--bg-paper-hover)] border border-[var(--border-color)] text-[var(--text-secondary)] transition-colors"
          >
            Today
          </button>
          <div className="flex items-center gap-1 bg-[var(--bg-paper-subtle)] rounded-xl border border-[var(--border-color)] p-0.5">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded-lg hover:bg-[var(--bg-paper-hover)] text-[var(--text-secondary)] transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-serif-aesthetic font-semibold text-xs px-2 text-[var(--text-primary)] min-w-[110px] text-center">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded-lg hover:bg-[var(--bg-paper-hover)] text-[var(--text-secondary)] transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Cycle Summary Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Current Cycle Day */}
        <div className="p-3.5 rounded-2xl journal-paper-subtle space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
            <Clock className="w-3.5 h-3.5 text-rose-500" />
            <span className="font-medium">Cycle Day</span>
          </div>
          <div className="font-serif-aesthetic text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
            {metrics.currentCycleDay !== null ? `Day ${metrics.currentCycleDay}` : '—'}
          </div>
          <p className="text-[10px] text-[var(--text-muted)]">
            {metrics.lastPeriodStart ? `Started ${formatDate(metrics.lastPeriodStart, { month: 'short', day: 'numeric' })}` : 'No logs yet'}
          </p>
        </div>

        {/* Avg Period Duration */}
        <div className="p-3.5 rounded-2xl journal-paper-subtle space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
            <Droplet className="w-3.5 h-3.5 text-rose-500" />
            <span className="font-medium">Avg Period</span>
          </div>
          <div className="font-serif-aesthetic text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
            {metrics.avgPeriodLength !== null ? `${metrics.avgPeriodLength} Days` : '—'}
          </div>
          <p className="text-[10px] text-[var(--text-muted)]">
            Based on logged period days
          </p>
        </div>

        {/* Avg Cycle Length */}
        <div className="p-3.5 rounded-2xl journal-paper-subtle space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
            <Activity className="w-3.5 h-3.5 text-rose-500" />
            <span className="font-medium">Avg Cycle</span>
          </div>
          <div className="font-serif-aesthetic text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
            {metrics.avgCycleLength !== null ? `${metrics.avgCycleLength} Days` : '—'}
          </div>
          <p className="text-[10px] text-[var(--text-muted)]">
            {metrics.avgCycleLength ? 'Calculated from cycles' : 'Need 2+ cycles to estimate'}
          </p>
        </div>

        {/* Estimated Next Period */}
        <div className="p-3.5 rounded-2xl journal-paper-subtle space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span className="font-medium">Next Period</span>
            </div>
            {metrics.estimatedNextPeriod && (
              <span className="text-[9px] uppercase font-semibold px-1.5 py-0.2 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                Estimated
              </span>
            )}
          </div>
          <div className="font-serif-aesthetic text-base sm:text-lg font-bold text-[var(--text-primary)] truncate">
            {metrics.estimatedNextPeriod ? formatDate(metrics.estimatedNextPeriod, { month: 'short', day: 'numeric' }) : 'Pending data'}
          </div>
          <p className="text-[10px] text-[var(--text-muted)] truncate">
            {metrics.estimatedNextPeriod ? 'Approximate estimate' : 'Add more cycles to see estimates'}
          </p>
        </div>
      </div>

      {/* Main Section: Calendar Grid (Left/Top) + Day Log Drawer (Right/Bottom) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Calendar View (7 cols on lg) */}
        <div className="lg:col-span-7 space-y-3">
          {/* Quick Action Bar */}
          <div className="flex items-center justify-between px-1">
            <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              Cycle Calendar
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleStartPeriod}
                className="px-2.5 py-1 text-xs rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-medium shadow-2xs transition-all active:scale-95"
              >
                Start Period
              </button>
              <button
                type="button"
                onClick={handleEndPeriod}
                className="px-2.5 py-1 text-xs rounded-xl bg-[var(--bg-paper-subtle)] hover:bg-[var(--bg-paper-hover)] border border-[var(--border-color)] text-[var(--text-secondary)] font-medium transition-colors"
              >
                End Period
              </button>
            </div>
          </div>

          {/* 7 Days of Week Header */}
          <div className="grid grid-cols-7 gap-1 text-center font-mono text-[11px] font-semibold text-[var(--text-muted)] py-1 border-b border-[var(--border-color)]">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Calendar Grid Cells */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {calendarDays.map((cell) => {
              const dateLog = data.logs?.[cell.dateStr];
              const isPeriod = Boolean(dateLog?.isPeriod);
              const flow = dateLog?.flow;
              const hasSymptoms = Boolean(dateLog?.symptoms && dateLog.symptoms.length > 0);
              const hasNotes = Boolean(dateLog?.notes);
              const isSelected = selectedDate === cell.dateStr;
              const isToday = cell.dateStr === todayStr;

              return (
                <button
                  key={cell.dateStr}
                  type="button"
                  onClick={() => setSelectedDate(cell.dateStr)}
                  className={`min-h-[52px] sm:min-h-[60px] p-1.5 rounded-2xl flex flex-col items-center justify-between border transition-all text-center relative group ${
                    isSelected
                      ? 'ring-2 ring-[var(--accent)] border-[var(--accent)] z-10 scale-102'
                      : 'hover:border-[var(--border-strong)]'
                  } ${
                    !cell.isCurrentMonth ? 'opacity-35 bg-[var(--bg-paper)]/50' : 'bg-[var(--bg-paper)]'
                  } ${
                    isPeriod
                      ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-300 dark:border-rose-900/60'
                      : 'border-[var(--border-color)]'
                  }`}
                >
                  {/* Day Number + Today Dot */}
                  <div className="flex items-center justify-between w-full px-1">
                    <span
                      className={`text-xs font-mono font-medium ${
                        isToday
                          ? 'w-5 h-5 rounded-full bg-[var(--accent)] text-[var(--accent-contrast)] flex items-center justify-center font-bold text-[10px]'
                          : isPeriod
                          ? 'text-rose-600 dark:text-rose-400 font-bold'
                          : 'text-[var(--text-primary)]'
                      }`}
                    >
                      {cell.dayNum}
                    </span>
                    {hasNotes && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" title="Has notes" />
                    )}
                  </div>

                  {/* Period Indicator */}
                  {isPeriod ? (
                    <div className="flex flex-col items-center py-0.5">
                      <span className="text-sm leading-none" title={`Period Day (${flow || 'Normal'})`}>
                        {flow === 'heavy' ? '🌹' : flow === 'spotting' ? '💧' : '🌸'}
                      </span>
                      <span className="text-[9px] font-medium text-rose-600 dark:text-rose-400 capitalize scale-90">
                        {flow || 'Period'}
                      </span>
                    </div>
                  ) : (
                    <div className="h-4" />
                  )}

                  {/* Symptom Dots Indicator */}
                  <div className="flex items-center gap-0.5 h-1.5">
                    {hasSymptoms && (
                      <span className="w-1 h-1 rounded-full bg-amber-400" title="Symptoms logged" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Color Key / Legend */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-[10px] text-[var(--text-muted)] border-t border-[var(--border-color)]">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                <span>Period Day</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span>Symptoms</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent)]" />
                <span>Notes</span>
              </span>
            </div>
            <span>Click any day to log details</span>
          </div>
        </div>

        {/* Day Entry Details Drawer (5 cols on lg) */}
        <div className="lg:col-span-5 journal-paper-subtle p-4 sm:p-5 rounded-3xl border border-[var(--border-color)] space-y-5">
          {/* Selected Date Header */}
          <div className="flex items-start justify-between gap-2 border-b border-[var(--border-color)] pb-3">
            <div>
              <span className="text-[10px] uppercase font-semibold tracking-wider text-[var(--text-muted)]">
                Selected Day Details
              </span>
              <h4 className="font-serif-aesthetic text-base font-bold text-[var(--text-primary)]">
                {formatDate(selectedDate, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
              </h4>
            </div>

            {/* Toggle Period Day Button */}
            <button
              type="button"
              onClick={handleTogglePeriodDay}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeLog.isPeriod
                  ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-xs'
                  : 'bg-[var(--bg-paper)] hover:bg-[var(--bg-paper-hover)] text-[var(--text-secondary)] border border-[var(--border-color)]'
              }`}
            >
              <Droplet className={`w-3.5 h-3.5 ${activeLog.isPeriod ? 'fill-white' : ''}`} />
              <span>{activeLog.isPeriod ? 'Period Day' : 'Mark Period'}</span>
            </button>
          </div>

          {/* Flow Level (Visible when marked as period) */}
          {activeLog.isPeriod && (
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] block">
                Flow Intensity
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {FLOW_LEVELS.map((f) => {
                  const isSelected = activeLog.flow === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => updateActiveLog({ flow: f.id })}
                      className={`p-2 rounded-xl border text-center transition-all ${
                        isSelected
                          ? 'bg-rose-500 text-white border-rose-500 shadow-2xs'
                          : 'bg-[var(--bg-paper)] text-[var(--text-primary)] border-[var(--border-color)] hover:border-rose-300'
                      }`}
                    >
                      <div className="text-base mb-0.5">{f.icon}</div>
                      <div className="text-[11px] font-semibold">{f.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Cramps & Pain Level (0 to 10 slider) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Cramps & Discomfort
              </label>
              <span className="text-xs font-mono font-bold text-rose-500">
                {activeLog.pain !== undefined ? `${activeLog.pain} / 10` : 'None (0)'}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              step="1"
              value={activeLog.pain || 0}
              onChange={(e) => updateActiveLog({ pain: parseInt(e.target.value, 10) })}
              className="w-full accent-rose-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-[var(--text-muted)] font-medium">
              <span>None</span>
              <span>Mild (1-3)</span>
              <span>Moderate (4-6)</span>
              <span>Severe (7-10)</span>
            </div>
          </div>

          {/* Mood Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] block">
              Mood & Mindset
            </label>
            <div className="flex flex-wrap gap-1.5">
              {MOODS.map((m) => {
                const isSelected = activeLog.mood === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => updateActiveLog({ mood: isSelected ? undefined : m.id })}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium border transition-all ${
                      isSelected
                        ? 'bg-[var(--accent)] text-[var(--accent-contrast)] border-[var(--accent)] shadow-2xs scale-105'
                        : 'bg-[var(--bg-paper)] text-[var(--text-secondary)] border-[var(--border-color)] hover:bg-[var(--bg-paper-hover)]'
                    }`}
                  >
                    <span>{m.emoji}</span>
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Symptoms Tags */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Symptoms & Body Signals
              </label>
              <button
                type="button"
                onClick={() => setIsAddingSymptom(!isAddingSymptom)}
                className="text-[11px] text-[var(--accent)] font-medium hover:underline flex items-center gap-0.5"
              >
                <Plus className="w-3 h-3" />
                <span>Custom</span>
              </button>
            </div>

            {/* Custom symptom text input */}
            {isAddingSymptom && (
              <form onSubmit={handleAddCustomSymptom} className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="e.g. Migraine, Dizziness..."
                  value={newSymptomText}
                  onChange={(e) => setNewSymptomText(e.target.value)}
                  className="flex-1 px-2.5 py-1 text-xs rounded-xl bg-[var(--bg-paper)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
                <button
                  type="submit"
                  className="px-2.5 py-1 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] text-xs font-medium"
                >
                  Add
                </button>
              </form>
            )}

            <div className="flex flex-wrap gap-1.5">
              {allAvailableSymptoms.map((symptom) => {
                const isSelected = (activeLog.symptoms || []).includes(symptom);
                return (
                  <button
                    key={symptom}
                    type="button"
                    onClick={() => handleToggleSymptom(symptom)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-medium border transition-all ${
                      isSelected
                        ? 'bg-rose-100 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-semibold'
                        : 'bg-[var(--bg-paper)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    {symptom}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes Textarea */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" />
              <span>Notes & Reflections</span>
            </label>
            <textarea
              rows={2}
              value={activeLog.notes || ''}
              onChange={(e) => updateActiveLog({ notes: e.target.value })}
              placeholder="Energy, diet notes, medications, or sensations for today..."
              className="w-full text-xs p-2.5 rounded-xl bg-[var(--bg-paper)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] resize-none"
            />
          </div>
        </div>
      </div>

      {/* Cycle History Section */}
      {detectedCycles.length > 0 && (
        <div className="pt-4 border-t border-[var(--border-color)] space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-serif-aesthetic text-sm sm:text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <span>Recorded Cycle History</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[var(--bg-paper-subtle)] text-[var(--text-muted)]">
                {detectedCycles.length} {detectedCycles.length === 1 ? 'cycle' : 'cycles'}
              </span>
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {detectedCycles.map((cycle) => (
              <div
                key={cycle.id}
                onClick={() => {
                  const [y, m] = cycle.startDate.split('-');
                  setViewYear(parseInt(y, 10));
                  setViewMonth(parseInt(m, 10) - 1);
                  setSelectedDate(cycle.startDate);
                }}
                className="p-3 rounded-2xl journal-paper-subtle border border-[var(--border-color)] hover:border-rose-300 transition-all cursor-pointer space-y-1 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--text-primary)] group-hover:text-rose-500 transition-colors">
                    {formatDate(cycle.startDate, { month: 'short', year: 'numeric' })}
                  </span>
                  <span className="text-xs font-mono font-bold text-rose-500">
                    {cycle.durationDays} {cycle.durationDays === 1 ? 'day' : 'days'}
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  {formatDate(cycle.startDate, { month: 'short', day: 'numeric' })} – {formatDate(cycle.endDate, { month: 'short', day: 'numeric' })}
                </p>
                {cycle.cycleLengthDays && (
                  <p className="text-[10px] text-[var(--text-muted)] pt-1 border-t border-[var(--border-color)]">
                    Cycle gap: {cycle.cycleLengthDays} days
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
