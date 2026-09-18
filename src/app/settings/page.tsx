'use client';

import React, { useState } from 'react';
import { usePlanner } from '@/lib/storage';
import { useTheme } from '@/lib/theme-context';
import { ThemeName, ColorMode } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { 
  Download, 
  Upload, 
  Palette, 
  User, 
  Lock, 
  ShieldCheck, 
  RotateCcw, 
  Check, 
  AlertCircle,
  Database,
  Sparkles
} from 'lucide-react';

export default function SettingsPage() {
  const { storage, profile, updateProfile, refreshPages, refreshProfile } = usePlanner();
  const { theme, colorMode, setTheme, setColorMode } = useTheme();

  const [name, setName] = useState(profile.name || '');
  const [tagline, setTagline] = useState(profile.tagline || '');
  const [passcode, setPasscode] = useState(profile.passcode || '');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  const themes: { id: ThemeName; name: string; color: string; desc: string }[] = [
    { id: 'blush', name: 'Blush Rose', color: '#d87070', desc: 'Soft ballet rose and warm pastel blush (Inspired by Reference 1)' },
    { id: 'sage', name: 'Sage Botanical', color: '#436d4e', desc: 'Serene botanical matcha green and linen (Inspired by Reference 2 & 4)' },
    { id: 'warm', name: 'Warm Paper', color: '#b8623b', desc: 'Classic physical notebook cream and terracotta amber' },
    { id: 'minimal', name: 'Minimalist', color: '#1f2937', desc: 'Crisp editorial charcoal and light neutral tones' },
    { id: 'lavender', name: 'Lavender Mist', color: '#785a9c', desc: 'Dreamy soft lilac and wisteria slate' },
  ];

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfile({
      name: name.trim() || 'Sophia',
      tagline: tagline.trim(),
      passcode: passcode.trim() || undefined,
    });
    alert('Settings updated successfully!');
  };

  const handleExportJSON = async () => {
    try {
      const data = await storage.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `planora-backup-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert('Failed to export data');
    }
  };

  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string;
        const parsed = JSON.parse(text);
        if (!parsed.pages || !parsed.blocks) {
          throw new Error('Invalid Planora backup file.');
        }
        await storage.importData(parsed);
        await refreshProfile();
        await refreshPages();
        setImportStatus('Backup successfully restored! Refreshing data...');
        setTimeout(() => setImportStatus(null), 3000);
      } catch (err: any) {
        setImportStatus(`Import error: ${err.message || 'Corrupted file'}`);
      }
    };
    reader.readAsText(file);
  };

  const handleResetData = async () => {
    await storage.resetToDefault();
    await refreshProfile();
    await refreshPages();
    setIsResetConfirmOpen(false);
    alert('Planora reset to initial starter templates!');
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-20">
      {/* Header */}
      <div className="border-b border-[var(--border-color)] pb-4">
        <h2 className="font-serif-aesthetic text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
          Planner Settings & Backup
        </h2>
        <p className="font-serif-aesthetic italic text-xs text-[var(--text-secondary)] mt-0.5">
          Themes, personalization, passcode privacy, and complete data control
        </p>
      </div>

      {/* Theme & Aesthetics */}
      <div className="journal-paper p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-3">
          <Palette className="w-4 h-4 text-[var(--accent)]" />
          <h3 className="font-serif-aesthetic text-base font-semibold text-[var(--text-primary)]">
            Aesthetic Themes & Appearance
          </h3>
        </div>

        {/* Theme Palette Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {themes.map((t) => {
            const isSelected = theme === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTheme(t.id)}
                className={`p-3.5 rounded-xl text-left border transition-all ${
                  isSelected
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] ring-1 ring-[var(--accent)]'
                    : 'border-[var(--border-color)] bg-[var(--bg-paper-subtle)] hover:bg-[var(--bg-paper-hover)]'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-4 h-4 rounded-full border border-black/10 shadow-xs"
                      style={{ backgroundColor: t.color }}
                    />
                    <span className="text-xs font-semibold text-[var(--text-primary)]">
                      {t.name}
                    </span>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-[var(--accent)]" />}
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] leading-snug">
                  {t.desc}
                </p>
              </button>
            );
          })}
        </div>

        {/* Color Mode Toggle */}
        <div className="flex items-center justify-between pt-3 border-t border-[var(--border-color)]">
          <span className="text-xs font-semibold text-[var(--text-primary)]">
            Light / Dark Mode
          </span>
          <div className="flex items-center gap-2 bg-[var(--bg-paper-subtle)] p-1 rounded-xl border border-[var(--border-color)]">
            <button
              type="button"
              onClick={() => setColorMode('light')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                colorMode === 'light'
                  ? 'bg-[var(--bg-paper)] text-[var(--text-primary)] shadow-2xs font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Light Mode
            </button>
            <button
              type="button"
              onClick={() => setColorMode('dark')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                colorMode === 'dark'
                  ? 'bg-[var(--bg-paper)] text-[var(--text-primary)] shadow-2xs font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Dark Mode
            </button>
          </div>
        </div>
      </div>

      {/* Owner Profile & Privacy Passcode */}
      <form onSubmit={handleSaveProfile} className="journal-paper p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-3">
          <User className="w-4 h-4 text-[var(--accent)]" />
          <h3 className="font-serif-aesthetic text-base font-semibold text-[var(--text-primary)]">
            Journal Belonging & Privacy Passcode
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Owner Name / Signature"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label="Personal Mantra / Motto"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
          />
        </div>

        <div className="pt-2">
          <div className="flex items-center gap-2 mb-1.5">
            <Lock className="w-4 h-4 text-[var(--text-secondary)]" />
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              Privacy Passcode
            </label>
          </div>
          <Input
            type="password"
            placeholder="Leave empty for no passcode lock"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
          />
          <p className="text-[11px] text-[var(--text-muted)] mt-1">
            Protects your journal with a passcode lock screen. You can lock it anytime from the top header.
          </p>
        </div>

        <div className="flex justify-end pt-3">
          <Button type="submit" variant="primary" size="sm">
            Save Profile Settings
          </Button>
        </div>
      </form>

      {/* Backup, Export & Import */}
      <div className="journal-paper p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-3">
          <Database className="w-4 h-4 text-[var(--accent)]" />
          <h3 className="font-serif-aesthetic text-base font-semibold text-[var(--text-primary)]">
            Data Ownership & JSON Backup
          </h3>
        </div>

        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          Your personal data is strictly private and stored on your device. Export a clean JSON backup file to keep in your personal archives, or import an existing backup to restore all pages, blocks, and trackers.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          {/* Export button */}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleExportJSON}
          >
            <Download className="w-4 h-4 mr-1.5" />
            <span>Export Planner Data (JSON)</span>
          </Button>

          {/* Import file input */}
          <label className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[var(--border-strong)] bg-transparent hover:bg-[var(--bg-paper-hover)] text-[var(--text-primary)] text-xs font-medium cursor-pointer transition-colors">
            <Upload className="w-4 h-4 text-[var(--accent)]" />
            <span>Import Backup JSON</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportJSON}
              className="hidden"
            />
          </label>
        </div>

        {importStatus && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-medium flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>{importStatus}</span>
          </div>
        )}
      </div>

      {/* Reset Area */}
      <div className="journal-paper p-6 space-y-3 border-red-200 dark:border-red-950">
        <h4 className="font-semibold text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>Reset to Factory Starter Templates</span>
        </h4>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          Restore the original sample starter templates (Daily Planner, Habit Tracker, Study Log, 30-Day Challenge, Journal Welcome).
        </p>
        <Button
          variant="danger"
          size="sm"
          onClick={() => setIsResetConfirmOpen(true)}
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1" />
          <span>Reset Starter Data</span>
        </Button>
      </div>

      {/* Reset confirmation modal */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-sm journal-paper p-6 space-y-4 border border-red-200 dark:border-red-900 shadow-2xl">
            <h4 className="font-semibold text-sm text-red-600 dark:text-red-400">
              Confirm Reset?
            </h4>
            <p className="text-xs text-[var(--text-secondary)]">
              This will overwrite your existing custom pages with the clean starter templates.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setIsResetConfirmOpen(false)}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" onClick={handleResetData}>
                Yes, Reset All
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
