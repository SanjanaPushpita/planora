import {
  ExternalDisease,
  RandomSelectionOptions,
  RandomSelectionResult,
} from './types';
import {
  getDiseaseCandidates,
  getDiseaseDetails,
} from './disease-service';
import { normalizeDoid } from './disease-ontology-client';

const DEFAULT_POOL_LIMIT = 50;
const DEFAULT_REFILL_BUDGET = 2;
const MAX_REFILL_BUDGET = 5;

/**
 * Normalizes all excluded, recent, and active disease identifiers into standard DOID formats.
 */
function buildExcludedIdSet(options: RandomSelectionOptions): Set<string> {
  const set = new Set<string>();

  const addId = (id: unknown) => {
    if (typeof id === 'string') {
      const trimmed = id.trim();
      if (trimmed) {
        set.add(normalizeDoid(trimmed));
      }
    }
  };

  if (Array.isArray(options.excludedDiseaseIds)) {
    options.excludedDiseaseIds.forEach(addId);
  }
  if (Array.isArray(options.recentDiseaseIds)) {
    options.recentDiseaseIds.forEach(addId);
  }
  if (options.currentDiseaseId) {
    addId(options.currentDiseaseId);
  }

  return set;
}

/**
 * Randomly selects an unseen disease matching requested category filters.
 *
 * Rules:
 * - Collects caller-supplied exclusions (excluded IDs, recent IDs, current ID).
 * - Normalizes DOIDs so format variations (e.g., "10652" vs "DOID:10652") are deduplicated reliably.
 * - Removes excluded/current/recent diseases BEFORE sampling.
 * - Uniform sampling using injectable RNG.
 * - Does not claim uniform selection across all global diseases; reports coverage limitation notice.
 * - If all eligible candidates are exhausted, uses a small refill budget.
 * - If still exhausted, returns structured NO_UNSEEN_DISEASE error.
 * - Never silently clears history or returns an excluded disease.
 * - Does not load or mutate private user history; caller controls history acceptance.
 * - Samples first, then optionally enriches ONLY the chosen disease.
 */
export async function getRandomDisease(
  options: RandomSelectionOptions = {}
): Promise<RandomSelectionResult> {
  const excludedSet = buildExcludedIdSet(options);
  const poolLimit = options.candidateLimit || DEFAULT_POOL_LIMIT;

  // 1. Initial Candidate Pool Discovery
  const candidatesRes = await getDiseaseCandidates({
    bodySystems: options.bodySystems,
    diseaseTypes: options.diseaseTypes,
    category: options.category,
    limit: poolLimit,
    timeoutMs: options.timeoutMs,
  });

  if (!candidatesRes.ok) {
    return {
      ok: false,
      error: 'DISEASE_SOURCE_UNAVAILABLE',
      message: `Failed to retrieve disease candidates: ${candidatesRes.message}`,
      poolSize: 0,
      eligibleCount: 0,
    };
  }

  const initialCandidates = candidatesRes.data.candidates;
  if (initialCandidates.length === 0) {
    return {
      ok: false,
      error: 'EMPTY_CANDIDATE_POOL',
      message: 'No candidate diseases could be found matching the requested category filters.',
      poolSize: 0,
      eligibleCount: 0,
    };
  }

  // 2. Filter out excluded / recent / current diseases BEFORE sampling
  let eligible = initialCandidates.filter(
    (c) => !excludedSet.has(normalizeDoid(c.externalId))
  );

  let poolSize = initialCandidates.length;

  // 3. Bounded Refill if eligible pool is exhausted
  const refillBudget = Math.min(
    Math.max(0, typeof options.refillBudget === 'number' ? options.refillBudget : DEFAULT_REFILL_BUDGET),
    MAX_REFILL_BUDGET
  );

  if (eligible.length === 0 && refillBudget > 0 && candidatesRes.data.poolTruncated) {
    const refillRes = await getDiseaseCandidates({
      bodySystems: options.bodySystems,
      diseaseTypes: options.diseaseTypes,
      category: options.category,
      limit: poolLimit + refillBudget * 25,
      maxPages: refillBudget + 3,
      timeoutMs: options.timeoutMs,
      skipCache: true, // Bypass cache to evaluate deeper pages
    });

    if (refillRes.ok) {
      poolSize = refillRes.data.candidates.length;
      eligible = refillRes.data.candidates.filter(
        (c) => !excludedSet.has(normalizeDoid(c.externalId))
      );
    }
  }

  // 4. Exhaustion check: Never silently clear history or return a duplicate
  if (eligible.length === 0) {
    return {
      ok: false,
      error: 'NO_UNSEEN_DISEASE',
      message:
        'All available candidate diseases matching these category filters have already been studied or excluded.',
      poolSize,
      eligibleCount: 0,
    };
  }

  // 5. Uniform Random Sampling within available eligible candidates
  const rng = typeof options.rng === 'function' ? options.rng : Math.random;
  const rawIndex = Math.floor(rng() * eligible.length);
  const selectedIndex = Math.min(Math.max(0, rawIndex), eligible.length - 1);
  let selected = eligible[selectedIndex];

  // 6. Post-Selection Enrichment (Enrich ONLY the chosen disease)
  if (options.enrich) {
    try {
      const detailRes = await getDiseaseDetails(selected.externalId, {
        enrich: true,
        timeoutMs: options.timeoutMs,
      });
      if (detailRes.ok) {
        selected = detailRes.data;
      }
    } catch {
      // Enrichment failure leaves core authoritative disease intact
    }
  }

  const canonicalKey = `${selected.source}:${selected.externalId}`;
  const coverageLimitationNotice = `Selected uniformly from current verified candidate pool (size: ${eligible.length}). Not a uniform sample across all global diseases.`;

  return {
    ok: true,
    disease: selected,
    canonicalKey,
    poolSize,
    eligibleCount: eligible.length,
    coverageLimitationNotice,
    enrichmentStatus: selected.enrichmentStatus,
  };
}
