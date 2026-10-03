'use client';

import React, { useState } from 'react';
import { usePlanner } from '@/lib/storage';
import { useTheme } from '@/lib/theme-context';
import { ThemeName, ColorMode, PlannerBackup, BackupImportResult } from '@/lib/types';
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
  Sparkles,
  Layers,
  Clock,
  Keyboard,
  Info,
  Sliders,
  CheckCircle2,
  FileText,
  AlertTriangle,
  Loader2
} from 'lucide-react';

type SettingsTab = 'appearance' | 'backup' | 'account' | 'preferences';

export default function SettingsPage() {
  const { storage, profile, updateProfile, refreshPages, refreshProfile } = usePlanner();
  const { theme, colorMode, setTheme, setColorMode } = useTheme();

  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');

  // Profile Form State
  const [name, setName] = useState(profile.name || '');
  const [tagline, setTagline] = useState(profile.tagline || '');
  const [passcode, setPasscode] = useState(profile.passcode || '');
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);

  // Backup & Import State
  const [isExporting, setIsExporting] = useState(false);
  const [pendingBackupData, setPendingBackupData] = useState<PlannerBackup | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<BackupImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Preferences State
  const [walkDefaultTarget, setWalkDefaultTarget] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('planora_pref_walk_target') || '5';
    }
    return '5';
  });
  const [focusDefaultDuration, setFocusDefaultDuration] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('planora_pref_focus_duration') || '25';
    }
    return '25';
  });

  const themes: { id: ThemeName; name: string; color: string; desc: string }[] = [
    { id: 'blush', name: 'Blush Rose', color: '#d87070', desc: 'Soft ballet rose and warm pastel blush' },
    { id: 'sage', name: 'Sage Botanical', color: '#436d4e', desc: 'Serene botanical matcha green and linen' },
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
    setProfileSaveSuccess(true);
    setTimeout(() => setProfileSaveSuccess(false), 3000);
  };

  const handleSavePreferences = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('planora_pref_walk_target', walkDefaultTarget);
      localStorage.setItem('planora_pref_focus_duration', focusDefaultDuration);
    }
    setProfileSaveSuccess(true);
    setTimeout(() => setProfileSaveSuccess(false), 3000);
  };

  const handleExportJSON = async () => {
    setIsExporting(true);
    try {
      const data = await storage.exportData();
      const exportPayload = {
        app: 'Planora',
        backupVersion: 1,
        ...data,
      };

      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `planora-backup-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export error:', e);
      alert('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelectForImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string;
        const parsed = JSON.parse(text);

        // Pre-validation
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('File does not contain valid JSON.');
        }
        if (!Array.isArray(parsed.pages) || !Array.isArray(parsed.blocks)) {
          throw new Error('Invalid Planora backup: Missing pages or blocks.');
        }

        setPendingBackupData(parsed);
        setIsImportModalOpen(true);
      } catch (err: any) {
        setImportError(`Validation error: ${err.message || 'Corrupted or unsupported file format'}`);
      }
    };
    reader.readAsText(file);
    // Reset file input
    e.target.value = '';
  };

  const handleExecuteImport = async () => {
    if (!pendingBackupData) return;

    setIsImporting(true);
    setImportError(null);

    try {
      const result = await storage.importData(pendingBackupData, importMode);
      setImportResult(result);
      await refreshProfile();
      await refreshPages();
      setIsImportModalOpen(false);
      setPendingBackupData(null);
    } catch (err: any) {
      console.error('Import execution error:', err);
      setImportError(`Import failed: ${err.message || 'Error parsing records'}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleResetData = async () => {
    await storage.resetToDefault();
    await refreshProfile();
    await refreshPages();
    setIsResetConfirmOpen(false);
    alert('Planora reset to initial starter templates!');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="border-b border-[var(--border-color)] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif-aesthetic text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
            Settings & Control
          </h1>
          <p className="font-serif-aesthetic italic text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
            Themes, personalization, passcode privacy, and complete data ownership
          </p>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] overflow-x-auto">
        <button
          onClick={() => setActiveTab('appearance')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'appearance'
              ? 'bg-[var(--bg-paper)] text-[var(--text-primary)] shadow-xs border border-[var(--border-color)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Palette className="w-3.5 h-3.5 text-[var(--accent)]" />
          <span>Appearance</span>
        </button>

        <button
          onClick={() => setActiveTab('backup')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'backup'
              ? 'bg-[var(--bg-paper)] text-[var(--text-primary)] shadow-xs border border-[var(--border-color)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Database className="w-3.5 h-3.5 text-emerald-600" />
          <span>Data & Backup</span>
        </button>

        <button
          onClick={() => setActiveTab('account')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'account'
              ? 'bg-[var(--bg-paper)] text-[var(--text-primary)] shadow-xs border border-[var(--border-color)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <User className="w-3.5 h-3.5 text-indigo-500" />
          <span>Account & Privacy</span>
        </button>

        <button
          onClick={() => setActiveTab('preferences')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'preferences'
              ? 'bg-[var(--bg-paper)] text-[var(--text-primary)] shadow-xs border border-[var(--border-color)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Sliders className="w-3.5 h-3.5 text-amber-500" />
          <span>Preferences & Keys</span>
        </button>
      </div>

      {/* Success Notification */}
      {profileSaveSuccess && (
        <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Settings saved successfully ✓</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: APPEARANCE */}
      {/* ========================================================================= */}
      {activeTab === 'appearance' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="journal-paper p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-3">
              <Palette className="w-4 h-4 text-[var(--accent)]" />
              <h3 className="font-serif-aesthetic text-base font-semibold text-[var(--text-primary)]">
                Aesthetic Themes
              </h3>
            </div>

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
            <div className="flex items-center justify-between pt-4 border-t border-[var(--border-color)]">
              <div>
                <span className="text-xs font-semibold text-[var(--text-primary)] block">
                  Color Mode
                </span>
                <span className="text-[11px] text-[var(--text-muted)]">
                  Switch between daytime paper and dark ambient reading mode
                </span>
              </div>
              <div className="flex items-center gap-1.5 bg-[var(--bg-paper-subtle)] p-1 rounded-xl border border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setColorMode('light')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    colorMode === 'light'
                      ? 'bg-[var(--bg-paper)] text-[var(--text-primary)] shadow-2xs font-semibold'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Light
                </button>
                <button
                  type="button"
                  onClick={() => setColorMode('dark')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    colorMode === 'dark'
                      ? 'bg-[var(--bg-paper)] text-[var(--text-primary)] shadow-2xs font-semibold'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Dark
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DATA & BACKUP */}
      {/* ========================================================================= */}
      {activeTab === 'backup' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Export & Import Card */}
          <div className="journal-paper p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-3">
              <Database className="w-4 h-4 text-emerald-600" />
              <div>
                <h3 className="font-serif-aesthetic text-base font-semibold text-[var(--text-primary)]">
                  Full Data Export & Backup
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Export complete snapshots of your pages, tasks, notes, habits, vocabulary, papers, and reviews in clean JSON.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-xs text-[var(--text-secondary)] space-y-2">
              <div className="flex items-center gap-2 font-semibold text-[var(--text-primary)]">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Security & Ownership Guarantee</span>
              </div>
              <p className="leading-relaxed text-[11px]">
                Backups contain strictly your personal planner data. Passwords, secret keys, and credentials are never included in exported JSON files.
              </p>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleExportJSON}
                disabled={isExporting}
              >
                {isExporting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Download className="w-4 h-4 mr-1.5" />}
                <span>Export My Data (JSON)</span>
              </Button>

              <label className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[var(--border-strong)] bg-transparent hover:bg-[var(--bg-paper-hover)] text-[var(--text-primary)] text-xs font-semibold cursor-pointer transition-colors shadow-2xs">
                <Upload className="w-4 h-4 text-[var(--accent)]" />
                <span>Import Backup JSON...</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileSelectForImport}
                  className="hidden"
                />
              </label>
            </div>

            {importError && (
              <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-800 dark:text-red-300 flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{importError}</span>
              </div>
            )}

            {importResult && (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs space-y-2 animate-in fade-in">
                <div className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{importResult.message || 'Data successfully restored!'}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
                  <div>Pages: <strong>{importResult.summary.pages}</strong></div>
                  <div>Tasks: <strong>{importResult.summary.tasks}</strong></div>
                  <div>Vocabulary: <strong>{importResult.summary.vocabulary}</strong></div>
                  <div>Papers: <strong>{importResult.summary.papers}</strong></div>
                  <div>Goals: <strong>{importResult.summary.goals}</strong></div>
                  <div>Vault Notes: <strong>{importResult.summary.vault}</strong></div>
                  <div>Sprints: <strong>{importResult.summary.sprints}</strong></div>
                  <div>Inbox: <strong>{importResult.summary.inbox}</strong></div>
                </div>
              </div>
            )}
          </div>

          {/* Reset Starter Area */}
          <div className="journal-paper p-6 space-y-3 border-red-200 dark:border-red-950">
            <h4 className="font-semibold text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>Reset to Starter Templates</span>
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: ACCOUNT & PRIVACY */}
      {/* ========================================================================= */}
      {activeTab === 'account' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <form onSubmit={handleSaveProfile} className="journal-paper p-6 space-y-5">
            <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-3">
              <User className="w-4 h-4 text-indigo-500" />
              <h3 className="font-serif-aesthetic text-base font-semibold text-[var(--text-primary)]">
                Owner Belonging & Privacy Passcode
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
                  Privacy Passcode Lock
                </label>
              </div>
              <Input
                type="password"
                placeholder="Leave empty for no passcode lock"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
              />
              <p className="text-[11px] text-[var(--text-muted)] mt-1.5">
                Enables a PIN/passcode lock screen guard. You can quickly lock Planora anytime using the lock icon in the top header.
              </p>
            </div>

            <div className="flex justify-end pt-3 border-t border-[var(--border-color)]">
              <Button type="submit" variant="primary" size="sm">
                Save Profile Settings
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: PREFERENCES & KEYS */}
      {/* ========================================================================= */}
      {activeTab === 'preferences' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Tracker Durations */}
          <div className="journal-paper p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-3">
              <Clock className="w-4 h-4 text-amber-500" />
              <h3 className="font-serif-aesthetic text-base font-semibold text-[var(--text-primary)]">
                Default Tracker Durations
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                  Default Walk Target (Minutes)
                </label>
                <select
                  value={walkDefaultTarget}
                  onChange={(e) => setWalkDefaultTarget(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none"
                >
                  <option value="5">5 Minutes</option>
                  <option value="10">10 Minutes</option>
                  <option value="15">15 Minutes</option>
                  <option value="20">20 Minutes</option>
                  <option value="30">30 Minutes</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                  Default Focus Session (Minutes)
                </label>
                <select
                  value={focusDefaultDuration}
                  onChange={(e) => setFocusDefaultDuration(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none"
                >
                  <option value="15">15 Minutes</option>
                  <option value="25">25 Minutes (Pomodoro)</option>
                  <option value="45">45 Minutes</option>
                  <option value="60">60 Minutes (Deep Work)</option>
                  <option value="90">90 Minutes</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="button" variant="primary" size="sm" onClick={handleSavePreferences}>
                Save Preferences
              </Button>
            </div>
          </div>

          {/* Keyboard Shortcuts Cheat Sheet */}
          <div className="journal-paper p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-3">
              <Keyboard className="w-4 h-4 text-[var(--accent)]" />
              <h3 className="font-serif-aesthetic text-base font-semibold text-[var(--text-primary)]">
                Keyboard Shortcuts
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] flex items-center justify-between">
                <span className="text-[var(--text-secondary)]">Quick Capture Modal</span>
                <kbd className="font-mono text-[10px] px-2 py-0.5 rounded bg-[var(--bg-paper)] border border-[var(--border-color)] font-bold text-[var(--text-primary)]">
                  Ctrl + Shift + Space
                </kbd>
              </div>

              <div className="p-3 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] flex items-center justify-between">
                <span className="text-[var(--text-secondary)]">Command Palette & Search</span>
                <kbd className="font-mono text-[10px] px-2 py-0.5 rounded bg-[var(--bg-paper)] border border-[var(--border-color)] font-bold text-[var(--text-primary)]">
                  Ctrl / Cmd + K
                </kbd>
              </div>

              <div className="p-3 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] flex items-center justify-between">
                <span className="text-[var(--text-secondary)]">Manual Save</span>
                <kbd className="font-mono text-[10px] px-2 py-0.5 rounded bg-[var(--bg-paper)] border border-[var(--border-color)] font-bold text-[var(--text-primary)]">
                  Ctrl / Cmd + S
                </kbd>
              </div>

              <div className="p-3 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] flex items-center justify-between">
                <span className="text-[var(--text-secondary)]">Bold Text in Editor</span>
                <kbd className="font-mono text-[10px] px-2 py-0.5 rounded bg-[var(--bg-paper)] border border-[var(--border-color)] font-bold text-[var(--text-primary)]">
                  Ctrl / Cmd + B
                </kbd>
              </div>

              <div className="p-3 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] flex items-center justify-between">
                <span className="text-[var(--text-secondary)]">Italic Text in Editor</span>
                <kbd className="font-mono text-[10px] px-2 py-0.5 rounded bg-[var(--bg-paper)] border border-[var(--border-color)] font-bold text-[var(--text-primary)]">
                  Ctrl / Cmd + I
                </kbd>
              </div>

              <div className="p-3 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] flex items-center justify-between">
                <span className="text-[var(--text-secondary)]">Toggle Sidebar</span>
                <kbd className="font-mono text-[10px] px-2 py-0.5 rounded bg-[var(--bg-paper)] border border-[var(--border-color)] font-bold text-[var(--text-primary)]">
                  Ctrl / Cmd + \
                </kbd>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* IMPORT CONFIRMATION & OPTIONS MODAL */}
      {/* ========================================================================= */}
      {isImportModalOpen && pendingBackupData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md journal-paper p-6 space-y-5 border-2 border-[var(--border-strong)] shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-3">
              <Upload className="w-5 h-5 text-[var(--accent)]" />
              <div>
                <h3 className="font-serif-aesthetic font-bold text-base text-[var(--text-primary)]">
                  Confirm Backup Restore
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Valid backup from {pendingBackupData.exportedAt ? new Date(pendingBackupData.exportedAt).toLocaleDateString() : 'archive'}
                </p>
              </div>
            </div>

            {/* Choose Mode */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-[var(--text-primary)]">
                Restore Mode
              </label>

              <label className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                importMode === 'merge' ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-[var(--border-color)] bg-[var(--bg-paper-subtle)]'
              }`}>
                <input
                  type="radio"
                  name="importMode"
                  value="merge"
                  checked={importMode === 'merge'}
                  onChange={() => setImportMode('merge')}
                  className="mt-0.5 accent-[var(--accent)]"
                />
                <div className="text-xs space-y-0.5">
                  <span className="font-bold text-[var(--text-primary)] block">Merge with current data (Recommended)</span>
                  <span className="text-[var(--text-secondary)] block">
                    Adds new items and updates matching records by ID without discarding other existing entries.
                  </span>
                </div>
              </label>

              <label className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                importMode === 'replace' ? 'border-red-500 bg-red-50/50 dark:bg-red-950/30' : 'border-[var(--border-color)] bg-[var(--bg-paper-subtle)]'
              }`}>
                <input
                  type="radio"
                  name="importMode"
                  value="replace"
                  checked={importMode === 'replace'}
                  onChange={() => setImportMode('replace')}
                  className="mt-0.5 accent-red-600"
                />
                <div className="text-xs space-y-0.5">
                  <span className="font-bold text-red-600 dark:text-red-400 block">Replace all Planora data</span>
                  <span className="text-[var(--text-secondary)] block">
                    Overwrites your local database with this backup file.
                  </span>
                </div>
              </label>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-color)]">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setPendingBackupData(null);
                }}
                disabled={isImporting}
              >
                Cancel
              </Button>
              <Button
                variant={importMode === 'replace' ? 'danger' : 'primary'}
                size="sm"
                onClick={handleExecuteImport}
                disabled={isImporting}
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                    <span>Restoring...</span>
                  </>
                ) : (
                  <span>{importMode === 'replace' ? 'Replace All' : 'Merge Data'}</span>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* RESET TO DEFAULT MODAL */}
      {/* ========================================================================= */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-sm journal-paper p-6 space-y-4 border-2 border-red-200 dark:border-red-900 shadow-2xl animate-in zoom-in-95 duration-150">
            <h4 className="font-semibold text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span>Confirm Starter Reset?</span>
            </h4>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              This will reset your local database to the clean initial starter templates.
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
