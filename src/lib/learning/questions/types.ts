/**
 * Learning Sprint Dynamic Question Engine - Normalized Types & Contracts
 * Phase LS1: Engine, Grounding & Repeat Prevention Foundation
 */

export type QuestionDifficulty = 'introductory' | 'intermediate' | 'advanced';

export type QuestionFormat =
  | 'explanation'
  | 'scenario'
  | 'comparison'
  | 'troubleshooting'
  | 'prediction'
  | 'short_answer'
  | 'mcq';

export type LearningObjective =
  | 'conceptual_understanding'
  | 'applied_reasoning'
  | 'edge_cases'
  | 'analytical_comparison'
  | 'debugging'
  | 'evaluation';

export type QuestionOrigin =
  | 'dynamic_generator'
  | 'curated_source'
  | 'fallback_material';

export type GroundingStatus =
  | 'fully_grounded'
  | 'open_inquiry'
  | 'insufficient_evidence';

export interface SourceReference {
  title: string;
  url: string;
  retrievedAt: string;
  evidenceSnippet?: string;
  sourceDomain?: string;
}

export interface NormalizedQuestion {
  id: string;
  fingerprint: string;
  topic: string;
  subtopic?: string;
  concept: string;
  difficulty: QuestionDifficulty;
  language: string;
  format: QuestionFormat;
  objective: LearningObjective;
  prompt: string;
  choices?: string[]; // Defined if format === 'mcq'
  correctChoiceIndex?: number; // 0-based index if format === 'mcq'
  referenceAnswer?: string; // Derivable strictly when grounded
  explanation?: string;
  sourceReferences: SourceReference[];
  origin: QuestionOrigin;
  groundingStatus: GroundingStatus;
  isObjective: boolean; // True for MCQ / verifiable short answer; False for open inquiry
}

export interface QuestionHistoryEntry {
  id: string;
  fingerprint: string;
  topic: string;
  subtopic?: string;
  concept: string;
  format: QuestionFormat;
  objective: LearningObjective;
  timestamp: string;
  servedAt: string;
  normalizedPromptSnippet: string;
}

export type QuestionEngineStatusCode =
  | 'SUCCESS'
  | 'PARTIAL_BATCH'
  | 'NO_NEW_QUESTIONS'
  | 'PROVIDER_NOT_CONFIGURED'
  | 'PROVIDER_UNAVAILABLE'
  | 'SOURCE_UNAVAILABLE'
  | 'INSUFFICIENT_SOURCE_MATERIAL'
  | 'INVALID_GENERATED_OUTPUT';

export interface HistoryComparisonSignal {
  fingerprint: string;
  concept?: string;
  format?: QuestionFormat;
  objective?: LearningObjective;
  promptSnippet?: string;
}

export type GeminiErrorReason =
  | 'MISSING_API_KEY'
  | 'INVALID_MODEL'
  | 'MODEL_NOT_FOUND'
  | 'RATE_LIMITED'
  | 'TIMEOUT'
  | 'INVALID_RESPONSE_SCHEMA'
  | 'NETWORK_ERROR';

export interface GeminiGenerationResult {
  success: boolean;
  questions?: NormalizedQuestion[];
  errorReason?: GeminiErrorReason;
  errorMessage?: string;
}

export interface GenerateQuestionsRequest {
  topic: string;
  subtopics?: string[];
  difficulty?: QuestionDifficulty;
  language?: string;
  desiredCount?: number;
  formats?: QuestionFormat[];
  objectives?: LearningObjective[];
  userId?: string;
  excludeFingerprints?: string[];
  historySignals?: HistoryComparisonSignal[];
  maxRefillAttempts?: number;
}

export interface GenerateQuestionsResponse {
  statusCode: QuestionEngineStatusCode;
  message: string;
  questions: NormalizedQuestion[];
  topic: string;
  difficulty: QuestionDifficulty;
  retrievedSources: SourceReference[];
  requestedCount: number;
  servedCount: number;
  refillCount: number;
  generationMode?: 'model' | 'source';
  modelFallbackReason?: string;
  dedupStats: {
    exactFiltered: number;
    similarityFiltered: number;
    candidateCount: number;
  };
  providerConfigNotice?: {
    requiredKey: string;
    instructions: string;
  };
}

export interface RetrievedMaterial {
  topic: string;
  title: string;
  url: string;
  retrievedAt: string;
  sourceDomain: string;
  content: string;
  keyPassages: string[];
}
