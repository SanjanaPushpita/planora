import { IPlannerStorage } from './storage-interface';
import { 
  PlannerPage, 
  PageBlock, 
  UserProfile, 
  PlannerBackup,
  PageType 
} from '../types';
import { supabase, isSupabaseConfigured } from '../../supabase/client';
import { localPlannerStorage } from './local-storage';
import { generateTemplateBlocks } from './block-defaults';
import { generateId } from '../utils';

export class SupabasePlannerStorage implements IPlannerStorage {
  private fallback = localPlannerStorage;

  async getProfile(): Promise<UserProfile> {
    if (!isSupabaseConfigured || !supabase) return this.fallback.getProfile();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return this.fallback.getProfile();

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error || !data) return this.fallback.getProfile();
      return {
        id: data.id,
        name: data.name || user.email?.split('@')[0] || 'User',
        email: user.email,
        tagline: data.tagline || 'My Personal Planner',
        isLocked: false,
        theme: data.theme || 'blush',
        colorMode: data.color_mode || 'light',
        created_at: data.created_at,
      };
    } catch {
      return this.fallback.getProfile();
    }
  }

  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    if (!isSupabaseConfigured || !supabase) return this.fallback.updateProfile(updates);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return this.fallback.updateProfile(updates);

      const dbUpdates: Record<string, any> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.tagline !== undefined) dbUpdates.tagline = updates.tagline;
      if (updates.theme !== undefined) dbUpdates.theme = updates.theme;
      if (updates.colorMode !== undefined) dbUpdates.color_mode = updates.colorMode;

      await supabase.from('profiles').update(dbUpdates).eq('id', user.id);
      return this.getProfile();
    } catch {
      return this.fallback.updateProfile(updates);
    }
  }

  async unlockWithPasscode(passcode: string): Promise<boolean> {
    return this.fallback.unlockWithPasscode(passcode);
  }

  async lockSession(): Promise<void> {
    return this.fallback.lockSession();
  }

  async getPages(includeArchived: boolean = false, includeDeleted: boolean = false): Promise<PlannerPage[]> {
    if (!isSupabaseConfigured || !supabase) return this.fallback.getPages(includeArchived, includeDeleted);
    try {
      let query = supabase.from('pages').select('*').order('position', { ascending: true });
      if (!includeDeleted) query = query.eq('is_deleted', false);
      if (includeDeleted) query = query.eq('is_deleted', true);
      if (!includeArchived) query = query.eq('is_archived', false);

      const { data, error } = await query;
      if (error || !data) return this.fallback.getPages(includeArchived, includeDeleted);
      return data;
    } catch {
      return this.fallback.getPages(includeArchived, includeDeleted);
    }
  }

  async getPageById(id: string): Promise<PlannerPage | null> {
    if (!isSupabaseConfigured || !supabase) return this.fallback.getPageById(id);
    const decodedId = decodeURIComponent(id);
    try {
      const { data, error } = await supabase.from('pages').select('*').or(`id.eq.${id},id.eq.${decodedId}`).maybeSingle();
      if (error || !data) return this.fallback.getPageById(id);
      return data;
    } catch {
      return this.fallback.getPageById(id);
    }
  }

  async createPage(params: {
    title: string;
    page_type: PageType;
    icon?: string;
    cover_color?: string;
    date?: string;
    metadata?: Record<string, any>;
  }): Promise<PlannerPage> {
    if (!isSupabaseConfigured || !supabase) return this.fallback.createPage(params);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('[Supabase] Unauthenticated session detected, creating page in local storage');
        return this.fallback.createPage(params);
      }

      const pageId = 'page-' + generateId();
      const iconMap: Record<PageType, string> = {
        daily: '✨', habit: '🌿', study: '📚', challenge: '🌸',
        checklist: '📝', journal: '📖', monthly: '🗓️', blank: '📄', custom: '💡',
        period: '🌸', walk: '🚶‍♀️',
      };

      const newPage: PlannerPage = {
        id: pageId,
        title: params.title.trim() || 'Untitled Planner',
        icon: params.icon || iconMap[params.page_type] || '📄',
        cover_color: params.cover_color,
        page_type: params.page_type,
        is_favorite: false,
        is_archived: false,
        is_deleted: false,
        date: params.date,
        position: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: params.metadata,
      };

      const { error: pageError } = await supabase.from('pages').insert({
        ...newPage,
        user_id: user.id,
      });

      if (pageError) {
        console.error('[Supabase createPage error]', pageError);
        return this.fallback.createPage(params);
      }

      const templateBlocks = generateTemplateBlocks(pageId, params.page_type, params.metadata);
      if (templateBlocks.length > 0) {
        const { error: blockError } = await supabase.from('page_blocks').insert(
          templateBlocks.map(b => ({ ...b, user_id: user.id }))
        );
        if (blockError) {
          console.error('[Supabase createBlocks error]', blockError);
        }
      }

      return newPage;
    } catch (err) {
      console.error('[Supabase createPage exception]', err);
      return this.fallback.createPage(params);
    }
  }

  async updatePage(id: string, updates: Partial<PlannerPage>): Promise<PlannerPage> {
    if (!isSupabaseConfigured || !supabase) return this.fallback.updatePage(id, updates);
    try {
      const { data, error } = await supabase
        .from('pages')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error || !data) return this.fallback.updatePage(id, updates);
      return data;
    } catch {
      return this.fallback.updatePage(id, updates);
    }
  }

  async duplicatePage(id: string): Promise<PlannerPage> {
    return this.fallback.duplicatePage(id);
  }

  async moveToTrash(id: string): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return this.fallback.moveToTrash(id);
    await supabase.from('pages').update({ is_deleted: true, deleted_at: new Date().toISOString() }).eq('id', id);
  }

  async restoreFromTrash(id: string): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return this.fallback.restoreFromTrash(id);
    await supabase.from('pages').update({ is_deleted: false, deleted_at: null }).eq('id', id);
  }

  async permanentlyDeletePage(id: string): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return this.fallback.permanentlyDeletePage(id);
    await supabase.from('page_blocks').delete().eq('page_id', id);
    await supabase.from('pages').delete().eq('id', id);
  }

  async emptyTrash(): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return this.fallback.emptyTrash();
    const { data } = await supabase.from('pages').select('id').eq('is_deleted', true);
    if (data && data.length > 0) {
      const ids = data.map(p => p.id);
      await supabase.from('page_blocks').delete().in('page_id', ids);
      await supabase.from('pages').delete().in('id', ids);
    }
  }

  async getBlocksByPageId(pageId: string): Promise<PageBlock[]> {
    if (!isSupabaseConfigured || !supabase) return this.fallback.getBlocksByPageId(pageId);
    try {
      const { data, error } = await supabase
        .from('page_blocks')
        .select('*')
        .eq('page_id', pageId)
        .order('position', { ascending: true });
      if (error || !data) return this.fallback.getBlocksByPageId(pageId);
      return data;
    } catch {
      return this.fallback.getBlocksByPageId(pageId);
    }
  }

  async saveBlock(block: PageBlock): Promise<PageBlock> {
    if (!isSupabaseConfigured || !supabase) return this.fallback.saveBlock(block);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('page_blocks').upsert({
        ...block,
        user_id: user?.id,
        updated_at: new Date().toISOString(),
      });
      if (error) {
        console.error('[Supabase saveBlock error]', error);
        return this.fallback.saveBlock(block);
      }
      return block;
    } catch (err) {
      console.error('[Supabase saveBlock catch]', err);
      return this.fallback.saveBlock(block);
    }
  }

  async createBlock(pageId: string, type: PageBlock['type'], position?: number): Promise<PageBlock> {
    return this.fallback.createBlock(pageId, type, position);
  }

  async updateBlock(id: string, updates: Partial<PageBlock>): Promise<PageBlock> {
    if (!isSupabaseConfigured || !supabase) return this.fallback.updateBlock(id, updates);
    try {
      const { data, error } = await supabase
        .from('page_blocks')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error || !data) return this.fallback.updateBlock(id, updates);
      return data;
    } catch {
      return this.fallback.updateBlock(id, updates);
    }
  }

  async deleteBlock(id: string): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return this.fallback.deleteBlock(id);
    await supabase.from('page_blocks').delete().eq('id', id);
  }

  async reorderBlocks(pageId: string, orderedBlockIds: string[]): Promise<void> {
    return this.fallback.reorderBlocks(pageId, orderedBlockIds);
  }

  async exportData(): Promise<PlannerBackup> {
    return this.fallback.exportData();
  }

  async importData(data: PlannerBackup): Promise<boolean> {
    return this.fallback.importData(data);
  }

  async resetToDefault(): Promise<void> {
    return this.fallback.resetToDefault();
  }
}

export const supabasePlannerStorage = new SupabasePlannerStorage();
