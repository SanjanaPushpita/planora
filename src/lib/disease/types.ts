import { BodySystemCategory, DiseaseTypeCategory } from '../types';

export type DiseaseSource = 'Disease Ontology' | 'MedlinePlus' | 'Authoritative Catalog';

export interface DiseaseSourceReference {
  title: string;
  url: string;
  type?: string;
  note?: string;
}

export interface DiseaseApiError {
  ok: false;
  error: 'DISEASE_SOURCE_UNAVAILABLE' | 'NOT_FOUND' | 'RATE_LIMITED' | 'PARSING_ERROR' | 'INVALID_QUERY';
  message: string;
  source?: DiseaseSource;
  statusCode?: number;
}

export type EnrichmentStatus =
  | 'enriched'
  | 'unmatched'
  | 'ambiguous'
  | 'unavailable'
  | 'skipped';

export interface ExternalDisease {
  externalId: string; // e.g. "DOID:10652"
  name: string;
  synonyms: string[];
  definition?: string;
  bodySystems: BodySystemCategory[];
  diseaseTypes: DiseaseTypeCategory[];
  source: DiseaseSource;
  sourceUrl: string;
  medlinePlusUrl?: string;
  medlinePlusSummary?: string;
  medlinePlusGroups?: string[];
  enrichmentStatus?: EnrichmentStatus;
  enrichmentBasis?: string;
  matchedTopicId?: string;
  crossReferences?: Record<string, string[]>;
  rawMetadata?: Record<string, unknown>;
}

export type NormalizedDisease = ExternalDisease;

export type DiseaseDetails = ExternalDisease;

export type DiseaseCategory = BodySystemCategory | DiseaseTypeCategory | 'Surprise Me';

export interface UnifiedSearchOptions {
  page?: number;
  limit?: number;
  timeoutMs?: number;
  skipCache?: boolean;
  includeMedlinePlusCandidates?: boolean;
}

export interface UnifiedSearchResult {
  query: string;
  totalCount: number;
  count: number;
  results: ExternalDisease[];
  medlinePlusCandidates?: MedlinePlusTopic[];
  fromCache?: boolean;
}

export interface DiseaseDetailOptions {
  enrich?: boolean;
  timeoutMs?: number;
  skipCache?: boolean;
}

export interface CandidateDiscoveryOptions {
  bodySystems?: BodySystemCategory[];
  diseaseTypes?: DiseaseTypeCategory[];
  category?: DiseaseCategory | string;
  limit?: number;
  startPage?: number;
  maxPages?: number;
  timeoutMs?: number;
  skipCache?: boolean;
  seedQuery?: string;
}

export interface CandidateDiscoveryResult {
  candidates: ExternalDisease[];
  totalEvaluated: number;
  pagesEvaluated?: number;
  poolTruncated: boolean;
  fromCache?: boolean;
  appliedFilters: {
    bodySystems: BodySystemCategory[];
    diseaseTypes: DiseaseTypeCategory[];
  };
}

export interface RandomSelectionOptions {
  bodySystems?: BodySystemCategory[];
  diseaseTypes?: DiseaseTypeCategory[];
  category?: DiseaseCategory | string;
  excludedDiseaseIds?: string[];
  recentDiseaseIds?: string[];
  currentDiseaseId?: string;
  refillBudget?: number;
  enrich?: boolean;
  rng?: () => number;
  candidateLimit?: number;
  timeoutMs?: number;
}

export type RandomSelectionResult =
  | {
      ok: true;
      disease: ExternalDisease;
      canonicalKey: string;
      poolSize: number;
      eligibleCount: number;
      coverageLimitationNotice: string;
      enrichmentStatus?: EnrichmentStatus;
    }
  | {
      ok: false;
      error: 'NO_UNSEEN_DISEASE' | 'EMPTY_CANDIDATE_POOL' | 'DISEASE_SOURCE_UNAVAILABLE';
      message: string;
      poolSize: number;
      eligibleCount: number;
    };

export interface RandomDiseaseOptions {
  category?: DiseaseCategory | string;
  excludeIds?: string[]; // IDs of studied diseases
  recentIds?: string[]; // IDs of recently suggested diseases
  includeStudied?: boolean;
  limitCandidatePool?: number;
}

export interface DiseaseCandidateOptions {
  category?: string;
  limit?: number;
  excludeIds?: string[];
}

export interface DiseaseSearchResult {
  query: string;
  totalCount?: number;
  count: number;
  results: NormalizedDisease[];
  fromCache?: boolean;
}

export interface MedlinePlusGroup {
  id?: string;
  url?: string;
  name: string;
}

export interface MedlinePlusMeshDescriptor {
  id?: string;
  descriptor: string;
}

export interface MedlinePlusTopic {
  id?: string;
  title: string;
  altTitles: string[];
  seeReferences?: string[];
  fullSummary: string;
  snippet?: string;
  url: string;
  language?: string;
  groupNames: string[];
  groups?: MedlinePlusGroup[];
  meshHeadings: string[];
  meshDescriptors?: MedlinePlusMeshDescriptor[];
  rank?: number;
  dateCreated?: string;
  metaDesc?: string;
}

export interface MedlinePlusSearchResult {
  query: string;
  totalCount: number;
  count: number;
  results: MedlinePlusTopic[];
  fromCache?: boolean;
  spellingCorrection?: string;
}

export interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  source?: string;
  createdAt: number;
}

// Re-export Category types from core types
export type { BodySystemCategory, DiseaseTypeCategory };
