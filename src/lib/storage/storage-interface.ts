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
  ResearchPaper,
  WeeklyReview,
  Goal,
  GoalMilestone,
  GoalTask
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

  // Learning Sprints (Durable Supabase + Offline Draft Safety)
  getLearningSprints(): Promise<LearningSprint[]>;
  saveLearningSprint(sprint: LearningSprint): Promise<LearningSprint>;
  updateLearningSprint(id: string, updates: Partial<LearningSprint>): Promise<LearningSprint>;
  deleteLearningSprint(id: string): Promise<void>;

  // Knowledge Vault Items
  getKnowledgeItems(): Promise<KnowledgeItem[]>;
  saveKnowledgeItem(item: KnowledgeItem): Promise<KnowledgeItem>;
  updateKnowledgeItem(id: string, updates: Partial<KnowledgeItem>): Promise<KnowledgeItem>;
  deleteKnowledgeItem(id: string): Promise<void>;

  // Vocabulary Items
  getVocabularyItems(): Promise<VocabularyItem[]>;
  saveVocabularyItem(item: VocabularyItem): Promise<VocabularyItem>;
  deleteVocabularyItem(id: string): Promise<void>;

  // Focus Sessions / Deep Work (Durable Supabase + Recovery)
  getFocusSessions(): Promise<FocusSession[]>;
  saveFocusSession(session: FocusSession): Promise<FocusSession>;
  updateFocusSession(id: string, updates: Partial<FocusSession>): Promise<FocusSession>;
  deleteFocusSession(id: string): Promise<void>;

  // Research Paper Tracker
  getResearchPapers(includeArchived?: boolean, includeTrash?: boolean): Promise<ResearchPaper[]>;
  getResearchPaperById(id: string): Promise<ResearchPaper | null>;
  saveResearchPaper(paper: ResearchPaper): Promise<ResearchPaper>;
  updateResearchPaper(id: string, updates: Partial<ResearchPaper>): Promise<ResearchPaper>;
  deleteResearchPaper(id: string, permanent?: boolean): Promise<void>;
  restoreResearchPaper(id: string): Promise<void>;

  // Weekly Reviews
  getWeeklyReviews(): Promise<WeeklyReview[]>;
  getWeeklyReviewByWeek(weekStartDate: string): Promise<WeeklyReview | null>;
  saveWeeklyReview(review: WeeklyReview): Promise<WeeklyReview>;
  updateWeeklyReview(id: string, updates: Partial<WeeklyReview>): Promise<WeeklyReview>;
  deleteWeeklyReview(id: string): Promise<void>;

  // Goals, Milestones, and Tasks
  getGoals(includeArchived?: boolean, includeTrash?: boolean): Promise<Goal[]>;
  getGoalById(id: string): Promise<Goal | null>;
  saveGoal(goal: Goal): Promise<Goal>;
  updateGoal(id: string, updates: Partial<Goal>): Promise<Goal>;
  deleteGoal(id: string, permanent?: boolean): Promise<void>;
  restoreGoal(id: string): Promise<void>;
  getMilestonesByGoalId(goalId: string): Promise<GoalMilestone[]>;
  saveMilestone(milestone: GoalMilestone): Promise<GoalMilestone>;
  updateMilestone(id: string, updates: Partial<GoalMilestone>): Promise<GoalMilestone>;
  deleteMilestone(id: string): Promise<void>;
  reorderMilestones(goalId: string, orderedMilestoneIds: string[]): Promise<void>;
  getGoalTasks(goalId?: string, milestoneId?: string): Promise<GoalTask[]>;
  saveGoalTask(task: GoalTask): Promise<GoalTask>;
  updateGoalTask(id: string, updates: Partial<GoalTask>): Promise<GoalTask>;
  deleteGoalTask(id: string): Promise<void>;

  // Backup & Restore
  exportData(): Promise<PlannerBackup>;
  importData(data: PlannerBackup): Promise<boolean>;
  resetToDefault(): Promise<void>;
}


