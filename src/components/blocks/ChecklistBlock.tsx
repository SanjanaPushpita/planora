'use client';

import React, { useState, useEffect } from 'react';
import { ChecklistBlockContent, ChecklistItem } from '@/lib/types';
import { generateId } from '@/lib/utils';
import { Check, Plus, Trash2, CheckCheck } from 'lucide-react';

interface ChecklistBlockProps {
  content: ChecklistBlockContent;
  onChange: (updatedContent: ChecklistBlockContent) => void;
}

export function ChecklistBlock({ content, onChange }: ChecklistBlockProps) {
  const [data, setData] = useState<ChecklistBlockContent>(content || { items: [] });
  const [newItemText, setNewItemText] = useState('');

  useEffect(() => {
    if (content) {
      setData(content);
    }
  }, [content]);

  const updateData = (updater: (prev: ChecklistBlockContent) => ChecklistBlockContent) => {
    setData((prev) => {
      const next = updater(prev);
      onChange(next);
      return next;
    });
  };

  const handleTitleChange = (newTitle: string) => {
    updateData((prev) => ({ ...prev, title: newTitle }));
  };

  const handleToggleItem = (id: string) => {
    updateData((prev) => ({
      ...prev,
      items: prev.items.map((it) => (it.id === id ? { ...it, completed: !it.completed } : it)),
    }));
  };

  const handleUpdateItemText = (id: string, text: string) => {
    updateData((prev) => ({
      ...prev,
      items: prev.items.map((it) => (it.id === id ? { ...it, text } : it)),
    }));
  };

  const handleTogglePriority = (id: string) => {
    const cycle: Record<string, ChecklistItem['priority']> = {
      undefined: 'high',
      low: 'medium',
      medium: 'high',
      high: undefined,
    };
    updateData((prev) => ({
      ...prev,
      items: prev.items.map((it) => (it.id === id ? { ...it, priority: cycle[String(it.priority)] } : it)),
    }));
  };

  const handleDeleteItem = (id: string) => {
    updateData((prev) => ({
      ...prev,
      items: prev.items.filter((it) => it.id !== id),
    }));
  };

  const handleAddItem = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newItemText.trim()) return;

    const newItem: ChecklistItem = {
      id: generateId(),
      text: newItemText.trim(),
      completed: false,
    };

    updateData((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
    }));
    setNewItemText('');
  };

  const handleMarkAllCompleted = () => {
    updateData((prev) => ({
      ...prev,
      items: prev.items.map((it) => ({ ...it, completed: true })),
    }));
  };

  const handleClearCompleted = () => {
    updateData((prev) => ({
      ...prev,
      items: prev.items.filter((it) => !it.completed),
    }));
  };

  const completedCount = (data.items || []).filter((it) => it.completed).length;

  return (
    <div className="p-4 sm:p-5 journal-paper space-y-4">
      {/* Header & Quick batch actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-color)] pb-3">
        <input
          type="text"
          value={data.title || 'Checklist / Priorities'}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Section Title..."
          className="font-serif-aesthetic text-base sm:text-lg font-semibold text-[var(--text-primary)] bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-[var(--accent)] rounded px-1"
        />

        <div className="flex items-center gap-2 text-xs">
          <span className="text-[var(--text-muted)] text-[11px]">
            {completedCount}/{(data.items || []).length} done
          </span>
          <button
            type="button"
            onClick={handleMarkAllCompleted}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-paper-hover)] transition-colors cursor-pointer"
            title="Mark all as completed"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Check all</span>
          </button>
          {completedCount > 0 && (
            <button
              type="button"
              onClick={handleClearCompleted}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
              title="Clear completed items"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clear done</span>
            </button>
          )}
        </div>
      </div>

      {/* Items List */}
      <div className="space-y-1.5">
        {(data.items || []).map((item) => (
          <div
            key={item.id}
            className="group flex items-center gap-2.5 p-1.5 sm:px-2 rounded-xl hover:bg-[var(--bg-paper-hover)] transition-colors"
          >
            {/* Custom Aesthetic Checkbox */}
            <button
              type="button"
              onClick={() => handleToggleItem(item.id)}
              className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all shrink-0 cursor-pointer ${
                item.completed
                  ? 'bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-contrast)] shadow-2xs'
                  : 'bg-[var(--bg-paper)] border-[var(--border-strong)] hover:border-[var(--accent)]'
              }`}
            >
              {item.completed && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
            </button>

            {/* Editable Item Text */}
            <input
              type="text"
              value={item.text}
              onChange={(e) => handleUpdateItemText(item.id, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const addInput = document.getElementById('new-task-input');
                  addInput?.focus();
                }
              }}
              placeholder="Task description..."
              className={`flex-1 text-sm bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-[var(--accent)] rounded px-1.5 py-0.5 transition-colors ${
                item.completed
                  ? 'line-through text-[var(--text-muted)]'
                  : 'text-[var(--text-primary)]'
              }`}
            />

            {/* Priority Tag */}
            {item.priority && (
              <button
                type="button"
                onClick={() => handleTogglePriority(item.id)}
                className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full shrink-0 cursor-pointer ${
                  item.priority === 'high'
                    ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                    : item.priority === 'medium'
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                    : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                }`}
                title="Click to cycle priority"
              >
                {item.priority}
              </button>
            )}

            {!item.priority && (
              <button
                type="button"
                onClick={() => handleTogglePriority(item.id)}
                className="opacity-0 group-hover:opacity-100 text-[10px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] px-1.5 py-0.5 rounded transition-opacity shrink-0 cursor-pointer"
                title="Add priority tag"
              >
                +priority
              </button>
            )}

            {/* Delete button */}
            <button
              type="button"
              onClick={() => handleDeleteItem(item.id)}
              className="opacity-0 group-hover:opacity-100 p-1 text-[var(--text-muted)] hover:text-red-500 rounded transition-opacity shrink-0 cursor-pointer"
              title="Delete item"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {(data.items || []).length === 0 && (
          <div className="py-3 text-center text-xs text-[var(--text-muted)] italic">
            No items yet. Add your first priority below!
          </div>
        )}
      </div>

      {/* Add Item Form */}
      <form onSubmit={handleAddItem} className="flex items-center gap-2 pt-2">
        <input
          id="new-task-input"
          type="text"
          placeholder="Add a new task (Press Enter)..."
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          className="flex-1 px-3 py-2 text-sm rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
        />
        <button
          type="submit"
          disabled={!newItemText.trim()}
          className="px-3.5 py-2 rounded-xl bg-[var(--accent-soft)] hover:bg-[var(--border-strong)] text-[var(--text-primary)] text-xs font-medium transition-colors disabled:opacity-40 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
