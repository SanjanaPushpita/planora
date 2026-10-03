'use client';

import React from 'react';
import Link from 'next/link';
import { Compass, Home, BookOpen, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="journal-paper max-w-md w-full p-8 text-center space-y-5 border-2 border-[var(--border-strong)] shadow-xl animate-in zoom-in-95 duration-200">
        <div className="w-14 h-14 rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)] mx-auto flex items-center justify-center shadow-inner">
          <Compass className="w-7 h-7 stroke-[1.75]" />
        </div>

        <div className="space-y-1.5">
          <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--accent)] font-mono">
            404 • Page Not Found
          </span>
          <h1 className="font-serif-aesthetic text-2xl font-bold text-[var(--text-primary)]">
            Off the Beaten Path
          </h1>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            The page or record you are looking for might have been moved, deleted, or does not exist in your journal.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-3 border-t border-[var(--border-color)]">
          <Link
            href="/"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-contrast)] text-xs font-semibold shadow-xs transition-all hover:scale-[1.02]"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Return to Dashboard</span>
          </Link>

          <Link
            href="/pages"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--bg-paper-subtle)] hover:bg-[var(--bg-paper-hover)] border border-[var(--border-color)] text-xs font-medium text-[var(--text-primary)] transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>All Pages</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
