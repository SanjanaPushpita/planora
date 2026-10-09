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

export type InboxItemType = 'task' | 'idea' | 'note' | 'research_idea' | 'link' | 'reminder' | 'vocabulary' | 'someday';
export type InboxItemPriority = 'low' | 'medium' | 'high';

export interface InboxItem {
  id: string;
  user_id?: string;
  content: string;
  title?: string;
  type: InboxItemType;
  tags?: string[];
  due_date?: string | null;
  url?: string | null;
  priority?: InboxItemPriority;
  related_goal_id?: string | null;
  related_paper_id?: string | null;
  related_knowledge_id?: string | null;
  is_organized: boolean;
  organized_into?: string | null;
  organized_at?: string | null;
  is_archived?: boolean;
  is_trash?: boolean;
  is_completed?: boolean;
  created_at: string;
  updated_at: string;
}

export type VocabularyStatus = 'new' | 'learning' | 'known' | 'needs_review';
export type VocabularySourceType = 'sprint' | 'paper' | 'vault' | 'daily' | 'book' | 'article' | 'custom' | string;
export type VocabularyReviewRating = 'again' | 'hard' | 'good' | 'easy';

export interface VocabularyItem {
  id: string;
  user_id?: string;
  source_knowledge_id?: string | null;
  source_sprint_id?: string | null;
  source_paper_id?: string | null;
  source_type?: VocabularySourceType;
  source_title?: string;
  word: string;
  meaning: string;
  example?: string;
  synonyms?: string[];
  antonyms?: string[];
  part_of_speech?: string;
  pronunciation?: string;
  category?: string;
  tags?: string[];
  my_notes?: string;
  is_favorite?: boolean;
  is_trash?: boolean;
  last_reviewed_at?: string | null;
  next_review_at?: string | null;
  review_count?: number;
  interval_days?: number;
  ease_factor?: number;
  status?: VocabularyStatus;
  created_at: string;
  updated_at: string;
}

export type FocusCategory = 'Study' | 'Research' | 'Coding' | 'Reading' | 'Writing' | 'Learning Sprint' | 'Planning' | 'Other' | string;
export type FocusEnergyLevel = 'low' | 'medium' | 'high';
export type FocusDifficulty = 'easy' | 'moderate' | 'hard';

export interface FocusSession {
  id: string;
  user_id?: string;
  title: string;
  category: FocusCategory;
  related_goal_id?: string;
  related_paper_id?: string;
  related_subject_id?: string;
  related_sprint_id?: string;
  target_duration_seconds: number;
  actual_duration_seconds: number;
  started_at: string;
  ended_at?: string;
  distraction_count: number;
  focus_rating?: number; // 1-5
  energy_level?: FocusEnergyLevel;
  difficulty?: FocusDifficulty;
  accomplishment?: string;
  notes?: string;
  is_favorite?: boolean;
  created_at: string;
  updated_at: string;
}

export type PaperStatus = 'to_read' | 'reading' | 'finished' | 'important' | 'archived';
export type PaperPriority = 'low' | 'medium' | 'high';

export interface StructuredPaperNotes {
  research_problem?: string;
  research_objective?: string;
  research_questions?: string;
  dataset?: string;
  dataset_size?: string;
  data_type?: string;
  preprocessing?: string;
  models_methods?: string;
  baselines?: string;
  evaluation_metrics?: string;
  main_results?: string;
  best_model?: string;
  key_findings?: string;
  strengths?: string;
  limitations?: string;
  research_gap?: string;
  future_work?: string;
  how_can_i_use_this_paper?: string;
  my_notes?: string;
  quotes?: string;
}

export interface ResearchPaper {
  id: string;
  user_id?: string;
  title: string;
  authors?: string;
  year?: number;
  journal_conference?: string;
  doi?: string;
  url?: string;
  pdf_url?: string;
  research_area?: string;
  tags?: string[];
  status: PaperStatus;
  priority: PaperPriority;
  reading_progress: number; // 0..100
  pages_read?: number;
  total_pages?: number;
  is_favorite?: boolean;
  is_archived?: boolean;
  is_trash?: boolean;
  structured_notes?: StructuredPaperNotes;
  notes?: string;
  key_insights?: string;
  sources?: LearningSource[];
  created_at: string;
  updated_at: string;
}

export interface WeeklyReflection {
  what_went_well?: string;
  what_was_difficult?: string;
  what_proud_of?: string;
  what_learned?: string;
  what_distracted_me?: string;
  what_to_improve?: string;
  what_to_stop?: string;
  what_to_continue?: string;
  biggest_win?: string;
  notes?: string;
  [key: string]: any;
}

export interface NextWeekPlanning {
  priority_1?: string;
  priority_2?: string;
  priority_3?: string;
  priorities?: string[];
  deadlines?: string;
  remember_items?: string;
  reminders?: string;
  personal_goal?: string;
  work_goal?: string;
  health_goal?: string;
  [key: string]: any;
}

export interface WeeklyReview {
  id: string;
  user_id?: string;
  title?: string;
  week_start_date: string;
  week_end_date: string;
  week_start?: string;
  week_end?: string;
  week_number?: number;
  year?: number;
  rating_overall?: number;
  rating_energy?: 'low' | 'medium' | 'high' | string;
  rating_productivity?: number;
  rating_stress?: number;
  overall_rating?: number;
  energy_rating?: 'low' | 'medium' | 'high' | string;
  productivity_rating?: number;
  stress_rating?: number;
  reflection: WeeklyReflection;
  next_week?: NextWeekPlanning;
  next_week_planning?: NextWeekPlanning;
  stats_snapshot?: Record<string, any>;
  notes?: string;
  status: 'draft' | 'completed';
  created_at: string;
  updated_at: string;
}

export type GoalStatus = 'not_started' | 'in_progress' | 'completed' | 'paused' | 'archived';
export type GoalPriority = 'low' | 'medium' | 'high';
export type GoalCategory = 'Academic' | 'Research' | 'Career' | 'Personal' | 'Health' | 'Finance' | 'Learning' | 'Project' | string;

export interface GoalTask {
  id: string;
  goal_id: string;
  milestone_id?: string | null;
  user_id?: string;
  title: string;
  is_completed: boolean;
  due_date?: string | null;
  priority?: GoalPriority;
  notes?: string;
  position: number;
  daily_planner_date?: string | null;
  created_at: string;
  updated_at: string;
}

export interface GoalMilestone {
  id: string;
  goal_id: string;
  user_id?: string;
  title: string;
  description?: string;
  target_date?: string | null;
  status?: 'pending' | 'in_progress' | 'completed' | string;
  is_completed?: boolean;
  position: number;
  tasks?: GoalTask[];
  created_at: string;
  updated_at: string;
}

export interface Goal {
  id: string;
  user_id?: string;
  title: string;
  description?: string;
  category: GoalCategory;
  status: GoalStatus;
  priority: GoalPriority;
  why_it_matters?: string;
  start_date?: string | null;
  target_date?: string | null;
  progress: number; // 0..100
  is_favorite?: boolean;
  is_archived?: boolean;
  is_trash?: boolean;
  notes?: string;
  milestones?: GoalMilestone[];
  created_at: string;
  updated_at: string;
}

export interface MonthlyReflection {
  what_went_well?: string;
  what_was_difficult?: string;
  what_proud_of?: string;
  what_learned?: string;
  what_took_too_much_time?: string;
  what_to_change?: string;
  best_moment?: string;
  biggest_lesson?: string;
  notes?: string;
  [key: string]: any;
}

export interface NextMonthPlanning {
  priority_1?: string;
  priority_2?: string;
  priority_3?: string;
  main_goal?: string;
  one_thing_to_improve?: string;
  one_thing_to_continue?: string;
  one_thing_to_stop?: string;
  important_dates?: string;
  [key: string]: any;
}

export interface MonthlyReview {
  id: string;
  user_id?: string;
  month_key: string; // 'YYYY-MM', e.g. '2026-10'
  month_label?: string; // 'October 2026'
  year: number;
  month_number: number; // 1-12
  rating_overall?: number; // 1-5
  rating_productivity?: number; // 1-5
  rating_energy?: 'low' | 'medium' | 'high' | string;
  rating_focus?: number; // 1-5
  reflection: MonthlyReflection;
  next_month: NextMonthPlanning;
  stats_snapshot?: Record<string, any>;
  notes?: string;
  status: 'draft' | 'completed';
  created_at: string;
  updated_at: string;
}

// ============================================================================
// DISEASE DISCOVERY LAB TYPES
// ============================================================================

export type BodySystemCategory =
  | 'Brain & Neurology'
  | 'Cardiovascular / Heart'
  | 'Kidney & Urinary'
  | 'Respiratory / Lungs'
  | 'Digestive / Gastrointestinal'
  | 'Liver & Biliary'
  | 'Endocrine & Hormonal'
  | 'Blood / Hematology'
  | 'Musculoskeletal'
  | 'Skin / Dermatology'
  | 'Eye / Ophthalmology'
  | 'Ear / Hearing'
  | 'Reproductive'
  | 'Immune System'
  | 'Oral / Dental'
  | 'Multisystem';

export type DiseaseTypeCategory =
  | 'Infectious Diseases'
  | 'Genetic & Rare Diseases'
  | 'Autoimmune Diseases'
  | 'Cancer / Neoplastic Diseases'
  | 'Metabolic Diseases'
  | 'Degenerative Diseases'
  | 'Congenital Diseases'
  | 'Parasitic Diseases'
  | 'Nutritional Diseases'
  | 'Neurological Disorders'
  | 'Mental / Behavioral Disorders'
  | 'Other';

export type DiseaseReviewStatus = 'needs_review' | 'learning' | 'comfortable';

export interface DiseaseProfile {
  id: string;
  user_id?: string;
  name: string;
  synonyms?: string[];
  do_id?: string; // e.g. 'DOID:10652'
  medline_plus_id?: string;
  medline_plus_url?: string;
  icd11_id?: string;
  body_systems: string[];
  disease_types: string[];
  summary?: string;
  sources?: { title: string; url: string; note?: string }[];
  is_saved_for_later?: boolean;
  review_status?: DiseaseReviewStatus;
  last_studied_at?: string | null;
  study_count?: number;
  created_at: string;
  updated_at: string;
}

export interface DiseaseStudyQuestion {
  id: string;
  domain: string;
  question: string;
  hint?: string;
}

export interface DiseaseStudySession {
  id: string;
  user_id?: string;
  disease_profile_id?: string;
  disease_name: string;
  do_id?: string;
  body_systems: string[];
  disease_types: string[];
  target_duration_seconds: number;
  actual_duration_seconds: number;
  started_at: string;
  completed_at?: string;
  questions: DiseaseStudyQuestion[];
  overview?: string; // rich text
  notes: string; // rich text
  key_findings?: string; // rich text
  structured_notes?: Record<string, string>;
  key_facts?: string[]; // 3 Key facts active recall
  explanation?: string; // In your own words
  sources?: { title: string; url: string; note?: string }[];
  status: 'in_progress' | 'completed' | 'abandoned';
  review_status?: DiseaseReviewStatus;
  created_at: string;
  updated_at: string;
}

export interface PlannerBackup {
  app?: string; // 'Planora'
  version: number;
  exportedAt: string;
  profile: UserProfile;
  pages: PlannerPage[];
  blocks: PageBlock[];
  walkSessions?: WalkSession[];
  learningSprints?: LearningSprint[];
  knowledgeItems?: KnowledgeItem[];
  vocabularyItems?: VocabularyItem[];
  inboxItems?: InboxItem[];
  monthlyReviews?: MonthlyReview[];
  focusSessions?: FocusSession[];
  researchPapers?: ResearchPaper[];
  weeklyReviews?: WeeklyReview[];
  goals?: Goal[];
  goalMilestones?: GoalMilestone[];
  goalTasks?: GoalTask[];
  diseaseProfiles?: DiseaseProfile[];
  diseaseSessions?: DiseaseStudySession[];
}

export interface BackupImportResult {
  success: boolean;
  importedCount: number;
  skippedCount: number;
  summary: {
    pages: number;
    blocks: number;
    walks: number;
    sprints: number;
    vault: number;
    vocabulary: number;
    inbox: number;
    monthly_reviews: number;
    focus_sessions: number;
    papers: number;
    weekly_reviews: number;
    goals: number;
    milestones: number;
    tasks: number;
    diseases?: number;
    disease_sessions?: number;
    [key: string]: number | undefined;
  };
  message?: string;
}

