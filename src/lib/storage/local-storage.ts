import { IPlannerStorage } from './storage-interface';
import { 
  PlannerPage, 
  PageBlock, 
  UserProfile, 
  PlannerBackup,
  BackupImportResult,
  PageType,
  WalkSession,
  LearningSprint,
  KnowledgeItem,
  VocabularyItem,
  InboxItem,
  MonthlyReview,
  FocusSession,
  ResearchPaper,
  WeeklyReview,
  Goal,
  GoalMilestone,
  GoalTask
} from '../types';
import { DEFAULT_PROFILE, INITIAL_PAGES, INITIAL_BLOCKS } from './seed-data';
import { generateId } from '../utils';
import { generateTemplateBlocks, getDefaultBlockContent } from './block-defaults';

const STORAGE_KEYS = {
  PROFILE: 'planora_user_profile',
  PAGES: 'planora_planner_pages',
  BLOCKS: 'planora_page_blocks',
  LOCKED: 'planora_session_locked',
  WALK_SESSIONS: 'planora_walk_sessions',
  WALK_PENDING_SYNC: 'planora_walk_pending_sync',
  LEARNING_SPRINTS: 'planora_learning_sprints',
  KNOWLEDGE_ITEMS: 'planora_knowledge_items',
  VOCABULARY_ITEMS: 'planora_vocabulary_items',
  LEARNING_PENDING_SYNC: 'planora_learning_pending_sync',
  INBOX_ITEMS: 'planora_inbox_items',
  INBOX_PENDING_SYNC: 'planora_inbox_pending_sync',
  MONTHLY_REVIEWS: 'planora_monthly_reviews',
  MONTHLY_PENDING_SYNC: 'planora_monthly_pending_sync',
  FOCUS_SESSIONS: 'planora_focus_sessions',
  RESEARCH_PAPERS: 'planora_research_papers',
  FOCUS_PENDING_SYNC: 'planora_focus_pending_sync',
  PAPERS_PENDING_SYNC: 'planora_papers_pending_sync',
  WEEKLY_REVIEWS: 'planora_weekly_reviews',
  WEEKLY_PENDING_SYNC: 'planora_weekly_pending_sync',
  GOALS: 'planora_goals',
  GOAL_MILESTONES: 'planora_goal_milestones',
  GOAL_TASKS: 'planora_goal_tasks',
  GOALS_PENDING_SYNC: 'planora_goals_pending_sync',
};

export class LocalPlannerStorage implements IPlannerStorage {
  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  }

  private getStored<T>(key: string, fallback: T): T {
    if (!this.isBrowser()) return fallback;
    try {
      const item = localStorage.getItem(key);
      if (!item) return fallback;
      return JSON.parse(item);
    } catch (e) {
      console.error(`Error reading ${key} from localStorage:`, e);
      return fallback;
    }
  }

  private setStored<T>(key: string, value: T): void {
    if (!this.isBrowser()) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`Error writing ${key} to localStorage:`, e);
    }
  }

  // Ensure initial data exists
  private ensureInitialized(): void {
    if (!this.isBrowser()) return;
    if (!localStorage.getItem(STORAGE_KEYS.PAGES)) {
      this.setStored(STORAGE_KEYS.PAGES, INITIAL_PAGES);
      this.setStored(STORAGE_KEYS.BLOCKS, INITIAL_BLOCKS);
      this.setStored(STORAGE_KEYS.PROFILE, DEFAULT_PROFILE);
    }
  }

  // Profile & Auth
  async getProfile(): Promise<UserProfile> {
    this.ensureInitialized();
    const profile = this.getStored<UserProfile>(STORAGE_KEYS.PROFILE, DEFAULT_PROFILE);
    const isLocked = this.getStored<boolean>(STORAGE_KEYS.LOCKED, false);
    return { ...profile, isLocked: profile.passcode ? isLocked : false };
  }

  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    const current = await this.getProfile();
    const updated = { ...current, ...updates };
    this.setStored(STORAGE_KEYS.PROFILE, updated);
    return updated;
  }

  async unlockWithPasscode(passcode: string): Promise<boolean> {
    const profile = this.getStored<UserProfile>(STORAGE_KEYS.PROFILE, DEFAULT_PROFILE);
    if (!profile.passcode || profile.passcode === passcode) {
      this.setStored(STORAGE_KEYS.LOCKED, false);
      return true;
    }
    return false;
  }

  async lockSession(): Promise<void> {
    this.setStored(STORAGE_KEYS.LOCKED, true);
  }

  // Pages
  async getPages(includeArchived: boolean = false, includeDeleted: boolean = false): Promise<PlannerPage[]> {
    this.ensureInitialized();
    const pages = this.getStored<PlannerPage[]>(STORAGE_KEYS.PAGES, INITIAL_PAGES);
    return pages
      .filter(p => {
        if (!includeDeleted && p.is_deleted) return false;
        if (includeDeleted && !p.is_deleted) return false;
        if (!includeArchived && p.is_archived) return false;
        return true;
      })
      .sort((a, b) => a.position - b.position || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async getPageById(id: string): Promise<PlannerPage | null> {
    this.ensureInitialized();
    const pages = this.getStored<PlannerPage[]>(STORAGE_KEYS.PAGES, INITIAL_PAGES);
    const decodedId = decodeURIComponent(id);
    return pages.find(p => p.id === id || p.id === decodedId) || null;
  }

  async createPage(params: {
    title: string;
    page_type: PageType;
    icon?: string;
    cover_color?: string;
    date?: string;
    metadata?: Record<string, any>;
  }): Promise<PlannerPage> {
    this.ensureInitialized();
    const pages = this.getStored<PlannerPage[]>(STORAGE_KEYS.PAGES, INITIAL_PAGES);
    const blocks = this.getStored<PageBlock[]>(STORAGE_KEYS.BLOCKS, INITIAL_BLOCKS);

    const newPageId = 'page-' + generateId();
    const now = new Date().toISOString();

    const iconMap: Record<PageType, string> = {
      daily: '✨',
      habit: '🌿',
      study: '📚',
      challenge: '🌸',
      checklist: '📝',
      journal: '📖',
      monthly: '🗓️',
      blank: '📄',
      custom: '💡',
      period: '🌸',
      walk: '🚶‍♀️',
    };

    const newPage: PlannerPage = {
      id: newPageId,
      title: params.title.trim() || 'Untitled Planner',
      icon: params.icon || iconMap[params.page_type] || '📄',
      cover_color: params.cover_color,
      page_type: params.page_type,
      is_favorite: false,
      is_archived: false,
      is_deleted: false,
      date: params.date,
      position: pages.length,
      created_at: now,
      updated_at: now,
      metadata: params.metadata,
    };

    // Generate starter blocks for this template
    const templateBlocks = generateTemplateBlocks(newPageId, params.page_type, params.metadata);

    this.setStored(STORAGE_KEYS.PAGES, [newPage, ...pages]);
    this.setStored(STORAGE_KEYS.BLOCKS, [...blocks, ...templateBlocks]);

    return newPage;
  }

  async updatePage(id: string, updates: Partial<PlannerPage>): Promise<PlannerPage> {
    this.ensureInitialized();
    const pages = this.getStored<PlannerPage[]>(STORAGE_KEYS.PAGES, INITIAL_PAGES);
    const index = pages.findIndex(p => p.id === id);
    if (index === -1) throw new Error(`Page ${id} not found`);

    const updated = {
      ...pages[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    pages[index] = updated;
    this.setStored(STORAGE_KEYS.PAGES, pages);
    return updated;
  }

  async duplicatePage(id: string): Promise<PlannerPage> {
    this.ensureInitialized();
    const pages = this.getStored<PlannerPage[]>(STORAGE_KEYS.PAGES, INITIAL_PAGES);
    const targetPage = pages.find(p => p.id === id);
    if (!targetPage) throw new Error(`Page ${id} not found`);

    const targetBlocks = await this.getBlocksByPageId(id);
    const newPageId = 'page-' + generateId();
    const now = new Date().toISOString();

    const duplicatedPage: PlannerPage = {
      ...targetPage,
      id: newPageId,
      title: `${targetPage.title} (Copy)`,
      created_at: now,
      updated_at: now,
      position: pages.length,
    };

    const duplicatedBlocks: PageBlock[] = targetBlocks.map(b => ({
      ...b,
      id: generateId(),
      page_id: newPageId,
      created_at: now,
      updated_at: now,
    }));

    const allBlocks = this.getStored<PageBlock[]>(STORAGE_KEYS.BLOCKS, INITIAL_BLOCKS);
    this.setStored(STORAGE_KEYS.PAGES, [duplicatedPage, ...pages]);
    this.setStored(STORAGE_KEYS.BLOCKS, [...allBlocks, ...duplicatedBlocks]);

    return duplicatedPage;
  }

  async moveToTrash(id: string): Promise<void> {
    await this.updatePage(id, {
      is_deleted: true,
      deleted_at: new Date().toISOString(),
    });
  }

  async restoreFromTrash(id: string): Promise<void> {
    await this.updatePage(id, {
      is_deleted: false,
      deleted_at: null,
    });
  }

  async permanentlyDeletePage(id: string): Promise<void> {
    this.ensureInitialized();
    const pages = this.getStored<PlannerPage[]>(STORAGE_KEYS.PAGES, INITIAL_PAGES);
    const blocks = this.getStored<PageBlock[]>(STORAGE_KEYS.BLOCKS, INITIAL_BLOCKS);

    this.setStored(STORAGE_KEYS.PAGES, pages.filter(p => p.id !== id));
    this.setStored(STORAGE_KEYS.BLOCKS, blocks.filter(b => b.page_id !== id));
  }

  async emptyTrash(): Promise<void> {
    this.ensureInitialized();
    const pages = this.getStored<PlannerPage[]>(STORAGE_KEYS.PAGES, INITIAL_PAGES);
    const deletedIds = new Set(pages.filter(p => p.is_deleted).map(p => p.id));
    const blocks = this.getStored<PageBlock[]>(STORAGE_KEYS.BLOCKS, INITIAL_BLOCKS);

    this.setStored(STORAGE_KEYS.PAGES, pages.filter(p => !p.is_deleted));
    this.setStored(STORAGE_KEYS.BLOCKS, blocks.filter(b => !deletedIds.has(b.page_id)));
  }

  // Blocks
  async getBlocksByPageId(pageId: string): Promise<PageBlock[]> {
    this.ensureInitialized();
    const blocks = this.getStored<PageBlock[]>(STORAGE_KEYS.BLOCKS, INITIAL_BLOCKS);
    return blocks
      .filter(b => b.page_id === pageId)
      .sort((a, b) => a.position - b.position);
  }

  async saveBlock(block: PageBlock): Promise<PageBlock> {
    this.ensureInitialized();
    const blocks = this.getStored<PageBlock[]>(STORAGE_KEYS.BLOCKS, INITIAL_BLOCKS);
    const index = blocks.findIndex(b => b.id === block.id);
    const now = new Date().toISOString();

    if (index >= 0) {
      blocks[index] = { ...block, updated_at: now };
    } else {
      blocks.push({ ...block, created_at: now, updated_at: now });
    }

    this.setStored(STORAGE_KEYS.BLOCKS, blocks);
    return block;
  }

  async createBlock(pageId: string, type: PageBlock['type'], position?: number): Promise<PageBlock> {
    this.ensureInitialized();
    const existing = await this.getBlocksByPageId(pageId);
    const now = new Date().toISOString();

    const newBlock: PageBlock = {
      id: generateId(),
      page_id: pageId,
      type,
      content: getDefaultBlockContent(type),
      position: position !== undefined ? position : existing.length,
      created_at: now,
      updated_at: now,
    };

    const allBlocks = this.getStored<PageBlock[]>(STORAGE_KEYS.BLOCKS, INITIAL_BLOCKS);
    this.setStored(STORAGE_KEYS.BLOCKS, [...allBlocks, newBlock]);
    return newBlock;
  }

  async updateBlock(id: string, updates: Partial<PageBlock>): Promise<PageBlock> {
    this.ensureInitialized();
    const blocks = this.getStored<PageBlock[]>(STORAGE_KEYS.BLOCKS, INITIAL_BLOCKS);
    const index = blocks.findIndex(b => b.id === id);
    if (index === -1) throw new Error(`Block ${id} not found`);

    const updated = {
      ...blocks[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    blocks[index] = updated;
    this.setStored(STORAGE_KEYS.BLOCKS, blocks);
    return updated;
  }

  async deleteBlock(id: string): Promise<void> {
    this.ensureInitialized();
    const blocks = this.getStored<PageBlock[]>(STORAGE_KEYS.BLOCKS, INITIAL_BLOCKS);
    this.setStored(STORAGE_KEYS.BLOCKS, blocks.filter(b => b.id !== id));
  }

  async reorderBlocks(pageId: string, orderedBlockIds: string[]): Promise<void> {
    this.ensureInitialized();
    const blocks = this.getStored<PageBlock[]>(STORAGE_KEYS.BLOCKS, INITIAL_BLOCKS);
    const pageBlocksMap = new Map(blocks.filter(b => b.page_id === pageId).map(b => [b.id, b]));
    const otherBlocks = blocks.filter(b => b.page_id !== pageId);

    const updatedPageBlocks: PageBlock[] = [];
    orderedBlockIds.forEach((id, index) => {
      const block = pageBlocksMap.get(id);
      if (block) {
        updatedPageBlocks.push({ ...block, position: index });
        pageBlocksMap.delete(id);
      }
    });

    // append any remaining
    pageBlocksMap.forEach(block => {
      updatedPageBlocks.push({ ...block, position: updatedPageBlocks.length });
    });

    this.setStored(STORAGE_KEYS.BLOCKS, [...otherBlocks, ...updatedPageBlocks]);
  }

  // Walk Sessions (Durable Storage + Recovery)
  async getWalkSessions(params?: { pageId?: string; startDate?: string; endDate?: string }): Promise<WalkSession[]> {
    this.ensureInitialized();
    let sessions = this.getStored<WalkSession[]>(STORAGE_KEYS.WALK_SESSIONS, []);

    // ONE-TIME RECOVERY / MIGRATION: check if any sessions exist in legacy global walk key or block contents
    let needPersist = false;
    const existingIds = new Set(sessions.map(s => s.id));

    if (this.isBrowser()) {
      try {
        const legacyGlobal = localStorage.getItem('planora_global_walk_tracker');
        if (legacyGlobal) {
          const parsed = JSON.parse(legacyGlobal);
          if (Array.isArray(parsed.sessions)) {
            for (const s of parsed.sessions) {
              if (s && s.id && !existingIds.has(s.id)) {
                sessions.push(s);
                existingIds.add(s.id);
                needPersist = true;
              }
            }
          }
        }
      } catch (e) {
        console.error('Error recovering legacy global walk sessions:', e);
      }

      // Also check blocks in storage
      try {
        const blocks = this.getStored<PageBlock[]>(STORAGE_KEYS.BLOCKS, []);
        for (const b of blocks) {
          if (b.type === 'walk_tracker' && b.content && Array.isArray((b.content as any).sessions)) {
            for (const s of (b.content as any).sessions) {
              if (s && s.id && !existingIds.has(s.id)) {
                sessions.push({ ...s, page_id: s.page_id || b.page_id });
                existingIds.add(s.id);
                needPersist = true;
              }
            }
          }
        }
      } catch (e) {
        console.error('Error recovering block walk sessions:', e);
      }
    }

    if (needPersist) {
      this.setStored(STORAGE_KEYS.WALK_SESSIONS, sessions);
    }

    // Filter
    let filtered = sessions;
    if (params?.pageId) {
      filtered = filtered.filter(s => s.page_id === params.pageId || (s as any).tracker_id === params.pageId);
    }
    if (params?.startDate) {
      filtered = filtered.filter(s => s.date >= params.startDate!);
    }
    if (params?.endDate) {
      filtered = filtered.filter(s => s.date <= params.endDate!);
    }

    return filtered.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
  }

  async saveWalkSession(session: WalkSession): Promise<WalkSession> {
    this.ensureInitialized();
    const sessions = this.getStored<WalkSession[]>(STORAGE_KEYS.WALK_SESSIONS, []);
    const existingIndex = sessions.findIndex(s => s.id === session.id);

    const fullSession: WalkSession = {
      ...session,
      id: session.id || generateId(),
      created_at: session.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      sessions[existingIndex] = fullSession;
    } else {
      sessions.unshift(fullSession);
    }

    this.setStored(STORAGE_KEYS.WALK_SESSIONS, sessions);
    return fullSession;
  }

  async updateWalkSession(id: string, updates: Partial<WalkSession>): Promise<WalkSession> {
    this.ensureInitialized();
    const sessions = this.getStored<WalkSession[]>(STORAGE_KEYS.WALK_SESSIONS, []);
    const index = sessions.findIndex(s => s.id === id);
    if (index === -1) {
      throw new Error(`Walk session ${id} not found.`);
    }

    const updated: WalkSession = {
      ...sessions[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    sessions[index] = updated;
    this.setStored(STORAGE_KEYS.WALK_SESSIONS, sessions);
    return updated;
  }

  async deleteWalkSession(id: string): Promise<void> {
    this.ensureInitialized();
    const sessions = this.getStored<WalkSession[]>(STORAGE_KEYS.WALK_SESSIONS, []);
    this.setStored(STORAGE_KEYS.WALK_SESSIONS, sessions.filter(s => s.id !== id));
  }

  // Learning Sprints
  async getLearningSprints(): Promise<LearningSprint[]> {
    this.ensureInitialized();
    const sprints = this.getStored<LearningSprint[]>(STORAGE_KEYS.LEARNING_SPRINTS, []);
    return sprints.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async saveLearningSprint(sprint: LearningSprint): Promise<LearningSprint> {
    this.ensureInitialized();
    const sprints = this.getStored<LearningSprint[]>(STORAGE_KEYS.LEARNING_SPRINTS, []);
    const existingIndex = sprints.findIndex(s => s.id === sprint.id);

    const fullSprint: LearningSprint = {
      ...sprint,
      id: sprint.id || generateId(),
      created_at: sprint.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      sprints[existingIndex] = fullSprint;
    } else {
      sprints.unshift(fullSprint);
    }

    this.setStored(STORAGE_KEYS.LEARNING_SPRINTS, sprints);
    return fullSprint;
  }

  async updateLearningSprint(id: string, updates: Partial<LearningSprint>): Promise<LearningSprint> {
    this.ensureInitialized();
    const sprints = this.getStored<LearningSprint[]>(STORAGE_KEYS.LEARNING_SPRINTS, []);
    const index = sprints.findIndex(s => s.id === id);
    if (index === -1) {
      throw new Error(`Learning sprint ${id} not found.`);
    }

    const updated: LearningSprint = {
      ...sprints[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    sprints[index] = updated;
    this.setStored(STORAGE_KEYS.LEARNING_SPRINTS, sprints);
    return updated;
  }

  async deleteLearningSprint(id: string): Promise<void> {
    this.ensureInitialized();
    const sprints = this.getStored<LearningSprint[]>(STORAGE_KEYS.LEARNING_SPRINTS, []);
    this.setStored(STORAGE_KEYS.LEARNING_SPRINTS, sprints.filter(s => s.id !== id));
  }

  // Knowledge Vault Items
  async getKnowledgeItems(): Promise<KnowledgeItem[]> {
    this.ensureInitialized();
    const items = this.getStored<KnowledgeItem[]>(STORAGE_KEYS.KNOWLEDGE_ITEMS, []);
    return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async saveKnowledgeItem(item: KnowledgeItem): Promise<KnowledgeItem> {
    this.ensureInitialized();
    const items = this.getStored<KnowledgeItem[]>(STORAGE_KEYS.KNOWLEDGE_ITEMS, []);
    const existingIndex = items.findIndex(i => i.id === item.id);

    const fullItem: KnowledgeItem = {
      ...item,
      id: item.id || generateId(),
      tags: item.tags || [],
      is_favorite: Boolean(item.is_favorite),
      created_at: item.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      items[existingIndex] = fullItem;
    } else {
      items.unshift(fullItem);
    }

    this.setStored(STORAGE_KEYS.KNOWLEDGE_ITEMS, items);
    return fullItem;
  }

  async updateKnowledgeItem(id: string, updates: Partial<KnowledgeItem>): Promise<KnowledgeItem> {
    this.ensureInitialized();
    const items = this.getStored<KnowledgeItem[]>(STORAGE_KEYS.KNOWLEDGE_ITEMS, []);
    const index = items.findIndex(i => i.id === id);
    if (index === -1) {
      throw new Error(`Knowledge item ${id} not found.`);
    }

    const updated: KnowledgeItem = {
      ...items[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    items[index] = updated;
    this.setStored(STORAGE_KEYS.KNOWLEDGE_ITEMS, items);
    return updated;
  }

  async deleteKnowledgeItem(id: string): Promise<void> {
    this.ensureInitialized();
    const items = this.getStored<KnowledgeItem[]>(STORAGE_KEYS.KNOWLEDGE_ITEMS, []);
    this.setStored(STORAGE_KEYS.KNOWLEDGE_ITEMS, items.filter(i => i.id !== id));
  }

  // Vocabulary Items (Spaced Repetition & Trash)
  async getVocabularyItems(includeTrash: boolean = false): Promise<VocabularyItem[]> {
    this.ensureInitialized();
    const words = this.getStored<VocabularyItem[]>(STORAGE_KEYS.VOCABULARY_ITEMS, []);
    return words
      .filter(w => includeTrash ? Boolean(w.is_trash) : !w.is_trash)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async getVocabularyItemById(id: string): Promise<VocabularyItem | null> {
    this.ensureInitialized();
    const words = this.getStored<VocabularyItem[]>(STORAGE_KEYS.VOCABULARY_ITEMS, []);
    return words.find(w => w.id === id) || null;
  }

  async saveVocabularyItem(item: VocabularyItem): Promise<VocabularyItem> {
    this.ensureInitialized();
    const words = this.getStored<VocabularyItem[]>(STORAGE_KEYS.VOCABULARY_ITEMS, []);
    const existingIndex = words.findIndex(w => w.id === item.id || (item.id === '' && w.word.toLowerCase() === item.word.toLowerCase()));

    const fullWord: VocabularyItem = {
      ...item,
      id: item.id || generateId(),
      synonyms: item.synonyms || [],
      antonyms: item.antonyms || [],
      part_of_speech: item.part_of_speech || '',
      pronunciation: item.pronunciation || '',
      category: item.category || 'General',
      tags: item.tags || [],
      my_notes: item.my_notes || '',
      is_favorite: Boolean(item.is_favorite),
      is_trash: Boolean(item.is_trash),
      review_count: typeof item.review_count === 'number' ? item.review_count : 0,
      interval_days: typeof item.interval_days === 'number' ? item.interval_days : 0,
      ease_factor: typeof item.ease_factor === 'number' ? item.ease_factor : 2.5,
      status: item.status || 'new',
      created_at: item.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      words[existingIndex] = fullWord;
    } else {
      words.unshift(fullWord);
    }

    this.setStored(STORAGE_KEYS.VOCABULARY_ITEMS, words);
    return fullWord;
  }

  async updateVocabularyItem(id: string, updates: Partial<VocabularyItem>): Promise<VocabularyItem> {
    this.ensureInitialized();
    const words = this.getStored<VocabularyItem[]>(STORAGE_KEYS.VOCABULARY_ITEMS, []);
    const index = words.findIndex(w => w.id === id);
    if (index === -1) {
      throw new Error(`Vocabulary item ${id} not found.`);
    }

    const updated: VocabularyItem = {
      ...words[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    words[index] = updated;
    this.setStored(STORAGE_KEYS.VOCABULARY_ITEMS, words);
    return updated;
  }

  async deleteVocabularyItem(id: string, permanent: boolean = false): Promise<void> {
    this.ensureInitialized();
    const words = this.getStored<VocabularyItem[]>(STORAGE_KEYS.VOCABULARY_ITEMS, []);
    if (permanent) {
      this.setStored(STORAGE_KEYS.VOCABULARY_ITEMS, words.filter(w => w.id !== id));
    } else {
      const index = words.findIndex(w => w.id === id);
      if (index >= 0) {
        words[index].is_trash = true;
        words[index].updated_at = new Date().toISOString();
        this.setStored(STORAGE_KEYS.VOCABULARY_ITEMS, words);
      }
    }
  }

  async restoreVocabularyItem(id: string): Promise<void> {
    this.ensureInitialized();
    const words = this.getStored<VocabularyItem[]>(STORAGE_KEYS.VOCABULARY_ITEMS, []);
    const index = words.findIndex(w => w.id === id);
    if (index >= 0) {
      words[index].is_trash = false;
      words[index].updated_at = new Date().toISOString();
      this.setStored(STORAGE_KEYS.VOCABULARY_ITEMS, words);
    }
  }

  // Inbox / Quick Capture Items
  async getInboxItems(includeArchived: boolean = false, includeTrash: boolean = false): Promise<InboxItem[]> {
    this.ensureInitialized();
    const items = this.getStored<InboxItem[]>(STORAGE_KEYS.INBOX_ITEMS, []);
    return items
      .filter(item => {
        if (includeTrash) return Boolean(item.is_trash);
        if (item.is_trash) return false;
        if (!includeArchived && item.is_archived) return false;
        return true;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async getInboxItemById(id: string): Promise<InboxItem | null> {
    this.ensureInitialized();
    const items = this.getStored<InboxItem[]>(STORAGE_KEYS.INBOX_ITEMS, []);
    return items.find(i => i.id === id) || null;
  }

  async saveInboxItem(item: InboxItem): Promise<InboxItem> {
    this.ensureInitialized();
    const items = this.getStored<InboxItem[]>(STORAGE_KEYS.INBOX_ITEMS, []);
    const existingIndex = items.findIndex(i => i.id === item.id);

    const fullItem: InboxItem = {
      ...item,
      id: item.id || generateId(),
      type: item.type || 'note',
      tags: item.tags || [],
      priority: item.priority || 'medium',
      is_organized: Boolean(item.is_organized),
      is_archived: Boolean(item.is_archived),
      is_trash: Boolean(item.is_trash),
      is_completed: Boolean(item.is_completed),
      created_at: item.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      items[existingIndex] = fullItem;
    } else {
      items.unshift(fullItem);
    }

    this.setStored(STORAGE_KEYS.INBOX_ITEMS, items);
    return fullItem;
  }

  async updateInboxItem(id: string, updates: Partial<InboxItem>): Promise<InboxItem> {
    this.ensureInitialized();
    const items = this.getStored<InboxItem[]>(STORAGE_KEYS.INBOX_ITEMS, []);
    const index = items.findIndex(i => i.id === id);
    if (index === -1) {
      throw new Error(`Inbox item ${id} not found.`);
    }

    const updated: InboxItem = {
      ...items[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    items[index] = updated;
    this.setStored(STORAGE_KEYS.INBOX_ITEMS, items);
    return updated;
  }

  async deleteInboxItem(id: string, permanent: boolean = false): Promise<void> {
    this.ensureInitialized();
    const items = this.getStored<InboxItem[]>(STORAGE_KEYS.INBOX_ITEMS, []);
    if (permanent) {
      this.setStored(STORAGE_KEYS.INBOX_ITEMS, items.filter(i => i.id !== id));
    } else {
      const index = items.findIndex(i => i.id === id);
      if (index >= 0) {
        items[index].is_trash = true;
        items[index].updated_at = new Date().toISOString();
        this.setStored(STORAGE_KEYS.INBOX_ITEMS, items);
      }
    }
  }

  async restoreInboxItem(id: string): Promise<void> {
    this.ensureInitialized();
    const items = this.getStored<InboxItem[]>(STORAGE_KEYS.INBOX_ITEMS, []);
    const index = items.findIndex(i => i.id === id);
    if (index >= 0) {
      items[index].is_trash = false;
      items[index].updated_at = new Date().toISOString();
      this.setStored(STORAGE_KEYS.INBOX_ITEMS, items);
    }
  }

  // Monthly Reviews
  async getMonthlyReviews(): Promise<MonthlyReview[]> {
    this.ensureInitialized();
    const reviews = this.getStored<MonthlyReview[]>(STORAGE_KEYS.MONTHLY_REVIEWS, []);
    return reviews.sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      return b.month_number - a.month_number;
    });
  }

  async getMonthlyReviewByMonth(monthKey: string): Promise<MonthlyReview | null> {
    this.ensureInitialized();
    const reviews = this.getStored<MonthlyReview[]>(STORAGE_KEYS.MONTHLY_REVIEWS, []);
    return reviews.find(r => r.month_key === monthKey) || null;
  }

  async saveMonthlyReview(review: MonthlyReview): Promise<MonthlyReview> {
    this.ensureInitialized();
    const reviews = this.getStored<MonthlyReview[]>(STORAGE_KEYS.MONTHLY_REVIEWS, []);
    const existingIndex = reviews.findIndex(r => r.id === review.id || r.month_key === review.month_key);

    const fullReview: MonthlyReview = {
      ...review,
      id: review.id || generateId(),
      reflection: review.reflection || {},
      next_month: review.next_month || {},
      stats_snapshot: review.stats_snapshot || {},
      status: review.status || 'draft',
      created_at: review.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      reviews[existingIndex] = fullReview;
    } else {
      reviews.unshift(fullReview);
    }

    this.setStored(STORAGE_KEYS.MONTHLY_REVIEWS, reviews);
    return fullReview;
  }

  async updateMonthlyReview(id: string, updates: Partial<MonthlyReview>): Promise<MonthlyReview> {
    this.ensureInitialized();
    const reviews = this.getStored<MonthlyReview[]>(STORAGE_KEYS.MONTHLY_REVIEWS, []);
    const index = reviews.findIndex(r => r.id === id);
    if (index === -1) {
      throw new Error(`Monthly review ${id} not found.`);
    }

    const updated: MonthlyReview = {
      ...reviews[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    reviews[index] = updated;
    this.setStored(STORAGE_KEYS.MONTHLY_REVIEWS, reviews);
    return updated;
  }

  async deleteMonthlyReview(id: string): Promise<void> {
    this.ensureInitialized();
    const reviews = this.getStored<MonthlyReview[]>(STORAGE_KEYS.MONTHLY_REVIEWS, []);
    this.setStored(STORAGE_KEYS.MONTHLY_REVIEWS, reviews.filter(r => r.id !== id));
  }

  // Focus Sessions / Deep Work
  async getFocusSessions(): Promise<FocusSession[]> {
    this.ensureInitialized();
    const sessions = this.getStored<FocusSession[]>(STORAGE_KEYS.FOCUS_SESSIONS, []);
    return sessions.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
  }

  async saveFocusSession(session: FocusSession): Promise<FocusSession> {
    this.ensureInitialized();
    const sessions = this.getStored<FocusSession[]>(STORAGE_KEYS.FOCUS_SESSIONS, []);
    const existingIndex = sessions.findIndex(s => s.id === session.id);

    const fullSession: FocusSession = {
      ...session,
      id: session.id || generateId(),
      distraction_count: session.distraction_count || 0,
      focus_rating: session.focus_rating || 5,
      energy_level: session.energy_level || 'medium',
      difficulty: session.difficulty || 'moderate',
      accomplishment: session.accomplishment || '',
      notes: session.notes || '',
      is_favorite: Boolean(session.is_favorite),
      created_at: session.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      sessions[existingIndex] = fullSession;
    } else {
      sessions.unshift(fullSession);
    }

    this.setStored(STORAGE_KEYS.FOCUS_SESSIONS, sessions);
    return fullSession;
  }

  async updateFocusSession(id: string, updates: Partial<FocusSession>): Promise<FocusSession> {
    this.ensureInitialized();
    const sessions = this.getStored<FocusSession[]>(STORAGE_KEYS.FOCUS_SESSIONS, []);
    const index = sessions.findIndex(s => s.id === id);
    if (index === -1) {
      throw new Error(`Focus session ${id} not found.`);
    }

    const updated: FocusSession = {
      ...sessions[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    sessions[index] = updated;
    this.setStored(STORAGE_KEYS.FOCUS_SESSIONS, sessions);
    return updated;
  }

  async deleteFocusSession(id: string): Promise<void> {
    this.ensureInitialized();
    const sessions = this.getStored<FocusSession[]>(STORAGE_KEYS.FOCUS_SESSIONS, []);
    this.setStored(STORAGE_KEYS.FOCUS_SESSIONS, sessions.filter(s => s.id !== id));
  }

  // Research Papers
  async getResearchPapers(includeArchived: boolean = true, includeTrash: boolean = false): Promise<ResearchPaper[]> {
    this.ensureInitialized();
    const papers = this.getStored<ResearchPaper[]>(STORAGE_KEYS.RESEARCH_PAPERS, []);
    return papers
      .filter(p => {
        if (!includeTrash && p.is_trash) return false;
        if (!includeArchived && p.is_archived) return false;
        return true;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async getResearchPaperById(id: string): Promise<ResearchPaper | null> {
    this.ensureInitialized();
    const papers = this.getStored<ResearchPaper[]>(STORAGE_KEYS.RESEARCH_PAPERS, []);
    return papers.find(p => p.id === id) || null;
  }

  async saveResearchPaper(paper: ResearchPaper): Promise<ResearchPaper> {
    this.ensureInitialized();
    const papers = this.getStored<ResearchPaper[]>(STORAGE_KEYS.RESEARCH_PAPERS, []);
    const existingIndex = papers.findIndex(p => p.id === paper.id);

    const fullPaper: ResearchPaper = {
      ...paper,
      id: paper.id || generateId(),
      authors: paper.authors || '',
      journal_conference: paper.journal_conference || '',
      doi: paper.doi || '',
      url: paper.url || '',
      pdf_url: paper.pdf_url || '',
      research_area: paper.research_area || 'General',
      tags: paper.tags || [],
      status: paper.status || 'to_read',
      priority: paper.priority || 'medium',
      reading_progress: typeof paper.reading_progress === 'number' ? paper.reading_progress : 0,
      pages_read: paper.pages_read || 0,
      total_pages: paper.total_pages || 0,
      is_favorite: Boolean(paper.is_favorite),
      is_archived: Boolean(paper.is_archived),
      is_trash: Boolean(paper.is_trash),
      structured_notes: paper.structured_notes || {},
      notes: paper.notes || '',
      key_insights: paper.key_insights || '',
      sources: paper.sources || [],
      created_at: paper.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      papers[existingIndex] = fullPaper;
    } else {
      papers.unshift(fullPaper);
    }

    this.setStored(STORAGE_KEYS.RESEARCH_PAPERS, papers);
    return fullPaper;
  }

  async updateResearchPaper(id: string, updates: Partial<ResearchPaper>): Promise<ResearchPaper> {
    this.ensureInitialized();
    const papers = this.getStored<ResearchPaper[]>(STORAGE_KEYS.RESEARCH_PAPERS, []);
    const index = papers.findIndex(p => p.id === id);
    if (index === -1) {
      throw new Error(`Research paper ${id} not found.`);
    }

    const updated: ResearchPaper = {
      ...papers[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    papers[index] = updated;
    this.setStored(STORAGE_KEYS.RESEARCH_PAPERS, papers);
    return updated;
  }

  async deleteResearchPaper(id: string, permanent: boolean = false): Promise<void> {
    this.ensureInitialized();
    const papers = this.getStored<ResearchPaper[]>(STORAGE_KEYS.RESEARCH_PAPERS, []);
    if (permanent) {
      this.setStored(STORAGE_KEYS.RESEARCH_PAPERS, papers.filter(p => p.id !== id));
    } else {
      const index = papers.findIndex(p => p.id === id);
      if (index >= 0) {
        papers[index].is_trash = true;
        papers[index].updated_at = new Date().toISOString();
        this.setStored(STORAGE_KEYS.RESEARCH_PAPERS, papers);
      }
    }
  }

  async restoreResearchPaper(id: string): Promise<void> {
    this.ensureInitialized();
    const papers = this.getStored<ResearchPaper[]>(STORAGE_KEYS.RESEARCH_PAPERS, []);
    const index = papers.findIndex(p => p.id === id);
    if (index >= 0) {
      papers[index].is_trash = false;
      papers[index].is_archived = false;
      papers[index].updated_at = new Date().toISOString();
      this.setStored(STORAGE_KEYS.RESEARCH_PAPERS, papers);
    }
  }

  // Weekly Reviews
  async getWeeklyReviews(): Promise<WeeklyReview[]> {
    this.ensureInitialized();
    const reviews = this.getStored<WeeklyReview[]>(STORAGE_KEYS.WEEKLY_REVIEWS, []);
    return reviews.sort((a, b) => new Date(b.week_start_date).getTime() - new Date(a.week_start_date).getTime());
  }

  async getWeeklyReviewByWeek(weekStartDate: string): Promise<WeeklyReview | null> {
    this.ensureInitialized();
    const reviews = this.getStored<WeeklyReview[]>(STORAGE_KEYS.WEEKLY_REVIEWS, []);
    return reviews.find(r => r.week_start_date === weekStartDate) || null;
  }

  async saveWeeklyReview(review: WeeklyReview): Promise<WeeklyReview> {
    this.ensureInitialized();
    const reviews = this.getStored<WeeklyReview[]>(STORAGE_KEYS.WEEKLY_REVIEWS, []);
    const existingIndex = reviews.findIndex(r => r.id === review.id || r.week_start_date === review.week_start_date);

    const fullReview: WeeklyReview = {
      ...review,
      id: review.id || generateId(),
      title: review.title || `Weekly Review (${review.week_start_date} – ${review.week_end_date})`,
      status: review.status || 'draft',
      rating_overall: review.rating_overall || 0,
      rating_energy: review.rating_energy || 'medium',
      rating_productivity: review.rating_productivity || 0,
      rating_stress: review.rating_stress || 0,
      reflection: review.reflection || {
        went_well: '',
        difficult: '',
        proud_of: '',
        learned: '',
        distractions: '',
        improve_next: '',
        stop_doing: '',
        continue_doing: '',
        biggest_win: '',
        notes: '',
      },
      next_week: review.next_week || {
        priority_1: '',
        priority_2: '',
        priority_3: '',
        deadlines: '',
        reminders: '',
        personal_goal: '',
        work_goal: '',
        health_goal: '',
      },
      stats_snapshot: review.stats_snapshot || {},
      notes: review.notes || '',
      created_at: review.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      reviews[existingIndex] = fullReview;
    } else {
      reviews.unshift(fullReview);
    }

    this.setStored(STORAGE_KEYS.WEEKLY_REVIEWS, reviews);
    return fullReview;
  }

  async updateWeeklyReview(id: string, updates: Partial<WeeklyReview>): Promise<WeeklyReview> {
    this.ensureInitialized();
    const reviews = this.getStored<WeeklyReview[]>(STORAGE_KEYS.WEEKLY_REVIEWS, []);
    const index = reviews.findIndex(r => r.id === id);
    if (index === -1) {
      throw new Error(`Weekly review ${id} not found.`);
    }

    const updated: WeeklyReview = {
      ...reviews[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    reviews[index] = updated;
    this.setStored(STORAGE_KEYS.WEEKLY_REVIEWS, reviews);
    return updated;
  }

  async deleteWeeklyReview(id: string): Promise<void> {
    this.ensureInitialized();
    const reviews = this.getStored<WeeklyReview[]>(STORAGE_KEYS.WEEKLY_REVIEWS, []);
    this.setStored(STORAGE_KEYS.WEEKLY_REVIEWS, reviews.filter(r => r.id !== id));
  }

  // Goals, Milestones, Tasks
  async getGoals(includeArchived: boolean = true, includeTrash: boolean = false): Promise<Goal[]> {
    this.ensureInitialized();
    const goals = this.getStored<Goal[]>(STORAGE_KEYS.GOALS, []);
    return goals
      .filter(g => {
        if (!includeTrash && g.is_trash) return false;
        if (!includeArchived && g.is_archived) return false;
        return true;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async getGoalById(id: string): Promise<Goal | null> {
    this.ensureInitialized();
    const goals = this.getStored<Goal[]>(STORAGE_KEYS.GOALS, []);
    return goals.find(g => g.id === id) || null;
  }

  async saveGoal(goal: Goal): Promise<Goal> {
    this.ensureInitialized();
    const goals = this.getStored<Goal[]>(STORAGE_KEYS.GOALS, []);
    const existingIndex = goals.findIndex(g => g.id === goal.id);

    const fullGoal: Goal = {
      ...goal,
      id: goal.id || generateId(),
      description: goal.description || '',
      category: goal.category || 'Personal',
      priority: goal.priority || 'medium',
      status: goal.status || 'not_started',
      why_it_matters: goal.why_it_matters || '',
      progress: typeof goal.progress === 'number' ? goal.progress : 0,
      is_favorite: Boolean(goal.is_favorite),
      is_archived: Boolean(goal.is_archived),
      is_trash: Boolean(goal.is_trash),
      notes: goal.notes || '',
      created_at: goal.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      goals[existingIndex] = fullGoal;
    } else {
      goals.unshift(fullGoal);
    }

    this.setStored(STORAGE_KEYS.GOALS, goals);
    return fullGoal;
  }

  async updateGoal(id: string, updates: Partial<Goal>): Promise<Goal> {
    this.ensureInitialized();
    const goals = this.getStored<Goal[]>(STORAGE_KEYS.GOALS, []);
    const index = goals.findIndex(g => g.id === id);
    if (index === -1) {
      throw new Error(`Goal ${id} not found.`);
    }

    const updated: Goal = {
      ...goals[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    goals[index] = updated;
    this.setStored(STORAGE_KEYS.GOALS, goals);
    return updated;
  }

  async deleteGoal(id: string, permanent: boolean = false): Promise<void> {
    this.ensureInitialized();
    const goals = this.getStored<Goal[]>(STORAGE_KEYS.GOALS, []);
    if (permanent) {
      this.setStored(STORAGE_KEYS.GOALS, goals.filter(g => g.id !== id));
      // Cleanup associated milestones and tasks
      const milestones = this.getStored<GoalMilestone[]>(STORAGE_KEYS.GOAL_MILESTONES, []);
      this.setStored(STORAGE_KEYS.GOAL_MILESTONES, milestones.filter(m => m.goal_id !== id));
      const tasks = this.getStored<GoalTask[]>(STORAGE_KEYS.GOAL_TASKS, []);
      this.setStored(STORAGE_KEYS.GOAL_TASKS, tasks.filter(t => t.goal_id !== id));
    } else {
      const index = goals.findIndex(g => g.id === id);
      if (index >= 0) {
        goals[index].is_trash = true;
        goals[index].updated_at = new Date().toISOString();
        this.setStored(STORAGE_KEYS.GOALS, goals);
      }
    }
  }

  async restoreGoal(id: string): Promise<void> {
    this.ensureInitialized();
    const goals = this.getStored<Goal[]>(STORAGE_KEYS.GOALS, []);
    const index = goals.findIndex(g => g.id === id);
    if (index >= 0) {
      goals[index].is_trash = false;
      goals[index].is_archived = false;
      goals[index].updated_at = new Date().toISOString();
      this.setStored(STORAGE_KEYS.GOALS, goals);
    }
  }

  async getMilestonesByGoalId(goalId: string): Promise<GoalMilestone[]> {
    this.ensureInitialized();
    const milestones = this.getStored<GoalMilestone[]>(STORAGE_KEYS.GOAL_MILESTONES, []);
    return milestones
      .filter(m => m.goal_id === goalId)
      .sort((a, b) => a.position - b.position);
  }

  async saveMilestone(milestone: GoalMilestone): Promise<GoalMilestone> {
    this.ensureInitialized();
    const milestones = this.getStored<GoalMilestone[]>(STORAGE_KEYS.GOAL_MILESTONES, []);
    const existingIndex = milestones.findIndex(m => m.id === milestone.id);

    const fullMilestone: GoalMilestone = {
      ...milestone,
      id: milestone.id || generateId(),
      description: milestone.description || '',
      status: milestone.status || 'pending',
      position: typeof milestone.position === 'number' ? milestone.position : milestones.filter(m => m.goal_id === milestone.goal_id).length,
      created_at: milestone.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      milestones[existingIndex] = fullMilestone;
    } else {
      milestones.push(fullMilestone);
    }

    this.setStored(STORAGE_KEYS.GOAL_MILESTONES, milestones);
    return fullMilestone;
  }

  async updateMilestone(id: string, updates: Partial<GoalMilestone>): Promise<GoalMilestone> {
    this.ensureInitialized();
    const milestones = this.getStored<GoalMilestone[]>(STORAGE_KEYS.GOAL_MILESTONES, []);
    const index = milestones.findIndex(m => m.id === id);
    if (index === -1) {
      throw new Error(`Milestone ${id} not found.`);
    }

    const updated: GoalMilestone = {
      ...milestones[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    milestones[index] = updated;
    this.setStored(STORAGE_KEYS.GOAL_MILESTONES, milestones);
    return updated;
  }

  async deleteMilestone(id: string): Promise<void> {
    this.ensureInitialized();
    const milestones = this.getStored<GoalMilestone[]>(STORAGE_KEYS.GOAL_MILESTONES, []);
    this.setStored(STORAGE_KEYS.GOAL_MILESTONES, milestones.filter(m => m.id !== id));
    // Cleanup milestone tasks
    const tasks = this.getStored<GoalTask[]>(STORAGE_KEYS.GOAL_TASKS, []);
    this.setStored(STORAGE_KEYS.GOAL_TASKS, tasks.filter(t => t.milestone_id !== id));
  }

  async reorderMilestones(goalId: string, orderedMilestoneIds: string[]): Promise<void> {
    this.ensureInitialized();
    const milestones = this.getStored<GoalMilestone[]>(STORAGE_KEYS.GOAL_MILESTONES, []);
    const updated = milestones.map(m => {
      if (m.goal_id === goalId) {
        const newPos = orderedMilestoneIds.indexOf(m.id);
        if (newPos >= 0) {
          return { ...m, position: newPos, updated_at: new Date().toISOString() };
        }
      }
      return m;
    });
    this.setStored(STORAGE_KEYS.GOAL_MILESTONES, updated);
  }

  async getGoalTasks(goalId?: string, milestoneId?: string): Promise<GoalTask[]> {
    this.ensureInitialized();
    let tasks = this.getStored<GoalTask[]>(STORAGE_KEYS.GOAL_TASKS, []);
    if (goalId) {
      tasks = tasks.filter(t => t.goal_id === goalId);
    }
    if (milestoneId) {
      tasks = tasks.filter(t => t.milestone_id === milestoneId);
    }
    return tasks.sort((a, b) => a.position - b.position);
  }

  async saveGoalTask(task: GoalTask): Promise<GoalTask> {
    this.ensureInitialized();
    const tasks = this.getStored<GoalTask[]>(STORAGE_KEYS.GOAL_TASKS, []);
    const existingIndex = tasks.findIndex(t => t.id === task.id);

    const fullTask: GoalTask = {
      ...task,
      id: task.id || generateId(),
      is_completed: Boolean(task.is_completed),
      priority: task.priority || 'medium',
      notes: task.notes || '',
      position: typeof task.position === 'number' ? task.position : tasks.filter(t => t.goal_id === task.goal_id).length,
      created_at: task.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      tasks[existingIndex] = fullTask;
    } else {
      tasks.push(fullTask);
    }

    this.setStored(STORAGE_KEYS.GOAL_TASKS, tasks);
    return fullTask;
  }

  async updateGoalTask(id: string, updates: Partial<GoalTask>): Promise<GoalTask> {
    this.ensureInitialized();
    const tasks = this.getStored<GoalTask[]>(STORAGE_KEYS.GOAL_TASKS, []);
    const index = tasks.findIndex(t => t.id === id);
    if (index === -1) {
      throw new Error(`Goal task ${id} not found.`);
    }

    const updated: GoalTask = {
      ...tasks[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    tasks[index] = updated;
    this.setStored(STORAGE_KEYS.GOAL_TASKS, tasks);
    return updated;
  }

  async deleteGoalTask(id: string): Promise<void> {
    this.ensureInitialized();
    const tasks = this.getStored<GoalTask[]>(STORAGE_KEYS.GOAL_TASKS, []);
    this.setStored(STORAGE_KEYS.GOAL_TASKS, tasks.filter(t => t.id !== id));
  }

  // Backup & Restore
  async exportData(): Promise<PlannerBackup> {
    this.ensureInitialized();
    return {
      app: 'Planora',
      version: 1,
      exportedAt: new Date().toISOString(),
      profile: await this.getProfile(),
      pages: this.getStored<PlannerPage[]>(STORAGE_KEYS.PAGES, INITIAL_PAGES),
      blocks: this.getStored<PageBlock[]>(STORAGE_KEYS.BLOCKS, INITIAL_BLOCKS),
      walkSessions: this.getStored<WalkSession[]>(STORAGE_KEYS.WALK_SESSIONS, []),
      learningSprints: this.getStored<LearningSprint[]>(STORAGE_KEYS.LEARNING_SPRINTS, []),
      knowledgeItems: this.getStored<KnowledgeItem[]>(STORAGE_KEYS.KNOWLEDGE_ITEMS, []),
      vocabularyItems: this.getStored<VocabularyItem[]>(STORAGE_KEYS.VOCABULARY_ITEMS, []),
      inboxItems: this.getStored<InboxItem[]>(STORAGE_KEYS.INBOX_ITEMS, []),
      monthlyReviews: this.getStored<MonthlyReview[]>(STORAGE_KEYS.MONTHLY_REVIEWS, []),
      focusSessions: this.getStored<FocusSession[]>(STORAGE_KEYS.FOCUS_SESSIONS, []),
      researchPapers: this.getStored<ResearchPaper[]>(STORAGE_KEYS.RESEARCH_PAPERS, []),
      weeklyReviews: this.getStored<WeeklyReview[]>(STORAGE_KEYS.WEEKLY_REVIEWS, []),
      goals: this.getStored<Goal[]>(STORAGE_KEYS.GOALS, []),
      goalMilestones: this.getStored<GoalMilestone[]>(STORAGE_KEYS.GOAL_MILESTONES, []),
      goalTasks: this.getStored<GoalTask[]>(STORAGE_KEYS.GOAL_TASKS, []),
    };
  }

  async importData(data: PlannerBackup, mode: 'merge' | 'replace' = 'merge'): Promise<BackupImportResult> {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid backup file: Not a valid JSON object.');
    }
    if (!data.version || !Array.isArray(data.pages) || !Array.isArray(data.blocks)) {
      throw new Error('Invalid backup file format: Missing essential pages or blocks schema.');
    }

    const summary = {
      pages: 0,
      blocks: 0,
      walks: 0,
      sprints: 0,
      vault: 0,
      vocabulary: 0,
      inbox: 0,
      monthly_reviews: 0,
      focus_sessions: 0,
      papers: 0,
      weekly_reviews: 0,
      goals: 0,
      milestones: 0,
      tasks: 0,
    };

    let importedCount = 0;
    let skippedCount = 0;

    // Helper to merge or replace an array of items by ID
    const mergeCollection = <T extends { id: string }>(
      storageKey: string,
      incomingItems: T[] | undefined,
      defaultItems: T[] = []
    ): { imported: number; skipped: number } => {
      if (!Array.isArray(incomingItems)) return { imported: 0, skipped: 0 };
      
      if (mode === 'replace') {
        this.setStored(storageKey, incomingItems);
        return { imported: incomingItems.length, skipped: 0 };
      }

      // Merge Mode
      const existing = this.getStored<T[]>(storageKey, defaultItems);
      const existingMap = new Map<string, T>(existing.map(item => [item.id, item]));
      let imp = 0;
      let skp = 0;

      for (const item of incomingItems) {
        if (!item || !item.id) {
          skp++;
          continue;
        }
        if (existingMap.has(item.id)) {
          // If already exists, update with incoming
          existingMap.set(item.id, item);
          imp++;
        } else {
          // New item
          existingMap.set(item.id, item);
          imp++;
        }
      }

      this.setStored(storageKey, Array.from(existingMap.values()));
      return { imported: imp, skipped: skp };
    };

    // 1. Pages
    const pagesRes = mergeCollection(STORAGE_KEYS.PAGES, data.pages, INITIAL_PAGES);
    summary.pages = pagesRes.imported;
    importedCount += pagesRes.imported;
    skippedCount += pagesRes.skipped;

    // 2. Blocks
    const blocksRes = mergeCollection(STORAGE_KEYS.BLOCKS, data.blocks, INITIAL_BLOCKS);
    summary.blocks = blocksRes.imported;
    importedCount += blocksRes.imported;
    skippedCount += blocksRes.skipped;

    // 3. Profile
    if (data.profile) {
      if (mode === 'replace') {
        this.setStored(STORAGE_KEYS.PROFILE, data.profile);
      } else {
        const currentProfile = await this.getProfile();
        this.setStored(STORAGE_KEYS.PROFILE, {
          ...currentProfile,
          ...data.profile,
          passcode: currentProfile.passcode || data.profile.passcode,
        });
      }
    }

    // 4. Walk Sessions
    const walkRes = mergeCollection(STORAGE_KEYS.WALK_SESSIONS, data.walkSessions);
    summary.walks = walkRes.imported;
    importedCount += walkRes.imported;
    skippedCount += walkRes.skipped;

    // 5. Learning Sprints
    const sprintRes = mergeCollection(STORAGE_KEYS.LEARNING_SPRINTS, data.learningSprints);
    summary.sprints = sprintRes.imported;
    importedCount += sprintRes.imported;
    skippedCount += sprintRes.skipped;

    // 6. Knowledge Vault
    const vaultRes = mergeCollection(STORAGE_KEYS.KNOWLEDGE_ITEMS, data.knowledgeItems);
    summary.vault = vaultRes.imported;
    importedCount += vaultRes.imported;
    skippedCount += vaultRes.skipped;

    // 7. Vocabulary
    const vocabRes = mergeCollection(STORAGE_KEYS.VOCABULARY_ITEMS, data.vocabularyItems);
    summary.vocabulary = vocabRes.imported;
    importedCount += vocabRes.imported;
    skippedCount += vocabRes.skipped;

    // 8. Inbox Items
    const inboxRes = mergeCollection(STORAGE_KEYS.INBOX_ITEMS, data.inboxItems);
    summary.inbox = inboxRes.imported;
    importedCount += inboxRes.imported;
    skippedCount += inboxRes.skipped;

    // 9. Monthly Reviews
    const monthlyRes = mergeCollection(STORAGE_KEYS.MONTHLY_REVIEWS, data.monthlyReviews);
    summary.monthly_reviews = monthlyRes.imported;
    importedCount += monthlyRes.imported;
    skippedCount += monthlyRes.skipped;

    // 10. Focus Sessions
    const focusRes = mergeCollection(STORAGE_KEYS.FOCUS_SESSIONS, data.focusSessions);
    summary.focus_sessions = focusRes.imported;
    importedCount += focusRes.imported;
    skippedCount += focusRes.skipped;

    // 11. Research Papers
    const paperRes = mergeCollection(STORAGE_KEYS.RESEARCH_PAPERS, data.researchPapers);
    summary.papers = paperRes.imported;
    importedCount += paperRes.imported;
    skippedCount += paperRes.skipped;

    // 12. Weekly Reviews
    const weeklyRes = mergeCollection(STORAGE_KEYS.WEEKLY_REVIEWS, data.weeklyReviews);
    summary.weekly_reviews = weeklyRes.imported;
    importedCount += weeklyRes.imported;
    skippedCount += weeklyRes.skipped;

    // 13. Goals
    const goalRes = mergeCollection(STORAGE_KEYS.GOALS, data.goals);
    summary.goals = goalRes.imported;
    importedCount += goalRes.imported;
    skippedCount += goalRes.skipped;

    // 14. Milestones
    const mileRes = mergeCollection(STORAGE_KEYS.GOAL_MILESTONES, data.goalMilestones);
    summary.milestones = mileRes.imported;
    importedCount += mileRes.imported;
    skippedCount += mileRes.skipped;

    // 15. Goal Tasks
    const taskRes = mergeCollection(STORAGE_KEYS.GOAL_TASKS, data.goalTasks);
    summary.tasks = taskRes.imported;
    importedCount += taskRes.imported;
    skippedCount += taskRes.skipped;

    return {
      success: true,
      importedCount,
      skippedCount,
      summary,
      message: `Successfully ${mode === 'replace' ? 'replaced with' : 'merged'} ${importedCount} records.`,
    };
  }

  async resetToDefault(): Promise<void> {
    if (!this.isBrowser()) return;
    this.setStored(STORAGE_KEYS.PAGES, INITIAL_PAGES);
    this.setStored(STORAGE_KEYS.BLOCKS, INITIAL_BLOCKS);
    this.setStored(STORAGE_KEYS.PROFILE, DEFAULT_PROFILE);
    this.setStored(STORAGE_KEYS.LOCKED, false);
    this.setStored(STORAGE_KEYS.WALK_SESSIONS, []);
    this.setStored(STORAGE_KEYS.LEARNING_SPRINTS, []);
    this.setStored(STORAGE_KEYS.KNOWLEDGE_ITEMS, []);
    this.setStored(STORAGE_KEYS.VOCABULARY_ITEMS, []);
    this.setStored(STORAGE_KEYS.INBOX_ITEMS, []);
    this.setStored(STORAGE_KEYS.MONTHLY_REVIEWS, []);
    this.setStored(STORAGE_KEYS.FOCUS_SESSIONS, []);
    this.setStored(STORAGE_KEYS.RESEARCH_PAPERS, []);
    this.setStored(STORAGE_KEYS.WEEKLY_REVIEWS, []);
    this.setStored(STORAGE_KEYS.GOALS, []);
    this.setStored(STORAGE_KEYS.GOAL_MILESTONES, []);
    this.setStored(STORAGE_KEYS.GOAL_TASKS, []);
  }
}

export const localPlannerStorage = new LocalPlannerStorage();
