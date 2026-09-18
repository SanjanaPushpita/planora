'use client';

import React, { useEffect, useState, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { usePlanner } from '@/lib/storage';
import { PlannerPage, PageBlock, BlockType } from '@/lib/types';
import { BlockRenderer } from '@/components/blocks/BlockRenderer';
import { AddBlockMenu } from '@/components/blocks/AddBlockMenu';
import { PageSettingsModal } from '@/components/modals/PageSettingsModal';
import { SaveStatusIndicator } from '@/components/ui/SaveStatusIndicator';
import { usePageSaveCoordinator } from '@/lib/hooks/usePageSaveCoordinator';
import { generateId, formatDate } from '@/lib/utils';
import { 
  Star, 
  MoreHorizontal, 
  ArrowLeft, 
  Sparkles, 
  Calendar as CalendarIcon, 
  ShieldCheck,
  RotateCcw,
  X
} from 'lucide-react';

export default function DynamicPageViewer({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { storage, pages, trashPages, restoreFromTrash, refreshPages } = usePlanner();

  const [initialPage, setInitialPage] = useState<PlannerPage | null>(null);
  const [initialBlocks, setInitialBlocks] = useState<PageBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [trashedPage, setTrashedPage] = useState<PlannerPage | null>(null);

  // Initial load
  const loadPageData = useCallback(async () => {
    setLoading(true);
    const rawId = resolvedParams.id;
    const decodedId = decodeURIComponent(rawId);

    try {
      // 1. Check in-memory pages first (fastest, immediately available after createPage)
      let p: PlannerPage | null = pages.find((item) => item.id === rawId || item.id === decodedId) || null;

      // 2. Query storage by decoded and raw IDs
      if (!p) {
        p = await storage.getPageById(decodedId);
      }
      if (!p && decodedId !== rawId) {
        p = await storage.getPageById(rawId);
      }

      // 3. If still not found, trigger refreshPages to synchronize
      if (!p) {
        await refreshPages();
        p = (await storage.getPageById(decodedId)) || (await storage.getPageById(rawId));
      }

      // 4. Check if page is currently in trash
      const inTrash = trashPages.find((item) => item.id === rawId || item.id === decodedId);
      setTrashedPage(inTrash || null);

      if (p) {
        setInitialPage(p);
        const b = await storage.getBlocksByPageId(p.id);
        setInitialBlocks(b);
      } else {
        setInitialPage(null);
      }
    } catch (err) {
      console.error('Failed to load page:', err);
      setInitialPage(null);
    } finally {
      setLoading(false);
    }
  }, [storage, pages, trashPages, refreshPages, resolvedParams.id]);

  useEffect(() => {
    loadPageData();
  }, [loadPageData]);

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

  if (trashedPage) {
    return (
      <div className="py-16 text-center space-y-4 max-w-md mx-auto">
        <span className="text-4xl">🗑️</span>
        <h2 className="font-serif-aesthetic text-2xl font-bold text-[var(--text-primary)]">
          Page is in Trash
        </h2>
        <p className="text-xs text-[var(--text-secondary)]">
          &ldquo;{trashedPage.title}&rdquo; is currently in your trash bin. You can restore it to continue journaling or return to your sanctuary.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={async () => {
              await restoreFromTrash(trashedPage.id);
              await loadPageData();
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] text-xs font-medium hover:bg-[var(--accent-hover)] transition-colors shadow-xs"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Restore Page</span>
          </button>
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-paper-subtle)] text-[var(--text-secondary)] text-xs font-medium hover:bg-[var(--bg-paper-hover)] transition-colors border border-[var(--border-color)]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Sanctuary</span>
          </button>
        </div>
      </div>
    );
  }

  if (!initialPage) {
    return (
      <div className="py-16 text-center space-y-4">
        <span className="text-4xl">🍃</span>
        <h2 className="font-serif-aesthetic text-2xl font-bold text-[var(--text-primary)]">
          Page Not Found
        </h2>
        <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
          This planner page might have been permanently deleted or does not exist.
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
    <DynamicPageEditor
      key={initialPage.id}
      initialPage={initialPage}
      initialBlocks={initialBlocks}
    />
  );
}

interface DynamicPageEditorProps {
  initialPage: PlannerPage;
  initialBlocks: PageBlock[];
}

function DynamicPageEditor({ initialPage, initialBlocks }: DynamicPageEditorProps) {
  const router = useRouter();
  const { storage, updatePage } = usePlanner();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Centralized robust save coordinator
  const {
    page,
    blocks,
    saveState,
    isDirty,
    errorMessage,
    recoveredDraft,
    recordChange,
    saveNow,
    dismissRecoveredAlert,
  } = usePageSaveCoordinator({
    initialPage,
    initialBlocks,
    onPersist: async (snapshotPage, snapshotBlocks) => {
      // 1. Update page metadata
      await storage.updatePage(snapshotPage.id, {
        title: snapshotPage.title,
        icon: snapshotPage.icon,
        date: snapshotPage.date,
        is_favorite: snapshotPage.is_favorite,
      });

      // 2. Persist each block
      await Promise.all(snapshotBlocks.map((b) => storage.saveBlock(b)));
    },
  });

  const handleUpdateBlock = (updatedBlock: PageBlock) => {
    const nextBlocks = blocks.map((b) => (b.id === updatedBlock.id ? updatedBlock : b));
    recordChange(undefined, nextBlocks);
  };

  const handleAddBlock = async (type: BlockType, insertIndex?: number) => {
    const newBlock = await storage.createBlock(page.id, type, insertIndex);
    const updated = await storage.getBlocksByPageId(page.id);
    recordChange(undefined, updated);
  };

  const handleDeleteBlock = async (blockId: string) => {
    await storage.deleteBlock(blockId);
    const updated = blocks.filter((b) => b.id !== blockId);
    recordChange(undefined, updated);
  };

  const handleDuplicateBlock = async (block: PageBlock) => {
    const duplicated: PageBlock = {
      ...block,
      id: generateId(),
      position: block.position + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await storage.saveBlock(duplicated);
    const updated = await storage.getBlocksByPageId(page.id);
    recordChange(undefined, updated);
  };

  const handleMoveBlock = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= blocks.length) return;

    const newBlocks = [...blocks];
    const [moved] = newBlocks.splice(index, 1);
    newBlocks.splice(targetIndex, 0, moved);

    recordChange(undefined, newBlocks);
    await storage.reorderBlocks(page.id, newBlocks.map((b) => b.id));
  };

  const handleToggleFavorite = async () => {
    const newFav = !page.is_favorite;
    await updatePage(page.id, { is_favorite: newFav });
    recordChange({ is_favorite: newFav });
  };

  return (
    <div className="space-y-6 pb-20 max-w-4xl mx-auto">
      {/* Top Header Bar: Breadcrumb + Save Status Indicator & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Robust Save Status & Manual Save Button */}
          <SaveStatusIndicator
            state={saveState}
            isDirty={isDirty}
            onSave={saveNow}
            errorMessage={errorMessage}
          />

          <div className="h-4 w-px bg-[var(--border-color)] hidden sm:block" />

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

      {/* Recovered Unsaved Draft Banner */}
      {recoveredDraft && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              <strong>Recovered unsaved draft:</strong> Planora safely recovered your latest edits from your local device backup.
            </span>
          </div>
          <button
            onClick={dismissRecoveredAlert}
            className="p-1 rounded-md text-amber-700 hover:text-amber-900 dark:text-amber-300 hover:bg-amber-200/50 dark:hover:bg-amber-900/50 transition-colors"
            title="Dismiss notice"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Page Title & Header Banner */}
      <div className="space-y-3 border-b border-[var(--border-color)] pb-5">
        <div className="flex items-start gap-3">
          {/* Editable Page Icon */}
          <input
            type="text"
            value={page.icon}
            onChange={(e) => recordChange({ icon: e.target.value })}
            maxLength={4}
            className="w-12 h-12 text-center text-3xl rounded-2xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] focus:outline-none focus:border-[var(--accent)] shrink-0"
            title="Click to change icon"
          />

          <div className="flex-1 space-y-1">
            {/* Inline Editable Page Title */}
            <input
              type="text"
              value={page.title}
              onChange={(e) => recordChange({ title: e.target.value })}
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
