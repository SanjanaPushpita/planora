import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import {
  normalizeQuestionText,
  computeContentFingerprint,
  extractShingles,
  calculateJaccardSimilarity,
  hasDifferentNegationPolarity,
  hasDifferentNumbers,
  checkDuplicateAgainstCollection
} from '../learning/questions/question-dedup';
import {
  isSafePublicUrl,
  extractKeyPassages,
  sourceRetrievalService
} from '../learning/questions/source-service';
import {
  validateNormalizedQuestion,
  generateFromRetrievedPassages
} from '../learning/questions/question-generator';
import {
  loadUserQuestionHistory,
  recordServedQuestions,
  clearTestQuestionHistory
} from '../learning/questions/question-history';
import { questionService } from '../learning/questions/question-service';
import { NormalizedQuestion, RetrievedMaterial } from '../learning/questions/types';

describe('Learning Sprint Question Engine — LS1 Test Suite', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    sourceRetrievalService.clearCache();
    clearTestQuestionHistory('test_user_ls1');
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    sourceRetrievalService.clearCache();
    clearTestQuestionHistory('test_user_ls1');
  });

  describe('1. Text Normalization, Fingerprinting & Semantic Sensitivity', () => {
    it('normalizes casing and punctuation while preserving numbers and negation words', () => {
      const raw = 'How do NOT and NO work with 42 items in TypeScript?!';
      const normalized = normalizeQuestionText(raw);
      assert.strictEqual(normalized, 'how do not and no work with 42 items in typescript');
      assert.ok(normalized.includes('not'));
      assert.ok(normalized.includes('no'));
      assert.ok(normalized.includes('42'));
    });

    it('generates deterministic identical fingerprints for identical normalized text', () => {
      const fp1 = computeContentFingerprint('Explain closures in JavaScript.');
      const fp2 = computeContentFingerprint('   explain  closures   in javascript   ');
      assert.strictEqual(fp1, fp2);
      assert.strictEqual(typeof fp1, 'string');
      assert.strictEqual(fp1.length, 8);
    });

    it('distinguishes sentences with different negation polarity', () => {
      const tokensA = ['cache', 'results', 'always'];
      const tokensB = ['never', 'cache', 'results'];
      assert.strictEqual(hasDifferentNegationPolarity(tokensA, tokensB), true);

      const tokensC = ['not', 'cache', 'results'];
      assert.strictEqual(hasDifferentNegationPolarity(tokensB, tokensC), false);
    });

    it('distinguishes sentences with different numeric parameters', () => {
      const tokensA = ['wait', '5', 'seconds'];
      const tokensB = ['wait', '10', 'seconds'];
      assert.strictEqual(hasDifferentNumbers(tokensA, tokensB), true);

      const tokensC = ['wait', '5', 'seconds'];
      assert.strictEqual(hasDifferentNumbers(tokensA, tokensC), false);
    });

    it('calculates Jaccard shingle similarity accurately', () => {
      const shinglesA = extractShingles('explain how event loop queues microtasks');
      const shinglesB = extractShingles('explain how event loop queues microtasks');
      assert.strictEqual(calculateJaccardSimilarity(shinglesA, shinglesB), 1.0);

      const shinglesC = extractShingles('unrelated biology concept about photosynthesis');
      const sim = calculateJaccardSimilarity(shinglesA, shinglesC);
      assert.strictEqual(sim, 0.0);
    });
  });

  describe('2. Deduplication & Repeat Prevention Rules', () => {
    const mockQuestion = (overrides: Partial<NormalizedQuestion>): NormalizedQuestion => ({
      id: 'q_1',
      fingerprint: 'fp_123',
      topic: 'JavaScript',
      concept: 'Event Loop',
      difficulty: 'intermediate',
      language: 'English',
      format: 'explanation',
      objective: 'conceptual_understanding',
      prompt: 'Explain how the JavaScript event loop executes microtasks and macrotasks.',
      sourceReferences: [],
      origin: 'curated_source',
      groundingStatus: 'open_inquiry',
      isObjective: false,
      ...overrides
    });

    it('rejects exact fingerprint duplicates', () => {
      const q = mockQuestion({ fingerprint: 'fp_exact_1' });
      const history = [{
        fingerprint: 'fp_exact_1',
        concept: 'Event Loop',
        format: 'explanation',
        objective: 'conceptual_understanding',
        normalizedPromptSnippet: normalizeQuestionText(q.prompt)
      }];

      const res = checkDuplicateAgainstCollection(q, history);
      assert.strictEqual(res.isDuplicate, true);
      assert.strictEqual(res.reason, 'EXACT_FINGERPRINT');
    });

    it('rejects near-paraphrase repeats on the same concept and objective', () => {
      const q1 = mockQuestion({
        prompt: 'Explain how the JavaScript event loop executes microtasks and macrotasks.',
        fingerprint: computeContentFingerprint('Explain how the JavaScript event loop executes microtasks and macrotasks.')
      });
      const q2 = mockQuestion({
        prompt: 'How does the JavaScript event loop handle executing microtasks and macrotasks in order?',
        fingerprint: computeContentFingerprint('How does the JavaScript event loop handle executing microtasks and macrotasks in order?')
      });

      const history = [{
        fingerprint: q1.fingerprint,
        concept: 'Event Loop',
        format: 'explanation',
        objective: 'conceptual_understanding',
        normalizedPromptSnippet: normalizeQuestionText(q1.prompt)
      }];

      const res = checkDuplicateAgainstCollection(q2, history);
      assert.strictEqual(res.isDuplicate, true);
    });

    it('allows distinct reasoning tasks on the same concept (explanation vs troubleshooting)', () => {
      const qExplanation = mockQuestion({
        format: 'explanation',
        objective: 'conceptual_understanding',
        prompt: 'Explain the principles of the event loop call stack execution.'
      });
      const qTroubleshooting = mockQuestion({
        format: 'troubleshooting',
        objective: 'debugging',
        prompt: 'Diagnose why a long-running synchronous while loop freezes UI rendering.'
      });

      const history = [{
        fingerprint: computeContentFingerprint(qExplanation.prompt),
        concept: 'Event Loop',
        format: qExplanation.format,
        objective: qExplanation.objective,
        normalizedPromptSnippet: normalizeQuestionText(qExplanation.prompt)
      }];

      const res = checkDuplicateAgainstCollection(qTroubleshooting, history);
      assert.strictEqual(res.isDuplicate, false);
    });

    it('preserves negation differences even when other words match', () => {
      const qWithout = mockQuestion({
        prompt: 'How to configure routing without middleware in Next.js?'
      });
      const qWith = mockQuestion({
        prompt: 'How to configure routing with middleware in Next.js?'
      });

      const history = [{
        fingerprint: 'fp_other',
        concept: 'Next.js',
        format: 'explanation',
        objective: 'applied_reasoning',
        normalizedPromptSnippet: normalizeQuestionText(qWith.prompt)
      }];

      const res = checkDuplicateAgainstCollection(qWithout, history);
      assert.strictEqual(res.isDuplicate, false);
    });
  });

  describe('3. Safe Source Retrieval & Public Isolation', () => {
    it('blocks internal and private IPs via anti-SSRF checks', () => {
      assert.strictEqual(isSafePublicUrl('http://localhost:3000/secret'), false);
      assert.strictEqual(isSafePublicUrl('http://127.0.0.1:8080/data'), false);
      assert.strictEqual(isSafePublicUrl('http://169.254.169.254/latest/meta-data/'), false);
      assert.strictEqual(isSafePublicUrl('http://192.168.1.1/admin'), false);
      assert.strictEqual(isSafePublicUrl('http://10.0.0.1/internal'), false);
      assert.strictEqual(isSafePublicUrl('ftp://example.com/file'), false);
    });

    it('allows verified educational and documentation domains', () => {
      assert.strictEqual(isSafePublicUrl('https://en.wikipedia.org/wiki/Medicine'), true);
      assert.strictEqual(isSafePublicUrl('https://developer.mozilla.org/en-US/docs/Web'), true);
      assert.strictEqual(isSafePublicUrl('https://docs.python.org/3/tutorial/'), true);
    });

    it('extracts coherent passages bounded in length and count', () => {
      const longText = 'Sentence one is about programming. Sentence two covers compilers. Sentence three explains interpreters. Sentence four details runtimes. Sentence five describes debuggers.';
      const passages = extractKeyPassages(longText, 3);
      assert.ok(passages.length > 0);
      assert.ok(passages.length <= 3);
    });

    it('retrieves curated educational documentation for core technical subjects', async () => {
      const doc = await sourceRetrievalService.retrieveMaterial('TypeScript');
      assert.ok(doc);
      assert.strictEqual(doc.sourceDomain, 'typescriptlang.org');
      assert.ok(doc.content.includes('TypeScript is a strongly typed'));
      assert.ok(doc.keyPassages.length > 0);
    });
  });

  describe('4. Question Generator & Format Diversity', () => {
    const mockMaterial: RetrievedMaterial = {
      topic: 'JavaScript',
      title: 'JavaScript Event Loop',
      url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Event_loop',
      retrievedAt: new Date().toISOString(),
      sourceDomain: 'developer.mozilla.org',
      content: 'JavaScript has an event loop model of execution where synchronous frames run to completion on the call stack before microtasks and macrotasks are processed.',
      keyPassages: [
        'JavaScript has an event loop model of execution where synchronous frames run to completion on the call stack.',
        'Microtasks like Promises run before macrotasks like setTimeout.'
      ]
    };

    it('generates varied reasoning formats (explanation, scenario, comparison, troubleshooting, mcq)', () => {
      const questions = generateFromRetrievedPassages(mockMaterial, {
        topic: 'JavaScript',
        desiredCount: 5
      });

      assert.strictEqual(questions.length, 5);
      const formats = new Set(questions.map(q => q.format));
      assert.ok(formats.size >= 4, 'Should include at least 4 distinct question formats in batch');
      assert.ok(formats.has('explanation'));
      assert.ok(formats.has('scenario'));
      assert.ok(formats.has('comparison'));
      assert.ok(formats.has('mcq'));
    });

    it('validates MCQ structure with unique choices and grounded answer', () => {
      const questions = generateFromRetrievedPassages(mockMaterial, {
        topic: 'JavaScript',
        desiredCount: 1,
        formats: ['mcq']
      });

      assert.strictEqual(questions.length, 1);
      const mcq = questions[0];
      assert.strictEqual(mcq.format, 'mcq');
      assert.strictEqual(mcq.isObjective, true);
      assert.strictEqual(mcq.groundingStatus, 'fully_grounded');
      assert.ok(Array.isArray(mcq.choices));
      assert.strictEqual(mcq.choices!.length, 4);
      assert.strictEqual(mcq.correctChoiceIndex, 0);
      assert.ok(mcq.referenceAnswer);
      assert.ok(validateNormalizedQuestion(mcq));
    });

    it('rejects malformed questions with duplicate choices or empty prompt', () => {
      const invalidMCQ: Partial<NormalizedQuestion> = {
        id: 'q_bad',
        prompt: 'Valid prompt for testing?',
        topic: 'JS',
        concept: 'Loop',
        format: 'mcq',
        objective: 'conceptual_understanding',
        choices: ['Same choice', 'Same choice', 'Other choice'],
        correctChoiceIndex: 0
      };
      assert.strictEqual(validateNormalizedQuestion(invalidMCQ), false);

      const emptyPrompt: Partial<NormalizedQuestion> = {
        id: 'q_bad_2',
        prompt: '   ',
        topic: 'JS',
        concept: 'Loop',
        format: 'explanation',
        objective: 'conceptual_understanding'
      };
      assert.strictEqual(validateNormalizedQuestion(emptyPrompt), false);
    });
  });

  describe('5. Durable User History & Persistence Isolation', () => {
    it('idempotently records served questions without duplicate entries', () => {
      // Mock window and localStorage for node environment test
      const store: Record<string, string> = {};
      (globalThis as any).window = {};
      (globalThis as any).localStorage = {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, val: string) => { store[key] = val; },
        removeItem: (key: string) => { delete store[key]; }
      };

      const q: NormalizedQuestion = {
        id: 'q_user_1',
        fingerprint: 'fp_abc123',
        topic: 'React',
        concept: 'State',
        difficulty: 'intermediate',
        language: 'English',
        format: 'explanation',
        objective: 'conceptual_understanding',
        prompt: 'Explain how useState triggers reconciliation.',
        sourceReferences: [],
        origin: 'curated_source',
        groundingStatus: 'open_inquiry',
        isObjective: false
      };

      // Record first time
      recordServedQuestions('test_user_ls1', [q]);
      let history = loadUserQuestionHistory('test_user_ls1');
      assert.strictEqual(history.length, 1);
      assert.strictEqual(history[0].fingerprint, 'fp_abc123');

      // Record same question again (simulate double click / reload)
      recordServedQuestions('test_user_ls1', [q]);
      history = loadUserQuestionHistory('test_user_ls1');
      assert.strictEqual(history.length, 1, 'Duplicate record should be ignored idempotently');

      delete (globalThis as any).window;
      delete (globalThis as any).localStorage;
    });

    it('isolates user history by user ID', () => {
      const store: Record<string, string> = {};
      (globalThis as any).window = {};
      (globalThis as any).localStorage = {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, val: string) => { store[key] = val; },
        removeItem: (key: string) => { delete store[key]; }
      };

      const q1: NormalizedQuestion = {
        id: 'q_alice',
        fingerprint: 'fp_alice',
        topic: 'Python',
        concept: 'Generators',
        difficulty: 'intermediate',
        language: 'English',
        format: 'explanation',
        objective: 'conceptual_understanding',
        prompt: 'Explain Python generators yield syntax.',
        sourceReferences: [],
        origin: 'curated_source',
        groundingStatus: 'open_inquiry',
        isObjective: false
      };

      recordServedQuestions('alice', [q1]);
      assert.strictEqual(loadUserQuestionHistory('alice').length, 1);
      assert.strictEqual(loadUserQuestionHistory('bob').length, 0);

      delete (globalThis as any).window;
      delete (globalThis as any).localStorage;
    });
  });

  describe('6. Integrated Question Service & Status Flow', () => {
    it('generates a complete batch of novel questions with source attribution', async () => {
      const res = await questionService.generateQuestions({
        topic: 'TypeScript',
        desiredCount: 5,
        difficulty: 'intermediate'
      });

      assert.strictEqual(res.statusCode, 'SUCCESS');
      assert.strictEqual(res.questions.length, 5);
      assert.strictEqual(res.retrievedSources.length, 1);
      assert.strictEqual(res.retrievedSources[0].sourceDomain, 'typescriptlang.org');
      assert.strictEqual(res.servedCount, 5);
      assert.ok(res.dedupStats.candidateCount >= 5);
    });

    it('returns SOURCE_UNAVAILABLE when topic has no accessible material', async () => {
      const res = await questionService.generateQuestions({
        topic: 'NonExistentTopicXYZ99999',
        desiredCount: 3
      });

      assert.strictEqual(res.statusCode, 'SOURCE_UNAVAILABLE');
      assert.strictEqual(res.questions.length, 0);
      assert.strictEqual(res.servedCount, 0);
    });

    it('returns NO_NEW_QUESTIONS when all candidate fingerprints are excluded', async () => {
      // First get a batch to learn their fingerprints
      const firstRun = await questionService.generateQuestions({
        topic: 'TypeScript',
        desiredCount: 5
      });
      assert.strictEqual(firstRun.statusCode, 'SUCCESS');

      const allFps = firstRun.questions.map(q => q.fingerprint);

      // Request again excluding all possible fingerprints with 0 refills allowed
      const secondRun = await questionService.generateQuestions({
        topic: 'TypeScript',
        desiredCount: 5,
        excludeFingerprints: allFps,
        maxRefillAttempts: 0
      });

      assert.strictEqual(secondRun.statusCode, 'NO_NEW_QUESTIONS');
      assert.strictEqual(secondRun.questions.length, 0);
    });

    it('transparently includes providerConfigNotice when external AI keys are not in env', async () => {
      const res = await questionService.generateQuestions({
        topic: 'JavaScript',
        desiredCount: 2
      });

      assert.strictEqual(res.statusCode, 'SUCCESS');
      assert.ok(res.providerConfigNotice);
      assert.strictEqual(res.providerConfigNotice.requiredKey, 'GEMINI_API_KEY');
      assert.ok(res.providerConfigNotice.instructions.includes('GEMINI_API_KEY'));
    });
  });
});
