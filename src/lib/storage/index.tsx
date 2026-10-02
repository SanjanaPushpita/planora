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
  ResearchPaper,
  WeeklyReview,
  Goal,
  GoalMilestone,
  GoalTask
} from '../types';
import { DEFAULT_PROFILE } from './seed-data';

interface SearchResult {
  id: string;
  pageId?: string;
  pageTitle: string;
  pageIcon: string;
  type: 'page' | 'task' | 'habit' | 'study' | 'note' | 'sprint' | 'knowledge' | 'vocabulary' | 'paper' | 'focus' | 'review' | 'goal' | 'milestone';
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
  weeklyReviews: WeeklyReview[];
  goals: Goal[];
  trashGoals: Goal[];
  goalMilestones: GoalMilestone[];
  goalTasks: GoalTask[];
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  walkSaveStatus: 'idle' | 'saving' | 'saved' | 'error' | 'unsynced';
  learningSaveStatus: 'idle' | 'saving' | 'saved' | 'error' | 'unsynced';
  focusSaveStatus: 'idle' | 'saving' | 'saved' | 'error' | 'unsynced';
  paperSaveStatus: 'idle' | 'saving' | 'saved' | 'error' | 'unsynced';
  reviewSaveStatus: 'idle' | 'saving' | 'saved' | 'error' | 'unsynced';
  goalSaveStatus: 'idle' | 'saving' | 'saved' | 'error' | 'unsynced';
  isLocked: boolean;
  isReady: boolean;
  setSaveStatus: (status: 'idle' | 'saving' | 'saved' | 'error') => void;
  refreshPages: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshWalkSessions: () => Promise<void>;
  refreshLearningData: () => Promise<void>;
  refreshFocusData: () => Promise<void>;
  refreshPapersData: () => Promise<void>;
  refreshWeeklyReviews: () => Promise<void>;
  refreshGoalsData: () => Promise<void>;
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
  saveWeeklyReview: (review: WeeklyReview) => Promise<WeeklyReview>;
  updateWeeklyReview: (id: string, updates: Partial<WeeklyReview>) => Promise<WeeklyReview>;
  deleteWeeklyReview: (id: string) => Promise<void>;
  saveGoal: (goal: Goal) => Promise<Goal>;
  updateGoal: (id: string, updates: Partial<Goal>) => Promise<Goal>;
  deleteGoal: (id: string, permanent?: boolean) => Promise<void>;
  restoreGoal: (id: string) => Promise<void>;
  saveMilestone: (milestone: GoalMilestone) => Promise<GoalMilestone>;
  updateMilestone: (id: string, updates: Partial<GoalMilestone>) => Promise<GoalMilestone>;
  deleteMilestone: (id: string) => Promise<void>;
  reorderMilestones: (goalId: string, orderedMilestoneIds: string[]) => Promise<void>;
  saveGoalTask: (task: GoalTask) => Promise<GoalTask>;
  updateGoalTask: (id: string, updates: Partial<GoalTask>) => Promise<GoalTask>;
  deleteGoalTask: (id: string) => Promise<void>;
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

  const [weeklyReviews, setWeeklyReviews] = useState<WeeklyReview[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('planora_weekly_reviews');
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return [];
  });

  const [goals, setGoals] = useState<Goal[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('planora_goals');
        if (cached) {
          const parsed: Goal[] = JSON.parse(cached);
          return parsed.filter(g => !g.is_trash);
        }
      } catch {}
    }
    return [];
  });

  const [trashGoals, setTrashGoals] = useState<Goal[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('planora_goals');
        if (cached) {
          const parsed: Goal[] = JSON.parse(cached);
          return parsed.filter(g => g.is_trash);
        }
      } catch {}
    }
    return [];
  });

  const [goalMilestones, setGoalMilestones] = useState<GoalMilestone[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('planora_goal_milestones');
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return [];
  });

  const [goalTasks, setGoalTasks] = useState<GoalTask[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('planora_goal_tasks');
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
  const [reviewSaveStatus, setReviewSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error' | 'unsynced'>('idle');
  const [goalSaveStatus, setGoalSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error' | 'unsynced'>('idle');
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
      setPages(active.filter(p => !p.is_deleted));
      setTrashPages(trash.filter(p => p.is_deleted));
      if (typeof window !== 'undefined') {
        const nonDeleted = active.filter(p => !p.is_deleted);
        localStorage.setItem('planora_planner_pages', JSON.stringify(nonDeleted));
      }
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

  const refreshWeeklyReviews = useCallback(async () => {
    try {
      const list = await storage.getWeeklyReviews();
      setWeeklyReviews(list);
      if (typeof window !== 'undefined') {
        localStorage.setItem('planora_weekly_reviews', JSON.stringify(list));
      }
    } catch (e) {
      console.error('Failed to load weekly reviews', e);
    }
  }, [storage]);

  const refreshGoalsData = useCallback(async () => {
    try {
      const [activeGoals, trashList] = await Promise.all([
        storage.getGoals(true, false),
        storage.getGoals(true, true),
      ]);
      setGoals(activeGoals.filter(g => !g.is_trash));
      setTrashGoals(trashList.filter(g => g.is_trash));

      const allMilestones: GoalMilestone[] = [];
      for (const g of activeGoals) {
        const ms = await storage.getMilestonesByGoalId(g.id);
        allMilestones.push(...ms);
      }
      setGoalMilestones(allMilestones);

      const tasks = await storage.getGoalTasks();
      setGoalTasks(tasks);

      if (typeof window !== 'undefined') {
        localStorage.setItem('planora_goals', JSON.stringify(activeGoals));
        localStorage.setItem('planora_goal_milestones', JSON.stringify(allMilestones));
        localStorage.setItem('planora_goal_tasks', JSON.stringify(tasks));
      }
    } catch (e) {
      console.error('Failed to load goals data', e);
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
        refreshPapersData(),
        refreshWeeklyReviews(),
        refreshGoalsData()
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
      refreshWeeklyReviews();
      refreshGoalsData();
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
  }, [refreshProfile, refreshPages, refreshWalkSessions, refreshLearningData, refreshFocusData, refreshPapersData, refreshWeeklyReviews, refreshGoalsData]);

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

  // Weekly Review Actions
  const saveWeeklyReview = async (review: WeeklyReview): Promise<WeeklyReview> => {
    setReviewSaveStatus('saving');
    try {
      const saved = await storage.saveWeeklyReview(review);
      setWeeklyReviews((prev) => [saved, ...prev.filter((r) => r.id !== saved.id && r.week_start_date !== saved.week_start_date)]);
      setReviewSaveStatus('saved');
      setTimeout(() => setReviewSaveStatus('idle'), 3000);
      return saved;
    } catch (e) {
      console.error('Save weekly review error:', e);
      setWeeklyReviews((prev) => [review, ...prev.filter((r) => r.id !== review.id)]);
      setReviewSaveStatus('unsynced');
      throw e;
    }
  };

  const updateWeeklyReview = async (id: string, updates: Partial<WeeklyReview>): Promise<WeeklyReview> => {
    setReviewSaveStatus('saving');
    try {
      const updated = await storage.updateWeeklyReview(id, updates);
      setWeeklyReviews((prev) => prev.map((r) => (r.id === id ? updated : r)));
      setReviewSaveStatus('saved');
      setTimeout(() => setReviewSaveStatus('idle'), 2500);
      return updated;
    } catch (e) {
      console.error('Update weekly review error:', e);
      setReviewSaveStatus('error');
      throw e;
    }
  };

  const deleteWeeklyReview = async (id: string): Promise<void> => {
    setReviewSaveStatus('saving');
    try {
      await storage.deleteWeeklyReview(id);
      setWeeklyReviews((prev) => prev.filter((r) => r.id !== id));
      setReviewSaveStatus('saved');
      setTimeout(() => setReviewSaveStatus('idle'), 2000);
    } catch (e) {
      console.error('Delete weekly review error:', e);
      setReviewSaveStatus('error');
      throw e;
    }
  };

  // Goals Actions
  const saveGoal = async (goal: Goal): Promise<Goal> => {
    setGoalSaveStatus('saving');
    try {
      const saved = await storage.saveGoal(goal);
      setGoals((prev) => [saved, ...prev.filter((g) => g.id !== saved.id)]);
      setGoalSaveStatus('saved');
      setTimeout(() => setGoalSaveStatus('idle'), 3000);
      return saved;
    } catch (e) {
      console.error('Save goal error:', e);
      setGoals((prev) => [goal, ...prev.filter((g) => g.id !== goal.id)]);
      setGoalSaveStatus('unsynced');
      throw e;
    }
  };

  const updateGoal = async (id: string, updates: Partial<Goal>): Promise<Goal> => {
    setGoalSaveStatus('saving');
    try {
      const updated = await storage.updateGoal(id, updates);
      setGoals((prev) => prev.map((g) => (g.id === id ? updated : g)));
      setGoalSaveStatus('saved');
      setTimeout(() => setGoalSaveStatus('idle'), 2500);
      return updated;
    } catch (e) {
      console.error('Update goal error:', e);
      setGoalSaveStatus('error');
      throw e;
    }
  };

  const deleteGoal = async (id: string, permanent: boolean = false): Promise<void> => {
    setGoalSaveStatus('saving');
    const targetGoal = goals.find(g => g.id === id);
    if (permanent) {
      setGoals((prev) => prev.filter((g) => g.id !== id));
      setTrashGoals((prev) => prev.filter((g) => g.id !== id));
      setGoalMilestones((prev) => prev.filter((m) => m.goal_id !== id));
      setGoalTasks((prev) => prev.filter((t) => t.goal_id !== id));
    } else if (targetGoal) {
      const trashed = { ...targetGoal, is_trash: true, updated_at: new Date().toISOString() };
      setGoals((prev) => prev.filter((g) => g.id !== id));
      setTrashGoals((prev) => [trashed, ...prev.filter((g) => g.id !== id)]);
    }
    try {
      await storage.deleteGoal(id, permanent);
      setGoalSaveStatus('saved');
      setTimeout(() => setGoalSaveStatus('idle'), 2000);
    } catch (e) {
      console.error('Delete goal error:', e);
      await refreshGoalsData();
      setGoalSaveStatus('error');
      throw e;
    }
  };

  const restoreGoal = async (id: string): Promise<void> => {
    setGoalSaveStatus('saving');
    const targetGoal = trashGoals.find(g => g.id === id);
    if (targetGoal) {
      const restored = { ...targetGoal, is_trash: false, is_archived: false, updated_at: new Date().toISOString() };
      setTrashGoals((prev) => prev.filter((g) => g.id !== id));
      setGoals((prev) => [restored, ...prev.filter((g) => g.id !== id)]);
    }
    try {
      await storage.restoreGoal(id);
      setGoalSaveStatus('saved');
      setTimeout(() => setGoalSaveStatus('idle'), 2000);
    } catch (e) {
      console.error('Restore goal error:', e);
      await refreshGoalsData();
      setGoalSaveStatus('error');
      throw e;
    }
  };

  // Milestone Actions
  const saveMilestone = async (milestone: GoalMilestone): Promise<GoalMilestone> => {
    try {
      const saved = await storage.saveMilestone(milestone);
      setGoalMilestones((prev) => {
        const idx = prev.findIndex(m => m.id === saved.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = saved;
          return next;
        }
        return [...prev, saved];
      });
      return saved;
    } catch (e) {
      console.error('Save milestone error:', e);
      throw e;
    }
  };

  const updateMilestone = async (id: string, updates: Partial<GoalMilestone>): Promise<GoalMilestone> => {
    try {
      const updated = await storage.updateMilestone(id, updates);
      setGoalMilestones((prev) => prev.map(m => m.id === id ? updated : m));
      return updated;
    } catch (e) {
      console.error('Update milestone error:', e);
      throw e;
    }
  };

  const deleteMilestone = async (id: string): Promise<void> => {
    try {
      await storage.deleteMilestone(id);
      setGoalMilestones((prev) => prev.filter(m => m.id !== id));
      setGoalTasks((prev) => prev.filter(t => t.milestone_id !== id));
    } catch (e) {
      console.error('Delete milestone error:', e);
      throw e;
    }
  };

  const reorderMilestones = async (goalId: string, orderedMilestoneIds: string[]): Promise<void> => {
    try {
      await storage.reorderMilestones(goalId, orderedMilestoneIds);
      setGoalMilestones((prev) =>
        prev.map(m => {
          if (m.goal_id === goalId) {
            const newPos = orderedMilestoneIds.indexOf(m.id);
            if (newPos >= 0) return { ...m, position: newPos };
          }
          return m;
        }).sort((a, b) => a.position - b.position)
      );
    } catch (e) {
      console.error('Reorder milestones error:', e);
      throw e;
    }
  };

  // Goal Task Actions
  const saveGoalTask = async (task: GoalTask): Promise<GoalTask> => {
    try {
      const saved = await storage.saveGoalTask(task);
      setGoalTasks((prev) => {
        const idx = prev.findIndex(t => t.id === saved.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = saved;
          return next;
        }
        return [...prev, saved];
      });
      return saved;
    } catch (e) {
      console.error('Save goal task error:', e);
      throw e;
    }
  };

  const updateGoalTask = async (id: string, updates: Partial<GoalTask>): Promise<GoalTask> => {
    try {
      const updated = await storage.updateGoalTask(id, updates);
      setGoalTasks((prev) => prev.map(t => t.id === id ? updated : t));
      return updated;
    } catch (e) {
      console.error('Update goal task error:', e);
      throw e;
    }
  };

  const deleteGoalTask = async (id: string): Promise<void> => {
    try {
      await storage.deleteGoalTask(id);
      setGoalTasks((prev) => prev.filter(t => t.id !== id));
    } catch (e) {
      console.error('Delete goal task error:', e);
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
    // Immediate optimistic update for zero delay
    const targetPage = pages.find(p => p.id === id);
    if (targetPage) {
      const trashed = { ...targetPage, is_deleted: true, deleted_at: new Date().toISOString() };
      setPages(prev => prev.filter(p => p.id !== id));
      setTrashPages(prev => [trashed, ...prev.filter(p => p.id !== id)]);
    }
    try {
      await storage.moveToTrash(id);
      await refreshPages();
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (e) {
      setSaveStatus('error');
      await refreshPages();
      throw e;
    }
  };

  const restoreFromTrash = async (id: string) => {
    setSaveStatus('saving');
    const targetPage = trashPages.find(p => p.id === id);
    if (targetPage) {
      const restored = { ...targetPage, is_deleted: false, deleted_at: undefined };
      setTrashPages(prev => prev.filter(p => p.id !== id));
      setPages(prev => [restored, ...prev.filter(p => p.id !== id)]);
    }
    try {
      await storage.restoreFromTrash(id);
      await refreshPages();
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (e) {
      setSaveStatus('error');
      await refreshPages();
      throw e;
    }
  };

  const permanentlyDeletePage = async (id: string) => {
    setSaveStatus('saving');
    setTrashPages(prev => prev.filter(p => p.id !== id));
    setPages(prev => prev.filter(p => p.id !== id));
    try {
      await storage.permanentlyDeletePage(id);
      await refreshPages();
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (e) {
      setSaveStatus('error');
      await refreshPages();
      throw e;
    }
  };

  const emptyTrash = async () => {
    setSaveStatus('saving');
    setTrashPages([]);
    try {
      await storage.emptyTrash();
      await refreshPages();
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (e) {
      setSaveStatus('error');
      await refreshPages();
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

  // Search across pages, blocks, checklist items, habits, study sessions, goals, milestones, reviews
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

    // Search Goals (Non-trashed)
    for (const g of goals) {
      if (g.is_trash) continue;
      const matchTitle = g.title.toLowerCase().includes(q);
      const matchDesc = (g.description || '').toLowerCase().includes(q);
      const matchCat = g.category.toLowerCase().includes(q);
      const matchWhy = (g.why_it_matters || '').toLowerCase().includes(q);
      const matchNotes = (g.notes || '').toLowerCase().includes(q);

      if (matchTitle || matchDesc || matchCat || matchWhy || matchNotes) {
        results.push({
          id: `goal-${g.id}`,
          pageTitle: g.title,
          pageIcon: '🎯',
          type: 'goal',
          title: g.title,
          subtitle: `Goal • ${g.category} (${g.progress}% completed)`,
          url: `/goals/${g.id}`,
        });
      }
    }

    // Search Milestones
    for (const m of goalMilestones) {
      const parentGoal = goals.find(g => g.id === m.goal_id);
      if (!parentGoal || parentGoal.is_trash) continue;

      if (m.title.toLowerCase().includes(q) || (m.description || '').toLowerCase().includes(q)) {
        results.push({
          id: `milestone-${m.id}`,
          pageTitle: parentGoal.title,
          pageIcon: '🚩',
          type: 'milestone',
          title: m.title,
          subtitle: `Milestone in ${parentGoal.title} (${m.status})`,
          url: `/goals/${parentGoal.id}`,
        });
      }
    }

    // Search Weekly Reviews
    for (const wr of weeklyReviews) {
      const reviewTitle = wr.title || `Weekly Review (${wr.week_start_date} – ${wr.week_end_date})`;
      const matchTitle = reviewTitle.toLowerCase().includes(q);
      const matchReflection = Object.values(wr.reflection || {}).some(val => typeof val === 'string' && val.toLowerCase().includes(q));
      const matchNextWeek = Object.values(wr.next_week || {}).some(val => typeof val === 'string' && val.toLowerCase().includes(q));

      if (matchTitle || matchReflection || matchNextWeek) {
        results.push({
          id: `review-${wr.id}`,
          pageTitle: reviewTitle,
          pageIcon: '🧭',
          type: 'review',
          title: reviewTitle,
          subtitle: `Weekly Review (${wr.week_start_date} – ${wr.week_end_date})`,
          url: `/weekly-review?week=${wr.week_start_date}`,
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
        weeklyReviews,
        goals,
        trashGoals,
        goalMilestones,
        goalTasks,
        saveStatus,
        walkSaveStatus,
        learningSaveStatus,
        focusSaveStatus,
        paperSaveStatus,
        reviewSaveStatus,
        goalSaveStatus,
        isLocked,
        isReady,
        setSaveStatus,
        refreshPages,
        refreshProfile,
        refreshWalkSessions,
        refreshLearningData,
        refreshFocusData,
        refreshPapersData,
        refreshWeeklyReviews,
        refreshGoalsData,
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
        saveWeeklyReview,
        updateWeeklyReview,
        deleteWeeklyReview,
        saveGoal,
        updateGoal,
        deleteGoal,
        restoreGoal,
        saveMilestone,
        updateMilestone,
        deleteMilestone,
        reorderMilestones,
        saveGoalTask,
        updateGoalTask,
        deleteGoalTask,
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

