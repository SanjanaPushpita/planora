'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { IPlannerStorage } from './storage-interface';
import { localPlannerStorage } from './local-storage';
import { supabasePlannerStorage } from './supabase-storage';
import { isSupabaseConfigured } from '../../supabase/client';
import { 
  PlannerPage, 
  UserProfile, 
  PageBlock,
  PageType,
  ChecklistBlockContent,
  HabitBlockContent,
  StudyLogBlockContent,
  ParagraphContent,
  WalkSession
} from '../types';
import { DEFAULT_PROFILE } from './seed-data';

interface SearchResult {
  id: string;
  pageId: string;
  pageTitle: string;
  pageIcon: string;
  type: 'page' | 'task' | 'habit' | 'study' | 'note';
  title: string;
  subtitle?: string;
}

interface StorageContextType {
  storage: IPlannerStorage;
  profile: UserProfile;
  pages: PlannerPage[];
  trashPages: PlannerPage[];
  favorites: PlannerPage[];
  recentPages: PlannerPage[];
  walkSessions: WalkSession[];
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  walkSaveStatus: 'idle' | 'saving' | 'saved' | 'error' | 'unsynced';
  isLocked: boolean;
  isReady: boolean;
  setSaveStatus: (status: 'idle' | 'saving' | 'saved' | 'error') => void;
  refreshPages: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshWalkSessions: () => Promise<void>;
  saveWalkSession: (session: WalkSession) => Promise<WalkSession>;
  updateWalkSession: (id: string, updates: Partial<WalkSession>) => Promise<WalkSession>;
  deleteWalkSession: (id: string) => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  createPage: (params: {
    title: string;
    page_type: PageType;
    icon?: string;
    cover_color?: string;
    date?: string;
    metadata?: Record<string, any>;
  }) => Promise<PlannerPage>;
  updatePage: (id: string, updates: Partial<PlannerPage>) => Promise<PlannerPage>;
  duplicatePage: (id: string) => Promise<PlannerPage>;
  moveToTrash: (id: string) => Promise<void>;
  restoreFromTrash: (id: string) => Promise<void>;
  permanentlyDeletePage: (id: string) => Promise<void>;
  emptyTrash: () => Promise<void>;
  unlock: (passcode: string) => Promise<boolean>;
  lock: () => Promise<void>;
  searchAll: (query: string) => Promise<SearchResult[]>;
}

const StorageContext = createContext<StorageContextType | null>(null);

export function StorageProvider({ children }: { children: React.ReactNode }) {
  // Choose engine: Supabase if configured, otherwise robust LocalStorage
  const storage: IPlannerStorage = isSupabaseConfigured ? supabasePlannerStorage : localPlannerStorage;

  // Initialize state directly from localStorage if available on the client for sub-millisecond first paint
  const [profile, setProfile] = useState<UserProfile>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('planora_user_profile');
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return DEFAULT_PROFILE;
  });

  const [pages, setPages] = useState<PlannerPage[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('planora_planner_pages');
        if (cached) {
          const parsed: PlannerPage[] = JSON.parse(cached);
          return parsed.filter(p => !p.is_deleted && !p.is_archived);
        }
      } catch {}
    }
    return [];
  });

  const [trashPages, setTrashPages] = useState<PlannerPage[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('planora_planner_pages');
        if (cached) {
          const parsed: PlannerPage[] = JSON.parse(cached);
          return parsed.filter(p => p.is_deleted);
        }
      } catch {}
    }
    return [];
  });

  const [walkSessions, setWalkSessions] = useState<WalkSession[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('planora_walk_sessions');
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return [];
  });

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [walkSaveStatus, setWalkSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error' | 'unsynced'>('idle');
  const [isLocked, setIsLocked] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const cachedProf = localStorage.getItem('planora_user_profile');
        const cachedLocked = localStorage.getItem('planora_session_locked');
        if (cachedProf) {
          const p = JSON.parse(cachedProf);
          return Boolean(p.passcode && cachedLocked === 'true');
        }
      } catch {}
    }
    return false;
  });

  // Ready instantly if local data was loaded, otherwise false until init completes
  const [isReady, setIsReady] = useState(false);

  const refreshProfile = useCallback(async () => {
    try {
      const p = await storage.getProfile();
      setProfile(p);
      setIsLocked(Boolean(p.passcode && p.isLocked));
    } catch (e) {
      console.error('Failed to load profile', e);
    }
  }, [storage]);

  const refreshPages = useCallback(async () => {
    try {
      const [active, trash] = await Promise.all([
        storage.getPages(false, false),
        storage.getPages(true, true),
      ]);
      setPages(active);
      setTrashPages(trash);
    } catch (e) {
      console.error('Failed to load pages', e);
    }
  }, [storage]);

  const refreshWalkSessions = useCallback(async () => {
    try {
      const list = await storage.getWalkSessions();
      setWalkSessions(list);
      if (typeof window !== 'undefined') {
        localStorage.setItem('planora_walk_sessions', JSON.stringify(list));
      }
    } catch (e) {
      console.error('Failed to load walk sessions', e);
    }
  }, [storage]);

  useEffect(() => {
    let mounted = true;
    async function init() {
      // Parallel execution for zero sequential blocking
      await Promise.all([refreshProfile(), refreshPages(), refreshWalkSessions()]);
      if (mounted) {
        setIsReady(true);
      }
    }
    init();

    const handleOnline = () => {
      refreshWalkSessions();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
    }

    return () => {
      mounted = false;
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
      }
    };
  }, [refreshProfile, refreshPages, refreshWalkSessions]);

  const saveWalkSession = async (session: WalkSession): Promise<WalkSession> => {
    setWalkSaveStatus('saving');
    try {
      const saved = await storage.saveWalkSession(session);
      setWalkSessions((prev) => [saved, ...prev.filter((s) => s.id !== saved.id)]);
      setWalkSaveStatus('saved');
      setTimeout(() => setWalkSaveStatus('idle'), 3000);
      return saved;
    } catch (e) {
      console.error('Save walk session error:', e);
      setWalkSessions((prev) => [session, ...prev.filter((s) => s.id !== session.id)]);
      setWalkSaveStatus('unsynced');
      throw e;
    }
  };

  const updateWalkSession = async (id: string, updates: Partial<WalkSession>): Promise<WalkSession> => {
    setWalkSaveStatus('saving');
    try {
      const updated = await storage.updateWalkSession(id, updates);
      setWalkSessions((prev) => prev.map((s) => (s.id === id ? updated : s)));
      setWalkSaveStatus('saved');
      setTimeout(() => setWalkSaveStatus('idle'), 2500);
      return updated;
    } catch (e) {
      console.error('Update walk session error:', e);
      setWalkSaveStatus('error');
      throw e;
    }
  };

  const deleteWalkSession = async (id: string): Promise<void> => {
    setWalkSaveStatus('saving');
    try {
      await storage.deleteWalkSession(id);
      setWalkSessions((prev) => prev.filter((s) => s.id !== id));
      setWalkSaveStatus('saved');
      setTimeout(() => setWalkSaveStatus('idle'), 2000);
    } catch (e) {
      console.error('Delete walk session error:', e);
      setWalkSaveStatus('error');
      throw e;
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    setSaveStatus('saving');
    try {
      const updated = await storage.updateProfile(updates);
      setProfile(updated);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (e) {
      setSaveStatus('error');
      console.error(e);
    }
  };

  const createPage = async (params: {
    title: string;
    page_type: PageType;
    icon?: string;
    cover_color?: string;
    date?: string;
    metadata?: Record<string, any>;
  }) => {
    setSaveStatus('saving');
    try {
      const newPage = await storage.createPage(params);
      if (!newPage || !newPage.id) {
        throw new Error('Storage failed to return a valid page record.');
      }
      // Immediately register in React state pages for zero-latency UI consistency
      setPages((prev) => [newPage, ...prev.filter((p) => p.id !== newPage.id)]);
      await refreshPages();
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
      return newPage;
    } catch (e) {
      setSaveStatus('error');
      throw e;
    }
  };

  const updatePage = async (id: string, updates: Partial<PlannerPage>) => {
    setSaveStatus('saving');
    try {
      const updated = await storage.updatePage(id, updates);
      setPages((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 1500);
      return updated;
    } catch (e) {
      setSaveStatus('error');
      throw e;
    }
  };

  const duplicatePage = async (id: string) => {
    setSaveStatus('saving');
    try {
      const dup = await storage.duplicatePage(id);
      await refreshPages();
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
      return dup;
    } catch (e) {
      setSaveStatus('error');
      throw e;
    }
  };

  const moveToTrash = async (id: string) => {
    setSaveStatus('saving');
    try {
      await storage.moveToTrash(id);
      await refreshPages();
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (e) {
      setSaveStatus('error');
      throw e;
    }
  };

  const restoreFromTrash = async (id: string) => {
    setSaveStatus('saving');
    try {
      await storage.restoreFromTrash(id);
      await refreshPages();
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (e) {
      setSaveStatus('error');
      throw e;
    }
  };

  const permanentlyDeletePage = async (id: string) => {
    setSaveStatus('saving');
    try {
      await storage.permanentlyDeletePage(id);
      await refreshPages();
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (e) {
      setSaveStatus('error');
      throw e;
    }
  };

  const emptyTrash = async () => {
    setSaveStatus('saving');
    try {
      await storage.emptyTrash();
      await refreshPages();
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (e) {
      setSaveStatus('error');
      throw e;
    }
  };

  const unlock = async (passcode: string) => {
    const success = await storage.unlockWithPasscode(passcode);
    if (success) {
      setIsLocked(false);
    }
    return success;
  };

  const lock = async () => {
    await storage.lockSession();
    setIsLocked(true);
  };

  // Search across pages, blocks, checklist items, habits, study sessions
  const searchAll = async (query: string): Promise<SearchResult[]> => {
    if (!query || !query.trim()) return [];
    const q = query.toLowerCase().trim();
    const results: SearchResult[] = [];

    const allPages = await storage.getPages(true, false);

    for (const page of allPages) {
      if (page.title.toLowerCase().includes(q)) {
        results.push({
          id: `page-${page.id}`,
          pageId: page.id,
          pageTitle: page.title,
          pageIcon: page.icon,
          type: 'page',
          title: page.title,
          subtitle: `${page.page_type.toUpperCase()} planner`,
        });
      }

      // Check blocks in this page
      const blocks = await storage.getBlocksByPageId(page.id);
      for (const b of blocks) {
        if (b.type === 'checklist') {
          const content = b.content as ChecklistBlockContent;
          if (content?.items) {
            for (const item of content.items) {
              if (item.text.toLowerCase().includes(q)) {
                results.push({
                  id: `task-${item.id}`,
                  pageId: page.id,
                  pageTitle: page.title,
                  pageIcon: page.icon,
                  type: 'task',
                  title: item.text,
                  subtitle: `In ${page.title}`,
                });
              }
            }
          }
        } else if (b.type === 'habit_matrix') {
          const content = b.content as HabitBlockContent;
          if (content?.habits) {
            for (const h of content.habits) {
              if (h.name.toLowerCase().includes(q)) {
                results.push({
                  id: `habit-${h.id}`,
                  pageId: page.id,
                  pageTitle: page.title,
                  pageIcon: page.icon,
                  type: 'habit',
                  title: h.name,
                  subtitle: `Habit tracker in ${page.title}`,
                });
              }
            }
          }
        } else if (b.type === 'study_log') {
          const content = b.content as StudyLogBlockContent;
          if (content?.sessions) {
            for (const s of content.sessions) {
              if (s.subject.toLowerCase().includes(q) || s.topic.toLowerCase().includes(q)) {
                results.push({
                  id: `study-${s.id}`,
                  pageId: page.id,
                  pageTitle: page.title,
                  pageIcon: page.icon,
                  type: 'study',
                  title: `${s.subject}: ${s.topic}`,
                  subtitle: `Study log in ${page.title}`,
                });
              }
            }
          }
        } else if (b.type === 'paragraph') {
          const content = b.content as ParagraphContent;
          if (content?.text && content.text.toLowerCase().includes(q)) {
            const preview = content.text.substring(0, 70) + (content.text.length > 70 ? '...' : '');
            results.push({
              id: `block-${b.id}`,
              pageId: page.id,
              pageTitle: page.title,
              pageIcon: page.icon,
              type: 'note',
              title: preview,
              subtitle: `Note in ${page.title}`,
            });
          }
        }
      }
    }

    return results;
  };

  const favorites = pages.filter(p => p.is_favorite);
  const recentPages = [...pages].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 6);

  return (
    <StorageContext.Provider
      value={{
        storage,
        profile,
        pages,
        trashPages,
        favorites,
        recentPages,
        walkSessions,
        saveStatus,
        walkSaveStatus,
        isLocked,
        isReady,
        setSaveStatus,
        refreshPages,
        refreshProfile,
        refreshWalkSessions,
        saveWalkSession,
        updateWalkSession,
        deleteWalkSession,
        updateProfile,
        createPage,
        updatePage,
        duplicatePage,
        moveToTrash,
        restoreFromTrash,
        permanentlyDeletePage,
        emptyTrash,
        unlock,
        lock,
        searchAll,
      }}
    >
      {children}
    </StorageContext.Provider>
  );
}

export function usePlanner() {
  const context = useContext(StorageContext);
  if (!context) {
    throw new Error('usePlanner must be used within a StorageProvider');
  }
  return context;
}
