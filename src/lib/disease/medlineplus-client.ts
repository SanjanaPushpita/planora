import {
  MedlinePlusTopic,
  MedlinePlusSearchResult,
  DiseaseApiError,
  BodySystemCategory,
  DiseaseTypeCategory,
} from './types';
import { parseMedlinePlusXml } from './medlineplus-parser';
import { classifyDiseaseMetadata } from './disease-categories';
import {
  diseaseCache,
  createCacheKey,
  CACHE_TTL,
} from './disease-cache';

export const MEDLINEPLUS_API_BASE = 'https://wsearch.nlm.nih.gov/ws/query';
export const DEFAULT_MEDLINEPLUS_TOOL = 'PlanoraDiseaseLab';
export const DEFAULT_TIMEOUT_MS = 10000;
export const DEFAULT_RETMAX = 10;
export const MAX_RETMAX = 50;

export type MedlinePlusResult<T> =
  | { ok: true; data: T; fromCache?: boolean }
  | DiseaseApiError;

export interface MedlinePlusSearchOptions {
  limit?: number;
  language?: 'English' | 'Spanish';
  rettype?: 'topic' | 'brief' | 'all';
  timeoutMs?: number;
  baseUrl?: string;
  tool?: string;
  email?: string;
  skipCache?: boolean;
}

/**
 * In-flight promise deduplication map to prevent simultaneous duplicate HTTP fetches.
 */
const inFlightRequests = new Map<string, Promise<MedlinePlusResult<MedlinePlusSearchResult>>>();

/**
 * Classifies a MedlinePlus topic into Planora body systems and disease types
 * using Planora's existing category engine.
 */
export function classifyMedlinePlusTopic(topic: MedlinePlusTopic): {
  bodySystems: BodySystemCategory[];
  diseaseTypes: DiseaseTypeCategory[];
} {
  return classifyDiseaseMetadata({
    name: topic.title,
    definition: topic.fullSummary,
    synonyms: topic.altTitles,
    medlineGroups: topic.groupNames,
    meshHeadings: topic.meshHeadings,
  });
}

/**
 * Fetches MedlinePlus health topics using the official NLM keyword search web service.
 *
 * Contract:
 * - Base URL: https://wsearch.nlm.nih.gov/ws/query
 * - Required parameters: db=healthTopics, term=<query>
 * - Output format: rettype=topic, retmax=10, tool=PlanoraDiseaseLab
 * - Rate limit: NLM requires <= 85 requests/minute per IP address.
 *   Note: Process-local in-memory caching and deduplication help minimize traffic,
 *   but process-local limits alone cannot enforce a shared IP limit across multiple
 *   server instances or distributed cluster processes.
 */
export async function searchMedlinePlusTopics(
  query: string,
  options: MedlinePlusSearchOptions = {}
): Promise<MedlinePlusResult<MedlinePlusSearchResult>> {
  const trimmed = query ? query.trim() : '';

  // 1. Validation
  if (!trimmed) {
    return {
      ok: false,
      error: 'INVALID_QUERY',
      message: 'MedlinePlus search query cannot be empty or whitespace only.',
      source: 'MedlinePlus',
      statusCode: 400,
    };
  }

  if (trimmed.length > 250) {
    return {
      ok: false,
      error: 'INVALID_QUERY',
      message: 'MedlinePlus search query is too long (maximum 250 characters).',
      source: 'MedlinePlus',
      statusCode: 400,
    };
  }

  const language = options.language || 'English';
  const rettype = options.rettype || 'topic';
  const rawLimit = typeof options.limit === 'number' ? options.limit : DEFAULT_RETMAX;
  const clampedLimit = Math.min(Math.max(1, rawLimit), MAX_RETMAX);
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const baseUrl = options.baseUrl || MEDLINEPLUS_API_BASE;
  const tool = options.tool || DEFAULT_MEDLINEPLUS_TOOL;

  // 2. Cache Check (Deterministic key partitioned by query, language, rettype, and limit)
  const cacheKey = createCacheKey(
    'medline',
    `search:${language}:${rettype}:${clampedLimit}:${trimmed}`
  );

  if (!options.skipCache) {
    const cached = diseaseCache.get<MedlinePlusSearchResult>(cacheKey);
    if (cached) {
      return { ok: true, data: cached, fromCache: true };
    }
  }

  // 3. In-flight Request Deduplication
  const existingPromise = inFlightRequests.get(cacheKey);
  if (existingPromise) {
    return existingPromise;
  }

  const fetchPromise = (async (): Promise<MedlinePlusResult<MedlinePlusSearchResult>> => {
    // 4. Construct Request with URL & URLSearchParams
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(baseUrl);
    } catch {
      return {
        ok: false,
        error: 'INVALID_QUERY',
        message: `Invalid base URL provided for MedlinePlus: "${baseUrl}".`,
        source: 'MedlinePlus',
        statusCode: 400,
      };
    }

    const dbParam = language === 'Spanish' ? 'healthTopicsSpanish' : 'healthTopics';
    parsedUrl.searchParams.set('db', dbParam);
    parsedUrl.searchParams.set('term', trimmed);
    parsedUrl.searchParams.set('rettype', rettype);
    parsedUrl.searchParams.set('retmax', String(clampedLimit));
    parsedUrl.searchParams.set('tool', tool);
    if (options.email) {
      parsedUrl.searchParams.set('email', options.email);
    }

    // 5. Execute HTTP Request with AbortController timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    let res: Response;
    try {
      res = await fetch(parsedUrl.toString(), {
        method: 'GET',
        headers: {
          Accept: 'application/xml, text/xml',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const isAbort = (err as { name?: string })?.name === 'AbortError';

      // Check for stale cache fallback
      const staleCached = diseaseCache.get<MedlinePlusSearchResult>(cacheKey);
      if (staleCached) {
        return { ok: true, data: staleCached, fromCache: true };
      }

      return {
        ok: false,
        error: 'DISEASE_SOURCE_UNAVAILABLE',
        message: isAbort
          ? `MedlinePlus request timed out after ${timeoutMs}ms.`
          : `Network error reaching MedlinePlus: ${(err as Error)?.message || 'Unknown network error'}.`,
        source: 'MedlinePlus',
      };
    }

    // 6. Handle HTTP Status Codes
    if (res.status === 429) {
      const staleCached = diseaseCache.get<MedlinePlusSearchResult>(cacheKey);
      if (staleCached) {
        return { ok: true, data: staleCached, fromCache: true };
      }
      return {
        ok: false,
        error: 'RATE_LIMITED',
        message: 'MedlinePlus API rate limit reached (NLM limit is 85 requests/min). Please wait a moment.',
        source: 'MedlinePlus',
        statusCode: 429,
      };
    }

    if (res.status === 400) {
      return {
        ok: false,
        error: 'INVALID_QUERY',
        message: 'Invalid query parameters sent to MedlinePlus Web Service.',
        source: 'MedlinePlus',
        statusCode: 400,
      };
    }

    if (!res.ok) {
      const staleCached = diseaseCache.get<MedlinePlusSearchResult>(cacheKey);
      if (staleCached) {
        return { ok: true, data: staleCached, fromCache: true };
      }
      return {
        ok: false,
        error: 'DISEASE_SOURCE_UNAVAILABLE',
        message: `MedlinePlus Web Service responded with HTTP status ${res.status}.`,
        source: 'MedlinePlus',
        statusCode: res.status,
      };
    }

    // 7. Extract Text and Parse XML
    let xmlText = '';
    try {
      xmlText = await res.text();
    } catch {
      return {
        ok: false,
        error: 'PARSING_ERROR',
        message: 'Failed to read response body text from MedlinePlus.',
        source: 'MedlinePlus',
      };
    }

    const parseResult = parseMedlinePlusXml(xmlText);
    if (!parseResult.ok) {
      return parseResult;
    }

    const searchResult: MedlinePlusSearchResult = {
      query: trimmed,
      totalCount: parseResult.totalCount,
      count: parseResult.count,
      results: parseResult.topics,
      spellingCorrection: parseResult.spellingCorrection,
      fromCache: false,
    };

    // 8. Cache Successful Public Metadata (TTL: 24 hours)
    diseaseCache.set(cacheKey, searchResult, CACHE_TTL.MEDLINEPLUS, 'MedlinePlus');

    return {
      ok: true,
      data: searchResult,
      fromCache: false,
    };
  })();

  inFlightRequests.set(cacheKey, fetchPromise);

  try {
    const result = await fetchPromise;
    return result;
  } finally {
    inFlightRequests.delete(cacheKey);
  }
}

/**
 * Testing helper to reset in-flight deduplication state.
 */
export function _clearInFlightRequestsForTesting(): void {
  inFlightRequests.clear();
}
