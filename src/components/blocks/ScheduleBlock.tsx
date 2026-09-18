'use client';

import React, { useState, useEffect } from 'react';
import { ScheduleBlockContent, ScheduleItem } from '@/lib/types';
import { generateId } from '@/lib/utils';
import { Clock, Plus, Trash2, Check } from 'lucide-react';

interface ScheduleBlockProps {
  content: ScheduleBlockContent;
  onChange: (updatedContent: ScheduleBlockContent) => void;
}

export function ScheduleBlock({ content, onChange }: ScheduleBlockProps) {
  const [data, setData] = useState<ScheduleBlockContent>(content || { slots: [] });
  const [newTime, setNewTime] = useState('10:00 AM');
  const [newActivity, setNewActivity] = useState('');

  useEffect(() => {
    if (content) {
      setData(content);
    }
  }, [content]);

  const updateData = (updater: (prev: ScheduleBlockContent) => ScheduleBlockContent) => {
    setData((prev) => {
      const next = updater(prev);
      onChange(next);
      return next;
    });
  };

  const handleToggleSlot = (id: string) => {
    updateData((prev) => ({
      ...prev,
      slots: (prev.slots || []).map((s) => (s.id === id ? { ...s, completed: !s.completed } : s)),
    }));
  };

  const handleUpdateSlot = (id: string, updates: Partial<ScheduleItem>) => {
    updateData((prev) => ({
      ...prev,
      slots: (prev.slots || []).map((s) => (s.id === id ? { ...s, ...updates } : s)),
    }));
  };

  const handleDeleteSlot = (id: string) => {
    updateData((prev) => ({
      ...prev,
      slots: (prev.slots || []).filter((s) => s.id !== id),
    }));
  };

  const handleAddSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActivity.trim()) return;

    const newSlot: ScheduleItem = {
      id: generateId(),
      time: newTime.trim() || '12:00 PM',
      activity: newActivity.trim(),
      completed: false,
    };

    updateData((prev) => ({
      ...prev,
      slots: [...(prev.slots || []), newSlot],
    }));
    setNewActivity('');
  };

  return (
    <div className="p-4 sm:p-5 journal-paper space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[var(--accent)]" />
          <h3 className="font-serif-aesthetic text-base sm:text-lg font-semibold text-[var(--text-primary)]">
            Daily Schedule & Time Blocking
          </h3>
        </div>
        <span className="text-[11px] text-[var(--text-muted)]">
          {(data.slots || []).length} time slots
        </span>
      </div>

      {/* Schedule Rows */}
      <div className="space-y-2">
        {(data.slots || []).map((slot) => (
          <div
            key={slot.id}
            className="group flex items-center gap-3 p-2 rounded-xl hover:bg-[var(--bg-paper-hover)] border border-[var(--border-color)] transition-colors"
          >
            {/* Completion checkbox */}
            <button
              type="button"
              onClick={() => handleToggleSlot(slot.id)}
              className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all shrink-0 cursor-pointer ${
                slot.completed
                  ? 'bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-contrast)]'
                  : 'bg-[var(--bg-paper)] border-[var(--border-strong)]'
              }`}
            >
              {slot.completed && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
            </button>

            {/* Time label/input */}
            <input
              type="text"
              value={slot.time}
              onChange={(e) => handleUpdateSlot(slot.id, { time: e.target.value })}
              className="w-24 text-xs font-mono font-medium px-2 py-1 rounded-md bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)] shrink-0 text-center"
            />

            {/* Activity description */}
            <input
              type="text"
              value={slot.activity}
              onChange={(e) => handleUpdateSlot(slot.id, { activity: e.target.value })}
              placeholder="Activity..."
              className={`flex-1 text-sm bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-[var(--accent)] rounded px-2 py-1 ${
                slot.completed ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'
              }`}
            />

            {/* Delete row */}
            <button
              type="button"
              onClick={() => handleDeleteSlot(slot.id)}
              className="opacity-0 group-hover:opacity-100 p-1 text-[var(--text-muted)] hover:text-red-500 rounded transition-opacity shrink-0 cursor-pointer"
              title="Delete row"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {(data.slots || []).length === 0 && (
          <div className="py-4 text-center text-xs text-[var(--text-muted)] italic">
            No schedule blocks yet. Add a time slot below.
          </div>
        )}
      </div>

      {/* Add Slot */}
      <form onSubmit={handleAddSlot} className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--border-color)]">
        <input
          type="text"
          value={newTime}
          onChange={(e) => setNewTime(e.target.value)}
          placeholder="e.g. 02:00 PM"
          className="w-28 px-3 py-1.5 text-xs font-mono rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
        />
        <input
          type="text"
          value={newActivity}
          onChange={(e) => setNewActivity(e.target.value)}
          placeholder="Activity description..."
          className="flex-1 min-w-[200px] px-3 py-1.5 text-xs rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
        />
        <button
          type="submit"
          disabled={!newActivity.trim()}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[var(--accent-soft)] hover:bg-[var(--border-strong)] text-[var(--text-primary)] text-xs font-medium transition-colors disabled:opacity-40 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Slot</span>
        </button>
      </form>
    </div>
  );
}
