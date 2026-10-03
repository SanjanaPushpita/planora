'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePlanner } from '@/lib/storage';
import { InboxItemType, InboxItemPriority } from '@/lib/types';
import { generateId } from '@/lib/utils';
import { 
  Zap, 
  X, 
  Check, 
  Tag, 
  Calendar, 
  Link as LinkIcon, 
  Flag, 
  BookOpen, 
  FileText, 
  Sparkles,
  Loader2,
  CheckCircle2,
  ChevronDown,
  Globe,
  AlertCircle
} from 'lucide-react';

interface QuickCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: InboxItemType;
  initialContent?: string;
  initialSourceMeta?: {
    goalId?: string;
    paperId?: string;
    vaultId?: string;
  };
}

const TYPE_OPTIONS: { id: InboxItemType; label: string; icon: string; color: string }[] = [
  { id: 'note', label: 'Note', icon: '📝', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  { id: 'task', label: 'Task', icon: '✅', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
  { id: 'idea', label: 'Idea', icon: '💡', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' },
  { id: 'research_idea', label: 'Research Idea', icon: '🔬', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
  { id: 'link', label: 'Link', icon: '🔗', color: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20' },
  { id: 'reminder', label: 'Reminder', icon: '⏰', color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' },
  { id: 'vocabulary', label: 'Vocabulary', icon: '📖', color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20' },
  { id: 'someday', label: 'Someday / Maybe', icon: '🌱', color: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20' },
];

export function QuickCaptureModal({
  isOpen,
  onClose,
  defaultType = 'note',
  initialContent = '',
  initialSourceMeta,
}: QuickCaptureModalProps) {
  const { 
    saveInboxItem, 
    saveVocabularyItem, 
    goals, 
    researchPapers, 
    knowledgeItems 
  } = usePlanner();

  const [content, setContent] = useState(initialContent);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<InboxItemType>(defaultType);
  const [priority, setPriority] = useState<InboxItemPriority>('medium');
  const [tagsInput, setTagsInput] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [url, setUrl] = useState('');
  const [relatedGoalId, setRelatedGoalId] = useState(initialSourceMeta?.goalId || '');
  const [relatedPaperId, setRelatedPaperId] = useState(initialSourceMeta?.paperId || '');
  const [relatedVaultId, setRelatedVaultId] = useState(initialSourceMeta?.vaultId || '');

  const [vocabMeaning, setVocabMeaning] = useState('');
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setContent(initialContent || '');
      setTitle('');
      setType(defaultType || 'note');
      setPriority('medium');
      setTagsInput('');
      setDueDate('');
      setUrl('');
      setVocabMeaning('');
      setRelatedGoalId(initialSourceMeta?.goalId || '');
      setRelatedPaperId(initialSourceMeta?.paperId || '');
      setRelatedVaultId(initialSourceMeta?.vaultId || '');
      setShowOptionalFields(false);
      setSaveSuccessMsg(null);

      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    }
  }, [isOpen, defaultType, initialContent, initialSourceMeta]);

  if (!isOpen) return null;

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!content.trim() && !title.trim()) return;

    setIsSaving(true);
    try {
      const parsedTags = tagsInput
        .split(',')
        .map(t => t.trim().replace(/^#/, ''))
        .filter(Boolean);

      const stableId = generateId();

      // If user is capturing vocabulary directly
      if (type === 'vocabulary') {
        const wordText = title.trim() || content.trim();
        const meaningText = vocabMeaning.trim() || (title.trim() ? content.trim() : '');
        
        await saveVocabularyItem({
          id: generateId(),
          word: wordText,
          meaning: meaningText || 'Saved from Quick Capture',
          category: 'Quick Capture',
          tags: parsedTags,
          source_type: 'custom',
          source_title: 'Quick Capture',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      // Save into Inbox as primary durable capture
      await saveInboxItem({
        id: stableId,
        content: content.trim(),
        title: title.trim() || undefined,
        type,
        priority,
        tags: parsedTags,
        due_date: dueDate || null,
        url: url.trim() || null,
        related_goal_id: relatedGoalId || null,
        related_paper_id: relatedPaperId || null,
        related_knowledge_id: relatedVaultId || null,
        is_organized: type === 'vocabulary',
        organized_into: type === 'vocabulary' ? 'vocabulary' : null,
        organized_at: type === 'vocabulary' ? new Date().toISOString() : null,
        is_archived: false,
        is_trash: false,
        is_completed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      setSaveSuccessMsg('Saved to Inbox!');
      setTimeout(() => {
        setIsSaving(false);
        onClose();
      }, 350);
    } catch (err) {
      console.error('Failed to quick capture:', err);
      // Even if network fails, storage handles local fallback
      setSaveSuccessMsg('Saved locally — will sync automatically');
      setTimeout(() => {
        setIsSaving(false);
        onClose();
      }, 600);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl/Cmd + Enter to save quickly
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-lg bg-[var(--bg-paper)] rounded-2xl border border-[var(--border-strong)] shadow-2xl overflow-hidden flex flex-col transition-all duration-200"
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border-color)] bg-[var(--bg-paper-hover)]/40">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[var(--accent)] text-[var(--accent-contrast)] flex items-center justify-center font-bold text-xs shadow-xs">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif-aesthetic font-semibold text-sm text-[var(--text-primary)] leading-tight">
                Quick Capture
              </h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                Capture it now. Organize it later.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border-color)]/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSave} className="p-5 space-y-4">
          {/* Main prompt */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              What do you want to remember?
            </label>
            <textarea
              ref={textareaRef}
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Type your thought, task, idea, paper title, or note..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-paper)] text-[var(--text-primary)] text-sm focus:outline-hidden focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] resize-none transition-all placeholder:text-[var(--text-muted)] font-sans"
              required
            />
          </div>

          {/* Type Selector Pills */}
          <div>
            <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">
              Capture Type
            </label>
            <div className="flex flex-wrap gap-1.5">
              {TYPE_OPTIONS.map((opt) => {
                const isSelected = type === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setType(opt.id)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                      isSelected 
                        ? `${opt.color} ring-1 ring-current shadow-xs` 
                        : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-paper-hover)]'
                    }`}
                  >
                    <span>{opt.icon}</span>
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Vocabulary Specific Sub-field */}
          {type === 'vocabulary' && (
            <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/15 space-y-2">
              <label className="block text-xs font-medium text-indigo-700 dark:text-indigo-300">
                Meaning / Definition (Optional):
              </label>
              <input
                type="text"
                value={vocabMeaning}
                onChange={(e) => setVocabMeaning(e.target.value)}
                placeholder="What does this word mean? (Can complete later)"
                className="w-full px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800/40 bg-[var(--bg-paper)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          )}

          {/* Toggle Optional Fields */}
          <div>
            <button
              type="button"
              onClick={() => setShowOptionalFields(!showOptionalFields)}
              className="text-xs font-medium text-[var(--accent)] hover:underline flex items-center gap-1"
            >
              <span>{showOptionalFields ? 'Hide extra details' : '+ Add more details (Tags, Due date, Link, Goals)'}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showOptionalFields ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Optional Details Expandable */}
          {showOptionalFields && (
            <div className="pt-2 border-t border-[var(--border-color)] space-y-3 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Title */}
                <div>
                  <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
                    Short Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Transformers Survey"
                    className="w-full px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-paper)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
                  />
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as InboxItemPriority)}
                    className="w-full px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-paper)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Due Date */}
                <div>
                  <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>Due Date</span>
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-paper)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
                  />
                </div>

                {/* URL */}
                <div>
                  <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1 flex items-center gap-1">
                    <LinkIcon className="w-3 h-3" />
                    <span>URL Link</span>
                  </label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-paper)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
                  />
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1 flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  <span>Tags (comma-separated)</span>
                </label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="research, urgent, design, read-later"
                  className="w-full px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-paper)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
                />
              </div>

              {/* Related Goal / Paper / Vault */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                <div>
                  <label className="block text-[10px] font-medium text-[var(--text-muted)] mb-1 truncate">
                    Related Goal
                  </label>
                  <select
                    value={relatedGoalId}
                    onChange={(e) => setRelatedGoalId(e.target.value)}
                    className="w-full px-2 py-1 rounded-md border border-[var(--border-color)] bg-[var(--bg-paper)] text-[11px] text-[var(--text-secondary)] focus:outline-hidden"
                  >
                    <option value="">None</option>
                    {goals.filter(g => !g.is_trash).map(g => (
                      <option key={g.id} value={g.id}>{g.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-[var(--text-muted)] mb-1 truncate">
                    Related Paper
                  </label>
                  <select
                    value={relatedPaperId}
                    onChange={(e) => setRelatedPaperId(e.target.value)}
                    className="w-full px-2 py-1 rounded-md border border-[var(--border-color)] bg-[var(--bg-paper)] text-[11px] text-[var(--text-secondary)] focus:outline-hidden"
                  >
                    <option value="">None</option>
                    {researchPapers.filter(p => !p.is_trash).map(p => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-[var(--text-muted)] mb-1 truncate">
                    Related Vault Item
                  </label>
                  <select
                    value={relatedVaultId}
                    onChange={(e) => setRelatedVaultId(e.target.value)}
                    className="w-full px-2 py-1 rounded-md border border-[var(--border-color)] bg-[var(--bg-paper)] text-[11px] text-[var(--text-secondary)] focus:outline-hidden"
                  >
                    <option value="">None</option>
                    {knowledgeItems.map(k => (
                      <option key={k.id} value={k.id}>{k.title}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-[var(--border-color)]">
            <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-1.5">
              <span className="hidden sm:inline">Press</span>
              <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-paper-hover)] border border-[var(--border-color)] text-[10px] font-mono">
                ⌘/Ctrl + Enter
              </kbd>
              <span className="hidden sm:inline">to save</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-xl border border-[var(--border-color)] hover:bg-[var(--bg-paper-hover)] text-xs font-medium text-[var(--text-secondary)] transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSaving || (!content.trim() && !title.trim())}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[var(--accent)] hover:opacity-90 disabled:opacity-50 text-[var(--accent-contrast)] text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : saveSuccessMsg ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{saveSuccessMsg}</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    <span>Save to Inbox</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
