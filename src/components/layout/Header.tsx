'use client';

import React, { useState } from 'react';
import { usePlanner } from '@/lib/storage';
import { useTheme } from '@/lib/theme-context';
import { ThemeName } from '@/lib/types';
import { 
  Search, 
  Sun, 
  Moon, 
  Palette, 
  Lock, 
  Plus, 
  Menu, 
  Check, 
  Loader2, 
  User,
  Heart,
  AlertCircle,
  Zap
} from 'lucide-react';

interface HeaderProps {
  onToggleSidebar: () => void;
  onOpenSearch: () => void;
  onOpenNewPageModal: () => void;
  onOpenAuthModal: () => void;
  onOpenQuickCapture?: () => void;
}

export function Header({
  onToggleSidebar,
  onOpenSearch,
  onOpenNewPageModal,
  onOpenAuthModal,
  onOpenQuickCapture,
}: HeaderProps) {
  const { profile, saveStatus, lock } = usePlanner();
  const { theme, colorMode, setTheme, toggleColorMode } = useTheme();
  const [showThemePicker, setShowThemePicker] = useState(false);

  const themes: { id: ThemeName; name: string; color: string }[] = [
    { id: 'blush', name: 'Blush Rose', color: '#d87070' },
    { id: 'sage', name: 'Sage Botanical', color: '#436d4e' },
    { id: 'warm', name: 'Warm Paper', color: '#b8623b' },
    { id: 'minimal', name: 'Minimalist', color: '#1f2937' },
    { id: 'lavender', name: 'Lavender Mist', color: '#785a9c' },
  ];

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 h-15 bg-[var(--bg-paper)]/75 backdrop-blur-xl border-b border-[var(--border-color)] shadow-glass transition-all">
      {/* Left: Sidebar toggle & Brand/Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-paper-hover)] transition-all md:hidden glass-card-hover"
          aria-label="Toggle sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2.5 text-xs text-[var(--text-muted)]">
          <span className="font-serif-aesthetic italic text-[var(--text-secondary)] font-medium text-sm">
            {profile.name}&apos;s Journal
          </span>
          <span className="opacity-40">•</span>
          <span className="truncate max-w-[220px] text-[11px] font-medium tracking-wide">
            {profile.tagline || 'Personal Sanctuary & Planner'}
          </span>
        </div>
      </div>

      {/* Center: Autosave Status Indicator */}
      <div className="flex items-center gap-2 text-xs">
        {saveStatus === 'saving' && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--accent-soft)]/60 border border-[var(--accent)]/30 text-[var(--accent)] text-xs animate-pulse backdrop-blur-xs">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span className="font-medium text-[11px]">Saving...</span>
          </div>
        )}
        {saveStatus === 'saved' && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-medium text-[11px] backdrop-blur-xs">
            <Check className="w-3.5 h-3.5" />
            <span>Saved</span>
          </div>
        )}
        {saveStatus === 'error' && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/25 text-red-600 dark:text-red-400 font-medium text-[11px] backdrop-blur-xs">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Save error</span>
          </div>
        )}
        {saveStatus === 'idle' && (
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--bg-paper-subtle)]/60 border border-[var(--border-color)]/60 text-[var(--text-muted)] text-[11px] backdrop-blur-xs">
            <Heart className="w-3 h-3 text-[var(--accent)] fill-[var(--accent)] opacity-70" />
            <span>Autosave active</span>
          </div>
        )}
      </div>

      {/* Right: Actions, Search, Theme & Profile */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Quick Capture Button */}
        {onOpenQuickCapture && (
          <button
            onClick={onOpenQuickCapture}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs bg-[var(--accent-soft)] hover:bg-[var(--accent)] hover:text-[var(--accent-contrast)] text-[var(--accent)] border border-[var(--accent)]/30 transition-all font-medium shadow-2xs glass-card-hover group"
            title="Quick Capture (Ctrl/Cmd + Shift + Space)"
          >
            <Zap className="w-3.5 h-3.5 fill-current transition-transform group-hover:scale-110" />
            <span className="hidden sm:inline font-semibold">+ Quick Capture</span>
          </button>
        )}

        {/* Quick Search Button */}
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs bg-[var(--bg-paper-subtle)]/80 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-paper-hover)] border border-[var(--border-color)] transition-all glass-card-hover"
        >
          <Search className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          <span className="hidden sm:inline">Search</span>
          <kbd className="hidden md:inline font-mono text-[10px] px-1.5 py-0.5 bg-[var(--bg-paper)]/80 rounded-md border border-[var(--border-color)] text-[var(--text-muted)] shadow-2xs">
            ⌘K
          </kbd>
        </button>

        {/* Theme Palette Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowThemePicker(!showThemePicker)}
            className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-paper-hover)] transition-all glass-card-hover"
            title="Choose Theme Palette"
          >
            <Palette className="w-4 h-4" />
          </button>

          {showThemePicker && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowThemePicker(false)}
              />
              <div className="absolute right-0 mt-2 w-52 py-2 z-50 glass-strong border border-[var(--border-strong)] shadow-2xl animate-in zoom-in-95 duration-100 rounded-2xl">
                <div className="px-3.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border-color)] mb-1">
                  Color Themes
                </div>
                {themes.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setTheme(t.id);
                      setShowThemePicker(false);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2 text-xs text-left hover:bg-[var(--bg-paper-hover)] transition-colors ${
                      theme === t.id ? 'font-semibold text-[var(--accent)] bg-[var(--accent-soft)]/40' : 'text-[var(--text-primary)]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/15 shadow-2xs"
                        style={{ backgroundColor: t.color }}
                      />
                      <span>{t.name}</span>
                    </div>
                    {theme === t.id && <Check className="w-3.5 h-3.5 text-[var(--accent)]" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Dark/Light mode toggle */}
        <button
          onClick={toggleColorMode}
          className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-paper-hover)] transition-all glass-card-hover"
          title={colorMode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {colorMode === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600" />
          )}
        </button>

        {/* Lock Journal (if passcode enabled) */}
        {profile.passcode && (
          <button
            onClick={() => lock()}
            className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--accent)] hover:bg-[var(--bg-paper-hover)] transition-all glass-card-hover"
            title="Lock Journal for Privacy"
          >
            <Lock className="w-4 h-4" />
          </button>
        )}

        {/* User Profile Button */}
        <button
          onClick={onOpenAuthModal}
          className="flex items-center gap-1.5 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-[var(--accent-soft)]/70 hover:bg-[var(--accent-soft)] text-[var(--text-primary)] border border-[var(--accent)]/20 transition-all text-xs font-medium glass-card-hover"
          title="Profile & Privacy Settings"
        >
          <User className="w-3.5 h-3.5 text-[var(--accent)]" />
          <span className="hidden sm:inline font-semibold">{profile.name}</span>
        </button>

        {/* New Page Button */}
        <button
          onClick={onOpenNewPageModal}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-contrast)] text-xs font-semibold shadow-md transition-all active:scale-95 hover:shadow-lg"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Page</span>
        </button>
      </div>
    </header>
  );
}
