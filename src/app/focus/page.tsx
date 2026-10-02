'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePlanner } from '@/lib/storage';
import { FocusSession, FocusCategory, FocusEnergyLevel, FocusDifficulty, ResearchPaper } from '@/lib/types';
import { generateId, formatDate, getTodayDateString } from '@/lib/utils';
import { 
  Target, 
  Play, 
  Pause, 
  RotateCcw, 
  CheckCircle2, 
  X, 
  Sparkles, 
  BookOpen, 
  Flame, 
  Star, 
  Trash2, 
  Clock, 
  Calendar, 
  Zap, 
  Brain, 
  Check, 
  Plus, 
  ChevronRight, 
  ArrowLeft,
  ExternalLink,
  Edit2,
  FileText,
  Lightbulb,
  BarChart3,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

const FOCUS_STORAGE_KEY = 'planora_active_focus_session';

const DEFAULT_CATEGORIES: FocusCategory[] = [
  'Research',
  'Study',
  'Coding',
  'Reading',
  'Writing',
  'Learning Sprint',
  'Planning',
  'Other',
];

export default function FocusSessionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { 
    focusSessions, 
    saveFocusSession, 
    updateFocusSession, 
    deleteFocusSession, 
    focusSaveStatus,
    researchPapers,
    updateResearchPaper,
    saveKnowledgeItem,
    learningSprints,
    goals
  } = usePlanner();

  // Navigation tab: 'session' | 'history' | 'analytics' | 'heatmap'
  const [activeTab, setActiveTab] = useState<'session' | 'history' | 'analytics' | 'heatmap'>('session');

  // Setup state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<FocusCategory>('Research');
  const [customCategory, setCustomCategory] = useState('');
  const [isCustomCategoryActive, setIsCustomCategoryActive] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState<number>(25);
  const [customDurationInput, setCustomDurationInput] = useState('25');
  const [isCustomDurationModalOpen, setIsCustomDurationModalOpen] = useState(false);
  
  // Relations
  const [relatedGoalId, setRelatedGoalId] = useState<string>(() => searchParams.get('goalId') || '');
  const [relatedPaperId, setRelatedPaperId] = useState<string>('');
  const [relatedSprintId, setRelatedSprintId] = useState<string>('');
  const [relatedSubject, setRelatedSubject] = useState<string>('');
  const [initialNotes, setInitialNotes] = useState<string>('');

  // Active session state
  const [sessionId, setSessionId] = useState<string>('');
  const [isSessionActive, setIsSessionActive] = useState<boolean>(false);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [isTimerPaused, setIsTimerPaused] = useState<boolean>(false);
  const [targetDurationSeconds, setTargetDurationSeconds] = useState<number>(1500);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [startedAtIso, setStartedAtIso] = useState<string>('');
  const [pausedAtEpoch, setPausedAtEpoch] = useState<number | null>(null);
  const [totalPausedMs, setTotalPausedMs] = useState<number>(0);
  const [distractionCount, setDistractionCount] = useState<number>(0);
  const [liveNotes, setLiveNotes] = useState<string>('');
  const [recoveryNotice, setRecoveryNotice] = useState<boolean>(false);

  // Reflection / End Modal
  const [isReflectionModalOpen, setIsReflectionModalOpen] = useState<boolean>(false);
  const [accomplishment, setAccomplishment] = useState<string>('');
  const [focusRating, setFocusRating] = useState<number>(5);
  const [energyLevel, setEnergyLevel] = useState<FocusEnergyLevel>('medium');
  const [difficulty, setDifficulty] = useState<FocusDifficulty>('moderate');
  const [reflectionNotes, setReflectionNotes] = useState<string>('');
  const [saveToVault, setSaveToVault] = useState<boolean>(false);
  const [updatePaperProgress, setUpdatePaperProgress] = useState<number | null>(null);

  // Edit History Modal
  const [editingSession, setEditingSession] = useState<FocusSession | null>(null);

  // 1. Read URL params for direct quick-start (e.g. from Research Paper page or Dashboard)
  useEffect(() => {
    const paperParam = searchParams.get('paperId');
    const catParam = searchParams.get('category');
    const titleParam = searchParams.get('title');
    const durParam = searchParams.get('duration');
    const sprintParam = searchParams.get('sprintId');

    if (paperParam) {
      setRelatedPaperId(paperParam);
      const paper = researchPapers.find(p => p.id === paperParam);
      if (paper && !title) {
        setTitle(`Reading: ${paper.title}`);
        setCategory('Reading');
      }
    }
    if (catParam) {
      setCategory(catParam);
    }
    if (titleParam) {
      setTitle(titleParam);
    }
    if (sprintParam) {
      setRelatedSprintId(sprintParam);
    }
    if (durParam) {
      const parsed = parseInt(durParam, 10);
      if (parsed > 0) setDurationMinutes(parsed);
    }
  }, [searchParams, researchPapers, title]);

  // 2. Recover active focus session from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(FOCUS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.sessionId && parsed.isSessionActive) {
          setSessionId(parsed.sessionId);
          setTitle(parsed.title || '');
          setCategory(parsed.category || 'Research');
          setTargetDurationSeconds(parsed.targetDurationSeconds || 1500);
          setStartedAtIso(parsed.startedAtIso || new Date().toISOString());
          setPausedAtEpoch(parsed.pausedAtEpoch || null);
          setTotalPausedMs(parsed.totalPausedMs || 0);
          setIsTimerPaused(Boolean(parsed.isTimerPaused));
          setDistractionCount(parsed.distractionCount || 0);
          setLiveNotes(parsed.liveNotes || '');
          setRelatedPaperId(parsed.relatedPaperId || '');
          setRelatedSprintId(parsed.relatedSprintId || '');
          setRelatedSubject(parsed.relatedSubject || '');
          setIsSessionActive(true);
          setIsTimerRunning(true);
          setRecoveryNotice(true);
        }
      }
    } catch (e) {
      console.error('Failed to recover active focus session:', e);
    }
  }, []);

  // 3. Persist active state to localStorage safety draft
  useEffect(() => {
    if (isSessionActive && sessionId) {
      const draft = {
        sessionId,
        title,
        category: isCustomCategoryActive ? customCategory : category,
        targetDurationSeconds,
        startedAtIso,
        pausedAtEpoch,
        totalPausedMs,
        isTimerPaused,
        isSessionActive,
        distractionCount,
        liveNotes,
        relatedPaperId,
        relatedSprintId,
        relatedSubject,
      };
      localStorage.setItem(FOCUS_STORAGE_KEY, JSON.stringify(draft));
    }
  }, [
    isSessionActive,
    sessionId,
    title,
    category,
    customCategory,
    isCustomCategoryActive,
    targetDurationSeconds,
    startedAtIso,
    pausedAtEpoch,
    totalPausedMs,
    isTimerPaused,
    distractionCount,
    liveNotes,
    relatedPaperId,
    relatedSprintId,
    relatedSubject
  ]);

  // 4. Accurate timestamp-based timer ticker
  useEffect(() => {
    if (!isSessionActive || !isTimerRunning || !startedAtIso) return;

    const interval = setInterval(() => {
      const startMs = new Date(startedAtIso).getTime();
      const nowMs = Date.now();

      let currentPausedMs = totalPausedMs;
      if (isTimerPaused && pausedAtEpoch) {
        currentPausedMs += (nowMs - pausedAtEpoch);
      }

      const activeMs = Math.max(0, nowMs - startMs - currentPausedMs);
      const seconds = Math.floor(activeMs / 1000);
      setElapsedSeconds(seconds);
    }, 250);

    return () => clearInterval(interval);
  }, [isSessionActive, isTimerRunning, startedAtIso, isTimerPaused, pausedAtEpoch, totalPausedMs]);

  // Start Focus Session
  const handleStartSession = () => {
    const finalTitle = title.trim() || `${isCustomCategoryActive ? customCategory || 'Custom' : category} Session`;
    const finalCategory = isCustomCategoryActive ? (customCategory.trim() || 'Other') : category;
    const targetSecs = durationMinutes * 60;
    const nowIso = new Date().toISOString();
    const newId = `focus-${generateId()}`;

    setSessionId(newId);
    setTitle(finalTitle);
    setCategory(finalCategory);
    setTargetDurationSeconds(targetSecs);
    setElapsedSeconds(0);
    setStartedAtIso(nowIso);
    setPausedAtEpoch(null);
    setTotalPausedMs(0);
    setIsTimerPaused(false);
    setIsTimerRunning(true);
    setIsSessionActive(true);
    setDistractionCount(0);
    setLiveNotes(initialNotes);
    setRecoveryNotice(false);
  };

  // Pause Timer
  const handlePause = () => {
    if (!isTimerPaused) {
      setIsTimerPaused(true);
      setPausedAtEpoch(Date.now());
    }
  };

  // Resume Timer
  const handleResume = () => {
    if (isTimerPaused && pausedAtEpoch) {
      const pausedDuration = Date.now() - pausedAtEpoch;
      setTotalPausedMs(prev => prev + pausedDuration);
      setPausedAtEpoch(null);
      setIsTimerPaused(false);
    }
  };

  // Cancel Session
  const handleCancelSession = () => {
    if (window.confirm('Cancel this focus session? Current elapsed time will not be recorded.')) {
      setIsSessionActive(false);
      setIsTimerRunning(false);
      setIsTimerPaused(false);
      localStorage.removeItem(FOCUS_STORAGE_KEY);
      setRecoveryNotice(false);
    }
  };

  // Finish Early / End Session Trigger
  const handlePromptEnd = () => {
    handlePause();
    setAccomplishment('');
    setReflectionNotes(liveNotes);
    setIsReflectionModalOpen(true);
  };

  // Complete and Save to Supabase
  const handleCompleteSession = async () => {
    const now = new Date().toISOString();
    const finalCat = isCustomCategoryActive ? (customCategory.trim() || 'Other') : category;

    const sessionRecord: FocusSession = {
      id: sessionId || `focus-${generateId()}`,
      title: title.trim() || 'Focus Session',
      category: finalCat,
      related_goal_id: relatedGoalId || undefined,
      related_paper_id: relatedPaperId || undefined,
      related_sprint_id: relatedSprintId || undefined,
      related_subject_id: relatedSubject || undefined,
      target_duration_seconds: targetDurationSeconds,
      actual_duration_seconds: Math.max(elapsedSeconds, 1),
      started_at: startedAtIso || now,
      ended_at: now,
      distraction_count: distractionCount,
      focus_rating: focusRating,
      energy_level: energyLevel,
      difficulty: difficulty,
      accomplishment: accomplishment.trim(),
      notes: (reflectionNotes || liveNotes).trim(),
      is_favorite: false,
      created_at: startedAtIso || now,
      updated_at: now,
    };

    try {
      await saveFocusSession(sessionRecord);

      // Optional: Save accomplishment as note in Knowledge Vault
      if (saveToVault && accomplishment.trim()) {
        await saveKnowledgeItem({
          id: `know-${generateId()}`,
          title: `Focus Accomplishment: ${sessionRecord.title}`,
          type: 'note',
          category: finalCat,
          summary: accomplishment.trim(),
          content: `<p><strong>Focus Session:</strong> ${sessionRecord.title}</p><p><strong>Duration:</strong> ${Math.round(sessionRecord.actual_duration_seconds / 60)} minutes (Rating: ${focusRating}/5)</p><p><strong>Accomplishment:</strong></p><blockquote>${accomplishment.trim()}</blockquote>${reflectionNotes ? `<p><strong>Notes:</strong></p><p>${reflectionNotes}</p>` : ''}`,
          tags: ['focus-session', finalCat.toLowerCase()],
          is_favorite: false,
          sources: [],
          key_points: [accomplishment.trim()],
          created_at: now,
          updated_at: now,
        });
      }

      // Optional: Update reading progress on related research paper
      if (relatedPaperId && updatePaperProgress !== null) {
        await updateResearchPaper(relatedPaperId, {
          reading_progress: updatePaperProgress,
          status: updatePaperProgress >= 100 ? 'finished' : 'reading',
        });
      }

      // Clean up active session
      localStorage.removeItem(FOCUS_STORAGE_KEY);
      setIsSessionActive(false);
      setIsTimerRunning(false);
      setIsReflectionModalOpen(false);
      setRecoveryNotice(false);
      setActiveTab('history');
    } catch (e) {
      console.error('Failed to complete focus session:', e);
      alert('Save temporarily queued locally due to network state. Your session is safe!');
      setIsSessionActive(false);
      setIsReflectionModalOpen(false);
    }
  };

  // Time calculations
  const remainingSeconds = Math.max(0, targetDurationSeconds - elapsedSeconds);
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Analytics Calculations
  const stats = useMemo(() => {
    const todayStr = getTodayDateString();
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let todaySeconds = 0;
    let weekSeconds = 0;
    let monthSeconds = 0;
    let totalSeconds = 0;
    let totalRating = 0;
    const categoryCounts: Record<string, number> = {};
    const hourCounts: Record<number, number> = {};

    focusSessions.forEach(s => {
      const sDate = new Date(s.started_at);
      const sDateStr = s.started_at.split('T')[0];
      const dur = s.actual_duration_seconds || 0;
      totalSeconds += dur;
      totalRating += (s.focus_rating || 5);

      // Today
      if (sDateStr === todayStr) {
        todaySeconds += dur;
      }
      // Week
      if (sDate >= startOfWeek) {
        weekSeconds += dur;
      }
      // Month
      if (sDate >= startOfMonth) {
        monthSeconds += dur;
      }

      // Category count
      const cat = s.category || 'Other';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

      // Productive hour
      const hour = sDate.getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + dur;
    });

    const totalSessions = focusSessions.length;
    const avgDurationMins = totalSessions > 0 ? Math.round((totalSeconds / totalSessions) / 60) : 0;
    const avgRating = totalSessions > 0 ? (totalRating / totalSessions).toFixed(1) : '5.0';

    // Most used category
    let topCategory = 'None';
    let topCatCount = 0;
    Object.entries(categoryCounts).forEach(([cat, cnt]) => {
      if (cnt > topCatCount) {
        topCatCount = cnt;
        topCategory = cat;
      }
    });

    // Most productive hour
    let topHour = 10;
    let topHourSecs = 0;
    Object.entries(hourCounts).forEach(([h, secs]) => {
      if (secs > topHourSecs) {
        topHourSecs = secs;
        topHour = parseInt(h, 10);
      }
    });

    return {
      todayMinutes: Math.round(todaySeconds / 60),
      weekMinutes: Math.round(weekSeconds / 60),
      monthMinutes: Math.round(monthSeconds / 60),
      totalSessions,
      avgDurationMins,
      avgRating,
      topCategory,
      topHourStr: `${topHour % 12 || 12}:00 ${topHour >= 12 ? 'PM' : 'AM'}`,
    };
  }, [focusSessions]);

  // Heatmap Aggregation (Days 1..31 vs Hours 0..23)
  const heatmapData = useMemo(() => {
    const matrix: number[][] = Array.from({ length: 24 }, () => Array(31).fill(0));
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    focusSessions.forEach(s => {
      const d = new Date(s.started_at);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        const day = d.getDate() - 1; // 0..30
        const hour = d.getHours(); // 0..23
        if (day >= 0 && day < 31 && hour >= 0 && hour < 24) {
          matrix[hour][day] += Math.round((s.actual_duration_seconds || 0) / 60);
        }
      }
    });

    return matrix;
  }, [focusSessions]);

  return (
    <div className="space-y-6 pb-20 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="journal-paper p-6 sm:p-8 border-2 border-[var(--border-strong)] relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40">
                <Target className="w-4 h-4" />
              </span>
              <span className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                Deep Work Sanctuary
              </span>
            </div>
            <h1 className="font-serif-aesthetic text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
              Focus Sessions
            </h1>
            <p className="font-serif-aesthetic italic text-xs sm:text-sm text-[var(--text-secondary)]">
              &ldquo;Protect your attention and track deep work with clarity.&rdquo;
            </p>
          </div>

          {/* Quick Tab Switcher */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] self-start md:self-auto">
            <button
              onClick={() => setActiveTab('session')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'session'
                  ? 'bg-[var(--accent)] text-[var(--accent-contrast)] shadow-2xs font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Active Studio
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'history'
                  ? 'bg-[var(--accent)] text-[var(--accent-contrast)] shadow-2xs font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              History ({focusSessions.length})
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'analytics'
                  ? 'bg-[var(--accent)] text-[var(--accent-contrast)] shadow-2xs font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Analytics
            </button>
            <button
              onClick={() => setActiveTab('heatmap')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'heatmap'
                  ? 'bg-[var(--accent)] text-[var(--accent-contrast)] shadow-2xs font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Pattern
            </button>
          </div>
        </div>
      </div>

      {/* Recovery Notice */}
      {recoveryNotice && isSessionActive && (
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Recovered your active Focus Session from previous session.</span>
          </div>
          <button 
            onClick={() => setRecoveryNotice(false)}
            className="text-[11px] underline opacity-80 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* TAB 1: ACTIVE STUDIO / SETUP */}
      {activeTab === 'session' && (
        <div className="space-y-6">
          {!isSessionActive ? (
            /* SETUP CARD */
            <div className="journal-paper p-6 sm:p-8 space-y-6 border border-[var(--border-color)]">
              <div className="border-b border-[var(--border-color)] pb-4">
                <h2 className="font-serif-aesthetic text-lg font-bold text-[var(--text-primary)]">
                  Configure Your Focus Session
                </h2>
                <p className="text-xs text-[var(--text-secondary)]">
                  Set a clear intention and duration before diving in.
                </p>
              </div>

              {/* Title Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  Session Intention / Title
                </label>
                <input
                  type="text"
                  placeholder="e.g., Read 3 papers on agricultural finance, or implement attention layer..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              {/* Category Chips */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  Focus Category
                </label>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setCategory(cat);
                        setIsCustomCategoryActive(false);
                      }}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                        !isCustomCategoryActive && category === cat
                          ? 'bg-[var(--accent)] text-[var(--accent-contrast)] shadow-2xs'
                          : 'bg-[var(--bg-paper-subtle)] hover:bg-[var(--bg-paper-hover)] text-[var(--text-secondary)] border border-[var(--border-color)]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => setIsCustomCategoryActive(true)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                      isCustomCategoryActive
                        ? 'bg-[var(--accent)] text-[var(--accent-contrast)] shadow-2xs'
                        : 'bg-[var(--bg-paper-subtle)] hover:bg-[var(--bg-paper-hover)] text-[var(--text-secondary)] border border-[var(--border-color)]'
                    }`}
                  >
                    + Custom Category
                  </button>
                </div>

                {isCustomCategoryActive && (
                  <input
                    type="text"
                    placeholder="Enter custom category name..."
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="w-full max-w-sm mt-2 px-3 py-1.5 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                )}
              </div>

              {/* Duration Presets */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  Session Duration
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {[25, 45, 60, 90].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setDurationMinutes(mins)}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                        durationMinutes === mins
                          ? 'bg-[var(--accent)] text-[var(--accent-contrast)] shadow-2xs'
                          : 'bg-[var(--bg-paper-subtle)] hover:bg-[var(--bg-paper-hover)] text-[var(--text-secondary)] border border-[var(--border-color)]'
                      }`}
                    >
                      {mins} min
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => setIsCustomDurationModalOpen(true)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                      ![25, 45, 60, 90].includes(durationMinutes)
                        ? 'bg-[var(--accent)] text-[var(--accent-contrast)] shadow-2xs'
                        : 'bg-[var(--bg-paper-subtle)] hover:bg-[var(--bg-paper-hover)] text-[var(--text-secondary)] border border-[var(--border-color)]'
                    }`}
                  >
                    Custom ({durationMinutes}m)
                  </button>
                </div>
              </div>

              {/* Optional Links: Related Goal, Paper & Sprint */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                {/* Related Goal */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1">
                    <Target className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Link Goal (Optional)</span>
                  </label>
                  <select
                    value={relatedGoalId}
                    onChange={(e) => setRelatedGoalId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  >
                    <option value="">-- None --</option>
                    {(goals || []).filter(g => !g.is_trash).map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.title} ({g.progress}%)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Related Paper */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-[var(--accent)]" />
                    <span>Link Paper (Optional)</span>
                  </label>
                  <select
                    value={relatedPaperId}
                    onChange={(e) => setRelatedPaperId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  >
                    <option value="">-- None --</option>
                    {researchPapers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({p.status.replace('_', ' ')})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Related Learning Sprint */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                    <span>Link Sprint (Optional)</span>
                  </label>
                  <select
                    value={relatedSprintId}
                    onChange={(e) => setRelatedSprintId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  >
                    <option value="">-- None --</option>
                    {learningSprints.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.topic} ({s.category})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Starter Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  Notes Before Starting (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Any immediate questions, reminders, or constraints..."
                  value={initialNotes}
                  onChange={(e) => setInitialNotes(e.target.value)}
                  className="w-full p-3 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] resize-none"
                />
              </div>

              {/* Launch CTA */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleStartSession}
                  className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-contrast)] text-sm font-semibold shadow-md hover:scale-[1.01] active:scale-98 transition-all flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start Focus Session ({durationMinutes} min)</span>
                </button>
              </div>
            </div>
          ) : (
            /* ACTIVE FOCUSED WORKSPACE */
            <div className="space-y-6">
              {/* Giant Serene Timer Display */}
              <div className="journal-paper p-6 sm:p-10 border-2 border-[var(--border-strong)] text-center space-y-6 relative overflow-hidden bg-gradient-to-b from-[var(--bg-paper)] to-[var(--bg-paper-subtle)]">
                <div className="space-y-1 max-w-xl mx-auto">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/30">
                    <Target className="w-3 h-3" />
                    <span>{category}</span>
                  </span>
                  <h2 className="font-serif-aesthetic text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mt-2">
                    &ldquo;{title}&rdquo;
                  </h2>
                </div>

                {/* Circular / Large Clock */}
                <div className="py-4">
                  <div className="font-mono text-5xl sm:text-7xl font-bold tracking-tight text-[var(--text-primary)]">
                    {formatTime(remainingSeconds)}
                  </div>
                  <div className="text-xs text-[var(--text-muted)] mt-2 flex items-center justify-center gap-4">
                    <span>Target: {Math.round(targetDurationSeconds / 60)}m</span>
                    <span>•</span>
                    <span>Elapsed: {formatTime(elapsedSeconds)}</span>
                    <span>•</span>
                    <span className={isTimerPaused ? 'text-amber-600 font-semibold' : 'text-emerald-600 font-semibold'}>
                      {isTimerPaused ? 'Paused' : 'Active Flow'}
                    </span>
                  </div>
                </div>

                {/* Controls Bar */}
                <div className="flex flex-wrap items-center justify-center gap-3">
                  {isTimerPaused ? (
                    <button
                      onClick={handleResume}
                      className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>Resume Timer</span>
                    </button>
                  ) : (
                    <button
                      onClick={handlePause}
                      className="px-6 py-2.5 rounded-xl bg-[var(--bg-paper)] hover:bg-[var(--bg-paper-hover)] border border-[var(--border-strong)] text-[var(--text-primary)] text-xs font-semibold flex items-center gap-1.5 transition-all"
                    >
                      <Pause className="w-4 h-4" />
                      <span>Pause</span>
                    </button>
                  )}

                  {/* Distraction Counter Button */}
                  <button
                    onClick={() => setDistractionCount(prev => prev + 1)}
                    className="px-4 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-950/80 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-semibold flex items-center gap-1.5 transition-all"
                    title="Click whenever you get distracted to log it gently"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-600" />
                    <span>Distractions: {distractionCount}</span>
                  </button>

                  {/* Finish Early Button */}
                  <button
                    onClick={handlePromptEnd}
                    className="px-6 py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-contrast)] text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Finish Session</span>
                  </button>

                  {/* Cancel Button */}
                  <button
                    onClick={handleCancelSession}
                    className="px-4 py-2.5 rounded-xl text-[var(--text-muted)] hover:text-red-600 text-xs font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>

              {/* In-Session Scratchpad & Research Notes */}
              <div className="journal-paper p-5 sm:p-6 border border-[var(--border-color)] space-y-3">
                <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-[var(--accent)]" />
                    <h3 className="font-serif-aesthetic font-bold text-base text-[var(--text-primary)]">
                      Focus Notes & Sudden Thoughts
                    </h3>
                  </div>
                  <span className="text-[11px] text-[var(--text-muted)]">
                    Auto-saved locally
                  </span>
                </div>

                <textarea
                  rows={6}
                  value={liveNotes}
                  onChange={(e) => setLiveNotes(e.target.value)}
                  placeholder="Capture quick realizations, formulas, quotes, or thoughts while deep in your flow..."
                  className="w-full p-4 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] resize-none"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: FOCUS HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif-aesthetic text-lg font-bold text-[var(--text-primary)]">
              Focus History ({focusSessions.length})
            </h2>
            <button
              onClick={() => setActiveTab('session')}
              className="px-3 py-1.5 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] text-xs font-medium"
            >
              + New Session
            </button>
          </div>

          <div className="space-y-2.5">
            {focusSessions.map((s) => (
              <div
                key={s.id}
                className="journal-paper p-4 border border-[var(--border-color)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[var(--border-strong)] transition-all group"
              >
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-[var(--accent-soft)] text-[var(--accent)]">
                      {s.category}
                    </span>
                    <span className="text-[11px] text-[var(--text-muted)]">
                      {formatDate(s.started_at, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-[11px] text-[var(--text-muted)]">•</span>
                    <span className="text-[11px] font-semibold text-[var(--text-primary)]">
                      {Math.round(s.actual_duration_seconds / 60)} min
                    </span>
                    {s.distraction_count > 0 && (
                      <span className="text-[10px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950 px-1.5 py-0.2 rounded">
                        {s.distraction_count} distractions
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    {s.title}
                  </h3>

                  {s.accomplishment && (
                    <p className="text-xs text-[var(--text-secondary)] italic line-clamp-2">
                      &ldquo;{s.accomplishment}&rdquo;
                    </p>
                  )}
                </div>

                {/* Right Meta & Actions */}
                <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                  <div className="flex items-center gap-0.5 text-amber-500">
                    {Array.from({ length: s.focus_rating || 5 }).map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-current" />
                    ))}
                  </div>

                  <button
                    onClick={() => setEditingSession(s)}
                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-paper-hover)] transition-colors"
                    title="Edit Session"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={async () => {
                      if (window.confirm('Delete this focus session? This action is permanent.')) {
                        await deleteFocusSession(s.id);
                      }
                    }}
                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-600 hover:bg-[var(--bg-paper-hover)] transition-colors"
                    title="Delete Session"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {focusSessions.length === 0 && (
              <div className="journal-paper p-10 text-center text-xs text-[var(--text-muted)] italic border border-[var(--border-color)]">
                No focus sessions logged yet. Launch a session to start tracking deep work!
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: FOCUS ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="journal-paper p-4 border border-[var(--border-color)] space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Today&apos;s Focus
              </span>
              <div className="text-2xl font-bold font-serif-aesthetic text-[var(--accent)]">
                {stats.todayMinutes} <span className="text-xs font-sans font-normal text-[var(--text-secondary)]">min</span>
              </div>
            </div>

            <div className="journal-paper p-4 border border-[var(--border-color)] space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                This Week
              </span>
              <div className="text-2xl font-bold font-serif-aesthetic text-[var(--text-primary)]">
                {stats.weekMinutes} <span className="text-xs font-sans font-normal text-[var(--text-secondary)]">min</span>
              </div>
            </div>

            <div className="journal-paper p-4 border border-[var(--border-color)] space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                This Month
              </span>
              <div className="text-2xl font-bold font-serif-aesthetic text-[var(--text-primary)]">
                {stats.monthMinutes} <span className="text-xs font-sans font-normal text-[var(--text-secondary)]">min</span>
              </div>
            </div>

            <div className="journal-paper p-4 border border-[var(--border-color)] space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Total Sessions
              </span>
              <div className="text-2xl font-bold font-serif-aesthetic text-[var(--text-primary)]">
                {stats.totalSessions}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="journal-paper p-5 border border-[var(--border-color)] space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Avg Session Length
              </span>
              <div className="text-xl font-bold text-[var(--text-primary)]">
                {stats.avgDurationMins} minutes
              </div>
            </div>

            <div className="journal-paper p-5 border border-[var(--border-color)] space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Avg Focus Rating
              </span>
              <div className="text-xl font-bold text-amber-600 flex items-center gap-1">
                <span>{stats.avgRating} / 5.0</span>
                <Star className="w-4 h-4 fill-current" />
              </div>
            </div>

            <div className="journal-paper p-5 border border-[var(--border-color)] space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Most Used Category
              </span>
              <div className="text-xl font-bold text-[var(--accent)] truncate">
                {stats.topCategory}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: MONTHLY FOCUS PATTERN HEATMAP */}
      {activeTab === 'heatmap' && (
        <div className="journal-paper p-6 sm:p-8 border border-[var(--border-color)] space-y-4 overflow-x-auto">
          <div>
            <h2 className="font-serif-aesthetic text-lg font-bold text-[var(--text-primary)]">
              Monthly Focus Pattern
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Focus duration distribution by hour of day for the current month.
            </p>
          </div>

          <div className="min-w-[640px] pt-2">
            {/* Days header */}
            <div className="grid grid-cols-[40px_repeat(31,1fr)] gap-1 text-[9px] text-[var(--text-muted)] font-mono text-center pb-1">
              <div></div>
              {Array.from({ length: 31 }).map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>

            {/* Hours rows */}
            <div className="space-y-1">
              {heatmapData.map((hourRow, hourIdx) => {
                if (hourIdx % 3 !== 0 && hourIdx !== 23) return null; // Show every 3rd hour for elegance
                return (
                  <div key={hourIdx} className="grid grid-cols-[40px_repeat(31,1fr)] gap-1 items-center">
                    <div className="text-[9px] font-mono text-[var(--text-muted)] text-right pr-2">
                      {hourIdx.toString().padStart(2, '0')}:00
                    </div>
                    {hourRow.map((mins, dayIdx) => {
                      let bgClass = 'bg-[var(--bg-paper-subtle)]';
                      if (mins > 0 && mins <= 15) bgClass = 'bg-[var(--accent)]/30';
                      else if (mins > 15 && mins <= 30) bgClass = 'bg-[var(--accent)]/60';
                      else if (mins > 30) bgClass = 'bg-[var(--accent)] text-white';

                      return (
                        <div
                          key={dayIdx}
                          title={`Day ${dayIdx + 1}, ${hourIdx}:00 - ${mins} minutes`}
                          className={`h-4 rounded-xs border border-[var(--border-color)] transition-transform hover:scale-125 ${bgClass}`}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: SESSION COMPLETION REFLECTION */}
      {isReflectionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-lg journal-paper p-6 sm:p-8 space-y-5 border border-[var(--border-strong)] shadow-2xl animate-in zoom-in-95">
            <div className="border-b border-[var(--border-color)] pb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]">
                Session Complete
              </span>
              <h3 className="font-serif-aesthetic text-xl font-bold text-[var(--text-primary)]">
                How did this session go?
              </h3>
            </div>

            {/* Accomplishment */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                What did you accomplish?
              </label>
              <textarea
                rows={2}
                placeholder="e.g., Finished methodology section and reviewed 2 papers."
                value={accomplishment}
                onChange={(e) => setAccomplishment(e.target.value)}
                className="w-full p-3 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] resize-none"
              />
            </div>

            {/* Focus Quality Rating (1..5) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Focus Quality Rating: {focusRating} / 5
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFocusRating(star)}
                    className="p-1.5 rounded-lg hover:scale-110 transition-transform"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        star <= focusRating ? 'text-amber-500 fill-amber-500' : 'text-zinc-300 dark:text-zinc-700'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Energy & Difficulty */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[var(--text-secondary)]">
                  Energy Level
                </label>
                <select
                  value={energyLevel}
                  onChange={(e) => setEnergyLevel(e.target.value as FocusEnergyLevel)}
                  className="w-full px-3 py-1.5 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[var(--text-secondary)]">
                  Session Difficulty
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as FocusDifficulty)}
                  className="w-full px-3 py-1.5 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none"
                >
                  <option value="easy">Easy</option>
                  <option value="moderate">Moderate</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>

            {/* Related Paper Progress Option */}
            {relatedPaperId && (
              <div className="space-y-1.5 p-3 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)]">
                <label className="text-xs font-medium text-[var(--text-primary)] flex items-center justify-between">
                  <span>Update Linked Paper Reading Progress:</span>
                  <span className="font-bold text-[var(--accent)]">{updatePaperProgress ?? 50}%</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={updatePaperProgress ?? 50}
                  onChange={(e) => setUpdatePaperProgress(parseInt(e.target.value, 10))}
                  className="w-full accent-[var(--accent)]"
                />
              </div>
            )}

            {/* Save to Knowledge Vault Checkbox */}
            <label className="flex items-center gap-2 text-xs text-[var(--text-primary)] cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={saveToVault}
                onChange={(e) => setSaveToVault(e.target.checked)}
                className="rounded accent-[var(--accent)]"
              />
              <span>Save this accomplishment directly into Knowledge Vault</span>
            </label>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
              <button
                type="button"
                onClick={() => setIsReflectionModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-paper-hover)]"
              >
                Back to Session
              </button>
              <button
                type="button"
                onClick={handleCompleteSession}
                className="px-6 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-contrast)] text-xs font-semibold shadow-xs"
              >
                Complete & Save Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CUSTOM DURATION */}
      {isCustomDurationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-sm journal-paper p-6 space-y-4 border border-[var(--border-strong)] shadow-2xl">
            <h3 className="font-serif-aesthetic text-base font-bold text-[var(--text-primary)]">
              Set Custom Duration (Minutes)
            </h3>
            <input
              type="number"
              min={1}
              max={360}
              value={customDurationInput}
              onChange={(e) => setCustomDurationInput(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCustomDurationModalOpen(false)}
                className="px-3 py-1.5 rounded-xl text-xs font-medium text-[var(--text-secondary)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const val = parseInt(customDurationInput, 10);
                  if (val > 0) setDurationMinutes(val);
                  setIsCustomDurationModalOpen(false);
                }}
                className="px-4 py-1.5 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] text-xs font-semibold"
              >
                Set
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT SESSION MODAL */}
      {editingSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-lg journal-paper p-6 space-y-4 border border-[var(--border-strong)] shadow-2xl">
            <h3 className="font-serif-aesthetic text-base font-bold text-[var(--text-primary)]">
              Edit Focus Session
            </h3>

            <div className="space-y-1">
              <label className="text-xs text-[var(--text-secondary)]">Title</label>
              <input
                type="text"
                value={editingSession.title}
                onChange={(e) => setEditingSession({ ...editingSession, title: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-[var(--text-secondary)]">Accomplishment</label>
              <textarea
                rows={2}
                value={editingSession.accomplishment || ''}
                onChange={(e) => setEditingSession({ ...editingSession, accomplishment: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingSession(null)}
                className="px-3 py-1.5 rounded-xl text-xs font-medium text-[var(--text-secondary)]"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await updateFocusSession(editingSession.id, {
                    title: editingSession.title,
                    accomplishment: editingSession.accomplishment,
                  });
                  setEditingSession(null);
                }}
                className="px-4 py-1.5 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] text-xs font-semibold"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
