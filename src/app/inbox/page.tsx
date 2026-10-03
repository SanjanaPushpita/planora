'use client';

import React, { useState, useMemo } from 'react';
import { usePlanner } from '@/lib/storage';
import { 
  InboxItem, 
  InboxItemType, 
  InboxItemPriority,
  PageBlock,
  ChecklistBlockContent
} from '@/lib/types';
import { generateId } from '@/lib/utils';
import { 
  Inbox as InboxIcon, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle, 
  Circle, 
  Tag, 
  Calendar, 
  Link as LinkIcon, 
  Flag, 
  BookOpen, 
  FileText, 
  Sparkles, 
  Trash2, 
  Archive, 
  RotateCcw, 
  ArrowRight, 
  Check, 
  X, 
  Edit3, 
  Clock, 
  Compass, 
  Lightbulb, 
  Layers, 
  Share2,
  ExternalLink,
  ChevronRight,
  FolderSync
} from 'lucide-react';
import { QuickCaptureModal } from '@/components/modals/QuickCaptureModal';

export default function InboxPage() {
  const { 
    inboxItems, 
    saveInboxItem, 
    updateInboxItem, 
    deleteInboxItem, 
    organizeInboxItem,
    pages,
    storage,
    goals,
    goalMilestones,
    saveGoalTask,
    knowledgeItems,
    saveKnowledgeItem,
    researchPapers,
    updateResearchPaper,
    saveResearchPaper,
    saveVocabularyItem,
    vocabularyItems
  } = usePlanner();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<'unorganized' | 'all' | 'organized' | 'archived'>('unorganized');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [isQuickCaptureOpen, setIsQuickCaptureOpen] = useState(false);

  // Organize Modal State
  const [organizingItem, setOrganizingItem] = useState<InboxItem | null>(null);
  const [organizeTarget, setOrganizeTarget] = useState<'daily_task' | 'goal_task' | 'vault_note' | 'paper_note' | 'vocabulary' | 'journal'>('daily_task');
  const [targetDate, setTargetDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [targetGoalId, setTargetGoalId] = useState('');
  const [targetMilestoneId, setTargetMilestoneId] = useState('');
  const [targetPaperId, setTargetPaperId] = useState('');
  const [targetVaultCategory, setTargetVaultCategory] = useState('General Knowledge');
  const [organizeNoteTitle, setOrganizeNoteTitle] = useState('');
  const [isSubmittingOrganize, setIsSubmittingOrganize] = useState(false);
  const [organizeSuccessMsg, setOrganizeSuccessMsg] = useState<string | null>(null);

  // Quick edit modal
  const [editingItem, setEditingItem] = useState<InboxItem | null>(null);

  // Unorganized items count
  const unorganizedCount = useMemo(() => {
    return inboxItems.filter(i => !i.is_organized && !i.is_trash && !i.is_archived).length;
  }, [inboxItems]);

  const stats = useMemo(() => {
    const active = inboxItems.filter(i => !i.is_trash);
    return {
      total: active.length,
      unorganized: active.filter(i => !i.is_organized && !i.is_archived).length,
      organized: active.filter(i => i.is_organized).length,
      tasks: active.filter(i => i.type === 'task').length,
      ideas: active.filter(i => i.type === 'idea' || i.type === 'research_idea').length,
      links: active.filter(i => i.type === 'link').length,
    };
  }, [inboxItems]);

  const filteredItems = useMemo(() => {
    return inboxItems.filter(item => {
      if (item.is_trash) return false;

      // Tab filter
      if (selectedTab === 'unorganized') {
        if (item.is_organized || item.is_archived) return false;
      } else if (selectedTab === 'organized') {
        if (!item.is_organized) return false;
      } else if (selectedTab === 'archived') {
        if (!item.is_archived) return false;
      }

      // Type filter
      if (selectedType !== 'all' && item.type !== selectedType) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchContent = item.content.toLowerCase().includes(q);
        const matchTitle = (item.title || '').toLowerCase().includes(q);
        const matchTags = (item.tags || []).some(t => t.toLowerCase().includes(q));
        const matchType = item.type.toLowerCase().includes(q);
        if (!matchContent && !matchTitle && !matchTags && !matchType) return false;
      }

      return true;
    });
  }, [inboxItems, selectedTab, selectedType, searchQuery]);

  const handleToggleComplete = async (item: InboxItem) => {
    await updateInboxItem(item.id, {
      is_completed: !item.is_completed,
      updated_at: new Date().toISOString(),
    });
  };

  const handleToggleArchive = async (item: InboxItem) => {
    await updateInboxItem(item.id, {
      is_archived: !item.is_archived,
      updated_at: new Date().toISOString(),
    });
  };

  const handleDelete = async (id: string) => {
    await deleteInboxItem(id, false); // soft-delete to trash
  };

  const startOrganize = (item: InboxItem) => {
    setOrganizingItem(item);
    setOrganizeNoteTitle(item.title || item.content.slice(0, 40));
    setTargetDate(new Date().toISOString().split('T')[0]);
    if (goals.length > 0) setTargetGoalId(goals[0].id);
    if (researchPapers.length > 0) setTargetPaperId(researchPapers[0].id);
    
    // Choose sensible default conversion based on type
    if (item.type === 'task' || item.type === 'reminder') {
      setOrganizeTarget('daily_task');
    } else if (item.type === 'research_idea') {
      setOrganizeTarget('paper_note');
    } else if (item.type === 'vocabulary') {
      setOrganizeTarget('vocabulary');
    } else if (item.type === 'idea') {
      setOrganizeTarget('vault_note');
    } else {
      setOrganizeTarget('daily_task');
    }
  };

  const executeOrganize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizingItem) return;

    setIsSubmittingOrganize(true);
    try {
      if (organizeTarget === 'daily_task') {
        // Find or create daily page for targetDate
        const dailyPage = pages.find(p => p.page_type === 'daily' && p.date === targetDate && !p.is_deleted);

        // Add task into Daily Checklist Block or create block
        const targetPage = dailyPage || pages.find(p => p.page_type === 'daily' && !p.is_deleted) || pages[0];
        if (targetPage) {
          const blocks = await storage.getBlocksByPageId(targetPage.id);
          const checkBlock = blocks.find((b: any) => b.type === 'checklist');
          if (checkBlock) {
            const content = (checkBlock.content as ChecklistBlockContent) || { items: [] };
            const newItems = [
              ...(content.items || []),
              {
                id: generateId(),
                text: organizingItem.title ? `${organizingItem.title}: ${organizingItem.content}` : organizingItem.content,
                completed: Boolean(organizingItem.is_completed),
                priority: organizingItem.priority || 'medium'
              }
            ];
            await storage.saveBlock({
              ...checkBlock,
              content: { ...content, items: newItems },
              updated_at: new Date().toISOString(),
            });
          }
        }
      } else if (organizeTarget === 'goal_task') {
        if (targetGoalId) {
          await saveGoalTask({
            id: generateId(),
            goal_id: targetGoalId,
            milestone_id: targetMilestoneId || null,
            title: organizingItem.title || organizingItem.content,
            notes: organizingItem.content,
            is_completed: Boolean(organizingItem.is_completed),
            priority: organizingItem.priority || 'medium',
            due_date: organizingItem.due_date || null,
            position: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
      } else if (organizeTarget === 'vault_note') {
        await saveKnowledgeItem({
          id: generateId(),
          title: organizeNoteTitle || organizingItem.content.slice(0, 30),
          category: targetVaultCategory,
          type: 'note',
          tags: organizingItem.tags || [],
          content: `<p>${organizingItem.content.replace(/\n/g, '<br/>')}</p>`,
          summary: organizingItem.content.slice(0, 100),
          is_favorite: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      } else if (organizeTarget === 'paper_note') {
        if (targetPaperId) {
          const paper = researchPapers.find(p => p.id === targetPaperId);
          if (paper) {
            const extraNote = `\n\n[Captured Note ${new Date().toLocaleDateString()}]:\n${organizingItem.content}`;
            await updateResearchPaper(paper.id, {
              notes: (paper.notes || '') + extraNote,
            });
          }
        } else {
          // Create new research paper idea entry
          await saveResearchPaper({
            id: generateId(),
            title: organizeNoteTitle || organizingItem.content.slice(0, 40),
            research_area: 'General',
            status: 'to_read',
            priority: organizingItem.priority || 'medium',
            reading_progress: 0,
            notes: organizingItem.content,
            tags: organizingItem.tags || ['idea'],
            url: organizingItem.url || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
      } else if (organizeTarget === 'vocabulary') {
        const word = organizingItem.title || organizingItem.content.split(/[:\-\n]/)[0].trim();
        const meaning = organizingItem.title ? organizingItem.content : (organizingItem.content.split(/[:\-\n]/).slice(1).join(' ').trim() || 'Saved from Inbox');
        
        await saveVocabularyItem({
          id: generateId(),
          word: word || 'New Term',
          meaning: meaning || 'Definition needed',
          category: 'General',
          tags: organizingItem.tags || [],
          source_type: 'custom',
          source_title: 'Inbox',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      // Mark Inbox Item as Organized persistently
      await organizeInboxItem(organizingItem.id, organizeTarget);

      setOrganizeSuccessMsg('Item organized successfully!');
      setTimeout(() => {
        setIsSubmittingOrganize(false);
        setOrganizingItem(null);
        setOrganizeSuccessMsg(null);
      }, 500);
    } catch (err) {
      console.error('Error organizing inbox item:', err);
      setIsSubmittingOrganize(false);
    }
  };

  const getTypeBadge = (type: InboxItemType) => {
    switch (type) {
      case 'task':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">✅ Task</span>;
      case 'idea':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">💡 Idea</span>;
      case 'research_idea':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">🔬 Research</span>;
      case 'link':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">🔗 Link</span>;
      case 'reminder':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">⏰ Reminder</span>;
      case 'vocabulary':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">📖 Vocab</span>;
      case 'someday':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">🌱 Someday</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">📝 Note</span>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-color)]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif-aesthetic text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
              Inbox
            </h1>
            {unorganizedCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[var(--accent)] text-[var(--accent-contrast)] shadow-xs animate-pulse">
                {unorganizedCount}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
            Capture it now. Organize it later.
          </p>
        </div>

        {/* Quick Capture Primary Button */}
        <button
          onClick={() => setIsQuickCaptureOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--accent)] hover:opacity-90 text-[var(--accent-contrast)] text-sm font-semibold shadow-xs transition-all cursor-pointer group"
        >
          <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-200" />
          <span>+ Quick Capture</span>
          <kbd className="hidden sm:inline-block font-mono text-[10px] px-1.5 py-0.5 rounded bg-black/15 text-[var(--accent-contrast)]/90 ml-1">
            ⌘⇧Space
          </kbd>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-xl bg-[var(--bg-paper)] border border-[var(--border-color)] shadow-2xs">
          <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider">Unorganized</p>
          <p className="text-xl font-bold font-serif-aesthetic text-[var(--accent)] mt-1">{stats.unorganized}</p>
        </div>
        <div className="p-3.5 rounded-xl bg-[var(--bg-paper)] border border-[var(--border-color)] shadow-2xs">
          <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider">Organized</p>
          <p className="text-xl font-bold font-serif-aesthetic text-emerald-600 dark:text-emerald-400 mt-1">{stats.organized}</p>
        </div>
        <div className="p-3.5 rounded-xl bg-[var(--bg-paper)] border border-[var(--border-color)] shadow-2xs">
          <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider">Tasks</p>
          <p className="text-xl font-bold font-serif-aesthetic text-blue-600 dark:text-blue-400 mt-1">{stats.tasks}</p>
        </div>
        <div className="p-3.5 rounded-xl bg-[var(--bg-paper)] border border-[var(--border-color)] shadow-2xs">
          <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider">Ideas</p>
          <p className="text-xl font-bold font-serif-aesthetic text-purple-600 dark:text-purple-400 mt-1">{stats.ideas}</p>
        </div>
        <div className="p-3.5 rounded-xl bg-[var(--bg-paper)] border border-[var(--border-color)] shadow-2xs">
          <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider">Links</p>
          <p className="text-xl font-bold font-serif-aesthetic text-cyan-600 dark:text-cyan-400 mt-1">{stats.links}</p>
        </div>
        <div className="p-3.5 rounded-xl bg-[var(--bg-paper)] border border-[var(--border-color)] shadow-2xs">
          <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider">Total Stored</p>
          <p className="text-xl font-bold font-serif-aesthetic text-[var(--text-primary)] mt-1">{stats.total}</p>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Tab navigation */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--bg-paper-hover)] border border-[var(--border-color)] overflow-x-auto">
          <button
            onClick={() => setSelectedTab('unorganized')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              selectedTab === 'unorganized'
                ? 'bg-[var(--bg-paper)] text-[var(--accent)] font-semibold shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Unorganized ({stats.unorganized})
          </button>
          <button
            onClick={() => setSelectedTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              selectedTab === 'all'
                ? 'bg-[var(--bg-paper)] text-[var(--accent)] font-semibold shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            All Items ({stats.total})
          </button>
          <button
            onClick={() => setSelectedTab('organized')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              selectedTab === 'organized'
                ? 'bg-[var(--bg-paper)] text-[var(--accent)] font-semibold shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Organized ({stats.organized})
          </button>
          <button
            onClick={() => setSelectedTab('archived')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              selectedTab === 'archived'
                ? 'bg-[var(--bg-paper)] text-[var(--accent)] font-semibold shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Archived
          </button>
        </div>

        {/* Type and search filter */}
        <div className="flex items-center gap-2">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-paper)] text-xs text-[var(--text-secondary)] focus:outline-hidden"
          >
            <option value="all">All Types</option>
            <option value="note">Notes</option>
            <option value="task">Tasks</option>
            <option value="idea">Ideas</option>
            <option value="research_idea">Research Ideas</option>
            <option value="link">Links</option>
            <option value="reminder">Reminders</option>
            <option value="vocabulary">Vocabulary</option>
            <option value="someday">Someday</option>
          </select>

          <div className="relative flex-1 md:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search inbox..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-paper)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)] placeholder:text-[var(--text-muted)]"
            />
          </div>
        </div>
      </div>

      {/* Items List */}
      {filteredItems.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--bg-paper)]/40">
          <div className="w-12 h-12 rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center mx-auto mb-3">
            <InboxIcon className="w-6 h-6 opacity-70" />
          </div>
          <h3 className="font-serif-aesthetic font-semibold text-base text-[var(--text-primary)]">
            {searchQuery ? 'No matching items found' : selectedTab === 'unorganized' ? 'Inbox is clear!' : 'No items in this view'}
          </h3>
          <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto mt-1">
            {searchQuery ? 'Try adjusting your search terms or filters.' : 'Use Quick Capture whenever inspiration strikes or you need to remember something fast.'}
          </p>
          <button
            onClick={() => setIsQuickCaptureOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] text-xs font-semibold mt-4 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Capture Something</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`p-4 rounded-xl border bg-[var(--bg-paper)] transition-all shadow-2xs hover:shadow-xs group ${
                item.is_completed ? 'opacity-70 bg-[var(--bg-paper-hover)]/30' : ''
              } ${item.is_organized ? 'border-emerald-500/20' : 'border-[var(--border-color)]'}`}
            >
              <div className="flex items-start justify-between gap-3">
                {/* Checkbox for tasks / reminders */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {(item.type === 'task' || item.type === 'reminder') ? (
                    <button
                      onClick={() => handleToggleComplete(item)}
                      className="mt-0.5 text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors shrink-0"
                    >
                      {item.is_completed ? (
                        <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 fill-emerald-100 dark:fill-emerald-950" />
                      ) : (
                        <Circle className="w-4 h-4" />
                      )}
                    </button>
                  ) : (
                    <div className="mt-0.5 shrink-0">
                      {getTypeBadge(item.type)}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    {item.title && (
                      <h4 className={`text-sm font-semibold text-[var(--text-primary)] leading-tight mb-1 ${item.is_completed ? 'line-through text-[var(--text-muted)]' : ''}`}>
                        {item.title}
                      </h4>
                    )}

                    <p className={`text-xs sm:text-sm text-[var(--text-secondary)] whitespace-pre-wrap break-words leading-relaxed font-sans ${item.is_completed ? 'line-through text-[var(--text-muted)]' : ''}`}>
                      {item.content}
                    </p>

                    {/* Meta tags, due date, links */}
                    <div className="flex flex-wrap items-center gap-2 mt-2.5 text-[11px] text-[var(--text-muted)]">
                      {(item.type === 'task' || item.type === 'reminder') && getTypeBadge(item.type)}

                      {item.due_date && (
                        <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md font-medium">
                          <Calendar className="w-3 h-3" />
                          <span>{item.due_date}</span>
                        </span>
                      )}

                      {item.priority === 'high' && (
                        <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 bg-red-500/10 px-2 py-0.5 rounded-md font-medium">
                          <Flag className="w-3 h-3" />
                          <span>High Priority</span>
                        </span>
                      )}

                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[var(--accent)] hover:underline max-w-[180px] truncate"
                        >
                          <ExternalLink className="w-3 h-3 shrink-0" />
                          <span className="truncate">{item.url}</span>
                        </a>
                      )}

                      {(item.tags || []).map((tag) => (
                        <span key={tag} className="inline-flex items-center gap-0.5 text-[var(--text-muted)] bg-[var(--bg-paper-hover)] px-1.5 py-0.5 rounded-md">
                          <Tag className="w-2.5 h-2.5" />
                          <span>#{tag}</span>
                        </span>
                      ))}

                      {item.is_organized && (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                          <Check className="w-3 h-3" />
                          <span>Organized {item.organized_into ? `into ${item.organized_into.replace('_', ' ')}` : ''}</span>
                        </span>
                      )}

                      <span>• {new Date(item.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {/* Organize button */}
                  {!item.is_organized && (
                    <button
                      onClick={() => startOrganize(item)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[var(--accent-soft)] hover:bg-[var(--accent)] hover:text-[var(--accent-contrast)] text-[var(--accent)] border border-[var(--accent)]/30 transition-all shadow-2xs"
                      title="Organize into Planner, Goals, Vault, or Paper"
                    >
                      <FolderSync className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Organize</span>
                    </button>
                  )}

                  {/* Quick Edit */}
                  <button
                    onClick={() => setEditingItem(item)}
                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-paper-hover)] transition-colors"
                    title="Edit Item"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  {/* Archive */}
                  <button
                    onClick={() => handleToggleArchive(item)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      item.is_archived 
                        ? 'text-amber-600 dark:text-amber-400 hover:bg-amber-500/10' 
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-paper-hover)]'
                    }`}
                    title={item.is_archived ? 'Unarchive' : 'Archive'}
                  >
                    <Archive className="w-3.5 h-3.5" />
                  </button>

                  {/* Trash */}
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Move to Trash"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Global Quick Capture Modal */}
      <QuickCaptureModal
        isOpen={isQuickCaptureOpen}
        onClose={() => setIsQuickCaptureOpen(false)}
      />

      {/* Organize Modal Dialog */}
      {organizingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-[var(--bg-paper)] rounded-2xl border border-[var(--border-strong)] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border-color)] bg-[var(--bg-paper-hover)]/50">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[var(--accent)] text-[var(--accent-contrast)] flex items-center justify-center font-bold text-xs">
                  <FolderSync className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif-aesthetic font-semibold text-sm text-[var(--text-primary)]">
                    Organize Capture
                  </h3>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Convert into structured Planora record
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOrganizingItem(null)}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={executeOrganize} className="p-5 space-y-4">
              {/* Item Preview */}
              <div className="p-3 rounded-xl bg-[var(--bg-paper-subtle)] border border-[var(--border-color)] text-xs space-y-1">
                <span className="font-medium text-[var(--text-muted)] block">Original Capture:</span>
                <p className="text-[var(--text-primary)] italic">&ldquo;{organizingItem.content}&rdquo;</p>
              </div>

              {/* Destination selector */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                  Convert Into
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'daily_task', label: 'Daily Task', icon: '📅' },
                    { id: 'goal_task', label: 'Goal Task', icon: '🎯' },
                    { id: 'vault_note', label: 'Knowledge Vault', icon: '📚' },
                    { id: 'paper_note', label: 'Research Paper', icon: '📑' },
                    { id: 'vocabulary', label: 'Vocabulary', icon: '📖' },
                    { id: 'journal', label: 'Journal Entry', icon: '✍️' },
                  ].map((dst) => (
                    <button
                      key={dst.id}
                      type="button"
                      onClick={() => setOrganizeTarget(dst.id as any)}
                      className={`p-2.5 rounded-xl border text-left flex items-center gap-2 text-xs font-medium transition-all ${
                        organizeTarget === dst.id
                          ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] font-semibold shadow-xs'
                          : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-paper-hover)]'
                      }`}
                    >
                      <span className="text-base">{dst.icon}</span>
                      <span>{dst.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Destination Specific Options */}
              {organizeTarget === 'daily_task' && (
                <div className="space-y-2 pt-2 border-t border-[var(--border-color)]">
                  <label className="block text-xs font-medium text-[var(--text-secondary)]">
                    Planner Date
                  </label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-paper)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
                    required
                  />
                  <p className="text-[11px] text-[var(--text-muted)]">
                    This will add a checklist task item to your planner for {targetDate}.
                  </p>
                </div>
              )}

              {organizeTarget === 'goal_task' && (
                <div className="space-y-2 pt-2 border-t border-[var(--border-color)]">
                  <label className="block text-xs font-medium text-[var(--text-secondary)]">
                    Select Target Goal
                  </label>
                  <select
                    value={targetGoalId}
                    onChange={(e) => setTargetGoalId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-paper)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
                    required
                  >
                    <option value="">Choose a Goal...</option>
                    {goals.filter(g => !g.is_trash).map((g) => (
                      <option key={g.id} value={g.id}>{g.title} ({g.category})</option>
                    ))}
                  </select>

                  {targetGoalId && (
                    <div>
                      <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
                        Optional Milestone:
                      </label>
                      <select
                        value={targetMilestoneId}
                        onChange={(e) => setTargetMilestoneId(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-paper)] text-xs text-[var(--text-primary)] focus:outline-hidden"
                      >
                        <option value="">No specific milestone</option>
                        {goalMilestones.filter(m => m.goal_id === targetGoalId).map(m => (
                          <option key={m.id} value={m.id}>{m.title}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {organizeTarget === 'vault_note' && (
                <div className="space-y-2 pt-2 border-t border-[var(--border-color)]">
                  <label className="block text-xs font-medium text-[var(--text-secondary)]">
                    Note Title & Category
                  </label>
                  <input
                    type="text"
                    value={organizeNoteTitle}
                    onChange={(e) => setOrganizeNoteTitle(e.target.value)}
                    placeholder="Note Title"
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-paper)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
                    required
                  />
                  <input
                    type="text"
                    value={targetVaultCategory}
                    onChange={(e) => setTargetVaultCategory(e.target.value)}
                    placeholder="Category (e.g. Research, Tech, Philosophy)"
                    className="w-full px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-paper)] text-xs text-[var(--text-primary)] focus:outline-hidden"
                  />
                </div>
              )}

              {organizeTarget === 'paper_note' && (
                <div className="space-y-2 pt-2 border-t border-[var(--border-color)]">
                  <label className="block text-xs font-medium text-[var(--text-secondary)]">
                    Attach to Existing Paper (or leave blank to create new idea)
                  </label>
                  <select
                    value={targetPaperId}
                    onChange={(e) => setTargetPaperId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-paper)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
                  >
                    <option value="">Create as a new Research Paper / Idea</option>
                    {researchPapers.filter(p => !p.is_trash).map((p) => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setOrganizingItem(null)}
                  className="px-3.5 py-1.5 rounded-xl border border-[var(--border-color)] hover:bg-[var(--bg-paper-hover)] text-xs font-medium text-[var(--text-secondary)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingOrganize}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[var(--accent)] hover:opacity-90 text-[var(--accent-contrast)] text-xs font-semibold shadow-xs transition-all"
                >
                  {organizeSuccessMsg ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>{organizeSuccessMsg}</span>
                    </>
                  ) : (
                    <>
                      <ArrowRight className="w-3.5 h-3.5" />
                      <span>Convert & Organize</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-[var(--bg-paper)] rounded-2xl border border-[var(--border-strong)] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border-color)]">
              <h3 className="font-serif-aesthetic font-semibold text-sm text-[var(--text-primary)]">
                Edit Inbox Item
              </h3>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await updateInboxItem(editingItem.id, {
                  title: editingItem.title,
                  content: editingItem.content,
                  type: editingItem.type,
                  priority: editingItem.priority,
                  due_date: editingItem.due_date,
                  url: editingItem.url,
                  updated_at: new Date().toISOString(),
                });
                setEditingItem(null);
              }}
              className="p-5 space-y-4"
            >
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={editingItem.title || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-paper)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Content
                </label>
                <textarea
                  rows={4}
                  value={editingItem.content}
                  onChange={(e) => setEditingItem({ ...editingItem, content: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-paper)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--accent)] resize-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Type
                  </label>
                  <select
                    value={editingItem.type}
                    onChange={(e) => setEditingItem({ ...editingItem, type: e.target.value as InboxItemType })}
                    className="w-full px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-paper)] text-xs text-[var(--text-primary)]"
                  >
                    <option value="note">Note</option>
                    <option value="task">Task</option>
                    <option value="idea">Idea</option>
                    <option value="research_idea">Research Idea</option>
                    <option value="link">Link</option>
                    <option value="reminder">Reminder</option>
                    <option value="vocabulary">Vocabulary</option>
                    <option value="someday">Someday</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Priority
                  </label>
                  <select
                    value={editingItem.priority || 'medium'}
                    onChange={(e) => setEditingItem({ ...editingItem, priority: e.target.value as InboxItemPriority })}
                    className="w-full px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-paper)] text-xs text-[var(--text-primary)]"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-3.5 py-1.5 rounded-xl border border-[var(--border-color)] hover:bg-[var(--bg-paper-hover)] text-xs font-medium text-[var(--text-secondary)]"
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
