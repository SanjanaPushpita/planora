'use client';

import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { ChallengeBlockContent } from '@/lib/types';
import { calculateChallengeProgress } from '@/lib/utils';
import { useAutosave } from '@/lib/hooks/useAutosave';
import { Flame, Trophy, Check, Calendar, Sparkles } from 'lucide-react';

interface ChallengeBlockProps {
  content: ChallengeBlockContent;
  onChange: (updatedContent: ChallengeBlockContent) => void;
}

export function ChallengeBlock({ content, onChange }: ChallengeBlockProps) {
  const [data, setData] = useState<ChallengeBlockContent>(
    content || {
      title: '30-Day Challenge',
      startDate: new Date().toISOString().split('T')[0],
      totalDays: 30,
      completedDays: [],
      notes: '',
    }
  );

  useAutosave(data, (latest) => {
    onChange(latest);
  });

  const totalDays = Math.max(1, data.totalDays || 30);
  const days = Array.from({ length: totalDays }, (_, i) => i + 1);

  const { completedCount, percentage, currentStreak } = calculateChallengeProgress(
    data.completedDays || [],
    totalDays
  );

  const handleToggleDay = (day: number) => {
    const currentCompleted = data.completedDays || [];
    const isCompleted = currentCompleted.includes(day);

    let updated: number[];
    if (isCompleted) {
      updated = currentCompleted.filter((d) => d !== day);
    } else {
      updated = [...currentCompleted, day].sort((a, b) => a - b);
      // Fire confetti if this completes the challenge or hits milestone
      if (updated.length === totalDays) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
    }

    setData((prev) => ({
      ...prev,
      completedDays: updated,
    }));
  };

  return (
    <div className="journal-paper p-6 sm:p-8 space-y-6 text-center border-2 border-[var(--border-strong)] relative overflow-hidden">
      {/* Decorative background circle */}
      <div className="absolute -top-16 -right-16 w-36 h-36 rounded-full bg-[var(--accent-soft)] opacity-40 pointer-events-none" />

      {/* Header inspired by Reference Image 0 ("NO SUGAR 30-DAY CHALLENGE") */}
      <div className="space-y-2 max-w-md mx-auto">
        <div className="flex items-center justify-center gap-2">
          <span className="text-2xl">🌸</span>
          <input
            type="text"
            value={data.title}
            onChange={(e) => setData((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="Challenge Name (e.g. No Sugar, Morning Run)..."
            className="font-serif-aesthetic text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)] text-center bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-[var(--accent)] rounded px-2"
          />
        </div>

        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
          {totalDays}-DAY CHALLENGE
        </p>

        {/* Progress Bar & Stats */}
        <div className="pt-3 space-y-2">
          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] font-medium px-1">
            <span>Day {completedCount} of {totalDays}</span>
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              {currentStreak} Day Streak
            </span>
            <span className="font-semibold text-[var(--accent)]">{percentage}% Done</span>
          </div>

          <div className="w-full h-2 rounded-full bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] overflow-hidden">
            <div
              className="h-full bg-[var(--accent)] transition-all duration-300 rounded-full"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Numbered Day Bubbles Grid (Inspired directly by Reference 0 soft rounded bubbles) */}
      <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-10 gap-3 sm:gap-4 max-w-2xl mx-auto pt-2">
        {days.map((day) => {
          const isDone = (data.completedDays || []).includes(day);
          return (
            <button
              key={day}
              type="button"
              onClick={() => handleToggleDay(day)}
              className={`aspect-square rounded-2xl flex flex-col items-center justify-center font-serif-aesthetic text-base sm:text-lg font-semibold border-2 transition-all duration-200 active:scale-95 shadow-2xs ${
                isDone
                  ? 'bg-[var(--accent)] text-[var(--accent-contrast)] border-[var(--accent)] shadow-md scale-105'
                  : 'bg-[var(--bubble-bg)] text-[var(--text-primary)] border-[var(--bubble-border)] hover:border-[var(--accent)] hover:bg-[var(--bg-paper-hover)]'
              }`}
              title={`Day ${day}: ${isDone ? 'Completed' : 'Click to complete'}`}
            >
              <span>{day}</span>
              {isDone && <Check className="w-3.5 h-3.5 stroke-[3] mt-0.5" />}
            </button>
          );
        })}
      </div>

      {/* Footer Notes & Start Date */}
      <div className="pt-4 max-w-md mx-auto space-y-2 border-t border-[var(--border-color)]">
        <div className="flex items-center justify-center gap-2 text-xs text-[var(--text-muted)]">
          <Calendar className="w-3.5 h-3.5" />
          <span>Started on {data.startDate || 'today'}</span>
        </div>
        <input
          type="text"
          value={data.notes || ''}
          onChange={(e) => setData((prev) => ({ ...prev, notes: e.target.value }))}
          placeholder="Challenge guidelines, rules, or motivational note..."
          className="w-full text-center text-xs text-[var(--text-secondary)] bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-[var(--accent)] rounded py-1"
        />
      </div>
    </div>
  );
}
