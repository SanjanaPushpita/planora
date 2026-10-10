import {
  ExternalDisease,
  MedlinePlusTopic,
  UnifiedSearchOptions,
  UnifiedSearchResult,
  DiseaseDetailOptions,
  CandidateDiscoveryOptions,
  CandidateDiscoveryResult,
  DiseaseApiError,
  BodySystemCategory,
  DiseaseTypeCategory,
} from './types';
import {
  searchDiseaseOntology,
  getDiseaseOntologyTermById,
  getDiseaseOntologyTermByLabel,
  getDiseaseOntologyTerms,
  normalizeDoid,
} from './disease-ontology-client';
import { searchMedlinePlusTopics } from './medlineplus-client';
import { matchMedlinePlusTopic } from './medlineplus-matching';
import {
  diseaseCache,
  createCacheKey,
  CACHE_TTL,
} from './disease-cache';
import {
  BODY_SYSTEMS,
  DISEASE_TYPES,
} from './disease-categories';

export type UnifiedServiceResult<T> =
  | { ok: true; data: T; fromCache?: boolean }
  | (DiseaseApiError & { medlinePlusCandidates?: MedlinePlusTopic[] });

const DEFAULT_CANDIDATE_LIMIT = 50;
const MAX_CANDIDATE_LIMIT = 200;
const DEFAULT_PAGE_BUDGET = 3;
const MAX_PAGE_BUDGET = 10;

/**
 * Searches diseases authoritatively across Disease Ontology (DO) as primary identity source.
 *
 * Rules:
 * - Disease Ontology is the primary disease identity source.
 * - Deduplicates by canonical source + externalId.
 * - Upstream total count is preserved separately from local filtered count.
 * - Does not merge records merely because names look similar.
 * - MedlinePlus health-topic candidates remain separate and clearly distinguished.
 * - If DO fails, returns its structured error; does not hide failure as a successful empty search.
 * - Does not enrich every search result with MedlinePlus (enrichment belongs to details).
 */
export async function searchDiseases(
  query: string,
  options: UnifiedSearchOptions = {}
): Promise<UnifiedServiceResult<UnifiedSearchResult>> {
  const trimmed = query ? query.trim() : '';

  if (!trimmed) {
    return {
      ok: false,
      error: 'INVALID_QUERY',
      message: 'Disease search query cannot be empty or whitespace only.',
      source: 'Disease Ontology',
      statusCode: 400,
    };
  }

  if (trimmed.length > 250) {
    return {
      ok: false,
      error: 'INVALID_QUERY',
      message: 'Disease search query is too long (maximum 250 characters).',
      source: 'Disease Ontology',
      statusCode: 400,
    };
  }

  // 1. Primary Disease Ontology Search
  const doRes = await searchDiseaseOntology(trimmed, {
    page: options.page,
    limit: options.limit,
    timeoutMs: options.timeoutMs,
    skipCache: options.skipCache,
  });

  // Handle DO failure: return structured error, optionally with separate MedlinePlus candidates
  if (!doRes.ok) {
    let medlinePlusCandidates: MedlinePlusTopic[] | undefined;
    if (options.includeMedlinePlusCandidates) {
      try {
        const mlRes = await searchMedlinePlusTopics(trimmed, {
          limit: 5,
          timeoutMs: options.timeoutMs,
          skipCache: options.skipCache,
        });
        if (mlRes.ok) {
          medlinePlusCandidates = mlRes.data.results;
        }
      } catch {
        // MedlinePlus failure is non-fatal to returning the primary DO error
      }
    }
    return {
      ...doRes,
      medlinePlusCandidates,
    };
  }

  // Deduplicate by canonical source + externalId
  const seenCanonicalKeys = new Set<string>();
  const deduplicated: ExternalDisease[] = [];

  for (const disease of doRes.data.results) {
    const key = `${disease.source}:${disease.externalId}`;
    if (!seenCanonicalKeys.has(key)) {
      seenCanonicalKeys.add(key);
      deduplicated.push(disease);
    }
  }

  // Optionally fetch separate MedlinePlus topic candidates without merging them into DO diseases
  let medlinePlusCandidates: MedlinePlusTopic[] | undefined;
  if (options.includeMedlinePlusCandidates) {
    try {
      const mlRes = await searchMedlinePlusTopics(trimmed, {
        limit: 5,
        timeoutMs: options.timeoutMs,
        skipCache: options.skipCache,
      });
      if (mlRes.ok) {
        medlinePlusCandidates = mlRes.data.results;
      }
    } catch {
      // Non-fatal: candidate search failures do not block DO results
    }
  }

  return {
    ok: true,
    data: {
      query: trimmed,
      totalCount: doRes.data.count,
      count: deduplicated.length,
      results: deduplicated,
      medlinePlusCandidates,
      fromCache: doRes.fromCache,
    },
    fromCache: doRes.fromCache,
  };
}

/**
 * Fetches authoritative disease details and conservatively enriches with MedlinePlus if requested.
 *
 * Rules:
 * - Resolves DO reference by ID (or label fallback).
 * - Searches MedlinePlus only when enrichment is requested (enrich !== false).
 * - Uses existing conservative matcher (exact title, MeSH ID, or exact synonym).
 * - Broad topics are never mapped to specific disease subtypes.
 * - Preserves original DO ID, name, definition, synonyms, and provenance.
 * - MedlinePlus additions retain their own provenance.
 * - If MedlinePlus is unavailable, malformed, empty, or ambiguous:
 *   returns usable DO details with explicit enrichmentStatus.
 * - Does not mutate inputs or cached records; returns a fresh object.
 */
export async function getDiseaseDetails(
  reference: string,
  options: DiseaseDetailOptions = {}
): Promise<UnifiedServiceResult<ExternalDisease>> {
  const trimmed = reference ? reference.trim() : '';

  if (!trimmed) {
    return {
      ok: false,
      error: 'INVALID_QUERY',
      message: 'Disease reference identifier cannot be empty.',
      source: 'Disease Ontology',
      statusCode: 400,
    };
  }

  // 1. Resolve Primary Disease Ontology Term
  let doRes = await getDiseaseOntologyTermById(trimmed, {
    timeoutMs: options.timeoutMs,
    skipCache: options.skipCache,
  });

  if (!doRes.ok && doRes.error === 'NOT_FOUND' && !/^\d+$/.test(trimmed) && !trimmed.toUpperCase().startsWith('DOID:')) {
    // Try label lookup fallback
    const labelRes = await getDiseaseOntologyTermByLabel(trimmed, {
      timeoutMs: options.timeoutMs,
      skipCache: options.skipCache,
    });
    if (labelRes.ok) {
      doRes = labelRes;
    }
  }

  if (!doRes.ok) {
    return doRes;
  }

  // Clone to guarantee immutability of cached DO object
  const freshDisease: ExternalDisease = {
    ...doRes.data,
    synonyms: [...doRes.data.synonyms],
    bodySystems: [...doRes.data.bodySystems],
    diseaseTypes: [...doRes.data.diseaseTypes],
    crossReferences: doRes.data.crossReferences ? { ...doRes.data.crossReferences } : undefined,
    rawMetadata: doRes.data.rawMetadata ? { ...doRes.data.rawMetadata } : undefined,
  };

  const shouldEnrich = options.enrich !== false;
  if (!shouldEnrich) {
    freshDisease.enrichmentStatus = 'skipped';
    freshDisease.enrichmentBasis = 'Enrichment skipped by caller option.';
    return {
      ok: true,
      data: freshDisease,
      fromCache: doRes.fromCache,
    };
  }

  // 2. Conservative MedlinePlus Enrichment Search
  try {
    const mlRes = await searchMedlinePlusTopics(freshDisease.name, {
      limit: 10,
      timeoutMs: options.timeoutMs,
      skipCache: options.skipCache,
    });

    if (!mlRes.ok) {
      freshDisease.enrichmentStatus = 'unavailable';
      freshDisease.enrichmentBasis = `MedlinePlus enrichment unavailable: ${mlRes.message}`;
      return {
        ok: true,
        data: freshDisease,
        fromCache: doRes.fromCache,
      };
    }

    const topics = mlRes.data.results;
    if (topics.length === 0) {
      freshDisease.enrichmentStatus = 'unmatched';
      freshDisease.enrichmentBasis = 'No matching MedlinePlus health topics returned.';
      return {
        ok: true,
        data: freshDisease,
        fromCache: doRes.fromCache,
      };
    }

    // Conservative Matcher
    const match = matchMedlinePlusTopic(freshDisease, topics);

    if (
      (match.confidence === 'exact_title' ||
        match.confidence === 'mesh_descriptor' ||
        match.confidence === 'exact_synonym') &&
      match.matchedTopic
    ) {
      freshDisease.medlinePlusUrl = match.matchedTopic.url;
      freshDisease.medlinePlusSummary = match.matchedTopic.fullSummary;
      freshDisease.medlinePlusGroups = [...match.matchedTopic.groupNames];
      freshDisease.matchedTopicId = match.matchedTopic.id;
      freshDisease.enrichmentStatus = 'enriched';
      freshDisease.enrichmentBasis = match.matchBasis;
    } else if (match.confidence === 'weak') {
      freshDisease.enrichmentStatus = match.matchBasis.includes('Ambiguous') ? 'ambiguous' : 'unmatched';
      freshDisease.enrichmentBasis = match.matchBasis;
    } else {
      freshDisease.enrichmentStatus = 'unmatched';
      freshDisease.enrichmentBasis = match.matchBasis;
    }
  } catch (err: unknown) {
    freshDisease.enrichmentStatus = 'unavailable';
    freshDisease.enrichmentBasis = `MedlinePlus enrichment error: ${(err as Error)?.message || 'Unknown error'}`;
  }

  return {
    ok: true,
    data: freshDisease,
    fromCache: doRes.fromCache,
  };
}

/**
 * Resolves requested category filters from options into normalized body systems and disease types.
 */
function resolveCategoryFilters(options: CandidateDiscoveryOptions): {
  bodySystems: BodySystemCategory[];
  diseaseTypes: DiseaseTypeCategory[];
} {
  const bodySystemsSet = new Set<BodySystemCategory>();
  const diseaseTypesSet = new Set<DiseaseTypeCategory>();

  if (Array.isArray(options.bodySystems)) {
    for (const bs of options.bodySystems) {
      if (BODY_SYSTEMS.includes(bs)) bodySystemsSet.add(bs);
    }
  }

  if (Array.isArray(options.diseaseTypes)) {
    for (const dt of options.diseaseTypes) {
      if (DISEASE_TYPES.includes(dt)) diseaseTypesSet.add(dt);
    }
  }

  if (options.category && typeof options.category === 'string') {
    const cat = options.category.trim();
    if (BODY_SYSTEMS.includes(cat as BodySystemCategory)) {
      bodySystemsSet.add(cat as BodySystemCategory);
    } else if (DISEASE_TYPES.includes(cat as DiseaseTypeCategory)) {
      diseaseTypesSet.add(cat as DiseaseTypeCategory);
    }
  }

  return {
    bodySystems: Array.from(bodySystemsSet),
    diseaseTypes: Array.from(diseaseTypesSet),
  };
}

/**
 * Evaluates whether a disease matches the specified category filter semantics:
 * - OR within selected body systems
 * - OR within selected disease types
 * - AND between both groups (if both are provided)
 * - True if no filters are active
 */
export function matchesCategoryFilters(
  disease: ExternalDisease,
  filters: {
    bodySystems: BodySystemCategory[];
    diseaseTypes: DiseaseTypeCategory[];
  }
): boolean {
  const hasBsFilter = filters.bodySystems.length > 0;
  const hasDtFilter = filters.diseaseTypes.length > 0;

  if (!hasBsFilter && !hasDtFilter) {
    return true;
  }

  const matchesBs = !hasBsFilter || disease.bodySystems.some((bs) => filters.bodySystems.includes(bs));
  const matchesDt = !hasDtFilter || disease.diseaseTypes.some((dt) => filters.diseaseTypes.includes(dt));

  return matchesBs && matchesDt;
}

/**
 * Discovers candidate diseases from Disease Ontology matching category filters.
 *
 * Rules:
 * - Filter semantics: OR within body-systems, OR within disease-types, AND between groups.
 * - Uses documented DO /terms endpoint and/or search endpoint.
 * - Excludes obsolete and non-disease terms.
 * - Caches public candidate pools (never includes user exclusions).
 * - Reports pool size and whether discovery was truncated.
 */
export async function getDiseaseCandidates(
  options: CandidateDiscoveryOptions = {}
): Promise<UnifiedServiceResult<CandidateDiscoveryResult>> {
  const filters = resolveCategoryFilters(options);
  const targetLimit = Math.min(
    Math.max(1, typeof options.limit === 'number' ? options.limit : DEFAULT_CANDIDATE_LIMIT),
    MAX_CANDIDATE_LIMIT
  );
  const pageBudget = Math.min(
    Math.max(1, typeof options.maxPages === 'number' ? options.maxPages : DEFAULT_PAGE_BUDGET),
    MAX_PAGE_BUDGET
  );
  const timeoutMs = options.timeoutMs;
  const seedQuery = options.seedQuery ? options.seedQuery.trim() : '';

  // Public cache check
  const bsKey = filters.bodySystems.sort().join('+') || 'any';
  const dtKey = filters.diseaseTypes.sort().join('+') || 'any';
  const cacheKey = createCacheKey(
    'category',
    `candidates:${bsKey}:${dtKey}:${targetLimit}:${seedQuery.toLowerCase()}`
  );

  if (!options.skipCache) {
    const cached = diseaseCache.get<CandidateDiscoveryResult>(cacheKey);
    if (cached) {
      return { ok: true, data: cached, fromCache: true };
    }
  }

  const candidateMap = new Map<string, ExternalDisease>();
  let totalEvaluated = 0;
  let poolTruncated = false;

  // 1. If seed query is provided, evaluate targeted search candidates first
  if (seedQuery) {
    const searchRes = await searchDiseaseOntology(seedQuery, {
      limit: targetLimit,
      timeoutMs,
      skipCache: options.skipCache,
    });
    if (searchRes.ok) {
      for (const term of searchRes.data.results) {
        totalEvaluated++;
        if (matchesCategoryFilters(term, filters)) {
          candidateMap.set(term.externalId, term);
          if (candidateMap.size >= targetLimit) break;
        }
      }
    }
  }

  // 2. Discover via documented GET /terms endpoint up to page budget
  let currentPage = 1;
  while (candidateMap.size < targetLimit && currentPage <= pageBudget) {
    const listingRes = await getDiseaseOntologyTerms({
      page: currentPage,
      limit: 50,
      timeoutMs,
      skipCache: options.skipCache,
    });

    if (!listingRes.ok) {
      // If initial page failed completely and no candidates found, return error
      if (candidateMap.size === 0 && currentPage === 1) {
        return listingRes;
      }
      break;
    }

    const { terms, pageCount } = listingRes.data;
    if (terms.length === 0) break;

    for (const term of terms) {
      totalEvaluated++;
      if (matchesCategoryFilters(term, filters)) {
        if (!candidateMap.has(term.externalId)) {
          candidateMap.set(term.externalId, term);
          if (candidateMap.size >= targetLimit) {
            poolTruncated = true;
            break;
          }
        }
      }
    }

    if (candidateMap.size >= targetLimit || currentPage >= pageCount) {
      break;
    }
    currentPage++;
  }

  if (candidateMap.size >= targetLimit) {
    poolTruncated = true;
  }

  const result: CandidateDiscoveryResult = {
    candidates: Array.from(candidateMap.values()),
    totalEvaluated,
    poolTruncated,
    fromCache: false,
    appliedFilters: filters,
  };

  // Cache public pool
  diseaseCache.set(cacheKey, result, CACHE_TTL.CATEGORY_POOL, 'Disease Ontology');

  return { ok: true, data: result, fromCache: false };
}
