'use client';

import React, { useState, useEffect } from 'react';
import { HabitBlockContent, HabitItem } from '@/lib/types';
import { generateId, getDaysInMonth, MONTH_NAMES, calculateHabitStreak } from '@/lib/utils';
import { 
  Plus, 
  Trash2, 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  Flame, 
  Trophy 
} from 'lucide-react';

interface HabitGridBlockProps {
  content: HabitBlockContent;
  onChange: (updatedContent: HabitBlockContent) => void;
}

export function HabitGridBlock({ content, onChange }: HabitGridBlockProps) {
  const now = new Date();
  const [data, setData] = useState<HabitBlockContent>(
    content || {
      month: now.getMonth(),
      year: now.getFullYear(),
      habits: [],
      notes: '',
    }
  );

  const [newHabitName, setNewHabitName] = useState('');

  useEffect(() => {
    if (content) {
      setData(content);
    }
  }, [content]);

  const updateData = (updater: (prev: HabitBlockContent) => HabitBlockContent) => {
    setData((prev) => {
      const next = updater(prev);
      onChange(next);
      return next;
    });
  };

  const daysInMonth = getDaysInMonth(data.year, data.month);
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const getDateKey = (day: number) => {
    const m = String(data.month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${data.year}-${m}-${d}`;
  };

  const handleMonthChange = (delta: number) => {
    let newMonth = data.month + delta;
    let newYear = data.year;
    if (newMonth < 0) {
      newMonth = 11;
      newYear -= 1;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear += 1;
    }
    updateData((prev) => ({ ...prev, month: newMonth, year: newYear }));
  };

  const handleToggleCell = (habitId: string, day: number) => {
    const dateKey = getDateKey(day);
    updateData((prev) => ({
      ...prev,
      habits: (prev.habits || []).map((h) => {
        if (h.id !== habitId) return h;
        const currentCompleted = Boolean(h.completedDates?.[dateKey]);
        const updatedDates = { ...(h.completedDates || {}) };
        if (currentCompleted) {
          delete updatedDates[dateKey];
        } else {
          updatedDates[dateKey] = true;
        }
        return { ...h, completedDates: updatedDates };
      }),
    }));
  };

  const handleUpdateHabitName = (habitId: string, name: string) => {
    updateData((prev) => ({
      ...prev,
      habits: (prev.habits || []).map((h) => (h.id === habitId ? { ...h, name } : h)),
    }));
  };

  const handleDeleteHabit = (habitId: string) => {
    updateData((prev) => ({
      ...prev,
      habits: (prev.habits || []).filter((h) => h.id !== habitId),
    }));
  };

  const handleAddHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;

    const newHabit: HabitItem = {
      id: generateId(),
      name: newHabitName.trim(),
      order: (data.habits || []).length,
      completedDates: {},
    };

    updateData((prev) => ({
      ...prev,
      habits: [...(prev.habits || []), newHabit],
    }));
    setNewHabitName('');
  };

  // Monthly stats calculations
  const habits = data.habits || [];
  const totalPossibleChecks = habits.length * daysInMonth;
  let totalCompletedChecks = 0;

  const habitStats = habits.map((h) => {
    let completedThisMonth = 0;
    daysArray.forEach((d) => {
      if (h.completedDates?.[getDateKey(d)]) {
        completedThisMonth++;
      }
    });
    totalCompletedChecks += completedThisMonth;
    const percentage = daysInMonth > 0 ? Math.round((completedThisMonth / daysInMonth) * 100) : 0;
    const { currentStreak, longestStreak } = calculateHabitStreak(h.completedDates || {});

    return {
      id: h.id,
      completedThisMonth,
      percentage,
      currentStreak,
      longestStreak,
    };
  });

  const overallMonthlyPercentage = totalPossibleChecks > 0
    ? Math.round((totalCompletedChecks / totalPossibleChecks) * 100)
    : 0;

  return (
    <div className="journal-paper p-4 sm:p-6 space-y-6 overflow-hidden">
      {/* Botanical Header & Month Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-color)] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🌿</span>
            <h3 className="font-serif-aesthetic text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              Habit Tracker
            </h3>
          </div>
          <p className="font-serif-aesthetic italic text-xs text-[var(--text-secondary)] mt-0.5">
            Consistent habits create a brighter you • Small steps, big changes
          </p>
        </div>

        {/* Month & Year Navigator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-[var(--bg-paper-subtle)] p-1 rounded-xl border border-[var(--border-color)]">
            <button
              type="button"
              onClick={() => handleMonthChange(-1)}
              className="p-1 rounded-lg hover:bg-[var(--bg-paper-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-serif-aesthetic font-semibold text-xs sm:text-sm px-2 text-[var(--text-primary)] min-w-[110px] text-center">
              {MONTH_NAMES[data.month]} {data.year}
            </span>
            <button
              type="button"
              onClick={() => handleMonthChange(1)}
              className="p-1 rounded-lg hover:bg-[var(--bg-paper-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Overall Monthly Score Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--accent-soft)] border border-[var(--border-strong)] text-xs font-semibold text-[var(--accent)]">
            <Trophy className="w-3.5 h-3.5" />
            <span>{overallMonthlyPercentage}% Monthly</span>
          </div>
        </div>
      </div>

      {/* Habit Matrix Grid */}
      <div className="overflow-x-auto pb-2 -mx-4 sm:mx-0 px-4 sm:px-0">
        <table className="w-full border-collapse text-left min-w-[700px]">
          <thead>
            <tr className="border-b border-[var(--border-color)] text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              <th className="py-2 px-3 min-w-[180px]">Habit Name</th>
              <th className="py-2 px-2 text-center w-14">Rate</th>
              <th className="py-2 px-2 text-center w-12" title="Current streak">
                <Flame className="w-3.5 h-3.5 mx-auto text-amber-500" />
              </th>
              {daysArray.map((day) => (
                <th
                  key={day}
                  className="py-2 px-1 text-center font-mono text-[10px] w-6 min-w-[24px]"
                >
                  {day}
                </th>
              ))}
              <th className="py-2 px-2 w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {habits.map((habit) => {
              const stat = habitStats.find((s) => s.id === habit.id);
              return (
                <tr
                  key={habit.id}
                  className="hover:bg-[var(--bg-paper-hover)]/60 transition-colors group"
                >
                  {/* Habit Name Input */}
                  <td className="py-2 px-2">
                    <input
                      type="text"
                      value={habit.name}
                      onChange={(e) => handleUpdateHabitName(habit.id, e.target.value)}
                      placeholder="Habit title..."
                      className="w-full text-xs font-medium text-[var(--text-primary)] bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-[var(--accent)] rounded px-1.5 py-1"
                    />
                  </td>

                  {/* Completion Rate Badge */}
                  <td className="py-2 px-2 text-center">
                    <span className="text-[11px] font-mono font-medium text-[var(--text-secondary)]">
                      {stat?.percentage}%
                    </span>
                  </td>

                  {/* Streak Count */}
                  <td className="py-2 px-2 text-center">
                    <span className="text-[11px] font-mono font-semibold text-amber-600 dark:text-amber-400">
                      {stat?.currentStreak || 0}d
                    </span>
                  </td>

                  {/* Day Checkoff Bubbles */}
                  {daysArray.map((day) => {
                    const isChecked = Boolean(habit.completedDates?.[getDateKey(day)]);
                    return (
                      <td key={day} className="py-1 px-0.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleCell(habit.id, day)}
                          className={`w-5 h-5 rounded-full flex items-center justify-center mx-auto border transition-all text-[10px] cursor-pointer ${
                            isChecked
                              ? 'bg-[var(--bubble-active)] border-[var(--bubble-active)] text-white shadow-2xs scale-105'
                              : 'bg-[var(--bubble-bg)] border-[var(--bubble-border)] hover:border-[var(--bubble-active)] text-[var(--text-muted)] hover:scale-105'
                          }`}
                          title={`Day ${day}: ${isChecked ? 'Completed' : 'Click to complete'}`}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[2.5]" />}
                        </button>
                      </td>
                    );
                  })}

                  {/* Delete Habit */}
                  <td className="py-2 px-1 text-center">
                    <button
                      type="button"
                      onClick={() => handleDeleteHabit(habit.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-[var(--text-muted)] hover:text-red-500 rounded transition-opacity cursor-pointer"
                      title="Delete habit"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}

            {habits.length === 0 && (
              <tr>
                <td
                  colSpan={daysInMonth + 4}
                  className="py-8 text-center text-xs text-[var(--text-muted)] italic"
                >
                  No habits added yet. Create your first habit below!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add New Habit Form */}
      <form onSubmit={handleAddHabit} className="flex items-center gap-2 pt-2 border-t border-[var(--border-color)]">
        <input
          type="text"
          value={newHabitName}
          onChange={(e) => setNewHabitName(e.target.value)}
          placeholder="Add custom habit (e.g. Morning Yoga, Read 20 pages, Skincare, No Sugar)..."
          className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
        />
        <button
          type="submit"
          disabled={!newHabitName.trim()}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-contrast)] text-xs font-medium transition-colors disabled:opacity-40 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Habit</span>
        </button>
      </form>

      {/* Habit Notes Section */}
      <div className="pt-2">
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
          Monthly Habit Notes & Intentions
        </label>
        <textarea
          value={data.notes || ''}
          onChange={(e) => updateData((prev) => ({ ...prev, notes: e.target.value }))}
          placeholder="Reflections on your consistency, what went well, and what to refine next month..."
          rows={2}
          className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] resize-none"
        />
      </div>
    </div>
  );
}
