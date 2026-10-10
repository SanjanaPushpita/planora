import {
  ExternalDisease,
  DiseaseSearchResult,
  DiseaseApiError,
  DiseaseSource,
} from './types';
import { classifyDiseaseMetadata } from './disease-categories';
import {
  diseaseCache,
  createCacheKey,
  CACHE_TTL,
} from './disease-cache';

export const DISEASE_ONTOLOGY_API_BASE = 'https://api.disease-ontology.org/v1';

export type DiseaseOntologyResult<T> =
  | { ok: true; data: T; fromCache?: boolean }
  | DiseaseApiError;

export interface DiseaseOntologySearchOptions {
  page?: number;
  limit?: number;
  timeoutMs?: number;
  baseUrl?: string;
  skipCache?: boolean;
}

export interface DiseaseOntologyTermOptions {
  timeoutMs?: number;
  baseUrl?: string;
  skipCache?: boolean;
}

const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_SEARCH_LIMIT = 20;

/**
 * Normalizes any DOID string into standard "DOID:xxxx" format.
 */
export function normalizeDoid(rawId: string): string {
  const clean = rawId.trim().toUpperCase();
  if (clean.startsWith('DOID:')) return clean;
  if (/^\d+$/.test(clean)) return `DOID:${clean}`;
  return clean;
}

/**
 * Normalizes raw cross-references into categorized lists by prefix.
 */
function normalizeCrossReferences(rawXrefs: unknown): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  if (!rawXrefs) return result;

  const xrefList: string[] = [];
  if (Array.isArray(rawXrefs)) {
    for (const item of rawXrefs) {
      if (typeof item === 'string') {
        xrefList.push(item);
      } else if (item && typeof item === 'object') {
        const val = (item as { id?: string; accession?: string; xref?: string }).id ||
          (item as { id?: string; accession?: string; xref?: string }).accession ||
          (item as { id?: string; accession?: string; xref?: string }).xref;
        if (typeof val === 'string') xrefList.push(val);
      }
    }
  } else if (typeof rawXrefs === 'object') {
    for (const [key, val] of Object.entries(rawXrefs as Record<string, unknown>)) {
      if (Array.isArray(val)) {
        result[key.toUpperCase()] = val.filter((v): v is string => typeof v === 'string');
      } else if (typeof val === 'string') {
        result[key.toUpperCase()] = [val];
      }
    }
    return result;
  }

  for (const xref of xrefList) {
    const trimmed = xref.trim();
    if (!trimmed) continue;
    const colonIndex = trimmed.indexOf(':');
    let prefix = 'OTHER';
    let id = trimmed;
    if (colonIndex > 0) {
      prefix = trimmed.substring(0, colonIndex).toUpperCase();
      id = trimmed.substring(colonIndex + 1);
    }
    if (!result[prefix]) result[prefix] = [];
    if (!result[prefix].includes(id)) {
      result[prefix].push(id);
    }
  }

  return result;
}

/**
 * Normalizes raw synonyms from Disease Ontology into a clean, unique string array.
 */
function normalizeSynonyms(rawSynonyms: unknown): string[] {
  if (!rawSynonyms) return [];
  const set = new Set<string>();

  if (Array.isArray(rawSynonyms)) {
    for (const s of rawSynonyms) {
      if (typeof s === 'string') {
        const trimmed = s.trim();
        if (trimmed) set.add(trimmed);
      } else if (s && typeof s === 'object') {
        const val = (s as { name?: string; synonym?: string; value?: string }).name ||
          (s as { name?: string; synonym?: string; value?: string }).synonym ||
          (s as { name?: string; synonym?: string; value?: string }).value;
        if (typeof val === 'string' && val.trim()) {
          set.add(val.trim());
        }
      }
    }
  } else if (typeof rawSynonyms === 'string') {
    const trimmed = rawSynonyms.trim();
    if (trimmed) set.add(trimmed);
  }

  return Array.from(set);
}

/**
 * Normalizes raw definition field from Disease Ontology.
 */
function normalizeDefinition(rawDef: unknown): string | undefined {
  if (!rawDef) return undefined;
  if (typeof rawDef === 'string') {
    const trimmed = rawDef.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (typeof rawDef === 'object') {
    const val = (rawDef as { definition?: string; value?: string; def?: string }).definition ||
      (rawDef as { definition?: string; value?: string; def?: string }).value ||
      (rawDef as { definition?: string; value?: string; def?: string }).def;
    if (typeof val === 'string' && val.trim()) {
      return val.trim();
    }
  }
  return undefined;
}

/**
 * Normalizes a raw Disease Ontology term into Planora's ExternalDisease model.
 */
export function normalizeDiseaseOntologyTerm(raw: unknown): ExternalDisease | null {
  if (!raw || typeof raw !== 'object') return null;
  const term = raw as Record<string, unknown>;

  // Extract ID
  const rawId = term.doid || term.id || term.do_id || term.term_id;
  if (!rawId || typeof rawId !== 'string') return null;
  const externalId = normalizeDoid(rawId);

  // Extract Name / Label
  const nameVal = term.name || term.label || term.title;
  const name = typeof nameVal === 'string' ? nameVal.trim() : '';
  if (!name) return null;

  // Exclude obsolete / non-disease terms
  if (term.is_obsolete === true || term.obsolete === true || name.toLowerCase().startsWith('obsolete ')) {
    return null;
  }

  // Extract Synonyms, Definition, Cross-references
  const synonyms = normalizeSynonyms(term.synonyms || term.synonym);
  const definition = normalizeDefinition(term.definition || term.def);
  const crossReferences = normalizeCrossReferences(term.xrefs || term.cross_references || term.dbxrefs);

  // Parents / Subclasses for categorization
  const parents: string[] = [];
  if (Array.isArray(term.parents)) {
    for (const p of term.parents) {
      if (typeof p === 'string') parents.push(p);
      else if (p && typeof p === 'object' && typeof (p as { label?: string; name?: string }).label === 'string') {
        parents.push((p as { label: string }).label);
      }
    }
  }

  // MeSH headings from xrefs if present
  const meshHeadings = crossReferences['MESH'] || crossReferences['MSH'] || [];

  // Feed into Planora category engine
  const { bodySystems, diseaseTypes } = classifyDiseaseMetadata({
    name,
    definition,
    synonyms,
    doid: externalId,
    parents,
    meshHeadings,
  });

  const source: DiseaseSource = 'Disease Ontology';
  const sourceUrl = `https://disease-ontology.org/?id=${externalId}`;

  return {
    externalId,
    name,
    synonyms,
    definition,
    bodySystems,
    diseaseTypes,
    source,
    sourceUrl,
    crossReferences,
    rawMetadata: term,
  };
}

/**
 * Internal fetch helper with AbortController timeout and structured error mapping.
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<{ ok: true; response: Response } | DiseaseApiError> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.status === 404) {
      return {
        ok: false,
        error: 'NOT_FOUND',
        message: 'The requested disease term was not found in Disease Ontology.',
        source: 'Disease Ontology',
        statusCode: 404,
      };
    }

    if (response.status === 429) {
      return {
        ok: false,
        error: 'RATE_LIMITED',
        message: 'Disease Ontology API rate limit reached. Please wait a moment.',
        source: 'Disease Ontology',
        statusCode: 429,
      };
    }

    if (response.status === 400) {
      return {
        ok: false,
        error: 'INVALID_QUERY',
        message: 'Invalid request parameters sent to Disease Ontology.',
        source: 'Disease Ontology',
        statusCode: 400,
      };
    }

    if (!response.ok) {
      return {
        ok: false,
        error: 'DISEASE_SOURCE_UNAVAILABLE',
        message: `Disease Ontology service responded with HTTP status ${response.status}.`,
        source: 'Disease Ontology',
        statusCode: response.status,
      };
    }

    return { ok: true, response };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const isAbort = (err as { name?: string })?.name === 'AbortError';
    return {
      ok: false,
      error: 'DISEASE_SOURCE_UNAVAILABLE',
      message: isAbort
        ? `Disease Ontology request timed out after ${timeoutMs}ms.`
        : `Network error reaching Disease Ontology: ${(err as Error)?.message || 'Unknown network error'}.`,
      source: 'Disease Ontology',
    };
  }
}

/**
 * Searches Disease Ontology terms by keyword.
 * Uses official POST /terms/search endpoint.
 */
export async function searchDiseaseOntology(
  query: string,
  options: DiseaseOntologySearchOptions = {}
): Promise<DiseaseOntologyResult<DiseaseSearchResult>> {
  const trimmed = query ? query.trim() : '';

  // Validation
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

  const page = options.page || 1;
  const limit = options.limit || DEFAULT_SEARCH_LIMIT;
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const baseUrl = options.baseUrl || DISEASE_ONTOLOGY_API_BASE;

  // Cache check
  const cacheKey = createCacheKey('Disease Ontology', `search:${trimmed}:${page}:${limit}`);
  if (!options.skipCache) {
    const cached = diseaseCache.get<DiseaseSearchResult>(cacheKey);
    if (cached) {
      return { ok: true, data: cached, fromCache: true };
    }
  }

  const url = `${baseUrl}/terms/search`;
  const requestBody = JSON.stringify({
    search: trimmed,
    page,
    limit,
  });

  const res = await fetchWithTimeout(
    url,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: requestBody,
    },
    timeoutMs
  );

  if (!res.ok) {
    // If rate limited or service down, check if any stale/cached search is available
    const staleCached = diseaseCache.get<DiseaseSearchResult>(cacheKey);
    if (staleCached) {
      return { ok: true, data: staleCached, fromCache: true };
    }
    return res;
  }

  let json: unknown;
  try {
    json = await res.response.json();
  } catch {
    return {
      ok: false,
      error: 'PARSING_ERROR',
      message: 'Failed to parse JSON response from Disease Ontology.',
      source: 'Disease Ontology',
    };
  }

  // Normalization
  const rawTerms: unknown[] = Array.isArray(json)
    ? json
    : Array.isArray((json as { results?: unknown[] }).results)
    ? (json as { results: unknown[] }).results
    : Array.isArray((json as { terms?: unknown[] }).terms)
    ? (json as { terms: unknown[] }).terms
    : [];

  const normalizedList: ExternalDisease[] = [];
  const seenIds = new Set<string>();

  for (const rawTerm of rawTerms) {
    const normalized = normalizeDiseaseOntologyTerm(rawTerm);
    if (normalized && !seenIds.has(normalized.externalId)) {
      seenIds.add(normalized.externalId);
      normalizedList.push(normalized);
    }
  }

  const searchResult: DiseaseSearchResult = {
    query: trimmed,
    count: normalizedList.length,
    results: normalizedList,
    fromCache: false,
  };

  // Cache result
  diseaseCache.set(cacheKey, searchResult, CACHE_TTL.DO_SEARCH, 'Disease Ontology');

  return { ok: true, data: searchResult, fromCache: false };
}

/**
 * Fetches a single Disease Ontology term by DOID (e.g. "DOID:10652" or "10652").
 * Uses official GET /terms/{termId} endpoint.
 */
export async function getDiseaseOntologyTermById(
  termId: string,
  options: DiseaseOntologyTermOptions = {}
): Promise<DiseaseOntologyResult<ExternalDisease>> {
  const trimmed = termId ? termId.trim() : '';
  if (!trimmed) {
    return {
      ok: false,
      error: 'INVALID_QUERY',
      message: 'Disease identifier cannot be empty.',
      source: 'Disease Ontology',
      statusCode: 400,
    };
  }

  const normalizedId = normalizeDoid(trimmed);
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const baseUrl = options.baseUrl || DISEASE_ONTOLOGY_API_BASE;

  // Cache check
  const cacheKey = createCacheKey('Disease Ontology', `term:${normalizedId}`);
  if (!options.skipCache) {
    const cached = diseaseCache.get<ExternalDisease>(cacheKey);
    if (cached) {
      return { ok: true, data: cached, fromCache: true };
    }
  }

  const encodedId = encodeURIComponent(normalizedId);
  const url = `${baseUrl}/terms/${encodedId}`;

  const res = await fetchWithTimeout(
    url,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    },
    timeoutMs
  );

  if (!res.ok) {
    const staleCached = diseaseCache.get<ExternalDisease>(cacheKey);
    if (staleCached) {
      return { ok: true, data: staleCached, fromCache: true };
    }
    return res;
  }

  let json: unknown;
  try {
    json = await res.response.json();
  } catch {
    return {
      ok: false,
      error: 'PARSING_ERROR',
      message: 'Failed to parse JSON response for Disease Ontology term.',
      source: 'Disease Ontology',
    };
  }

  const normalized = normalizeDiseaseOntologyTerm(json);
  if (!normalized) {
    return {
      ok: false,
      error: 'NOT_FOUND',
      message: `Disease Ontology term ${normalizedId} could not be normalized or was empty.`,
      source: 'Disease Ontology',
      statusCode: 404,
    };
  }

  // Cache normalized term
  diseaseCache.set(cacheKey, normalized, CACHE_TTL.DO_DETAIL, 'Disease Ontology');

  return { ok: true, data: normalized, fromCache: false };
}

/**
 * Fetches a single Disease Ontology term by exact label.
 * Uses official GET /terms/label/{label} endpoint.
 */
export async function getDiseaseOntologyTermByLabel(
  label: string,
  options: DiseaseOntologyTermOptions = {}
): Promise<DiseaseOntologyResult<ExternalDisease>> {
  const trimmed = label ? label.trim() : '';
  if (!trimmed) {
    return {
      ok: false,
      error: 'INVALID_QUERY',
      message: 'Disease label cannot be empty.',
      source: 'Disease Ontology',
      statusCode: 400,
    };
  }

  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const baseUrl = options.baseUrl || DISEASE_ONTOLOGY_API_BASE;

  // Cache check
  const cacheKey = createCacheKey('Disease Ontology', `label:${trimmed.toLowerCase()}`);
  if (!options.skipCache) {
    const cached = diseaseCache.get<ExternalDisease>(cacheKey);
    if (cached) {
      return { ok: true, data: cached, fromCache: true };
    }
  }

  const encodedLabel = encodeURIComponent(trimmed);
  const url = `${baseUrl}/terms/label/${encodedLabel}`;

  const res = await fetchWithTimeout(
    url,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    },
    timeoutMs
  );

  if (!res.ok) {
    const staleCached = diseaseCache.get<ExternalDisease>(cacheKey);
    if (staleCached) {
      return { ok: true, data: staleCached, fromCache: true };
    }
    return res;
  }

  let json: unknown;
  try {
    json = await res.response.json();
  } catch {
    return {
      ok: false,
      error: 'PARSING_ERROR',
      message: 'Failed to parse JSON response for Disease Ontology label lookup.',
      source: 'Disease Ontology',
    };
  }

  const normalized = normalizeDiseaseOntologyTerm(json);
  if (!normalized) {
    return {
      ok: false,
      error: 'NOT_FOUND',
      message: `Disease Ontology term with label "${trimmed}" could not be found or normalized.`,
      source: 'Disease Ontology',
      statusCode: 404,
    };
  }

  // Cache normalized term
  diseaseCache.set(cacheKey, normalized, CACHE_TTL.DO_DETAIL, 'Disease Ontology');

  return { ok: true, data: normalized, fromCache: false };
}

/**
 * Fetches general Disease Ontology metadata / release info.
 * Uses official GET /info endpoint.
 */
export async function getDiseaseOntologyInfo(
  options: { timeoutMs?: number; baseUrl?: string; skipCache?: boolean } = {}
): Promise<DiseaseOntologyResult<Record<string, unknown>>> {
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const baseUrl = options.baseUrl || DISEASE_ONTOLOGY_API_BASE;

  const cacheKey = createCacheKey('Disease Ontology', 'api_info');
  if (!options.skipCache) {
    const cached = diseaseCache.get<Record<string, unknown>>(cacheKey);
    if (cached) {
      return { ok: true, data: cached, fromCache: true };
    }
  }

  const url = `${baseUrl}/info`;
  const res = await fetchWithTimeout(
    url,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    },
    timeoutMs
  );

  if (!res.ok) {
    return res;
  }

  let json: unknown;
  try {
    json = await res.response.json();
  } catch {
    return {
      ok: false,
      error: 'PARSING_ERROR',
      message: 'Failed to parse JSON from Disease Ontology info endpoint.',
      source: 'Disease Ontology',
    };
  }

  const data = (json && typeof json === 'object') ? (json as Record<string, unknown>) : {};
  diseaseCache.set(cacheKey, data, CACHE_TTL.DO_DETAIL, 'Disease Ontology');

  return { ok: true, data, fromCache: false };
}

export interface DiseaseOntologyTermsOptions {
  page?: number;
  limit?: number;
  timeoutMs?: number;
  baseUrl?: string;
  skipCache?: boolean;
}

export interface DiseaseOntologyTermsListing {
  page: number;
  pageCount: number;
  pageSize: number;
  resultCount: number;
  terms: ExternalDisease[];
  fromCache?: boolean;
}

/**
 * Fetches disease terms listing from Disease Ontology.
 * Uses official GET /terms endpoint with page and limit parameters.
 */
export async function getDiseaseOntologyTerms(
  options: DiseaseOntologyTermsOptions = {}
): Promise<DiseaseOntologyResult<DiseaseOntologyTermsListing>> {
  const page = options.page || 1;
  const limit = options.limit || DEFAULT_SEARCH_LIMIT;
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const baseUrl = options.baseUrl || DISEASE_ONTOLOGY_API_BASE;

  const cacheKey = createCacheKey('Disease Ontology', `terms:${page}:${limit}`);
  if (!options.skipCache) {
    const cached = diseaseCache.get<DiseaseOntologyTermsListing>(cacheKey);
    if (cached) {
      return { ok: true, data: cached, fromCache: true };
    }
  }

  const url = `${baseUrl}/terms?page=${page}&limit=${limit}`;
  const res = await fetchWithTimeout(
    url,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    },
    timeoutMs
  );

  if (!res.ok) {
    const staleCached = diseaseCache.get<DiseaseOntologyTermsListing>(cacheKey);
    if (staleCached) {
      return { ok: true, data: staleCached, fromCache: true };
    }
    return res;
  }

  let json: unknown;
  try {
    json = await res.response.json();
  } catch {
    return {
      ok: false,
      error: 'PARSING_ERROR',
      message: 'Failed to parse JSON response from Disease Ontology /terms endpoint.',
      source: 'Disease Ontology',
    };
  }

  const jsonObj = (json && typeof json === 'object') ? (json as Record<string, unknown>) : {};
  const rawTerms: unknown[] = Array.isArray(json)
    ? json
    : Array.isArray(jsonObj.results)
    ? (jsonObj.results as unknown[])
    : Array.isArray(jsonObj.terms)
    ? (jsonObj.terms as unknown[])
    : [];

  const pageVal = typeof jsonObj.page === 'number' ? jsonObj.page : page;
  const pageCountVal = typeof jsonObj.page_count === 'number' ? jsonObj.page_count : 1;
  const pageSizeVal = typeof jsonObj.page_size === 'number' ? jsonObj.page_size : limit;
  const resultCountVal = typeof jsonObj.result_count === 'number' ? jsonObj.result_count : rawTerms.length;

  const terms: ExternalDisease[] = [];
  const seenIds = new Set<string>();

  for (const rawTerm of rawTerms) {
    const normalized = normalizeDiseaseOntologyTerm(rawTerm);
    if (normalized && !seenIds.has(normalized.externalId)) {
      seenIds.add(normalized.externalId);
      terms.push(normalized);
    }
  }

  const listing: DiseaseOntologyTermsListing = {
    page: pageVal,
    pageCount: pageCountVal,
    pageSize: pageSizeVal,
    resultCount: resultCountVal,
    terms,
    fromCache: false,
  };

  diseaseCache.set(cacheKey, listing, CACHE_TTL.DO_SEARCH, 'Disease Ontology');

  return { ok: true, data: listing, fromCache: false };
}

