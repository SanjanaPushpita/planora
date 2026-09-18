'use client';

import React, { useState } from 'react';
import { BlockType } from '@/lib/types';
import { 
  Plus, 
  Heading, 
  AlignLeft, 
  CheckSquare, 
  Clock, 
  Layout, 
  GraduationCap, 
  Flame, 
  Droplet, 
  Smile, 
  Utensils, 
  Sparkles, 
  Quote, 
  Minus,
  Heart,
  X
} from 'lucide-react';

interface AddBlockMenuProps {
  onAddBlock: (type: BlockType) => void;
  className?: string;
}

interface BlockOption {
  type: BlockType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const BLOCK_OPTIONS: BlockOption[] = [
  { type: 'checklist', label: 'To-Do / Checklist', description: 'Reorderable tasks with priorities & checkmarks', icon: CheckSquare },
  { type: 'schedule', label: 'Daily Schedule', description: 'Time-block agenda with hourly activities', icon: Clock },
  { type: 'habit_matrix', label: 'Habit Tracker Matrix', description: 'Interactive 31-day habit calendar matrix', icon: Layout },
  { type: 'challenge_grid', label: 'Challenge Tracker', description: 'Numbered bubble cards for 30-day goals', icon: Flame },
  { type: 'study_log', label: 'Study & Research Log', description: 'Course topics, targets, actuals, and notes', icon: GraduationCap },
  { type: 'water_tracker', label: 'Water Hydration', description: 'Daily water glasses tracker with 1-click logging', icon: Droplet },
  { type: 'mood_sleep', label: 'Mood & Sleep', description: 'Daily mood selector and sleep hours tracker', icon: Smile },
  { type: 'meal_planner', label: 'Meals & Nutrition', description: 'Breakfast, lunch, dinner, and snack notes', icon: Utensils },
  { type: 'wins_reflection', label: 'Wins & Reflection', description: 'Celebrate achievements and note tomorrow improvements', icon: Sparkles },
  { type: 'paragraph', label: 'Text / Journal', description: 'Freeform notes, thoughts, and reflections', icon: AlignLeft },
  { type: 'heading', label: 'Heading', description: 'Section headers (H1, H2, H3)', icon: Heading },
  { type: 'quote', label: 'Inspirational Quote', description: 'Editorial callout quote with author', icon: Quote },
  { type: 'divider', label: 'Decorative Divider', description: 'Delicate botanical or heart line divider', icon: Minus },
  { type: 'period_tracker', label: 'Period Tracker', description: 'Cycle calendar, symptoms, flow, and notes', icon: Heart },
];

export function AddBlockMenu({ onAddBlock, className }: AddBlockMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`relative ${className || ''}`}>
      {!isOpen ? (
        <div className="flex items-center justify-center my-4 group">
          <div className="h-px bg-[var(--border-color)] group-hover:bg-[var(--accent)] flex-1 transition-colors" />
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--bg-paper)] hover:bg-[var(--accent-soft)] border border-[var(--border-color)] hover:border-[var(--accent)] text-xs text-[var(--text-secondary)] hover:text-[var(--accent)] transition-all shadow-2xs group-hover:scale-105"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="font-medium">Add Section / Block</span>
          </button>
          <div className="h-px bg-[var(--border-color)] group-hover:bg-[var(--accent)] flex-1 transition-colors" />
        </div>
      ) : (
        <div className="my-4 p-4 journal-paper border border-[var(--border-strong)] shadow-xl animate-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--border-color)]">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              Choose a block to insert
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-paper-hover)]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {BLOCK_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => {
                    onAddBlock(opt.type);
                    setIsOpen(false);
                  }}
                  className="flex items-start gap-2.5 p-2.5 rounded-xl text-left hover:bg-[var(--bg-paper-hover)] border border-transparent hover:border-[var(--border-color)] transition-all group"
                >
                  <div className="p-2 rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] shrink-0 group-hover:scale-110 transition-transform">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)]">
                      {opt.label}
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)] line-clamp-1">
                      {opt.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
