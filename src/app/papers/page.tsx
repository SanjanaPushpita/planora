'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { usePlanner } from '@/lib/storage';
import { ResearchPaper, PaperStatus, PaperPriority } from '@/lib/types';
import { generateId, formatDate } from '@/lib/utils';
import { 
  FileText, 
  Plus, 
  Search, 
  Star, 
  BookOpen, 
  ExternalLink, 
  Trash2, 
  Archive, 
  RotateCcw, 
  Clock, 
  Flame, 
  Sparkles, 
  Target, 
  CheckCircle2, 
  Bookmark, 
  Filter, 
  SlidersHorizontal,
  ArrowUpDown,
  Tag,
  Calendar,
  Layers,
  BarChart2,
  ChevronRight
} from 'lucide-react';

export default function ResearchPaperTrackerPage() {
  const router = useRouter();
  const { 
    researchPapers, 
    saveResearchPaper, 
    updateResearchPaper, 
    deleteResearchPaper, 
    restoreResearchPaper,
    focusSessions 
  } = usePlanner();

  // Filters & State
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'created' | 'updated' | 'year' | 'priority' | 'progress'>('created');

  // Add Paper Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAuthors, setNewAuthors] = useState('');
  const [newYear, setNewYear] = useState<string>(new Date().getFullYear().toString());
  const [newJournal, setNewJournal] = useState('');
  const [newDoi, setNewDoi] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newPdfUrl, setNewPdfUrl] = useState('');
  const [newArea, setNewArea] = useState('Computer Science');
  const [newTagsInput, setNewTagsInput] = useState('');
  const [newStatus, setNewStatus] = useState<PaperStatus>('to_read');
  const [newPriority, setNewPriority] = useState<PaperPriority>('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtered & Sorted Papers
  const filteredPapers = useMemo(() => {
    const list = researchPapers.filter(p => {
      // Trash filter
      if (selectedStatus === 'trash') return Boolean(p.is_trash);
      if (p.is_trash) return false;

      // Status filter
      if (selectedStatus === 'important') {
        if (!p.is_favorite) return false;
      } else if (selectedStatus === 'archived') {
        if (!p.is_archived) return false;
      } else if (selectedStatus !== 'all') {
        if (p.status !== selectedStatus) return false;
      }

      // Area filter
      if (selectedArea !== 'all' && (p.research_area || '').toLowerCase() !== selectedArea.toLowerCase()) {
        return false;
      }

      // Priority filter
      if (selectedPriority !== 'all' && p.priority !== selectedPriority) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const inTitle = p.title.toLowerCase().includes(q);
        const inAuthors = (p.authors || '').toLowerCase().includes(q);
        const inArea = (p.research_area || '').toLowerCase().includes(q);
        const inTags = (p.tags || []).some(t => t.toLowerCase().includes(q));
        const inNotes = (p.notes || '').toLowerCase().includes(q) || (p.key_insights || '').toLowerCase().includes(q);
        if (!inTitle && !inAuthors && !inArea && !inTags && !inNotes) return false;
      }

      return true;
    });

    // Sorting
    list.sort((a, b) => {
      if (sortBy === 'created') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === 'updated') {
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
      if (sortBy === 'year') {
        return (b.year || 0) - (a.year || 0);
      }
      if (sortBy === 'progress') {
        return (b.reading_progress || 0) - (a.reading_progress || 0);
      }
      if (sortBy === 'priority') {
        const weight = { high: 3, medium: 2, low: 1 };
        return (weight[b.priority] || 0) - (weight[a.priority] || 0);
      }
      return 0;
    });

    return list;
  }, [researchPapers, selectedStatus, selectedArea, selectedPriority, searchQuery, sortBy]);

  // Distinct Research Areas
  const allAreas = useMemo(() => {
    const set = new Set<string>();
    researchPapers.forEach(p => {
      if (p.research_area && !p.is_trash) set.add(p.research_area);
    });
    return Array.from(set);
  }, [researchPapers]);

  // Research Statistics
  const stats = useMemo(() => {
    let toRead = 0;
    let reading = 0;
    let finished = 0;
    let important = 0;
    let monthAdded = 0;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    researchPapers.forEach(p => {
      if (p.is_trash) return;
      if (p.status === 'to_read') toRead++;
      if (p.status === 'reading') reading++;
      if (p.status === 'finished') finished++;
      if (p.is_favorite) important++;

      const cDate = new Date(p.created_at);
      if (cDate.getMonth() === currentMonth && cDate.getFullYear() === currentYear) {
        monthAdded++;
      }
    });

    // Compute Reading Minutes this week from linked Focus Sessions
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    let readingMinsThisWeek = 0;
    let focusResearchSecs = 0;

    focusSessions.forEach(fs => {
      const fsDate = new Date(fs.started_at);
      const isThisWeek = fsDate >= startOfWeek;
      const isResearchOrReading = fs.category === 'Reading' || fs.category === 'Research' || fs.related_paper_id;

      if (isThisWeek && isResearchOrReading) {
        readingMinsThisWeek += Math.round((fs.actual_duration_seconds || 0) / 60);
      }
      if (fs.category === 'Research' || fs.related_paper_id) {
        focusResearchSecs += (fs.actual_duration_seconds || 0);
      }
    });

    return {
      toRead,
      reading,
      finished,
      important,
      monthAdded,
      readingMinsThisWeek,
      focusResearchHours: (focusResearchSecs / 3600).toFixed(1),
    };
  }, [researchPapers, focusSessions]);

  // Create New Paper
  const handleCreatePaper = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsSubmitting(true);
    try {
      const now = new Date().toISOString();
      const newId = `paper-${generateId()}`;
      const parsedTags = newTagsInput
        .split(',')
        .map(t => t.trim().toLowerCase())
        .filter(Boolean);

      const paper: ResearchPaper = {
        id: newId,
        title: newTitle.trim(),
        authors: newAuthors.trim(),
        year: parseInt(newYear, 10) || undefined,
        journal_conference: newJournal.trim(),
        doi: newDoi.trim(),
        url: newUrl.trim(),
        pdf_url: newPdfUrl.trim(),
        research_area: newArea.trim() || 'General',
        tags: parsedTags,
        status: newStatus,
        priority: newPriority,
        reading_progress: newStatus === 'finished' ? 100 : (newStatus === 'reading' ? 25 : 0),
        is_favorite: false,
        is_archived: false,
        is_trash: false,
        structured_notes: {},
        notes: '',
        key_insights: '',
        sources: [],
        created_at: now,
        updated_at: now,
      };

      const saved = await saveResearchPaper(paper);

      // Reset & close
      setIsAddModalOpen(false);
      setNewTitle('');
      setNewAuthors('');
      setNewJournal('');
      setNewDoi('');
      setNewUrl('');
      setNewPdfUrl('');
      setNewTagsInput('');
      setIsSubmitting(false);

      // Navigate to detail page
      router.push(`/papers/${saved.id}`);
    } catch (err) {
      console.error('Failed to create research paper:', err);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="journal-paper p-6 sm:p-8 border-2 border-[var(--border-strong)] relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--border-strong)]">
                <FileText className="w-4 h-4" />
              </span>
              <span className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                Academic & Literature Hub
              </span>
            </div>
            <h1 className="font-serif-aesthetic text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
              Research Paper Tracker
            </h1>
            <p className="font-serif-aesthetic italic text-xs sm:text-sm text-[var(--text-secondary)]">
              &ldquo;Track papers, reading progress, and structured research insights.&rdquo;
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={() => router.push('/focus?category=Research')}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[var(--bg-paper-subtle)] hover:bg-[var(--bg-paper-hover)] border border-[var(--border-color)] text-xs font-medium text-[var(--text-primary)] transition-colors"
            >
              <Target className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>Start Research Session</span>
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-contrast)] text-xs font-semibold shadow-xs transition-all hover:scale-[1.01] active:scale-98"
            >
              <Plus className="w-4 h-4" />
              <span>Add Paper</span>
            </button>
          </div>
        </div>
      </div>

      {/* Research Overview Dashboard Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="journal-paper p-3.5 border border-[var(--border-color)] text-center space-y-0.5">
          <span className="text-[10px] uppercase font-semibold text-[var(--text-muted)]">To Read</span>
          <div className="text-xl font-bold font-serif-aesthetic text-[var(--text-primary)]">{stats.toRead}</div>
        </div>

        <div className="journal-paper p-3.5 border border-[var(--border-color)] text-center space-y-0.5">
          <span className="text-[10px] uppercase font-semibold text-[var(--text-muted)]">Reading</span>
          <div className="text-xl font-bold font-serif-aesthetic text-indigo-600 dark:text-indigo-400">{stats.reading}</div>
        </div>

        <div className="journal-paper p-3.5 border border-[var(--border-color)] text-center space-y-0.5">
          <span className="text-[10px] uppercase font-semibold text-[var(--text-muted)]">Finished</span>
          <div className="text-xl font-bold font-serif-aesthetic text-emerald-600 dark:text-emerald-400">{stats.finished}</div>
        </div>

        <div className="journal-paper p-3.5 border border-[var(--border-color)] text-center space-y-0.5">
          <span className="text-[10px] uppercase font-semibold text-[var(--text-muted)]">Important</span>
          <div className="text-xl font-bold font-serif-aesthetic text-amber-600 dark:text-amber-400">{stats.important}</div>
        </div>

        <div className="journal-paper p-3.5 border border-[var(--border-color)] text-center space-y-0.5">
          <span className="text-[10px] uppercase font-semibold text-[var(--text-muted)]">Week Reading</span>
          <div className="text-xl font-bold font-serif-aesthetic text-[var(--accent)]">{stats.readingMinsThisWeek} <span className="text-[10px] font-normal font-sans">m</span></div>
        </div>

        <div className="journal-paper p-3.5 border border-[var(--border-color)] text-center space-y-0.5">
          <span className="text-[10px] uppercase font-semibold text-[var(--text-muted)]">Research Hours</span>
          <div className="text-xl font-bold font-serif-aesthetic text-[var(--text-primary)]">{stats.focusResearchHours} <span className="text-[10px] font-normal font-sans">h</span></div>
        </div>

        <div className="journal-paper p-3.5 border border-[var(--border-color)] text-center space-y-0.5 col-span-2 sm:col-span-2 lg:col-span-1">
          <span className="text-[10px] uppercase font-semibold text-[var(--text-muted)]">Added This Month</span>
          <div className="text-xl font-bold font-serif-aesthetic text-[var(--text-primary)]">+{stats.monthAdded}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="journal-paper p-4 border border-[var(--border-color)] space-y-3">
        {/* Top search & Sort */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search paper titles, authors, research areas, tags, or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>Sort:</span>
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1.5 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none"
            >
              <option value="created">Recently Added</option>
              <option value="updated">Recently Updated</option>
              <option value="year">Year</option>
              <option value="priority">Priority</option>
              <option value="progress">Reading Progress</option>
            </select>
          </div>
        </div>

        {/* Status Tab Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[var(--border-color)]">
          {[
            { id: 'all', label: 'All Papers' },
            { id: 'to_read', label: 'To Read' },
            { id: 'reading', label: 'Reading' },
            { id: 'finished', label: 'Finished' },
            { id: 'important', label: 'Important ★' },
            { id: 'archived', label: 'Archived' },
            { id: 'trash', label: 'Trash Bin' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedStatus(tab.id)}
              className={`px-3 py-1 rounded-xl text-xs font-medium transition-colors ${
                selectedStatus === tab.id
                  ? 'bg-[var(--accent)] text-[var(--accent-contrast)] shadow-2xs'
                  : 'bg-[var(--bg-paper-subtle)] hover:bg-[var(--bg-paper-hover)] text-[var(--text-secondary)]'
              }`}
            >
              {tab.label}
            </button>
          ))}

          {/* Area & Priority dropdowns */}
          <div className="ml-auto flex items-center gap-2">
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              className="px-2.5 py-1 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-[11px] text-[var(--text-secondary)] focus:outline-none"
            >
              <option value="all">All Areas</option>
              {allAreas.map((area) => (
                <option key={area} value={area}>{area}</option>
              ))}
            </select>

            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="px-2.5 py-1 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-[11px] text-[var(--text-secondary)] focus:outline-none"
            >
              <option value="all">All Priorities</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>
          </div>
        </div>
      </div>

      {/* Papers Grid / Cards */}
      <div className="space-y-3">
        {filteredPapers.map((paper) => {
          const statusColors = {
            to_read: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300',
            reading: 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300',
            finished: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300',
            important: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300',
            archived: 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400',
          };

          const priorityBadges = {
            high: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-900',
            medium: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-900',
            low: 'text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800',
          };

          return (
            <div
              key={paper.id}
              className="journal-paper p-5 border border-[var(--border-color)] hover:border-[var(--border-strong)] transition-all space-y-3 group relative"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusColors[paper.status] || 'bg-zinc-100 text-zinc-800'}`}>
                      {paper.status.replace('_', ' ')}
                    </span>

                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${priorityBadges[paper.priority]}`}>
                      {paper.priority}
                    </span>

                    <span className="text-[11px] text-[var(--text-muted)] font-medium">
                      {paper.research_area} {paper.year ? `• ${paper.year}` : ''}
                    </span>
                  </div>

                  <a
                    href={`/papers/${paper.id}`}
                    className="block text-base font-bold font-serif-aesthetic text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors leading-snug"
                  >
                    {paper.title}
                  </a>

                  {paper.authors && (
                    <p className="text-xs text-[var(--text-secondary)] italic line-clamp-1">
                      {paper.authors}
                    </p>
                  )}

                  {paper.journal_conference && (
                    <p className="text-[11px] text-[var(--text-muted)]">
                      {paper.journal_conference}
                    </p>
                  )}
                </div>

                {/* Right Meta & Star */}
                <div className="flex items-center gap-2 self-start shrink-0">
                  <button
                    onClick={async () => {
                      await updateResearchPaper(paper.id, { is_favorite: !paper.is_favorite });
                    }}
                    className={`p-2 rounded-xl border transition-colors ${
                      paper.is_favorite
                        ? 'bg-amber-50 dark:bg-amber-950 border-amber-300 text-amber-500 fill-amber-500'
                        : 'bg-[var(--bg-paper-subtle)] border-[var(--border-color)] text-[var(--text-muted)] hover:text-amber-500'
                    }`}
                    title={paper.is_favorite ? 'Remove favorite' : 'Mark as important'}
                  >
                    <Star className={`w-4 h-4 ${paper.is_favorite ? 'fill-current' : ''}`} />
                  </button>

                  <a
                    href={`/papers/${paper.id}`}
                    className="px-4 py-2 rounded-xl bg-[var(--accent-soft)] hover:bg-[var(--border-strong)] text-[var(--text-primary)] text-xs font-semibold border border-[var(--border-strong)] transition-colors flex items-center gap-1"
                  >
                    <span>Open Detail</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Progress & Tags & Quick Reading Session */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[var(--border-color)] text-xs">
                {/* Reading Progress */}
                <div className="flex items-center gap-3 min-w-[220px]">
                  <span className="text-[11px] text-[var(--text-muted)] font-medium shrink-0">
                    Reading: {paper.reading_progress}%
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] overflow-hidden">
                    <div
                      className="h-full bg-[var(--accent)] rounded-full transition-all"
                      style={{ width: `${paper.reading_progress}%` }}
                    />
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap items-center gap-1">
                  {(paper.tags || []).slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-md bg-[var(--bg-paper-subtle)] text-[var(--text-muted)] text-[10px]"
                    >
                      #{tag}
                    </span>
                  ))}
                  {(paper.tags || []).length > 3 && (
                    <span className="text-[10px] text-[var(--text-muted)]">
                      +{(paper.tags || []).length - 3} more
                    </span>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => router.push(`/focus?paperId=${paper.id}&title=${encodeURIComponent(`Reading: ${paper.title}`)}&category=Reading`)}
                    className="px-3 py-1.5 rounded-lg bg-[var(--bg-paper-subtle)] hover:bg-[var(--bg-paper-hover)] border border-[var(--border-color)] text-[11px] font-medium text-[var(--text-primary)] flex items-center gap-1 transition-colors"
                  >
                    <Clock className="w-3 h-3 text-[var(--accent)]" />
                    <span>Read in Focus</span>
                  </button>

                  {paper.is_trash ? (
                    <button
                      onClick={async () => await restoreResearchPaper(paper.id)}
                      className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 transition-colors"
                      title="Restore Paper"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={async () => {
                        if (window.confirm(`Move "${paper.title}" to trash?`)) {
                          await deleteResearchPaper(paper.id, false);
                        }
                      }}
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-600 hover:bg-[var(--bg-paper-hover)] transition-colors"
                      title="Move to trash"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filteredPapers.length === 0 && (
          <div className="journal-paper p-12 text-center text-xs text-[var(--text-muted)] italic border border-[var(--border-color)] space-y-3">
            <FileText className="w-8 h-8 text-[var(--text-muted)] mx-auto opacity-50" />
            <p>No research papers found for the selected filters.</p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] text-xs font-semibold"
            >
              + Add Your First Paper
            </button>
          </div>
        )}
      </div>

      {/* MODAL: ADD RESEARCH PAPER */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-2xl journal-paper p-6 sm:p-8 space-y-5 border border-[var(--border-strong)] shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="border-b border-[var(--border-color)] pb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]">
                Literature Database
              </span>
              <h3 className="font-serif-aesthetic text-xl font-bold text-[var(--text-primary)]">
                Add New Research Paper
              </h3>
            </div>

            <form onSubmit={handleCreatePaper} className="space-y-4">
              {/* Title */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">
                  Paper Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Attention Is All You Need, or Deep Residual Learning..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              {/* Authors & Year */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">
                    Authors
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Vaswani et al., or He, Zhang, Ren, Sun"
                    value={newAuthors}
                    onChange={(e) => setNewAuthors(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">
                    Year
                  </label>
                  <input
                    type="number"
                    value={newYear}
                    onChange={(e) => setNewYear(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </div>

              {/* Journal / Conference & DOI */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">
                    Journal / Conference / Venue
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., NeurIPS, CVPR, IEEE TPAMI, Nature"
                    value={newJournal}
                    onChange={(e) => setNewJournal(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">
                    DOI (Digital Object Identifier)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., 10.1145/3318464.3389700"
                    value={newDoi}
                    onChange={(e) => setNewDoi(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </div>

              {/* URL & PDF URL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">
                    Paper URL / ArXiv Link
                  </label>
                  <input
                    type="url"
                    placeholder="https://arxiv.org/abs/1706.03762"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">
                    Direct PDF Link / File Path
                  </label>
                  <input
                    type="text"
                    placeholder="https://arxiv.org/pdf/1706.03762.pdf"
                    value={newPdfUrl}
                    onChange={(e) => setNewPdfUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </div>

              {/* Research Area & Tags */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">
                    Research Area / Field
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Natural Language Processing, Computer Vision"
                    value={newArea}
                    onChange={(e) => setNewArea(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    placeholder="transformer, attention, translation"
                    value={newTagsInput}
                    onChange={(e) => setNewTagsInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </div>

              {/* Status & Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">
                    Initial Status
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as PaperStatus)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none"
                  >
                    <option value="to_read">To Read</option>
                    <option value="reading">Reading</option>
                    <option value="finished">Finished</option>
                    <option value="important">Important</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">
                    Priority
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as PaperPriority)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none"
                  >
                    <option value="high">High Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="low">Low Priority</option>
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-paper-hover)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-contrast)] text-xs font-semibold shadow-xs flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Saving to Database...' : 'Add Paper & Open'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
