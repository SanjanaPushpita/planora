'use client';

import React from 'react';
import { SaveState } from '@/lib/types';
import { Check, Loader2, AlertCircle, WifiOff, Save } from 'lucide-react';

interface SaveStatusIndicatorProps {
  state: SaveState;
  isDirty: boolean;
  onSave: () => void;
  errorMessage?: string | null;
  className?: string;
}

export function SaveStatusIndicator({
  state,
  isDirty,
  onSave,
  errorMessage,
  className = '',
}: SaveStatusIndicatorProps) {
  const isSaving = state === 'SAVING';
  const isSaved = state === 'SAVED' && !isDirty;
  const isError = state === 'ERROR';
  const isOffline = state === 'OFFLINE';
  const isUnsaved = state === 'UNSAVED' || isDirty;

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Visual Status Tag */}
      <div className="flex items-center gap-1.5 text-xs select-none">
        {isSaving && (
          <div className="flex items-center gap-1.5 text-[var(--accent)] animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span className="font-medium">Saving...</span>
          </div>
        )}

        {isSaved && (
          <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Saved</span>
          </div>
        )}

        {isUnsaved && !isSaving && !isError && !isOffline && (
          <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            <span>Unsaved changes</span>
          </div>
        )}

        {isOffline && (
          <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium" title="Saved to local device draft">
            <WifiOff className="w-3.5 h-3.5" />
            <span>Offline — saved locally</span>
          </div>
        )}

        {isError && (
          <div className="flex items-center gap-1 text-red-600 dark:text-red-400 font-medium" title={errorMessage || 'Failed to save'}>
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Save failed</span>
          </div>
        )}
      </div>

      {/* Visible Manual Save Button */}
      <button
        type="button"
        onClick={onSave}
        disabled={isSaving || (!isDirty && !isError)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
          isError
            ? 'bg-red-500 hover:bg-red-600 text-white shadow-xs animate-bounce'
            : isUnsaved || isDirty
            ? 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-contrast)] shadow-xs hover:scale-105 active:scale-95 cursor-pointer'
            : 'bg-[var(--bg-paper-subtle)] text-[var(--text-muted)] border border-[var(--border-color)] opacity-60 cursor-default'
        }`}
        title="Manual Save (Ctrl + S / Cmd + S)"
      >
        {isSaving ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Save className="w-3.5 h-3.5" />
        )}
        <span>{isError ? 'Retry' : 'Save'}</span>
        <kbd className="hidden sm:inline-block font-mono text-[9px] px-1 rounded bg-black/10 dark:bg-white/10 opacity-75">
          ⌘S
        </kbd>
      </button>
    </div>
  );
}
