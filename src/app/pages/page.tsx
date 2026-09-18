'use client';

import React, { useState } from 'react';
import Link from 'next/navigation';
import { usePlanner } from '@/lib/storage';
import { PageType } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { NewPageModal } from '@/components/modals/NewPageModal';
import { 
  Plus, 
  Search, 
  Star, 
  Copy, 
  Trash2, 
  Filter, 
  Calendar,
  Sparkles,
  FileText
} from 'lucide-react';

export default function AllPagesView() {
  const { pages, updatePage, duplicatePage, moveToTrash } = usePlanner();
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewPageModalOpen, setIsNewPageModalOpen] = useState(false);

  const filterTabs = [
    { id: 'all', label: 'All Pages' },
    { id: 'favorites', label: 'Favorites' },
    { id: 'daily', label: 'Daily Planners' },
    { id: 'habit', label: 'Habit Trackers' },
    { id: 'study', label: 'Study & Research' },
    { id: 'challenge', label: 'Challenges' },
    { id: 'checklist', label: 'Checklists' },
    { id: 'journal', label: 'Journals & Notes' },
  ];

  const filteredPages = pages.filter((p) => {
    if (filterType === 'favorites' && !p.is_favorite) return false;
    if (filterType !== 'all' && filterType !== 'favorites' && p.page_type !== filterType) {
      return false;
    }
    if (searchQuery.trim()) {
      return p.title.toLowerCase().includes(searchQuery.toLowerCase().trim());
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-color)] pb-4">
        <div>
          <h2 className="font-serif-aesthetic text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
            Planner Sanctuary & Pages
          </h2>
          <p className="font-serif-aesthetic italic text-xs text-[var(--text-secondary)] mt-0.5">
            Organize, manage, and create unlimited custom planners, habits, and journals
          </p>
        </div>

        <button
          onClick={() => setIsNewPageModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-contrast)] text-xs font-semibold shadow-xs transition-transform active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>New Page</span>
        </button>
      </div>

      {/* Search & Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search pages by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-[var(--bg-paper)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                filterType === tab.id
                  ? 'bg-[var(--accent)] text-[var(--accent-contrast)] shadow-2xs'
                  : 'bg-[var(--bg-paper)] text-[var(--text-secondary)] border border-[var(--border-color)] hover:bg-[var(--bg-paper-hover)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Pages Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPages.map((p) => (
          <div
            key={p.id}
            className="journal-paper p-4 flex flex-col justify-between hover:shadow-md transition-all group border border-[var(--border-color)] hover:border-[var(--border-strong)]"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-2xl p-1.5 rounded-xl bg-[var(--accent-soft)]">
                  {p.icon}
                </span>

                <div className="flex items-center gap-1">
                  {/* Favorite Toggle */}
                  <button
                    onClick={() => updatePage(p.id, { is_favorite: !p.is_favorite })}
                    className={`p-1.5 rounded-lg hover:bg-[var(--bg-paper-hover)] transition-colors ${
                      p.is_favorite ? 'text-amber-500 fill-amber-500' : 'text-[var(--text-muted)]'
                    }`}
                    title="Toggle Favorite"
                  >
                    <Star className={`w-4 h-4 ${p.is_favorite ? 'fill-current' : ''}`} />
                  </button>

                  {/* Duplicate */}
                  <button
                    onClick={() => duplicatePage(p.id)}
                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-paper-hover)] opacity-0 group-hover:opacity-100 transition-all"
                    title="Duplicate Page"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  {/* Move to Trash */}
                  <button
                    onClick={() => moveToTrash(p.id)}
                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 opacity-0 group-hover:opacity-100 transition-all"
                    title="Move to Trash"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <a
                href={`/pages/${p.id}`}
                className="font-serif-aesthetic font-semibold text-base text-[var(--text-primary)] hover:text-[var(--accent)] line-clamp-1 block transition-colors"
              >
                {p.title}
              </a>

              <p className="text-xs text-[var(--text-secondary)] capitalize mt-1 flex items-center gap-1.5">
                <span>{p.page_type} planner</span>
                {p.date && (
                  <>
                    <span>•</span>
                    <span className="text-[11px] font-mono text-[var(--text-muted)]">
                      {p.date}
                    </span>
                  </>
                )}
              </p>
            </div>

            <div className="flex items-center justify-between pt-4 mt-4 border-t border-[var(--border-color)] text-[11px] text-[var(--text-muted)]">
              <span>{formatDate(p.updated_at, { month: 'short', day: 'numeric' })}</span>
              <a
                href={`/pages/${p.id}`}
                className="text-[var(--accent)] font-medium hover:underline text-xs"
              >
                Open →
              </a>
            </div>
          </div>
        ))}
      </div>

      {filteredPages.length === 0 && (
        <div className="py-16 text-center journal-paper p-8 space-y-3">
          <FileText className="w-8 h-8 text-[var(--text-muted)] mx-auto" />
          <h4 className="font-serif-aesthetic text-base font-semibold text-[var(--text-primary)]">
            No pages found
          </h4>
          <p className="text-xs text-[var(--text-secondary)]">
            {searchQuery
              ? `No pages matched "${searchQuery}" in this filter.`
              : 'You have no pages in this section yet.'}
          </p>
          <button
            onClick={() => setIsNewPageModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] text-xs font-semibold hover:bg-[var(--border-strong)] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Page</span>
          </button>
        </div>
      )}

      <NewPageModal
        isOpen={isNewPageModalOpen}
        onClose={() => setIsNewPageModalOpen(false)}
      />
    </div>
  );
}
