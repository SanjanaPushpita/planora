'use client';

import React, { useState } from 'react';
import { usePlanner } from '@/lib/storage';
import { formatDate } from '@/lib/utils';
import { Trash2, RotateCcw, AlertTriangle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function TrashPage() {
  const { trashPages, restoreFromTrash, permanentlyDeletePage, emptyTrash } = usePlanner();
  const [showEmptyConfirm, setShowEmptyConfirm] = useState(false);
  const [pageToDelete, setPageToDelete] = useState<string | null>(null);

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

        {trashPages.length > 0 && (
          <Button
            variant="danger"
            size="sm"
            onClick={() => setShowEmptyConfirm(true)}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            <span>Empty Trash</span>
          </Button>
        )}
      </div>

      {/* Confirmation to Empty Trash */}
      {showEmptyConfirm && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-300 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span className="text-xs">
              Permanently delete all {trashPages.length} items? This cannot be undone.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" variant="ghost" onClick={() => setShowEmptyConfirm(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="danger" onClick={async () => {
              await emptyTrash();
              setShowEmptyConfirm(false);
            }}>
              Confirm Empty
            </Button>
          </div>
        </div>
      )}

      {/* Deleted Pages List */}
      <div className="space-y-2">
        {trashPages.map((page) => (
          <div
            key={page.id}
            className="journal-paper p-4 flex items-center justify-between gap-3 hover:border-[var(--border-strong)] transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl p-1 rounded-lg bg-[var(--bg-paper-subtle)]">
                {page.icon}
              </span>
              <div>
                <h4 className="font-serif-aesthetic font-semibold text-sm text-[var(--text-primary)]">
                  {page.title}
                </h4>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Deleted on {formatDate(page.deleted_at || page.updated_at, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => restoreFromTrash(page.id)}
                title="Restore Page"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                <span>Restore</span>
              </Button>

              <button
                onClick={() => setPageToDelete(page.id)}
                className="p-2 rounded-xl text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                title="Permanently Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {trashPages.length === 0 && (
          <div className="py-20 text-center journal-paper p-8 space-y-3">
            <Trash2 className="w-8 h-8 text-[var(--text-muted)] mx-auto opacity-50" />
            <h4 className="font-serif-aesthetic text-base font-semibold text-[var(--text-primary)]">
              Trash is empty
            </h4>
            <p className="text-xs text-[var(--text-secondary)]">
              Deleted pages will appear here. You can restore them anytime.
            </p>
          </div>
        )}
      </div>

      {/* Delete Single Page Confirmation Modal */}
      {pageToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-sm journal-paper p-6 space-y-4 border border-red-200 dark:border-red-900 shadow-2xl">
            <h4 className="font-semibold text-sm text-red-600 dark:text-red-400">
              Permanently delete page?
            </h4>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              This will erase all content and blocks from this page forever. This action cannot be reversed.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setPageToDelete(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={async () => {
                  await permanentlyDeletePage(pageToDelete);
                  setPageToDelete(null);
                }}
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
