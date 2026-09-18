'use client';

import React, { useEffect, useState, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { usePlanner } from '@/lib/storage';
import { PlannerPage, PageBlock, BlockType } from '@/lib/types';
import { BlockRenderer } from '@/components/blocks/BlockRenderer';
import { AddBlockMenu } from '@/components/blocks/AddBlockMenu';
import { PageSettingsModal } from '@/components/modals/PageSettingsModal';
import { useAutosave } from '@/lib/hooks/useAutosave';
import { generateId, formatDate } from '@/lib/utils';
import { 
  Star, 
  MoreHorizontal, 
  ArrowLeft, 
  Sparkles, 
  Plus, 
  Calendar as CalendarIcon,
  Copy,
  Trash2,
  Share2
} from 'lucide-react';

export default function DynamicPageViewer({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { storage, pages, updatePage, duplicatePage, moveToTrash } = usePlanner();

  const [page, setPage] = useState<PlannerPage | null>(null);
  const [blocks, setBlocks] = useState<PageBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Load page and its blocks
  const loadPageData = useCallback(async () => {
    try {
      const p = await storage.getPageById(resolvedParams.id);
      if (p) {
        setPage(p);
        const b = await storage.getBlocksByPageId(resolvedParams.id);
        setBlocks(b);
      }
    } catch (err) {
      console.error('Failed to load page:', err);
    } finally {
      setLoading(false);
    }
  }, [storage, resolvedParams.id]);

  useEffect(() => {
    loadPageData();
  }, [loadPageData]);

  // Autosave page title & icon
  useAutosave(page, async (latestPage) => {
    if (latestPage) {
      await updatePage(latestPage.id, {
        title: latestPage.title,
        icon: latestPage.icon,
        date: latestPage.date,
      });
    }
  });

  const handleUpdateBlock = async (updatedBlock: PageBlock) => {
    setBlocks((prev) => prev.map((b) => (b.id === updatedBlock.id ? updatedBlock : b)));
    await storage.saveBlock(updatedBlock);
  };

  const handleAddBlock = async (type: BlockType, insertIndex?: number) => {
    if (!page) return;
    const newBlock = await storage.createBlock(page.id, type, insertIndex);
    const updated = await storage.getBlocksByPageId(page.id);
    setBlocks(updated);
  };

  const handleDeleteBlock = async (blockId: string) => {
    await storage.deleteBlock(blockId);
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
  };

  const handleDuplicateBlock = async (block: PageBlock) => {
    if (!page) return;
    const duplicated: PageBlock = {
      ...block,
      id: generateId(),
      position: block.position + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await storage.saveBlock(duplicated);
    const updated = await storage.getBlocksByPageId(page.id);
    setBlocks(updated);
  };

  const handleMoveBlock = async (index: number, direction: 'up' | 'down') => {
    if (!page) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= blocks.length) return;

    const newBlocks = [...blocks];
    const [moved] = newBlocks.splice(index, 1);
    newBlocks.splice(targetIndex, 0, moved);

    setBlocks(newBlocks);
    await storage.reorderBlocks(page.id, newBlocks.map((b) => b.id));
  };

  const handleToggleFavorite = async () => {
    if (!page) return;
    const updated = await updatePage(page.id, { is_favorite: !page.is_favorite });
    setPage(updated);
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
        <p className="font-serif-aesthetic italic text-xs text-[var(--text-muted)]">
          Reading journal page...
        </p>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="py-16 text-center space-y-4">
        <span className="text-4xl">🍃</span>
        <h2 className="font-serif-aesthetic text-2xl font-bold text-[var(--text-primary)]">
          Page Not Found
        </h2>
        <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
          This planner page might have been moved to the trash or deleted.
        </p>
        <button
          onClick={() => router.push('/')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] text-xs font-medium hover:bg-[var(--border-strong)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Sanctuary</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 max-w-4xl mx-auto">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-1.5">
          {/* Favorite Toggle */}
          <button
            onClick={handleToggleFavorite}
            className={`p-2 rounded-xl hover:bg-[var(--bg-paper-hover)] border border-[var(--border-color)] transition-colors ${
              page.is_favorite ? 'text-amber-500 fill-amber-500' : 'text-[var(--text-muted)]'
            }`}
            title={page.is_favorite ? 'Remove from favorites' : 'Pin to favorites'}
          >
            <Star className={`w-4 h-4 ${page.is_favorite ? 'fill-current' : ''}`} />
          </button>

          {/* Page Settings Modal Trigger */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-paper-hover)] border border-[var(--border-color)] transition-colors"
            title="Page options & settings"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Page Title & Header Banner */}
      <div className="space-y-3 border-b border-[var(--border-color)] pb-5">
        <div className="flex items-start gap-3">
          {/* Editable Page Icon */}
          <input
            type="text"
            value={page.icon}
            onChange={(e) => setPage({ ...page, icon: e.target.value })}
            maxLength={4}
            className="w-12 h-12 text-center text-3xl rounded-2xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] focus:outline-none focus:border-[var(--accent)] shrink-0"
            title="Click to change icon"
          />

          <div className="flex-1 space-y-1">
            {/* Inline Editable Page Title */}
            <input
              type="text"
              value={page.title}
              onChange={(e) => setPage({ ...page, title: e.target.value })}
              placeholder="Untitled Planner..."
              className="w-full font-serif-aesthetic text-2xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)] bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-[var(--accent)] rounded py-1"
            />

            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
              <span className="uppercase font-semibold tracking-wider text-[10px] px-2 py-0.5 rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
                {page.page_type}
              </span>

              {page.date && (
                <div className="flex items-center gap-1">
                  <CalendarIcon className="w-3.5 h-3.5" />
                  <span>{formatDate(page.date)}</span>
                </div>
              )}

              <span>•</span>
              <span>Updated {formatDate(page.updated_at, { month: 'short', day: 'numeric' })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Blocks Container */}
      <div className="space-y-4">
        {blocks.map((block, index) => (
          <React.Fragment key={block.id}>
            <BlockRenderer
              block={block}
              index={index}
              totalBlocks={blocks.length}
              onUpdate={handleUpdateBlock}
              onMoveUp={() => handleMoveBlock(index, 'up')}
              onMoveDown={() => handleMoveBlock(index, 'down')}
              onDuplicate={() => handleDuplicateBlock(block)}
              onDelete={() => handleDeleteBlock(block.id)}
              onInsertBelow={(type) => handleAddBlock(type, index + 1)}
            />
          </React.Fragment>
        ))}

        {blocks.length === 0 && (
          <div className="py-12 text-center journal-paper p-8 space-y-3">
            <Sparkles className="w-8 h-8 text-[var(--accent)] mx-auto opacity-70" />
            <h4 className="font-serif-aesthetic text-base font-semibold text-[var(--text-primary)]">
              This page is currently empty
            </h4>
            <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
              Add your first modular section below to begin customizing your planner.
            </p>
          </div>
        )}

        {/* Bottom Add Block Control */}
        <AddBlockMenu onAddBlock={(type) => handleAddBlock(type)} />
      </div>

      {/* Settings & Rename Modal */}
      {isSettingsOpen && (
        <PageSettingsModal
          page={page}
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </div>
  );
}
