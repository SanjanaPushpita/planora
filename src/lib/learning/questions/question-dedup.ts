/**
 * Deterministic text normalization, fingerprint generation, and near-repeat detection.
 * Preserves critical semantic distinctions (negation tokens, numbers) while catching paraphrased tasks.
 */

import { NormalizedQuestion, QuestionHistoryEntry } from './types';

// Critical tokens that alter meaning and must NOT be stripped or collapsed
const CRITICAL_NEGATIONS = new Set(['not', 'no', 'never', 'without', 'except', 'neither', 'nor', 'cannot', 'none']);

/**
 * Normalizes question text for fingerprinting and similarity matching.
 * Preserves numbers and negation words while normalizing case, punctuation, and extra whitespace.
 */
export function normalizeQuestionText(text: string): string {
  if (!text || typeof text !== 'string') return '';

  return text
    .toLowerCase()
    // Replace punctuation except keep alphanumeric characters and spaces
    .replace(/[^\w\s]/g, ' ')
    // Normalize multiple spaces into single space
    .trim()
    .split(/\s+/)
    .map(token => {
      // Retain numbers and negation words intact
      if (CRITICAL_NEGATIONS.has(token) || /^\d+$/.test(token)) {
        return token;
      }
      return token;
    })
    .join(' ');
}

/**
 * Generates deterministic 32-bit FNV-1a hex fingerprint from normalized string.
 */
export function computeContentFingerprint(text: string): string {
  const normalized = normalizeQuestionText(text);
  let hash = 0x811c9dc5; // 2166136261

  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i);
    // 32-bit FNV prime multiplication: hash * 16777619
    hash = Math.imul(hash, 0x01000193);
  }

  // Convert to unsigned 8-character hex
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Extracts word n-grams (shingles) of size n from normalized text.
 */
export function extractShingles(normalizedText: string, n = 2): Set<string> {
  const words = normalizedText.split(' ').filter(Boolean);
  const shingles = new Set<string>();

  if (words.length < n) {
    if (words.length > 0) shingles.add(words.join(' '));
    return shingles;
  }

  for (let i = 0; i <= words.length - n; i++) {
    shingles.add(words.slice(i, i + n).join(' '));
  }

  return shingles;
}

/**
 * Jaccard similarity coefficient between two sets of strings.
 */
export function calculateJaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 && setB.size === 0) return 1.0;
  if (setA.size === 0 || setB.size === 0) return 0.0;

  let intersectionCount = 0;
  for (const item of setA) {
    if (setB.has(item)) {
      intersectionCount++;
    }
  }

  const unionCount = setA.size + setB.size - intersectionCount;
  return unionCount === 0 ? 0 : intersectionCount / unionCount;
}

/**
 * Checks whether two questions have opposite negation status.
 * If one has negation and the other does not, they are NOT duplicates even if shingle score is high.
 */
export function hasDifferentNegationPolarity(tokensA: string[], tokensB: string[]): boolean {
  const hasNegationA = tokensA.some(t => CRITICAL_NEGATIONS.has(t));
  const hasNegationB = tokensB.some(t => CRITICAL_NEGATIONS.has(t));
  return hasNegationA !== hasNegationB;
}

/**
 * Checks whether two questions reference different specific numbers.
 */
export function hasDifferentNumbers(tokensA: string[], tokensB: string[]): boolean {
  const numsA = tokensA.filter(t => /^\d+$/.test(t)).sort().join(',');
  const numsB = tokensB.filter(t => /^\d+$/.test(t)).sort().join(',');
  if (numsA && numsB && numsA !== numsB) {
    return true;
  }
  return false;
}

export interface DedupCheckResult {
  isDuplicate: boolean;
  reason?: 'EXACT_FINGERPRINT' | 'NEAR_PARAPHRASE' | 'SAME_CONCEPT_AND_OBJECTIVE';
  similarityScore?: number;
  conflictingFingerprint?: string;
}

/**
 * Evaluates a candidate question against an existing collection (batch or recent history).
 * 
 * Rules:
 * 1. Exact fingerprint match is always duplicate.
 * 2. Opposing negation or conflicting numbers are never duplicates.
 * 3. High shingle similarity (> 0.60) on same concept/objective is considered near-paraphrase duplicate.
 * 4. Materially different reasoning task (e.g. troubleshooting vs explanation) on the same concept is ALLOWED.
 */
export function checkDuplicateAgainstCollection(
  candidate: NormalizedQuestion,
  existingEntries: Array<{
    fingerprint: string;
    concept: string;
    format: string;
    objective: string;
    normalizedPromptSnippet: string;
  }>,
  similarityThreshold = 0.65
): DedupCheckResult {
  const candidateNorm = normalizeQuestionText(candidate.prompt);
  const candidateTokens = candidateNorm.split(' ').filter(Boolean);
  const candidateShingles = extractShingles(candidateNorm, 2);

  for (const entry of existingEntries) {
    // 1. Exact fingerprint match
    if (candidate.fingerprint === entry.fingerprint) {
      return {
        isDuplicate: true,
        reason: 'EXACT_FINGERPRINT',
        similarityScore: 1.0,
        conflictingFingerprint: entry.fingerprint
      };
    }

    const entryNorm = entry.normalizedPromptSnippet || normalizeQuestionText(entry.fingerprint);
    const entryTokens = entryNorm.split(' ').filter(Boolean);

    // 2. Meaningful negation or number divergence protects novelty
    if (hasDifferentNegationPolarity(candidateTokens, entryTokens)) {
      continue;
    }
    if (hasDifferentNumbers(candidateTokens, entryTokens)) {
      continue;
    }

    // 3. Shingle & Token similarity
    const entryShingles = extractShingles(entryNorm, 2);
    const shingleSim = calculateJaccardSimilarity(candidateShingles, entryShingles);

    const tokenSetA = new Set(candidateTokens);
    const tokenSetB = new Set(entryTokens);
    const tokenSim = calculateJaccardSimilarity(tokenSetA, tokenSetB);
    const compositeSim = Math.max(shingleSim, tokenSim);

    if (compositeSim >= similarityThreshold) {
      return {
        isDuplicate: true,
        reason: 'NEAR_PARAPHRASE',
        similarityScore: compositeSim,
        conflictingFingerprint: entry.fingerprint
      };
    }

    // 4. Same concept + same objective + same format with moderate token/shingle overlap
    const sameConcept = candidate.concept.toLowerCase() === entry.concept.toLowerCase();
    const sameObjective = candidate.objective === entry.objective;
    const sameFormat = candidate.format === entry.format;

    if (sameConcept && sameObjective && sameFormat && compositeSim >= 0.40) {
      return {
        isDuplicate: true,
        reason: 'SAME_CONCEPT_AND_OBJECTIVE',
        similarityScore: compositeSim,
        conflictingFingerprint: entry.fingerprint
      };
    }

    // 5. Quote/evidence overlap: if candidate shares the same specific concept and has high token overlap
    if (sameConcept && compositeSim >= 0.48) {
      return {
        isDuplicate: true,
        reason: 'NEAR_PARAPHRASE',
        similarityScore: compositeSim,
        conflictingFingerprint: entry.fingerprint
      };
    }
  }

  return { isDuplicate: false };
}
