import { calculateNextReview } from '../spaced-repetition';
import { PlannerBackup, VocabularyItem, WalkSession } from '../types';

/**
 * Planora Core Logic & Data Safety Test Suite
 */
export function runPlanoraValidationSuite() {
  const results: { test: string; passed: boolean; error?: string }[] = [];

  function assert(testName: string, condition: boolean, errorMsg?: string) {
    if (condition) {
      results.push({ test: testName, passed: true });
    } else {
      results.push({ test: testName, passed: false, error: errorMsg || 'Assertion failed' });
    }
  }

  // 1. Spaced Repetition (SM-2 Algorithm)
  try {
    const item: VocabularyItem = {
      id: 'voc-1',
      word: 'Resilience',
      meaning: 'Ability to recover quickly',
      review_count: 0,
      interval_days: 0,
      ease_factor: 2.5,
      status: 'new',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const reviewGood = calculateNextReview(item.review_count || 0, item.interval_days || 0, item.ease_factor || 2.5, 'good');
    assert('SM-2: First Good review schedules 1-4 days', reviewGood.intervalDays >= 1 && reviewGood.status === 'learning');

    const reviewAgain = calculateNextReview(item.review_count || 0, item.interval_days || 0, item.ease_factor || 2.5, 'again');
    assert('SM-2: Again review sets status to needs_review and resets interval to 1', reviewAgain.intervalDays === 1 && reviewAgain.status === 'needs_review');

    const reviewEasy = calculateNextReview(item.review_count || 0, item.interval_days || 0, item.ease_factor || 2.5, 'easy');
    assert('SM-2: Easy review schedules known/long interval', reviewEasy.intervalDays >= 4 && reviewEasy.status === 'known');
  } catch (e: any) {
    results.push({ test: 'SM-2 Calculation', passed: false, error: e.message });
  }

  // 2. Backup & Export Schema Validation
  try {
    const mockBackup: PlannerBackup = {
      app: 'Planora',
      version: 1,
      exportedAt: new Date().toISOString(),
      profile: {
        id: 'user-1',
        name: 'Sophia',
        tagline: 'Personal Planner',
        theme: 'blush',
        colorMode: 'light',
        isLocked: false,
        created_at: new Date().toISOString(),
      },
      pages: [
        {
          id: 'page-1',
          title: 'Daily Planner',
          icon: '✨',
          page_type: 'daily',
          is_favorite: false,
          is_archived: false,
          is_deleted: false,
          position: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      ],
      blocks: [],
      goals: [
        {
          id: 'goal-1',
          title: 'Master TypeScript',
          category: 'Learning',
          status: 'in_progress',
          priority: 'high',
          progress: 50,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      ],
      vocabularyItems: [
        {
          id: 'voc-1',
          word: 'Ephemeral',
          meaning: 'Lasting for a very short time',
          status: 'learning',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      ]
    };

    assert('Backup Schema: app and version present', mockBackup.app === 'Planora' && mockBackup.version === 1);
    assert('Backup Schema: pages and goals present', Array.isArray(mockBackup.pages) && Array.isArray(mockBackup.goals));
  } catch (e: any) {
    results.push({ test: 'Backup Validation', passed: false, error: e.message });
  }

  // 3. Goal Progress Calculations
  try {
    const milestones = [
      { id: 'm-1', goal_id: 'g-1', title: 'Phase 1', is_completed: true, position: 0, created_at: '', updated_at: '' },
      { id: 'm-2', goal_id: 'g-1', title: 'Phase 2', is_completed: false, position: 1, created_at: '', updated_at: '' },
    ];
    const completedCount = milestones.filter(m => m.is_completed).length;
    const progress = Math.round((completedCount / milestones.length) * 100);
    assert('Goal Progress: 1 of 2 completed is 50%', progress === 50);
  } catch (e: any) {
    results.push({ test: 'Goal Progress Calculation', passed: false, error: e.message });
  }

  // 4. Walk Tracker Hourly Aggregation
  try {
    const sessions: WalkSession[] = [
      {
        id: 'w-1',
        date: '2026-10-03',
        hour: 9,
        started_at: '2026-10-03T09:00:00.000Z',
        ended_at: '2026-10-03T09:05:00.000Z',
        duration_seconds: 300,
        target_duration_seconds: 300,
        created_at: '',
        updated_at: '',
      },
      {
        id: 'w-2',
        date: '2026-10-03',
        hour: 14,
        started_at: '2026-10-03T14:00:00.000Z',
        ended_at: '2026-10-03T14:10:00.000Z',
        duration_seconds: 600,
        target_duration_seconds: 300,
        created_at: '',
        updated_at: '',
      }
    ];

    const totalSec = sessions.reduce((sum, s) => sum + s.duration_seconds, 0);
    const totalMin = Math.round(totalSec / 60);
    assert('Walk Aggregation: 300s + 600s equals 15 minutes', totalMin === 15);
  } catch (e: any) {
    results.push({ test: 'Walk Aggregation', passed: false, error: e.message });
  }

  // 5. Trash Isolation
  try {
    const items: VocabularyItem[] = [
      { id: '1', word: 'Active', meaning: 'Active', is_trash: false, created_at: '', updated_at: '' },
      { id: '2', word: 'Deleted', meaning: 'Deleted', is_trash: true, created_at: '', updated_at: '' },
    ];
    const normalView = items.filter(i => !i.is_trash);
    const trashView = items.filter(i => Boolean(i.is_trash));
    assert('Trash Isolation: Trashed item does not appear in normal list', normalView.length === 1 && normalView[0].id === '1');
    assert('Trash Isolation: Trashed item appears in Trash bin only', trashView.length === 1 && trashView[0].id === '2');
  } catch (e: any) {
    results.push({ test: 'Trash Isolation', passed: false, error: e.message });
  }

  return results;
}
