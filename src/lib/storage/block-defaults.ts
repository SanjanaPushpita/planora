import { BlockType, BlockContentMap, PageType, PageBlock } from '../types';
import { generateId, getTodayDateString } from '../utils';

export function getDefaultBlockContent<T extends BlockType>(type: T, metadata?: Record<string, any>): BlockContentMap[T] {
  const today = getTodayDateString();

  switch (type) {
    case 'heading':
      return {
        text: 'New Heading',
        level: 2,
      } as unknown as BlockContentMap[T];

    case 'paragraph':
      return {
        text: '',
      } as unknown as BlockContentMap[T];

    case 'checklist':
      return {
        title: 'Checklist',
        items: [
          { id: generateId(), text: 'Add first item here...', completed: false }
        ]
      } as unknown as BlockContentMap[T];

    case 'schedule':
      return {
        slots: [
          { id: generateId(), time: '08:00 AM', activity: 'Morning Focus' },
          { id: generateId(), time: '10:00 AM', activity: 'Deep Work' },
          { id: generateId(), time: '01:00 PM', activity: 'Lunch & Recharge' },
          { id: generateId(), time: '03:00 PM', activity: 'Study / Project' },
          { id: generateId(), time: '06:00 PM', activity: 'Exercise & Wellness' },
          { id: generateId(), time: '09:00 PM', activity: 'Evening Wind-down' },
        ]
      } as unknown as BlockContentMap[T];

    case 'habit_matrix': {
      const now = new Date();
      return {
        month: now.getMonth(),
        year: now.getFullYear(),
        habits: [
          { id: generateId(), name: 'Workout / Move', order: 0, completedDates: {} },
          { id: generateId(), name: 'Study / Reading', order: 1, completedDates: {} },
          { id: generateId(), name: 'Drink 2L Water', order: 2, completedDates: {} },
        ],
        notes: 'Small daily steps create massive transformations.'
      } as unknown as BlockContentMap[T];
    }

    case 'study_log':
      return {
        sessions: [
          {
            id: generateId(),
            subject: 'Subject / Course',
            topic: 'Topic name',
            date: today,
            targetMinutes: 60,
            actualMinutes: 60,
            completed: false,
            notes: ''
          }
        ]
      } as unknown as BlockContentMap[T];

    case 'challenge_grid':
      return {
        title: metadata?.title || 'Personal Challenge',
        startDate: metadata?.startDate || today,
        totalDays: Number(metadata?.totalDays) || 30,
        completedDays: [],
        notes: 'Track each day consistently.'
      } as unknown as BlockContentMap[T];

    case 'water_tracker':
      return {
        date: today,
        targetGlasses: 8,
        consumedGlasses: 0,
      } as unknown as BlockContentMap[T];

    case 'mood_sleep':
      return {
        date: today,
        mood: 'good',
        sleepHours: 8,
        sleepQuality: 4,
        notes: ''
      } as unknown as BlockContentMap[T];

    case 'meal_planner':
      return {
        breakfast: '',
        lunch: '',
        dinner: '',
        snacks: ''
      } as unknown as BlockContentMap[T];

    case 'wins_reflection':
      return {
        wins: [''],
        improvements: [''],
        gratitude: ''
      } as unknown as BlockContentMap[T];

    case 'quote':
      return {
        text: 'Consistency is the DNA of mastery.',
        author: 'Robin Sharma'
      } as unknown as BlockContentMap[T];

    case 'divider':
      return {
        style: 'heart'
      } as unknown as BlockContentMap[T];

    default:
      return {} as unknown as BlockContentMap[T];
  }
}

export function generateTemplateBlocks(pageId: string, pageType: PageType, metadata?: Record<string, any>): PageBlock[] {
  const now = new Date().toISOString();

  switch (pageType) {
    case 'daily':
      return [
        {
          id: generateId(),
          page_id: pageId,
          type: 'quote',
          content: {
            text: 'Small daily improvements over time lead to stunning results.',
            author: 'Daily Reflection'
          },
          position: 0,
          created_at: now,
          updated_at: now,
        },
        {
          id: generateId(),
          page_id: pageId,
          type: 'checklist',
          content: {
            title: "Today's Top Priorities",
            items: [
              { id: generateId(), text: 'Primary goal for today', completed: false, priority: 'high' },
              { id: generateId(), text: 'Secondary task', completed: false, priority: 'medium' },
              { id: generateId(), text: 'Personal wellness habit', completed: false, priority: 'low' }
            ]
          },
          position: 1,
          created_at: now,
          updated_at: now,
        },
        {
          id: generateId(),
          page_id: pageId,
          type: 'schedule',
          content: getDefaultBlockContent('schedule'),
          position: 2,
          created_at: now,
          updated_at: now,
        },
        {
          id: generateId(),
          page_id: pageId,
          type: 'water_tracker',
          content: getDefaultBlockContent('water_tracker'),
          position: 3,
          created_at: now,
          updated_at: now,
        },
        {
          id: generateId(),
          page_id: pageId,
          type: 'mood_sleep',
          content: getDefaultBlockContent('mood_sleep'),
          position: 4,
          created_at: now,
          updated_at: now,
        },
        {
          id: generateId(),
          page_id: pageId,
          type: 'meal_planner',
          content: getDefaultBlockContent('meal_planner'),
          position: 5,
          created_at: now,
          updated_at: now,
        },
        {
          id: generateId(),
          page_id: pageId,
          type: 'wins_reflection',
          content: getDefaultBlockContent('wins_reflection'),
          position: 6,
          created_at: now,
          updated_at: now,
        }
      ];

    case 'habit':
      return [
        {
          id: generateId(),
          page_id: pageId,
          type: 'habit_matrix',
          content: getDefaultBlockContent('habit_matrix'),
          position: 0,
          created_at: now,
          updated_at: now,
        }
      ];

    case 'study':
      return [
        {
          id: generateId(),
          page_id: pageId,
          type: 'study_log',
          content: getDefaultBlockContent('study_log'),
          position: 0,
          created_at: now,
          updated_at: now,
        }
      ];

    case 'challenge':
      return [
        {
          id: generateId(),
          page_id: pageId,
          type: 'challenge_grid',
          content: getDefaultBlockContent('challenge_grid', metadata),
          position: 0,
          created_at: now,
          updated_at: now,
        }
      ];

    case 'checklist':
      return [
        {
          id: generateId(),
          page_id: pageId,
          type: 'checklist',
          content: {
            title: metadata?.title || 'Checklist',
            items: [
              { id: generateId(), text: 'First item', completed: false },
              { id: generateId(), text: 'Second item', completed: false },
              { id: generateId(), text: 'Third item', completed: false }
            ]
          },
          position: 0,
          created_at: now,
          updated_at: now,
        }
      ];

    case 'journal':
      return [
        {
          id: generateId(),
          page_id: pageId,
          type: 'heading',
          content: { text: metadata?.title || 'Daily Reflections', level: 1 },
          position: 0,
          created_at: now,
          updated_at: now,
        },
        {
          id: generateId(),
          page_id: pageId,
          type: 'divider',
          content: { style: 'heart' },
          position: 1,
          created_at: now,
          updated_at: now,
        },
        {
          id: generateId(),
          page_id: pageId,
          type: 'paragraph',
          content: { text: 'Write your thoughts, feelings, inspirations, and reflections here...' },
          position: 2,
          created_at: now,
          updated_at: now,
        }
      ];

    case 'monthly':
      return [
        {
          id: generateId(),
          page_id: pageId,
          type: 'heading',
          content: { text: 'Monthly Focus & Key Goals', level: 1 },
          position: 0,
          created_at: now,
          updated_at: now,
        },
        {
          id: generateId(),
          page_id: pageId,
          type: 'checklist',
          content: {
            title: 'Top Monthly Milestones',
            items: [
              { id: generateId(), text: 'Key milestone 1', completed: false, priority: 'high' },
              { id: generateId(), text: 'Key milestone 2', completed: false, priority: 'medium' }
            ]
          },
          position: 1,
          created_at: now,
          updated_at: now,
        },
        {
          id: generateId(),
          page_id: pageId,
          type: 'paragraph',
          content: { text: 'Notes, themes, and important dates for this month...' },
          position: 2,
          created_at: now,
          updated_at: now,
        }
      ];

    case 'blank':
    case 'custom':
    default:
      return [
        {
          id: generateId(),
          page_id: pageId,
          type: 'paragraph',
          content: { text: 'Start typing or use "+ Add Block" below to build your custom planner page.' },
          position: 0,
          created_at: now,
          updated_at: now,
        }
      ];
  }
}
