'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { usePlanner } from '@/lib/storage';
import { 
  MonthlyReview, 
  MonthlyReflection, 
  NextMonthPlanning,
  PageBlock,
  ChecklistBlockContent,
  HabitBlockContent,
  StudyLogBlockContent,
  WalkSession,
  FocusSession,
  ResearchPaper,
  LearningSprint,
  Goal
} from '@/lib/types';
import { generateId } from '@/lib/utils';
import { 
  BarChart3, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  Save, 
  Printer, 
  Target, 
  GraduationCap, 
  Footprints, 
  BookOpen, 
  FileText, 
  Flag, 
  Lightbulb, 
  CheckCircle2, 
  Clock, 
  Heart, 
  Flame, 
  Brain, 
  Compass, 
  Check, 
  AlertCircle, 
  Smile, 
  TrendingUp, 
  Eye, 
  EyeOff, 
  Share2,
  Lock
} from 'lucide-react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function MonthlyReportPage() {
  const searchParams = useSearchParams();
  const { 
    monthlyReviews, 
    saveMonthlyReview, 
    updateMonthlyReview, 
    monthlySaveStatus,
    pages,
    storage,
    walkSessions,
    focusSessions,
    researchPapers,
    learningSprints,
    knowledgeItems,
    vocabularyItems,
    weeklyReviews,
    goals,
    goalMilestones,
    goalTasks
  } = usePlanner();

  // Current selected month
  const [selectedDate, setSelectedDate] = useState(() => {
    const monthParam = searchParams.get('month');
    if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
      const [y, m] = monthParam.split('-').map(Number);
      return new Date(y, m - 1, 1);
    }
    return new Date();
  });

  const selectedYear = selectedDate.getFullYear();
  const selectedMonthNumber = selectedDate.getMonth() + 1; // 1-12
  const monthKey = `${selectedYear}-${String(selectedMonthNumber).padStart(2, '0')}`;
  const monthLabel = `${MONTH_NAMES[selectedDate.getMonth()]} ${selectedYear}`;

  // Private toggle for period tracker
  const [showPeriodData, setShowPeriodData] = useState(false);

  // Month navigation
  const handlePrevMonth = () => {
    setSelectedDate(new Date(selectedYear, selectedDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setSelectedDate(new Date(selectedYear, selectedDate.getMonth() + 1, 1));
  };

  const handleCurrentMonth = () => {
    setSelectedDate(new Date());
  };

  // Find existing persisted monthly review record
  const currentMonthlyRecord = useMemo(() => {
    return monthlyReviews.find(r => r.month_key === monthKey);
  }, [monthlyReviews, monthKey]);

  // Editable Form State
  const [ratingOverall, setRatingOverall] = useState<number>(0);
  const [ratingProductivity, setRatingProductivity] = useState<number>(0);
  const [ratingEnergy, setRatingEnergy] = useState<string>('medium');
  const [ratingFocus, setRatingFocus] = useState<number>(0);

  const [reflection, setReflection] = useState<MonthlyReflection>({
    what_went_well: '',
    what_was_difficult: '',
    what_proud_of: '',
    what_learned: '',
    what_took_too_much_time: '',
    what_to_change: '',
    best_moment: '',
    biggest_lesson: '',
  });

  const [nextMonth, setNextMonth] = useState<NextMonthPlanning>({
    priority_1: '',
    priority_2: '',
    priority_3: '',
    main_goal: '',
    one_thing_to_improve: '',
    one_thing_to_continue: '',
    one_thing_to_stop: '',
    important_dates: '',
  });

  const [manualNotes, setManualNotes] = useState('');

  // Load record into state when month changes
  useEffect(() => {
    if (currentMonthlyRecord) {
      setRatingOverall(currentMonthlyRecord.rating_overall || 0);
      setRatingProductivity(currentMonthlyRecord.rating_productivity || 0);
      setRatingEnergy(currentMonthlyRecord.rating_energy || 'medium');
      setRatingFocus(currentMonthlyRecord.rating_focus || 0);
      setReflection(currentMonthlyRecord.reflection || {
        what_went_well: '',
        what_was_difficult: '',
        what_proud_of: '',
        what_learned: '',
        what_took_too_much_time: '',
        what_to_change: '',
        best_moment: '',
        biggest_lesson: '',
      });
      setNextMonth(currentMonthlyRecord.next_month || {
        priority_1: '',
        priority_2: '',
        priority_3: '',
        main_goal: '',
        one_thing_to_improve: '',
        one_thing_to_continue: '',
        one_thing_to_stop: '',
        important_dates: '',
      });
      setManualNotes(currentMonthlyRecord.notes || '');
    } else {
      setRatingOverall(0);
      setRatingProductivity(0);
      setRatingEnergy('medium');
      setRatingFocus(0);
      setReflection({
        what_went_well: '',
        what_was_difficult: '',
        what_proud_of: '',
        what_learned: '',
        what_took_too_much_time: '',
        what_to_change: '',
        best_moment: '',
        biggest_lesson: '',
      });
      setNextMonth({
        priority_1: '',
        priority_2: '',
        priority_3: '',
        main_goal: '',
        one_thing_to_improve: '',
        one_thing_to_continue: '',
        one_thing_to_stop: '',
        important_dates: '',
      });
      setManualNotes('');
    }
  }, [currentMonthlyRecord, monthKey]);

  // ==========================================
  // REAL STATS COMPUTATION FOR SELECTED MONTH
  // ==========================================
  const computedStats = useMemo(() => {
    const startOfMonth = new Date(selectedYear, selectedDate.getMonth(), 1, 0, 0, 0);
    const endOfMonth = new Date(selectedYear, selectedDate.getMonth() + 1, 0, 23, 59, 59);

    const isInMonth = (dateStr?: string | null) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return d >= startOfMonth && d <= endOfMonth;
    };

    // 1. Focus Sessions
    const monthFocus = focusSessions.filter(fs => isInMonth(fs.started_at));
    const focusTotalSeconds = monthFocus.reduce((acc, fs) => acc + (fs.actual_duration_seconds || 0), 0);
    const focusHours = (focusTotalSeconds / 3600).toFixed(1);
    const focusCount = monthFocus.length;
    const focusCategoriesCount: Record<string, number> = {};
    monthFocus.forEach(fs => {
      focusCategoriesCount[fs.category] = (focusCategoriesCount[fs.category] || 0) + (fs.actual_duration_seconds || 0);
    });
    const topFocusCategory = Object.entries(focusCategoriesCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Research';

    // 2. Walk Tracker
    const monthWalks = walkSessions.filter(ws => isInMonth(ws.date || ws.created_at));
    const walkMinutes = monthWalks.reduce((acc, ws) => acc + Math.round((ws.duration_seconds || 0) / 60), 0);
    const walkHours = (walkMinutes / 60).toFixed(1);
    const walkDays = new Set(monthWalks.map(ws => (ws.date || ws.created_at).split('T')[0])).size;

    // 3. Learning Sprints
    const monthSprints = learningSprints.filter(ls => isInMonth(ls.started_at || ls.created_at));
    const sprintTotalMinutes = Math.round(monthSprints.reduce((acc, ls) => acc + (ls.actual_duration_seconds || 0), 0) / 60);

    // 4. Research Papers
    const papersAddedInMonth = researchPapers.filter(rp => !rp.is_trash && isInMonth(rp.created_at));
    const papersFinishedInMonth = researchPapers.filter(rp => !rp.is_trash && rp.status === 'finished' && isInMonth(rp.updated_at));
    const papersReadingNow = researchPapers.filter(rp => !rp.is_trash && rp.status === 'reading').length;

    // 5. Vocabulary
    const wordsAddedInMonth = vocabularyItems.filter(v => !v.is_trash && isInMonth(v.created_at)).length;
    const wordsReviewedInMonth = vocabularyItems.filter(v => !v.is_trash && isInMonth(v.last_reviewed_at)).length;
    const wordsLearnedInMonth = vocabularyItems.filter(v => !v.is_trash && v.status === 'known' && isInMonth(v.updated_at)).length;

    // 6. Knowledge Vault
    const vaultItemsAddedInMonth = knowledgeItems.filter(k => isInMonth(k.created_at)).length;

    // 7. Goals & Milestones
    const activeGoalsCount = goals.filter(g => !g.is_trash && g.status !== 'completed').length;
    const completedGoalsInMonth = goals.filter(g => !g.is_trash && g.status === 'completed' && isInMonth(g.updated_at)).length;
    const milestonesInMonth = goalMilestones.filter(m => (m.status === 'completed' || m.is_completed) && isInMonth(m.updated_at)).length;

    // 8. Weekly Reviews in this month
    const reviewsInMonth = weeklyReviews.filter(wr => {
      const wDate = wr.week_start_date || wr.week_start;
      return isInMonth(wDate);
    });

    return {
      focusHours: Number(focusHours),
      focusCount,
      topFocusCategory,
      walkHours: Number(walkHours),
      walkMinutes,
      walkSessionsCount: monthWalks.length,
      walkDays,
      sprintsCount: monthSprints.length,
      sprintMinutes: sprintTotalMinutes,
      papersAdded: papersAddedInMonth.length,
      papersFinished: papersFinishedInMonth.length,
      papersReadingNow,
      wordsAdded: wordsAddedInMonth,
      wordsReviewed: wordsReviewedInMonth,
      wordsLearned: wordsLearnedInMonth,
      vaultItemsAdded: vaultItemsAddedInMonth,
      activeGoalsCount,
      completedGoals: completedGoalsInMonth,
      milestonesCompleted: milestonesInMonth,
      weeklyReviewsCount: reviewsInMonth.length,
      weeklyReviews: reviewsInMonth,
    };
  }, [
    selectedYear, 
    selectedDate, 
    focusSessions, 
    walkSessions, 
    learningSprints, 
    researchPapers, 
    vocabularyItems, 
    knowledgeItems, 
    goals, 
    goalMilestones, 
    weeklyReviews
  ]);

  // Save manual reflection persistently to Supabase
  const handleSaveReflection = async () => {
    const payload: MonthlyReview = {
      id: currentMonthlyRecord?.id || generateId(),
      month_key: monthKey,
      month_label: monthLabel,
      year: selectedYear,
      month_number: selectedMonthNumber,
      rating_overall: ratingOverall,
      rating_productivity: ratingProductivity,
      rating_energy: ratingEnergy,
      rating_focus: ratingFocus,
      reflection,
      next_month: nextMonth,
      notes: manualNotes,
      status: 'completed',
      created_at: currentMonthlyRecord?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (currentMonthlyRecord) {
      await updateMonthlyReview(currentMonthlyRecord.id, payload);
    } else {
      await saveMonthlyReview(payload);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200 print:p-0 print:space-y-4">
      {/* Top Header & Month Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-color)] print:border-none">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-serif-aesthetic text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
              Monthly Personal Report
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/20">
              Month in Review
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
            See where your time, energy, and attention went.
          </p>
        </div>

        {/* Print & Action Controls */}
        <div className="flex items-center gap-2 print:hidden">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border-color)] hover:bg-[var(--bg-paper-hover)] text-xs font-medium text-[var(--text-secondary)] shadow-2xs transition-colors"
            title="Print or Export PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Export / Print</span>
          </button>

          <button
            onClick={handleSaveReflection}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[var(--accent)] hover:opacity-90 text-[var(--accent-contrast)] text-xs font-semibold shadow-xs transition-all"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{monthlySaveStatus === 'saving' ? 'Saving...' : monthlySaveStatus === 'saved' ? 'Saved' : 'Save Reflection'}</span>
          </button>
        </div>
      </div>

      {/* Month Selector Bar */}
      <div className="flex items-center justify-between p-2 rounded-2xl bg-[var(--bg-paper)] border border-[var(--border-color)] shadow-2xs print:hidden">
        <button
          onClick={handlePrevMonth}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-paper-hover)] transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous Month</span>
        </button>

        <div className="flex items-center gap-2">
          <h2 className="font-serif-aesthetic font-bold text-base sm:text-lg text-[var(--text-primary)]">
            {monthLabel}
          </h2>
          <button
            onClick={handleCurrentMonth}
            className="text-[10px] uppercase font-semibold text-[var(--accent)] hover:underline px-1.5 py-0.5 rounded bg-[var(--accent-soft)]"
          >
            Current
          </button>
        </div>

        <button
          onClick={handleNextMonth}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-paper-hover)] transition-colors"
        >
          <span>Next Month</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* "MY MONTH IN PLANORA" BEAUTIFUL SUMMARY CARD */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-[var(--bg-paper)] via-[var(--bg-paper)] to-[var(--accent-soft)]/25 border border-[var(--border-strong)] shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[var(--accent)]" />
            <span className="text-xs uppercase font-bold tracking-widest text-[var(--text-muted)] font-mono">
              MY MONTH IN PLANORA • {monthLabel.toUpperCase()}
            </span>
          </div>
          {currentMonthlyRecord?.status === 'completed' && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Report Completed</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          <div className="p-3 rounded-2xl bg-[var(--bg-paper)]/80 border border-[var(--border-color)] text-center shadow-2xs">
            <span className="text-xl sm:text-2xl font-bold font-serif-aesthetic text-[var(--text-primary)] block">
              {computedStats.focusHours}h
            </span>
            <span className="text-[10px] uppercase font-semibold text-[var(--text-muted)]">Focus Time</span>
          </div>

          <div className="p-3 rounded-2xl bg-[var(--bg-paper)]/80 border border-[var(--border-color)] text-center shadow-2xs">
            <span className="text-xl sm:text-2xl font-bold font-serif-aesthetic text-[var(--text-primary)] block">
              {computedStats.walkHours}h
            </span>
            <span className="text-[10px] uppercase font-semibold text-[var(--text-muted)]">Walked</span>
          </div>

          <div className="p-3 rounded-2xl bg-[var(--bg-paper)]/80 border border-[var(--border-color)] text-center shadow-2xs">
            <span className="text-xl sm:text-2xl font-bold font-serif-aesthetic text-[var(--text-primary)] block">
              {computedStats.sprintsCount}
            </span>
            <span className="text-[10px] uppercase font-semibold text-[var(--text-muted)]">Sprints Done</span>
          </div>

          <div className="p-3 rounded-2xl bg-[var(--bg-paper)]/80 border border-[var(--border-color)] text-center shadow-2xs">
            <span className="text-xl sm:text-2xl font-bold font-serif-aesthetic text-[var(--text-primary)] block">
              {computedStats.papersFinished}
            </span>
            <span className="text-[10px] uppercase font-semibold text-[var(--text-muted)]">Papers Read</span>
          </div>

          <div className="p-3 rounded-2xl bg-[var(--bg-paper)]/80 border border-[var(--border-color)] text-center shadow-2xs">
            <span className="text-xl sm:text-2xl font-bold font-serif-aesthetic text-[var(--text-primary)] block">
              {computedStats.wordsAdded}
            </span>
            <span className="text-[10px] uppercase font-semibold text-[var(--text-muted)]">New Words</span>
          </div>

          <div className="p-3 rounded-2xl bg-[var(--bg-paper)]/80 border border-[var(--border-color)] text-center shadow-2xs">
            <span className="text-xl sm:text-2xl font-bold font-serif-aesthetic text-[var(--text-primary)] block">
              {computedStats.vaultItemsAdded}
            </span>
            <span className="text-[10px] uppercase font-semibold text-[var(--text-muted)]">Vault Items</span>
          </div>

          <div className="p-3 rounded-2xl bg-[var(--bg-paper)]/80 border border-[var(--border-color)] text-center shadow-2xs">
            <span className="text-xl sm:text-2xl font-bold font-serif-aesthetic text-[var(--text-primary)] block">
              {computedStats.milestonesCompleted}
            </span>
            <span className="text-[10px] uppercase font-semibold text-[var(--text-muted)]">Milestones</span>
          </div>

          <div className="p-3 rounded-2xl bg-[var(--bg-paper)]/80 border border-[var(--border-color)] text-center shadow-2xs">
            <span className="text-xl sm:text-2xl font-bold font-serif-aesthetic text-[var(--text-primary)] block">
              {computedStats.weeklyReviewsCount}
            </span>
            <span className="text-[10px] uppercase font-semibold text-[var(--text-muted)]">Weekly Reviews</span>
          </div>
        </div>
      </div>

      {/* DETAILED STATS BREAKDOWN GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Productivity Breakdown */}
        <div className="p-5 rounded-2xl bg-[var(--bg-paper)] border border-[var(--border-color)] space-y-3 shadow-2xs">
          <div className="flex items-center gap-2 pb-2 border-b border-[var(--border-color)]">
            <Target className="w-4 h-4 text-[var(--accent)]" />
            <h3 className="font-serif-aesthetic font-semibold text-sm text-[var(--text-primary)]">
              Productivity & Focus
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[var(--bg-paper-hover)]/40">
              <span className="text-[11px] text-[var(--text-muted)] block">Total Focus Time</span>
              <span className="text-lg font-bold font-serif-aesthetic text-[var(--text-primary)]">
                {computedStats.focusHours} hours
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[var(--bg-paper-hover)]/40">
              <span className="text-[11px] text-[var(--text-muted)] block">Completed Sessions</span>
              <span className="text-lg font-bold font-serif-aesthetic text-[var(--text-primary)]">
                {computedStats.focusCount} sessions
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[var(--bg-paper-hover)]/40 col-span-2">
              <span className="text-[11px] text-[var(--text-muted)] block">Top Focus Category</span>
              <span className="font-semibold text-[var(--text-primary)]">
                {computedStats.topFocusCategory}
              </span>
            </div>
          </div>
        </div>

        {/* Wellness & Activity */}
        <div className="p-5 rounded-2xl bg-[var(--bg-paper)] border border-[var(--border-color)] space-y-3 shadow-2xs">
          <div className="flex items-center gap-2 pb-2 border-b border-[var(--border-color)]">
            <Footprints className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="font-serif-aesthetic font-semibold text-sm text-[var(--text-primary)]">
              Wellness & Movement
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[var(--bg-paper-hover)]/40">
              <span className="text-[11px] text-[var(--text-muted)] block">Walking Time</span>
              <span className="text-lg font-bold font-serif-aesthetic text-emerald-600 dark:text-emerald-400">
                {computedStats.walkMinutes} min ({computedStats.walkHours}h)
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[var(--bg-paper-hover)]/40">
              <span className="text-[11px] text-[var(--text-muted)] block">Active Walking Days</span>
              <span className="text-lg font-bold font-serif-aesthetic text-emerald-600 dark:text-emerald-400">
                {computedStats.walkDays} days
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[var(--bg-paper-hover)]/40 col-span-2">
              <span className="text-[11px] text-[var(--text-muted)] block">Walk Sessions Recorded</span>
              <span className="font-semibold text-[var(--text-primary)]">
                {computedStats.walkSessionsCount} sessions
              </span>
            </div>
          </div>
        </div>

        {/* Learning & Vocabulary */}
        <div className="p-5 rounded-2xl bg-[var(--bg-paper)] border border-[var(--border-color)] space-y-3 shadow-2xs">
          <div className="flex items-center gap-2 pb-2 border-b border-[var(--border-color)]">
            <Brain className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-serif-aesthetic font-semibold text-sm text-[var(--text-primary)]">
              Learning & Vocabulary
            </h3>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-[var(--bg-paper-hover)]/40 text-center">
              <span className="text-base font-bold font-serif-aesthetic text-indigo-600 dark:text-indigo-400 block">
                {computedStats.sprintsCount}
              </span>
              <span className="text-[10px] text-[var(--text-muted)]">Sprints</span>
            </div>
            <div className="p-2.5 rounded-xl bg-[var(--bg-paper-hover)]/40 text-center">
              <span className="text-base font-bold font-serif-aesthetic text-indigo-600 dark:text-indigo-400 block">
                {computedStats.wordsAdded}
              </span>
              <span className="text-[10px] text-[var(--text-muted)]">New Words</span>
            </div>
            <div className="p-2.5 rounded-xl bg-[var(--bg-paper-hover)]/40 text-center">
              <span className="text-base font-bold font-serif-aesthetic text-indigo-600 dark:text-indigo-400 block">
                {computedStats.wordsLearned}
              </span>
              <span className="text-[10px] text-[var(--text-muted)]">Words Mastered</span>
            </div>
          </div>
        </div>

        {/* Research Papers & Goals */}
        <div className="p-5 rounded-2xl bg-[var(--bg-paper)] border border-[var(--border-color)] space-y-3 shadow-2xs">
          <div className="flex items-center gap-2 pb-2 border-b border-[var(--border-color)]">
            <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <h3 className="font-serif-aesthetic font-semibold text-sm text-[var(--text-primary)]">
              Research & Goals
            </h3>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-[var(--bg-paper-hover)]/40 text-center">
              <span className="text-base font-bold font-serif-aesthetic text-purple-600 dark:text-purple-400 block">
                {computedStats.papersAdded}
              </span>
              <span className="text-[10px] text-[var(--text-muted)]">Papers Added</span>
            </div>
            <div className="p-2.5 rounded-xl bg-[var(--bg-paper-hover)]/40 text-center">
              <span className="text-base font-bold font-serif-aesthetic text-purple-600 dark:text-purple-400 block">
                {computedStats.papersFinished}
              </span>
              <span className="text-[10px] text-[var(--text-muted)]">Finished</span>
            </div>
            <div className="p-2.5 rounded-xl bg-[var(--bg-paper-hover)]/40 text-center">
              <span className="text-base font-bold font-serif-aesthetic text-purple-600 dark:text-purple-400 block">
                {computedStats.milestonesCompleted}
              </span>
              <span className="text-[10px] text-[var(--text-muted)]">Milestones</span>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Reviews Link Section */}
      {computedStats.weeklyReviews.length > 0 && (
        <div className="p-4 rounded-2xl bg-[var(--bg-paper)] border border-[var(--border-color)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <Compass className="w-4 h-4 text-[var(--accent)]" />
            <span className="text-xs font-semibold text-[var(--text-primary)]">
              {computedStats.weeklyReviews.length} Weekly Reviews recorded during {monthLabel}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {computedStats.weeklyReviews.map(wr => (
              <a
                key={wr.id}
                href={`/weekly-review?week=${wr.week_start_date || wr.week_start}`}
                className="px-2.5 py-1 rounded-lg bg-[var(--bg-paper-hover)] text-xs text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)] border border-[var(--border-color)] transition-all font-mono"
              >
                Week {wr.week_number || wr.week_start_date}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* MONTH RATINGS (1-5 & Energy) */}
      <div className="p-6 rounded-3xl bg-[var(--bg-paper)] border border-[var(--border-color)] space-y-4 shadow-2xs">
        <h3 className="font-serif-aesthetic font-semibold text-base text-[var(--text-primary)]">
          Month Ratings & Energy Check-in
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Overall */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Overall Month (1–5)
            </label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRatingOverall(star)}
                  className={`p-1.5 rounded-lg transition-all ${
                    ratingOverall >= star ? 'text-amber-500 bg-amber-500/10' : 'text-[var(--text-muted)] hover:bg-[var(--bg-paper-hover)]'
                  }`}
                >
                  <Smile className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>

          {/* Productivity */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Productivity (1–5)
            </label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRatingProductivity(star)}
                  className={`p-1.5 rounded-lg transition-all ${
                    ratingProductivity >= star ? 'text-blue-500 bg-blue-500/10' : 'text-[var(--text-muted)] hover:bg-[var(--bg-paper-hover)]'
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>

          {/* Focus */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Focus & Flow (1–5)
            </label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRatingFocus(star)}
                  className={`p-1.5 rounded-lg transition-all ${
                    ratingFocus >= star ? 'text-purple-500 bg-purple-500/10' : 'text-[var(--text-muted)] hover:bg-[var(--bg-paper-hover)]'
                  }`}
                >
                  <Brain className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>

          {/* Energy */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Energy Level
            </label>
            <div className="flex items-center gap-1.5">
              {['low', 'medium', 'high'].map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setRatingEnergy(lvl)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium capitalize border transition-all ${
                    ratingEnergy === lvl
                      ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] font-semibold'
                      : 'border-[var(--border-color)] text-[var(--text-muted)] hover:bg-[var(--bg-paper-hover)]'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* PERSONAL REFLECTION PROMPTS */}
      <div className="p-6 rounded-3xl bg-[var(--bg-paper)] border border-[var(--border-color)] space-y-6 shadow-2xs">
        <div>
          <h3 className="font-serif-aesthetic font-bold text-lg text-[var(--text-primary)]">
            Personal Reflection & Learnings
          </h3>
          <p className="text-xs text-[var(--text-muted)]">
            Honest reflection creates lasting improvement. Everything you write persists securely.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
              What went well?
            </label>
            <textarea
              rows={3}
              value={reflection.what_went_well || ''}
              onChange={(e) => setReflection({ ...reflection, what_went_well: e.target.value })}
              placeholder="Habits maintained, projects finished, good moments..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-paper)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)] resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
              What was difficult?
            </label>
            <textarea
              rows={3}
              value={reflection.what_was_difficult || ''}
              onChange={(e) => setReflection({ ...reflection, what_was_difficult: e.target.value })}
              placeholder="Blockers, stress, fatigue, obstacles..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-paper)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)] resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
              What am I proud of?
            </label>
            <textarea
              rows={3}
              value={reflection.what_proud_of || ''}
              onChange={(e) => setReflection({ ...reflection, what_proud_of: e.target.value })}
              placeholder="Key achievements, breakthroughs, self-discipline..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-paper)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)] resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
              What did I learn?
            </label>
            <textarea
              rows={3}
              value={reflection.what_learned || ''}
              onChange={(e) => setReflection({ ...reflection, what_learned: e.target.value })}
              placeholder="Insights, reading takeaways, new perspectives..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-paper)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)] resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
              What took too much of my time?
            </label>
            <textarea
              rows={3}
              value={reflection.what_took_too_much_time || ''}
              onChange={(e) => setReflection({ ...reflection, what_took_too_much_time: e.target.value })}
              placeholder="Distractions, inefficient routines, overthinking..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-paper)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)] resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
              What should I change next month?
            </label>
            <textarea
              rows={3}
              value={reflection.what_to_change || ''}
              onChange={(e) => setReflection({ ...reflection, what_to_change: e.target.value })}
              placeholder="Actionable adjustments to schedule or habits..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-paper)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)] resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
              Best moment of the month
            </label>
            <input
              type="text"
              value={reflection.best_moment || ''}
              onChange={(e) => setReflection({ ...reflection, best_moment: e.target.value })}
              placeholder="Favorite memory or realization..."
              className="w-full px-3.5 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-paper)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
              Biggest lesson
            </label>
            <input
              type="text"
              value={reflection.biggest_lesson || ''}
              onChange={(e) => setReflection({ ...reflection, biggest_lesson: e.target.value })}
              placeholder="Guiding principle learned..."
              className="w-full px-3.5 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-paper)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
            />
          </div>
        </div>
      </div>

      {/* NEXT MONTH PLANNING */}
      <div className="p-6 rounded-3xl bg-[var(--bg-paper)] border border-[var(--border-color)] space-y-6 shadow-2xs">
        <div>
          <h3 className="font-serif-aesthetic font-bold text-lg text-[var(--text-primary)]">
            Looking Ahead: Next Month Intentions
          </h3>
          <p className="text-xs text-[var(--text-muted)]">
            Set your top priorities, guiding goal, and deliberate focus for next month.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
              Top 3 Priorities
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                value={nextMonth.priority_1 || ''}
                onChange={(e) => setNextMonth({ ...nextMonth, priority_1: e.target.value })}
                placeholder="1. Primary Focus..."
                className="w-full px-3.5 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-paper)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)] font-medium"
              />
              <input
                type="text"
                value={nextMonth.priority_2 || ''}
                onChange={(e) => setNextMonth({ ...nextMonth, priority_2: e.target.value })}
                placeholder="2. Secondary Focus..."
                className="w-full px-3.5 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-paper)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)] font-medium"
              />
              <input
                type="text"
                value={nextMonth.priority_3 || ''}
                onChange={(e) => setNextMonth({ ...nextMonth, priority_3: e.target.value })}
                placeholder="3. Tertiary Focus..."
                className="w-full px-3.5 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-paper)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)] font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
              Main Goal for Next Month
            </label>
            <input
              type="text"
              value={nextMonth.main_goal || ''}
              onChange={(e) => setNextMonth({ ...nextMonth, main_goal: e.target.value })}
              placeholder="e.g. Complete survey paper draft & maintain 80% walking consistency"
              className="w-full px-3.5 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-paper)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)] font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                One thing to improve
              </label>
              <input
                type="text"
                value={nextMonth.one_thing_to_improve || ''}
                onChange={(e) => setNextMonth({ ...nextMonth, one_thing_to_improve: e.target.value })}
                placeholder="e.g. Earlier sleep routine"
                className="w-full px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-paper)] text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                One thing to continue
              </label>
              <input
                type="text"
                value={nextMonth.one_thing_to_continue || ''}
                onChange={(e) => setNextMonth({ ...nextMonth, one_thing_to_continue: e.target.value })}
                placeholder="e.g. Daily hourly walks"
                className="w-full px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-paper)] text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                One thing to stop
              </label>
              <input
                type="text"
                value={nextMonth.one_thing_to_stop || ''}
                onChange={(e) => setNextMonth({ ...nextMonth, one_thing_to_stop: e.target.value })}
                placeholder="e.g. Phone before sleep"
                className="w-full px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-paper)] text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
              Important Dates & Deadlines
            </label>
            <input
              type="text"
              value={nextMonth.important_dates || ''}
              onChange={(e) => setNextMonth({ ...nextMonth, important_dates: e.target.value })}
              placeholder="e.g. Oct 15: Conference Submission, Oct 22: Exam"
              className="w-full px-3.5 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-paper)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
            />
          </div>
        </div>
      </div>

      {/* Save Floating Bar for easy submission */}
      <div className="sticky bottom-4 z-20 p-3 rounded-2xl bg-[var(--bg-paper)]/95 backdrop-blur-md border border-[var(--border-strong)] shadow-xl flex items-center justify-between print:hidden">
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <span>Editing {monthLabel} Report</span>
          <span>•</span>
          <span className="text-emerald-600 dark:text-emerald-400">Durable Supabase sync</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveReflection}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[var(--accent)] hover:opacity-90 text-[var(--accent-contrast)] text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Monthly Report</span>
          </button>
        </div>
      </div>
    </div>
  );
}
