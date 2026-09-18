'use client';

import React, { useState, useEffect } from 'react';
import { usePlanner } from '@/lib/storage';
import { PageBlock, HabitBlockContent } from '@/lib/types';
import { HabitGridBlock } from '@/components/blocks/HabitGridBlock';
import { NewPageModal } from '@/components/modals/NewPageModal';
import { Plus, Layout, Sparkles } from 'lucide-react';

export default function HabitHubPage() {
  const { storage, pages } = usePlanner();
  const [habitBlocks, setHabitBlocks] = useState<{ pageId: string; pageTitle: string; block: PageBlock<'habit_matrix'> }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNewPageModalOpen, setIsNewPageModalOpen] = useState(false);

  useEffect(() => {
    async function loadHabits() {
      const results: { pageId: string; pageTitle: string; block: PageBlock<'habit_matrix'> }[] = [];
      for (const p of pages) {
        const blocks = await storage.getBlocksByPageId(p.id);
        const hb = blocks.filter((b): b is PageBlock<'habit_matrix'> => b.type === 'habit_matrix');
        for (const block of hb) {
          results.push({ pageId: p.id, pageTitle: p.title, block });
        }
      }
      setHabitBlocks(results);
      setLoading(false);
    }
    loadHabits();
  }, [storage, pages]);

  const handleUpdateBlock = async (pageId: string, updatedBlock: PageBlock<'habit_matrix'>) => {
    await storage.saveBlock(updatedBlock);
    setHabitBlocks((prev) =>
      prev.map((item) => (item.block.id === updatedBlock.id ? { ...item, block: updatedBlock } : item))
    );
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-color)] pb-4">
        <div>
          <h2 className="font-serif-aesthetic text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
            Habit Tracking Hub
          </h2>
          <p className="font-serif-aesthetic italic text-xs text-[var(--text-secondary)] mt-0.5">
            Consistent small actions transform into lifelong achievements
          </p>
        </div>

        <button
          onClick={() => setIsNewPageModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-contrast)] text-xs font-semibold shadow-xs transition-transform active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>New Habit Tracker</span>
        </button>
      </div>

      {/* Habit Blocks */}
      {loading ? (
        <div className="py-20 text-center text-xs text-[var(--text-muted)]">
          Loading habit matrices...
        </div>
      ) : habitBlocks.length > 0 ? (
        <div className="space-y-8">
          {habitBlocks.map(({ pageId, pageTitle, block }) => (
            <div key={block.id} className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <a
                  href={`/pages/${pageId}`}
                  className="font-serif-aesthetic text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors"
                >
                  From: {pageTitle} →
                </a>
              </div>
              <HabitGridBlock
                content={block.content}
                onChange={(updated) => handleUpdateBlock(pageId, { ...block, content: updated })}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="py-16 text-center journal-paper p-8 space-y-3">
          <Layout className="w-8 h-8 text-[var(--text-muted)] mx-auto" />
          <h4 className="font-serif-aesthetic text-base font-semibold text-[var(--text-primary)]">
            No habit trackers found
          </h4>
          <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
            Create your first habit tracker page to start tracking workouts, reading, water, or skincare!
          </p>
          <button
            onClick={() => setIsNewPageModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] text-xs font-semibold hover:bg-[var(--border-strong)] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Habit Tracker</span>
          </button>
        </div>
      )}

      <NewPageModal
        isOpen={isNewPageModalOpen}
        onClose={() => setIsNewPageModalOpen(false)}
        defaultType="habit"
      />
    </div>
  );
}
