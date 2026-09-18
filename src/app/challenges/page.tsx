'use client';

import React, { useState, useEffect } from 'react';
import { usePlanner } from '@/lib/storage';
import { PageBlock, ChallengeBlockContent } from '@/lib/types';
import { ChallengeBlock } from '@/components/blocks/ChallengeBlock';
import { NewPageModal } from '@/components/modals/NewPageModal';
import { Flame, Plus, Trophy, Target } from 'lucide-react';

export default function ChallengesHubPage() {
  const { storage, pages } = usePlanner();
  const [challengeBlocks, setChallengeBlocks] = useState<{ pageId: string; pageTitle: string; block: PageBlock<'challenge_grid'> }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNewPageModalOpen, setIsNewPageModalOpen] = useState(false);

  useEffect(() => {
    async function loadChallenges() {
      const results: { pageId: string; pageTitle: string; block: PageBlock<'challenge_grid'> }[] = [];
      for (const p of pages) {
        const blocks = await storage.getBlocksByPageId(p.id);
        const cb = blocks.filter((b): b is PageBlock<'challenge_grid'> => b.type === 'challenge_grid');
        for (const block of cb) {
          results.push({ pageId: p.id, pageTitle: p.title, block });
        }
      }
      setChallengeBlocks(results);
      setLoading(false);
    }
    loadChallenges();
  }, [storage, pages]);

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-color)] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌸</span>
            <h2 className="font-serif-aesthetic text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
              Personal Challenges Sanctuary
            </h2>
          </div>
          <p className="font-serif-aesthetic italic text-xs text-[var(--text-secondary)] mt-0.5">
            Transform your life one day at a time with 7, 21, 30, 60, 75, or 100-day challenges
          </p>
        </div>

        <button
          onClick={() => setIsNewPageModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-contrast)] text-xs font-semibold shadow-xs transition-transform active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>New Challenge</span>
        </button>
      </div>

      {/* Challenge Blocks Grid */}
      {loading ? (
        <div className="py-20 text-center text-xs text-[var(--text-muted)]">
          Loading active challenges...
        </div>
      ) : challengeBlocks.length > 0 ? (
        <div className="space-y-10">
          {challengeBlocks.map(({ pageId, pageTitle, block }) => (
            <div key={block.id} className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <a
                  href={`/pages/${pageId}`}
                  className="font-serif-aesthetic text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors"
                >
                  From: {pageTitle} →
                </a>
              </div>
              <ChallengeBlock
                content={block.content}
                onChange={async (updated) => {
                  await storage.saveBlock({ ...block, content: updated });
                  setChallengeBlocks((prev) =>
                    prev.map((item) => (item.block.id === block.id ? { ...item, block: { ...block, content: updated } } : item))
                  );
                }}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="py-16 text-center journal-paper p-8 space-y-3">
          <Flame className="w-8 h-8 text-amber-500 mx-auto" />
          <h4 className="font-serif-aesthetic text-base font-semibold text-[var(--text-primary)]">
            No active challenges yet
          </h4>
          <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
            Start a 30-Day No Sugar, 21-Day Yoga, 60-Day Reading, or custom challenge today!
          </p>
          <button
            onClick={() => setIsNewPageModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] text-xs font-semibold hover:bg-[var(--border-strong)] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create First Challenge</span>
          </button>
        </div>
      )}

      <NewPageModal
        isOpen={isNewPageModalOpen}
        onClose={() => setIsNewPageModalOpen(false)}
        defaultType="challenge"
      />
    </div>
  );
}
