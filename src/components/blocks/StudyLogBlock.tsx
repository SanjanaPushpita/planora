'use client';

import React, { useState } from 'react';
import { StudyLogBlockContent, StudySessionItem } from '@/lib/types';
import { generateId, getTodayDateString } from '@/lib/utils';
import { useAutosave } from '@/lib/hooks/useAutosave';
import { GraduationCap, Plus, Trash2, Check, Clock, BookOpen } from 'lucide-react';

interface StudyLogBlockProps {
  content: StudyLogBlockContent;
  onChange: (updatedContent: StudyLogBlockContent) => void;
}

export function StudyLogBlock({ content, onChange }: StudyLogBlockProps) {
  const [data, setData] = useState<StudyLogBlockContent>(content || { sessions: [] });

  const [newSubject, setNewSubject] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [newTarget, setNewTarget] = useState('60');
  const [newActual, setNewActual] = useState('60');
  const [newDate, setNewDate] = useState(getTodayDateString());

  useAutosave(data, (latest) => {
    onChange(latest);
  });

  const handleToggleSession = (id: string) => {
    setData((prev) => ({
      ...prev,
      sessions: prev.sessions.map((s) => (s.id === id ? { ...s, completed: !s.completed } : s)),
    }));
  };

  const handleUpdateSession = (id: string, updates: Partial<StudySessionItem>) => {
    setData((prev) => ({
      ...prev,
      sessions: prev.sessions.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    }));
  };

  const handleDeleteSession = (id: string) => {
    setData((prev) => ({
      ...prev,
      sessions: prev.sessions.filter((s) => s.id !== id),
    }));
  };

  const handleAddSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim()) return;

    const newSession: StudySessionItem = {
      id: generateId(),
      subject: newSubject.trim(),
      topic: newTopic.trim() || 'General Study',
      date: newDate,
      targetMinutes: parseInt(newTarget, 10) || 60,
      actualMinutes: parseInt(newActual, 10) || 60,
      completed: true,
      notes: '',
    };

    setData((prev) => ({
      ...prev,
      sessions: [newSession, ...prev.sessions],
    }));

    setNewSubject('');
    setNewTopic('');
  };

  const totalActualMinutes = data.sessions.reduce((acc, s) => acc + (s.actualMinutes || 0), 0);
  const totalHours = (totalActualMinutes / 60).toFixed(1);

  return (
    <div className="journal-paper p-4 sm:p-6 space-y-6">
      {/* Header inspired by Ref 3 */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-color)] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">📚</span>
            <h3 className="font-serif-aesthetic text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              Study & Research Tracker
            </h3>
          </div>
          <p className="font-serif-aesthetic italic text-xs text-[var(--text-secondary)] mt-0.5">
            Log your courses, thesis research, deep focus blocks, and milestones
          </p>
        </div>

        {/* Total stats pill */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--accent-soft)] border border-[var(--border-strong)] text-xs font-semibold text-[var(--accent)]">
            <Clock className="w-3.5 h-3.5" />
            <span>{totalHours} Total Hours Logged</span>
          </div>
          <div className="text-xs text-[var(--text-muted)]">
            {data.sessions.length} sessions
          </div>
        </div>
      </div>

      {/* Sessions Table */}
      <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
        <table className="w-full border-collapse text-left min-w-[650px]">
          <thead>
            <tr className="border-b border-[var(--border-color)] text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              <th className="py-2 px-2 w-8 text-center">Done</th>
              <th className="py-2 px-3">Subject / Course</th>
              <th className="py-2 px-3">Topic / Focus</th>
              <th className="py-2 px-2 text-center w-24">Date</th>
              <th className="py-2 px-2 text-center w-24">Target</th>
              <th className="py-2 px-2 text-center w-24">Actual</th>
              <th className="py-2 px-3">Notes</th>
              <th className="py-2 px-2 w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {data.sessions.map((session) => (
              <tr
                key={session.id}
                className="hover:bg-[var(--bg-paper-hover)]/60 transition-colors group text-xs"
              >
                {/* Completed checkbox */}
                <td className="py-2 px-2 text-center">
                  <button
                    type="button"
                    onClick={() => handleToggleSession(session.id)}
                    className={`w-4 h-4 rounded flex items-center justify-center mx-auto border transition-all ${
                      session.completed
                        ? 'bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-contrast)]'
                        : 'bg-[var(--bg-paper)] border-[var(--border-strong)]'
                    }`}
                  >
                    {session.completed && <Check className="w-3 h-3 stroke-[3]" />}
                  </button>
                </td>

                {/* Subject */}
                <td className="py-2 px-2">
                  <input
                    type="text"
                    value={session.subject}
                    onChange={(e) => handleUpdateSession(session.id, { subject: e.target.value })}
                    className="w-full font-medium text-[var(--text-primary)] bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-[var(--accent)] rounded px-1.5 py-0.5"
                  />
                </td>

                {/* Topic */}
                <td className="py-2 px-2">
                  <input
                    type="text"
                    value={session.topic}
                    onChange={(e) => handleUpdateSession(session.id, { topic: e.target.value })}
                    className="w-full text-[var(--text-secondary)] bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-[var(--accent)] rounded px-1.5 py-0.5"
                  />
                </td>

                {/* Date */}
                <td className="py-2 px-2 text-center">
                  <span className="text-[11px] font-mono text-[var(--text-muted)]">
                    {session.date}
                  </span>
                </td>

                {/* Target Duration */}
                <td className="py-2 px-2 text-center">
                  <span className="text-[11px] font-mono text-[var(--text-secondary)]">
                    {session.targetMinutes} min
                  </span>
                </td>

                {/* Actual Duration */}
                <td className="py-2 px-2 text-center">
                  <span className="text-[11px] font-mono font-semibold text-[var(--accent)]">
                    {session.actualMinutes} min
                  </span>
                </td>

                {/* Notes */}
                <td className="py-2 px-2">
                  <input
                    type="text"
                    value={session.notes || ''}
                    placeholder="Add brief note..."
                    onChange={(e) => handleUpdateSession(session.id, { notes: e.target.value })}
                    className="w-full text-xs text-[var(--text-secondary)] bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-[var(--accent)] rounded px-1.5 py-0.5"
                  />
                </td>

                {/* Delete button */}
                <td className="py-2 px-2 text-center">
                  <button
                    type="button"
                    onClick={() => handleDeleteSession(session.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-[var(--text-muted)] hover:text-red-500 rounded transition-opacity"
                    title="Delete session"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}

            {data.sessions.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-xs text-[var(--text-muted)] italic">
                  No study sessions recorded yet. Add your study log below!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Session Form */}
      <form onSubmit={handleAddSession} className="p-3.5 rounded-xl journal-paper-subtle space-y-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
          Record New Study Session
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
          <input
            type="text"
            placeholder="Subject / Course (e.g. Algorithms)"
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            required
            className="sm:col-span-2 px-3 py-1.5 text-xs rounded-xl bg-[var(--bg-paper)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
          />
          <input
            type="text"
            placeholder="Topic (e.g. Chapter 3 proofs)"
            value={newTopic}
            onChange={(e) => setNewTopic(e.target.value)}
            className="sm:col-span-2 px-3 py-1.5 text-xs rounded-xl bg-[var(--bg-paper)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
          />
          <button
            type="submit"
            disabled={!newSubject.trim()}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-contrast)] text-xs font-medium transition-colors disabled:opacity-40"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Session</span>
          </button>
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-[var(--text-secondary)] items-center">
          <div className="flex items-center gap-1.5">
            <span>Date:</span>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="text-xs px-2 py-0.5 rounded-lg bg-[var(--bg-paper)] border border-[var(--border-color)]"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span>Target (min):</span>
            <input
              type="number"
              value={newTarget}
              onChange={(e) => setNewTarget(e.target.value)}
              className="w-16 text-xs px-2 py-0.5 rounded-lg bg-[var(--bg-paper)] border border-[var(--border-color)] text-center"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span>Actual (min):</span>
            <input
              type="number"
              value={newActual}
              onChange={(e) => setNewActual(e.target.value)}
              className="w-16 text-xs px-2 py-0.5 rounded-lg bg-[var(--bg-paper)] border border-[var(--border-color)] text-center"
            />
          </div>
        </div>
      </form>
    </div>
  );
}
