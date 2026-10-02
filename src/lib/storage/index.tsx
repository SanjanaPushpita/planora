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
  WalkSession,
  LearningSprint,
  KnowledgeItem,
  VocabularyItem,
  FocusSession,
  ResearchPaper
} from '../types';
import { DEFAULT_PROFILE } from './seed-data';

interface SearchResult {
  id: string;
  pageId?: string;
  pageTitle: string;
  pageIcon: string;
  type: 'page' | 'task' | 'habit' | 'study' | 'note' | 'sprint' | 'knowledge' | 'vocabulary' | 'paper' | 'focus';
  title: string;
  subtitle?: string;
  url?: string;
}

interface StorageContextType {
  storage: IPlannerStorage;
  profile: UserProfile;
  pages: PlannerPage[];
  trashPages: PlannerPage[];
  favorites: PlannerPage[];
  recentPages: PlannerPage[];
  walkSessions: WalkSession[];
  learningSprints: LearningSprint[];
  knowledgeItems: KnowledgeItem[];
  vocabularyItems: VocabularyItem[];
  focusSessions: FocusSession[];
  researchPapers: ResearchPaper[];
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  walkSaveStatus: 'idle' | 'saving' | 'saved' | 'error' | 'unsynced';
  learningSaveStatus: 'idle' | 'saving' | 'saved' | 'error' | 'unsynced';
  focusSaveStatus: 'idle' | 'saving' | 'saved' | 'error' | 'unsynced';
  paperSaveStatus: 'idle' | 'saving' | 'saved' | 'error' | 'unsynced';
  isLocked: boolean;
  isReady: boolean;
  setSaveStatus: (status: 'idle' | 'saving' | 'saved' | 'error') => void;
  refreshPages: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshWalkSessions: () => Promise<void>;
  refreshLearningData: () => Promise<void>;
  refreshFocusData: () => Promise<void>;
  refreshPapersData: () => Promise<void>;
  saveWalkSession: (session: WalkSession) => Promise<WalkSession>;
  updateWalkSession: (id: string, updates: Partial<WalkSession>) => Promise<WalkSession>;
  deleteWalkSession: (id: string) => Promise<void>;
  saveLearningSprint: (sprint: LearningSprint) => Promise<LearningSprint>;
  updateLearningSprint: (id: string, updates: Partial<LearningSprint>) => Promise<LearningSprint>;
  deleteLearningSprint: (id: string) => Promise<void>;
  saveKnowledgeItem: (item: KnowledgeItem) => Promise<KnowledgeItem>;
  updateKnowledgeItem: (id: string, updates: Partial<KnowledgeItem>) => Promise<KnowledgeItem>;
  deleteKnowledgeItem: (id: string) => Promise<void>;
  saveVocabularyItem: (item: VocabularyItem) => Promise<VocabularyItem>;
  deleteVocabularyItem: (id: string) => Promise<void>;
  saveFocusSession: (session: FocusSession) => Promise<FocusSession>;
  updateFocusSession: (id: string, updates: Partial<FocusSession>) => Promise<FocusSession>;
  deleteFocusSession: (id: string) => Promise<void>;
  saveResearchPaper: (paper: ResearchPaper) => Promise<ResearchPaper>;
  updateResearchPaper: (id: string, updates: Partial<ResearchPaper>) => Promise<ResearchPaper>;
  deleteResearchPaper: (id: string, permanent?: boolean) => Promise<void>;
  restoreResearchPaper: (id: string) => Promise<void>;
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
  duplicatePage(id: string): Promise<PlannerPage>;
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

  const [learningSprints, setLearningSprints] = useState<LearningSprint[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('planora_learning_sprints');
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return [];
  });

  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('planora_knowledge_items');
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return [];
  });

  const [vocabularyItems, setVocabularyItems] = useState<VocabularyItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('planora_vocabulary_items');
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return [];
  });

  const [focusSessions, setFocusSessions] = useState<FocusSession[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('planora_focus_sessions');
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return [];
  });

  const [researchPapers, setResearchPapers] = useState<ResearchPaper[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('planora_research_papers');
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return [];
  });

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [walkSaveStatus, setWalkSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error' | 'unsynced'>('idle');
  const [learningSaveStatus, setLearningSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error' | 'unsynced'>('idle');
  const [focusSaveStatus, setFocusSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error' | 'unsynced'>('idle');
  const [paperSaveStatus, setPaperSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error' | 'unsynced'>('idle');
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

  const refreshLearningData = useCallback(async () => {
    try {
      const [sprints, items, words] = await Promise.all([
        storage.getLearningSprints(),
        storage.getKnowledgeItems(),
        storage.getVocabularyItems(),
      ]);
      setLearningSprints(sprints);
      setKnowledgeItems(items);
      setVocabularyItems(words);
      if (typeof window !== 'undefined') {
        localStorage.setItem('planora_learning_sprints', JSON.stringify(sprints));
        localStorage.setItem('planora_knowledge_items', JSON.stringify(items));
        localStorage.setItem('planora_vocabulary_items', JSON.stringify(words));
      }
    } catch (e) {
      console.error('Failed to load learning data', e);
    }
  }, [storage]);

  const refreshFocusData = useCallback(async () => {
    try {
      const list = await storage.getFocusSessions();
      setFocusSessions(list);
      if (typeof window !== 'undefined') {
        localStorage.setItem('planora_focus_sessions', JSON.stringify(list));
      }
    } catch (e) {
      console.error('Failed to load focus sessions', e);
    }
  }, [storage]);

  const refreshPapersData = useCallback(async () => {
    try {
      const list = await storage.getResearchPapers(true, false);
      setResearchPapers(list);
      if (typeof window !== 'undefined') {
        localStorage.setItem('planora_research_papers', JSON.stringify(list));
      }
    } catch (e) {
      console.error('Failed to load research papers', e);
    }
  }, [storage]);

  useEffect(() => {
    let mounted = true;
    async function init() {
      // Parallel execution for zero sequential blocking
      await Promise.all([
        refreshProfile(), 
        refreshPages(), 
        refreshWalkSessions(), 
        refreshLearningData(),
        refreshFocusData(),
        refreshPapersData()
      ]);
      if (mounted) {
        setIsReady(true);
      }
    }
    init();

    const handleOnline = () => {
      refreshWalkSessions();
      refreshLearningData();
      refreshFocusData();
      refreshPapersData();
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
  }, [refreshProfile, refreshPages, refreshWalkSessions, refreshLearningData, refreshFocusData, refreshPapersData]);

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

  // Learning Sprint Actions
  const saveLearningSprint = async (sprint: LearningSprint): Promise<LearningSprint> => {
    setLearningSaveStatus('saving');
    try {
      const saved = await storage.saveLearningSprint(sprint);
      setLearningSprints((prev) => [saved, ...prev.filter((s) => s.id !== saved.id)]);

      // Auto-create/update connected Knowledge Item
      const knowledgeItem: KnowledgeItem = {
        id: `know-sprint-${saved.id}`,
        source_sprint_id: saved.id,
        title: saved.topic,
        type: 'sprint',
        category: saved.category,
        tags: [saved.category.toLowerCase().replace(/\s+/g, '-'), saved.difficulty, 'sprint'],
        summary: saved.explanation || saved.notes.substring(0, 140).replace(/<[^>]+>/g, ''),
        content: saved.notes,
        key_points: saved.key_points || [],
        sources: saved.sources || [],
        related_words: saved.new_words || [],
        is_favorite: Boolean(saved.is_favorite),
        created_at: saved.created_at,
        updated_at: new Date().toISOString(),
      };
      await saveKnowledgeItem(knowledgeItem);

      // Auto-save any new words to Vocabulary
      if (saved.new_words && saved.new_words.length > 0) {
        for (const w of saved.new_words) {
          if (w.word && w.meaning) {
            await saveVocabularyItem({
              id: `voc-${w.word.toLowerCase().replace(/\s+/g, '-')}`,
              source_sprint_id: saved.id,
              source_knowledge_id: knowledgeItem.id,
              word: w.word,
              meaning: w.meaning,
              example: w.example,
              category: saved.category,
              tags: [saved.category.toLowerCase().replace(/\s+/g, '-')],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          }
        }
      }

      setLearningSaveStatus('saved');
      setTimeout(() => setLearningSaveStatus('idle'), 3000);
      return saved;
    } catch (e) {
      console.error('Save learning sprint error:', e);
      setLearningSprints((prev) => [sprint, ...prev.filter((s) => s.id !== sprint.id)]);
      setLearningSaveStatus('unsynced');
      throw e;
    }
  };

  const updateLearningSprint = async (id: string, updates: Partial<LearningSprint>): Promise<LearningSprint> => {
    setLearningSaveStatus('saving');
    try {
      const updated = await storage.updateLearningSprint(id, updates);
      setLearningSprints((prev) => prev.map((s) => (s.id === id ? updated : s)));
      setLearningSaveStatus('saved');
      setTimeout(() => setLearningSaveStatus('idle'), 2500);
      return updated;
    } catch (e) {
      console.error('Update learning sprint error:', e);
      setLearningSaveStatus('error');
      throw e;
    }
  };

  const deleteLearningSprint = async (id: string): Promise<void> => {
    setLearningSaveStatus('saving');
    try {
      await storage.deleteLearningSprint(id);
      setLearningSprints((prev) => prev.filter((s) => s.id !== id));
      setLearningSaveStatus('saved');
      setTimeout(() => setLearningSaveStatus('idle'), 2000);
    } catch (e) {
      console.error('Delete learning sprint error:', e);
      setLearningSaveStatus('error');
      throw e;
    }
  };

  // Knowledge Item Actions
  const saveKnowledgeItem = async (item: KnowledgeItem): Promise<KnowledgeItem> => {
    setLearningSaveStatus('saving');
    try {
      const saved = await storage.saveKnowledgeItem(item);
      setKnowledgeItems((prev) => [saved, ...prev.filter((i) => i.id !== saved.id)]);
      setLearningSaveStatus('saved');
      setTimeout(() => setLearningSaveStatus('idle'), 3000);
      return saved;
    } catch (e) {
      console.error('Save knowledge item error:', e);
      setKnowledgeItems((prev) => [item, ...prev.filter((i) => i.id !== item.id)]);
      setLearningSaveStatus('unsynced');
      throw e;
    }
  };

  const updateKnowledgeItem = async (id: string, updates: Partial<KnowledgeItem>): Promise<KnowledgeItem> => {
    setLearningSaveStatus('saving');
    try {
      const updated = await storage.updateKnowledgeItem(id, updates);
      setKnowledgeItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
      setLearningSaveStatus('saved');
      setTimeout(() => setLearningSaveStatus('idle'), 2500);
      return updated;
    } catch (e) {
      console.error('Update knowledge item error:', e);
      setLearningSaveStatus('error');
      throw e;
    }
  };

  const deleteKnowledgeItem = async (id: string): Promise<void> => {
    setLearningSaveStatus('saving');
    try {
      await storage.deleteKnowledgeItem(id);
      setKnowledgeItems((prev) => prev.filter((i) => i.id !== id));
      setLearningSaveStatus('saved');
      setTimeout(() => setLearningSaveStatus('idle'), 2000);
    } catch (e) {
      console.error('Delete knowledge item error:', e);
      setLearningSaveStatus('error');
      throw e;
    }
  };

  // Vocabulary Item Actions
  const saveVocabularyItem = async (item: VocabularyItem): Promise<VocabularyItem> => {
    try {
      const saved = await storage.saveVocabularyItem(item);
      setVocabularyItems((prev) => [saved, ...prev.filter((v) => v.id !== saved.id && v.word.toLowerCase() !== saved.word.toLowerCase())]);
      return saved;
    } catch (e) {
      console.error('Save vocabulary item error:', e);
      setVocabularyItems((prev) => [item, ...prev.filter((v) => v.id !== item.id)]);
      throw e;
    }
  };

  const deleteVocabularyItem = async (id: string): Promise<void> => {
    try {
      await storage.deleteVocabularyItem(id);
      setVocabularyItems((prev) => prev.filter((v) => v.id !== id));
    } catch (e) {
      console.error('Delete vocabulary item error:', e);
      throw e;
    }
  };

  // Focus Session Actions
  const saveFocusSession = async (session: FocusSession): Promise<FocusSession> => {
    setFocusSaveStatus('saving');
    try {
      const saved = await storage.saveFocusSession(session);
      setFocusSessions((prev) => [saved, ...prev.filter((s) => s.id !== saved.id)]);
      setFocusSaveStatus('saved');
      setTimeout(() => setFocusSaveStatus('idle'), 3000);
      return saved;
    } catch (e) {
      console.error('Save focus session error:', e);
      setFocusSessions((prev) => [session, ...prev.filter((s) => s.id !== session.id)]);
      setFocusSaveStatus('unsynced');
      throw e;
    }
  };

  const updateFocusSession = async (id: string, updates: Partial<FocusSession>): Promise<FocusSession> => {
    setFocusSaveStatus('saving');
    try {
      const updated = await storage.updateFocusSession(id, updates);
      setFocusSessions((prev) => prev.map((s) => (s.id === id ? updated : s)));
      setFocusSaveStatus('saved');
      setTimeout(() => setFocusSaveStatus('idle'), 2500);
      return updated;
    } catch (e) {
      console.error('Update focus session error:', e);
      setFocusSaveStatus('error');
      throw e;
    }
  };

  const deleteFocusSession = async (id: string): Promise<void> => {
    setFocusSaveStatus('saving');
    try {
      await storage.deleteFocusSession(id);
      setFocusSessions((prev) => prev.filter((s) => s.id !== id));
      setFocusSaveStatus('saved');
      setTimeout(() => setFocusSaveStatus('idle'), 2000);
    } catch (e) {
      console.error('Delete focus session error:', e);
      setFocusSaveStatus('error');
      throw e;
    }
  };

  // Research Paper Actions
  const saveResearchPaper = async (paper: ResearchPaper): Promise<ResearchPaper> => {
    setPaperSaveStatus('saving');
    try {
      const saved = await storage.saveResearchPaper(paper);
      setResearchPapers((prev) => [saved, ...prev.filter((p) => p.id !== saved.id)]);
      setPaperSaveStatus('saved');
      setTimeout(() => setPaperSaveStatus('idle'), 3000);
      return saved;
    } catch (e) {
      console.error('Save research paper error:', e);
      setResearchPapers((prev) => [paper, ...prev.filter((p) => p.id !== paper.id)]);
      setPaperSaveStatus('unsynced');
      throw e;
    }
  };

  const updateResearchPaper = async (id: string, updates: Partial<ResearchPaper>): Promise<ResearchPaper> => {
    setPaperSaveStatus('saving');
    try {
      const updated = await storage.updateResearchPaper(id, updates);
      setResearchPapers((prev) => prev.map((p) => (p.id === id ? updated : p)));
      setPaperSaveStatus('saved');
      setTimeout(() => setPaperSaveStatus('idle'), 2500);
      return updated;
    } catch (e) {
      console.error('Update research paper error:', e);
      setPaperSaveStatus('error');
      throw e;
    }
  };

  const deleteResearchPaper = async (id: string, permanent: boolean = false): Promise<void> => {
    setPaperSaveStatus('saving');
    try {
      await storage.deleteResearchPaper(id, permanent);
      if (permanent) {
        setResearchPapers((prev) => prev.filter((p) => p.id !== id));
      } else {
        setResearchPapers((prev) => prev.map((p) => (p.id === id ? { ...p, is_trash: true } : p)));
      }
      setPaperSaveStatus('saved');
      setTimeout(() => setPaperSaveStatus('idle'), 2000);
    } catch (e) {
      console.error('Delete research paper error:', e);
      setPaperSaveStatus('error');
      throw e;
    }
  };

  const restoreResearchPaper = async (id: string): Promise<void> => {
    setPaperSaveStatus('saving');
    try {
      await storage.restoreResearchPaper(id);
      setResearchPapers((prev) => prev.map((p) => (p.id === id ? { ...p, is_trash: false, is_archived: false } : p)));
      setPaperSaveStatus('saved');
      setTimeout(() => setPaperSaveStatus('idle'), 2000);
    } catch (e) {
      console.error('Restore research paper error:', e);
      setPaperSaveStatus('error');
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

    // Search Knowledge Vault Items
    for (const item of knowledgeItems) {
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchCategory = item.category.toLowerCase().includes(q);
      const matchTags = (item.tags || []).some(t => t.toLowerCase().includes(q));
      const matchContent = item.content.toLowerCase().includes(q);
      const matchPoints = (item.key_points || []).some(p => p.toLowerCase().includes(q));

      if (matchTitle || matchCategory || matchTags || matchContent || matchPoints) {
        results.push({
          id: `knowledge-${item.id}`,
          pageTitle: item.title,
          pageIcon: item.type === 'sprint' ? '💡' : '📚',
          type: 'knowledge',
          title: item.title,
          subtitle: `Knowledge Vault • ${item.category} (${item.type})`,
          url: `/vault?id=${item.id}`,
        });
      }
    }

    // Search Research Papers
    for (const p of researchPapers) {
      if (p.is_trash) continue;
      const matchTitle = p.title.toLowerCase().includes(q);
      const matchAuthors = (p.authors || '').toLowerCase().includes(q);
      const matchArea = (p.research_area || '').toLowerCase().includes(q);
      const matchTags = (p.tags || []).some(t => t.toLowerCase().includes(q));
      const matchNotes = (p.notes || '').toLowerCase().includes(q) || (p.key_insights || '').toLowerCase().includes(q);
      const matchStructured = Object.values(p.structured_notes || {}).some(val => typeof val === 'string' && val.toLowerCase().includes(q));

      if (matchTitle || matchAuthors || matchArea || matchTags || matchNotes || matchStructured) {
        results.push({
          id: `paper-${p.id}`,
          pageTitle: p.title,
          pageIcon: '📑',
          type: 'paper',
          title: p.title,
          subtitle: `Research Paper • ${p.authors ? p.authors + ' • ' : ''}${p.research_area} (${p.status.replace('_', ' ')})`,
          url: `/papers/${p.id}`,
        });
      }
    }

    // Search Focus Sessions
    for (const fs of focusSessions) {
      const matchTitle = fs.title.toLowerCase().includes(q);
      const matchCat = (fs.category || '').toLowerCase().includes(q);
      const matchAcc = (fs.accomplishment || '').toLowerCase().includes(q);
      const matchNotes = (fs.notes || '').toLowerCase().includes(q);

      if (matchTitle || matchCat || matchAcc || matchNotes) {
        results.push({
          id: `focus-${fs.id}`,
          pageTitle: fs.title,
          pageIcon: '🎯',
          type: 'focus',
          title: fs.title,
          subtitle: `Focus Session • ${fs.category} (${Math.round(fs.actual_duration_seconds / 60)} min)`,
          url: `/focus?session=${fs.id}`,
        });
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
        learningSprints,
        knowledgeItems,
        vocabularyItems,
        focusSessions,
        researchPapers,
        saveStatus,
        walkSaveStatus,
        learningSaveStatus,
        focusSaveStatus,
        paperSaveStatus,
        isLocked,
        isReady,
        setSaveStatus,
        refreshPages,
        refreshProfile,
        refreshWalkSessions,
        refreshLearningData,
        refreshFocusData,
        refreshPapersData,
        saveWalkSession,
        updateWalkSession,
        deleteWalkSession,
        saveLearningSprint,
        updateLearningSprint,
        deleteLearningSprint,
        saveKnowledgeItem,
        updateKnowledgeItem,
        deleteKnowledgeItem,
        saveVocabularyItem,
        deleteVocabularyItem,
        saveFocusSession,
        updateFocusSession,
        deleteFocusSession,
        saveResearchPaper,
        updateResearchPaper,
        deleteResearchPaper,
        restoreResearchPaper,
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
