'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { usePlanner } from '@/lib/storage';
import { 
  KnowledgeItem, 
  KnowledgeItemType, 
  VocabularyItem, 
  LearningSource, 
  LearningWord 
} from '@/lib/types';
import { 
  LEARNING_CATEGORIES, 
  CATEGORY_ICONS 
} from '@/lib/learning-topics';
import { formatDate, generateId } from '@/lib/utils';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { 
  BookOpen, 
  Search, 
  Plus, 
  Star, 
  Trash2, 
  Edit3, 
  ExternalLink, 
  Sparkles, 
  Tag, 
  Calendar, 
  Filter, 
  X, 
  Check, 
  Copy, 
  Bookmark, 
  Lightbulb, 
  Layers, 
  BookMarked,
  ArrowRight,
  Share2,
  FolderOpen
} from 'lucide-react';

type VaultTab = 'all' | 'sprint' | 'note' | 'vocabulary' | 'favorites' | 'recent';

function KnowledgeVaultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { 
    knowledgeItems, 
    vocabularyItems, 
    saveKnowledgeItem, 
    updateKnowledgeItem, 
    deleteKnowledgeItem,
    saveVocabularyItem,
    deleteVocabularyItem 
  } = usePlanner();

  const [activeTab, setActiveTab] = useState<VaultTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedItemDetail, setSelectedItemDetail] = useState<KnowledgeItem | null>(null);

  // New Knowledge Note modal
  const [isNewNoteModalOpen, setIsNewNoteModalOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteType, setNoteType] = useState<KnowledgeItemType>('note');
  const [noteCategory, setNoteCategory] = useState('General Knowledge');
  const [noteTagsInput, setNoteTagsInput] = useState('');
  const [noteSummary, setNoteSummary] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteSources, setNoteSources] = useState<LearningSource[]>([]);
  const [newSourceTitle, setNewSourceTitle] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');

  // Edit Knowledge Item modal
  const [editingItem, setEditingItem] = useState<KnowledgeItem | null>(null);

  // Add Vocabulary Item modal
  const [isAddVocabModalOpen, setIsAddVocabModalOpen] = useState(false);
  const [vocabWord, setVocabWord] = useState('');
  const [vocabMeaning, setVocabMeaning] = useState('');
  const [vocabExample, setVocabExample] = useState('');
  const [vocabCategory, setVocabCategory] = useState('General');

  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Check URL query parameters on load
  useEffect(() => {
    const idParam = searchParams.get('id');
    const tabParam = searchParams.get('tab') as VaultTab | null;
    const newParam = searchParams.get('new');
    const searchParam = searchParams.get('search');

    if (idParam) {
      const found = knowledgeItems.find(i => i.id === idParam || i.source_sprint_id === idParam);
      if (found) {
        setSelectedItemDetail(found);
      }
    }

    if (tabParam && ['all', 'sprint', 'note', 'vocabulary', 'favorites', 'recent'].includes(tabParam)) {
      setActiveTab(tabParam);
    }

    if (newParam === 'true') {
      setIsNewNoteModalOpen(true);
    }

    if (searchParam) {
      setSearchQuery(searchParam);
    }
  }, [searchParams, knowledgeItems]);

  // Filtered knowledge items
  const filteredItems = useMemo(() => {
    let list = [...knowledgeItems];

    // Filter by Tab
    if (activeTab === 'sprint') {
      list = list.filter(i => i.type === 'sprint');
    } else if (activeTab === 'note') {
      list = list.filter(i => i.type === 'note' || i.type === 'concept');
    } else if (activeTab === 'favorites') {
      list = list.filter(i => i.is_favorite);
    } else if (activeTab === 'recent') {
      const recentThreshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      list = list.filter(i => new Date(i.created_at) >= recentThreshold);
    }

    // Filter by Category
    if (selectedCategory !== 'all') {
      list = list.filter(i => i.category.toLowerCase() === selectedCategory.toLowerCase());
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(i => {
        const inTitle = i.title.toLowerCase().includes(q);
        const inCategory = i.category.toLowerCase().includes(q);
        const inSummary = (i.summary || '').toLowerCase().includes(q);
        const inContent = i.content.toLowerCase().includes(q);
        const inTags = (i.tags || []).some(t => t.toLowerCase().includes(q));
        const inPoints = (i.key_points || []).some(p => p.toLowerCase().includes(q));
        const inSources = (i.sources || []).some(s => s.title.toLowerCase().includes(q));
        const inWords = (i.related_words || []).some(w => w.word.toLowerCase().includes(q) || w.meaning.toLowerCase().includes(q));
        return inTitle || inCategory || inSummary || inContent || inTags || inPoints || inSources || inWords;
      });
    }

    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [knowledgeItems, activeTab, selectedCategory, searchQuery]);

  // Filtered vocabulary items
  const filteredVocabulary = useMemo(() => {
    let list = [...vocabularyItems];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(v => v.word.toLowerCase().includes(q) || v.meaning.toLowerCase().includes(q) || (v.example || '').toLowerCase().includes(q));
    }
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [vocabularyItems, searchQuery]);

  // Related knowledge items for the open modal/detail view
  const relatedItems = useMemo(() => {
    if (!selectedItemDetail) return [];
    return knowledgeItems.filter(i => 
      i.id !== selectedItemDetail.id && 
      (i.category === selectedItemDetail.category || i.tags?.some(t => selectedItemDetail.tags?.includes(t)))
    ).slice(0, 3);
  }, [knowledgeItems, selectedItemDetail]);

  // Save new note handler
  const handleSaveNewNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim()) return;

    const tags = noteTagsInput
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(Boolean);

    const newItem: KnowledgeItem = {
      id: `know-${generateId()}`,
      title: noteTitle.trim(),
      type: noteType,
      category: noteCategory,
      tags: tags.length > 0 ? tags : [noteCategory.toLowerCase().replace(/\s+/g, '-')],
      summary: noteSummary.trim() || undefined,
      content: noteContent || '<p></p>',
      sources: noteSources,
      is_favorite: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      await saveKnowledgeItem(newItem);
      setIsNewNoteModalOpen(false);
      setNoteTitle('');
      setNoteSummary('');
      setNoteContent('');
      setNoteTagsInput('');
      setNoteSources([]);
      setSelectedItemDetail(newItem);
    } catch (e) {
      console.error('Error saving knowledge note:', e);
    }
  };

  // Update existing note handler
  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      const updated = await updateKnowledgeItem(editingItem.id, editingItem);
      if (selectedItemDetail?.id === updated.id) {
        setSelectedItemDetail(updated);
      }
      setEditingItem(null);
    } catch (e) {
      console.error('Error updating knowledge item:', e);
    }
  };

  // Toggle favorite status
  const handleToggleFavorite = async (item: KnowledgeItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const updated = await updateKnowledgeItem(item.id, { is_favorite: !item.is_favorite });
      if (selectedItemDetail?.id === item.id) {
        setSelectedItemDetail(updated);
      }
    } catch (e) {
      console.error('Error toggling favorite:', e);
    }
  };

  // Delete item handler
  const handleDeleteItem = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Delete this knowledge item?')) return;
    try {
      await deleteKnowledgeItem(id);
      if (selectedItemDetail?.id === id) {
        setSelectedItemDetail(null);
      }
    } catch (e) {
      console.error('Error deleting knowledge item:', e);
    }
  };

  // Save new vocabulary handler
  const handleSaveVocabulary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vocabWord.trim() || !vocabMeaning.trim()) return;

    const newVoc: VocabularyItem = {
      id: `voc-${generateId()}`,
      word: vocabWord.trim(),
      meaning: vocabMeaning.trim(),
      example: vocabExample.trim() || undefined,
      category: vocabCategory,
      tags: [vocabCategory.toLowerCase().replace(/\s+/g, '-')],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      await saveVocabularyItem(newVoc);
      setIsAddVocabModalOpen(false);
      setVocabWord('');
      setVocabMeaning('');
      setVocabExample('');
    } catch (e) {
      console.error('Error saving vocabulary item:', e);
    }
  };

  // Copy item content to clipboard
  const handleCopyContent = (item: KnowledgeItem) => {
    const plainText = `${item.title}\nCategory: ${item.category}\n\n${item.summary ? item.summary + '\n\n' : ''}${item.content.replace(/<[^>]+>/g, '')}`;
    navigator.clipboard.writeText(plainText);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-color)] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] flex items-center justify-center text-lg shadow-xs">
              📚
            </span>
            <h2 className="font-serif-aesthetic text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
              Knowledge Vault
            </h2>
          </div>
          <p className="font-serif-aesthetic italic text-xs text-[var(--text-secondary)] mt-1">
            Everything worth remembering — your personal searchable knowledge library.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => router.push('/sprint')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[var(--bg-paper-subtle)] hover:bg-[var(--bg-paper-hover)] border border-[var(--border-color)] text-xs font-medium text-[var(--text-primary)] shadow-2xs transition-colors"
          >
            <Lightbulb className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Start Learning Sprint</span>
          </button>

          <button
            onClick={() => setIsNewNoteModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-contrast)] text-xs font-semibold shadow-xs transition-transform active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ New Knowledge Note</span>
          </button>
        </div>
      </div>

      {/* Search & Main Filter Controls */}
      <div className="space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search titles, notes, key points, tags, vocabulary, or sources..."
            className="w-full text-xs pl-10 pr-10 py-3 rounded-2xl bg-[var(--bg-paper)] border border-[var(--border-strong)] text-[var(--text-primary)] placeholder-[var(--text-muted)] shadow-2xs focus:outline-none focus:border-[var(--accent)]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Tab Selector & Category Filter */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {/* Navigation Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
            {[
              { key: 'all', label: 'All Notes', count: knowledgeItems.length },
              { key: 'sprint', label: 'Learning Sprints', count: knowledgeItems.filter(i => i.type === 'sprint').length },
              { key: 'note', label: 'Research & Notes', count: knowledgeItems.filter(i => i.type !== 'sprint').length },
              { key: 'vocabulary', label: 'Vocabulary', count: vocabularyItems.length },
              { key: 'favorites', label: 'Favorites', count: knowledgeItems.filter(i => i.is_favorite).length },
              { key: 'recent', label: 'Recently Added' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as VaultTab)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  activeTab === tab.key
                    ? 'bg-[var(--accent)] text-[var(--accent-contrast)] shadow-2xs font-semibold'
                    : 'bg-[var(--bg-paper-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)]'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                    activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-[var(--bg-paper)] text-[var(--text-muted)]'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Category Dropdown Filter */}
          {activeTab !== 'vocabulary' && (
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
              <Filter className="w-3.5 h-3.5 text-[var(--accent)]" />
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="text-xs py-1 px-2.5 rounded-xl bg-[var(--bg-paper)] border border-[var(--border-color)] text-[var(--text-primary)]"
              >
                <option value="all">All Categories</option>
                {LEARNING_CATEGORIES.filter(c => c !== 'Surprise Me').map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB CONTENT 1: VOCABULARY VIEW */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'vocabulary' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
              <BookMarked className="w-4 h-4 text-[var(--accent)]" />
              <span>Vocabulary & Concepts ({filteredVocabulary.length})</span>
            </span>

            <button
              onClick={() => setIsAddVocabModalOpen(true)}
              className="flex items-center gap-1 text-xs font-semibold text-[var(--accent)] hover:underline"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Term</span>
            </button>
          </div>

          {filteredVocabulary.length === 0 ? (
            <div className="p-12 text-center journal-paper rounded-3xl border border-[var(--border-color)] space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center text-xl mx-auto">
                📖
              </div>
              <h4 className="font-serif-aesthetic text-base font-bold text-[var(--text-primary)]">
                No vocabulary terms found
              </h4>
              <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
                Terms saved during your Learning Sprints or added manually will appear in this interactive lexicon.
              </p>
              <button
                onClick={() => setIsAddVocabModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] text-xs font-semibold shadow-xs"
              >
                Add Your First Word
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {filteredVocabulary.map(v => (
                <div
                  key={v.id}
                  className="p-4 rounded-2xl journal-paper border border-[var(--border-color)] shadow-2xs hover:border-[var(--accent)]/50 transition-all flex flex-col justify-between gap-3 group"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h4 className="font-serif-aesthetic text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                        {v.word}
                      </h4>
                      <button
                        onClick={() => deleteVocabularyItem(v.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-[var(--text-muted)] hover:text-red-500 rounded transition-opacity"
                        title="Delete term"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-xs text-[var(--text-secondary)] font-serif-aesthetic">
                      {v.meaning}
                    </p>

                    {v.example && (
                      <p className="text-[11px] text-[var(--text-muted)] italic pt-1 border-t border-[var(--border-color)]/60">
                        &ldquo;{v.example}&rdquo;
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] pt-1">
                    <span className="px-2 py-0.5 rounded-md bg-[var(--bg-paper-subtle)] border border-[var(--border-color)]">
                      {v.category || 'General'}
                    </span>
                    <span>{formatDate(v.created_at, { month: 'short', day: 'numeric' })}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ------------------------------------------------------------- */
        /* TAB CONTENT 2: KNOWLEDGE CARDS GRID */
        /* ------------------------------------------------------------- */
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] font-medium">
            <span>Showing {filteredItems.length} knowledge items</span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-[var(--accent)] hover:underline"
              >
                Clear search
              </button>
            )}
          </div>

          {filteredItems.length === 0 ? (
            <div className="p-16 text-center journal-paper rounded-3xl border border-[var(--border-color)] space-y-4">
              <div className="w-14 h-14 rounded-3xl bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center text-2xl mx-auto shadow-xs">
                💡
              </div>
              <div className="space-y-1">
                <h4 className="font-serif-aesthetic text-lg font-bold text-[var(--text-primary)]">
                  {searchQuery ? `No knowledge entries matching "${searchQuery}"` : 'Your Knowledge Vault is ready'}
                </h4>
                <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto">
                  {searchQuery
                    ? 'Try searching for a different keyword, category, or tag.'
                    : 'Complete a Learning Sprint or create a standalone Knowledge Note to start building your permanent memory bank.'}
                </p>
              </div>

              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => router.push('/sprint')}
                  className="px-4 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-contrast)] text-xs font-semibold shadow-xs"
                >
                  Start Learning Sprint
                </button>
                <button
                  onClick={() => setIsNewNoteModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-[var(--bg-paper-subtle)] hover:bg-[var(--bg-paper-hover)] border border-[var(--border-color)] text-xs font-medium text-[var(--text-primary)]"
                >
                  + Add Knowledge Note
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredItems.map(item => {
                const isSprint = item.type === 'sprint';
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItemDetail(item)}
                    className="p-5 rounded-2xl journal-paper border border-[var(--border-color)] hover:border-[var(--accent)] shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between gap-4 group"
                  >
                    <div className="space-y-2">
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/30">
                            {CATEGORY_ICONS[item.category] || '💡'} {item.category}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded text-[var(--text-muted)] bg-[var(--bg-paper-subtle)] capitalize">
                            {isSprint ? 'Learning Sprint' : item.type}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={e => handleToggleFavorite(item, e)}
                            className="p-1 text-[var(--text-muted)] hover:text-amber-500 rounded transition-colors"
                            title={item.is_favorite ? 'Remove favorite' : 'Mark as favorite'}
                          >
                            <Star className={`w-4 h-4 ${item.is_favorite ? 'text-amber-500 fill-amber-500' : ''}`} />
                          </button>

                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              handleCopyContent(item);
                            }}
                            className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded"
                            title="Copy text"
                          >
                            {copiedId === item.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                          </button>

                          <button
                            type="button"
                            onClick={e => handleDeleteItem(item.id, e)}
                            className="p-1 text-[var(--text-muted)] hover:text-red-500 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Delete note"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className="font-serif-aesthetic text-lg font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors leading-snug">
                        {item.title}
                      </h3>

                      {/* Summary or Preview snippet */}
                      {item.summary ? (
                        <p className="text-xs text-[var(--text-secondary)] font-serif-aesthetic italic line-clamp-2">
                          &ldquo;{item.summary}&rdquo;
                        </p>
                      ) : item.content ? (
                        <p className="text-xs text-[var(--text-secondary)] font-serif-aesthetic line-clamp-2">
                          {item.content.replace(/<[^>]+>/g, '').substring(0, 120)}...
                        </p>
                      ) : null}

                      {/* Key Points snippet */}
                      {item.key_points && item.key_points.length > 0 && (
                        <div className="space-y-1 pt-1">
                          {item.key_points.slice(0, 2).map((pt, idx) => (
                            <div key={idx} className="flex items-start gap-1.5 text-[11px] text-[var(--text-secondary)]">
                              <span className="text-[var(--accent)] font-bold shrink-0">•</span>
                              <span className="line-clamp-1">{pt}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] pt-2 border-t border-[var(--border-color)]/60">
                      <div className="flex items-center gap-2">
                        <span>{formatDate(item.created_at, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        {item.sources && item.sources.length > 0 && (
                          <span>• {item.sources.length} sources</span>
                        )}
                      </div>

                      <span className="text-[var(--accent)] font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        <span>Read</span>
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. ITEM DETAIL MODAL VIEW */}
      {/* ------------------------------------------------------------- */}
      {selectedItemDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 rounded-3xl bg-[var(--bg-paper)] border border-[var(--border-strong)] shadow-2xl space-y-6 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-[var(--border-color)] pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/30">
                    {CATEGORY_ICONS[selectedItemDetail.category] || '💡'} {selectedItemDetail.category}
                  </span>
                  <span className="text-[11px] text-[var(--text-muted)]">
                    {formatDate(selectedItemDetail.created_at, { month: 'long', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                <h3 className="font-serif-aesthetic text-2xl font-bold text-[var(--text-primary)]">
                  {selectedItemDetail.title}
                </h3>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleToggleFavorite(selectedItemDetail)}
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-amber-500 hover:bg-[var(--bg-paper-hover)]"
                  title="Toggle favorite"
                >
                  <Star className={`w-5 h-5 ${selectedItemDetail.is_favorite ? 'text-amber-500 fill-amber-500' : ''}`} />
                </button>

                <button
                  onClick={() => {
                    setEditingItem(selectedItemDetail);
                  }}
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-paper-hover)]"
                  title="Edit entry"
                >
                  <Edit3 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleDeleteItem(selectedItemDetail.id)}
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                  title="Delete entry"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setSelectedItemDetail(null)}
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-paper-hover)]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Summary / One-sentence takeaway */}
            {selectedItemDetail.summary && (
              <div className="p-4 rounded-2xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] font-serif-aesthetic italic">
                &ldquo;{selectedItemDetail.summary}&rdquo;
              </div>
            )}

            {/* Key Points */}
            {selectedItemDetail.key_points && selectedItemDetail.key_points.length > 0 && (
              <div className="space-y-2 p-4 rounded-2xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)]">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Key Takeaways
                </div>
                <ul className="space-y-1.5 text-xs text-[var(--text-secondary)] list-disc list-inside">
                  {selectedItemDetail.key_points.map((pt, idx) => (
                    <li key={idx} className="font-serif-aesthetic">{pt}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Main Research Content */}
            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Research Notes
              </div>
              <div 
                className="text-xs text-[var(--text-primary)] leading-relaxed space-y-2 prose dark:prose-invert max-w-none p-4 rounded-2xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)]"
                dangerouslySetInnerHTML={{ __html: selectedItemDetail.content || '<p>No written notes.</p>' }}
              />
            </div>

            {/* Related Words / Vocabulary */}
            {selectedItemDetail.related_words && selectedItemDetail.related_words.length > 0 && (
              <div className="space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Vocabulary & Concepts
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedItemDetail.related_words.map((w, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-xs space-y-0.5">
                      <strong className="text-[var(--text-primary)] font-bold">{w.word}</strong>
                      <p className="text-[11px] text-[var(--text-secondary)]">{w.meaning}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sources */}
            {selectedItemDetail.sources && selectedItemDetail.sources.length > 0 && (
              <div className="space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Sources & Reference Links
                </div>
                <div className="space-y-1.5">
                  {selectedItemDetail.sources.map(src => (
                    <a
                      key={src.id}
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] hover:border-[var(--accent)] flex items-center justify-between text-xs text-[var(--accent)] font-medium transition-colors"
                    >
                      <span className="truncate">{src.title}</span>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0 text-[var(--text-muted)]" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Related Knowledge Section */}
            {relatedItems.length > 0 && (
              <div className="pt-4 border-t border-[var(--border-color)] space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Related Knowledge
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {relatedItems.map(rel => (
                    <button
                      key={rel.id}
                      onClick={() => setSelectedItemDetail(rel)}
                      className="p-2.5 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] hover:border-[var(--accent)] text-left text-xs transition-colors"
                    >
                      <div className="font-bold text-[var(--text-primary)] line-clamp-1">{rel.title}</div>
                      <div className="text-[10px] text-[var(--text-muted)] capitalize">{rel.category}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Close Button */}
            <div className="flex items-center justify-end pt-3 border-t border-[var(--border-color)]">
              <button
                onClick={() => setSelectedItemDetail(null)}
                className="px-5 py-2 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] text-xs font-semibold shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. NEW KNOWLEDGE NOTE MODAL */}
      {/* ------------------------------------------------------------- */}
      {isNewNoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <form
            onSubmit={handleSaveNewNote}
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 rounded-3xl bg-[var(--bg-paper)] border border-[var(--border-strong)] shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <h3 className="font-serif-aesthetic text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[var(--accent)]" />
                <span>Create Knowledge Note</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsNewNoteModalOpen(false)}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <label className="block text-xs font-semibold text-[var(--text-secondary)]">Title / Concept</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. How CRISPR Cas9 Works / The Pareto Distribution"
                  value={noteTitle}
                  onChange={e => setNoteTitle(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[var(--text-secondary)]">Category</label>
                <select
                  value={noteCategory}
                  onChange={e => setNoteCategory(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-[var(--text-primary)]"
                >
                  {LEARNING_CATEGORIES.filter(c => c !== 'Surprise Me').map(cat => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                One-Sentence Summary / Core Idea
              </label>
              <input
                type="text"
                placeholder="e.g. A tool that allows precision editing of DNA sequences in living cells."
                value={noteSummary}
                onChange={e => setNoteSummary(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                Tags (comma separated)
              </label>
              <input
                type="text"
                placeholder="e.g. genetics, biology, biotechnology"
                value={noteTagsInput}
                onChange={e => setNoteTagsInput(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                Detailed Knowledge & Notes (Rich Text)
              </label>
              <RichTextEditor
                value={noteContent}
                onChange={setNoteContent}
                placeholder="Write detailed notes, explanations, examples, formulas..."
                minHeight="140px"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
              <button
                type="button"
                onClick={() => setIsNewNoteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-paper-hover)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-contrast)] text-xs font-semibold shadow-xs"
              >
                Save Knowledge Note
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 5. EDIT KNOWLEDGE ITEM MODAL */}
      {/* ------------------------------------------------------------- */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <form
            onSubmit={handleUpdateItem}
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 rounded-3xl bg-[var(--bg-paper)] border border-[var(--border-strong)] shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <h3 className="font-serif-aesthetic text-lg font-bold text-[var(--text-primary)]">
                Edit Knowledge Item
              </h3>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <label className="block text-xs font-semibold text-[var(--text-secondary)]">Title</label>
                <input
                  type="text"
                  required
                  value={editingItem.title}
                  onChange={e => setEditingItem({ ...editingItem, title: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-[var(--text-primary)]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[var(--text-secondary)]">Category</label>
                <select
                  value={editingItem.category}
                  onChange={e => setEditingItem({ ...editingItem, category: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-[var(--text-primary)]"
                >
                  {LEARNING_CATEGORIES.filter(c => c !== 'Surprise Me').map(cat => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[var(--text-secondary)]">Summary</label>
              <input
                type="text"
                value={editingItem.summary || ''}
                onChange={e => setEditingItem({ ...editingItem, summary: e.target.value })}
                className="w-full text-xs p-2.5 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-[var(--text-primary)]"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[var(--text-secondary)]">Content Notes</label>
              <RichTextEditor
                value={editingItem.content}
                onChange={c => setEditingItem({ ...editingItem, content: c })}
                minHeight="140px"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-paper-hover)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-contrast)] text-xs font-semibold shadow-xs"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 6. ADD VOCABULARY TERM MODAL */}
      {/* ------------------------------------------------------------- */}
      {isAddVocabModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <form
            onSubmit={handleSaveVocabulary}
            className="w-full max-w-md p-6 rounded-3xl bg-[var(--bg-paper)] border border-[var(--border-strong)] shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <h3 className="font-serif-aesthetic text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                <BookMarked className="w-4 h-4 text-[var(--accent)]" />
                <span>Add Word to Lexicon</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddVocabModalOpen(false)}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[var(--text-secondary)]">Word / Term</label>
              <input
                type="text"
                required
                placeholder="e.g. Cognitive Ease"
                value={vocabWord}
                onChange={e => setVocabWord(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-[var(--text-primary)]"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[var(--text-secondary)]">Definition</label>
              <textarea
                rows={2}
                required
                placeholder="e.g. A state where the brain processes information with minimal cognitive friction."
                value={vocabMeaning}
                onChange={e => setVocabMeaning(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-[var(--text-primary)]"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[var(--text-secondary)]">Example / Usage (optional)</label>
              <input
                type="text"
                placeholder="e.g. Clear typography and familiar layout increase cognitive ease."
                value={vocabExample}
                onChange={e => setVocabExample(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-[var(--text-primary)]"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[var(--text-secondary)]">Category</label>
              <select
                value={vocabCategory}
                onChange={e => setVocabCategory(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-[var(--text-primary)]"
              >
                {LEARNING_CATEGORIES.filter(c => c !== 'Surprise Me').map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
              <button
                type="button"
                onClick={() => setIsAddVocabModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-paper-hover)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-contrast)] text-xs font-semibold shadow-xs"
              >
                Add Word
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default function KnowledgeVaultPage() {
  return (
    <Suspense fallback={
      <div className="py-20 text-center text-xs text-[var(--text-muted)]">
        Opening Knowledge Vault...
      </div>
    }>
      <KnowledgeVaultContent />
    </Suspense>
  );
}
