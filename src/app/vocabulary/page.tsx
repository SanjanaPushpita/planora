'use client';

import React, { useState, useMemo } from 'react';
import { usePlanner } from '@/lib/storage';
import { 
  VocabularyItem, 
  VocabularyReviewRating, 
  VocabularyStatus, 
  VocabularySourceType 
} from '@/lib/types';
import { generateId } from '@/lib/utils';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Filter, 
  Sparkles, 
  RotateCcw, 
  Check, 
  X, 
  Volume2, 
  Star, 
  Trash2, 
  Edit3, 
  Calendar, 
  Tag, 
  Clock, 
  ChevronRight, 
  Award, 
  Brain, 
  Lightbulb, 
  FileText, 
  Layers, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  Zap
} from 'lucide-react';

const CATEGORIES = [
  'General',
  'Academic',
  'Research & Science',
  'Technology & AI',
  'Literature',
  'Daily Life',
  'Philosophy',
  'Business',
];

const PARTS_OF_SPEECH = [
  'noun',
  'verb',
  'adjective',
  'adverb',
  'phrase',
  'idiom',
  'prefix/suffix',
  'other',
];

const SOURCES: { id: VocabularySourceType; label: string }[] = [
  { id: 'custom', label: 'Custom' },
  { id: 'sprint', label: 'Learning Sprint' },
  { id: 'paper', label: 'Research Paper' },
  { id: 'vault', label: 'Knowledge Vault' },
  { id: 'book', label: 'Book' },
  { id: 'article', label: 'Article' },
  { id: 'daily', label: 'Daily Life' },
];

export default function VocabularyPage() {
  const { 
    vocabularyItems, 
    saveVocabularyItem, 
    updateVocabularyItem, 
    deleteVocabularyItem,
    reviewVocabularyWord,
    learningSprints,
    researchPapers
  } = usePlanner();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'az' | 'due' | 'reviews'>('recent');

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedWordDetail, setSelectedWordDetail] = useState<VocabularyItem | null>(null);
  const [editingWord, setEditingWord] = useState<VocabularyItem | null>(null);

  // Spaced Review Studio Mode
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [isMeaningRevealed, setIsMeaningRevealed] = useState(false);
  const [reviewedWordsCount, setReviewedWordsCount] = useState(0);

  // Form State for Add Word
  const [newWord, setNewWord] = useState('');
  const [newMeaning, setNewMeaning] = useState('');
  const [newExample, setNewExample] = useState('');
  const [newSynonyms, setNewSynonyms] = useState('');
  const [newAntonyms, setNewAntonyms] = useState('');
  const [newPartOfSpeech, setNewPartOfSpeech] = useState('noun');
  const [newPronunciation, setNewPronunciation] = useState('');
  const [newCategory, setNewCategory] = useState('General');
  const [newTags, setNewTags] = useState('');
  const [newSourceType, setNewSourceType] = useState<VocabularySourceType>('custom');
  const [newSourceTitle, setNewSourceTitle] = useState('');
  const [newMyNotes, setNewMyNotes] = useState('');

  // Duplicate warning modal state
  const [duplicateMatch, setDuplicateMatch] = useState<VocabularyItem | null>(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  // Due for review calculation
  const wordsDueForReview = useMemo(() => {
    const now = new Date();
    return vocabularyItems.filter(v => {
      if (v.is_trash) return false;
      if (!v.next_review_at) return true; // New words are due immediately
      return new Date(v.next_review_at) <= now || v.status === 'needs_review' || v.status === 'new';
    });
  }, [vocabularyItems]);

  // Statistics
  const stats = useMemo(() => {
    const active = vocabularyItems.filter(v => !v.is_trash);
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const learnedThisMonth = active.filter(v => {
      if (v.status !== 'known') return false;
      const updated = new Date(v.updated_at);
      return updated.getMonth() === currentMonth && updated.getFullYear() === currentYear;
    }).length;

    const todayReviewed = active.filter(v => {
      if (!v.last_reviewed_at) return false;
      const lr = new Date(v.last_reviewed_at);
      return lr.toDateString() === now.toDateString();
    }).length;

    return {
      total: active.length,
      due: wordsDueForReview.length,
      known: active.filter(v => v.status === 'known').length,
      learning: active.filter(v => v.status === 'learning' || v.status === 'needs_review').length,
      learnedThisMonth,
      todayReviewed,
    };
  }, [vocabularyItems, wordsDueForReview]);

  // Filtered and sorted word list
  const filteredWords = useMemo(() => {
    return vocabularyItems.filter(w => {
      if (w.is_trash) return false;

      // Status filter
      if (selectedStatus === 'favorites') {
        if (!w.is_favorite) return false;
      } else if (selectedStatus === 'due') {
        const isDue = !w.next_review_at || new Date(w.next_review_at) <= new Date() || w.status === 'needs_review';
        if (!isDue) return false;
      } else if (selectedStatus !== 'all') {
        if (w.status !== selectedStatus) return false;
      }

      // Category filter
      if (selectedCategory !== 'all' && w.category !== selectedCategory) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchWord = w.word.toLowerCase().includes(q);
        const matchMeaning = (w.meaning || '').toLowerCase().includes(q);
        const matchExample = (w.example || '').toLowerCase().includes(q);
        const matchNotes = (w.my_notes || '').toLowerCase().includes(q);
        const matchTags = (w.tags || []).some(t => t.toLowerCase().includes(q));
        const matchSynonyms = (w.synonyms || []).some(s => s.toLowerCase().includes(q));
        if (!matchWord && !matchMeaning && !matchExample && !matchNotes && !matchTags && !matchSynonyms) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'az') return a.word.localeCompare(b.word);
      if (sortBy === 'due') {
        const dateA = a.next_review_at ? new Date(a.next_review_at).getTime() : 0;
        const dateB = b.next_review_at ? new Date(b.next_review_at).getTime() : 0;
        return dateA - dateB;
      }
      if (sortBy === 'reviews') return (b.review_count || 0) - (a.review_count || 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [vocabularyItems, selectedStatus, selectedCategory, searchQuery, sortBy]);

  // Handle Add Word Submission with Duplicate Detection
  const handleAddWord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWord.trim()) return;

    // Check duplicate
    const cleanWord = newWord.trim();
    const existing = vocabularyItems.find(
      w => !w.is_trash && w.word.toLowerCase() === cleanWord.toLowerCase()
    );

    if (existing) {
      setDuplicateMatch(existing);
      setShowDuplicateModal(true);
      return;
    }

    await saveNewWordToStorage();
  };

  const saveNewWordToStorage = async (appendMeaningToExisting?: boolean) => {
    const cleanWord = newWord.trim();
    const parsedSynonyms = newSynonyms.split(',').map(s => s.trim()).filter(Boolean);
    const parsedAntonyms = newAntonyms.split(',').map(a => a.trim()).filter(Boolean);
    const parsedTags = newTags.split(',').map(t => t.trim().replace(/^#/, '')).filter(Boolean);

    if (appendMeaningToExisting && duplicateMatch) {
      const combinedMeaning = `${duplicateMatch.meaning}\n\n• Additional meaning: ${newMeaning.trim()}`;
      await updateVocabularyItem(duplicateMatch.id, {
        meaning: combinedMeaning,
        example: newExample.trim() ? `${duplicateMatch.example || ''}\n• ${newExample.trim()}` : duplicateMatch.example,
        synonyms: Array.from(new Set([...(duplicateMatch.synonyms || []), ...parsedSynonyms])),
        antonyms: Array.from(new Set([...(duplicateMatch.antonyms || []), ...parsedAntonyms])),
        updated_at: new Date().toISOString(),
      });
      setShowDuplicateModal(false);
      setIsAddModalOpen(false);
      resetAddForm();
      return;
    }

    await saveVocabularyItem({
      id: generateId(),
      word: cleanWord,
      meaning: newMeaning.trim(),
      example: newExample.trim() || undefined,
      synonyms: parsedSynonyms,
      antonyms: parsedAntonyms,
      part_of_speech: newPartOfSpeech,
      pronunciation: newPronunciation.trim() || undefined,
      category: newCategory,
      tags: parsedTags,
      source_type: newSourceType,
      source_title: newSourceTitle.trim() || undefined,
      my_notes: newMyNotes.trim() || undefined,
      is_favorite: false,
      is_trash: false,
      review_count: 0,
      interval_days: 0,
      ease_factor: 2.5,
      status: 'new',
      next_review_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    setShowDuplicateModal(false);
    setIsAddModalOpen(false);
    resetAddForm();
  };

  const resetAddForm = () => {
    setNewWord('');
    setNewMeaning('');
    setNewExample('');
    setNewSynonyms('');
    setNewAntonyms('');
    setNewPartOfSpeech('noun');
    setNewPronunciation('');
    setNewCategory('General');
    setNewTags('');
    setNewSourceType('custom');
    setNewSourceTitle('');
    setNewMyNotes('');
    setDuplicateMatch(null);
  };

  const handleToggleFavorite = async (word: VocabularyItem) => {
    await updateVocabularyItem(word.id, {
      is_favorite: !word.is_favorite,
      updated_at: new Date().toISOString(),
    });
    if (selectedWordDetail && selectedWordDetail.id === word.id) {
      setSelectedWordDetail({ ...selectedWordDetail, is_favorite: !word.is_favorite });
    }
  };

  const handleDeleteWord = async (id: string) => {
    await deleteVocabularyItem(id, false); // soft delete
    setSelectedWordDetail(null);
  };

  // Review Workflow Handlers
  const startReviewSession = () => {
    if (wordsDueForReview.length === 0) return;
    setReviewIndex(0);
    setIsMeaningRevealed(false);
    setReviewedWordsCount(0);
    setIsReviewMode(true);
  };

  const handleReviewAnswer = async (rating: VocabularyReviewRating) => {
    const currentWord = wordsDueForReview[reviewIndex];
    if (!currentWord) return;

    await reviewVocabularyWord(currentWord.id, rating);
    setReviewedWordsCount(prev => prev + 1);

    if (reviewIndex + 1 < wordsDueForReview.length) {
      setReviewIndex(prev => prev + 1);
      setIsMeaningRevealed(false);
    } else {
      // Completed full session
      setTimeout(() => {
        setIsReviewMode(false);
      }, 600);
    }
  };

  const getStatusBadge = (status?: VocabularyStatus) => {
    switch (status) {
      case 'known':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">Known</span>;
      case 'learning':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">Learning</span>;
      case 'needs_review':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">Needs Review</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">New Word</span>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-color)]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-serif-aesthetic text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
              Vocabulary
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/20">
              {stats.total} words
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
            Save new words and actually remember them.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Review Button */}
          {wordsDueForReview.length > 0 && (
            <button
              onClick={startReviewSession}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold shadow-xs transition-all animate-pulse"
            >
              <Brain className="w-4 h-4" />
              <span>Review ({wordsDueForReview.length} Due)</span>
            </button>
          )}

          {/* Add Word Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--accent)] hover:opacity-90 text-[var(--accent-contrast)] text-xs sm:text-sm font-semibold shadow-xs transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Word</span>
          </button>
        </div>
      </div>

      {/* Lightweight Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-xl bg-[var(--bg-paper)] border border-[var(--border-color)] shadow-2xs">
          <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider">Total Words</p>
          <p className="text-2xl font-bold font-serif-aesthetic text-[var(--text-primary)] mt-1">{stats.total}</p>
        </div>
        <div className="p-3.5 rounded-xl bg-[var(--bg-paper)] border border-[var(--border-color)] shadow-2xs">
          <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider">Due for Review</p>
          <p className="text-2xl font-bold font-serif-aesthetic text-amber-600 dark:text-amber-400 mt-1">{stats.due}</p>
        </div>
        <div className="p-3.5 rounded-xl bg-[var(--bg-paper)] border border-[var(--border-color)] shadow-2xs">
          <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider">Known Words</p>
          <p className="text-2xl font-bold font-serif-aesthetic text-emerald-600 dark:text-emerald-400 mt-1">{stats.known}</p>
        </div>
        <div className="p-3.5 rounded-xl bg-[var(--bg-paper)] border border-[var(--border-color)] shadow-2xs">
          <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider">Learned This Month</p>
          <p className="text-2xl font-bold font-serif-aesthetic text-indigo-600 dark:text-indigo-400 mt-1">{stats.learnedThisMonth}</p>
        </div>
        <div className="p-3.5 rounded-xl bg-[var(--bg-paper)] border border-[var(--border-color)] shadow-2xs col-span-2 sm:col-span-1">
          <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider">Reviewed Today</p>
          <p className="text-2xl font-bold font-serif-aesthetic text-[var(--accent)] mt-1">{stats.todayReviewed}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--bg-paper-hover)] border border-[var(--border-color)] overflow-x-auto">
          {[
            { id: 'all', label: 'All' },
            { id: 'due', label: `Due (${stats.due})` },
            { id: 'new', label: 'New' },
            { id: 'learning', label: 'Learning' },
            { id: 'known', label: 'Known' },
            { id: 'favorites', label: '★ Favorites' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedStatus(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                selectedStatus === tab.id
                  ? 'bg-[var(--bg-paper)] text-[var(--accent)] font-semibold shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search, Category, Sort */}
        <div className="flex items-center gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-paper)] text-xs text-[var(--text-secondary)] focus:outline-hidden"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-2.5 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-paper)] text-xs text-[var(--text-secondary)] focus:outline-hidden"
          >
            <option value="recent">Recently Added</option>
            <option value="az">A to Z</option>
            <option value="due">Review Date</option>
            <option value="reviews">Most Reviewed</option>
          </select>

          <div className="relative flex-1 md:w-52">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search words, meanings..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-paper)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
            />
          </div>
        </div>
      </div>

      {/* Words Grid */}
      {filteredWords.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--bg-paper)]/40">
          <div className="w-12 h-12 rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center mx-auto mb-3">
            <BookOpen className="w-6 h-6 opacity-70" />
          </div>
          <h3 className="font-serif-aesthetic font-semibold text-base text-[var(--text-primary)]">
            {searchQuery ? 'No vocabulary terms match your search' : 'Your vocabulary library is ready'}
          </h3>
          <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto mt-1">
            Capture new concepts and technical terminology from research papers, learning sprints, or reading.
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] text-xs font-semibold mt-4 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Your First Word</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredWords.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedWordDetail(item)}
              className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-paper)] hover:border-[var(--accent)]/40 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif-aesthetic font-bold text-base text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                      {item.word}
                    </h3>
                    {item.part_of_speech && (
                      <span className="text-[10px] italic font-serif text-[var(--text-muted)]">
                        ({item.part_of_speech})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleFavorite(item);
                      }}
                      className={`p-1 rounded-md transition-colors ${
                        item.is_favorite 
                          ? 'text-amber-500 fill-amber-500' 
                          : 'text-[var(--text-muted)] opacity-0 group-hover:opacity-100 hover:text-amber-500'
                      }`}
                      title={item.is_favorite ? 'Favorited' : 'Add to Favorites'}
                    >
                      <Star className="w-3.5 h-3.5 fill-current" />
                    </button>
                    {getStatusBadge(item.status)}
                  </div>
                </div>

                {/* Short meaning */}
                <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed mb-3">
                  {item.meaning || 'No definition provided.'}
                </p>

                {/* Example preview */}
                {item.example && (
                  <p className="text-[11px] text-[var(--text-muted)] italic line-clamp-1 border-l-2 border-[var(--accent)]/40 pl-2 mb-3">
                    &ldquo;{item.example}&rdquo;
                  </p>
                )}
              </div>

              {/* Card Footer */}
              <div className="pt-2 border-t border-[var(--border-color)]/60 flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                <span className="truncate max-w-[120px]">{item.category || 'General'}</span>
                <span>
                  {item.review_count ? `${item.review_count} reviews` : 'Not reviewed yet'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Spaced Review Flashcard Studio Modal */}
      {isReviewMode && wordsDueForReview.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-[var(--bg-paper)] rounded-2xl border border-[var(--border-strong)] shadow-2xl overflow-hidden flex flex-col">
            {/* Review Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-color)] bg-[var(--bg-paper-hover)]/40">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="font-serif-aesthetic font-semibold text-xs text-[var(--text-primary)]">
                  Spaced Repetition Review
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-[var(--text-muted)]">
                  {reviewIndex + 1} / {wordsDueForReview.length}
                </span>
                <button
                  onClick={() => setIsReviewMode(false)}
                  className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Flashcard Body */}
            <div className="p-8 text-center space-y-6 min-h-[300px] flex flex-col justify-center">
              {/* Word prompt */}
              <div>
                <span className="text-[10px] uppercase font-semibold text-[var(--text-muted)] tracking-wider block mb-2">
                  Vocabulary Word
                </span>
                <h2 className="font-serif-aesthetic text-3xl font-bold text-[var(--text-primary)] tracking-tight">
                  {wordsDueForReview[reviewIndex]?.word}
                </h2>
                {wordsDueForReview[reviewIndex]?.pronunciation && (
                  <p className="text-xs text-[var(--text-muted)] font-mono mt-1">
                    /{wordsDueForReview[reviewIndex]?.pronunciation}/
                  </p>
                )}
                {wordsDueForReview[reviewIndex]?.part_of_speech && (
                  <p className="text-xs italic text-[var(--text-muted)] mt-0.5">
                    ({wordsDueForReview[reviewIndex]?.part_of_speech})
                  </p>
                )}
              </div>

              {/* Reveal Meaning Section */}
              {!isMeaningRevealed ? (
                <div>
                  <button
                    onClick={() => setIsMeaningRevealed(true)}
                    className="px-6 py-2.5 rounded-xl bg-[var(--accent-soft)] hover:bg-[var(--accent)] hover:text-[var(--accent-contrast)] text-[var(--accent)] border border-[var(--accent)]/30 text-xs font-semibold transition-all shadow-2xs"
                  >
                    Show Meaning
                  </button>
                </div>
              ) : (
                <div className="space-y-4 pt-4 border-t border-[var(--border-color)] animate-in fade-in zoom-in-95 duration-200">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-[var(--text-muted)] tracking-wider block mb-1">
                      Definition
                    </span>
                    <p className="text-sm font-medium text-[var(--text-primary)] leading-relaxed max-w-md mx-auto whitespace-pre-wrap">
                      {wordsDueForReview[reviewIndex]?.meaning}
                    </p>
                  </div>

                  {wordsDueForReview[reviewIndex]?.example && (
                    <div className="p-2.5 rounded-lg bg-[var(--bg-paper-hover)]/60 text-xs italic text-[var(--text-secondary)] max-w-md mx-auto">
                      &ldquo;{wordsDueForReview[reviewIndex]?.example}&rdquo;
                    </div>
                  )}

                  {/* Synonyms & Antonyms */}
                  {((wordsDueForReview[reviewIndex]?.synonyms || []).length > 0 || (wordsDueForReview[reviewIndex]?.antonyms || []).length > 0) && (
                    <div className="flex flex-wrap justify-center gap-2 text-[11px]">
                      {(wordsDueForReview[reviewIndex]?.synonyms || []).map(s => (
                        <span key={s} className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                          Syn: {s}
                        </span>
                      ))}
                      {(wordsDueForReview[reviewIndex]?.antonyms || []).map(a => (
                        <span key={a} className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-700 dark:text-rose-300">
                          Ant: {a}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Answer Buttons (Only visible when revealed) */}
            {isMeaningRevealed && (
              <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-paper-hover)]/30 space-y-2">
                <p className="text-[11px] font-medium text-center text-[var(--text-muted)]">
                  How well did you remember it?
                </p>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    onClick={() => handleReviewAnswer('again')}
                    className="p-2.5 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-600 dark:text-red-400 text-xs font-semibold flex flex-col items-center gap-0.5 transition-all"
                  >
                    <span>Again</span>
                    <span className="text-[10px] opacity-80">&lt; 1 day</span>
                  </button>
                  <button
                    onClick={() => handleReviewAnswer('hard')}
                    className="p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500 hover:text-white text-amber-600 dark:text-amber-400 text-xs font-semibold flex flex-col items-center gap-0.5 transition-all"
                  >
                    <span>Hard</span>
                    <span className="text-[10px] opacity-80">2-3 days</span>
                  </button>
                  <button
                    onClick={() => handleReviewAnswer('good')}
                    className="p-2.5 rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500 hover:text-white text-blue-600 dark:text-blue-400 text-xs font-semibold flex flex-col items-center gap-0.5 transition-all"
                  >
                    <span>Good</span>
                    <span className="text-[10px] opacity-80">4-7 days</span>
                  </button>
                  <button
                    onClick={() => handleReviewAnswer('easy')}
                    className="p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500 hover:text-white text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex flex-col items-center gap-0.5 transition-all"
                  >
                    <span>Easy</span>
                    <span className="text-[10px] opacity-80">14+ days</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Word Detail Modal */}
      {selectedWordDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-[var(--bg-paper)] rounded-2xl border border-[var(--border-strong)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-color)] bg-[var(--bg-paper-hover)]/40">
              <div className="flex items-center gap-2">
                <h3 className="font-serif-aesthetic font-bold text-xl text-[var(--text-primary)]">
                  {selectedWordDetail.word}
                </h3>
                {selectedWordDetail.part_of_speech && (
                  <span className="text-xs italic font-serif text-[var(--text-muted)]">
                    ({selectedWordDetail.part_of_speech})
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleToggleFavorite(selectedWordDetail)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    selectedWordDetail.is_favorite ? 'text-amber-500 fill-amber-500' : 'text-[var(--text-muted)] hover:text-amber-500'
                  }`}
                  title="Favorite"
                >
                  <Star className="w-4 h-4 fill-current" />
                </button>
                <button
                  onClick={() => setSelectedWordDetail(null)}
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Detail Body */}
            <div className="p-5 space-y-4 overflow-y-auto">
              {selectedWordDetail.pronunciation && (
                <div className="text-xs text-[var(--text-muted)] font-mono">
                  Pronunciation: /{selectedWordDetail.pronunciation}/
                </div>
              )}

              {/* Meaning */}
              <div>
                <h4 className="text-[11px] uppercase font-semibold text-[var(--text-muted)] tracking-wider mb-1">
                  Meaning & Definition
                </h4>
                <p className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap font-sans">
                  {selectedWordDetail.meaning || 'No definition given.'}
                </p>
              </div>

              {/* Example */}
              {selectedWordDetail.example && (
                <div>
                  <h4 className="text-[11px] uppercase font-semibold text-[var(--text-muted)] tracking-wider mb-1">
                    Example Sentence
                  </h4>
                  <div className="p-3 rounded-xl bg-[var(--bg-paper-subtle)] border-l-2 border-[var(--accent)] text-xs italic text-[var(--text-secondary)]">
                    &ldquo;{selectedWordDetail.example}&rdquo;
                  </div>
                </div>
              )}

              {/* Synonyms & Antonyms */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(selectedWordDetail.synonyms || []).length > 0 && (
                  <div>
                    <h4 className="text-[11px] uppercase font-semibold text-[var(--text-muted)] tracking-wider mb-1">
                      Synonyms
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {(selectedWordDetail.synonyms || []).map(s => (
                        <span key={s} className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {(selectedWordDetail.antonyms || []).length > 0 && (
                  <div>
                    <h4 className="text-[11px] uppercase font-semibold text-[var(--text-muted)] tracking-wider mb-1">
                      Antonyms
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {(selectedWordDetail.antonyms || []).map(a => (
                        <span key={a} className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-700 dark:text-rose-300 text-xs">
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Personal Notes */}
              {selectedWordDetail.my_notes && (
                <div>
                  <h4 className="text-[11px] uppercase font-semibold text-[var(--text-muted)] tracking-wider mb-1">
                    Personal Notes
                  </h4>
                  <p className="text-xs text-[var(--text-secondary)] whitespace-pre-wrap">
                    {selectedWordDetail.my_notes}
                  </p>
                </div>
              )}

              {/* Spaced repetition memory details */}
              <div className="p-3 rounded-xl bg-[var(--bg-paper-hover)]/60 border border-[var(--border-color)] text-xs grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] block">Status</span>
                  <span className="font-semibold text-[var(--text-primary)]">{selectedWordDetail.status}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] block">Review Count</span>
                  <span className="font-semibold text-[var(--text-primary)]">{selectedWordDetail.review_count || 0}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] block">Next Review</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {selectedWordDetail.next_review_at ? new Date(selectedWordDetail.next_review_at).toLocaleDateString() : 'Due today'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] block">Added On</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {new Date(selectedWordDetail.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Detail Actions */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--border-color)] bg-[var(--bg-paper-hover)]/30">
              <button
                onClick={() => handleDeleteWord(selectedWordDetail.id)}
                className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400 hover:underline"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Move to Trash</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const item = selectedWordDetail;
                    setSelectedWordDetail(null);
                    setEditingWord(item);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-paper-hover)] text-xs font-medium"
                >
                  Edit Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Word Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-[var(--bg-paper)] rounded-2xl border border-[var(--border-strong)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border-color)] bg-[var(--bg-paper-hover)]/40">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[var(--accent)]" />
                <h3 className="font-serif-aesthetic font-semibold text-sm text-[var(--text-primary)]">
                  Add New Vocabulary Word
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddWord} className="p-5 space-y-3.5 overflow-y-auto">
              {/* Word (Required) */}
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Word / Phrase <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newWord}
                  onChange={(e) => setNewWord(e.target.value)}
                  placeholder="e.g. Trilateration"
                  className="w-full px-3.5 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-paper)] text-sm font-semibold text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
                  required
                  autoFocus
                />
              </div>

              {/* Meaning */}
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Meaning / Definition
                </label>
                <textarea
                  rows={2}
                  value={newMeaning}
                  onChange={(e) => setNewMeaning(e.target.value)}
                  placeholder="Determining position from distances to known points."
                  className="w-full px-3.5 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-paper)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)] resize-none"
                />
              </div>

              {/* Example sentence */}
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Example Sentence
                </label>
                <input
                  type="text"
                  value={newExample}
                  onChange={(e) => setNewExample(e.target.value)}
                  placeholder="GPS systems rely on trilateration to calculate precise location."
                  className="w-full px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-paper)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
                />
              </div>

              {/* Part of Speech & Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Part of Speech
                  </label>
                  <select
                    value={newPartOfSpeech}
                    onChange={(e) => setNewPartOfSpeech(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-paper)] text-xs text-[var(--text-primary)]"
                  >
                    {PARTS_OF_SPEECH.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-paper)] text-xs text-[var(--text-primary)]"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Synonyms & Antonyms */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Synonyms (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={newSynonyms}
                    onChange={(e) => setNewSynonyms(e.target.value)}
                    placeholder="triangulation, ranging"
                    className="w-full px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-paper)] text-xs text-[var(--text-primary)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Antonyms (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={newAntonyms}
                    onChange={(e) => setNewAntonyms(e.target.value)}
                    placeholder="None"
                    className="w-full px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-paper)] text-xs text-[var(--text-primary)]"
                  />
                </div>
              </div>

              {/* Pronunciation & Tags */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Pronunciation Note
                  </label>
                  <input
                    type="text"
                    value={newPronunciation}
                    onChange={(e) => setNewPronunciation(e.target.value)}
                    placeholder="try-lat-er-AY-shun"
                    className="w-full px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-paper)] text-xs text-[var(--text-primary)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={newTags}
                    onChange={(e) => setNewTags(e.target.value)}
                    placeholder="navigation, math, sensor"
                    className="w-full px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-paper)] text-xs text-[var(--text-primary)]"
                  />
                </div>
              </div>

              {/* Source Reference */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Source
                  </label>
                  <select
                    value={newSourceType}
                    onChange={(e) => setNewSourceType(e.target.value as any)}
                    className="w-full px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-paper)] text-xs text-[var(--text-primary)]"
                  >
                    {SOURCES.map(s => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Source Title / Reference
                  </label>
                  <input
                    type="text"
                    value={newSourceTitle}
                    onChange={(e) => setNewSourceTitle(e.target.value)}
                    placeholder="e.g. GPS Paper"
                    className="w-full px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-paper)] text-xs text-[var(--text-primary)]"
                  />
                </div>
              </div>

              {/* Personal Notes */}
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Personal Note
                </label>
                <input
                  type="text"
                  value={newMyNotes}
                  onChange={(e) => setNewMyNotes(e.target.value)}
                  placeholder="Remember: distances, not angles."
                  className="w-full px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-paper)] text-xs text-[var(--text-primary)]"
                />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-[var(--border-color)] hover:bg-[var(--bg-paper-hover)] text-xs font-medium text-[var(--text-secondary)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] text-xs font-semibold shadow-xs"
                >
                  Save Word
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Duplicate Word Detection Alert Modal */}
      {showDuplicateModal && duplicateMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[var(--bg-paper)] rounded-2xl border border-[var(--border-strong)] shadow-2xl p-5 space-y-4">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="font-serif-aesthetic font-bold text-base text-[var(--text-primary)]">
                  Word Already Exists
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  &ldquo;{duplicateMatch.word}&rdquo; is already in your vocabulary library.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-xs space-y-1">
              <span className="font-semibold text-[var(--text-secondary)]">Current Meaning:</span>
              <p className="text-[var(--text-primary)]">{duplicateMatch.meaning || 'No meaning yet.'}</p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => saveNewWordToStorage(true)}
                className="w-full py-2 px-3 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] text-xs font-semibold shadow-xs hover:opacity-90"
              >
                + Add Another Meaning / Append
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowDuplicateModal(false);
                  setIsAddModalOpen(false);
                  setSelectedWordDetail(duplicateMatch);
                }}
                className="w-full py-2 px-3 rounded-xl border border-[var(--border-color)] text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-paper-hover)]"
              >
                Open Existing Word
              </button>

              <button
                type="button"
                onClick={() => setShowDuplicateModal(false)}
                className="w-full py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Word Details Modal */}
      {editingWord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-[var(--bg-paper)] rounded-2xl border border-[var(--border-strong)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border-color)]">
              <h3 className="font-serif-aesthetic font-semibold text-sm text-[var(--text-primary)]">
                Edit Word Details
              </h3>
              <button
                type="button"
                onClick={() => setEditingWord(null)}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await updateVocabularyItem(editingWord.id, {
                  word: editingWord.word,
                  meaning: editingWord.meaning,
                  example: editingWord.example,
                  part_of_speech: editingWord.part_of_speech,
                  pronunciation: editingWord.pronunciation,
                  category: editingWord.category,
                  my_notes: editingWord.my_notes,
                  status: editingWord.status,
                  updated_at: new Date().toISOString(),
                });
                setEditingWord(null);
              }}
              className="p-5 space-y-3.5 overflow-y-auto"
            >
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Word
                </label>
                <input
                  type="text"
                  value={editingWord.word}
                  onChange={(e) => setEditingWord({ ...editingWord, word: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-paper)] text-sm font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Meaning
                </label>
                <textarea
                  rows={3}
                  value={editingWord.meaning}
                  onChange={(e) => setEditingWord({ ...editingWord, meaning: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-paper)] text-xs resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Example
                </label>
                <input
                  type="text"
                  value={editingWord.example || ''}
                  onChange={(e) => setEditingWord({ ...editingWord, example: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-paper)] text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Category
                  </label>
                  <select
                    value={editingWord.category || 'General'}
                    onChange={(e) => setEditingWord({ ...editingWord, category: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-paper)] text-xs"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Status
                  </label>
                  <select
                    value={editingWord.status || 'new'}
                    onChange={(e) => setEditingWord({ ...editingWord, status: e.target.value as any })}
                    className="w-full px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-paper)] text-xs"
                  >
                    <option value="new">New</option>
                    <option value="learning">Learning</option>
                    <option value="needs_review">Needs Review</option>
                    <option value="known">Known</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Personal Note
                </label>
                <input
                  type="text"
                  value={editingWord.my_notes || ''}
                  onChange={(e) => setEditingWord({ ...editingWord, my_notes: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-paper)] text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setEditingWord(null)}
                  className="px-3.5 py-1.5 rounded-xl border border-[var(--border-color)] text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] text-xs font-semibold shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
