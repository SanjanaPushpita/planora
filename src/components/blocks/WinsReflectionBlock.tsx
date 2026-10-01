'use client';

import React, { useState, useEffect } from 'react';
import { WinsReflectionContent } from '@/lib/types';
import { Trophy, TrendingUp, Heart, Plus, Trash2, Sparkles } from 'lucide-react';
import { RichTextEditor } from '../ui/RichTextEditor';

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
        <div className="space-y-3">
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
          <div className="space-y-2">
            {(data.wins || []).map((win, idx) => (
              <div key={idx} className="flex items-start gap-2 group">
                <span className="text-xs text-[var(--accent)] mt-2 font-bold">•</span>
                <div className="flex-1">
                  <RichTextEditor
                    value={win}
                    onChange={(text) => handleUpdateWin(idx, text)}
                    placeholder="What went well today?..."
                    minHeight="38px"
                  />
                </div>
                {(data.wins || []).length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleDeleteWin(idx)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-[var(--text-muted)] hover:text-red-500 mt-2 transition-opacity"
                    title="Delete entry"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Things to Improve */}
        <div className="space-y-3">
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
          <div className="space-y-2">
            {(data.improvements || []).map((imp, idx) => (
              <div key={idx} className="flex items-start gap-2 group">
                <span className="text-xs text-blue-500 mt-2 font-bold">•</span>
                <div className="flex-1">
                  <RichTextEditor
                    value={imp}
                    onChange={(text) => handleUpdateImprovement(idx, text)}
                    placeholder="What will you refine tomorrow?..."
                    minHeight="38px"
                  />
                </div>
                {(data.improvements || []).length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleDeleteImprovement(idx)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-[var(--text-muted)] hover:text-red-500 mt-2 transition-opacity"
                    title="Delete entry"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Gratitude Statement */}
      <div className="pt-3 border-t border-[var(--border-color)] space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
          <Heart className="w-3.5 h-3.5 text-[var(--accent)] fill-[var(--accent)]" />
          <span>Daily Gratitude</span>
        </label>
        <RichTextEditor
          value={data.gratitude || ''}
          onChange={(text) => updateData({ ...data, gratitude: text })}
          placeholder="I am grateful for..."
          minHeight="56px"
        />
      </div>
    </div>
  );
}

