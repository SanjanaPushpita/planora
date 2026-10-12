/**
 * Unified Question Service coordinating source retrieval, generation,
 * duplicate filtering against recent history, and bounded batch refills.
 */

import {
  GenerateQuestionsRequest,
  GenerateQuestionsResponse,
  NormalizedQuestion,
  QuestionEngineStatusCode,
  QuestionHistoryEntry
} from './types';
import { sourceRetrievalService } from './source-service';
import { generateFromRetrievedPassages, generateWithGemini, validateNormalizedQuestion } from './question-generator';
import { checkDuplicateAgainstCollection, computeContentFingerprint, normalizeQuestionText } from './question-dedup';
import { loadUserQuestionHistory } from './question-history';

export class QuestionService {
  /**
   * Generates a batch of diverse questions grounded in verified material with anti-repeat deduplication.
   */
  async generateQuestions(request: GenerateQuestionsRequest): Promise<GenerateQuestionsResponse> {
    const desiredCount = Math.min(Math.max(request.desiredCount || 5, 1), 10);
    const topic = (request.topic || '').trim();

    if (!topic) {
      return {
        statusCode: 'INSUFFICIENT_SOURCE_MATERIAL',
        message: 'Topic name is required for question generation.',
        questions: [],
        topic: '',
        difficulty: request.difficulty || 'intermediate',
        retrievedSources: [],
        requestedCount: desiredCount,
        servedCount: 0,
        refillCount: 0,
        dedupStats: { exactFiltered: 0, similarityFiltered: 0, candidateCount: 0 }
      };
    }

    // 1. Retrieve authoritative public learning material
    const material = await sourceRetrievalService.retrieveMaterial(topic, request.subtopics);
    if (!material || !material.content || material.content.length < 40) {
      return {
        statusCode: 'SOURCE_UNAVAILABLE',
        message: `No authoritative educational material could be retrieved for topic "${topic}".`,
        questions: [],
        topic,
        difficulty: request.difficulty || 'intermediate',
        retrievedSources: [],
        requestedCount: desiredCount,
        servedCount: 0,
        refillCount: 0,
        dedupStats: { exactFiltered: 0, similarityFiltered: 0, candidateCount: 0 }
      };
    }

    const sourceRef = {
      title: material.title,
      url: material.url,
      retrievedAt: material.retrievedAt,
      sourceDomain: material.sourceDomain
    };

    // 2. Build deduplication entries from request.historySignals and request.excludeFingerprints
    const excludedFingerprints = new Set(request.excludeFingerprints || []);
    const existingHistoryEntries: Array<{
      fingerprint: string;
      concept: string;
      format: string;
      objective: string;
      normalizedPromptSnippet: string;
    }> = [];

    if (Array.isArray(request.historySignals)) {
      for (const sig of request.historySignals) {
        if (sig && typeof sig.fingerprint === 'string' && sig.fingerprint.trim()) {
          const fp = sig.fingerprint.trim();
          excludedFingerprints.add(fp);
          existingHistoryEntries.push({
            fingerprint: fp,
            concept: sig.concept || topic,
            format: sig.format || 'explanation',
            objective: sig.objective || 'conceptual_understanding',
            normalizedPromptSnippet: normalizeQuestionText(sig.promptSnippet || sig.concept || '').slice(0, 160)
          });
        }
      }
    }

    // 3. Generate primary candidate batch (Model mode if GEMINI_API_KEY is configured, else Source mode)
    let candidateBatch: NormalizedQuestion[] | null = null;
    let generationMode: 'model' | 'source' = 'source';
    let modelFallbackReason: string | undefined = undefined;

    if (process.env.GEMINI_API_KEY) {
      const geminiResult = await generateWithGemini(process.env.GEMINI_API_KEY, material, {
        ...request,
        desiredCount
      });
      if (geminiResult.success && geminiResult.questions && geminiResult.questions.length > 0) {
        candidateBatch = geminiResult.questions;
        generationMode = 'model';
      } else {
        modelFallbackReason = `Model mode did not run (${geminiResult.errorReason || 'UNKNOWN'}): ${geminiResult.errorMessage || 'Unknown error'}. Operating in source-grounded mode.`;
      }
    } else {
      modelFallbackReason = 'GEMINI_API_KEY is not configured in server environment. Operating in source-grounded mode.';
    }

    if (!candidateBatch || candidateBatch.length === 0) {
      candidateBatch = generateFromRetrievedPassages(material, {
        ...request,
        desiredCount
      });
      generationMode = 'source';
    }

    const acceptedQuestions: NormalizedQuestion[] = [];
    const currentBatchEntries: Array<{
      fingerprint: string;
      concept: string;
      format: string;
      objective: string;
      normalizedPromptSnippet: string;
    }> = [];

    let exactFilteredCount = 0;
    let similarityFilteredCount = 0;
    let totalCandidates = candidateBatch.length;

    for (const candidate of candidateBatch) {
      if (!validateNormalizedQuestion(candidate)) {
        continue;
      }

      // Check caller-excluded fingerprints
      if (excludedFingerprints.has(candidate.fingerprint)) {
        exactFilteredCount++;
        continue;
      }

      // Check against user history
      const historyCheck = checkDuplicateAgainstCollection(candidate, existingHistoryEntries);
      if (historyCheck.isDuplicate) {
        if (historyCheck.reason === 'EXACT_FINGERPRINT') exactFilteredCount++;
        else similarityFilteredCount++;
        continue;
      }

      // Check against current batch
      const batchCheck = checkDuplicateAgainstCollection(candidate, currentBatchEntries);
      if (batchCheck.isDuplicate) {
        if (batchCheck.reason === 'EXACT_FINGERPRINT') exactFilteredCount++;
        else similarityFilteredCount++;
        continue;
      }

      // Accept
      acceptedQuestions.push(candidate);
      currentBatchEntries.push({
        fingerprint: candidate.fingerprint,
        concept: candidate.concept,
        format: candidate.format,
        objective: candidate.objective,
        normalizedPromptSnippet: normalizeQuestionText(candidate.prompt).slice(0, 160)
      });

      if (acceptedQuestions.length >= desiredCount) {
        break;
      }
    }

    let refillAttempts = 0;
    const maxRefillAttempts = typeof request.maxRefillAttempts === 'number' ? request.maxRefillAttempts : 1;

    // 4. Bounded refill attempt if filtered candidates left us short
    if (acceptedQuestions.length < desiredCount && maxRefillAttempts > 0) {
      refillAttempts++;
      const deficit = desiredCount - acceptedQuestions.length;
      
      // Shift formats/objectives to attempt alternative reasoning angles
      const refillCandidates = generateFromRetrievedPassages(material, {
        ...request,
        desiredCount: deficit * 2,
        formats: ['comparison', 'troubleshooting', 'scenario', 'explanation', 'mcq']
      });

      totalCandidates += refillCandidates.length;

      for (const candidate of refillCandidates) {
        if (acceptedQuestions.length >= desiredCount) break;
        if (!validateNormalizedQuestion(candidate)) continue;
        if (excludedFingerprints.has(candidate.fingerprint)) continue;

        const histCheck = checkDuplicateAgainstCollection(candidate, existingHistoryEntries);
        if (histCheck.isDuplicate) continue;

        const batchCheck = checkDuplicateAgainstCollection(candidate, currentBatchEntries);
        if (batchCheck.isDuplicate) continue;

        acceptedQuestions.push(candidate);
        currentBatchEntries.push({
          fingerprint: candidate.fingerprint,
          concept: candidate.concept,
          format: candidate.format,
          objective: candidate.objective,
          normalizedPromptSnippet: normalizeQuestionText(candidate.prompt).slice(0, 160)
        });
      }
    }

    // 5. Determine final status
    let statusCode: QuestionEngineStatusCode = 'SUCCESS';
    let message = `Successfully generated ${acceptedQuestions.length} novel questions grounded in "${material.title}".`;

    if (acceptedQuestions.length === 0) {
      statusCode = 'NO_NEW_QUESTIONS';
      message = 'No new questions found in the currently available material. Try another subtopic or source.';
    } else if (acceptedQuestions.length < desiredCount) {
      statusCode = 'PARTIAL_BATCH';
      message = `Generated ${acceptedQuestions.length} of ${desiredCount} requested questions due to novelty constraints.`;
    }

    // Check if AI provider key notice is needed
    const providerConfigNotice = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY
      ? undefined
      : {
          requiredKey: 'GEMINI_API_KEY',
          instructions: 'To enable full external LLM reasoning in addition to verified educational source synthesis, configure GEMINI_API_KEY or OPENAI_API_KEY in your server environment.'
        };

    return {
      statusCode,
      message,
      questions: acceptedQuestions,
      topic,
      difficulty: request.difficulty || 'intermediate',
      retrievedSources: [sourceRef],
      requestedCount: desiredCount,
      servedCount: acceptedQuestions.length,
      refillCount: refillAttempts,
      generationMode,
      modelFallbackReason,
      dedupStats: {
        exactFiltered: exactFilteredCount,
        similarityFiltered: similarityFilteredCount,
        candidateCount: totalCandidates
      },
      providerConfigNotice
    };
  }
}

export const questionService = new QuestionService();
