import { IPlannerStorage } from './storage-interface';
import { 
  PlannerPage, 
  PageBlock, 
  UserProfile, 
  PlannerBackup,
  PageType,
  WalkSession,
  LearningSprint,
  KnowledgeItem,
  VocabularyItem,
  FocusSession,
  ResearchPaper
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

  // Walk Sessions (Supabase Durable Storage + Offline Queue + Fallback)
  async getWalkSessions(params?: { pageId?: string; startDate?: string; endDate?: string }): Promise<WalkSession[]> {
    if (!isSupabaseConfigured || !supabase) {
      return this.fallback.getWalkSessions(params);
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return this.fallback.getWalkSessions(params);
      }

      let query = supabase
        .from('walk_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false });

      if (params?.pageId) {
        query = query.eq('page_id', params.pageId);
      }
      if (params?.startDate) {
        query = query.gte('date', params.startDate);
      }
      if (params?.endDate) {
        query = query.lte('date', params.endDate);
      }

      const { data, error } = await query;
      if (error || !data) {
        console.warn('[Supabase getWalkSessions error, using fallback]', error);
        return this.fallback.getWalkSessions(params);
      }

      // Sync returned sessions into local storage for zero-latency offline read
      if (Array.isArray(data)) {
        for (const sess of data) {
          await this.fallback.saveWalkSession(sess);
        }
      }

      return data as WalkSession[];
    } catch (err) {
      console.error('[Supabase getWalkSessions exception]', err);
      return this.fallback.getWalkSessions(params);
    }
  }

  async saveWalkSession(session: WalkSession): Promise<WalkSession> {
    // 1. Always save locally first as immediate durable backup
    const localSession = await this.fallback.saveWalkSession(session);

    if (!isSupabaseConfigured || !supabase) {
      return localSession;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return localSession;
      }

      const payload = {
        id: session.id,
        user_id: user.id,
        page_id: session.page_id || (session as any).tracker_id || null,
        started_at: session.started_at,
        ended_at: session.ended_at,
        duration_seconds: session.duration_seconds,
        target_duration_seconds: session.target_duration_seconds || 300,
        date: session.date,
        hour: session.hour,
        feeling: session.feeling || null,
        note: session.note || null,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('walk_sessions')
        .upsert(payload)
        .select()
        .single();

      if (error) {
        console.error('[Supabase saveWalkSession error]', error);
        // Track in pending sync queue
        try {
          const pending = JSON.parse(localStorage.getItem('planora_walk_pending_sync') || '[]');
          if (!pending.some((s: WalkSession) => s.id === session.id)) {
            pending.push(session);
            localStorage.setItem('planora_walk_pending_sync', JSON.stringify(pending));
          }
        } catch {}
        return localSession;
      }

      // If success, remove from pending sync if was present
      try {
        const pending = JSON.parse(localStorage.getItem('planora_walk_pending_sync') || '[]');
        const filtered = pending.filter((s: WalkSession) => s.id !== session.id);
        localStorage.setItem('planora_walk_pending_sync', JSON.stringify(filtered));
      } catch {}

      return (data as WalkSession) || localSession;
    } catch (err) {
      console.error('[Supabase saveWalkSession catch]', err);
      return localSession;
    }
  }

  async updateWalkSession(id: string, updates: Partial<WalkSession>): Promise<WalkSession> {
    const localUpdated = await this.fallback.updateWalkSession(id, updates);

    if (!isSupabaseConfigured || !supabase) {
      return localUpdated;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return localUpdated;

      const { data, error } = await supabase
        .from('walk_sessions')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error || !data) {
        console.error('[Supabase updateWalkSession error]', error);
        return localUpdated;
      }

      return data as WalkSession;
    } catch (err) {
      console.error('[Supabase updateWalkSession exception]', err);
      return localUpdated;
    }
  }

  async deleteWalkSession(id: string): Promise<void> {
    await this.fallback.deleteWalkSession(id);

    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('walk_sessions')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('[Supabase deleteWalkSession error]', error);
      }
    } catch (err) {
      console.error('[Supabase deleteWalkSession exception]', err);
    }
  }

  // Learning Sprints
  async getLearningSprints(): Promise<LearningSprint[]> {
    if (!isSupabaseConfigured || !supabase) {
      return this.fallback.getLearningSprints();
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return this.fallback.getLearningSprints();

      const { data, error } = await supabase
        .from('learning_sprints')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error || !data) {
        console.warn('[Supabase getLearningSprints error, using fallback]', error);
        return this.fallback.getLearningSprints();
      }

      // Sync returned sprints locally
      if (Array.isArray(data)) {
        for (const sprint of data) {
          await this.fallback.saveLearningSprint(sprint);
        }
      }

      return data as LearningSprint[];
    } catch (err) {
      console.error('[Supabase getLearningSprints exception]', err);
      return this.fallback.getLearningSprints();
    }
  }

  async saveLearningSprint(sprint: LearningSprint): Promise<LearningSprint> {
    const localSaved = await this.fallback.saveLearningSprint(sprint);

    if (!isSupabaseConfigured || !supabase) {
      return localSaved;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return localSaved;

      const payload = {
        id: sprint.id,
        user_id: user.id,
        topic: sprint.topic,
        category: sprint.category || 'General Knowledge',
        difficulty: sprint.difficulty || 'medium',
        status: sprint.status || 'completed',
        target_duration_seconds: sprint.target_duration_seconds || 900,
        actual_duration_seconds: sprint.actual_duration_seconds || 0,
        started_at: sprint.started_at,
        completed_at: sprint.completed_at || null,
        notes: sprint.notes || '',
        key_questions: sprint.key_questions || [],
        key_points: sprint.key_points || [],
        new_words: sprint.new_words || [],
        confusions: sprint.confusions || null,
        explanation: sprint.explanation || null,
        explain_it_back: sprint.explain_it_back || null,
        sources: sprint.sources || [],
        is_favorite: Boolean(sprint.is_favorite),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('learning_sprints')
        .upsert(payload)
        .select()
        .single();

      if (error) {
        console.error('[Supabase saveLearningSprint error]', error);
        try {
          const pending = JSON.parse(localStorage.getItem('planora_learning_pending_sync') || '[]');
          if (!pending.some((s: any) => s.id === sprint.id)) {
            pending.push({ type: 'sprint', data: sprint });
            localStorage.setItem('planora_learning_pending_sync', JSON.stringify(pending));
          }
        } catch {}
        return localSaved;
      }

      return (data as LearningSprint) || localSaved;
    } catch (err) {
      console.error('[Supabase saveLearningSprint catch]', err);
      return localSaved;
    }
  }

  async updateLearningSprint(id: string, updates: Partial<LearningSprint>): Promise<LearningSprint> {
    const localUpdated = await this.fallback.updateLearningSprint(id, updates);

    if (!isSupabaseConfigured || !supabase) {
      return localUpdated;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return localUpdated;

      const { data, error } = await supabase
        .from('learning_sprints')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error || !data) {
        console.error('[Supabase updateLearningSprint error]', error);
        return localUpdated;
      }

      return data as LearningSprint;
    } catch (err) {
      console.error('[Supabase updateLearningSprint catch]', err);
      return localUpdated;
    }
  }

  async deleteLearningSprint(id: string): Promise<void> {
    await this.fallback.deleteLearningSprint(id);

    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('learning_sprints')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('[Supabase deleteLearningSprint error]', error);
      }
    } catch (err) {
      console.error('[Supabase deleteLearningSprint catch]', err);
    }
  }

  // Knowledge Vault Items
  async getKnowledgeItems(): Promise<KnowledgeItem[]> {
    if (!isSupabaseConfigured || !supabase) {
      return this.fallback.getKnowledgeItems();
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return this.fallback.getKnowledgeItems();

      const { data, error } = await supabase
        .from('knowledge_items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error || !data) {
        console.warn('[Supabase getKnowledgeItems error, using fallback]', error);
        return this.fallback.getKnowledgeItems();
      }

      if (Array.isArray(data)) {
        for (const item of data) {
          await this.fallback.saveKnowledgeItem(item);
        }
      }

      return data as KnowledgeItem[];
    } catch (err) {
      console.error('[Supabase getKnowledgeItems exception]', err);
      return this.fallback.getKnowledgeItems();
    }
  }

  async saveKnowledgeItem(item: KnowledgeItem): Promise<KnowledgeItem> {
    const localSaved = await this.fallback.saveKnowledgeItem(item);

    if (!isSupabaseConfigured || !supabase) {
      return localSaved;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return localSaved;

      const payload = {
        id: item.id,
        user_id: user.id,
        source_sprint_id: item.source_sprint_id || null,
        title: item.title,
        type: item.type || 'sprint',
        category: item.category || 'General Knowledge',
        tags: item.tags || [],
        summary: item.summary || null,
        content: item.content || '',
        key_points: item.key_points || [],
        sources: item.sources || [],
        related_words: item.related_words || [],
        is_favorite: Boolean(item.is_favorite),
        is_archived: Boolean(item.is_archived),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('knowledge_items')
        .upsert(payload)
        .select()
        .single();

      if (error) {
        console.error('[Supabase saveKnowledgeItem error]', error);
        return localSaved;
      }

      return (data as KnowledgeItem) || localSaved;
    } catch (err) {
      console.error('[Supabase saveKnowledgeItem catch]', err);
      return localSaved;
    }
  }

  async updateKnowledgeItem(id: string, updates: Partial<KnowledgeItem>): Promise<KnowledgeItem> {
    const localUpdated = await this.fallback.updateKnowledgeItem(id, updates);

    if (!isSupabaseConfigured || !supabase) {
      return localUpdated;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return localUpdated;

      const { data, error } = await supabase
        .from('knowledge_items')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error || !data) {
        console.error('[Supabase updateKnowledgeItem error]', error);
        return localUpdated;
      }

      return data as KnowledgeItem;
    } catch (err) {
      console.error('[Supabase updateKnowledgeItem catch]', err);
      return localUpdated;
    }
  }

  async deleteKnowledgeItem(id: string): Promise<void> {
    await this.fallback.deleteKnowledgeItem(id);

    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('knowledge_items')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('[Supabase deleteKnowledgeItem error]', error);
      }
    } catch (err) {
      console.error('[Supabase deleteKnowledgeItem catch]', err);
    }
  }

  // Vocabulary Items
  async getVocabularyItems(): Promise<VocabularyItem[]> {
    if (!isSupabaseConfigured || !supabase) {
      return this.fallback.getVocabularyItems();
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return this.fallback.getVocabularyItems();

      const { data, error } = await supabase
        .from('vocabulary_items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error || !data) {
        console.warn('[Supabase getVocabularyItems error, using fallback]', error);
        return this.fallback.getVocabularyItems();
      }

      if (Array.isArray(data)) {
        for (const v of data) {
          await this.fallback.saveVocabularyItem(v);
        }
      }

      return data as VocabularyItem[];
    } catch (err) {
      console.error('[Supabase getVocabularyItems exception]', err);
      return this.fallback.getVocabularyItems();
    }
  }

  async saveVocabularyItem(item: VocabularyItem): Promise<VocabularyItem> {
    const localSaved = await this.fallback.saveVocabularyItem(item);

    if (!isSupabaseConfigured || !supabase) {
      return localSaved;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return localSaved;

      const payload = {
        id: item.id,
        user_id: user.id,
        source_knowledge_id: item.source_knowledge_id || null,
        source_sprint_id: item.source_sprint_id || null,
        word: item.word,
        meaning: item.meaning,
        example: item.example || null,
        category: item.category || 'General',
        tags: item.tags || [],
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('vocabulary_items')
        .upsert(payload)
        .select()
        .single();

      if (error) {
        console.error('[Supabase saveVocabularyItem error]', error);
        return localSaved;
      }

      return (data as VocabularyItem) || localSaved;
    } catch (err) {
      console.error('[Supabase saveVocabularyItem catch]', err);
      return localSaved;
    }
  }

  async deleteVocabularyItem(id: string): Promise<void> {
    await this.fallback.deleteVocabularyItem(id);

    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('vocabulary_items')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('[Supabase deleteVocabularyItem error]', error);
      }
    } catch (err) {
      console.error('[Supabase deleteVocabularyItem catch]', err);
    }
  }

  // Focus Sessions / Deep Work
  async getFocusSessions(): Promise<FocusSession[]> {
    if (!isSupabaseConfigured || !supabase) {
      return this.fallback.getFocusSessions();
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return this.fallback.getFocusSessions();

      const { data, error } = await supabase
        .from('focus_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false });

      if (error || !data) {
        console.warn('[Supabase getFocusSessions error, using fallback]', error);
        return this.fallback.getFocusSessions();
      }

      if (Array.isArray(data)) {
        for (const s of data) {
          await this.fallback.saveFocusSession(s);
        }
      }

      return data as FocusSession[];
    } catch (err) {
      console.error('[Supabase getFocusSessions exception]', err);
      return this.fallback.getFocusSessions();
    }
  }

  async saveFocusSession(session: FocusSession): Promise<FocusSession> {
    const localSaved = await this.fallback.saveFocusSession(session);

    if (!isSupabaseConfigured || !supabase) {
      return localSaved;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return localSaved;

      const payload = {
        id: session.id,
        user_id: user.id,
        title: session.title,
        category: session.category || 'Research',
        related_goal_id: session.related_goal_id || null,
        related_paper_id: session.related_paper_id || null,
        related_subject_id: session.related_subject_id || null,
        related_sprint_id: session.related_sprint_id || null,
        target_duration_seconds: session.target_duration_seconds || 1500,
        actual_duration_seconds: session.actual_duration_seconds || 0,
        started_at: session.started_at,
        ended_at: session.ended_at || null,
        distraction_count: session.distraction_count || 0,
        focus_rating: session.focus_rating || 5,
        energy_level: session.energy_level || 'medium',
        difficulty: session.difficulty || 'moderate',
        accomplishment: session.accomplishment || '',
        notes: session.notes || '',
        is_favorite: Boolean(session.is_favorite),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('focus_sessions')
        .upsert(payload)
        .select()
        .single();

      if (error) {
        console.error('[Supabase saveFocusSession error]', error);
        return localSaved;
      }

      return (data as FocusSession) || localSaved;
    } catch (err) {
      console.error('[Supabase saveFocusSession catch]', err);
      return localSaved;
    }
  }

  async updateFocusSession(id: string, updates: Partial<FocusSession>): Promise<FocusSession> {
    const localUpdated = await this.fallback.updateFocusSession(id, updates);

    if (!isSupabaseConfigured || !supabase) {
      return localUpdated;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return localUpdated;

      const { data, error } = await supabase
        .from('focus_sessions')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error || !data) {
        console.error('[Supabase updateFocusSession error]', error);
        return localUpdated;
      }

      return data as FocusSession;
    } catch (err) {
      console.error('[Supabase updateFocusSession catch]', err);
      return localUpdated;
    }
  }

  async deleteFocusSession(id: string): Promise<void> {
    await this.fallback.deleteFocusSession(id);

    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('focus_sessions')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('[Supabase deleteFocusSession error]', error);
      }
    } catch (err) {
      console.error('[Supabase deleteFocusSession catch]', err);
    }
  }

  // Research Paper Tracker
  async getResearchPapers(includeArchived: boolean = true, includeTrash: boolean = false): Promise<ResearchPaper[]> {
    if (!isSupabaseConfigured || !supabase) {
      return this.fallback.getResearchPapers(includeArchived, includeTrash);
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return this.fallback.getResearchPapers(includeArchived, includeTrash);

      let query = supabase
        .from('research_papers')
        .select('*')
        .eq('user_id', user.id);

      if (!includeTrash) {
        query = query.eq('is_trash', false);
      }
      if (!includeArchived) {
        query = query.eq('is_archived', false);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error || !data) {
        console.warn('[Supabase getResearchPapers error, using fallback]', error);
        return this.fallback.getResearchPapers(includeArchived, includeTrash);
      }

      if (Array.isArray(data)) {
        for (const p of data) {
          await this.fallback.saveResearchPaper(p);
        }
      }

      return data as ResearchPaper[];
    } catch (err) {
      console.error('[Supabase getResearchPapers exception]', err);
      return this.fallback.getResearchPapers(includeArchived, includeTrash);
    }
  }

  async getResearchPaperById(id: string): Promise<ResearchPaper | null> {
    if (!isSupabaseConfigured || !supabase) {
      return this.fallback.getResearchPaperById(id);
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return this.fallback.getResearchPaperById(id);

      const { data, error } = await supabase
        .from('research_papers')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error || !data) {
        return this.fallback.getResearchPaperById(id);
      }

      await this.fallback.saveResearchPaper(data);
      return data as ResearchPaper;
    } catch (err) {
      console.error('[Supabase getResearchPaperById exception]', err);
      return this.fallback.getResearchPaperById(id);
    }
  }

  async saveResearchPaper(paper: ResearchPaper): Promise<ResearchPaper> {
    const localSaved = await this.fallback.saveResearchPaper(paper);

    if (!isSupabaseConfigured || !supabase) {
      return localSaved;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return localSaved;

      const payload = {
        id: paper.id,
        user_id: user.id,
        title: paper.title,
        authors: paper.authors || '',
        year: paper.year || null,
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
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('research_papers')
        .upsert(payload)
        .select()
        .single();

      if (error) {
        console.error('[Supabase saveResearchPaper error]', error);
        return localSaved;
      }

      return (data as ResearchPaper) || localSaved;
    } catch (err) {
      console.error('[Supabase saveResearchPaper catch]', err);
      return localSaved;
    }
  }

  async updateResearchPaper(id: string, updates: Partial<ResearchPaper>): Promise<ResearchPaper> {
    const localUpdated = await this.fallback.updateResearchPaper(id, updates);

    if (!isSupabaseConfigured || !supabase) {
      return localUpdated;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return localUpdated;

      const { data, error } = await supabase
        .from('research_papers')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error || !data) {
        console.error('[Supabase updateResearchPaper error]', error);
        return localUpdated;
      }

      return data as ResearchPaper;
    } catch (err) {
      console.error('[Supabase updateResearchPaper catch]', err);
      return localUpdated;
    }
  }

  async deleteResearchPaper(id: string, permanent: boolean = false): Promise<void> {
    await this.fallback.deleteResearchPaper(id, permanent);

    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (permanent) {
        const { error } = await supabase
          .from('research_papers')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);

        if (error) console.error('[Supabase permanent deleteResearchPaper error]', error);
      } else {
        const { error } = await supabase
          .from('research_papers')
          .update({ is_trash: true, updated_at: new Date().toISOString() })
          .eq('id', id)
          .eq('user_id', user.id);

        if (error) console.error('[Supabase trash deleteResearchPaper error]', error);
      }
    } catch (err) {
      console.error('[Supabase deleteResearchPaper catch]', err);
    }
  }

  async restoreResearchPaper(id: string): Promise<void> {
    await this.fallback.restoreResearchPaper(id);

    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('research_papers')
        .update({ is_trash: false, is_archived: false, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) console.error('[Supabase restoreResearchPaper error]', error);
    } catch (err) {
      console.error('[Supabase restoreResearchPaper catch]', err);
    }
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
