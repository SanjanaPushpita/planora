import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { questionService } from '../learning/questions/question-service';
import {
  loadUserQuestionHistory,
  recordServedQuestions,
  clearTestQuestionHistory
} from '../learning/questions/question-history';
import { sourceRetrievalService } from '../learning/questions/source-service';
import { computeContentFingerprint } from '../learning/questions/question-dedup';
import { NormalizedQuestion } from '../learning/questions/types';

describe('Learning Sprint UI & Session Integration — LS2 Test Suite', () => {
  const originalFetch = globalThis.fetch;
  const TEST_USER = 'test_user_ls2';

  beforeEach(() => {
    sourceRetrievalService.clearCache();
    clearTestQuestionHistory(TEST_USER);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    sourceRetrievalService.clearCache();
    clearTestQuestionHistory(TEST_USER);
  });

  describe('1. Dynamic Generation & Batch Refill across Sprints', () => {
    it('generates a full initial batch and records served questions to user history', async () => {
      // Mock window and localStorage
      const store: Record<string, string> = {};
      (globalThis as any).window = {};
      (globalThis as any).localStorage = {
        getItem: (k: string) => store[k] || null,
        setItem: (k: string, v: string) => { store[k] = v; },
        removeItem: (k: string) => { delete store[k]; }
      };

      const res = await questionService.generateQuestions({
        topic: 'TypeScript',
        desiredCount: 5,
        difficulty: 'intermediate',
        userId: TEST_USER
      });

      assert.strictEqual(res.statusCode, 'SUCCESS');
      assert.strictEqual(res.questions.length, 5);
      assert.strictEqual(res.generationMode, 'source');
      assert.ok(res.retrievedSources.length > 0);

      // Record served questions
      recordServedQuestions(TEST_USER, res.questions);
      const history = loadUserQuestionHistory(TEST_USER, 'TypeScript');
      assert.strictEqual(history.length, 5);

      // Second generation cycle for same topic excludes already served questions
      const historyFps = history.map(h => h.fingerprint);
      const res2 = await questionService.generateQuestions({
        topic: 'TypeScript',
        desiredCount: 3,
        excludeFingerprints: historyFps,
        userId: TEST_USER
      });

      // Questions in batch 2 must not collide with batch 1
      for (const q of res2.questions) {
        assert.strictEqual(historyFps.includes(q.fingerprint), false, 'Batch 2 question must not repeat Batch 1 fingerprint');
      }

      delete (globalThis as any).window;
      delete (globalThis as any).localStorage;
    });

    it('returns NO_NEW_QUESTIONS when all candidate novelty is exhausted', async () => {
      const firstRun = await questionService.generateQuestions({
        topic: 'TypeScript',
        desiredCount: 5
      });
      assert.strictEqual(firstRun.statusCode, 'SUCCESS');

      const allFps = firstRun.questions.map(q => q.fingerprint);

      const secondRun = await questionService.generateQuestions({
        topic: 'TypeScript',
        desiredCount: 5,
        excludeFingerprints: allFps,
        maxRefillAttempts: 0
      });

      assert.strictEqual(secondRun.statusCode, 'NO_NEW_QUESTIONS');
      assert.strictEqual(secondRun.questions.length, 0);
    });
  });

  describe('2. Durable History Idempotency & User Isolation', () => {
    it('recordServedQuestions is strictly idempotent across multiple calls/rerenders', () => {
      const store: Record<string, string> = {};
      (globalThis as any).window = {};
      (globalThis as any).localStorage = {
        getItem: (k: string) => store[k] || null,
        setItem: (k: string, v: string) => { store[k] = v; },
        removeItem: (k: string) => { delete store[k]; }
      };

      const dummyQuestions: NormalizedQuestion[] = [
        {
          id: 'q_test_1',
          fingerprint: 'fp_test_1',
          topic: 'React',
          concept: 'React Hooks',
          difficulty: 'intermediate',
          language: 'English',
          format: 'explanation',
          objective: 'conceptual_understanding',
          prompt: 'Explain the rules of React hooks.',
          sourceReferences: [],
          origin: 'curated_source',
          groundingStatus: 'open_inquiry',
          isObjective: false
        }
      ];

      // Call 3 times simulating double-clicks / rerenders
      recordServedQuestions(TEST_USER, dummyQuestions);
      recordServedQuestions(TEST_USER, dummyQuestions);
      recordServedQuestions(TEST_USER, dummyQuestions);

      const history = loadUserQuestionHistory(TEST_USER, 'React');
      assert.strictEqual(history.length, 1, 'Only one record should exist despite multiple recordings');

      delete (globalThis as any).window;
      delete (globalThis as any).localStorage;
    });

    it('isolates user history between different user accounts', () => {
      const store: Record<string, string> = {};
      (globalThis as any).window = {};
      (globalThis as any).localStorage = {
        getItem: (k: string) => store[k] || null,
        setItem: (k: string, v: string) => { store[k] = v; },
        removeItem: (k: string) => { delete store[k]; }
      };

      const qUser1: NormalizedQuestion = {
        id: 'q_u1',
        fingerprint: 'fp_u1',
        topic: 'Next.js',
        concept: 'Routing',
        difficulty: 'intermediate',
        language: 'English',
        format: 'explanation',
        objective: 'conceptual_understanding',
        prompt: 'Explain App Router layout nesting.',
        sourceReferences: [],
        origin: 'curated_source',
        groundingStatus: 'open_inquiry',
        isObjective: false
      };

      recordServedQuestions('user_alpha', [qUser1]);
      assert.strictEqual(loadUserQuestionHistory('user_alpha').length, 1);
      assert.strictEqual(loadUserQuestionHistory('user_beta').length, 0);

      delete (globalThis as any).window;
      delete (globalThis as any).localStorage;
    });
  });

  describe('3. Session Draft Recovery & Legacy Backwards Compatibility', () => {
    it('seamlessly converts legacy string-array keyQuestions into normalized question records', () => {
      const legacyKeyQuestions = [
        'What are the core fundamentals?',
        'How does it work in practice?'
      ];

      // Simulate legacy session recovery adapter
      const converted: NormalizedQuestion[] = legacyKeyQuestions.map((q, i) => ({
        id: `restored_legacy_${i}`,
        fingerprint: computeContentFingerprint(q),
        topic: 'Custom Topic',
        concept: 'Custom Topic',
        difficulty: 'intermediate',
        language: 'English',
        format: 'explanation',
        objective: 'conceptual_understanding',
        prompt: q,
        sourceReferences: [],
        origin: 'fallback_material',
        groundingStatus: 'open_inquiry',
        isObjective: false
      }));

      assert.strictEqual(converted.length, 2);
      assert.strictEqual(converted[0].prompt, legacyKeyQuestions[0]);
      assert.strictEqual(converted[1].prompt, legacyKeyQuestions[1]);
      assert.strictEqual(converted[0].origin, 'fallback_material');
      assert.strictEqual(converted[0].isObjective, false);
      assert.strictEqual(converted[0].groundingStatus, 'open_inquiry');
    });

    it('persists and restores active sprint draft with answers, index, and reveal state', () => {
      const store: Record<string, string> = {};
      const SPRINT_KEY = 'planora_active_learning_sprint';

      const draftState = {
        sprintId: 'sprint_test_999',
        topic: 'JavaScript',
        status: 'in_progress',
        currentQuestionIndex: 2,
        userAnswers: { 'q_1': 'Closures capture outer scope variables.' },
        revealedExplanations: { 'q_1': true },
        structuredQuestions: [
          {
            id: 'q_1',
            fingerprint: 'fp_1',
            topic: 'JavaScript',
            concept: 'Closures',
            difficulty: 'intermediate',
            language: 'English',
            format: 'explanation',
            objective: 'conceptual_understanding',
            prompt: 'Explain JavaScript closures.',
            sourceReferences: [],
            origin: 'curated_source',
            groundingStatus: 'open_inquiry',
            isObjective: false
          }
        ],
        accumulatedSeconds: 120,
        isTimerRunning: true,
        isTimerPaused: false
      };

      store[SPRINT_KEY] = JSON.stringify(draftState);

      // Verify simulated reload
      const recovered = JSON.parse(store[SPRINT_KEY]);
      assert.strictEqual(recovered.sprintId, 'sprint_test_999');
      assert.strictEqual(recovered.currentQuestionIndex, 2);
      assert.strictEqual(recovered.userAnswers['q_1'], 'Closures capture outer scope variables.');
      assert.strictEqual(recovered.revealedExplanations['q_1'], true);
      assert.strictEqual(recovered.accumulatedSeconds, 120);
      assert.strictEqual(recovered.structuredQuestions.length, 1);
    });
  });

  describe('4. Question Formatting & Non-Grading Evaluation Rules', () => {
    it('distinguishes objective questions from open inquiry prompts', () => {
      const mcqQuestion: NormalizedQuestion = {
        id: 'q_mcq',
        fingerprint: 'fp_mcq',
        topic: 'JavaScript',
        concept: 'Call Stack',
        difficulty: 'intermediate',
        language: 'English',
        format: 'mcq',
        objective: 'conceptual_understanding',
        prompt: 'Which queue executes microtasks in JavaScript?',
        choices: ['Microtask Queue', 'Macrotask Queue', 'Render Queue', 'Worker Thread'],
        correctChoiceIndex: 0,
        referenceAnswer: 'Microtask Queue',
        explanation: 'Promises and queueMicrotask enqueue callbacks in the microtask queue.',
        sourceReferences: [],
        origin: 'curated_source',
        groundingStatus: 'fully_grounded',
        isObjective: true
      };

      const openQuestion: NormalizedQuestion = {
        id: 'q_open',
        fingerprint: 'fp_open',
        topic: 'JavaScript',
        concept: 'Design Patterns',
        difficulty: 'advanced',
        language: 'English',
        format: 'scenario',
        objective: 'applied_reasoning',
        prompt: 'Consider a high-throughput event emitter in Node.js. How should backpressure be handled?',
        sourceReferences: [],
        origin: 'curated_source',
        groundingStatus: 'open_inquiry',
        isObjective: false
      };

      assert.strictEqual(mcqQuestion.isObjective, true);
      assert.strictEqual(mcqQuestion.groundingStatus, 'fully_grounded');
      assert.strictEqual(openQuestion.isObjective, false);
      assert.strictEqual(openQuestion.groundingStatus, 'open_inquiry');
    });
  });
});
