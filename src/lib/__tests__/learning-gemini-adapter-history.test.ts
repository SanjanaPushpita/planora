import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import {
  generateWithGemini,
  isValidGeminiModel,
  DEFAULT_GEMINI_MODEL
} from '../learning/questions/question-generator';
import { questionService } from '../learning/questions/question-service';
import { sourceRetrievalService } from '../learning/questions/source-service';
import { computeContentFingerprint, normalizeQuestionText } from '../learning/questions/question-dedup';
import { RetrievedMaterial, GenerateQuestionsRequest } from '../learning/questions/types';

describe('Learning Sprint — Phase LS2.1: Gemini Adapter & History Near-Repeat Tests', () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };

  const mockMaterial: RetrievedMaterial = {
    topic: 'TypeScript',
    title: 'TypeScript Documentation - Types and Interfaces',
    url: 'https://www.typescriptlang.org/docs/handbook/2/everyday-types.html',
    retrievedAt: new Date().toISOString(),
    sourceDomain: 'typescriptlang.org',
    content: 'Interfaces and type aliases define object shapes. Generics allow components to work across multiple types. Type narrowing uses type guards.',
    keyPassages: [
      'Interfaces and type aliases define object shapes.',
      'Generics allow components to work across multiple types.',
      'Type narrowing uses type guards.'
    ]
  };

  beforeEach(() => {
    sourceRetrievalService.clearCache();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env = { ...originalEnv };
    sourceRetrievalService.clearCache();
  });

  describe('1. Model Identifier Validation & Security', () => {
    it('accepts valid, safe model identifiers', () => {
      assert.strictEqual(isValidGeminiModel('gemini-2.5-flash'), true);
      assert.strictEqual(isValidGeminiModel('gemini-2.0-flash'), true);
      assert.strictEqual(isValidGeminiModel('gemini-2.5-pro'), true);
      assert.strictEqual(isValidGeminiModel('gemini-2.5-flash-lite'), true);
      assert.strictEqual(isValidGeminiModel(DEFAULT_GEMINI_MODEL), true);
    });

    it('rejects unsafe model identifiers containing path traversal, URLs, or colons', () => {
      assert.strictEqual(isValidGeminiModel('https://evil.com/model'), false);
      assert.strictEqual(isValidGeminiModel('../../../etc/passwd'), false);
      assert.strictEqual(isValidGeminiModel('gemini-2.5-flash:generateContent'), false);
      assert.strictEqual(isValidGeminiModel('model?key=injected'), false);
      assert.strictEqual(isValidGeminiModel('model/subpath'), false);
      assert.strictEqual(isValidGeminiModel(''), false);
      assert.strictEqual(isValidGeminiModel('   '), false);
    });

    it('generateWithGemini returns INVALID_MODEL error when given an unsafe model name', async () => {
      const result = await generateWithGemini(
        'mock_key',
        mockMaterial,
        { topic: 'TypeScript', desiredCount: 2 },
        'invalid/model/path'
      );

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.errorReason, 'INVALID_MODEL');
      assert.ok(result.errorMessage?.includes('Invalid GEMINI_MODEL'));
    });

    it('generateWithGemini returns MISSING_API_KEY error when API key is missing or blank', async () => {
      const result = await generateWithGemini(
        '',
        mockMaterial,
        { topic: 'TypeScript', desiredCount: 2 }
      );

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.errorReason, 'MISSING_API_KEY');
    });
  });

  describe('2. Gemini Request Construction & Error Handling', () => {
    it('constructs correct v1beta URL and sends structured responseSchema in generationConfig', async () => {
      let capturedUrl = '';
      let capturedBody: any = null;

      globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
        capturedUrl = String(url);
        capturedBody = JSON.parse(init?.body as string);

        return {
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        questions: [
                          {
                            concept: 'Generics',
                            format: 'explanation',
                            objective: 'applied_reasoning',
                            prompt: 'How do TypeScript generics enforce type safety across varying collection types?',
                            referenceAnswer: 'Generics create type variables that capture argument types.',
                            explanation: 'Assesses structural typing mechanisms.'
                          }
                        ]
                      })
                    }
                  ]
                }
              }
            ]
          })
        } as Response;
      }) as typeof fetch;

      const result = await generateWithGemini(
        'test_api_key_123',
        mockMaterial,
        { topic: 'TypeScript', desiredCount: 1 },
        'gemini-2.5-flash'
      );

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.questions?.length, 1);
      assert.strictEqual(result.questions?.[0].concept, 'Generics');

      // Verify URL targets verified model and v1beta endpoint
      assert.ok(capturedUrl.startsWith('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=test_api_key_123'));

      // Verify structured JSON schema in generationConfig
      assert.strictEqual(capturedBody.generationConfig.responseMimeType, 'application/json');
      assert.strictEqual(capturedBody.generationConfig.responseSchema.type, 'OBJECT');
      assert.strictEqual(capturedBody.generationConfig.responseSchema.properties.questions.type, 'ARRAY');
    });

    it('handles HTTP 404 (retired or unavailable model) gracefully', async () => {
      globalThis.fetch = (async () => ({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      } as Response)) as typeof fetch;

      const result = await generateWithGemini(
        'mock_key',
        mockMaterial,
        { topic: 'TypeScript', desiredCount: 2 },
        'gemini-1.5-flash' // retired model
      );

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.errorReason, 'MODEL_NOT_FOUND');
      assert.ok(result.errorMessage?.includes('HTTP 404'));
    });

    it('handles HTTP 429 (rate limited or quota exceeded) gracefully', async () => {
      globalThis.fetch = (async () => ({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests'
      } as Response)) as typeof fetch;

      const result = await generateWithGemini(
        'mock_key',
        mockMaterial,
        { topic: 'TypeScript', desiredCount: 2 }
      );

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.errorReason, 'RATE_LIMITED');
      assert.ok(result.errorMessage?.includes('HTTP 429'));
    });

    it('handles invalid/malformed JSON output schema gracefully', async () => {
      globalThis.fetch = (async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: 'This is not valid JSON {{' }]
              }
            }
          ]
        })
      } as Response)) as typeof fetch;

      const result = await generateWithGemini(
        'mock_key',
        mockMaterial,
        { topic: 'TypeScript', desiredCount: 2 }
      );

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.errorReason, 'INVALID_RESPONSE_SCHEMA');
    });

    it('handles timeout when upstream model aborts', async () => {
      globalThis.fetch = (async (_url: any, init?: any) => {
        // Trigger abort
        const err = new Error('The operation was aborted');
        err.name = 'AbortError';
        throw err;
      }) as typeof fetch;

      const result = await generateWithGemini(
        'mock_key',
        mockMaterial,
        { topic: 'TypeScript', desiredCount: 2 }
      );

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.errorReason, 'TIMEOUT');
    });
  });

  describe('3. QuestionService Fallback & Mode Reporting', () => {
    it('falls back to source mode and reports exact fallback reason when model returns error', async () => {
      process.env.GEMINI_API_KEY = 'test_key';
      process.env.GEMINI_MODEL = 'gemini-nonexistent-model';

      globalThis.fetch = (async (url: any) => {
        if (String(url).includes('generativelanguage.googleapis.com')) {
          return {
            ok: false,
            status: 404,
            statusText: 'Not Found'
          } as Response;
        }
        return originalFetch(url);
      }) as typeof fetch;

      const res = await questionService.generateQuestions({
        topic: 'TypeScript',
        desiredCount: 2
      });

      assert.strictEqual(res.statusCode, 'SUCCESS');
      assert.strictEqual(res.generationMode, 'source');
      assert.ok(res.modelFallbackReason?.includes('MODEL_NOT_FOUND'));
      assert.ok(res.modelFallbackReason?.includes('Operating in source-grounded mode'));
      assert.strictEqual(res.questions.length, 2);
    });

    it('reports missing API key reason when GEMINI_API_KEY is not configured', async () => {
      delete process.env.GEMINI_API_KEY;

      const res = await questionService.generateQuestions({
        topic: 'TypeScript',
        desiredCount: 2
      });

      assert.strictEqual(res.statusCode, 'SUCCESS');
      assert.strictEqual(res.generationMode, 'source');
      assert.ok(res.modelFallbackReason?.includes('GEMINI_API_KEY is not configured'));
    });
  });

  describe('4. Repeat Prevention with History Comparison Signals', () => {
    it('filters out questions with high token/shingle similarity matching historySignals', async () => {
      // 1. Initial request to get genuine generated questions
      const initial = await questionService.generateQuestions({
        topic: 'TypeScript',
        desiredCount: 3
      });
      assert.strictEqual(initial.statusCode, 'SUCCESS');
      const firstQ = initial.questions[0];

      // 2. Build history comparison signals containing the first question
      const historySignals = [
        {
          fingerprint: firstQ.fingerprint,
          concept: firstQ.concept,
          format: firstQ.format,
          objective: firstQ.objective,
          promptSnippet: normalizeQuestionText(firstQ.prompt).slice(0, 160)
        }
      ];

      // 3. Request questions passing historySignals
      const secondRun = await questionService.generateQuestions({
        topic: 'TypeScript',
        desiredCount: 3,
        historySignals,
        excludeFingerprints: [firstQ.fingerprint]
      });

      assert.strictEqual(secondRun.statusCode, 'SUCCESS');
      // The served questions in secondRun must NOT contain the first question or its near paraphrase
      for (const q of secondRun.questions) {
        assert.notStrictEqual(q.fingerprint, firstQ.fingerprint);
      }
      assert.ok(secondRun.dedupStats.exactFiltered >= 1 || secondRun.dedupStats.similarityFiltered >= 1);
    });

    it('returns corrected exhaustion message when material novelty is exhausted', async () => {
      // Get all available questions
      const run1 = await questionService.generateQuestions({
        topic: 'TypeScript',
        desiredCount: 8
      });

      const allFps = run1.questions.map(q => q.fingerprint);
      const allSignals = run1.questions.map(q => ({
        fingerprint: q.fingerprint,
        concept: q.concept,
        format: q.format,
        objective: q.objective,
        promptSnippet: normalizeQuestionText(q.prompt).slice(0, 160)
      }));

      // Request with all fingerprints and signals excluded and maxRefillAttempts: 0
      const exhaustedRun = await questionService.generateQuestions({
        topic: 'TypeScript',
        desiredCount: 5,
        excludeFingerprints: allFps,
        historySignals: allSignals,
        maxRefillAttempts: 0
      });

      assert.strictEqual(exhaustedRun.statusCode, 'NO_NEW_QUESTIONS');
      assert.strictEqual(
        exhaustedRun.message,
        'No new questions found in the currently available material. Try another subtopic or source.'
      );
      assert.strictEqual(exhaustedRun.questions.length, 0);
    });
  });

  describe('5. Source Grounding & Attribution Consistency', () => {
    it('properly attributes Wikipedia articles with "Wikipedia: " title prefix', async () => {
      globalThis.fetch = (async (url: any) => {
        if (String(url).includes('en.wikipedia.org')) {
          return {
            ok: true,
            status: 200,
            text: async () => JSON.stringify({
              title: 'Photosynthesis',
              extract: 'Photosynthesis is a biological process used by plants to synthesize nutrients from light energy. Chlorophyll absorbs solar radiation.',
              content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/Photosynthesis' } }
            })
          } as Response;
        }
        return originalFetch(url);
      }) as typeof fetch;

      const res = await questionService.generateQuestions({
        topic: 'Photosynthesis',
        desiredCount: 2
      });

      assert.strictEqual(res.statusCode, 'SUCCESS');
      assert.ok(res.retrievedSources.length > 0);
      assert.strictEqual(res.retrievedSources[0].sourceDomain, 'en.wikipedia.org');
      assert.ok(res.retrievedSources[0].title.startsWith('Wikipedia: Photosynthesis'));
    });
  });
});
