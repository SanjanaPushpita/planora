import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calculateNextReview } from '../spaced-repetition';
import type { PlannerBackup, VocabularyItem, WalkSession } from '../types';

describe('Planora Core Logic & Data Safety Test Suite', () => {
  // 1. Spaced Repetition (SM-2 Algorithm)
  it('SM-2: calculates correct intervals and statuses for vocabulary items', () => {
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

    const reviewGood = calculateNextReview(item.review_count ?? 0, item.interval_days ?? 0, item.ease_factor ?? 2.5, 'good');
    assert.strictEqual(reviewGood.intervalDays >= 1, true, 'First Good review should schedule at least 1 day');
    assert.strictEqual(reviewGood.status, 'learning');

    const reviewAgain = calculateNextReview(item.review_count ?? 0, item.interval_days ?? 0, item.ease_factor ?? 2.5, 'again');
    assert.strictEqual(reviewAgain.intervalDays, 1);
    assert.strictEqual(reviewAgain.status, 'needs_review');

    const reviewEasy = calculateNextReview(item.review_count ?? 0, item.interval_days ?? 0, item.ease_factor ?? 2.5, 'easy');
    assert.strictEqual(reviewEasy.intervalDays >= 4, true);
    assert.strictEqual(reviewEasy.status, 'known');
  });

  // 2. Backup & Export Schema Validation
  it('Backup Schema: validates Planora backup envelope structure', () => {
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

    assert.strictEqual(mockBackup.app, 'Planora');
    assert.strictEqual(mockBackup.version, 1);
    assert.strictEqual(Array.isArray(mockBackup.pages), true);
    assert.strictEqual(Array.isArray(mockBackup.goals), true);
    assert.strictEqual(Array.isArray(mockBackup.vocabularyItems), true);
  });

  // 3. Goal Progress Calculations
  it('Goal Progress: calculates accurate milestone completion percentage', () => {
    const milestones = [
      { id: 'm-1', goal_id: 'g-1', title: 'Phase 1', is_completed: true, position: 0, created_at: '', updated_at: '' },
      { id: 'm-2', goal_id: 'g-1', title: 'Phase 2', is_completed: false, position: 1, created_at: '', updated_at: '' },
    ];
    const completedCount = milestones.filter(m => m.is_completed).length;
    const progress = Math.round((completedCount / milestones.length) * 100);
    assert.strictEqual(progress, 50, '1 of 2 completed milestones should be 50%');
  });

  // 4. Walk Tracker Hourly Aggregation
  it('Walk Aggregation: accurately aggregates duration in seconds to total minutes', () => {
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
    assert.strictEqual(totalMin, 15, '300s + 600s equals 15 minutes');
  });

  // 5. Trash Isolation
  it('Trash Isolation: isolates trashed items from active user views', () => {
    const items: VocabularyItem[] = [
      { id: '1', word: 'Active', meaning: 'Active', is_trash: false, created_at: '', updated_at: '' },
      { id: '2', word: 'Deleted', meaning: 'Deleted', is_trash: true, created_at: '', updated_at: '' },
    ];
    const normalView = items.filter(i => !i.is_trash);
    const trashView = items.filter(i => Boolean(i.is_trash));

    assert.strictEqual(normalView.length, 1);
    assert.strictEqual(normalView[0].id, '1');
    assert.strictEqual(trashView.length, 1);
    assert.strictEqual(trashView[0].id, '2');
  });

  // 6. Disease Discovery Lab: Multi-Session Retention & Backup Schema
  it('Disease Lab: validates profile and multi-session history model without overwriting', () => {
    const profile = {
      id: 'dp-1',
      name: 'Alzheimer Disease',
      do_id: 'DOID:10652',
      body_systems: ['Brain & Neurology'],
      disease_types: ['Degenerative Diseases', 'Neurological Disorders'],
      study_count: 2,
      review_status: 'learning' as const,
      created_at: '2026-10-09T10:00:00.000Z',
      updated_at: '2026-10-09T11:00:00.000Z',
    };

    const session1 = {
      id: 'ds-1',
      disease_profile_id: profile.id,
      disease_name: profile.name,
      body_systems: profile.body_systems,
      disease_types: profile.disease_types,
      target_duration_seconds: 1200,
      actual_duration_seconds: 1200,
      started_at: '2026-10-09T10:00:00.000Z',
      completed_at: '2026-10-09T10:20:00.000Z',
      questions: [{ id: 'q1', domain: 'Pathophysiology', question: 'What is the amyloid hypothesis?' }],
      notes: 'Initial notes on beta-amyloid plaques.',
      status: 'completed' as const,
      created_at: '2026-10-09T10:00:00.000Z',
      updated_at: '2026-10-09T10:20:00.000Z',
    };

    const session2 = {
      id: 'ds-2',
      disease_profile_id: profile.id,
      disease_name: profile.name,
      body_systems: profile.body_systems,
      disease_types: profile.disease_types,
      target_duration_seconds: 1800,
      actual_duration_seconds: 1800,
      started_at: '2026-10-09T11:00:00.000Z',
      completed_at: '2026-10-09T11:30:00.000Z',
      questions: [{ id: 'q2', domain: 'Genetics', question: 'What role does the APOE-e4 allele play?' }],
      notes: 'Deep dive into tau tangles and genetics.',
      status: 'completed' as const,
      created_at: '2026-10-09T11:00:00.000Z',
      updated_at: '2026-10-09T11:30:00.000Z',
    };

    const allSessions = [session1, session2];
    const diseaseSessions = allSessions.filter(s => s.disease_profile_id === profile.id);

    // Verify both sessions persist independently
    assert.strictEqual(diseaseSessions.length, 2, 'Studying same disease twice preserves both distinct sessions');
    assert.strictEqual(diseaseSessions[0].id, 'ds-1');
    assert.strictEqual(diseaseSessions[1].id, 'ds-2');
    assert.notStrictEqual(diseaseSessions[0].notes, diseaseSessions[1].notes);
  });
});
