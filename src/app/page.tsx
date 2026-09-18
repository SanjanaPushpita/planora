'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePlanner } from '@/lib/storage';
import { PageBlock, HabitBlockContent, ChallengeBlockContent, ChecklistBlockContent } from '@/lib/types';
import { formatDate, getTodayDateString } from '@/lib/utils';
import { NewPageModal } from '@/components/modals/NewPageModal';
import { 
  Sparkles, 
  Calendar as CalendarIcon, 
  Check, 
  Flame, 
  GraduationCap, 
  BookOpen, 
  Plus, 
  CheckSquare, 
  Layout, 
  Clock, 
  Heart,
  ChevronRight,
  Droplet,
  Coffee,
  Sun,
  Sunset,
  ArrowUpRight
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { profile, pages, storage, createPage, updatePage } = usePlanner();

  const [isNewPageModalOpen, setIsNewPageModalOpen] = useState(false);
  const [modalDefaultType, setModalDefaultType] = useState<any>('daily');
  const [quickNote, setQuickNote] = useState('');
  const [todayHabits, setTodayHabits] = useState<{ blockId: string; habitId: string; name: string; isCompleted: boolean }[]>([]);
  const [todayTasks, setTodayTasks] = useState<{ blockId: string; taskId: string; text: string; completed: boolean }[]>([]);
  const [activeChallenges, setActiveChallenges] = useState<{ id: string; title: string; totalDays: number; completedCount: number; percentage: number }[]>([]);

  const todayStr = getTodayDateString();
  const todayPlanner = pages.find((p) => p.page_type === 'daily' && p.date === todayStr);

  // Load scratchpad note
  useEffect(() => {
    const saved = localStorage.getItem('planora_quick_scratchpad');
    if (saved) setQuickNote(saved);
  }, []);

  const handleQuickNoteChange = (text: string) => {
    setQuickNote(text);
    localStorage.setItem('planora_quick_scratchpad', text);
  };

  // Load dashboard widgets data
  useEffect(() => {
    async function loadDashboardData() {
      const habitsList: { blockId: string; habitId: string; name: string; isCompleted: boolean }[] = [];
      const tasksList: { blockId: string; taskId: string; text: string; completed: boolean }[] = [];
      const challengesList: { id: string; title: string; totalDays: number; completedCount: number; percentage: number }[] = [];

      for (const p of pages) {
        const blocks = await storage.getBlocksByPageId(p.id);

        for (const b of blocks) {
          // Habits for today
          if (b.type === 'habit_matrix') {
            const content = b.content as HabitBlockContent;
            if (content?.habits) {
              content.habits.forEach((h) => {
                habitsList.push({
                  blockId: b.id,
                  habitId: h.id,
                  name: h.name,
                  isCompleted: Boolean(h.completedDates?.[todayStr]),
                });
              });
            }
          }

          // Tasks for today's planner or active checklist
          if (b.type === 'checklist' && (p.id === todayPlanner?.id || p.page_type === 'daily' || p.page_type === 'checklist')) {
            const content = b.content as ChecklistBlockContent;
            if (content?.items) {
              content.items.slice(0, 5).forEach((it) => {
                tasksList.push({
                  blockId: b.id,
                  taskId: it.id,
                  text: it.text,
                  completed: it.completed,
                });
              });
            }
          }

          // Active challenges
          if (b.type === 'challenge_grid') {
            const content = b.content as ChallengeBlockContent;
            const completedCount = (content.completedDays || []).length;
            const totalDays = content.totalDays || 30;
            const percentage = totalDays > 0 ? Math.round((completedCount / totalDays) * 100) : 0;
            challengesList.push({
              id: p.id,
              title: content.title || p.title,
              totalDays,
              completedCount,
              percentage,
            });
          }
        }
      }

      setTodayHabits(habitsList.slice(0, 6));
      setTodayTasks(tasksList.slice(0, 6));
      setActiveChallenges(challengesList.slice(0, 3));
    }

    loadDashboardData();
  }, [pages, storage, todayPlanner, todayStr]);

  // Toggle habit directly on dashboard
  const handleToggleTodayHabit = async (blockId: string, habitId: string, currentCompleted: boolean) => {
    // Find page block and toggle
    for (const p of pages) {
      const blocks = await storage.getBlocksByPageId(p.id);
      const b = blocks.find((item) => item.id === blockId);
      if (b && b.type === 'habit_matrix') {
        const content = b.content as HabitBlockContent;
        const updatedHabits = content.habits.map((h) => {
          if (h.id !== habitId) return h;
          const updatedDates = { ...(h.completedDates || {}) };
          if (currentCompleted) {
            delete updatedDates[todayStr];
          } else {
            updatedDates[todayStr] = true;
          }
          return { ...h, completedDates: updatedDates };
        });

        const updatedBlock: PageBlock = {
          ...b,
          content: { ...content, habits: updatedHabits },
        };
        await storage.saveBlock(updatedBlock);

        setTodayHabits((prev) =>
          prev.map((it) => (it.habitId === habitId ? { ...it, isCompleted: !currentCompleted } : it))
        );
        break;
      }
    }
  };

  // Toggle task directly on dashboard
  const handleToggleTodayTask = async (blockId: string, taskId: string, currentCompleted: boolean) => {
    for (const p of pages) {
      const blocks = await storage.getBlocksByPageId(p.id);
      const b = blocks.find((item) => item.id === blockId);
      if (b && b.type === 'checklist') {
        const content = b.content as ChecklistBlockContent;
        const updatedItems = content.items.map((it) =>
          it.id === taskId ? { ...it, completed: !currentCompleted } : it
        );
        const updatedBlock: PageBlock = {
          ...b,
          content: { ...content, items: updatedItems },
        };
        await storage.saveBlock(updatedBlock);

        setTodayTasks((prev) =>
          prev.map((it) => (it.taskId === taskId ? { ...it, completed: !currentCompleted } : it))
        );
        break;
      }
    }
  };

  const handleOpenOrCreateTodayPlanner = async () => {
    if (todayPlanner) {
      router.push(`/pages/${todayPlanner.id}`);
    } else {
      const newP = await createPage({
        title: `Daily Planner - ${todayStr}`,
        page_type: 'daily',
        date: todayStr,
      });
      router.push(`/pages/${newP.id}`);
    }
  };

  const quickActionTemplates = [
    { label: 'Daily Planner', icon: Sparkles, type: 'daily' },
    { label: 'Habit Tracker', icon: Layout, type: 'habit' },
    { label: 'Study Tracker', icon: GraduationCap, type: 'study' },
    { label: 'Challenge', icon: Flame, type: 'challenge' },
    { label: 'Checklist', icon: CheckSquare, type: 'checklist' },
    { label: 'Journal / Notes', icon: BookOpen, type: 'journal' },
  ] as const;

  return (
    <div className="space-y-8 pb-20 max-w-5xl mx-auto">
      {/* Aesthetic Greeting Banner inspired by Reference 2 */}
      <div className="journal-paper p-6 sm:p-8 relative overflow-hidden border-2 border-[var(--border-strong)]">
        <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full bg-[var(--accent-soft)] opacity-40 pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>{formatDate(todayStr, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </div>

            <h2 className="font-serif-aesthetic text-2xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)]">
              Welcome to your Sanctuary, {profile.name}
            </h2>

            <p className="font-serif-aesthetic italic text-sm text-[var(--text-secondary)] flex items-center gap-2">
              <span>&ldquo;{profile.tagline || 'Consistent habits create a brighter you.'}&rdquo;</span>
              <Heart className="w-3.5 h-3.5 text-[var(--accent)] fill-[var(--accent)] opacity-80 shrink-0" />
            </p>
          </div>

          {/* Today's Planner CTA */}
          <div className="shrink-0">
            <button
              onClick={handleOpenOrCreateTodayPlanner}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-contrast)] text-sm font-semibold shadow-md hover:scale-[1.02] active:scale-98 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>{todayPlanner ? "Open Today's Planner" : "Start Today's Planner"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Create Action Bar */}
      <div>
        <span className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-3">
          Quick Create Tools
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
          {quickActionTemplates.map((tmpl) => {
            const Icon = tmpl.icon;
            return (
              <button
                key={tmpl.type}
                onClick={() => {
                  setModalDefaultType(tmpl.type);
                  setIsNewPageModalOpen(true);
                }}
                className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-[var(--bg-paper)] hover:bg-[var(--bg-paper-hover)] border border-[var(--border-color)] hover:border-[var(--accent)] transition-all shadow-2xs group"
              >
                <div className="p-2 rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] mb-2 group-hover:scale-110 transition-transform">
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-xs font-medium text-[var(--text-primary)] text-center">
                  + {tmpl.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive Main Dashboard Grid: Tasks & Habits for Today */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Today's Focus Tasks Widget */}
        <div className="journal-paper p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-[var(--accent)]" />
                <h3 className="font-serif-aesthetic font-bold text-base text-[var(--text-primary)]">
                  Today&apos;s Focus & Tasks
                </h3>
              </div>
              {todayPlanner && (
                <a
                  href={`/pages/${todayPlanner.id}`}
                  className="text-xs text-[var(--accent)] hover:underline flex items-center gap-0.5"
                >
                  <span>Full agenda</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            <div className="space-y-2 pt-3">
              {todayTasks.map((t) => (
                <div
                  key={t.taskId}
                  className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-[var(--bg-paper-hover)] transition-colors"
                >
                  <button
                    onClick={() => handleToggleTodayTask(t.blockId, t.taskId, t.completed)}
                    className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                      t.completed
                        ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                        : 'bg-[var(--bg-paper)] border-[var(--border-strong)]'
                    }`}
                  >
                    {t.completed && <Check className="w-3 h-3 stroke-[3]" />}
                  </button>
                  <span
                    className={`text-xs ${
                      t.completed ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'
                    }`}
                  >
                    {t.text}
                  </span>
                </div>
              ))}

              {todayTasks.length === 0 && (
                <div className="py-6 text-center text-xs text-[var(--text-muted)] italic">
                  No tasks scheduled for today yet.
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleOpenOrCreateTodayPlanner}
            className="w-full py-2 rounded-xl bg-[var(--bg-paper-subtle)] hover:bg-[var(--bg-paper-hover)] text-xs font-medium text-[var(--text-secondary)] border border-[var(--border-color)] transition-colors"
          >
            + Add Tasks in Day Planner
          </button>
        </div>

        {/* Habits Today Widget (Instant 1-Click Checkoff) */}
        <div className="journal-paper p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <div className="flex items-center gap-2">
                <span className="text-base">🌿</span>
                <h3 className="font-serif-aesthetic font-bold text-base text-[var(--text-primary)]">
                  Habits for Today
                </h3>
              </div>
              <a
                href="/habits"
                className="text-xs text-[var(--accent)] hover:underline flex items-center gap-0.5"
              >
                <span>Full Matrix</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="space-y-2 pt-3">
              {todayHabits.map((h) => (
                <div
                  key={h.habitId}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-[var(--bg-paper-hover)] border border-[var(--border-color)] transition-colors"
                >
                  <span className="text-xs font-medium text-[var(--text-primary)] truncate max-w-[200px]">
                    {h.name}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleToggleTodayHabit(h.blockId, h.habitId, h.isCompleted)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      h.isCompleted
                        ? 'bg-[var(--bubble-active)] text-white shadow-2xs'
                        : 'bg-[var(--bubble-bg)] text-[var(--text-secondary)] border border-[var(--bubble-border)] hover:border-[var(--bubble-active)]'
                    }`}
                  >
                    {h.isCompleted ? (
                      <>
                        <Check className="w-3 h-3 stroke-[3]" />
                        <span>Completed</span>
                      </>
                    ) : (
                      <span>Mark Done</span>
                    )}
                  </button>
                </div>
              ))}

              {todayHabits.length === 0 && (
                <div className="py-6 text-center text-xs text-[var(--text-muted)] italic">
                  No habits added yet. Create a habit tracker to begin!
                </div>
              )}
            </div>
          </div>

          <a
            href="/habits"
            className="w-full py-2 rounded-xl bg-[var(--bg-paper-subtle)] hover:bg-[var(--bg-paper-hover)] text-xs font-medium text-[var(--text-secondary)] border border-[var(--border-color)] text-center transition-colors block"
          >
            Manage All Habits →
          </a>
        </div>
      </div>

      {/* Active Challenges & Quick Notes Scratchpad */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Active Challenges Spotlight */}
        <div className="journal-paper p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-500" />
              <h3 className="font-serif-aesthetic font-bold text-base text-[var(--text-primary)]">
                Active Challenges
              </h3>
            </div>
            <a
              href="/challenges"
              className="text-xs text-[var(--accent)] hover:underline flex items-center gap-0.5"
            >
              <span>View all</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="space-y-3 pt-1">
            {activeChallenges.map((c) => (
              <a
                key={c.id}
                href={`/pages/${c.id}`}
                className="block p-3.5 rounded-2xl bg-[var(--bg-paper-subtle)] hover:bg-[var(--bg-paper-hover)] border border-[var(--border-color)] transition-all group"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)]">
                    {c.title}
                  </span>
                  <span className="text-xs font-bold text-[var(--accent)]">
                    {c.percentage}%
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[var(--bg-paper)] overflow-hidden">
                  <div
                    className="h-full bg-[var(--accent)] rounded-full transition-all"
                    style={{ width: `${c.percentage}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] mt-1.5">
                  <span>Day {c.completedCount} of {c.totalDays}</span>
                  <span>Open tracker →</span>
                </div>
              </a>
            ))}

            {activeChallenges.length === 0 && (
              <div className="py-6 text-center text-xs text-[var(--text-muted)] italic">
                No active challenges. Start a 30-day challenge!
              </div>
            )}
          </div>
        </div>

        {/* Quick Scratchpad / Fleet Notes */}
        <div className="journal-paper p-5 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[var(--accent)]" />
              <h3 className="font-serif-aesthetic font-bold text-base text-[var(--text-primary)]">
                Daily Scratchpad & Thoughts
              </h3>
            </div>
            <span className="text-[10px] text-[var(--text-muted)]">
              Auto-saved
            </span>
          </div>

          <textarea
            value={quickNote}
            onChange={(e) => handleQuickNoteChange(e.target.value)}
            placeholder="Jot down a quick thought, sudden inspiration, phone number, or reminder..."
            rows={5}
            className="w-full flex-1 p-3 text-xs rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] resize-none"
          />

          <p className="text-[11px] text-[var(--text-muted)] italic">
            Saved automatically in your private local session.
          </p>
        </div>
      </div>

      <NewPageModal
        isOpen={isNewPageModalOpen}
        onClose={() => setIsNewPageModalOpen(false)}
        defaultType={modalDefaultType}
      />
    </div>
  );
}
