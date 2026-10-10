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
  crossReferences?: Record<string, string[]>;
  rawMetadata?: Record<string, unknown>;
}

export type NormalizedDisease = ExternalDisease;

export type DiseaseDetails = ExternalDisease;

export type DiseaseCategory = BodySystemCategory | DiseaseTypeCategory | 'Surprise Me';

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
