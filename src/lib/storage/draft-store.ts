import { PageDraft, PageBlock } from '../types';

const DRAFT_PREFIX = 'planora_draft_';
const DRAFT_INDEX_KEY = 'planora_draft_index';

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function getDraftIndex(): string[] {
  if (!isBrowser()) return [];
  try {
    const data = localStorage.getItem(DRAFT_INDEX_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function updateDraftIndex(pageId: string, action: 'add' | 'remove'): void {
  if (!isBrowser()) return;
  try {
    const current = new Set(getDraftIndex());
    if (action === 'add') current.add(pageId);
    else current.delete(pageId);
    localStorage.setItem(DRAFT_INDEX_KEY, JSON.stringify(Array.from(current)));
  } catch (e) {
    console.error('Failed to update draft index:', e);
  }
}

export const draftStore = {
  saveDraft(draft: PageDraft): void {
    if (!isBrowser()) return;
    try {
      const key = `${DRAFT_PREFIX}${draft.pageId}`;
      localStorage.setItem(key, JSON.stringify(draft));
      updateDraftIndex(draft.pageId, 'add');
    } catch (e) {
      console.warn('LocalStorage draft backup write failed:', e);
    }
  },

  getDraft(pageId: string): PageDraft | null {
    if (!isBrowser()) return null;
    try {
      const key = `${DRAFT_PREFIX}${pageId}`;
      const data = localStorage.getItem(key);
      if (!data) return null;
      return JSON.parse(data) as PageDraft;
    } catch (e) {
      console.error('Failed to read draft from localStorage:', e);
      return null;
    }
  },

  clearDraft(pageId: string): void {
    if (!isBrowser()) return;
    try {
      const key = `${DRAFT_PREFIX}${pageId}`;
      localStorage.removeItem(key);
      updateDraftIndex(pageId, 'remove');
    } catch (e) {
      console.error('Failed to clear draft:', e);
    }
  },

  hasNewerDraft(pageId: string, savedUpdatedAt?: string | number | null): boolean {
    const draft = this.getDraft(pageId);
    if (!draft) return false;
    if (!savedUpdatedAt) return true;

    const savedTimestamp = typeof savedUpdatedAt === 'number' 
      ? savedUpdatedAt 
      : new Date(savedUpdatedAt).getTime();

    if (isNaN(savedTimestamp)) return true;

    // Local draft is newer if its timestamp is strictly greater by > 500ms
    return draft.updatedAt > savedTimestamp + 500;
  }
};
