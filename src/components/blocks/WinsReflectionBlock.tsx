'use client';

import React, { useState, useEffect } from 'react';
import { WinsReflectionContent } from '@/lib/types';
import { Trophy, TrendingUp, Heart, Plus, Trash2 } from 'lucide-react';

interface WinsReflectionBlockProps {
  content: WinsReflectionContent;
  onChange: (updatedContent: WinsReflectionContent) => void;
}

export function WinsReflectionBlock({ content, onChange }: WinsReflectionBlockProps) {
  const [data, setData] = useState<WinsReflectionContent>(
    content || {
      wins: [''],
      improvements: [''],
      gratitude: '',
    }
  );

  useEffect(() => {
    if (content) {
      setData(content);
    }
  }, [content]);

  const updateData = (next: WinsReflectionContent) => {
    setData(next);
    onChange(next);
  };

  const handleUpdateWin = (index: number, text: string) => {
    const updated = [...(data.wins || [])];
    updated[index] = text;
    updateData({ ...data, wins: updated });
  };

  const handleAddWin = () => {
    updateData({ ...data, wins: [...(data.wins || []), ''] });
  };

  const handleDeleteWin = (index: number) => {
    updateData({ ...data, wins: (data.wins || []).filter((_, i) => i !== index) });
  };

  const handleUpdateImprovement = (index: number, text: string) => {
    const updated = [...(data.improvements || [])];
    updated[index] = text;
    updateData({ ...data, improvements: updated });
  };

  const handleAddImprovement = () => {
    updateData({ ...data, improvements: [...(data.improvements || []), ''] });
  };

  const handleDeleteImprovement = (index: number) => {
    updateData({ ...data, improvements: (data.improvements || []).filter((_, i) => i !== index) });
  };

  return (
    <div className="journal-paper p-4 sm:p-6 space-y-5">
      <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-3">
        <Sparkles className="w-4 h-4 text-[var(--accent)]" />
        <h4 className="font-serif-aesthetic text-base sm:text-lg font-semibold text-[var(--text-primary)]">
          Evening Reflection & Growth
        </h4>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Today's Wins */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              <span>Today&apos;s Wins & Accomplishments</span>
            </span>
            <button
              type="button"
              onClick={handleAddWin}
              className="p-1 rounded text-xs text-[var(--accent)] hover:bg-[var(--bg-paper-hover)]"
              title="Add win"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-1.5">
            {(data.wins || []).map((win, idx) => (
              <div key={idx} className="flex items-center gap-2 group">
                <span className="text-xs text-[var(--accent)]">•</span>
                <input
                  type="text"
                  value={win}
                  onChange={(e) => handleUpdateWin(idx, e.target.value)}
                  placeholder="What went well today?..."
                  className="flex-1 text-xs py-1 px-2 rounded-lg bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
                <button
                  type="button"
                  onClick={() => handleDeleteWin(idx)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-[var(--text-muted)] hover:text-red-500"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Things to Improve */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
              <span>Areas for Tomorrow&apos;s Focus</span>
            </span>
            <button
              type="button"
              onClick={handleAddImprovement}
              className="p-1 rounded text-xs text-[var(--accent)] hover:bg-[var(--bg-paper-hover)]"
              title="Add improvement"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-1.5">
            {(data.improvements || []).map((imp, idx) => (
              <div key={idx} className="flex items-center gap-2 group">
                <span className="text-xs text-blue-500">•</span>
                <input
                  type="text"
                  value={imp}
                  onChange={(e) => handleUpdateImprovement(idx, e.target.value)}
                  placeholder="What will you refine tomorrow?..."
                  className="flex-1 text-xs py-1 px-2 rounded-lg bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
                <button
                  type="button"
                  onClick={() => handleDeleteImprovement(idx)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-[var(--text-muted)] hover:text-red-500"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Gratitude Statement */}
      <div className="pt-2 border-t border-[var(--border-color)] space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
          <Heart className="w-3.5 h-3.5 text-[var(--accent)] fill-[var(--accent)]" />
          <span>Daily Gratitude</span>
        </label>
        <textarea
          value={data.gratitude || ''}
          onChange={(e) => updateData({ ...data, gratitude: e.target.value })}
          placeholder="I am grateful for..."
          rows={2}
          className="w-full text-xs p-2.5 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] resize-none"
        />
      </div>
    </div>
  );
}

function Sparkles(props: any) {
  return (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  );
}
