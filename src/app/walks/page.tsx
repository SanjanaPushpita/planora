'use client';

import React, { useState, useEffect } from 'react';
import { usePlanner } from '@/lib/storage';
import { PageBlock, WalkTrackerContent } from '@/lib/types';
import { WalkTrackerBlock } from '@/components/blocks/WalkTrackerBlock';
import { NewPageModal } from '@/components/modals/NewPageModal';
import { Footprints, Plus, Sparkles } from 'lucide-react';

export default function WalkHubPage() {
  const { storage, pages } = usePlanner();
  const [walkBlocks, setWalkBlocks] = useState<{ pageId: string; pageTitle: string; block: PageBlock<'walk_tracker'> }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNewPageModalOpen, setIsNewPageModalOpen] = useState(false);

  // Standalone global walk tracker content if no dedicated walk pages created yet
  const [globalWalkContent, setGlobalWalkContent] = useState<WalkTrackerContent>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('planora_global_walk_tracker');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return { targetMinutes: 5, sessions: [], notes: '' };
  });

  useEffect(() => {
    async function loadWalks() {
      try {
        const results: { pageId: string; pageTitle: string; block: PageBlock<'walk_tracker'> }[] = [];
        for (const p of pages) {
          const blocks = await storage.getBlocksByPageId(p.id);
          const wb = blocks.filter((b): b is PageBlock<'walk_tracker'> => b.type === 'walk_tracker');
          for (const block of wb) {
            results.push({ pageId: p.id, pageTitle: p.title, block });
          }
        }
        setWalkBlocks(results);
      } catch (err) {
        console.error('Failed to load walk blocks:', err);
      } finally {
        setLoading(false);
      }
    }
    loadWalks();
  }, [storage, pages]);

  const handleUpdateBlock = async (pageId: string, updatedBlock: PageBlock<'walk_tracker'>) => {
    await storage.saveBlock(updatedBlock);
    setWalkBlocks((prev) =>
      prev.map((item) => (item.block.id === updatedBlock.id ? { ...item, block: updatedBlock } : item))
    );
  };

  const handleUpdateGlobalWalk = (updated: WalkTrackerContent) => {
    setGlobalWalkContent(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('planora_global_walk_tracker', JSON.stringify(updated));
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-color)] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🚶‍♀️</span>
            <h2 className="font-serif-aesthetic text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
              Hourly Walk Sanctuary
            </h2>
          </div>
          <p className="font-serif-aesthetic italic text-xs text-[var(--text-secondary)] mt-0.5">
            Track 5-minute movement sessions throughout the day and master your consistency
          </p>
        </div>

        <button
          onClick={() => setIsNewPageModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-contrast)] text-xs font-semibold shadow-xs transition-transform active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>New Walk Tracker Page</span>
        </button>
      </div>

      {/* Walk Blocks */}
      {loading ? (
        <div className="py-20 text-center text-xs text-[var(--text-muted)]">
          Opening walk tracking sanctuary...
        </div>
      ) : walkBlocks.length > 0 ? (
        <div className="space-y-8">
          {walkBlocks.map(({ pageId, pageTitle, block }) => (
            <div key={block.id} className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <a
                  href={`/pages/${pageId}`}
                  className="font-serif-aesthetic text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors"
                >
                  From Page: {pageTitle} →
                </a>
              </div>
              <WalkTrackerBlock
                content={block.content}
                onChange={(updated) => handleUpdateBlock(pageId, { ...block, content: updated })}
                blockId={block.id}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Default Walk Tracker Component Ready Out-of-the-box */}
          <WalkTrackerBlock
            content={globalWalkContent}
            onChange={handleUpdateGlobalWalk}
            blockId="global"
          />
        </div>
      )}

      {/* New Page Modal */}
      {isNewPageModalOpen && (
        <NewPageModal
          isOpen={isNewPageModalOpen}
          onClose={() => setIsNewPageModalOpen(false)}
          defaultType="walk"
        />
      )}
    </div>
  );
}
