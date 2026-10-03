'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePlanner } from '@/lib/storage';
import { ResearchPaper, PaperStatus, PaperPriority, StructuredPaperNotes } from '@/lib/types';
import { generateId, formatDate } from '@/lib/utils';
import { 
  ArrowLeft, 
  FileText, 
  Star, 
  ExternalLink, 
  Save, 
  Clock, 
  BookOpen, 
  Target, 
  Trash2, 
  RotateCcw, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  Plus,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Tag,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  BookmarkCheck
} from 'lucide-react';

export default function PaperDetailPage() {
  const params = useParams();
  const router = useRouter();
  const paperId = params.id as string;

  const { 
    researchPapers, 
    updateResearchPaper, 
    deleteResearchPaper, 
    restoreResearchPaper,
    saveKnowledgeItem,
    saveVocabularyItem,
    focusSessions,
    paperSaveStatus 
  } = usePlanner();

  const paper = researchPapers.find(p => p.id === paperId);

  // Local draft safety key
  const DRAFT_KEY = `planora_paper_draft_${paperId}`;

  // Form State
  const [title, setTitle] = useState('');
  const [authors, setAuthors] = useState('');
  const [year, setYear] = useState<number | undefined>(undefined);
  const [journalConference, setJournalConference] = useState('');
  const [doi, setDoi] = useState('');
  const [url, setUrl] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [researchArea, setResearchArea] = useState('General');
  const [tags, setTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [status, setStatus] = useState<PaperStatus>('to_read');
  const [priority, setPriority] = useState<PaperPriority>('medium');
  const [readingProgress, setReadingProgress] = useState<number>(0);
  const [pagesRead, setPagesRead] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [isFavorite, setIsFavorite] = useState(false);

  // Vocabulary quick save modal state
  const [isVocabModalOpen, setIsVocabModalOpen] = useState(false);
  const [vocabWord, setVocabWord] = useState('');
  const [vocabMeaning, setVocabMeaning] = useState('');
  const [vocabExample, setVocabExample] = useState('');
  const [vocabSavedNotification, setVocabSavedNotification] = useState(false);

  // Structured Notes State
  const [notesState, setNotesState] = useState<StructuredPaperNotes>({});
  const [generalNotes, setGeneralNotes] = useState<string>('');
  const [keyInsights, setKeyInsights] = useState<string>('');

  // Active section view
  const [activeSection, setActiveSection] = useState<'overview' | 'notes' | 'results' | 'analysis' | 'application' | 'sessions'>('notes');
  
  // Autosave & draft recovery state
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [isDraftRecovered, setIsDraftRecovered] = useState(false);
  const [vaultSavedNotification, setVaultSavedNotification] = useState(false);

  // Reference for rich text active field
  const richEditorRef = useRef<HTMLDivElement>(null);
  const [activeRichField, setActiveRichField] = useState<keyof StructuredPaperNotes | 'generalNotes'>('research_problem');

  // 1. Initialize from loaded paper & check local draft
  useEffect(() => {
    if (!paper) return;

    // Check if newer draft exists in localStorage
    const savedDraft = localStorage.getItem(DRAFT_KEY);
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        if (parsed.updated_at && new Date(parsed.updated_at).getTime() > new Date(paper.updated_at).getTime()) {
          setTitle(parsed.title || paper.title);
          setAuthors(parsed.authors || paper.authors || '');
          setYear(parsed.year || paper.year);
          setJournalConference(parsed.journal_conference || paper.journal_conference || '');
          setDoi(parsed.doi || paper.doi || '');
          setUrl(parsed.url || paper.url || '');
          setPdfUrl(parsed.pdf_url || paper.pdf_url || '');
          setResearchArea(parsed.research_area || paper.research_area || 'General');
          setTags(parsed.tags || paper.tags || []);
          setStatus(parsed.status || paper.status);
          setPriority(parsed.priority || paper.priority);
          setReadingProgress(parsed.reading_progress ?? paper.reading_progress ?? 0);
          setPagesRead(parsed.pages_read || paper.pages_read || 0);
          setTotalPages(parsed.total_pages || paper.total_pages || 0);
          setIsFavorite(Boolean(parsed.is_favorite ?? paper.is_favorite));
          setNotesState(parsed.structured_notes || paper.structured_notes || {});
          setGeneralNotes(parsed.notes || paper.notes || '');
          setKeyInsights(parsed.key_insights || paper.key_insights || '');
          setIsDraftRecovered(true);
          return;
        }
      } catch (e) {
        console.error('Error reading draft:', e);
      }
    }

    // Default initialization from server paper
    setTitle(paper.title);
    setAuthors(paper.authors || '');
    setYear(paper.year);
    setJournalConference(paper.journal_conference || '');
    setDoi(paper.doi || '');
    setUrl(paper.url || '');
    setPdfUrl(paper.pdf_url || '');
    setResearchArea(paper.research_area || 'General');
    setTags(paper.tags || []);
    setStatus(paper.status);
    setPriority(paper.priority);
    setReadingProgress(paper.reading_progress || 0);
    setPagesRead(paper.pages_read || 0);
    setTotalPages(paper.total_pages || 0);
    setIsFavorite(Boolean(paper.is_favorite));
    setNotesState(paper.structured_notes || {});
    setGeneralNotes(paper.notes || '');
    setKeyInsights(paper.key_insights || '');
  }, [paper, DRAFT_KEY]);

  // 2. Save local safety draft on changes
  useEffect(() => {
    if (!paper) return;
    const currentData = {
      title,
      authors,
      year,
      journal_conference: journalConference,
      doi,
      url,
      pdf_url: pdfUrl,
      research_area: researchArea,
      tags,
      status,
      priority,
      reading_progress: readingProgress,
      pages_read: pagesRead,
      total_pages: totalPages,
      is_favorite: isFavorite,
      structured_notes: notesState,
      notes: generalNotes,
      key_insights: keyInsights,
      updated_at: new Date().toISOString(),
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(currentData));
    setHasUnsavedChanges(true);
  }, [
    paper,
    title,
    authors,
    year,
    journalConference,
    doi,
    url,
    pdfUrl,
    researchArea,
    tags,
    status,
    priority,
    readingProgress,
    pagesRead,
    totalPages,
    isFavorite,
    notesState,
    generalNotes,
    keyInsights,
    DRAFT_KEY
  ]);

  // 3. Debounced autosave to Supabase (800ms)
  useEffect(() => {
    if (!paper || !hasUnsavedChanges) return;

    const timer = setTimeout(async () => {
      try {
        await updateResearchPaper(paper.id, {
          title,
          authors,
          year,
          journal_conference: journalConference,
          doi,
          url,
          pdf_url: pdfUrl,
          research_area: researchArea,
          tags,
          status,
          priority,
          reading_progress: readingProgress,
          pages_read: pagesRead,
          total_pages: totalPages,
          is_favorite: isFavorite,
          structured_notes: notesState,
          notes: generalNotes,
          key_insights: keyInsights,
        });
        setHasUnsavedChanges(false);
        setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      } catch (err) {
        console.error('Autosave failed:', err);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [
    paper,
    hasUnsavedChanges,
    title,
    authors,
    year,
    journalConference,
    doi,
    url,
    pdfUrl,
    researchArea,
    tags,
    status,
    priority,
    readingProgress,
    pagesRead,
    totalPages,
    isFavorite,
    notesState,
    generalNotes,
    keyInsights,
    updateResearchPaper
  ]);

  // Manual explicit save
  const handleManualSave = async () => {
    if (!paper) return;
    try {
      await updateResearchPaper(paper.id, {
        title,
        authors,
        year,
        journal_conference: journalConference,
        doi,
        url,
        pdf_url: pdfUrl,
        research_area: researchArea,
        tags,
        status,
        priority,
        reading_progress: readingProgress,
        pages_read: pagesRead,
        total_pages: totalPages,
        is_favorite: isFavorite,
        structured_notes: notesState,
        notes: generalNotes,
        key_insights: keyInsights,
      });
      setHasUnsavedChanges(false);
      setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (e) {
      console.error('Manual save failed:', e);
    }
  };

  // Update structured notes field
  const handleUpdateStructuredField = (field: keyof StructuredPaperNotes, value: string) => {
    setNotesState(prev => ({ ...prev, [field]: value }));
  };

  // Rich Text Formatting helper
  const handleFormat = (command: string) => {
    document.execCommand(command, false);
  };

  // Add Tag
  const handleAddTag = () => {
    if (!newTagInput.trim()) return;
    const clean = newTagInput.trim().toLowerCase();
    if (!tags.includes(clean)) {
      setTags([...tags, clean]);
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  // Export Key Insights to Knowledge Vault
  const handleSaveInsightsToVault = async () => {
    if (!paper) return;
    try {
      const now = new Date().toISOString();
      const vaultSummary = notesState.key_findings || notesState.research_gap || `Key research insights from ${title}`;
      
      const structuredHtml = `
        <h3>Research Objective</h3>
        <p>${notesState.research_objective || 'N/A'}</p>
        <h3>Key Findings</h3>
        <p>${notesState.key_findings || 'N/A'}</p>
        <h3>Methodology & Models</h3>
        <p>${notesState.models_methods || 'N/A'}</p>
        <h3>Dataset</h3>
        <p>${notesState.dataset || 'N/A'}</p>
        <h3>Research Gap</h3>
        <p>${notesState.research_gap || 'N/A'}</p>
        <h3>How to Use This Paper</h3>
        <p>${notesState.how_can_i_use_this_paper || 'N/A'}</p>
        ${generalNotes ? `<h3>My Personal Notes</h3><p>${generalNotes}</p>` : ''}
      `;

      await saveKnowledgeItem({
        id: `know-${generateId()}`,
        title: `Insights: ${title}`,
        type: 'note',
        category: researchArea || 'Research',
        summary: vaultSummary,
        content: structuredHtml,
        tags: [...tags, 'research-paper', (researchArea || '').toLowerCase()],
        is_favorite: false,
        sources: [
          ...(url ? [{ id: generateId(), title: title, url: url, note: `Published in ${journalConference || 'ArXiv'}` }] : [])
        ],
        key_points: [
          notesState.key_findings || '',
          notesState.research_gap || '',
          notesState.best_model || ''
        ].filter(Boolean),
        created_at: now,
        updated_at: now,
      });

      setVaultSavedNotification(true);
      setTimeout(() => setVaultSavedNotification(false), 4000);
    } catch (e) {
      console.error('Failed to save to Knowledge Vault:', e);
    }
  };

  // Save technical term into Vocabulary
  const handleSavePaperTermToVocab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vocabWord.trim()) return;

    try {
      await saveVocabularyItem({
        id: `voc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        word: vocabWord.trim(),
        meaning: vocabMeaning.trim() || 'Key technical concept from paper',
        example: vocabExample.trim() || (title ? `From paper: "${title}"` : undefined),
        category: researchArea || 'Research Paper',
        tags: [...tags, 'research-term', (researchArea || '').toLowerCase().replace(/\s+/g, '-')],
        source_type: 'paper',
        source_paper_id: paperId,
        source_title: title,
        status: 'new',
        review_count: 0,
        ease_factor: 2.5,
        interval_days: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      setVocabSavedNotification(true);
      setVocabWord('');
      setVocabMeaning('');
      setVocabExample('');
      setIsVocabModalOpen(false);
      setTimeout(() => setVocabSavedNotification(false), 4000);
    } catch (e) {
      console.error('Failed to save term to vocabulary:', e);
    }
  };

  // Related Focus Sessions
  const relatedSessions = useMemo(() => {
    return focusSessions.filter(fs => fs.related_paper_id === paperId);
  }, [focusSessions, paperId]);

  // Related Papers by shared tags or area
  const relatedPapers = useMemo(() => {
    if (!paper) return [];
    return researchPapers
      .filter(p => p.id !== paper.id && !p.is_trash)
      .filter(p => {
        const sharesArea = p.research_area?.toLowerCase() === researchArea.toLowerCase();
        const sharesTag = (p.tags || []).some(t => tags.includes(t));
        return sharesArea || sharesTag;
      })
      .slice(0, 4);
  }, [researchPapers, paper, researchArea, tags]);

  if (!paper) {
    return (
      <div className="journal-paper p-12 text-center text-xs text-[var(--text-muted)] italic max-w-xl mx-auto space-y-3">
        <p>Research paper not found or has been removed.</p>
        <button
          onClick={() => router.push('/papers')}
          className="px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] text-xs font-semibold"
        >
          Back to Paper Library
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 max-w-5xl mx-auto">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => router.push('/papers')}
          className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Papers</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Save Status */}
          <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1 mr-2">
            {hasUnsavedChanges ? (
              <span className="text-amber-600 dark:text-amber-400">Unsaved changes</span>
            ) : paperSaveStatus === 'saving' ? (
              <span className="text-indigo-600 dark:text-indigo-400">Saving...</span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400">Saved ✓ {lastSavedTime ? `at ${lastSavedTime}` : ''}</span>
            )}
          </span>

          <button
            onClick={() => setIsVocabModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[var(--bg-paper-subtle)] hover:bg-[var(--bg-paper-hover)] border border-[var(--border-color)] text-xs font-medium text-indigo-700 dark:text-indigo-300 transition-colors"
            title="Save technical term or vocabulary from this paper"
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
            <span>Save Term to Vocab</span>
          </button>

          <button
            onClick={handleManualSave}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[var(--bg-paper-subtle)] hover:bg-[var(--bg-paper-hover)] border border-[var(--border-color)] text-xs font-medium text-[var(--text-primary)] transition-colors"
          >
            <Save className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Save</span>
          </button>

          <button
            onClick={() => router.push(`/focus?paperId=${paper.id}&title=${encodeURIComponent(`Reading: ${title}`)}&category=Reading`)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-contrast)] text-xs font-semibold shadow-2xs transition-all hover:scale-[1.01] active:scale-98"
          >
            <Target className="w-3.5 h-3.5" />
            <span>Start Reading Session</span>
          </button>
        </div>
      </div>

      {/* Draft Recovery Alert */}
      {isDraftRecovered && (
        <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Recovered unsaved draft from local session.</span>
          </div>
          <button 
            onClick={() => setIsDraftRecovered(false)}
            className="text-[11px] underline opacity-80 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Vault Save Confirmation */}
      {vaultSavedNotification && (
        <div className="flex items-center gap-2 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 animate-in fade-in">
          <BookmarkCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Saved key research insights into your Knowledge Vault ✓</span>
        </div>
      )}

      {/* Vocab Save Confirmation */}
      {vocabSavedNotification && (
        <div className="flex items-center gap-2 p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-300 dark:border-indigo-800 text-xs text-indigo-900 dark:text-indigo-200 animate-in fade-in">
          <BookmarkCheck className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>Saved technical term to your Vocabulary Builder ✓</span>
        </div>
      )}

      {/* Header Paper Card */}
      <div className="journal-paper p-6 sm:p-8 border-2 border-[var(--border-strong)] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2 flex-1 min-w-0">
            {/* Status & Priority & Favorite */}
            <div className="flex flex-wrap items-center gap-2.5">
              <select
                value={status}
                onChange={(e) => {
                  const s = e.target.value as PaperStatus;
                  setStatus(s);
                  if (s === 'finished') setReadingProgress(100);
                  if (s === 'reading' && readingProgress === 0) setReadingProgress(25);
                }}
                className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/30 focus:outline-none"
              >
                <option value="to_read">To Read</option>
                <option value="reading">Reading</option>
                <option value="finished">Finished</option>
                <option value="important">Important</option>
                <option value="archived">Archived</option>
              </select>

              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as PaperPriority)}
                className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-[var(--text-secondary)] focus:outline-none"
              >
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>

              <button
                onClick={() => setIsFavorite(!isFavorite)}
                className={`p-1.5 rounded-lg border transition-colors ${
                  isFavorite
                    ? 'bg-amber-50 dark:bg-amber-950 border-amber-300 text-amber-500 fill-amber-500'
                    : 'bg-[var(--bg-paper-subtle)] border-[var(--border-color)] text-[var(--text-muted)] hover:text-amber-500'
                }`}
                title={isFavorite ? 'Remove favorite' : 'Mark as important'}
              >
                <Star className={`w-3.5 h-3.5 ${isFavorite ? 'fill-current' : ''}`} />
              </button>
            </div>

            {/* Editable Title */}
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Paper Title..."
              className="w-full font-serif-aesthetic text-xl sm:text-2xl font-bold text-[var(--text-primary)] bg-transparent border-b border-transparent hover:border-[var(--border-color)] focus:border-[var(--accent)] focus:outline-none pb-1"
            />

            {/* Authors & Year & Journal */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
              <input
                type="text"
                placeholder="Authors (e.g., Vaswani et al.)"
                value={authors}
                onChange={(e) => setAuthors(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none"
              />

              <input
                type="text"
                placeholder="Venue / Journal / Conference"
                value={journalConference}
                onChange={(e) => setJournalConference(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none"
              />

              <input
                type="number"
                placeholder="Year (e.g., 2024)"
                value={year || ''}
                onChange={(e) => setYear(parseInt(e.target.value, 10) || undefined)}
                className="px-2.5 py-1.5 rounded-lg bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Links & DOI Bar */}
        <div className="flex flex-wrap items-center gap-3 pt-2 text-xs border-t border-[var(--border-color)]">
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[var(--accent)] hover:underline font-medium"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>View Source Webpage</span>
            </a>
          )}

          {pdfUrl && (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Open PDF Document</span>
            </a>
          )}

          {doi && (
            <span className="text-[11px] text-[var(--text-muted)]">
              DOI: {doi}
            </span>
          )}

          <button
            onClick={handleSaveInsightsToVault}
            className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[var(--bg-paper-subtle)] hover:bg-[var(--bg-paper-hover)] border border-[var(--border-color)] text-xs font-medium text-[var(--text-primary)] transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Save Key Insights to Vault</span>
          </button>
        </div>

        {/* Reading Progress Slider */}
        <div className="space-y-2 p-4 rounded-2xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)]">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
              Reading Progress
            </span>
            <span className="font-bold text-[var(--accent)] text-sm">
              {readingProgress}%
            </span>
          </div>

          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={readingProgress}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              setReadingProgress(val);
              if (val === 100) setStatus('finished');
              else if (val > 0 && status === 'to_read') setStatus('reading');
            }}
            className="w-full accent-[var(--accent)]"
          />

          <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
            <div className="flex items-center gap-2">
              {[0, 25, 50, 75, 100].map(pct => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => {
                    setReadingProgress(pct);
                    if (pct === 100) setStatus('finished');
                    else if (pct > 0 && status === 'to_read') setStatus('reading');
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] ${
                    readingProgress === pct ? 'bg-[var(--accent)] text-white font-bold' : 'hover:underline'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1">
              <span>Pages:</span>
              <input
                type="number"
                min={0}
                value={pagesRead || ''}
                onChange={(e) => setPagesRead(parseInt(e.target.value, 10) || 0)}
                className="w-12 px-1.5 py-0.5 rounded bg-[var(--bg-paper)] border border-[var(--border-color)] text-center text-xs"
              />
              <span>/</span>
              <input
                type="number"
                min={0}
                value={totalPages || ''}
                onChange={(e) => setTotalPages(parseInt(e.target.value, 10) || 0)}
                className="w-12 px-1.5 py-0.5 rounded bg-[var(--bg-paper)] border border-[var(--border-color)] text-center text-xs"
              />
            </div>
          </div>
        </div>

        {/* Tags Bar */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
            <Tag className="w-3 h-3" />
            <span>Tags:</span>
          </span>
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-[var(--text-secondary)]"
            >
              <span>#{tag}</span>
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="hover:text-red-500 font-bold ml-0.5"
              >
                ×
              </button>
            </span>
          ))}

          <div className="inline-flex items-center gap-1">
            <input
              type="text"
              placeholder="Add tag..."
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
              className="w-24 px-2 py-0.5 rounded-lg bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none"
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="p-1 rounded-md text-[var(--accent)] hover:bg-[var(--bg-paper-subtle)]"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Structured Research Notes Workspace */}
      <div className="space-y-4">
        {/* Navigation Tabs for Notes */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)]">
          {[
            { id: 'notes', label: '1. Problem & Objectives' },
            { id: 'results', label: '2. Methods & Results' },
            { id: 'analysis', label: '3. Strengths & Gaps' },
            { id: 'application', label: '4. Application & Notes' },
            { id: 'sessions', label: `5. Focus Sessions (${relatedSessions.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                activeSection === tab.id
                  ? 'bg-[var(--accent)] text-[var(--accent-contrast)] shadow-2xs font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* SECTION 1: PROBLEM & OBJECTIVES */}
        {activeSection === 'notes' && (
          <div className="journal-paper p-6 sm:p-8 space-y-6 border border-[var(--border-color)]">
            <div className="border-b border-[var(--border-color)] pb-3">
              <h3 className="font-serif-aesthetic text-base font-bold text-[var(--text-primary)]">
                Research Problem, Objective & Questions
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                What is this paper trying to solve and investigate?
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  Research Problem
                </label>
                <textarea
                  rows={3}
                  placeholder="What fundamental challenge or limitation does this paper address?"
                  value={notesState.research_problem || ''}
                  onChange={(e) => handleUpdateStructuredField('research_problem', e.target.value)}
                  className="w-full p-3 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  Research Objective
                </label>
                <textarea
                  rows={2}
                  placeholder="What is the concrete goal and hypothesis of this work?"
                  value={notesState.research_objective || ''}
                  onChange={(e) => handleUpdateStructuredField('research_objective', e.target.value)}
                  className="w-full p-3 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  Research Questions
                </label>
                <textarea
                  rows={2}
                  placeholder="RQ1, RQ2, etc. that the authors aim to answer..."
                  value={notesState.research_questions || ''}
                  onChange={(e) => handleUpdateStructuredField('research_questions', e.target.value)}
                  className="w-full p-3 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] resize-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: METHODS & RESULTS */}
        {activeSection === 'results' && (
          <div className="journal-paper p-6 sm:p-8 space-y-6 border border-[var(--border-color)]">
            <div className="border-b border-[var(--border-color)] pb-3">
              <h3 className="font-serif-aesthetic text-base font-bold text-[var(--text-primary)]">
                Datasets, Methods & Empirical Results
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Models, baselines, evaluation benchmarks, and main outcomes.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  Dataset & Size
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g., ImageNet (1.2M images), WMT'14 En-De (4.5M pairs)"
                  value={notesState.dataset || ''}
                  onChange={(e) => handleUpdateStructuredField('dataset', e.target.value)}
                  className="w-full p-3 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  Preprocessing / Data Type
                </label>
                <textarea
                  rows={2}
                  placeholder="Tokenization, normalization, augmentations..."
                  value={notesState.preprocessing || ''}
                  onChange={(e) => handleUpdateStructuredField('preprocessing', e.target.value)}
                  className="w-full p-3 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  Models & Proposed Architecture
                </label>
                <textarea
                  rows={3}
                  placeholder="Core model architecture, loss functions, optimization details..."
                  value={notesState.models_methods || ''}
                  onChange={(e) => handleUpdateStructuredField('models_methods', e.target.value)}
                  className="w-full p-3 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  Baselines & Evaluation Metrics
                </label>
                <textarea
                  rows={3}
                  placeholder="Comparison baselines, BLEU, F1, Accuracy, Latency..."
                  value={notesState.baselines || ''}
                  onChange={(e) => handleUpdateStructuredField('baselines', e.target.value)}
                  className="w-full p-3 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] resize-none"
                />
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Main Results & Best Model Performance
              </label>
              <textarea
                rows={3}
                placeholder="Key quantitative results, table numbers, statistical significance..."
                value={notesState.main_results || ''}
                onChange={(e) => handleUpdateStructuredField('main_results', e.target.value)}
                className="w-full p-3 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] resize-none"
              />
            </div>
          </div>
        )}

        {/* SECTION 3: STRENGTHS & RESEARCH GAP */}
        {activeSection === 'analysis' && (
          <div className="journal-paper p-6 sm:p-8 space-y-6 border border-[var(--border-color)]">
            <div className="border-b border-[var(--border-color)] pb-3">
              <h3 className="font-serif-aesthetic text-base font-bold text-[var(--text-primary)]">
                Critical Analysis: Strengths, Limitations & Gaps
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Evaluate the rigor, potential weaknesses, and open opportunities.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  Key Strengths
                </label>
                <textarea
                  rows={3}
                  placeholder="Novel insights, elegant architecture, thorough ablations..."
                  value={notesState.strengths || ''}
                  onChange={(e) => handleUpdateStructuredField('strengths', e.target.value)}
                  className="w-full p-3 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  Limitations & Constraints
                </label>
                <textarea
                  rows={3}
                  placeholder="High compute requirements, narrow dataset assumptions..."
                  value={notesState.limitations || ''}
                  onChange={(e) => handleUpdateStructuredField('limitations', e.target.value)}
                  className="w-full p-3 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] resize-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
                  Research Gap (Unaddressed Problems)
                </label>
                <textarea
                  rows={3}
                  placeholder="What did the authors overlook? Where is the gap in literature?"
                  value={notesState.research_gap || ''}
                  onChange={(e) => handleUpdateStructuredField('research_gap', e.target.value)}
                  className="w-full p-3 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                  Future Work Suggested by Authors
                </label>
                <textarea
                  rows={3}
                  placeholder="Directions, theoretical proofs, or extensions recommended..."
                  value={notesState.future_work || ''}
                  onChange={(e) => handleUpdateStructuredField('future_work', e.target.value)}
                  className="w-full p-3 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] resize-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* SECTION 4: APPLICATION & GENERAL NOTES */}
        {activeSection === 'application' && (
          <div className="journal-paper p-6 sm:p-8 space-y-6 border border-[var(--border-color)]">
            <div className="border-b border-[var(--border-color)] pb-3">
              <h3 className="font-serif-aesthetic text-base font-bold text-[var(--text-primary)]">
                Application & Personal Synthesis
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                How can you directly apply this paper to your thesis, project, or domain?
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
                  How Can I Use This Paper in My Research / Projects?
                </label>
                <textarea
                  rows={3}
                  placeholder="Concrete adaptation ideas, baseline code reuse, mathematical framework..."
                  value={notesState.how_can_i_use_this_paper || ''}
                  onChange={(e) => handleUpdateStructuredField('how_can_i_use_this_paper', e.target.value)}
                  className="w-full p-3 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] resize-none"
                />
              </div>

              {/* Free-form Rich Text Notes Toolbar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                    My Free-form Research Notes & Quotes
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleFormat('bold')}
                      className="p-1.5 rounded hover:bg-[var(--bg-paper-hover)] text-xs font-bold"
                      title="Bold"
                    >
                      <Bold className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFormat('italic')}
                      className="p-1.5 rounded hover:bg-[var(--bg-paper-hover)] text-xs italic"
                      title="Italic"
                    >
                      <Italic className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFormat('underline')}
                      className="p-1.5 rounded hover:bg-[var(--bg-paper-hover)] text-xs underline"
                      title="Underline"
                    >
                      <Underline className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <textarea
                  rows={6}
                  placeholder="Quotes, ideas, derivation steps, cross-references..."
                  value={generalNotes}
                  onChange={(e) => setGeneralNotes(e.target.value)}
                  className="w-full p-4 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] resize-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* SECTION 5: RELATED FOCUS SESSIONS */}
        {activeSection === 'sessions' && (
          <div className="journal-paper p-6 sm:p-8 space-y-4 border border-[var(--border-color)]">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <div>
                <h3 className="font-serif-aesthetic text-base font-bold text-[var(--text-primary)]">
                  Focus Sessions for this Paper
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Deep work and reading sessions logged for &ldquo;{title}&rdquo;.
                </p>
              </div>

              <button
                onClick={() => router.push(`/focus?paperId=${paper.id}&title=${encodeURIComponent(`Reading: ${title}`)}&category=Reading`)}
                className="px-3.5 py-1.5 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] text-xs font-medium"
              >
                + Start Session
              </button>
            </div>

            <div className="space-y-2.5">
              {relatedSessions.map((s) => (
                <div
                  key={s.id}
                  className="p-3.5 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] flex items-center justify-between gap-4"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[var(--text-primary)]">
                        {formatDate(s.started_at, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="text-[11px] text-[var(--text-muted)]">•</span>
                      <span className="text-[11px] font-bold text-[var(--accent)]">
                        {Math.round(s.actual_duration_seconds / 60)} minutes
                      </span>
                    </div>
                    {s.accomplishment && (
                      <p className="text-xs text-[var(--text-secondary)] italic">
                        &ldquo;{s.accomplishment}&rdquo;
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-amber-500 text-xs">
                    {Array.from({ length: s.focus_rating || 5 }).map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-current" />
                    ))}
                  </div>
                </div>
              ))}

              {relatedSessions.length === 0 && (
                <div className="py-8 text-center text-xs text-[var(--text-muted)] italic">
                  No focus sessions logged for this paper yet. Click &ldquo;Start Reading Session&rdquo; to begin!
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Suggested Related Papers */}
      {relatedPapers.length > 0 && (
        <div className="journal-paper p-5 sm:p-6 border border-[var(--border-color)] space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--accent)]" />
            <h3 className="font-serif-aesthetic font-bold text-sm text-[var(--text-primary)]">
              Related Papers in Your Library
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {relatedPapers.map((rp) => (
              <a
                key={rp.id}
                href={`/papers/${rp.id}`}
                className="p-3 rounded-xl bg-[var(--bg-paper-subtle)] hover:bg-[var(--bg-paper-hover)] border border-[var(--border-color)] transition-all space-y-1 block group"
              >
                <span className="text-[10px] font-bold uppercase text-[var(--accent)]">
                  {rp.research_area}
                </span>
                <h4 className="text-xs font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] truncate">
                  {rp.title}
                </h4>
                {rp.authors && (
                  <p className="text-[11px] text-[var(--text-secondary)] italic truncate">
                    {rp.authors}
                  </p>
                )}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Save Term to Vocabulary Modal */}
      {isVocabModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsVocabModalOpen(false)}
          />

          <div className="relative w-full max-w-lg journal-paper p-6 overflow-hidden shadow-2xl z-10 border-2 border-[var(--border-strong)] animate-in zoom-in-95 duration-150 space-y-5">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif-aesthetic font-bold text-base text-[var(--text-primary)]">
                    Save Technical Term to Vocabulary
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Link technical terms & concepts from &ldquo;{title}&rdquo; to your Spaced Review library.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsVocabModalOpen(false)}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePaperTermToVocab} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                  Term / Concept / Word <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Counterfactual explanation, Domain adaptation, Calibration..."
                  value={vocabWord}
                  onChange={(e) => setVocabWord(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                  Definition / Meaning (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="How does this paper define this concept? Explain clearly..."
                  value={vocabMeaning}
                  onChange={(e) => setVocabMeaning(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                  Context / Example in Paper (Optional)
                </label>
                <input
                  type="text"
                  placeholder={`Default: From paper "${title}"`}
                  value={vocabExample}
                  onChange={(e) => setVocabExample(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setIsVocabModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-paper-hover)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!vocabWord.trim()}
                  className="px-5 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-contrast)] text-xs font-semibold shadow-xs disabled:opacity-50 transition-all hover:scale-[1.01]"
                >
                  Save to Vocabulary
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
