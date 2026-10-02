'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { usePlanner } from '@/lib/storage';
import { 
  WeeklyReview, 
  WeeklyReflection, 
  NextWeekPlanning, 
  ChecklistBlockContent, 
  HabitBlockContent, 
  StudyLogBlockContent,
  FocusSession,
  WalkSession,
  LearningSprint,
  ResearchPaper,
  Goal
} from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { 
  Compass, 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  Clock, 
  Footprints, 
  GraduationCap, 
  Flame, 
  Lightbulb, 
  FileText, 
  Target, 
  Sparkles, 
  Save, 
  History, 
  Star, 
  BatteryMedium, 
  Zap, 
  AlertCircle,
  Check,
  TrendingUp,
  Award,
  BookOpen,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

// Utility to get Monday of a date
function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDateKey(d: Date): string {
  return d.toISOString().split('T')[0];
}

export default function WeeklyReviewPage() {
  const {
    weeklyReviews,
    saveWeeklyReview,
    reviewSaveStatus,
    pages,
    storage,
    focusSessions,
    walkSessions,
    learningSprints,
    researchPapers,
    goals,
    goalMilestones,
    goalTasks,
  } = usePlanner();

  // Current selected Monday
  const [selectedMonday, setSelectedMonday] = useState<Date>(() => getMonday(new Date()));
  const [blocksData, setBlocksData] = useState<any[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Derive Week Start & End (Monday -> Sunday)
  const weekSunday = useMemo(() => addDays(selectedMonday, 6), [selectedMonday]);
  const weekStartKey = useMemo(() => formatDateKey(selectedMonday), [selectedMonday]);
  const weekEndKey = useMemo(() => formatDateKey(weekSunday), [weekSunday]);

  // Form State
  const [reflection, setReflection] = useState<WeeklyReflection>({
    what_went_well: '',
    what_was_difficult: '',
    what_proud_of: '',
    what_learned: '',
    what_distracted_me: '',
    what_to_improve: '',
    what_to_stop: '',
    what_to_continue: '',
    biggest_win: '',
    notes: '',
  });

  const [nextWeek, setNextWeek] = useState<NextWeekPlanning>({
    priority_1: '',
    priority_2: '',
    priority_3: '',
    deadlines: '',
    reminders: '',
    personal_goal: '',
    work_goal: '',
    health_goal: '',
  });

  const [ratingOverall, setRatingOverall] = useState<number>(0);
  const [ratingEnergy, setRatingEnergy] = useState<'low' | 'medium' | 'high'>('medium');
  const [ratingProductivity, setRatingProductivity] = useState<number>(0);
  const [ratingStress, setRatingStress] = useState<number>(0);
  const [status, setStatus] = useState<'draft' | 'completed'>('draft');
  const [isDirty, setIsDirty] = useState<boolean>(false);

  // Load blocks for pages created or active in this week
  useEffect(() => {
    let mounted = true;
    async function loadPageBlocks() {
      const activePages = pages.filter(p => !p.is_deleted);
      const allLoadedBlocks: any[] = [];
      for (const p of activePages) {
        try {
          const blocks = await storage.getBlocksByPageId(p.id);
          allLoadedBlocks.push(...blocks.map(b => ({ ...b, page_title: p.title, page_type: p.page_type, page_date: p.date })));
        } catch {}
      }
      if (mounted) {
        setBlocksData(allLoadedBlocks);
      }
    }
    loadPageBlocks();
    return () => { mounted = false; };
  }, [pages, storage]);

  // Load existing review for the selected week
  useEffect(() => {
    const existing = weeklyReviews.find(r => r.week_start_date === weekStartKey || r.week_start === weekStartKey);
    if (existing) {
      setReflection({
        what_went_well: existing.reflection?.what_went_well || '',
        what_was_difficult: existing.reflection?.what_was_difficult || '',
        what_proud_of: existing.reflection?.what_proud_of || '',
        what_learned: existing.reflection?.what_learned || '',
        what_distracted_me: existing.reflection?.what_distracted_me || '',
        what_to_improve: existing.reflection?.what_to_improve || '',
        what_to_stop: existing.reflection?.what_to_stop || '',
        what_to_continue: existing.reflection?.what_to_continue || '',
        biggest_win: existing.reflection?.biggest_win || '',
        notes: existing.reflection?.notes || existing.notes || '',
      });
      const nw = existing.next_week || existing.next_week_planning || {};
      setNextWeek({
        priority_1: nw.priority_1 || (nw.priorities && nw.priorities[0]) || '',
        priority_2: nw.priority_2 || (nw.priorities && nw.priorities[1]) || '',
        priority_3: nw.priority_3 || (nw.priorities && nw.priorities[2]) || '',
        deadlines: nw.deadlines || '',
        reminders: nw.reminders || nw.remember_items || '',
        personal_goal: nw.personal_goal || '',
        work_goal: nw.work_goal || '',
        health_goal: nw.health_goal || '',
      });
      setRatingOverall(existing.rating_overall || existing.overall_rating || 0);
      setRatingEnergy((existing.rating_energy || existing.energy_rating || 'medium') as any);
      setRatingProductivity(existing.rating_productivity || existing.productivity_rating || 0);
      setRatingStress(existing.rating_stress || existing.stress_rating || 0);
      setStatus(existing.status || 'draft');
    } else {
      setReflection({
        what_went_well: '',
        what_was_difficult: '',
        what_proud_of: '',
        what_learned: '',
        what_distracted_me: '',
        what_to_improve: '',
        what_to_stop: '',
        what_to_continue: '',
        biggest_win: '',
        notes: '',
      });
      setNextWeek({
        priority_1: '',
        priority_2: '',
        priority_3: '',
        deadlines: '',
        reminders: '',
        personal_goal: '',
        work_goal: '',
        health_goal: '',
      });
      setRatingOverall(0);
      setRatingEnergy('medium');
      setRatingProductivity(0);
      setRatingStress(0);
      setStatus('draft');
    }
    setIsDirty(false);
  }, [weekStartKey, weeklyReviews]);

  // Aggregate Real Weekly Stats
  const weeklyStats = useMemo(() => {
    const startMs = selectedMonday.getTime();
    const endMs = addDays(weekSunday, 1).getTime() - 1;

    // Focus Sessions
    const weekFocus = (focusSessions || []).filter(fs => {
      const t = new Date(fs.started_at).getTime();
      return t >= startMs && t <= endMs;
    });
    const focusTotalSeconds = weekFocus.reduce((acc, fs) => acc + (fs.actual_duration_seconds || 0), 0);
    const focusCategories: Record<string, number> = {};
    weekFocus.forEach(fs => {
      const cat = fs.category || 'General';
      focusCategories[cat] = (focusCategories[cat] || 0) + (fs.actual_duration_seconds || 0);
    });
    const topFocusCategory = Object.entries(focusCategories).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    // Walk Sessions
    const weekWalks = (walkSessions || []).filter(w => {
      const dateStr = w.date || (w.started_at ? w.started_at.split('T')[0] : '');
      return dateStr >= weekStartKey && dateStr <= weekEndKey;
    });
    const walkTotalMinutes = weekWalks.reduce((acc, w) => acc + Math.round((w.duration_seconds || 0) / 60), 0);
    const activeWalkDays = new Set(weekWalks.map(w => w.date || w.started_at.split('T')[0])).size;

    // Learning Sprints
    const weekSprints = (learningSprints || []).filter(s => {
      const t = new Date(s.created_at).getTime();
      return t >= startMs && t <= endMs;
    });
    const sprintTotalMinutes = weekSprints.reduce((acc, s) => acc + Math.round((s.actual_duration_seconds || s.target_duration_seconds || 900) / 60), 0);

    // Research Papers
    const weekPapers = (researchPapers || []).filter(p => {
      const t = new Date(p.created_at).getTime();
      return t >= startMs && t <= endMs;
    });
    const papersFinished = weekPapers.filter(p => p.status === 'finished').length;
    const papersReading = (researchPapers || []).filter(p => p.status === 'reading').length;

    // Checklist Tasks from page blocks
    let tasksCompleted = 0;
    let tasksPending = 0;
    blocksData.forEach(b => {
      if (b.type === 'checklist' && b.content?.items) {
        const pageDate = b.page_date;
        if (!pageDate || (pageDate >= weekStartKey && pageDate <= weekEndKey)) {
          (b.content as ChecklistBlockContent).items.forEach(item => {
            if (item.completed) tasksCompleted++;
            else tasksPending++;
          });
        }
      }
    });

    // Goal Tasks
    const completedGoalTasks = (goalTasks || []).filter(t => t.is_completed).length;
    const pendingGoalTasks = (goalTasks || []).filter(t => !t.is_completed).length;

    // Habit completion
    let habitTotalChecks = 0;
    let habitPossibleChecks = 0;
    blocksData.forEach(b => {
      if (b.type === 'habit_matrix' && b.content?.habits) {
        const content = b.content as HabitBlockContent;
        content.habits.forEach(h => {
          if (h.completedDates) {
            Object.entries(h.completedDates).forEach(([dateStr, checked]) => {
              if (dateStr >= weekStartKey && dateStr <= weekEndKey) {
                habitPossibleChecks++;
                if (checked) habitTotalChecks++;
              }
            });
          }
        });
      }
    });
    const habitPercent = habitPossibleChecks > 0 ? Math.round((habitTotalChecks / habitPossibleChecks) * 100) : null;

    // Study Sessions
    let studyMinutes = 0;
    const studySubjects = new Set<string>();
    blocksData.forEach(b => {
      if (b.type === 'study_log' && b.content?.sessions) {
        const content = b.content as StudyLogBlockContent;
        content.sessions.forEach(s => {
          if (s.date >= weekStartKey && s.date <= weekEndKey) {
            studyMinutes += (s.actualMinutes || s.targetMinutes || 0);
            if (s.subject) studySubjects.add(s.subject);
          }
        });
      }
    });

    // Completed Milestones & Active Goals
    const completedMilestones = (goalMilestones || []).filter(m => m.status === 'completed' || m.is_completed).length;
    const activeGoalsCount = (goals || []).filter(g => !g.is_trash && g.status !== 'completed').length;

    return {
      focusTotalSeconds,
      focusSessionsCount: weekFocus.length,
      topFocusCategory,
      walkTotalMinutes,
      walkSessionsCount: weekWalks.length,
      activeWalkDays,
      sprintsCount: weekSprints.length,
      sprintTotalMinutes,
      papersAdded: weekPapers.length,
      papersFinished,
      papersReading,
      tasksCompleted: tasksCompleted + completedGoalTasks,
      tasksPending: tasksPending + pendingGoalTasks,
      habitPercent,
      studyMinutes,
      studySubjects: Array.from(studySubjects),
      completedMilestones,
      activeGoalsCount,
    };
  }, [selectedMonday, weekSunday, weekStartKey, weekEndKey, focusSessions, walkSessions, learningSprints, researchPapers, blocksData, goalTasks, goalMilestones, goals]);

  // Save Handler
  const handleSave = useCallback(async (forcedStatus?: 'draft' | 'completed') => {
    const finalStatus = forcedStatus || status;
    const existing = weeklyReviews.find(r => r.week_start_date === weekStartKey || r.week_start === weekStartKey);
    const reviewId = existing ? existing.id : `review-${weekStartKey}`;

    const payload: WeeklyReview = {
      id: reviewId,
      title: `Weekly Review (${formatDate(selectedMonday, { month: 'short', day: 'numeric' })} – ${formatDate(weekSunday, { month: 'short', day: 'numeric', year: 'numeric' })})`,
      week_start_date: weekStartKey,
      week_end_date: weekEndKey,
      week_start: weekStartKey,
      week_end: weekEndKey,
      status: finalStatus,
      rating_overall: ratingOverall,
      rating_energy: ratingEnergy,
      rating_productivity: ratingProductivity,
      rating_stress: ratingStress,
      reflection,
      next_week: nextWeek,
      next_week_planning: nextWeek,
      stats_snapshot: weeklyStats,
      notes: reflection.notes || '',
      created_at: existing ? existing.created_at : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await saveWeeklyReview(payload);
    setIsDirty(false);
  }, [weekStartKey, weekEndKey, selectedMonday, weekSunday, status, ratingOverall, ratingEnergy, ratingProductivity, ratingStress, reflection, nextWeek, weeklyStats, weeklyReviews, saveWeeklyReview]);

  // Debounced Autosave (1500ms after edits)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!isDirty) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      handleSave();
    }, 1500);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [isDirty, handleSave]);

  const handlePrevWeek = () => {
    setSelectedMonday(prev => addDays(prev, -7));
  };

  const handleNextWeek = () => {
    setSelectedMonday(prev => addDays(prev, 7));
  };

  const handleThisWeek = () => {
    setSelectedMonday(getMonday(new Date()));
  };

  const hasAnyStats = 
    weeklyStats.focusTotalSeconds > 0 ||
    weeklyStats.walkTotalMinutes > 0 ||
    weeklyStats.sprintsCount > 0 ||
    weeklyStats.papersAdded > 0 ||
    weeklyStats.tasksCompleted > 0 ||
    weeklyStats.studyMinutes > 0 ||
    weeklyStats.habitPercent !== null;

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-24">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center border border-[var(--border-strong)]">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif-aesthetic text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
                Weekly Review
              </h2>
              <p className="font-serif-aesthetic italic text-xs text-[var(--text-secondary)]">
                Reflect on your week and prepare the next one.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls & Save Status */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Status Indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--bg-paper-subtle)] text-[11px] font-medium text-[var(--text-secondary)] border border-[var(--border-color)]">
            {reviewSaveStatus === 'saving' && (
              <>
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span>Saving...</span>
              </>
            )}
            {reviewSaveStatus === 'saved' && (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span>Saved ✓</span>
              </>
            )}
            {reviewSaveStatus === 'error' && (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                <span>Save failed</span>
              </>
            )}
            {reviewSaveStatus === 'idle' && (
              <>
                {isDirty ? (
                  <span className="text-amber-600 dark:text-amber-400">Unsaved changes</span>
                ) : (
                  <span className="text-[var(--text-muted)]">All changes saved</span>
                )}
              </>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHistoryModal(true)}
            title="View Review History"
          >
            <History className="w-4 h-4 mr-1.5" />
            <span>History</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleSave()}
            title="Manual Save"
          >
            <Save className="w-3.5 h-3.5 mr-1.5" />
            <span>Save</span>
          </Button>

          <Button
            variant={status === 'completed' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => {
              const newStatus = status === 'completed' ? 'draft' : 'completed';
              setStatus(newStatus);
              handleSave(newStatus);
            }}
          >
            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
            <span>{status === 'completed' ? 'Completed ✓' : 'Mark Completed'}</span>
          </Button>
        </div>
      </div>

      {/* Week Selector Bar */}
      <div className="journal-paper p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handlePrevWeek} title="Previous Week">
            <ChevronLeft className="w-4 h-4 mr-1" />
            <span>Previous</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={handleThisWeek}>
            This Week
          </Button>
          <Button variant="ghost" size="sm" onClick={handleNextWeek} title="Next Week">
            <span>Next</span>
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        <div className="flex items-center gap-2 font-serif-aesthetic text-sm font-semibold text-[var(--text-primary)]">
          <CalendarIcon className="w-4 h-4 text-[var(--accent)]" />
          <span>
            {formatDate(selectedMonday, { month: 'short', day: 'numeric' })} – {formatDate(weekSunday, { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ml-2 ${
            status === 'completed' 
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' 
              : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
          }`}>
            {status === 'completed' ? 'Completed' : 'Draft'}
          </span>
        </div>
      </div>

      {/* SECTION 1: Automatic Weekly Summary (Real Planora Data Only) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--accent)]" />
            <h3 className="font-serif-aesthetic text-lg font-bold text-[var(--text-primary)]">
              Automatic Weekly Summary
            </h3>
          </div>
          <span className="text-[11px] text-[var(--text-muted)] italic">
            Aggregated from your real activity
          </span>
        </div>

        {hasAnyStats ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {/* Tasks Completed / Incomplete */}
            {(weeklyStats.tasksCompleted > 0 || weeklyStats.tasksPending > 0) && (
              <div className="journal-paper p-3.5 space-y-1.5">
                <div className="flex items-center justify-between text-[var(--text-muted)] text-xs">
                  <span>Tasks</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <div className="text-xl font-bold font-serif-aesthetic text-[var(--text-primary)]">
                  {weeklyStats.tasksCompleted} <span className="text-xs font-normal text-[var(--text-muted)]">done</span>
                </div>
                {weeklyStats.tasksPending > 0 && (
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    {weeklyStats.tasksPending} pending
                  </p>
                )}
              </div>
            )}

            {/* Focus Sessions */}
            {weeklyStats.focusTotalSeconds > 0 && (
              <div className="journal-paper p-3.5 space-y-1.5">
                <div className="flex items-center justify-between text-[var(--text-muted)] text-xs">
                  <span>Focus Work</span>
                  <Target className="w-3.5 h-3.5 text-indigo-500" />
                </div>
                <div className="text-xl font-bold font-serif-aesthetic text-[var(--text-primary)]">
                  {Math.floor(weeklyStats.focusTotalSeconds / 3600)}h {Math.round((weeklyStats.focusTotalSeconds % 3600) / 60)}m
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] truncate">
                  {weeklyStats.focusSessionsCount} sessions {weeklyStats.topFocusCategory ? `• ${weeklyStats.topFocusCategory}` : ''}
                </p>
              </div>
            )}

            {/* Walking */}
            {weeklyStats.walkTotalMinutes > 0 && (
              <div className="journal-paper p-3.5 space-y-1.5">
                <div className="flex items-center justify-between text-[var(--text-muted)] text-xs">
                  <span>Walking</span>
                  <Footprints className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <div className="text-xl font-bold font-serif-aesthetic text-[var(--text-primary)]">
                  {weeklyStats.walkTotalMinutes} <span className="text-xs font-normal text-[var(--text-muted)]">min</span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  {weeklyStats.activeWalkDays} active days ({weeklyStats.walkSessionsCount} walks)
                </p>
              </div>
            )}

            {/* Habits */}
            {weeklyStats.habitPercent !== null && (
              <div className="journal-paper p-3.5 space-y-1.5">
                <div className="flex items-center justify-between text-[var(--text-muted)] text-xs">
                  <span>Habits</span>
                  <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <div className="text-xl font-bold font-serif-aesthetic text-[var(--text-primary)]">
                  {weeklyStats.habitPercent}%
                </div>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Consistency rate
                </p>
              </div>
            )}

            {/* Study Tracker */}
            {weeklyStats.studyMinutes > 0 && (
              <div className="journal-paper p-3.5 space-y-1.5">
                <div className="flex items-center justify-between text-[var(--text-muted)] text-xs">
                  <span>Study Hours</span>
                  <GraduationCap className="w-3.5 h-3.5 text-blue-500" />
                </div>
                <div className="text-xl font-bold font-serif-aesthetic text-[var(--text-primary)]">
                  {Math.floor(weeklyStats.studyMinutes / 60)}h {weeklyStats.studyMinutes % 60}m
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] truncate">
                  {weeklyStats.studySubjects.length > 0 ? weeklyStats.studySubjects.join(', ') : 'Study sessions'}
                </p>
              </div>
            )}

            {/* Learning Sprints */}
            {weeklyStats.sprintsCount > 0 && (
              <div className="journal-paper p-3.5 space-y-1.5">
                <div className="flex items-center justify-between text-[var(--text-muted)] text-xs">
                  <span>Learning Sprints</span>
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <div className="text-xl font-bold font-serif-aesthetic text-[var(--text-primary)]">
                  {weeklyStats.sprintsCount} <span className="text-xs font-normal text-[var(--text-muted)]">completed</span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  {weeklyStats.sprintTotalMinutes} mins spent learning
                </p>
              </div>
            )}

            {/* Research Papers */}
            {(weeklyStats.papersAdded > 0 || weeklyStats.papersFinished > 0) && (
              <div className="journal-paper p-3.5 space-y-1.5">
                <div className="flex items-center justify-between text-[var(--text-muted)] text-xs">
                  <span>Research Papers</span>
                  <FileText className="w-3.5 h-3.5 text-rose-500" />
                </div>
                <div className="text-xl font-bold font-serif-aesthetic text-[var(--text-primary)]">
                  {weeklyStats.papersAdded} <span className="text-xs font-normal text-[var(--text-muted)]">added</span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  {weeklyStats.papersFinished} finished • {weeklyStats.papersReading} in progress
                </p>
              </div>
            )}

            {/* Goals & Milestones */}
            {(weeklyStats.completedMilestones > 0 || weeklyStats.activeGoalsCount > 0) && (
              <div className="journal-paper p-3.5 space-y-1.5">
                <div className="flex items-center justify-between text-[var(--text-muted)] text-xs">
                  <span>Goals Progress</span>
                  <Award className="w-3.5 h-3.5 text-purple-500" />
                </div>
                <div className="text-xl font-bold font-serif-aesthetic text-[var(--text-primary)]">
                  {weeklyStats.completedMilestones} <span className="text-xs font-normal text-[var(--text-muted)]">milestones done</span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  {weeklyStats.activeGoalsCount} active goals
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="journal-paper p-6 text-center text-xs text-[var(--text-muted)] space-y-1">
            <p>No tracked activity recorded for this specific week yet.</p>
            <p className="text-[11px]">As you log focus sessions, walks, tasks, and studies, your real weekly stats will populate automatically.</p>
          </div>
        )}
      </div>

      {/* SECTION 2: Week Rating */}
      <div className="journal-paper p-5 space-y-4">
        <h3 className="font-serif-aesthetic text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-500" />
          <span>Week Self-Rating</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* Overall Rating (1-5) */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--text-secondary)] block">Overall Week (1–5)</label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(val => (
                <button
                  key={`overall-${val}`}
                  type="button"
                  onClick={() => {
                    setRatingOverall(val);
                    setIsDirty(true);
                  }}
                  className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${
                    ratingOverall >= val 
                      ? 'bg-amber-400 text-amber-950 shadow-2xs scale-105' 
                      : 'bg-[var(--bg-paper-subtle)] text-[var(--text-muted)] hover:bg-[var(--bg-paper-hover)]'
                  }`}
                >
                  ★ {val}
                </button>
              ))}
            </div>
          </div>

          {/* Energy Level */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--text-secondary)] block">Energy</label>
            <div className="flex items-center gap-1">
              {(['low', 'medium', 'high'] as const).map(lvl => (
                <button
                  key={`energy-${lvl}`}
                  type="button"
                  onClick={() => {
                    setRatingEnergy(lvl);
                    setIsDirty(true);
                  }}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium capitalize transition-all ${
                    ratingEnergy === lvl 
                      ? 'bg-[var(--accent)] text-[var(--accent-contrast)] shadow-2xs font-semibold' 
                      : 'bg-[var(--bg-paper-subtle)] text-[var(--text-muted)] hover:bg-[var(--bg-paper-hover)]'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Productivity (1-5) */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--text-secondary)] block">Productivity (1–5)</label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(val => (
                <button
                  key={`prod-${val}`}
                  type="button"
                  onClick={() => {
                    setRatingProductivity(val);
                    setIsDirty(true);
                  }}
                  className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${
                    ratingProductivity >= val 
                      ? 'bg-indigo-500 text-white shadow-2xs scale-105' 
                      : 'bg-[var(--bg-paper-subtle)] text-[var(--text-muted)] hover:bg-[var(--bg-paper-hover)]'
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>

          {/* Stress (1-5) */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--text-secondary)] block">Stress Level (1–5)</label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(val => (
                <button
                  key={`stress-${val}`}
                  type="button"
                  onClick={() => {
                    setRatingStress(val);
                    setIsDirty(true);
                  }}
                  className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${
                    ratingStress >= val 
                      ? 'bg-rose-400 text-rose-950 shadow-2xs scale-105' 
                      : 'bg-[var(--bg-paper-subtle)] text-[var(--text-muted)] hover:bg-[var(--bg-paper-hover)]'
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: Reflection Questions */}
      <div className="space-y-4">
        <h3 className="font-serif-aesthetic text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[var(--accent)]" />
          <span>Weekly Reflection</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* What went well */}
          <div className="journal-paper p-4 space-y-1.5">
            <label className="text-xs font-semibold text-[var(--text-primary)]">
              What went well this week?
            </label>
            <textarea
              value={reflection.what_went_well || ''}
              onChange={e => {
                setReflection(prev => ({ ...prev, what_went_well: e.target.value }));
                setIsDirty(true);
              }}
              placeholder="Highlights, smooth moments, successes..."
              rows={3}
              className="w-full text-xs p-2.5 rounded-lg bg-transparent border border-[var(--border-color)] focus:border-[var(--accent)] focus:outline-hidden transition-colors resize-none leading-relaxed"
            />
          </div>

          {/* What was difficult */}
          <div className="journal-paper p-4 space-y-1.5">
            <label className="text-xs font-semibold text-[var(--text-primary)]">
              What was difficult?
            </label>
            <textarea
              value={reflection.what_was_difficult || ''}
              onChange={e => {
                setReflection(prev => ({ ...prev, what_was_difficult: e.target.value }));
                setIsDirty(true);
              }}
              placeholder="Blockers, friction, energy dips..."
              rows={3}
              className="w-full text-xs p-2.5 rounded-lg bg-transparent border border-[var(--border-color)] focus:border-[var(--accent)] focus:outline-hidden transition-colors resize-none leading-relaxed"
            />
          </div>

          {/* What am I proud of */}
          <div className="journal-paper p-4 space-y-1.5">
            <label className="text-xs font-semibold text-[var(--text-primary)]">
              What am I proud of?
            </label>
            <textarea
              value={reflection.what_proud_of || ''}
              onChange={e => {
                setReflection(prev => ({ ...prev, what_proud_of: e.target.value }));
                setIsDirty(true);
              }}
              placeholder="Small wins, courage, dedication..."
              rows={3}
              className="w-full text-xs p-2.5 rounded-lg bg-transparent border border-[var(--border-color)] focus:border-[var(--accent)] focus:outline-hidden transition-colors resize-none leading-relaxed"
            />
          </div>

          {/* What did I learn */}
          <div className="journal-paper p-4 space-y-1.5">
            <label className="text-xs font-semibold text-[var(--text-primary)]">
              What did I learn?
            </label>
            <textarea
              value={reflection.what_learned || ''}
              onChange={e => {
                setReflection(prev => ({ ...prev, what_learned: e.target.value }));
                setIsDirty(true);
              }}
              placeholder="Insights, takeaways, discoveries..."
              rows={3}
              className="w-full text-xs p-2.5 rounded-lg bg-transparent border border-[var(--border-color)] focus:border-[var(--accent)] focus:outline-hidden transition-colors resize-none leading-relaxed"
            />
          </div>

          {/* What distracted me */}
          <div className="journal-paper p-4 space-y-1.5">
            <label className="text-xs font-semibold text-[var(--text-primary)]">
              What distracted me?
            </label>
            <textarea
              value={reflection.what_distracted_me || ''}
              onChange={e => {
                setReflection(prev => ({ ...prev, what_distracted_me: e.target.value }));
                setIsDirty(true);
              }}
              placeholder="Phone, overthinking, multitasking..."
              rows={3}
              className="w-full text-xs p-2.5 rounded-lg bg-transparent border border-[var(--border-color)] focus:border-[var(--accent)] focus:outline-hidden transition-colors resize-none leading-relaxed"
            />
          </div>

          {/* What should I improve next week */}
          <div className="journal-paper p-4 space-y-1.5">
            <label className="text-xs font-semibold text-[var(--text-primary)]">
              What should I improve next week?
            </label>
            <textarea
              value={reflection.what_to_improve || ''}
              onChange={e => {
                setReflection(prev => ({ ...prev, what_to_improve: e.target.value }));
                setIsDirty(true);
              }}
              placeholder="Habits to refine, systems to tweak..."
              rows={3}
              className="w-full text-xs p-2.5 rounded-lg bg-transparent border border-[var(--border-color)] focus:border-[var(--accent)] focus:outline-hidden transition-colors resize-none leading-relaxed"
            />
          </div>

          {/* What should I stop doing */}
          <div className="journal-paper p-4 space-y-1.5">
            <label className="text-xs font-semibold text-[var(--text-primary)]">
              What should I stop doing?
            </label>
            <textarea
              value={reflection.what_to_stop || ''}
              onChange={e => {
                setReflection(prev => ({ ...prev, what_to_stop: e.target.value }));
                setIsDirty(true);
              }}
              placeholder="Habits or tasks to drop..."
              rows={3}
              className="w-full text-xs p-2.5 rounded-lg bg-transparent border border-[var(--border-color)] focus:border-[var(--accent)] focus:outline-hidden transition-colors resize-none leading-relaxed"
            />
          </div>

          {/* What should I continue doing */}
          <div className="journal-paper p-4 space-y-1.5">
            <label className="text-xs font-semibold text-[var(--text-primary)]">
              What should I continue doing?
            </label>
            <textarea
              value={reflection.what_to_continue || ''}
              onChange={e => {
                setReflection(prev => ({ ...prev, what_to_continue: e.target.value }));
                setIsDirty(true);
              }}
              placeholder="Effective routines, habits that worked..."
              rows={3}
              className="w-full text-xs p-2.5 rounded-lg bg-transparent border border-[var(--border-color)] focus:border-[var(--accent)] focus:outline-hidden transition-colors resize-none leading-relaxed"
            />
          </div>
        </div>

        {/* Biggest Win of the Week */}
        <div className="journal-paper p-4 space-y-1.5 border-l-4 border-l-[var(--accent)]">
          <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
            <Award className="w-4 h-4 text-[var(--accent)]" />
            <span>Biggest Win of the Week</span>
          </label>
          <input
            type="text"
            value={reflection.biggest_win || ''}
            onChange={e => {
              setReflection(prev => ({ ...prev, biggest_win: e.target.value }));
              setIsDirty(true);
            }}
            placeholder="Your single most rewarding achievement this week..."
            className="w-full text-xs p-2.5 rounded-lg bg-transparent border border-[var(--border-color)] focus:border-[var(--accent)] focus:outline-hidden transition-colors"
          />
        </div>
      </div>

      {/* SECTION 4: Next Week Planning */}
      <div className="space-y-4">
        <h3 className="font-serif-aesthetic text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
          <ArrowRight className="w-4 h-4 text-[var(--accent)]" />
          <span>Next Week Planning</span>
        </h3>

        <div className="journal-paper p-5 space-y-5">
          {/* Top 3 Priorities */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold text-[var(--text-primary)] block">
              Top 3 Priorities for Next Week
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">1. Priority One</span>
                <input
                  type="text"
                  value={nextWeek.priority_1 || ''}
                  onChange={e => {
                    setNextWeek(prev => ({ ...prev, priority_1: e.target.value }));
                    setIsDirty(true);
                  }}
                  placeholder="Crucial focus #1..."
                  className="w-full text-xs p-2 rounded-lg bg-transparent border border-[var(--border-color)] focus:border-[var(--accent)] focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">2. Priority Two</span>
                <input
                  type="text"
                  value={nextWeek.priority_2 || ''}
                  onChange={e => {
                    setNextWeek(prev => ({ ...prev, priority_2: e.target.value }));
                    setIsDirty(true);
                  }}
                  placeholder="Key focus #2..."
                  className="w-full text-xs p-2 rounded-lg bg-transparent border border-[var(--border-color)] focus:border-[var(--accent)] focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">3. Priority Three</span>
                <input
                  type="text"
                  value={nextWeek.priority_3 || ''}
                  onChange={e => {
                    setNextWeek(prev => ({ ...prev, priority_3: e.target.value }));
                    setIsDirty(true);
                  }}
                  placeholder="Key focus #3..."
                  className="w-full text-xs p-2 rounded-lg bg-transparent border border-[var(--border-color)] focus:border-[var(--accent)] focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-[var(--border-color)]">
            {/* Deadlines */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-primary)]">
                Important Deadlines
              </label>
              <textarea
                value={nextWeek.deadlines || ''}
                onChange={e => {
                  setNextWeek(prev => ({ ...prev, deadlines: e.target.value }));
                  setIsDirty(true);
                }}
                placeholder="Dates, exams, paper submissions, meetings..."
                rows={2}
                className="w-full text-xs p-2.5 rounded-lg bg-transparent border border-[var(--border-color)] focus:border-[var(--accent)] focus:outline-hidden resize-none"
              />
            </div>

            {/* Things to remember */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-primary)]">
                Things to Remember / Reminders
              </label>
              <textarea
                value={nextWeek.reminders || ''}
                onChange={e => {
                  setNextWeek(prev => ({ ...prev, reminders: e.target.value }));
                  setIsDirty(true);
                }}
                placeholder="Appointments, follow-ups, self-care reminders..."
                rows={2}
                className="w-full text-xs p-2.5 rounded-lg bg-transparent border border-[var(--border-color)] focus:border-[var(--accent)] focus:outline-hidden resize-none"
              />
            </div>
          </div>

          {/* Three Focused Goals for Next Week */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[var(--border-color)]">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[var(--text-secondary)]">One Personal Goal</label>
              <input
                type="text"
                value={nextWeek.personal_goal || ''}
                onChange={e => {
                  setNextWeek(prev => ({ ...prev, personal_goal: e.target.value }));
                  setIsDirty(true);
                }}
                placeholder="e.g. Read 2 chapters, phone off by 10pm"
                className="w-full text-xs p-2 rounded-lg bg-transparent border border-[var(--border-color)] focus:border-[var(--accent)] focus:outline-hidden"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[var(--text-secondary)]">One Academic / Work Goal</label>
              <input
                type="text"
                value={nextWeek.work_goal || ''}
                onChange={e => {
                  setNextWeek(prev => ({ ...prev, work_goal: e.target.value }));
                  setIsDirty(true);
                }}
                placeholder="e.g. Finish methodology draft"
                className="w-full text-xs p-2 rounded-lg bg-transparent border border-[var(--border-color)] focus:border-[var(--accent)] focus:outline-hidden"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[var(--text-secondary)]">One Health & Wellness Goal</label>
              <input
                type="text"
                value={nextWeek.health_goal || ''}
                onChange={e => {
                  setNextWeek(prev => ({ ...prev, health_goal: e.target.value }));
                  setIsDirty(true);
                }}
                placeholder="e.g. Walk 4 times, 2L water daily"
                className="w-full text-xs p-2 rounded-lg bg-transparent border border-[var(--border-color)] focus:border-[var(--accent)] focus:outline-hidden"
              />
            </div>
          </div>
        </div>
      </div>

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md journal-paper p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <h3 className="font-serif-aesthetic font-bold text-base text-[var(--text-primary)] flex items-center gap-2">
                <History className="w-4 h-4 text-[var(--accent)]" />
                <span>Review History</span>
              </h3>
              <Button size="sm" variant="ghost" onClick={() => setShowHistoryModal(false)}>
                Close
              </Button>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {weeklyReviews.length > 0 ? (
                weeklyReviews.map(r => (
                  <div
                    key={r.id}
                    onClick={() => {
                      setSelectedMonday(new Date(`${r.week_start_date}T00:00:00`));
                      setShowHistoryModal(false);
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      r.week_start_date === weekStartKey
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                        : 'border-[var(--border-color)] hover:border-[var(--border-strong)] bg-[var(--bg-paper)]'
                    }`}
                  >
                    <div>
                      <h4 className="font-serif-aesthetic font-semibold text-xs text-[var(--text-primary)]">
                        {r.title || `${r.week_start_date} – ${r.week_end_date}`}
                      </h4>
                      <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                        {r.rating_overall ? `★ ${r.rating_overall}/5 • ` : ''}
                        {r.reflection?.biggest_win ? `Win: ${r.reflection.biggest_win.slice(0, 30)}...` : 'No summary notes'}
                      </p>
                    </div>

                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      r.status === 'completed'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                    }`}>
                      {r.status === 'completed' ? 'Completed' : 'Draft'}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-[var(--text-muted)] text-center py-6">
                  No saved weekly reviews found yet.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
