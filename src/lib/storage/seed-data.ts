import { PlannerPage, PageBlock, UserProfile } from '../types';
import { getTodayDateString } from '../utils';

export const DEFAULT_PROFILE: UserProfile = {
  id: 'user-default',
  name: 'Sophia',
  email: '',
  tagline: 'My Personal Digital Journal & Planner',
  isLocked: false,
  theme: 'blush',
  colorMode: 'light',
  created_at: new Date().toISOString(),
};

const todayStr = getTodayDateString();

export const INITIAL_PAGES: PlannerPage[] = [
  {
    id: 'page-daily-today',
    title: `Daily Planner - ${todayStr}`,
    icon: '✨',
    cover_color: 'var(--accent-soft)',
    page_type: 'daily',
    is_favorite: true,
    is_archived: false,
    is_deleted: false,
    date: todayStr,
    position: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'page-habit-monthly',
    title: 'Monthly Habit Tracker',
    icon: '🌿',
    cover_color: 'var(--accent-soft)',
    page_type: 'habit',
    is_favorite: true,
    is_archived: false,
    is_deleted: false,
    position: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'page-study-tracker',
    title: 'MSc Study & Research Tracker',
    icon: '📚',
    cover_color: 'var(--accent-soft)',
    page_type: 'study',
    is_favorite: false,
    is_archived: false,
    is_deleted: false,
    position: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'page-no-sugar-challenge',
    title: '30-Day No Sugar Challenge',
    icon: '🌸',
    cover_color: 'var(--accent-soft)',
    page_type: 'challenge',
    is_favorite: true,
    is_archived: false,
    is_deleted: false,
    position: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    metadata: {
      totalDays: 30,
      startDate: todayStr,
    }
  },
  {
    id: 'page-journal-welcome',
    title: 'Personal Journal & Reflections',
    icon: '📖',
    cover_color: 'var(--accent-soft)',
    page_type: 'journal',
    is_favorite: false,
    is_archived: false,
    is_deleted: false,
    position: 4,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
];

export const INITIAL_BLOCKS: PageBlock[] = [
  // Blocks for Daily Planner
  {
    id: 'b-daily-1',
    page_id: 'page-daily-today',
    type: 'quote',
    content: {
      text: 'Consistent habits create a brighter you. Small steps lead to big changes.',
      author: 'Daily Reflection'
    },
    position: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'b-daily-2',
    page_id: 'page-daily-today',
    type: 'checklist',
    content: {
      title: "Today's Top Priorities",
      items: [
        { id: 'i-1', text: 'Finish literature review for thesis chapter 2', completed: false, priority: 'high' },
        { id: 'i-2', text: '30 minutes workout & stretch', completed: true, priority: 'medium' },
        { id: 'i-3', text: 'Drink 2L water & take vitamins', completed: false, priority: 'low' }
      ]
    },
    position: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'b-daily-3',
    page_id: 'page-daily-today',
    type: 'schedule',
    content: {
      slots: [
        { id: 's-1', time: '07:00 AM', activity: 'Morning routine & matcha tea', completed: true },
        { id: 's-2', time: '08:30 AM', activity: 'Deep focus study session (Thesis)', completed: false },
        { id: 's-3', time: '12:00 PM', activity: 'Nutritious lunch & 15m walk', completed: false },
        { id: 's-4', time: '02:00 PM', activity: 'Project planning & coding review', completed: false },
        { id: 's-5', time: '06:00 PM', activity: 'Workout & stretching', completed: false },
        { id: 's-6', time: '09:30 PM', activity: 'Reading & evening reflection', completed: false }
      ]
    },
    position: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'b-daily-4',
    page_id: 'page-daily-today',
    type: 'water_tracker',
    content: {
      date: todayStr,
      targetGlasses: 8,
      consumedGlasses: 5
    },
    position: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'b-daily-5',
    page_id: 'page-daily-today',
    type: 'mood_sleep',
    content: {
      date: todayStr,
      mood: 'good',
      sleepHours: 7.5,
      sleepQuality: 4,
      notes: 'Woke up energized after a good night rest.'
    },
    position: 4,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'b-daily-6',
    page_id: 'page-daily-today',
    type: 'meal_planner',
    content: {
      breakfast: 'Greek yogurt with berries & honey granola',
      lunch: 'Avocado salad bowl with grilled chickpeas',
      dinner: 'Warm sourdough with baked salmon & asparagus',
      snacks: 'Green tea, almonds, and an apple'
    },
    position: 5,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'b-daily-7',
    page_id: 'page-daily-today',
    type: 'wins_reflection',
    content: {
      wins: ['Stayed focused without social media distractions', 'Completed reading 2 academic papers'],
      improvements: ['Take regular 5-minute eye breaks', 'Sleep before 11:30 PM'],
      gratitude: 'Grateful for peaceful morning sunlight and a warm cup of tea.'
    },
    position: 6,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },

  // Blocks for Habit Tracker
  {
    id: 'b-habit-1',
    page_id: 'page-habit-monthly',
    type: 'habit_matrix',
    content: {
      month: new Date().getMonth(),
      year: new Date().getFullYear(),
      habits: [
        { id: 'h-1', name: 'Workout / Yoga', order: 0, completedDates: { [todayStr]: true } },
        { id: 'h-2', name: 'Deep Study (2h+)', order: 1, completedDates: { [todayStr]: true } },
        { id: 'h-3', name: 'No Refined Sugar', order: 2, completedDates: { [todayStr]: true } },
        { id: 'h-4', name: 'Drink 2L Water', order: 3, completedDates: { [todayStr]: true } },
        { id: 'h-5', name: 'Read 20 Pages', order: 4, completedDates: {} },
        { id: 'h-6', name: 'Skincare Routine', order: 5, completedDates: { [todayStr]: true } },
        { id: 'h-7', name: 'Sleep Before 12 AM', order: 6, completedDates: {} },
      ],
      notes: 'Focus on consistency over perfection. Every small checkmark compounds over time!'
    },
    position: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },

  // Blocks for Study Tracker
  {
    id: 'b-study-1',
    page_id: 'page-study-tracker',
    type: 'study_log',
    content: {
      sessions: [
        { id: 'st-1', subject: 'Advanced Algorithms', topic: 'Dynamic Programming & Graph Traversal', date: todayStr, targetMinutes: 90, actualMinutes: 100, completed: true, notes: 'Solved 3 problem sets.' },
        { id: 'st-2', subject: 'Machine Learning', topic: 'Attention Mechanisms & Transformers', date: todayStr, targetMinutes: 120, actualMinutes: 120, completed: true, notes: 'Reviewed mathematical derivations.' },
        { id: 'st-3', subject: 'Database Systems', topic: 'Distributed Consensus & Raft Protocol', date: todayStr, targetMinutes: 60, actualMinutes: 45, completed: false, notes: 'Continue reading chapter 4 tomorrow.' }
      ]
    },
    position: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },

  // Blocks for Challenge Tracker
  {
    id: 'b-chal-1',
    page_id: 'page-no-sugar-challenge',
    type: 'challenge_grid',
    content: {
      title: 'No Sugar 30-Day Challenge',
      startDate: todayStr,
      totalDays: 30,
      completedDays: [1, 2, 3, 4],
      notes: 'Cutting out sodas, pastries, and processed sweets. Natural fruits allowed!'
    },
    position: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },

  // Blocks for Journal Welcome
  {
    id: 'b-jour-1',
    page_id: 'page-journal-welcome',
    type: 'heading',
    content: {
      text: 'This Digital Journal Belongs To',
      level: 1
    },
    position: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'b-jour-2',
    page_id: 'page-journal-welcome',
    type: 'divider',
    content: {
      style: 'heart'
    },
    position: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'b-jour-3',
    page_id: 'page-journal-welcome',
    type: 'paragraph',
    content: {
      text: 'Welcome to your private sanctuary for daily planning, habit tracking, deep study records, and personal growth. Everything you see can be freely added, modified, rearranged, or deleted directly from this interface.\n\nTake a deep breath, plan with intention, and celebrate every small step forward.'
    },
    position: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
];
