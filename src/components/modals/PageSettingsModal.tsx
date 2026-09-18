'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { usePlanner } from '@/lib/storage';
import { PlannerPage } from '@/lib/types';
import { Star, Copy, Trash2, Archive } from 'lucide-react';

interface PageSettingsModalProps {
  page: PlannerPage;
  isOpen: boolean;
  onClose: () => void;
}

export function PageSettingsModal({ page, isOpen, onClose }: PageSettingsModalProps) {
  const router = useRouter();
  const { updatePage, duplicatePage, moveToTrash } = usePlanner();

  const [title, setTitle] = useState(page.title);
  const [icon, setIcon] = useState(page.icon);
  const [isFavorite, setIsFavorite] = useState(page.is_favorite);
  const [isArchived, setIsArchived] = useState(page.is_archived);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await updatePage(page.id, {
        title: title.trim() || page.title,
        icon,
        is_favorite: isFavorite,
        is_archived: isArchived,
      });
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDuplicate = async () => {
    setIsLoading(true);
    try {
      const dup = await duplicatePage(page.id);
      onClose();
      router.push(`/pages/${dup.id}`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await moveToTrash(page.id);
      onClose();
      router.push('/');
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Page Options & Settings" maxWidth="md">
      {!showDeleteConfirm ? (
        <form onSubmit={handleSave} className="space-y-5">
          <div className="flex gap-3 items-center">
            <div className="w-16">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                Icon
              </label>
              <input
                type="text"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                maxLength={4}
                className="w-full text-center py-2 text-xl rounded-xl bg-[var(--bg-paper)] border border-[var(--border-color)] text-[var(--text-primary)]"
              />
            </div>
            <div className="flex-1">
              <Input
                label="Page Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border-color)]">
            {/* Favorite toggle */}
            <button
              type="button"
              onClick={() => setIsFavorite(!isFavorite)}
              className="flex items-center justify-between p-3 rounded-xl hover:bg-[var(--bg-paper-hover)] border border-[var(--border-color)] text-left transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Star className={`w-4 h-4 ${isFavorite ? 'text-amber-500 fill-amber-500' : 'text-[var(--text-muted)]'}`} />
                <span className="text-sm font-medium text-[var(--text-primary)]">Favorite Page</span>
              </div>
              <span className="text-xs text-[var(--text-secondary)]">
                {isFavorite ? 'Pinned to Sidebar' : 'Not Pinned'}
              </span>
            </button>

            {/* Archive toggle */}
            <button
              type="button"
              onClick={() => setIsArchived(!isArchived)}
              className="flex items-center justify-between p-3 rounded-xl hover:bg-[var(--bg-paper-hover)] border border-[var(--border-color)] text-left transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Archive className={`w-4 h-4 ${isArchived ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`} />
                <span className="text-sm font-medium text-[var(--text-primary)]">Archive Page</span>
              </div>
              <span className="text-xs text-[var(--text-secondary)]">
                {isArchived ? 'Archived' : 'Active'}
              </span>
            </button>

            {/* Duplicate button */}
            <button
              type="button"
              onClick={handleDuplicate}
              className="flex items-center gap-2.5 p-3 rounded-xl hover:bg-[var(--bg-paper-hover)] border border-[var(--border-color)] text-left transition-colors"
            >
              <Copy className="w-4 h-4 text-[var(--text-muted)]" />
              <span className="text-sm font-medium text-[var(--text-primary)]">Duplicate Page & Blocks</span>
            </button>

            {/* Move to Trash */}
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2.5 p-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-left transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span className="text-sm font-medium">Move to Trash</span>
            </button>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 space-y-2">
            <h4 className="font-semibold text-sm">Move this page to Trash?</h4>
            <p className="text-xs leading-relaxed">
              &ldquo;{page.title}&rdquo; will be moved to the Trash bin. You can restore it anytime or empty the trash later.
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t border-[var(--border-color)]">
            <Button type="button" variant="ghost" onClick={() => setShowDeleteConfirm(false)}>
              Back
            </Button>
            <Button type="button" variant="danger" onClick={handleDelete} disabled={isLoading}>
              {isLoading ? 'Moving...' : 'Yes, Move to Trash'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
