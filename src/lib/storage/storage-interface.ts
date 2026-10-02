import { 
  PlannerPage, 
  PageBlock, 
  UserProfile, 
  PlannerBackup,
  PageType,
  WalkSession
} from '../types';

export interface IPlannerStorage {
  // Profile & Auth
  getProfile(): Promise<UserProfile>;
  updateProfile(updates: Partial<UserProfile>): Promise<UserProfile>;
  unlockWithPasscode(passcode: string): Promise<boolean>;
  lockSession(): Promise<void>;

  // Pages
  getPages(includeArchived?: boolean, includeDeleted?: boolean): Promise<PlannerPage[]>;
  getPageById(id: string): Promise<PlannerPage | null>;
  createPage(params: {
    title: string;
    page_type: PageType;
    icon?: string;
    cover_color?: string;
    date?: string;
    metadata?: Record<string, any>;
  }): Promise<PlannerPage>;
  updatePage(id: string, updates: Partial<PlannerPage>): Promise<PlannerPage>;
  duplicatePage(id: string): Promise<PlannerPage>;
  moveToTrash(id: string): Promise<void>;
  restoreFromTrash(id: string): Promise<void>;
  permanentlyDeletePage(id: string): Promise<void>;
  emptyTrash(): Promise<void>;

  // Blocks
  getBlocksByPageId(pageId: string): Promise<PageBlock[]>;
  saveBlock(block: PageBlock): Promise<PageBlock>;
  createBlock(pageId: string, type: PageBlock['type'], position?: number): Promise<PageBlock>;
  updateBlock(id: string, updates: Partial<PageBlock>): Promise<PageBlock>;
  deleteBlock(id: string): Promise<void>;
  reorderBlocks(pageId: string, orderedBlockIds: string[]): Promise<void>;

  // Walk Sessions (Durable Supabase + Offline Queue + Local Storage)
  getWalkSessions(params?: { pageId?: string; startDate?: string; endDate?: string }): Promise<WalkSession[]>;
  saveWalkSession(session: WalkSession): Promise<WalkSession>;
  updateWalkSession(id: string, updates: Partial<WalkSession>): Promise<WalkSession>;
  deleteWalkSession(id: string): Promise<void>;

  // Backup & Restore
  exportData(): Promise<PlannerBackup>;
  importData(data: PlannerBackup): Promise<boolean>;
  resetToDefault(): Promise<void>;
}

