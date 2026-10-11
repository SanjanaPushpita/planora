/**
 * Frontend client helpers for Planora Disease Discovery Lab.
 * Calls safe same-origin /api/disease route handlers.
 */

import { ExternalDisease, UnifiedSearchResult } from './types';

export interface RandomDiscoveryApiResult {
  ok: boolean;
  disease?: ExternalDisease;
  error?: string;
  message?: string;
  poolSize?: number;
  eligibleCount?: number;
  refilled?: boolean;
}

export interface DetailApiResult {
  ok: boolean;
  data?: ExternalDisease;
  error?: string;
  message?: string;
}

export interface SearchApiResult {
  ok: boolean;
  data?: UnifiedSearchResult;
  error?: string;
  message?: string;
}

export async function fetchDiseaseSearch(
  query: string,
  options: { page?: number; limit?: number; signal?: AbortSignal } = {}
): Promise<SearchApiResult> {
  const params = new URLSearchParams({
    q: query,
    page: String(options.page || 1),
    limit: String(options.limit || 20),
  });

  const res = await fetch(`/api/disease/search?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal: options.signal,
  });

  return res.json();
}

export async function fetchDiseaseDetails(
  id: string,
  options: { enrich?: boolean; signal?: AbortSignal } = {}
): Promise<DetailApiResult> {
  const params = new URLSearchParams({
    id,
    enrich: options.enrich === false ? 'false' : 'true',
  });

  const res = await fetch(`/api/disease/details?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal: options.signal,
  });

  return res.json();
}

export async function fetchRandomDisease(
  options: {
    bodySystems?: string[];
    diseaseTypes?: string[];
    excludedDiseaseIds?: string[];
    refillBudget?: number;
    enrich?: boolean;
    signal?: AbortSignal;
  } = {}
): Promise<RandomDiscoveryApiResult> {
  const res = await fetch('/api/disease/random', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      bodySystems: options.bodySystems,
      diseaseTypes: options.diseaseTypes,
      excludedDiseaseIds: options.excludedDiseaseIds,
      refillBudget: options.refillBudget ?? 2,
      enrich: options.enrich ?? true,
    }),
    signal: options.signal,
  });

  return res.json();
}
