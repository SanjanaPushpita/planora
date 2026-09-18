'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { usePlanner } from '@/lib/storage';
import { useTheme } from '@/lib/theme-context';
import { 
  Search, 
  Sparkles, 
  Calendar, 
  Layout, 
  GraduationCap, 
  Flame, 
  CheckSquare, 
  BookOpen, 
  Sun, 
  Moon, 
  Palette, 
  Trash2, 
  X,
  FileText
} from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenNewPageModal: () => void;
}

export function CommandPalette({ isOpen, onClose, onOpenNewPageModal }: CommandPaletteProps) {
  const router = useRouter();
  const { searchAll } = usePlanner();
  const { toggleColorMode, setTheme, colorMode } = useTheme();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    let active = true;
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const res = await searchAll(query);
      if (active) setResults(res);
    }, 150);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, searchAll]);

  if (!isOpen) return null;

  const handleSelectResult = (r: any) => {
    onClose();
    router.push(`/pages/${r.pageId}`);
  };

  const handleAction = (action: () => void) => {
    onClose();
    action();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4">
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full max-w-xl journal-paper overflow-hidden shadow-2xl z-10 border border-[var(--border-strong)] animate-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-[var(--border-color)] gap-3 bg-[var(--bg-paper)]">
          <Search className="w-5 h-5 text-[var(--text-muted)]" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search pages, tasks, habits, notes, or type a command..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[var(--bg-paper-subtle)] text-[var(--text-muted)] border border-[var(--border-color)]">
            ESC to close
          </span>
        </div>

        {/* Results / Commands List */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-[var(--border-color)]">
          {/* Search Query Results */}
          {results.length > 0 && (
            <div className="pb-2">
              <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Search Results ({results.length})
              </div>
              <div className="space-y-1 mt-1">
                {results.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => handleSelectResult(r)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left hover:bg-[var(--bg-paper-hover)] transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="text-base">{r.pageIcon}</span>
                      <div className="truncate">
                        <div className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)] truncate">
                          {r.title}
                        </div>
                        {r.subtitle && (
                          <div className="text-xs text-[var(--text-secondary)] truncate">
                            {r.subtitle}
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--accent-soft)] text-[var(--text-secondary)]">
                      {r.type}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {query && results.length === 0 && (
            <div className="py-6 text-center text-xs text-[var(--text-muted)]">
              No matching pages, tasks, or entries found for &ldquo;{query}&rdquo;
            </div>
          )}

          {/* Quick Actions */}
          <div className="pt-2">
            <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Quick Actions
            </div>
            <div className="space-y-1 mt-1">
              <button
                onClick={() => handleAction(onOpenNewPageModal)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left hover:bg-[var(--bg-paper-hover)] transition-colors text-sm text-[var(--text-primary)]"
              >
                <Sparkles className="w-4 h-4 text-[var(--accent)]" />
                <span>Create New Page / Planner...</span>
              </button>
              <button
                onClick={() => handleAction(() => router.push('/calendar'))}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left hover:bg-[var(--bg-paper-hover)] transition-colors text-sm text-[var(--text-primary)]"
              >
                <Calendar className="w-4 h-4 text-[var(--accent)]" />
                <span>Open Calendar View</span>
              </button>
              <button
                onClick={() => handleAction(() => router.push('/habits'))}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left hover:bg-[var(--bg-paper-hover)] transition-colors text-sm text-[var(--text-primary)]"
              >
                <Layout className="w-4 h-4 text-[var(--accent)]" />
                <span>Open Habit Tracker Hub</span>
              </button>
              <button
                onClick={() => handleAction(() => router.push('/study'))}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left hover:bg-[var(--bg-paper-hover)] transition-colors text-sm text-[var(--text-primary)]"
              >
                <GraduationCap className="w-4 h-4 text-[var(--accent)]" />
                <span>Open Study & Research Hub</span>
              </button>
              <button
                onClick={() => handleAction(() => router.push('/challenges'))}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left hover:bg-[var(--bg-paper-hover)] transition-colors text-sm text-[var(--text-primary)]"
              >
                <Flame className="w-4 h-4 text-[var(--accent)]" />
                <span>Open Challenges Hub</span>
              </button>
            </div>
          </div>

          {/* Theme & Appearance Shortcuts */}
          <div className="pt-2">
            <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Appearance
            </div>
            <div className="grid grid-cols-2 gap-1 mt-1">
              <button
                onClick={() => handleAction(toggleColorMode)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-left hover:bg-[var(--bg-paper-hover)] transition-colors text-xs text-[var(--text-primary)]"
              >
                {colorMode === 'dark' ? (
                  <>
                    <Sun className="w-4 h-4 text-amber-500" />
                    <span>Switch to Light Mode</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4 text-indigo-500" />
                    <span>Switch to Dark Mode</span>
                  </>
                )}
              </button>

              <button
                onClick={() => handleAction(() => setTheme('blush'))}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-left hover:bg-[var(--bg-paper-hover)] transition-colors text-xs text-[var(--text-primary)]"
              >
                <span className="w-3 h-3 rounded-full bg-[#d87070]" />
                <span>Blush Rose Theme</span>
              </button>

              <button
                onClick={() => handleAction(() => setTheme('sage'))}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-left hover:bg-[var(--bg-paper-hover)] transition-colors text-xs text-[var(--text-primary)]"
              >
                <span className="w-3 h-3 rounded-full bg-[#436d4e]" />
                <span>Sage Botanical Theme</span>
              </button>

              <button
                onClick={() => handleAction(() => setTheme('warm'))}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-left hover:bg-[var(--bg-paper-hover)] transition-colors text-xs text-[var(--text-primary)]"
              >
                <span className="w-3 h-3 rounded-full bg-[#b8623b]" />
                <span>Warm Paper Theme</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
