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
    await this.fallback.moveToTrash(id);
    if (!isSupabaseConfigured || !supabase) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase
        .from('pages')
        .update({ is_deleted: true, deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id);
    } catch (e) {
      console.error('Error in moveToTrash:', e);
    }
  }

  async restoreFromTrash(id: string): Promise<void> {
    await this.fallback.restoreFromTrash(id);
    if (!isSupabaseConfigured || !supabase) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase
        .from('pages')
        .update({ is_deleted: false, deleted_at: null, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id);
    } catch (e) {
      console.error('Error in restoreFromTrash:', e);
    }
  }

  async permanentlyDeletePage(id: string): Promise<void> {
    await this.fallback.permanentlyDeletePage(id);
    if (!isSupabaseConfigured || !supabase) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('page_blocks').delete().eq('page_id', id);
      await supabase.from('pages').delete().eq('id', id).eq('user_id', user.id);
    } catch (e) {
      console.error('Error in permanentlyDeletePage:', e);
    }
  }

  async emptyTrash(): Promise<void> {
    await this.fallback.emptyTrash();
    if (!isSupabaseConfigured || !supabase) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('pages').select('id').eq('is_deleted', true).eq('user_id', user.id);
      if (data && data.length > 0) {
        const ids = data.map(p => p.id);
        await supabase.from('page_blocks').delete().in('page_id', ids);
        await supabase.from('pages').delete().in('id', ids).eq('user_id', user.id);
      }
    } catch (e) {
      console.error('Error in emptyTrash:', e);
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

  // Vocabulary Items (Durable Supabase + Spaced Repetition + Trash)
  async getVocabularyItems(includeTrash: boolean = false): Promise<VocabularyItem[]> {
    if (!isSupabaseConfigured || !supabase) {
      return this.fallback.getVocabularyItems(includeTrash);
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return this.fallback.getVocabularyItems(includeTrash);

      let query = supabase
        .from('vocabulary_items')
        .select('*')
        .eq('user_id', user.id);

      if (includeTrash) {
        query = query.eq('is_trash', true);
      } else {
        query = query.eq('is_trash', false);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error || !data) {
        console.warn('[Supabase getVocabularyItems error, using fallback]', error);
        return this.fallback.getVocabularyItems(includeTrash);
      }

      if (Array.isArray(data)) {
        for (const v of data) {
          await this.fallback.saveVocabularyItem(v);
        }
      }

      return data as VocabularyItem[];
    } catch (err) {
      console.error('[Supabase getVocabularyItems exception]', err);
      return this.fallback.getVocabularyItems(includeTrash);
    }
  }

  async getVocabularyItemById(id: string): Promise<VocabularyItem | null> {
    if (!isSupabaseConfigured || !supabase) {
      return this.fallback.getVocabularyItemById(id);
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return this.fallback.getVocabularyItemById(id);

      const { data, error } = await supabase
        .from('vocabulary_items')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error || !data) return this.fallback.getVocabularyItemById(id);
      return data as VocabularyItem;
    } catch {
      return this.fallback.getVocabularyItemById(id);
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
        id: localSaved.id,
        user_id: user.id,
        source_knowledge_id: localSaved.source_knowledge_id || null,
        source_sprint_id: localSaved.source_sprint_id || null,
        source_paper_id: localSaved.source_paper_id || null,
        source_type: localSaved.source_type || 'custom',
        source_title: localSaved.source_title || '',
        word: localSaved.word,
        meaning: localSaved.meaning || '',
        example: localSaved.example || null,
        synonyms: localSaved.synonyms || [],
        antonyms: localSaved.antonyms || [],
        part_of_speech: localSaved.part_of_speech || '',
        pronunciation: localSaved.pronunciation || '',
        category: localSaved.category || 'General',
        tags: localSaved.tags || [],
        my_notes: localSaved.my_notes || '',
        is_favorite: Boolean(localSaved.is_favorite),
        is_trash: Boolean(localSaved.is_trash),
        last_reviewed_at: localSaved.last_reviewed_at || null,
        next_review_at: localSaved.next_review_at || null,
        review_count: localSaved.review_count || 0,
        interval_days: localSaved.interval_days || 0,
        ease_factor: localSaved.ease_factor || 2.5,
        status: localSaved.status || 'new',
        created_at: localSaved.created_at,
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

  async updateVocabularyItem(id: string, updates: Partial<VocabularyItem>): Promise<VocabularyItem> {
    const localUpdated = await this.fallback.updateVocabularyItem(id, updates);

    if (!isSupabaseConfigured || !supabase) {
      return localUpdated;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return localUpdated;

      const { data, error } = await supabase
        .from('vocabulary_items')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error || !data) {
        console.error('[Supabase updateVocabularyItem error]', error);
        return localUpdated;
      }

      return data as VocabularyItem;
    } catch (err) {
      console.error('[Supabase updateVocabularyItem catch]', err);
      return localUpdated;
    }
  }

  async deleteVocabularyItem(id: string, permanent: boolean = false): Promise<void> {
    await this.fallback.deleteVocabularyItem(id, permanent);

    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (permanent) {
        const { error } = await supabase
          .from('vocabulary_items')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);

        if (error) console.error('[Supabase deleteVocabularyItem hard error]', error);
      } else {
        const { error } = await supabase
          .from('vocabulary_items')
          .update({
            is_trash: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .eq('user_id', user.id);

        if (error) console.error('[Supabase deleteVocabularyItem soft error]', error);
      }
    } catch (err) {
      console.error('[Supabase deleteVocabularyItem catch]', err);
    }
  }

  async restoreVocabularyItem(id: string): Promise<void> {
    await this.fallback.restoreVocabularyItem(id);

    if (!isSupabaseConfigured || !supabase) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('vocabulary_items')
        .update({
          is_trash: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) console.error('[Supabase restoreVocabularyItem error]', error);
    } catch (err) {
      console.error('[Supabase restoreVocabularyItem catch]', err);
    }
  }

  // Inbox / Quick Capture Items (Durable Supabase + Offline Queue + Organize)
  async getInboxItems(includeArchived: boolean = false, includeTrash: boolean = false): Promise<InboxItem[]> {
    if (!isSupabaseConfigured || !supabase) {
      return this.fallback.getInboxItems(includeArchived, includeTrash);
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return this.fallback.getInboxItems(includeArchived, includeTrash);

      let query = supabase
        .from('inbox_items')
        .select('*')
        .eq('user_id', user.id);

      if (includeTrash) {
        query = query.eq('is_trash', true);
      } else {
        query = query.eq('is_trash', false);
        if (!includeArchived) {
          query = query.eq('is_archived', false);
        }
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error || !data) {
        console.warn('[Supabase getInboxItems error, using fallback]', error);
        return this.fallback.getInboxItems(includeArchived, includeTrash);
      }

      if (Array.isArray(data)) {
        for (const item of data) {
          await this.fallback.saveInboxItem(item);
        }
      }

      return data as InboxItem[];
    } catch (err) {
      console.error('[Supabase getInboxItems exception]', err);
      return this.fallback.getInboxItems(includeArchived, includeTrash);
    }
  }

  async getInboxItemById(id: string): Promise<InboxItem | null> {
    if (!isSupabaseConfigured || !supabase) {
      return this.fallback.getInboxItemById(id);
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return this.fallback.getInboxItemById(id);

      const { data, error } = await supabase
        .from('inbox_items')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error || !data) return this.fallback.getInboxItemById(id);
      return data as InboxItem;
    } catch {
      return this.fallback.getInboxItemById(id);
    }
  }

  async saveInboxItem(item: InboxItem): Promise<InboxItem> {
    const localSaved = await this.fallback.saveInboxItem(item);

    if (!isSupabaseConfigured || !supabase) {
      return localSaved;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return localSaved;

      const payload = {
        id: localSaved.id,
        user_id: user.id,
        content: localSaved.content,
        title: localSaved.title || '',
        type: localSaved.type || 'note',
        tags: localSaved.tags || [],
        due_date: localSaved.due_date || null,
        url: localSaved.url || null,
        priority: localSaved.priority || 'medium',
        related_goal_id: localSaved.related_goal_id || null,
        related_paper_id: localSaved.related_paper_id || null,
        related_knowledge_id: localSaved.related_knowledge_id || null,
        is_organized: Boolean(localSaved.is_organized),
        organized_into: localSaved.organized_into || null,
        organized_at: localSaved.organized_at || null,
        is_archived: Boolean(localSaved.is_archived),
        is_trash: Boolean(localSaved.is_trash),
        is_completed: Boolean(localSaved.is_completed),
        created_at: localSaved.created_at,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('inbox_items')
        .upsert(payload)
        .select()
        .single();

      if (error) {
        console.error('[Supabase saveInboxItem error]', error);
        return localSaved;
      }

      return (data as InboxItem) || localSaved;
    } catch (err) {
      console.error('[Supabase saveInboxItem catch]', err);
      return localSaved;
    }
  }

  async updateInboxItem(id: string, updates: Partial<InboxItem>): Promise<InboxItem> {
    const localUpdated = await this.fallback.updateInboxItem(id, updates);

    if (!isSupabaseConfigured || !supabase) {
      return localUpdated;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return localUpdated;

      const { data, error } = await supabase
        .from('inbox_items')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error || !data) {
        console.error('[Supabase updateInboxItem error]', error);
        return localUpdated;
      }

      return data as InboxItem;
    } catch (err) {
      console.error('[Supabase updateInboxItem catch]', err);
      return localUpdated;
    }
  }

  async deleteInboxItem(id: string, permanent: boolean = false): Promise<void> {
    await this.fallback.deleteInboxItem(id, permanent);

    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (permanent) {
        const { error } = await supabase
          .from('inbox_items')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);

        if (error) console.error('[Supabase deleteInboxItem hard error]', error);
      } else {
        const { error } = await supabase
          .from('inbox_items')
          .update({
            is_trash: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .eq('user_id', user.id);

        if (error) console.error('[Supabase deleteInboxItem soft error]', error);
      }
    } catch (err) {
      console.error('[Supabase deleteInboxItem catch]', err);
    }
  }

  async restoreInboxItem(id: string): Promise<void> {
    await this.fallback.restoreInboxItem(id);

    if (!isSupabaseConfigured || !supabase) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('inbox_items')
        .update({
          is_trash: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) console.error('[Supabase restoreInboxItem error]', error);
    } catch (err) {
      console.error('[Supabase restoreInboxItem catch]', err);
    }
  }

  // Monthly Reviews
  async getMonthlyReviews(): Promise<MonthlyReview[]> {
    if (!isSupabaseConfigured || !supabase) {
      return this.fallback.getMonthlyReviews();
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return this.fallback.getMonthlyReviews();

      const { data, error } = await supabase
        .from('monthly_reviews')
        .select('*')
        .eq('user_id', user.id)
        .order('year', { ascending: false })
        .order('month_number', { ascending: false });

      if (error || !data) {
        console.warn('[Supabase getMonthlyReviews error, using fallback]', error);
        return this.fallback.getMonthlyReviews();
      }

      if (Array.isArray(data)) {
        for (const review of data) {
          await this.fallback.saveMonthlyReview(review);
        }
      }

      return data as MonthlyReview[];
    } catch (err) {
      console.error('[Supabase getMonthlyReviews exception]', err);
      return this.fallback.getMonthlyReviews();
    }
  }

  async getMonthlyReviewByMonth(monthKey: string): Promise<MonthlyReview | null> {
    if (!isSupabaseConfigured || !supabase) {
      return this.fallback.getMonthlyReviewByMonth(monthKey);
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return this.fallback.getMonthlyReviewByMonth(monthKey);

      const { data, error } = await supabase
        .from('monthly_reviews')
        .select('*')
        .eq('user_id', user.id)
        .eq('month_key', monthKey)
        .single();

      if (error || !data) return this.fallback.getMonthlyReviewByMonth(monthKey);
      return data as MonthlyReview;
    } catch {
      return this.fallback.getMonthlyReviewByMonth(monthKey);
    }
  }

  async saveMonthlyReview(review: MonthlyReview): Promise<MonthlyReview> {
    const localSaved = await this.fallback.saveMonthlyReview(review);

    if (!isSupabaseConfigured || !supabase) {
      return localSaved;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return localSaved;

      const payload = {
        id: localSaved.id,
        user_id: user.id,
        month_key: localSaved.month_key,
        month_label: localSaved.month_label || '',
        year: localSaved.year,
        month_number: localSaved.month_number,
        rating_overall: localSaved.rating_overall || 0,
        rating_productivity: localSaved.rating_productivity || 0,
        rating_energy: localSaved.rating_energy || 'medium',
        rating_focus: localSaved.rating_focus || 0,
        reflection: localSaved.reflection || {},
        next_month: localSaved.next_month || {},
        stats_snapshot: localSaved.stats_snapshot || {},
        notes: localSaved.notes || '',
        status: localSaved.status || 'draft',
        created_at: localSaved.created_at,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('monthly_reviews')
        .upsert(payload)
        .select()
        .single();

      if (error) {
        console.error('[Supabase saveMonthlyReview error]', error);
        return localSaved;
      }

      return (data as MonthlyReview) || localSaved;
    } catch (err) {
      console.error('[Supabase saveMonthlyReview catch]', err);
      return localSaved;
    }
  }

  async updateMonthlyReview(id: string, updates: Partial<MonthlyReview>): Promise<MonthlyReview> {
    const localUpdated = await this.fallback.updateMonthlyReview(id, updates);

    if (!isSupabaseConfigured || !supabase) {
      return localUpdated;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return localUpdated;

      const { data, error } = await supabase
        .from('monthly_reviews')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error || !data) {
        console.error('[Supabase updateMonthlyReview error]', error);
        return localUpdated;
      }

      return data as MonthlyReview;
    } catch (err) {
      console.error('[Supabase updateMonthlyReview catch]', err);
      return localUpdated;
    }
  }

  async deleteMonthlyReview(id: string): Promise<void> {
    await this.fallback.deleteMonthlyReview(id);

    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('monthly_reviews')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) console.error('[Supabase deleteMonthlyReview error]', error);
    } catch (err) {
      console.error('[Supabase deleteMonthlyReview catch]', err);
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

  // Weekly Reviews
  async getWeeklyReviews(): Promise<WeeklyReview[]> {
    if (!isSupabaseConfigured || !supabase) {
      return this.fallback.getWeeklyReviews();
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return this.fallback.getWeeklyReviews();

      const { data, error } = await supabase
        .from('weekly_reviews')
        .select('*')
        .eq('user_id', user.id)
        .order('week_start_date', { ascending: false });

      if (error || !data) {
        console.warn('[Supabase getWeeklyReviews error, using fallback]', error);
        return this.fallback.getWeeklyReviews();
      }

      if (Array.isArray(data)) {
        for (const r of data) {
          await this.fallback.saveWeeklyReview(r);
        }
      }

      return data as WeeklyReview[];
    } catch (err) {
      console.error('[Supabase getWeeklyReviews exception]', err);
      return this.fallback.getWeeklyReviews();
    }
  }

  async getWeeklyReviewByWeek(weekStartDate: string): Promise<WeeklyReview | null> {
    if (!isSupabaseConfigured || !supabase) {
      return this.fallback.getWeeklyReviewByWeek(weekStartDate);
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return this.fallback.getWeeklyReviewByWeek(weekStartDate);

      const { data, error } = await supabase
        .from('weekly_reviews')
        .select('*')
        .eq('week_start_date', weekStartDate)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error || !data) {
        return this.fallback.getWeeklyReviewByWeek(weekStartDate);
      }

      await this.fallback.saveWeeklyReview(data);
      return data as WeeklyReview;
    } catch (err) {
      console.error('[Supabase getWeeklyReviewByWeek exception]', err);
      return this.fallback.getWeeklyReviewByWeek(weekStartDate);
    }
  }

  async saveWeeklyReview(review: WeeklyReview): Promise<WeeklyReview> {
    const localSaved = await this.fallback.saveWeeklyReview(review);

    if (!isSupabaseConfigured || !supabase) {
      return localSaved;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return localSaved;

      const payload = {
        id: review.id,
        user_id: user.id,
        week_start_date: review.week_start_date,
        week_end_date: review.week_end_date,
        title: review.title || `Weekly Review (${review.week_start_date} – ${review.week_end_date})`,
        status: review.status || 'draft',
        rating_overall: review.rating_overall || 0,
        rating_energy: review.rating_energy || 'medium',
        rating_productivity: review.rating_productivity || 0,
        rating_stress: review.rating_stress || 0,
        reflection: review.reflection || {},
        next_week: review.next_week || {},
        stats_snapshot: review.stats_snapshot || {},
        notes: review.notes || '',
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('weekly_reviews')
        .upsert(payload)
        .select()
        .single();

      if (error) {
        console.error('[Supabase saveWeeklyReview error]', error);
        return localSaved;
      }

      return (data as WeeklyReview) || localSaved;
    } catch (err) {
      console.error('[Supabase saveWeeklyReview catch]', err);
      return localSaved;
    }
  }

  async updateWeeklyReview(id: string, updates: Partial<WeeklyReview>): Promise<WeeklyReview> {
    const localUpdated = await this.fallback.updateWeeklyReview(id, updates);

    if (!isSupabaseConfigured || !supabase) {
      return localUpdated;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return localUpdated;

      const { data, error } = await supabase
        .from('weekly_reviews')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error || !data) {
        console.error('[Supabase updateWeeklyReview error]', error);
        return localUpdated;
      }

      return data as WeeklyReview;
    } catch (err) {
      console.error('[Supabase updateWeeklyReview catch]', err);
      return localUpdated;
    }
  }

  async deleteWeeklyReview(id: string): Promise<void> {
    await this.fallback.deleteWeeklyReview(id);

    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('weekly_reviews')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('[Supabase deleteWeeklyReview error]', error);
      }
    } catch (err) {
      console.error('[Supabase deleteWeeklyReview catch]', err);
    }
  }

  // Goals
  async getGoals(includeArchived: boolean = true, includeTrash: boolean = false): Promise<Goal[]> {
    if (!isSupabaseConfigured || !supabase) {
      return this.fallback.getGoals(includeArchived, includeTrash);
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return this.fallback.getGoals(includeArchived, includeTrash);

      let query = supabase
        .from('goals')
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
        console.warn('[Supabase getGoals error, using fallback]', error);
        return this.fallback.getGoals(includeArchived, includeTrash);
      }

      if (Array.isArray(data)) {
        for (const g of data) {
          await this.fallback.saveGoal(g);
        }
      }

      return data as Goal[];
    } catch (err) {
      console.error('[Supabase getGoals exception]', err);
      return this.fallback.getGoals(includeArchived, includeTrash);
    }
  }

  async getGoalById(id: string): Promise<Goal | null> {
    if (!isSupabaseConfigured || !supabase) {
      return this.fallback.getGoalById(id);
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return this.fallback.getGoalById(id);

      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error || !data) {
        return this.fallback.getGoalById(id);
      }

      await this.fallback.saveGoal(data);
      return data as Goal;
    } catch (err) {
      console.error('[Supabase getGoalById exception]', err);
      return this.fallback.getGoalById(id);
    }
  }

  async saveGoal(goal: Goal): Promise<Goal> {
    const localSaved = await this.fallback.saveGoal(goal);

    if (!isSupabaseConfigured || !supabase) {
      return localSaved;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return localSaved;

      const payload = {
        id: goal.id,
        user_id: user.id,
        title: goal.title,
        description: goal.description || '',
        category: goal.category || 'Personal',
        priority: goal.priority || 'medium',
        status: goal.status || 'not_started',
        start_date: goal.start_date || null,
        target_date: goal.target_date || null,
        why_it_matters: goal.why_it_matters || '',
        progress: typeof goal.progress === 'number' ? goal.progress : 0,
        is_favorite: Boolean(goal.is_favorite),
        is_archived: Boolean(goal.is_archived),
        is_trash: Boolean(goal.is_trash),
        notes: goal.notes || '',
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('goals')
        .upsert(payload)
        .select()
        .single();

      if (error) {
        console.error('[Supabase saveGoal error]', error);
        return localSaved;
      }

      return (data as Goal) || localSaved;
    } catch (err) {
      console.error('[Supabase saveGoal catch]', err);
      return localSaved;
    }
  }

  async updateGoal(id: string, updates: Partial<Goal>): Promise<Goal> {
    const localUpdated = await this.fallback.updateGoal(id, updates);

    if (!isSupabaseConfigured || !supabase) {
      return localUpdated;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return localUpdated;

      const { data, error } = await supabase
        .from('goals')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error || !data) {
        console.error('[Supabase updateGoal error]', error);
        return localUpdated;
      }

      return data as Goal;
    } catch (err) {
      console.error('[Supabase updateGoal catch]', err);
      return localUpdated;
    }
  }

  async deleteGoal(id: string, permanent: boolean = false): Promise<void> {
    await this.fallback.deleteGoal(id, permanent);

    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (permanent) {
        const { error } = await supabase
          .from('goals')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);

        if (error) console.error('[Supabase permanent deleteGoal error]', error);
      } else {
        const { error } = await supabase
          .from('goals')
          .update({ is_trash: true, updated_at: new Date().toISOString() })
          .eq('id', id)
          .eq('user_id', user.id);

        if (error) console.error('[Supabase trash deleteGoal error]', error);
      }
    } catch (err) {
      console.error('[Supabase deleteGoal catch]', err);
    }
  }

  async restoreGoal(id: string): Promise<void> {
    await this.fallback.restoreGoal(id);

    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('goals')
        .update({ is_trash: false, is_archived: false, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) console.error('[Supabase restoreGoal error]', error);
    } catch (err) {
      console.error('[Supabase restoreGoal catch]', err);
    }
  }

  // Milestones
  async getMilestonesByGoalId(goalId: string): Promise<GoalMilestone[]> {
    if (!isSupabaseConfigured || !supabase) {
      return this.fallback.getMilestonesByGoalId(goalId);
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return this.fallback.getMilestonesByGoalId(goalId);

      const { data, error } = await supabase
        .from('goal_milestones')
        .select('*')
        .eq('goal_id', goalId)
        .eq('user_id', user.id)
        .order('position', { ascending: true });

      if (error || !data) {
        console.warn('[Supabase getMilestonesByGoalId error, using fallback]', error);
        return this.fallback.getMilestonesByGoalId(goalId);
      }

      if (Array.isArray(data)) {
        for (const m of data) {
          await this.fallback.saveMilestone(m);
        }
      }

      return data as GoalMilestone[];
    } catch (err) {
      console.error('[Supabase getMilestonesByGoalId exception]', err);
      return this.fallback.getMilestonesByGoalId(goalId);
    }
  }

  async saveMilestone(milestone: GoalMilestone): Promise<GoalMilestone> {
    const localSaved = await this.fallback.saveMilestone(milestone);

    if (!isSupabaseConfigured || !supabase) {
      return localSaved;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return localSaved;

      const payload = {
        id: milestone.id,
        goal_id: milestone.goal_id,
        user_id: user.id,
        title: milestone.title,
        description: milestone.description || '',
        target_date: milestone.target_date || null,
        status: milestone.status || 'pending',
        position: typeof milestone.position === 'number' ? milestone.position : 0,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('goal_milestones')
        .upsert(payload)
        .select()
        .single();

      if (error) {
        console.error('[Supabase saveMilestone error]', error);
        return localSaved;
      }

      return (data as GoalMilestone) || localSaved;
    } catch (err) {
      console.error('[Supabase saveMilestone catch]', err);
      return localSaved;
    }
  }

  async updateMilestone(id: string, updates: Partial<GoalMilestone>): Promise<GoalMilestone> {
    const localUpdated = await this.fallback.updateMilestone(id, updates);

    if (!isSupabaseConfigured || !supabase) {
      return localUpdated;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return localUpdated;

      const { data, error } = await supabase
        .from('goal_milestones')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error || !data) {
        console.error('[Supabase updateMilestone error]', error);
        return localUpdated;
      }

      return data as GoalMilestone;
    } catch (err) {
      console.error('[Supabase updateMilestone catch]', err);
      return localUpdated;
    }
  }

  async deleteMilestone(id: string): Promise<void> {
    await this.fallback.deleteMilestone(id);

    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('goal_milestones')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) console.error('[Supabase deleteMilestone error]', error);
    } catch (err) {
      console.error('[Supabase deleteMilestone catch]', err);
    }
  }

  async reorderMilestones(goalId: string, orderedMilestoneIds: string[]): Promise<void> {
    await this.fallback.reorderMilestones(goalId, orderedMilestoneIds);

    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      for (let i = 0; i < orderedMilestoneIds.length; i++) {
        await supabase
          .from('goal_milestones')
          .update({ position: i, updated_at: new Date().toISOString() })
          .eq('id', orderedMilestoneIds[i])
          .eq('user_id', user.id);
      }
    } catch (err) {
      console.error('[Supabase reorderMilestones catch]', err);
    }
  }

  // Goal Tasks
  async getGoalTasks(goalId?: string, milestoneId?: string): Promise<GoalTask[]> {
    if (!isSupabaseConfigured || !supabase) {
      return this.fallback.getGoalTasks(goalId, milestoneId);
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return this.fallback.getGoalTasks(goalId, milestoneId);

      let query = supabase
        .from('goal_tasks')
        .select('*')
        .eq('user_id', user.id);

      if (goalId) query = query.eq('goal_id', goalId);
      if (milestoneId) query = query.eq('milestone_id', milestoneId);

      const { data, error } = await query.order('position', { ascending: true });

      if (error || !data) {
        console.warn('[Supabase getGoalTasks error, using fallback]', error);
        return this.fallback.getGoalTasks(goalId, milestoneId);
      }

      if (Array.isArray(data)) {
        for (const t of data) {
          await this.fallback.saveGoalTask(t);
        }
      }

      return data as GoalTask[];
    } catch (err) {
      console.error('[Supabase getGoalTasks exception]', err);
      return this.fallback.getGoalTasks(goalId, milestoneId);
    }
  }

  async saveGoalTask(task: GoalTask): Promise<GoalTask> {
    const localSaved = await this.fallback.saveGoalTask(task);

    if (!isSupabaseConfigured || !supabase) {
      return localSaved;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return localSaved;

      const payload = {
        id: task.id,
        goal_id: task.goal_id,
        milestone_id: task.milestone_id || null,
        user_id: user.id,
        title: task.title,
        is_completed: Boolean(task.is_completed),
        due_date: task.due_date || null,
        priority: task.priority || 'medium',
        notes: task.notes || '',
        position: typeof task.position === 'number' ? task.position : 0,
        daily_planner_date: task.daily_planner_date || null,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('goal_tasks')
        .upsert(payload)
        .select()
        .single();

      if (error) {
        console.error('[Supabase saveGoalTask error]', error);
        return localSaved;
      }

      return (data as GoalTask) || localSaved;
    } catch (err) {
      console.error('[Supabase saveGoalTask catch]', err);
      return localSaved;
    }
  }

  async updateGoalTask(id: string, updates: Partial<GoalTask>): Promise<GoalTask> {
    const localUpdated = await this.fallback.updateGoalTask(id, updates);

    if (!isSupabaseConfigured || !supabase) {
      return localUpdated;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return localUpdated;

      const { data, error } = await supabase
        .from('goal_tasks')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error || !data) {
        console.error('[Supabase updateGoalTask error]', error);
        return localUpdated;
      }

      return data as GoalTask;
    } catch (err) {
      console.error('[Supabase updateGoalTask catch]', err);
      return localUpdated;
    }
  }

  async deleteGoalTask(id: string): Promise<void> {
    await this.fallback.deleteGoalTask(id);

    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('goal_tasks')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) console.error('[Supabase deleteGoalTask error]', error);
    } catch (err) {
      console.error('[Supabase deleteGoalTask catch]', err);
    }
  }

  async exportData(): Promise<PlannerBackup> {
    if (!isSupabaseConfigured || !supabase) {
      return this.fallback.exportData();
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return this.fallback.exportData();
      }

      // Parallelize fetching all models for authenticated user
      const [
        profile,
        pages,
        walks,
        sprints,
        vault,
        vocab,
        inbox,
        monthly,
        focus,
        papers,
        weekly,
        goals,
        milestones,
        tasks
      ] = await Promise.all([
        this.getProfile(),
        this.getPages(true),
        this.getWalkSessions(),
        this.getLearningSprints(),
        this.getKnowledgeItems(),
        this.getVocabularyItems(true),
        this.getInboxItems(true, true),
        this.getMonthlyReviews(),
        this.getFocusSessions(),
        this.getResearchPapers(true),
        this.getWeeklyReviews(),
        this.getGoals(true),
        this.fallback.exportData().then(d => d.goalMilestones || []),
        this.getGoalTasks(),
      ]);

      // Collect all page blocks
      const allBlocks: PageBlock[] = [];
      for (const p of pages) {
        const blocks = await this.getBlocksByPageId(p.id);
        allBlocks.push(...blocks);
      }

      return {
        app: 'Planora',
        version: 1,
        exportedAt: new Date().toISOString(),
        profile,
        pages,
        blocks: allBlocks,
        walkSessions: walks,
        learningSprints: sprints,
        knowledgeItems: vault,
        vocabularyItems: vocab,
        inboxItems: inbox,
        monthlyReviews: monthly,
        focusSessions: focus,
        researchPapers: papers,
        weeklyReviews: weekly,
        goals,
        goalMilestones: milestones,
        goalTasks: tasks,
      };
    } catch (err) {
      console.error('[Supabase exportData exception, fallback to local]', err);
      return this.fallback.exportData();
    }
  }

  async importData(data: PlannerBackup, mode: 'merge' | 'replace' = 'merge'): Promise<BackupImportResult> {
    const localResult = await this.fallback.importData(data, mode);

    if (!isSupabaseConfigured || !supabase) {
      return localResult;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return localResult;

      // Sync imported items to Supabase asynchronously
      if (Array.isArray(data.pages)) {
        for (const p of data.pages) {
          await this.createPage(p).catch(() => {});
        }
      }
      if (Array.isArray(data.blocks)) {
        for (const b of data.blocks) {
          await this.saveBlock(b).catch(() => {});
        }
      }
      if (Array.isArray(data.vocabularyItems)) {
        for (const v of data.vocabularyItems) {
          await this.saveVocabularyItem(v).catch(() => {});
        }
      }
      if (Array.isArray(data.inboxItems)) {
        for (const i of data.inboxItems) {
          await this.saveInboxItem(i).catch(() => {});
        }
      }
      if (Array.isArray(data.monthlyReviews)) {
        for (const m of data.monthlyReviews) {
          await this.saveMonthlyReview(m).catch(() => {});
        }
      }
      if (Array.isArray(data.goals)) {
        for (const g of data.goals) {
          await this.saveGoal(g).catch(() => {});
        }
      }
      if (Array.isArray(data.researchPapers)) {
        for (const p of data.researchPapers) {
          await this.saveResearchPaper(p).catch(() => {});
        }
      }
    } catch (err) {
      console.error('[Supabase importData sync exception]', err);
    }

    return localResult;
  }

  async resetToDefault(): Promise<void> {
    return this.fallback.resetToDefault();
  }
}

export const supabasePlannerStorage = new SupabasePlannerStorage();
