export type PageType = 
  | 'daily' 
  | 'habit' 
  | 'study' 
  | 'checklist' 
  | 'journal' 
  | 'challenge' 
  | 'monthly' 
  | 'blank' 
  | 'custom';

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
  | 'divider';

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

export interface PlannerBackup {
  version: number;
  exportedAt: string;
  profile: UserProfile;
  pages: PlannerPage[];
  blocks: PageBlock[];
}
