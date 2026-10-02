export type PageType = 
  | 'daily' 
  | 'habit' 
  | 'study' 
  | 'checklist' 
  | 'journal' 
  | 'challenge' 
  | 'monthly' 
  | 'blank' 
  | 'custom'
  | 'period'
  | 'walk';

export type BlockType =
  | 'heading'
  | 'paragraph'
  | 'checklist'
  | 'schedule'
  | 'habit_matrix'
  | 'study_log'
  | 'challenge_grid'
  | 'water_tracker'
  | 'mood_sleep'
  | 'meal_planner'
  | 'wins_reflection'
  | 'quote'
  | 'divider'
  | 'period_tracker'
  | 'walk_tracker';

export type ThemeName = 'minimal' | 'blush' | 'sage' | 'warm' | 'lavender';
export type ColorMode = 'light' | 'dark' | 'system';
export type SaveState = 'SAVED' | 'SAVING' | 'UNSAVED' | 'ERROR' | 'OFFLINE';

export interface PageDraft {
  pageId: string;
  title: string;
  icon: string;
  date?: string;
  blocks: PageBlock[];
  updatedAt: number;
  version: number;
}

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  tagline: string;
  passcode?: string;
  isLocked: boolean;
  theme: ThemeName;
  colorMode: ColorMode;
  created_at: string;
}

export interface PlannerPage {
  id: string;
  title: string;
  icon: string;
  cover_color?: string;
  page_type: PageType;
  is_favorite: boolean;
  is_archived: boolean;
  is_deleted: boolean;
  deleted_at?: string | null;
  date?: string; // YYYY-MM-DD format for date-specific planners
  position: number;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  priority?: 'high' | 'medium' | 'low';
}

export interface ChecklistBlockContent {
  title?: string;
  items: ChecklistItem[];
}

export interface ScheduleItem {
  id: string;
  time: string;
  activity: string;
  completed?: boolean;
}

export interface ScheduleBlockContent {
  slots: ScheduleItem[];
}

export interface HabitItem {
  id: string;
  name: string;
  color?: string;
  order: number;
  completedDates: Record<string, boolean>; // key: 'YYYY-MM-DD', value: true
}

export interface HabitBlockContent {
  month: number; // 0-11
  year: number;
  habits: HabitItem[];
  notes?: string;
}

export interface StudySessionItem {
  id: string;
  subject: string;
  topic: string;
  date: string; // YYYY-MM-DD
  targetMinutes: number;
  actualMinutes: number;
  completed: boolean;
  notes?: string;
}

export interface StudyLogBlockContent {
  sessions: StudySessionItem[];
}

export interface ChallengeBlockContent {
  title: string;
  startDate: string; // YYYY-MM-DD
  totalDays: number;
  completedDays: number[]; // e.g. [1, 2, 5]
  notes?: string;
}

export interface WaterTrackerContent {
  date: string;
  targetGlasses: number;
  consumedGlasses: number;
}

export interface MoodSleepContent {
  date: string;
  mood: 'great' | 'good' | 'okay' | 'tired' | 'stressed' | null;
  sleepHours: number;
  sleepQuality: number; // 1 to 5
  notes?: string;
}

export interface MealPlannerContent {
  breakfast: string;
  lunch: string;
  dinner: string;
  snacks: string;
}

export interface WinsReflectionContent {
  wins: string[];
  improvements: string[];
  gratitude: string;
}

export interface QuoteContent {
  text: string;
  author?: string;
}

export interface HeadingContent {
  text: string;
  level: 1 | 2 | 3;
}

export interface ParagraphContent {
  text: string;
}

export type PeriodFlow = 'spotting' | 'light' | 'medium' | 'heavy';

export interface PeriodDayLog {
  date: string; // 'YYYY-MM-DD'
  isPeriod: boolean;
  flow?: PeriodFlow;
  pain?: number; // 0 to 10
  mood?: string;
  symptoms?: string[];
  notes?: string;
}

export interface PeriodCycleHistory {
  id: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  cycleLengthDays?: number;
}

export interface PeriodTrackerContent {
  logs: Record<string, PeriodDayLog>; // 'YYYY-MM-DD' -> log
  customSymptoms?: string[];
  notes?: string;
}

export type WalkFeeling = 'very_tired' | 'tired' | 'okay' | 'good' | 'energized';

export interface WalkSession {
  id: string;
  user_id?: string;
  page_id?: string;
  tracker_id?: string;
  started_at: string; // ISO string
  ended_at: string; // ISO string
  duration_seconds: number;
  target_duration_seconds: number;
  date: string; // YYYY-MM-DD of session start
  hour: number; // 0..23 of session start
  feeling?: WalkFeeling | null;
  note?: string;
  created_at: string;
  updated_at: string;
}

export interface WalkTrackerContent {
  targetMinutes: number; // default 5 (minutes)
  sessions: WalkSession[];
  notes?: string;
}

export type BlockContentMap = {
  heading: HeadingContent;
  paragraph: ParagraphContent;
  checklist: ChecklistBlockContent;
  schedule: ScheduleBlockContent;
  habit_matrix: HabitBlockContent;
  study_log: StudyLogBlockContent;
  challenge_grid: ChallengeBlockContent;
  water_tracker: WaterTrackerContent;
  mood_sleep: MoodSleepContent;
  meal_planner: MealPlannerContent;
  wins_reflection: WinsReflectionContent;
  quote: QuoteContent;
  divider: { style?: 'heart' | 'leaf' | 'line' };
  period_tracker: PeriodTrackerContent;
  walk_tracker: WalkTrackerContent;
};

export interface PageBlock<T extends BlockType = BlockType> {
  id: string;
  page_id: string;
  type: T;
  content: BlockContentMap[T];
  position: number;
  created_at: string;
  updated_at: string;
}

export type LearningDifficulty = 'easy' | 'medium' | 'advanced' | 'mixed';
export type LearningSprintStatus = 'in_progress' | 'completed' | 'abandoned';
export type KnowledgeItemType = 'sprint' | 'note' | 'concept' | 'vocabulary' | 'link';

export interface LearningSource {
  id: string;
  sprint_id?: string;
  user_id?: string;
  title: string;
  url: string;
  note?: string;
}

export interface LearningWord {
  word: string;
  meaning: string;
  example?: string;
}

export interface LearningSprint {
  id: string;
  user_id?: string;
  topic: string;
  category: string;
  difficulty: LearningDifficulty;
  status: LearningSprintStatus;
  target_duration_seconds: number;
  actual_duration_seconds: number;
  started_at: string;
  completed_at?: string;
  notes: string; // rich text HTML
  key_questions?: string[];
  key_points?: string[];
  new_words?: LearningWord[];
  confusions?: string;
  explanation?: string;
  explain_it_back?: string;
  sources?: LearningSource[];
  is_favorite?: boolean;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeItem {
  id: string;
  user_id?: string;
  source_sprint_id?: string;
  title: string;
  type: KnowledgeItemType;
  category: string;
  tags: string[];
  summary?: string;
  content: string; // rich text HTML
  key_points?: string[];
  sources?: LearningSource[];
  related_words?: LearningWord[];
  is_favorite: boolean;
  is_archived?: boolean;
  created_at: string;
  updated_at: string;
}

export interface VocabularyItem {
  id: string;
  user_id?: string;
  source_knowledge_id?: string;
  source_sprint_id?: string;
  word: string;
  meaning: string;
  example?: string;
  category?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface PlannerBackup {
  version: number;
  exportedAt: string;
  profile: UserProfile;
  pages: PlannerPage[];
  blocks: PageBlock[];
  walkSessions?: WalkSession[];
  learningSprints?: LearningSprint[];
  knowledgeItems?: KnowledgeItem[];
  vocabularyItems?: VocabularyItem[];
}
