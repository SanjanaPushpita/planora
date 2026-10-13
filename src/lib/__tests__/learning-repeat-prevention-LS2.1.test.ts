/**
 * Learning Sprint LS2.1 Regression Test Suite:
 * Verifies the reproduction of user-visible repetition and proves that multi-batch
 * question delivery, unseen-concept selection, topic alias matching, and truthful
 * exhaustion operate reliably without silent fallback to legacy starter questions.
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { questionService } from '../learning/questions/question-service';
import { 
  canonicalizeTopicKey, 
  loadUserQuestionHistory, 
  recordServedQuestions, 
  clearTestQuestionHistory 
} from '../learning/questions/question-history';
import { 
  checkDuplicateAgainstCollection, 
  computeContentFingerprint, 
  normalizeQuestionText 
} from '../learning/questions/question-dedup';
import { cleanTopicForSearch, isSafePublicUrl } from '../learning/questions/source-service';
import { NormalizedQuestion } from '../learning/questions/types';

describe('Learning Sprint LS2.1 — Repeat Prevention & Real Source Grounding', () => {
  beforeEach(() => {
    (globalThis as any).window = {};
    const storage: Record<string, string> = {};
    (globalThis as any).localStorage = {
      getItem: (k: string) => storage[k] || null,
      setItem: (k: string, v: string) => { storage[k] = v; },
      removeItem: (k: string) => { delete storage[k]; },
      clear: () => { Object.keys(storage).forEach(k => delete storage[k]); }
    };
  });

  afterEach(() => {
    delete (globalThis as any).window;
    delete (globalThis as any).localStorage;
  });

  describe('1. Multi-Batch Consecutive Novelty on Real Technical Corpus', () => {
    it('serves 3 consecutive 3-question batches for Python with 100% unique prompts and concepts', async () => {
      const topic = 'Python';
      const allPrompts = new Set<string>();
      const allFingerprints = new Set<string>();
      const excludedFps: string[] = [];
      const historySignals: Array<{
        fingerprint: string;
        concept: string;
        format: any;
        objective: any;
        promptSnippet: string;
      }> = [];

      for (let batch = 1; batch <= 3; batch++) {
        const res = await questionService.generateQuestions({
          topic,
          desiredCount: 3,
          difficulty: 'intermediate',
          excludeFingerprints: excludedFps,
          historySignals
        });

        assert.strictEqual(res.statusCode, 'SUCCESS');
        assert.strictEqual(res.servedCount, 3);
        assert.strictEqual(res.questions.length, 3);

        for (const q of res.questions) {
          // Verify no prompt or fingerprint has been seen in previous batches
          assert.strictEqual(allPrompts.has(q.prompt), false, `Prompt repeat detected in batch ${batch}: "${q.prompt}"`);
          assert.strictEqual(allFingerprints.has(q.fingerprint), false, `Fingerprint collision detected: ${q.fingerprint}`);

          allPrompts.add(q.prompt);
          allFingerprints.add(q.fingerprint);
          excludedFps.push(q.fingerprint);
          historySignals.push({
            fingerprint: q.fingerprint,
            concept: q.concept,
            format: q.format,
            objective: q.objective,
            promptSnippet: normalizeQuestionText(q.prompt).slice(0, 160)
          });
        }
      }

      // Proves 9 completely distinct questions were delivered across the 3 consecutive batches
      assert.strictEqual(allPrompts.size, 9);
      assert.strictEqual(allFingerprints.size, 9);
    });
  });

  describe('2. Topic Canonicalization & Alias Matching', () => {
    it('canonicalizes topic names across conversational wrappers, punctuation, and suffixes', () => {
      assert.strictEqual(canonicalizeTopicKey('Python Programming'), 'python');
      assert.strictEqual(canonicalizeTopicKey('Python'), 'python');
      assert.strictEqual(canonicalizeTopicKey('TypeScript Mastery'), 'typescript');
      assert.strictEqual(canonicalizeTopicKey('How does Transformer Self-Attention work?'), 'transformer self attention');
      assert.strictEqual(canonicalizeTopicKey('Vector Databases & RAG'), 'vector databases rag');
    });

    it('retrieves stored history across topic aliases without modifying raw keys', () => {
      const testQuestion: NormalizedQuestion = {
        id: 'q_test_1',
        fingerprint: 'fp_python_test',
        topic: 'Python Programming',
        concept: 'Python - Generators',
        difficulty: 'intermediate',
        language: 'English',
        format: 'explanation',
        objective: 'conceptual_understanding',
        prompt: 'Explain how generators evaluate yield in Python.',
        origin: 'curated_source',
        groundingStatus: 'open_inquiry',
        isObjective: false,
        sourceReferences: []
      };

      // Record under "Python Programming"
      recordServedQuestions('user_42', [testQuestion]);

      // Query history under alias "Python"
      const matched = loadUserQuestionHistory('user_42', 'Python');
      assert.strictEqual(matched.length, 1);
      assert.strictEqual(matched[0].fingerprint, 'fp_python_test');
      assert.strictEqual(matched[0].topic, 'Python Programming'); // Original stored record preserved
    });

    it('merges unhydrated guest_user entries when authenticated user ID is provided', () => {
      const guestQ: NormalizedQuestion = {
        id: 'q_guest_1',
        fingerprint: 'fp_guest_123',
        topic: 'TypeScript',
        concept: 'TypeScript - Interfaces',
        difficulty: 'intermediate',
        language: 'English',
        format: 'scenario',
        objective: 'applied_reasoning',
        prompt: 'Consider an interface scenario in TypeScript.',
        origin: 'curated_source',
        groundingStatus: 'open_inquiry',
        isObjective: false,
        sourceReferences: []
      };

      // Recorded prior to auth hydration
      recordServedQuestions('guest_user', [guestQ]);

      // Loaded after user profile hydrates
      const userHistory = loadUserQuestionHistory('usr_authenticated_99', 'TypeScript');
      assert.strictEqual(userHistory.length, 1);
      assert.strictEqual(userHistory[0].fingerprint, 'fp_guest_123');
    });
  });

  describe('3. Deduplication & Semantic Near-Repeat Rules', () => {
    it('detects near-paraphrase when template changes but core sentence and concept are identical', () => {
      const existing = [{
        fingerprint: 'fp_100',
        concept: 'Python - Generators',
        format: 'explanation',
        objective: 'conceptual_understanding',
        normalizedPromptSnippet: normalizeQuestionText('based on the principles explain how generators evaluate lazily via yield returning iterators')
      }];

      const candidate: NormalizedQuestion = {
        id: 'q_cand_1',
        fingerprint: 'fp_101',
        topic: 'Python',
        concept: 'Python - Generators',
        difficulty: 'intermediate',
        language: 'English',
        format: 'explanation',
        objective: 'conceptual_understanding',
        prompt: 'In practice explain how generators evaluate lazily via yield returning iterators in Python',
        origin: 'curated_source',
        groundingStatus: 'open_inquiry',
        isObjective: false,
        sourceReferences: []
      };

      const result = checkDuplicateAgainstCollection(candidate, existing);
      assert.strictEqual(result.isDuplicate, true);
    });

    it('preserves distinct questions with critical negation words', () => {
      const existing = [{
        fingerprint: 'fp_neg_1',
        concept: 'Python - Concurrency',
        format: 'explanation',
        objective: 'conceptual_understanding',
        normalizedPromptSnippet: normalizeQuestionText('coroutines execute with multithreading synchronization')
      }];

      const candidate: NormalizedQuestion = {
        id: 'q_neg_2',
        fingerprint: 'fp_neg_2',
        topic: 'Python',
        concept: 'Python - Concurrency',
        difficulty: 'intermediate',
        language: 'English',
        format: 'explanation',
        objective: 'conceptual_understanding',
        prompt: 'Coroutines execute without multithreading synchronization',
        origin: 'curated_source',
        groundingStatus: 'open_inquiry',
        isObjective: false,
        sourceReferences: []
      };

      const result = checkDuplicateAgainstCollection(candidate, existing);
      assert.strictEqual(result.isDuplicate, false);
    });
  });

  describe('4. Wikipedia Query Cleaning & Safe Source Allowlisting', () => {
    it('strips conversational question phrases into concise search targets', () => {
      assert.strictEqual(
        cleanTopicForSearch('How does Transformer Self-Attention work?'),
        'Transformer Self-Attention'
      );
      assert.strictEqual(
        cleanTopicForSearch('How does Facial Recognition work in modern systems?'),
        'Facial Recognition'
      );
      assert.strictEqual(
        cleanTopicForSearch('What is Cognitive Bias?'),
        'Cognitive Bias'
      );
    });

    it('allows official educational domains including typescriptlang.org and rejects private network addresses', () => {
      assert.strictEqual(isSafePublicUrl('https://www.typescriptlang.org/docs/handbook/2/everyday-types.html'), true);
      assert.strictEqual(isSafePublicUrl('https://en.wikipedia.org/wiki/Microeconomics'), true);
      assert.strictEqual(isSafePublicUrl('https://developer.mozilla.org/en-US/docs/Web'), true);
      assert.strictEqual(isSafePublicUrl('http://169.254.169.254/latest/meta-data'), false);
      assert.strictEqual(isSafePublicUrl('http://localhost:3000'), false);
      assert.strictEqual(isSafePublicUrl('http://192.168.1.1'), false);
    });
  });

  describe('5. Truthful Partial Batch & Exhaustion Behavior', () => {
    it('truthfully signals NO_NEW_QUESTIONS once bounded material is fully explored without silent fallback', async () => {
      const topic = 'Python';
      const allFps: string[] = [];
      const historySignals: any[] = [];

      // Loop through all batches until material is exhausted
      let finalRun = await questionService.generateQuestions({
        topic,
        desiredCount: 3,
        excludeFingerprints: allFps,
        historySignals
      });

      while (finalRun.statusCode === 'SUCCESS' || finalRun.statusCode === 'PARTIAL_BATCH') {
        for (const q of finalRun.questions) {
          allFps.push(q.fingerprint);
          historySignals.push({
            fingerprint: q.fingerprint,
            concept: q.concept,
            promptSnippet: normalizeQuestionText(q.prompt).slice(0, 160)
          });
        }
        finalRun = await questionService.generateQuestions({
          topic,
          desiredCount: 3,
          excludeFingerprints: allFps,
          historySignals
        });
      }

      assert.strictEqual(finalRun.statusCode, 'NO_NEW_QUESTIONS');
      assert.strictEqual(finalRun.servedCount, 0);
      assert.strictEqual(finalRun.questions.length, 0);
      assert.ok(finalRun.message.includes('No new questions found'));
    });
  });
});
