'use client';

import React, { useState } from 'react';
import { usePlanner } from '@/lib/storage';
import { formatDate } from '@/lib/utils';
import { Trash2, RotateCcw, AlertTriangle, Layers, Target, FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface UnifiedTrashItem {
  id: string;
  kind: 'page' | 'goal' | 'paper';
  title: string;
  typeLabel: string;
  icon: React.ReactNode;
  deletedAt: string;
}

export default function TrashPage() {
  const { 
    trashPages, 
    trashGoals, 
    researchPapers,
    restoreFromTrash, 
    permanentlyDeletePage, 
    emptyTrash,
    restoreGoal,
    deleteGoal,
    restoreResearchPaper,
    deleteResearchPaper
  } = usePlanner();

  const [showEmptyConfirm, setShowEmptyConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<UnifiedTrashItem | null>(null);

  const trashedPapers = (researchPapers || []).filter(p => p.is_trash);

  const items: UnifiedTrashItem[] = [
    ...trashPages.map(page => ({
      id: page.id,
      kind: 'page' as const,
      title: page.title,
      typeLabel: `${page.page_type.charAt(0).toUpperCase() + page.page_type.slice(1)} Page`,
      icon: <span className="text-xl">{page.icon || '📄'}</span>,
      deletedAt: page.deleted_at || page.updated_at,
    })),
    ...trashGoals.map(goal => ({
      id: goal.id,
      kind: 'goal' as const,
      title: goal.title,
      typeLabel: `Goal (${goal.category})`,
      icon: <Target className="w-5 h-5 text-indigo-500" />,
      deletedAt: goal.updated_at,
    })),
    ...trashedPapers.map(paper => ({
      id: paper.id,
      kind: 'paper' as const,
      title: paper.title,
      typeLabel: `Research Paper (${paper.research_area})`,
      icon: <FileText className="w-5 h-5 text-amber-500" />,
      deletedAt: paper.updated_at,
    })),
  ].sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());

  const handleRestore = async (item: UnifiedTrashItem) => {
    if (item.kind === 'page') {
      await restoreFromTrash(item.id);
    } else if (item.kind === 'goal') {
      await restoreGoal(item.id);
    } else if (item.kind === 'paper') {
      await restoreResearchPaper(item.id);
    }
  };

  const handlePermanentDelete = async (item: UnifiedTrashItem) => {
    if (item.kind === 'page') {
      await permanentlyDeletePage(item.id);
    } else if (item.kind === 'goal') {
      await deleteGoal(item.id, true);
    } else if (item.kind === 'paper') {
      await deleteResearchPaper(item.id, true);
    }
    setItemToDelete(null);
  };

  const handleEmptyAllTrash = async () => {
    await emptyTrash();
    for (const g of trashGoals) {
      await deleteGoal(g.id, true);
    }
    for (const p of trashedPapers) {
      await deleteResearchPaper(p.id, true);
    }
    setShowEmptyConfirm(false);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-color)] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-red-500" />
            <h2 className="font-serif-aesthetic text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
              Trash Bin
            </h2>
          </div>
          <p className="font-serif-aesthetic italic text-xs text-[var(--text-secondary)] mt-0.5">
            Items in trash can be restored anytime or permanently removed
          </p>
        </div>

        {items.length > 0 && (
          <Button
            variant="danger"
            size="sm"
            onClick={() => setShowEmptyConfirm(true)}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            <span>Empty Trash ({items.length})</span>
          </Button>
        )}
      </div>

      {/* Confirmation to Empty Trash */}
      {showEmptyConfirm && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 shrink-0 text-red-600 dark:text-red-400" />
            <span className="text-xs font-medium">
              Permanently delete all {items.length} items? This cannot be undone.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <Button size="sm" variant="ghost" onClick={() => setShowEmptyConfirm(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="danger" onClick={handleEmptyAllTrash}>
              Confirm Empty All
            </Button>
          </div>
        </div>
      )}

      {/* Deleted Items List */}
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={`${item.kind}-${item.id}`}
            className="journal-paper p-4 flex items-center justify-between gap-3 hover:border-[var(--border-strong)] transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-xl bg-[var(--bg-paper-subtle)] shrink-0 flex items-center justify-center">
                {item.icon}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-serif-aesthetic font-semibold text-sm text-[var(--text-primary)] truncate">
                    {item.title}
                  </h4>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--bg-paper-subtle)] text-[var(--text-muted)] shrink-0 font-medium">
                    {item.typeLabel}
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  Deleted {formatDate(item.deletedAt, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleRestore(item)}
                title="Restore Item"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                <span>Restore</span>
              </Button>

              <button
                onClick={() => setItemToDelete(item)}
                className="p-2 rounded-xl text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                title="Permanently Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {items.length === 0 && (
          <div className="py-20 text-center journal-paper p-8 space-y-3">
            <Trash2 className="w-8 h-8 text-[var(--text-muted)] mx-auto opacity-50" />
            <h4 className="font-serif-aesthetic text-base font-semibold text-[var(--text-primary)]">
              Trash is empty
            </h4>
            <p className="text-xs text-[var(--text-secondary)]">
              Deleted pages, challenges, and goals will appear here. You can restore them anytime.
            </p>
          </div>
        )}
      </div>

      {/* Delete Single Item Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-sm journal-paper p-6 space-y-4 border border-red-200 dark:border-red-900 shadow-2xl">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-5 h-5" />
              <h4 className="font-semibold text-sm">
                Permanently delete this item?
              </h4>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              &quot;{itemToDelete.title}&quot; and all of its associated data will be removed forever. This cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setItemToDelete(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => handlePermanentDelete(itemToDelete)}
              >
                Permanently Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

