'use client';

import React, { useState } from 'react';
import { MoodSleepContent } from '@/lib/types';
import { useAutosave } from '@/lib/hooks/useAutosave';
import { Moon, Star } from 'lucide-react';

interface MoodSleepBlockProps {
  content: MoodSleepContent;
  onChange: (updatedContent: MoodSleepContent) => void;
}

const MOODS = [
  { id: 'great', label: 'Great', emoji: '✨' },
  { id: 'good', label: 'Good', emoji: '🌸' },
  { id: 'okay', label: 'Okay', emoji: '🍃' },
  { id: 'tired', label: 'Tired', emoji: '☕' },
  { id: 'stressed', label: 'Stressed', emoji: '🌧️' },
] as const;

export function MoodSleepBlock({ content, onChange }: MoodSleepBlockProps) {
  const [data, setData] = useState<MoodSleepContent>(
    content || {
      date: new Date().toISOString().split('T')[0],
      mood: 'good',
      sleepHours: 8,
      sleepQuality: 4,
      notes: '',
    }
  );

  useAutosave(data, (latest) => {
    onChange(latest);
  });

  return (
    <div className="journal-paper p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Mood Section */}
      <div className="space-y-3">
        <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
          Today&apos;s Mood & Energy
        </label>
        <div className="flex flex-wrap gap-2">
          {MOODS.map((m) => {
            const isSelected = data.mood === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setData((prev) => ({ ...prev, mood: m.id }))}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                  isSelected
                    ? 'bg-[var(--accent)] text-[var(--accent-contrast)] border-[var(--accent)] shadow-2xs scale-105'
                    : 'bg-[var(--bg-paper-subtle)] text-[var(--text-primary)] border-[var(--border-color)] hover:bg-[var(--bg-paper-hover)]'
                }`}
              >
                <span>{m.emoji}</span>
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>
        <input
          type="text"
          value={data.notes || ''}
          onChange={(e) => setData((prev) => ({ ...prev, notes: e.target.value }))}
          placeholder="Mindset, energy level, or feelings..."
          className="w-full px-3 py-1.5 text-xs rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
        />
      </div>

      {/* Sleep Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
            <Moon className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Sleep Duration & Quality</span>
          </label>
          <span className="text-xs font-mono font-semibold text-[var(--accent)]">
            {data.sleepHours || 0} Hours
          </span>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="range"
            min="3"
            max="12"
            step="0.5"
            value={data.sleepHours || 7.5}
            onChange={(e) => setData((prev) => ({ ...prev, sleepHours: parseFloat(e.target.value) }))}
            className="flex-1 accent-[var(--accent)] cursor-pointer"
          />
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-[var(--text-secondary)]">Rest Quality:</span>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setData((prev) => ({ ...prev, sleepQuality: star }))}
                className="p-1 hover:scale-110 transition-transform"
                title={`Quality: ${star} of 5`}
              >
                <Star
                  className={`w-4 h-4 ${
                    star <= (data.sleepQuality || 0)
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-[var(--text-muted)]'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
