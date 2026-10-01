'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  WalkTrackerContent, 
  WalkSession, 
  WalkFeeling 
} from '@/lib/types';
import { 
  generateId, 
  getTodayDateString, 
  getDaysInMonth, 
  MONTH_NAMES, 
  splitWalkSessionByHours, 
  formatHourLabel, 
  formatHourRange, 
  formatDuration 
} from '@/lib/utils';
import { 
  Footprints, 
  Play, 
  Pause, 
  Square, 
  RotateCcw, 
  Plus, 
  Calendar as CalendarIcon, 
  Clock, 
  Flame, 
  CheckCircle2, 
  X, 
  Trash2, 
  Edit3, 
  ChevronLeft, 
  ChevronRight, 
  Smile, 
  Sparkles, 
  Info, 
  Bell, 
  SlidersHorizontal 
} from 'lucide-react';

interface WalkTrackerBlockProps {
  content: WalkTrackerContent;
  onChange: (updatedContent: WalkTrackerContent) => void;
  blockId?: string;
}

const FEELINGS: { key: WalkFeeling; label: string; emoji: string }[] = [
  { key: 'very_tired', label: 'Very tired', emoji: '😫' },
  { key: 'tired', label: 'Tired', emoji: '😕' },
  { key: 'okay', label: 'Okay', emoji: '🙂' },
  { key: 'good', label: 'Good', emoji: '😊' },
  { key: 'energized', label: 'Energized', emoji: '⚡' },
];

export function WalkTrackerBlock({ content, onChange, blockId = 'default' }: WalkTrackerBlockProps) {
  const [data, setData] = useState<WalkTrackerContent>(
    content || { targetMinutes: 5, sessions: [], notes: '' }
  );

  useEffect(() => {
    if (content) {
      setData(content);
    }
  }, [content]);

  const updateData = (next: WalkTrackerContent) => {
    setData(next);
    onChange(next);
  };

  // -------------------------------------------------------------
  // TIMER STATE & TIMESTAMP-BASED RELIABILITY
  // -------------------------------------------------------------
  const timerStorageKey = `planora_walk_timer_${blockId}`;

  const [targetMinutes, setTargetMinutes] = useState<number>(data.targetMinutes || 5);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState<string | null>(null);
  const [isCustomTimerOpen, setIsCustomTimerOpen] = useState(false);
  const [customMinInput, setCustomMinInput] = useState('5');
  const [customSecInput, setCustomSecInput] = useState('0');

  // Load persistent active timer state on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(timerStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.isRunning) {
          setIsTimerRunning(true);
          setIsTimerPaused(Boolean(parsed.isPaused));
          setSessionStartTime(parsed.sessionStartTime || new Date().toISOString());
          setTargetMinutes(parsed.targetMinutes || 5);

          if (parsed.isPaused) {
            setElapsedSeconds(parsed.accumulatedSeconds || 0);
          } else {
            const now = Date.now();
            const startedAt = parsed.startedAt || now;
            const diffSec = Math.floor((now - startedAt) / 1000);
            setElapsedSeconds((parsed.accumulatedSeconds || 0) + Math.max(0, diffSec));
          }
        }
      }
    } catch (e) {
      console.error('Error recovering walk timer:', e);
    }
  }, [timerStorageKey]);

  // Interval timer tick
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning && !isTimerPaused) {
      interval = setInterval(() => {
        try {
          const saved = localStorage.getItem(timerStorageKey);
          if (saved) {
            const parsed = JSON.parse(saved);
            const now = Date.now();
            const startedAt = parsed.startedAt || now;
            const diffSec = Math.floor((now - startedAt) / 1000);
            setElapsedSeconds((parsed.accumulatedSeconds || 0) + Math.max(0, diffSec));
          } else {
            setElapsedSeconds((prev) => prev + 1);
          }
        } catch {
          setElapsedSeconds((prev) => prev + 1);
        }
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, isTimerPaused, timerStorageKey]);

  const saveTimerToStorage = (state: {
    isRunning: boolean;
    isPaused: boolean;
    startedAt: number | null;
    accumulatedSeconds: number;
    targetMinutes: number;
    sessionStartTime: string | null;
  }) => {
    try {
      if (!state.isRunning) {
        localStorage.removeItem(timerStorageKey);
      } else {
        localStorage.setItem(timerStorageKey, JSON.stringify(state));
      }
    } catch (e) {
      console.error('Failed to save walk timer to localStorage', e);
    }
  };

  const handleStartTimer = (customDurationMinutes?: number) => {
    const targetMin = customDurationMinutes !== undefined ? customDurationMinutes : targetMinutes;
    setTargetMinutes(targetMin);
    const nowIso = new Date().toISOString();
    const nowMs = Date.now();

    setIsTimerRunning(true);
    setIsTimerPaused(false);
    setElapsedSeconds(0);
    setSessionStartTime(nowIso);

    saveTimerToStorage({
      isRunning: true,
      isPaused: false,
      startedAt: nowMs,
      accumulatedSeconds: 0,
      targetMinutes: targetMin,
      sessionStartTime: nowIso,
    });
  };

  const handlePauseTimer = () => {
    setIsTimerPaused(true);
    saveTimerToStorage({
      isRunning: true,
      isPaused: true,
      startedAt: null,
      accumulatedSeconds: elapsedSeconds,
      targetMinutes,
      sessionStartTime,
    });
  };

  const handleResumeTimer = () => {
    const nowMs = Date.now();
    setIsTimerPaused(false);
    saveTimerToStorage({
      isRunning: true,
      isPaused: false,
      startedAt: nowMs,
      accumulatedSeconds: elapsedSeconds,
      targetMinutes,
      sessionStartTime,
    });
  };

  // Post-walk modal state
  const [completedSessionData, setCompletedSessionData] = useState<{
    started_at: string;
    ended_at: string;
    duration_seconds: number;
    target_duration_seconds: number;
  } | null>(null);
  const [postFeeling, setPostFeeling] = useState<WalkFeeling | null>(null);
  const [postNote, setPostNote] = useState('');

  const handleStopTimer = () => {
    const actualSeconds = Math.max(1, elapsedSeconds);
    const startIso = sessionStartTime || new Date(Date.now() - actualSeconds * 1000).toISOString();
    const endIso = new Date().toISOString();

    setIsTimerRunning(false);
    setIsTimerPaused(false);
    saveTimerToStorage({
      isRunning: false,
      isPaused: false,
      startedAt: null,
      accumulatedSeconds: 0,
      targetMinutes,
      sessionStartTime: null,
    });

    // Open Post-Walk Feeling dialog
    setCompletedSessionData({
      started_at: startIso,
      ended_at: endIso,
      duration_seconds: actualSeconds,
      target_duration_seconds: targetMinutes * 60,
    });
    setPostFeeling(null);
    setPostNote('');
  };

  const handleSaveCompletedSession = (feeling: WalkFeeling | null, note: string) => {
    if (!completedSessionData) return;

    const startDate = new Date(completedSessionData.started_at);
    const dateStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
    const hourNum = startDate.getHours();

    const newSession: WalkSession = {
      id: generateId(),
      started_at: completedSessionData.started_at,
      ended_at: completedSessionData.ended_at,
      duration_seconds: completedSessionData.duration_seconds,
      target_duration_seconds: completedSessionData.target_duration_seconds,
      date: dateStr,
      hour: hourNum,
      feeling: feeling || undefined,
      note: note.trim() || undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const nextSessions = [newSession, ...(data.sessions || [])];
    updateData({
      ...data,
      sessions: nextSessions,
    });

    setCompletedSessionData(null);
    setPostFeeling(null);
    setPostNote('');
    setElapsedSeconds(0);
  };

  // -------------------------------------------------------------
  // MANUAL WALK ENTRY MODAL
  // -------------------------------------------------------------
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualDate, setManualDate] = useState(getTodayDateString());
  const [manualTime, setManualTime] = useState(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });
  const [manualMinutes, setManualMinutes] = useState('5');
  const [manualSeconds, setManualSeconds] = useState('0');
  const [manualFeeling, setManualFeeling] = useState<WalkFeeling | null>('good');
  const [manualNote, setManualNote] = useState('');

  const handleSaveManualWalk = (e: React.FormEvent) => {
    e.preventDefault();
    const mins = parseInt(manualMinutes, 10) || 0;
    const secs = parseInt(manualSeconds, 10) || 0;
    const totalSecs = Math.max(1, mins * 60 + secs);

    // Build ISO timestamp from date and time
    const [hStr, mStr] = manualTime.split(':');
    const startObj = new Date(`${manualDate}T${hStr || '12'}:${mStr || '00'}:00`);
    const started_at = isNaN(startObj.getTime()) ? new Date().toISOString() : startObj.toISOString();
    const ended_at = new Date(startObj.getTime() + totalSecs * 1000).toISOString();
    const hourNum = isNaN(startObj.getHours()) ? 12 : startObj.getHours();

    const newSession: WalkSession = {
      id: generateId(),
      started_at,
      ended_at,
      duration_seconds: totalSecs,
      target_duration_seconds: (data.targetMinutes || 5) * 60,
      date: manualDate,
      hour: hourNum,
      feeling: manualFeeling,
      note: manualNote.trim() || undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    updateData({
      ...data,
      sessions: [newSession, ...(data.sessions || [])],
    });

    setIsManualModalOpen(false);
    setManualNote('');
  };

  // -------------------------------------------------------------
  // EDIT / DELETE SESSION
  // -------------------------------------------------------------
  const [editingSession, setEditingSession] = useState<WalkSession | null>(null);

  const handleUpdateSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSession) return;

    const nextSessions = (data.sessions || []).map((s) =>
      s.id === editingSession.id ? { ...editingSession, updated_at: new Date().toISOString() } : s
    );
    updateData({ ...data, sessions: nextSessions });
    setEditingSession(null);
  };

  const handleDeleteSession = (sessionId: string) => {
    const nextSessions = (data.sessions || []).filter((s) => s.id !== sessionId);
    updateData({ ...data, sessions: nextSessions });
    if (selectedCell) {
      // Refresh selected cell sessions
      setSelectedCell(null);
    }
  };

  // -------------------------------------------------------------
  // MONTH SELECTION & MATRIX AGGREGATION
  // -------------------------------------------------------------
  const todayObj = useMemo(() => new Date(), []);
  const [selectedYear, setSelectedYear] = useState<number>(todayObj.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(todayObj.getMonth()); // 0-11
  const [selectedDayForSummary, setSelectedDayForSummary] = useState<string>(getTodayDateString());

  const daysInSelectedMonth = useMemo(() => {
    return getDaysInMonth(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth]);

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  const handleCurrentMonth = () => {
    setSelectedMonth(todayObj.getMonth());
    setSelectedYear(todayObj.getFullYear());
  };

  // Heatmap Aggregation: Matrix [hour: 0..23][day: 1..daysInMonth] -> { totalMinutes, sessions }
  const heatmapData = useMemo(() => {
    // 24 rows (hours) x (daysInMonth + 1)
    const grid: {
      totalMinutes: number;
      sessions: WalkSession[];
    }[][] = Array.from({ length: 24 }, () =>
      Array.from({ length: daysInSelectedMonth + 1 }, () => ({
        totalMinutes: 0,
        sessions: [],
      }))
    );

    const monthStr = String(selectedMonth + 1).padStart(2, '0');
    const monthPrefix = `${selectedYear}-${monthStr}`;

    for (const session of data.sessions || []) {
      const segments = splitWalkSessionByHours(session);
      for (const seg of segments) {
        if (seg.date.startsWith(monthPrefix)) {
          const dayNum = parseInt(seg.date.split('-')[2], 10);
          if (dayNum >= 1 && dayNum <= daysInSelectedMonth && seg.hour >= 0 && seg.hour < 24) {
            grid[seg.hour][dayNum].totalMinutes += seg.minutes;
            if (!grid[seg.hour][dayNum].sessions.some((s) => s.id === session.id)) {
              grid[seg.hour][dayNum].sessions.push(session);
            }
          }
        }
      }
    }

    return grid;
  }, [data.sessions, selectedYear, selectedMonth, daysInSelectedMonth]);

  // Selected cell for detailed inspection
  const [selectedCell, setSelectedCell] = useState<{
    dateStr: string;
    hour: number;
    totalMinutes: number;
    sessions: WalkSession[];
  } | null>(null);

  // Intensity color mapper matching Planora's theme tokens
  const getCellIntensityStyle = (minutes: number) => {
    if (minutes <= 0) {
      return 'bg-[var(--bg-paper-subtle)] border-[var(--border-color)]/50 text-[var(--text-muted)]';
    }
    if (minutes < 5) {
      // 1-4 min: very light intensity (below 5-min target)
      return 'bg-[var(--accent)]/20 border-[var(--accent)]/30 text-[var(--text-primary)] font-medium';
    }
    if (minutes < 10) {
      // 5-9 min: light-medium intensity (target reached ✓)
      return 'bg-[var(--accent)]/45 border-[var(--accent)]/60 text-[var(--text-primary)] font-semibold shadow-2xs';
    }
    if (minutes < 20) {
      // 10-19 min: medium-strong intensity
      return 'bg-[var(--accent)]/70 border-[var(--accent)]/80 text-[var(--accent-contrast)] font-bold shadow-xs';
    }
    if (minutes < 30) {
      // 20-29 min: deep intensity
      return 'bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-contrast)] font-bold shadow-xs';
    }
    // 30+ min: deepest intensity
    return 'bg-[var(--accent-hover)] border-[var(--accent-hover)] text-[var(--accent-contrast)] font-extrabold shadow-sm ring-1 ring-[var(--accent)]';
  };

  // -------------------------------------------------------------
  // DAILY SUMMARY CALCULATIONS (for selectedDayForSummary, default today)
  // -------------------------------------------------------------
  const dailySummary = useMemo(() => {
    let totalMinutes = 0;
    const activeSessions: WalkSession[] = [];
    const hourlyMinutesMap: Record<number, number> = {};

    for (let h = 0; h < 24; h++) hourlyMinutesMap[h] = 0;

    for (const session of data.sessions || []) {
      const segments = splitWalkSessionByHours(session);
      let sessionContributed = false;
      for (const seg of segments) {
        if (seg.date === selectedDayForSummary) {
          totalMinutes += seg.minutes;
          hourlyMinutesMap[seg.hour] = (hourlyMinutesMap[seg.hour] || 0) + seg.minutes;
          sessionContributed = true;
        }
      }
      if (sessionContributed) {
        activeSessions.push(session);
      }
    }

    let targetReachedHoursCount = 0;
    for (let h = 0; h < 24; h++) {
      if (hourlyMinutesMap[h] >= (data.targetMinutes || 5)) {
        targetReachedHoursCount++;
      }
    }

    return {
      dateStr: selectedDayForSummary,
      totalMinutes: Math.round(totalMinutes * 10) / 10,
      sessionCount: activeSessions.length,
      targetReachedHoursCount,
      hourlyMinutesMap,
      sessions: activeSessions,
    };
  }, [data.sessions, selectedDayForSummary, data.targetMinutes]);

  // -------------------------------------------------------------
  // MONTHLY SUMMARY STATISTICS
  // -------------------------------------------------------------
  const monthlyStats = useMemo(() => {
    const monthStr = String(selectedMonth + 1).padStart(2, '0');
    const monthPrefix = `${selectedYear}-${monthStr}`;

    let totalMonthMinutes = 0;
    const activeDaysSet = new Set<string>();
    const monthSessionsSet = new Set<string>();
    let targetHoursAchieved = 0;
    let maxSessionDurationSec = 0;

    for (const session of data.sessions || []) {
      const segments = splitWalkSessionByHours(session);
      let sessionMatchesMonth = false;
      for (const seg of segments) {
        if (seg.date.startsWith(monthPrefix)) {
          totalMonthMinutes += seg.minutes;
          activeDaysSet.add(seg.date);
          sessionMatchesMonth = true;
        }
      }
      if (sessionMatchesMonth) {
        monthSessionsSet.add(session.id);
        if (session.duration_seconds > maxSessionDurationSec) {
          maxSessionDurationSec = session.duration_seconds;
        }
      }
    }

    // Count hours with >= 5 min target reached
    for (let h = 0; h < 24; h++) {
      for (let d = 1; d <= daysInSelectedMonth; d++) {
        if (heatmapData[h][d].totalMinutes >= (data.targetMinutes || 5)) {
          targetHoursAchieved++;
        }
      }
    }

    const activeDaysCount = activeDaysSet.size;
    const avgMinutesPerActiveDay = activeDaysCount > 0 ? Math.round(totalMonthMinutes / activeDaysCount) : 0;

    return {
      totalMinutes: Math.round(totalMonthMinutes),
      totalHoursStr: `${Math.floor(totalMonthMinutes / 60)}h ${Math.round(totalMonthMinutes % 60)}m`,
      activeDaysCount,
      totalSessionsCount: monthSessionsSet.size,
      avgMinutesPerActiveDay,
      targetHoursAchieved,
      longestSessionMinutes: Math.round(maxSessionDurationSec / 60),
    };
  }, [data.sessions, selectedYear, selectedMonth, daysInSelectedMonth, heatmapData, data.targetMinutes]);

  // Timer formatted strings
  const targetSec = targetMinutes * 60;
  const remainingSec = Math.max(0, targetSec - elapsedSeconds);
  const overtimeSec = elapsedSeconds > targetSec ? elapsedSeconds - targetSec : 0;

  return (
    <div className="space-y-6 journal-paper p-4 sm:p-6 shadow-sm">
      {/* --------------------------------------------------------- */}
      {/* 1. TOP HEADER & QUICK ACTION BAR */}
      {/* --------------------------------------------------------- */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-color)] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[var(--accent)] text-[var(--accent-contrast)] flex items-center justify-center shadow-xs">
            <Footprints className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif-aesthetic text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
              Hourly Walk Tracker
            </h3>
            <p className="font-serif-aesthetic italic text-xs text-[var(--text-secondary)]">
              5 minutes of movement every hour for vitality, posture & focus
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleStartTimer(5)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-contrast)] text-xs font-semibold shadow-xs transition-all active:scale-95"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>+ Start 5-Min Walk</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCustomTimerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-paper-subtle)] hover:bg-[var(--bg-paper-hover)] border border-[var(--border-color)] text-xs font-medium text-[var(--text-primary)] transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Custom Timer</span>
          </button>

          <button
            type="button"
            onClick={() => setIsManualModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-paper-subtle)] hover:bg-[var(--bg-paper-hover)] border border-[var(--border-color)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Walk Manually</span>
          </button>
        </div>
      </div>

      {/* --------------------------------------------------------- */}
      {/* 2. ACTIVE WALK TIMER CARD */}
      {/* --------------------------------------------------------- */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[var(--accent)]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              Walking Session Timer
            </span>
            {isTimerRunning && (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {isTimerPaused ? 'Paused' : 'Active Walk In Progress'}
              </span>
            )}
          </div>

          {/* Target Duration Selector Pills */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[11px] text-[var(--text-muted)] mr-1">Target:</span>
            {[5, 10, 15, 20, 30].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setTargetMinutes(m);
                  if (isTimerRunning) {
                    saveTimerToStorage({
                      isRunning: true,
                      isPaused: isTimerPaused,
                      startedAt: Date.now(),
                      accumulatedSeconds: elapsedSeconds,
                      targetMinutes: m,
                      sessionStartTime,
                    });
                  }
                }}
                className={`px-2 py-0.5 rounded-lg text-xs font-medium transition-all ${
                  targetMinutes === m
                    ? 'bg-[var(--accent)] text-[var(--accent-contrast)] shadow-2xs font-semibold'
                    : 'bg-[var(--bg-paper)] text-[var(--text-secondary)] hover:bg-[var(--bg-paper-hover)] border border-[var(--border-color)]'
                }`}
              >
                {m}m
              </button>
            ))}
          </div>
        </div>

        {/* Big Timer Display */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center bg-[var(--bg-paper)] p-4 rounded-xl border border-[var(--border-color)]/70">
          <div className="text-center sm:text-left space-y-0.5">
            <div className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
              Target Duration
            </div>
            <div className="font-serif-aesthetic text-xl font-bold text-[var(--text-secondary)]">
              {formatDuration(targetSec)}
            </div>
          </div>

          <div className="text-center space-y-1">
            <div className="text-xs uppercase tracking-widest text-[var(--accent)] font-bold">
              Elapsed Time
            </div>
            <div className="font-mono text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--text-primary)]">
              {formatDuration(elapsedSeconds)}
            </div>
            {elapsedSeconds >= targetSec && (
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center justify-center gap-1 animate-fadeIn">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>5-Min Target Reached! (+{formatDuration(overtimeSec)})</span>
              </div>
            )}
          </div>

          <div className="text-center sm:text-right space-y-0.5">
            <div className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
              Remaining
            </div>
            <div className="font-serif-aesthetic text-xl font-bold text-[var(--text-secondary)]">
              {formatDuration(remainingSec)}
            </div>
          </div>
        </div>

        {/* Timer Control Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          {!isTimerRunning ? (
            <button
              type="button"
              onClick={() => handleStartTimer()}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-contrast)] text-sm font-semibold shadow-xs transition-transform active:scale-95"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start Walk</span>
            </button>
          ) : (
            <>
              {!isTimerPaused ? (
                <button
                  type="button"
                  onClick={handlePauseTimer}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-xs transition-transform active:scale-95"
                >
                  <Pause className="w-4 h-4 fill-current" />
                  <span>Pause</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleResumeTimer}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-transform active:scale-95"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Resume</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleStopTimer}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-semibold shadow-xs transition-transform active:scale-95"
              >
                <Square className="w-4 h-4 fill-current" />
                <span>Stop & Save Session</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* --------------------------------------------------------- */}
      {/* 3. TODAY VIEW & DAILY SUMMARY CARDS */}
      {/* --------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Summary Stats Card */}
        <div className="lg:col-span-1 p-4 sm:p-5 rounded-2xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[var(--accent)]" />
              <span>Daily Walk Summary</span>
            </span>
            <input
              type="date"
              value={selectedDayForSummary}
              onChange={(e) => setSelectedDayForSummary(e.target.value)}
              className="text-xs py-0.5 px-2 rounded-lg bg-[var(--bg-paper)] border border-[var(--border-color)] text-[var(--text-primary)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-[var(--bg-paper)] border border-[var(--border-color)]/70">
              <div className="text-[11px] text-[var(--text-muted)]">Total Walked</div>
              <div className="font-serif-aesthetic text-xl font-bold text-[var(--text-primary)] mt-0.5">
                {dailySummary.totalMinutes} min
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[var(--bg-paper)] border border-[var(--border-color)]/70">
              <div className="text-[11px] text-[var(--text-muted)]">Sessions</div>
              <div className="font-serif-aesthetic text-xl font-bold text-[var(--text-primary)] mt-0.5">
                {dailySummary.sessionCount}
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[var(--bg-paper)] border border-[var(--border-color)]/70 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--text-secondary)] font-medium">5-Min Hourly Target Reached:</span>
              <span className="font-bold text-[var(--accent)]">
                {dailySummary.targetReachedHoursCount} / 24 hrs
              </span>
            </div>
            {/* Progress bar */}
            <div className="h-2 rounded-full bg-[var(--bg-paper-subtle)] overflow-hidden">
              <div
                className="h-full bg-[var(--accent)] rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (dailySummary.targetReachedHoursCount / 12) * 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-[var(--text-muted)] italic pt-0.5">
              Goal: walk at least 5 minutes in each active hour throughout the day.
            </p>
          </div>
        </div>

        {/* Today Hourly Strip View */}
        <div className="lg:col-span-2 p-4 sm:p-5 rounded-2xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[var(--accent)]" />
              <span>Today&apos;s Hourly Flow ({selectedDayForSummary})</span>
            </span>
            <span className="text-[11px] text-[var(--text-muted)]">Click an hour to inspect</span>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
            {Array.from({ length: 24 }, (_, hour) => {
              const minutes = dailySummary.hourlyMinutesMap[hour] || 0;
              const reached = minutes >= (data.targetMinutes || 5);
              return (
                <button
                  key={hour}
                  type="button"
                  onClick={() => {
                    const sessionsInHour = (data.sessions || []).filter((s) => {
                      const segs = splitWalkSessionByHours(s);
                      return segs.some((seg) => seg.date === selectedDayForSummary && seg.hour === hour);
                    });
                    setSelectedCell({
                      dateStr: selectedDayForSummary,
                      hour,
                      totalMinutes: minutes,
                      sessions: sessionsInHour,
                    });
                  }}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all hover:scale-105 ${
                    minutes > 0
                      ? reached
                        ? 'bg-[var(--accent)] text-[var(--accent-contrast)] border-[var(--accent)] shadow-2xs font-semibold'
                        : 'bg-[var(--accent-soft)] text-[var(--text-primary)] border-[var(--accent)]/40 font-medium'
                      : 'bg-[var(--bg-paper)] text-[var(--text-muted)] border-[var(--border-color)]/60 hover:bg-[var(--bg-paper-hover)]'
                  }`}
                >
                  <span className="text-[10px] font-medium leading-none mb-1">
                    {formatHourLabel(hour)}
                  </span>
                  <span className="text-xs font-bold leading-none">
                    {minutes > 0 ? `${Math.round(minutes)}m` : '—'}
                  </span>
                  {reached && <CheckCircle2 className="w-3 h-3 mt-1 fill-current text-emerald-300" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------- */}
      {/* 4. MONTHLY STATS & HEATMAP VISUALIZATION */}
      {/* --------------------------------------------------------- */}
      <div className="space-y-4 pt-2">
        {/* Monthly Summary Statistics Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          <div className="p-3 rounded-xl journal-paper-subtle text-center">
            <div className="text-[10px] uppercase font-semibold text-[var(--text-muted)]">Total Walked</div>
            <div className="font-serif-aesthetic text-lg font-bold text-[var(--text-primary)] mt-0.5">
              {monthlyStats.totalHoursStr}
            </div>
          </div>
          <div className="p-3 rounded-xl journal-paper-subtle text-center">
            <div className="text-[10px] uppercase font-semibold text-[var(--text-muted)]">Active Days</div>
            <div className="font-serif-aesthetic text-lg font-bold text-[var(--text-primary)] mt-0.5">
              {monthlyStats.activeDaysCount} / {daysInSelectedMonth}
            </div>
          </div>
          <div className="p-3 rounded-xl journal-paper-subtle text-center">
            <div className="text-[10px] uppercase font-semibold text-[var(--text-muted)]">Daily Avg</div>
            <div className="font-serif-aesthetic text-lg font-bold text-[var(--text-primary)] mt-0.5">
              {monthlyStats.avgMinutesPerActiveDay} min
            </div>
          </div>
          <div className="p-3 rounded-xl journal-paper-subtle text-center">
            <div className="text-[10px] uppercase font-semibold text-[var(--text-muted)]">Sessions</div>
            <div className="font-serif-aesthetic text-lg font-bold text-[var(--text-primary)] mt-0.5">
              {monthlyStats.totalSessionsCount}
            </div>
          </div>
          <div className="p-3 rounded-xl journal-paper-subtle text-center">
            <div className="text-[10px] uppercase font-semibold text-[var(--text-muted)]">5-Min Hours</div>
            <div className="font-serif-aesthetic text-lg font-bold text-[var(--accent)] mt-0.5">
              {monthlyStats.targetHoursAchieved}
            </div>
          </div>
          <div className="p-3 rounded-xl journal-paper-subtle text-center">
            <div className="text-[10px] uppercase font-semibold text-[var(--text-muted)]">Longest Walk</div>
            <div className="font-serif-aesthetic text-lg font-bold text-[var(--text-primary)] mt-0.5">
              {monthlyStats.longestSessionMinutes} min
            </div>
          </div>
        </div>

        {/* Month Selector Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)]">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-paper-hover)] transition-colors"
              title="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="font-serif-aesthetic text-base font-bold text-[var(--text-primary)] min-w-32 text-center">
              {MONTH_NAMES[selectedMonth]} {selectedYear}
            </span>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-paper-hover)] transition-colors"
              title="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleCurrentMonth}
              className="px-2.5 py-1 text-xs rounded-lg bg-[var(--bg-paper)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-paper-hover)] transition-colors"
            >
              Current Month
            </button>
          </div>

          {/* Intensity Legend */}
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
            <span>Less</span>
            <span className="w-3 h-3 rounded-sm bg-[var(--bg-paper-subtle)] border border-[var(--border-color)]" title="0 min" />
            <span className="w-3 h-3 rounded-sm bg-[var(--accent)]/20 border border-[var(--accent)]/30" title="1-4 min (below target)" />
            <span className="w-3 h-3 rounded-sm bg-[var(--accent)]/45 border border-[var(--accent)]/60" title="5-9 min (target reached)" />
            <span className="w-3 h-3 rounded-sm bg-[var(--accent)]/70 border border-[var(--accent)]/80" title="10-19 min" />
            <span className="w-3 h-3 rounded-sm bg-[var(--accent)] border border-[var(--accent)]" title="20-29 min" />
            <span className="w-3 h-3 rounded-sm bg-[var(--accent-hover)] border border-[var(--accent-hover)]" title="30+ min" />
            <span>More</span>
          </div>
        </div>

        {/* --------------------------------------------------------- */}
        {/* 5. 24-HOUR x 31-DAY GITHUB-INSPIRED HOURLY HEATMAP MATRIX */}
        {/* --------------------------------------------------------- */}
        <div className="p-4 rounded-2xl bg-[var(--bg-paper)] border border-[var(--border-color)] shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] font-medium">
            <span>Y-axis: 24 Hours (12 AM – 11 PM)</span>
            <span>X-axis: Days of {MONTH_NAMES[selectedMonth]} (1 .. {daysInSelectedMonth})</span>
          </div>

          {/* Horizontally scrollable container for desktop & mobile readability */}
          <div className="overflow-x-auto pb-2 scrollbar-thin">
            <div className="min-w-[720px]">
              {/* Day numbers header (Columns: Days 1..daysInSelectedMonth) */}
              <div className="flex items-center mb-1">
                {/* Fixed Hour Label Header */}
                <div className="w-14 shrink-0 text-[10px] font-semibold text-[var(--text-muted)] text-right pr-2">
                  Hour \ Day
                </div>

                <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${daysInSelectedMonth}, minmax(0, 1fr))` }}>
                  {Array.from({ length: daysInSelectedMonth }, (_, i) => {
                    const dayNum = i + 1;
                    const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                    const isToday = dateStr === getTodayDateString();
                    return (
                      <div
                        key={dayNum}
                        onClick={() => setSelectedDayForSummary(dateStr)}
                        className={`text-center text-[10px] font-medium py-1 cursor-pointer transition-colors rounded ${
                          isToday
                            ? 'bg-[var(--accent)] text-[var(--accent-contrast)] font-bold'
                            : selectedDayForSummary === dateStr
                            ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-semibold'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-paper-hover)]'
                        }`}
                        title={`Select day: ${dateStr}`}
                      >
                        {dayNum}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 24 Hourly Rows */}
              <div className="space-y-1">
                {Array.from({ length: 24 }, (_, hour) => (
                  <div key={hour} className="flex items-center group">
                    {/* Sticky readable hour label */}
                    <div className="w-14 shrink-0 text-[10px] font-medium text-[var(--text-muted)] text-right pr-2 select-none group-hover:text-[var(--text-primary)] group-hover:font-semibold">
                      {formatHourLabel(hour)}
                    </div>

                    {/* Day Cells for this Hour */}
                    <div className="flex-1 grid gap-1" style={{ gridTemplateColumns: `repeat(${daysInSelectedMonth}, minmax(0, 1fr))` }}>
                      {Array.from({ length: daysInSelectedMonth }, (_, i) => {
                        const dayNum = i + 1;
                        const cell = heatmapData[hour][dayNum];
                        const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                        const minutes = Math.round(cell.totalMinutes * 10) / 10;
                        const reached = minutes >= (data.targetMinutes || 5);

                        return (
                          <div
                            key={dayNum}
                            onClick={() => {
                              setSelectedDayForSummary(dateStr);
                              setSelectedCell({
                                dateStr,
                                hour,
                                totalMinutes: minutes,
                                sessions: cell.sessions,
                              });
                            }}
                            className={`h-5 sm:h-6 rounded-md border flex items-center justify-center cursor-pointer transition-all hover:scale-110 hover:z-10 relative group/cell ${getCellIntensityStyle(
                              minutes
                            )}`}
                            title={`${dateStr} at ${formatHourRange(hour)}\nWalking: ${minutes} min\n${
                              reached ? '✓ 5-min Target Reached' : minutes > 0 ? 'Below target' : 'No activity'
                            }`}
                          >
                            {minutes >= 5 && (
                              <span className="text-[9px] select-none opacity-80 leading-none">
                                {Math.round(minutes)}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------- */}
      {/* 6. CELL INSPECTION MODAL / POPUP */}
      {/* --------------------------------------------------------- */}
      {selectedCell && (
        <div className="p-4 rounded-2xl bg-[var(--bg-paper-subtle)] border border-[var(--accent)] shadow-md space-y-3 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2.5">
            <div className="flex items-center gap-2">
              <Footprints className="w-4 h-4 text-[var(--accent)]" />
              <h4 className="font-serif-aesthetic text-base font-bold text-[var(--text-primary)]">
                {selectedCell.dateStr} • {formatHourRange(selectedCell.hour)}
              </h4>
            </div>
            <button
              onClick={() => setSelectedCell(null)}
              className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-paper-hover)]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div>
              <span className="text-[var(--text-muted)]">Total Minutes: </span>
              <strong className="text-[var(--text-primary)] font-bold">{selectedCell.totalMinutes} min</strong>
            </div>
            <div>
              <span className="text-[var(--text-muted)]">Sessions in Hour: </span>
              <strong className="text-[var(--text-primary)]">{selectedCell.sessions.length}</strong>
            </div>
            <div>
              <span className="text-[var(--text-muted)]">Target Status: </span>
              {selectedCell.totalMinutes >= (data.targetMinutes || 5) ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                  ✓ 5-minute target reached
                </span>
              ) : selectedCell.totalMinutes > 0 ? (
                <span className="text-amber-600 dark:text-amber-400 font-medium">
                  {selectedCell.totalMinutes} / {data.targetMinutes || 5} min
                </span>
              ) : (
                <span className="text-[var(--text-muted)]">No walking recorded</span>
              )}
            </div>
          </div>

          {/* List of sessions for this hour */}
          {selectedCell.sessions.length > 0 && (
            <div className="space-y-2 pt-1">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Recorded Walking Sessions
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {selectedCell.sessions.map((sess) => {
                  const feelingObj = FEELINGS.find((f) => f.key === sess.feeling);
                  return (
                    <div
                      key={sess.id}
                      className="p-2.5 rounded-xl bg-[var(--bg-paper)] border border-[var(--border-color)] text-xs flex items-center justify-between gap-3"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 font-medium text-[var(--text-primary)]">
                          <span>
                            {new Date(sess.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span>•</span>
                          <span className="font-bold text-[var(--accent)]">
                            {formatDuration(sess.duration_seconds)} ({Math.round(sess.duration_seconds / 60)} min)
                          </span>
                          {feelingObj && (
                            <span className="flex items-center gap-1 text-[11px] bg-[var(--bg-paper-subtle)] px-2 py-0.5 rounded-md border border-[var(--border-color)]">
                              <span>{feelingObj.emoji}</span>
                              <span>{feelingObj.label}</span>
                            </span>
                          )}
                        </div>
                        {sess.note && (
                          <p className="text-[11px] text-[var(--text-secondary)] italic">
                            &ldquo;{sess.note}&rdquo;
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingSession(sess)}
                          className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-paper-hover)]"
                          title="Edit walk"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSession(sess.id)}
                          className="p-1 rounded text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                          title="Delete walk"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* --------------------------------------------------------- */}
      {/* 7. POST-WALK FEELING MODAL DIALOG */}
      {/* --------------------------------------------------------- */}
      {completedSessionData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[var(--bg-paper)] border border-[var(--border-color)] shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center mx-auto text-2xl shadow-xs">
                🚶‍♀️
              </div>
              <h3 className="font-serif-aesthetic text-xl font-bold text-[var(--text-primary)]">
                Walk Completed!
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Actual walking duration:{' '}
                <strong className="text-[var(--accent)] font-bold">
                  {formatDuration(completedSessionData.duration_seconds)}
                </strong>{' '}
                ({Math.round((completedSessionData.duration_seconds / 60) * 10) / 10} min)
              </p>
            </div>

            {/* How are you feeling question */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] text-center">
                How are you feeling?
              </label>
              <div className="grid grid-cols-5 gap-2">
                {FEELINGS.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setPostFeeling(f.key)}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${
                      postFeeling === f.key
                        ? 'bg-[var(--accent)] text-[var(--accent-contrast)] border-[var(--accent)] shadow-xs scale-105'
                        : 'bg-[var(--bg-paper-subtle)] border-[var(--border-color)] hover:bg-[var(--bg-paper-hover)] text-[var(--text-primary)]'
                    }`}
                  >
                    <span className="text-2xl mb-1">{f.emoji}</span>
                    <span className="text-[10px] font-medium leading-tight">{f.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Note */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                Add a note (optional)
              </label>
              <input
                type="text"
                value={postNote}
                onChange={(e) => setPostNote(e.target.value)}
                placeholder="e.g. Felt much better after walking in the fresh air."
                className="w-full text-xs p-2.5 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-[var(--border-color)]">
              <button
                type="button"
                onClick={() => handleSaveCompletedSession(null, '')}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-paper-hover)] transition-colors"
              >
                Skip
              </button>
              <button
                type="button"
                onClick={() => handleSaveCompletedSession(postFeeling, postNote)}
                className="px-6 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-contrast)] text-xs font-semibold shadow-xs transition-colors"
              >
                Save Walk
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------- */}
      {/* 8. MANUAL WALK ENTRY MODAL */}
      {/* --------------------------------------------------------- */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <form
            onSubmit={handleSaveManualWalk}
            className="w-full max-w-md p-6 rounded-2xl bg-[var(--bg-paper)] border border-[var(--border-color)] shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <div className="flex items-center gap-2">
                <Footprints className="w-5 h-5 text-[var(--accent)]" />
                <h3 className="font-serif-aesthetic text-lg font-bold text-[var(--text-primary)]">
                  Add Walk Session Manually
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-paper-hover)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  required
                  className="w-full text-xs p-2.5 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  value={manualTime}
                  onChange={(e) => setManualTime(e.target.value)}
                  required
                  className="w-full text-xs p-2.5 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Duration (Minutes)
                </label>
                <input
                  type="number"
                  value={manualMinutes}
                  onChange={(e) => setManualMinutes(e.target.value)}
                  min="0"
                  max="300"
                  required
                  className="w-full text-xs p-2.5 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Duration (Seconds)
                </label>
                <input
                  type="number"
                  value={manualSeconds}
                  onChange={(e) => setManualSeconds(e.target.value)}
                  min="0"
                  max="59"
                  className="w-full text-xs p-2.5 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
            </div>

            {/* Feeling Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                Feeling
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {FEELINGS.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setManualFeeling(f.key)}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${
                      manualFeeling === f.key
                        ? 'bg-[var(--accent)] text-[var(--accent-contrast)] border-[var(--accent)] shadow-xs'
                        : 'bg-[var(--bg-paper-subtle)] border-[var(--border-color)] hover:bg-[var(--bg-paper-hover)] text-[var(--text-primary)]'
                    }`}
                  >
                    <span className="text-xl">{f.emoji}</span>
                    <span className="text-[10px] font-medium leading-tight mt-0.5">{f.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Note */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                Note (optional)
              </label>
              <input
                type="text"
                value={manualNote}
                onChange={(e) => setManualNote(e.target.value)}
                placeholder="e.g. Morning neighborhood walk"
                className="w-full text-xs p-2.5 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-color)]">
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-paper-hover)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-contrast)] text-xs font-semibold shadow-xs"
              >
                Save Manual Walk
              </button>
            </div>
          </form>
        </div>
      )}

      {/* --------------------------------------------------------- */}
      {/* 9. CUSTOM TIMER DURATION MODAL */}
      {/* --------------------------------------------------------- */}
      {isCustomTimerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm p-5 rounded-2xl bg-[var(--bg-paper)] border border-[var(--border-color)] shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Set Custom Walk Duration
              </span>
              <button
                onClick={() => setIsCustomTimerOpen(false)}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">Minutes</label>
                <input
                  type="number"
                  value={customMinInput}
                  onChange={(e) => setCustomMinInput(e.target.value)}
                  min="0"
                  max="180"
                  className="w-full text-center text-lg font-bold p-2 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-[var(--text-primary)]"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">Seconds</label>
                <input
                  type="number"
                  value={customSecInput}
                  onChange={(e) => setCustomSecInput(e.target.value)}
                  min="0"
                  max="59"
                  className="w-full text-center text-lg font-bold p-2 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-[var(--text-primary)]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCustomTimerOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-paper-hover)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const m = parseInt(customMinInput, 10) || 0;
                  const s = parseInt(customSecInput, 10) || 0;
                  const totalMin = Math.max(1, m + s / 60);
                  setIsCustomTimerOpen(false);
                  handleStartTimer(totalMin);
                }}
                className="px-4 py-1.5 rounded-lg bg-[var(--accent)] text-[var(--accent-contrast)] text-xs font-semibold shadow-xs"
              >
                Start Timer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------- */}
      {/* 10. EDIT SESSION MODAL */}
      {/* --------------------------------------------------------- */}
      {editingSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <form
            onSubmit={handleUpdateSession}
            className="w-full max-w-md p-6 rounded-2xl bg-[var(--bg-paper)] border border-[var(--border-color)] shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <h3 className="font-serif-aesthetic text-lg font-bold text-[var(--text-primary)]">
                Edit Walk Session
              </h3>
              <button
                type="button"
                onClick={() => setEditingSession(null)}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Date</label>
                <input
                  type="date"
                  value={editingSession.date}
                  onChange={(e) => setEditingSession({ ...editingSession, date: e.target.value })}
                  required
                  className="w-full text-xs p-2.5 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-[var(--text-primary)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Duration (Seconds)</label>
                <input
                  type="number"
                  value={editingSession.duration_seconds}
                  onChange={(e) =>
                    setEditingSession({
                      ...editingSession,
                      duration_seconds: Math.max(1, parseInt(e.target.value, 10) || 1),
                    })
                  }
                  required
                  min="1"
                  className="w-full text-xs p-2.5 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-[var(--text-primary)]"
                />
              </div>
            </div>

            {/* Feeling Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[var(--text-secondary)]">Feeling</label>
              <div className="grid grid-cols-5 gap-1.5">
                {FEELINGS.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setEditingSession({ ...editingSession, feeling: f.key })}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${
                      editingSession.feeling === f.key
                        ? 'bg-[var(--accent)] text-[var(--accent-contrast)] border-[var(--accent)] shadow-xs'
                        : 'bg-[var(--bg-paper-subtle)] border-[var(--border-color)] hover:bg-[var(--bg-paper-hover)] text-[var(--text-primary)]'
                    }`}
                  >
                    <span className="text-xl">{f.emoji}</span>
                    <span className="text-[10px] font-medium leading-tight mt-0.5">{f.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Note */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[var(--text-secondary)]">Note</label>
              <input
                type="text"
                value={editingSession.note || ''}
                onChange={(e) => setEditingSession({ ...editingSession, note: e.target.value })}
                className="w-full text-xs p-2.5 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-[var(--text-primary)]"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-color)]">
              <button
                type="button"
                onClick={() => setEditingSession(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-paper-hover)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-contrast)] text-xs font-semibold shadow-xs"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
