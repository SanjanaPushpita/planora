import { IPlannerStorage } from './storage-interface';
import { 
  PlannerPage, 
  PageBlock, 
  UserProfile, 
  PlannerBackup,
  PageType 
} from '../types';
import { DEFAULT_PROFILE, INITIAL_PAGES, INITIAL_BLOCKS } from './seed-data';
import { generateId } from '../utils';
import { generateTemplateBlocks, getDefaultBlockContent } from './block-defaults';

const STORAGE_KEYS = {
  PROFILE: 'planora_user_profile',
  PAGES: 'planora_planner_pages',
  BLOCKS: 'planora_page_blocks',
  LOCKED: 'planora_session_locked',
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

  // Backup & Restore
  async exportData(): Promise<PlannerBackup> {
    this.ensureInitialized();
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      profile: await this.getProfile(),
      pages: this.getStored<PlannerPage[]>(STORAGE_KEYS.PAGES, INITIAL_PAGES),
      blocks: this.getStored<PageBlock[]>(STORAGE_KEYS.BLOCKS, INITIAL_BLOCKS),
    };
  }

  async importData(data: PlannerBackup): Promise<boolean> {
    if (!data || !data.version || !Array.isArray(data.pages) || !Array.isArray(data.blocks)) {
      throw new Error('Invalid backup file format.');
    }
    this.setStored(STORAGE_KEYS.PAGES, data.pages);
    this.setStored(STORAGE_KEYS.BLOCKS, data.blocks);
    if (data.profile) {
      this.setStored(STORAGE_KEYS.PROFILE, data.profile);
    }
    return true;
  }

  async resetToDefault(): Promise<void> {
    if (!this.isBrowser()) return;
    this.setStored(STORAGE_KEYS.PAGES, INITIAL_PAGES);
    this.setStored(STORAGE_KEYS.BLOCKS, INITIAL_BLOCKS);
    this.setStored(STORAGE_KEYS.PROFILE, DEFAULT_PROFILE);
    this.setStored(STORAGE_KEYS.LOCKED, false);
  }
}

export const localPlannerStorage = new LocalPlannerStorage();
