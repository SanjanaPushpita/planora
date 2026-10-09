import { CacheEntry, DiseaseSource } from './types';

// In-memory cache map strictly for public disease metadata
const memoryCache = new Map<string, CacheEntry<unknown>>();

// Maximum number of entries before proactive LRU/expired eviction
const MAX_CACHE_ENTRIES = 2000;

// Default TTL constants in milliseconds
export const CACHE_TTL = {
  DO_SEARCH: 60 * 60 * 1000,          // 1 hour for search terms
  DO_DETAIL: 6 * 60 * 60 * 1000,      // 6 hours for ontology detail
  MEDLINEPLUS: 24 * 60 * 60 * 1000,   // 24 hours for MedlinePlus topics
  CATEGORY_POOL: 2 * 60 * 60 * 1000,  // 2 hours for category pools
};

/**
 * Deterministically constructs a normalized cache key partitioned by source.
 */
export function createCacheKey(source: DiseaseSource | 'category' | 'medline' | 'general', identifier: string): string {
  const cleanSource = source.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const cleanIdentifier = identifier.trim().toLowerCase().replace(/\s+/g, '_');
  return `disease_${cleanSource}:${cleanIdentifier}`;
}

export function getCached<T>(key: string): T | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }

  return entry.data as T;
}

export function setCached<T>(key: string, data: T, ttlMs: number = CACHE_TTL.DO_SEARCH, source?: string): void {
  // Proactively purge expired entries if memory is getting full
  if (memoryCache.size >= MAX_CACHE_ENTRIES) {
    clearExpired();
    // If still large, remove oldest 10%
    if (memoryCache.size >= MAX_CACHE_ENTRIES) {
      const keysToDelete = Array.from(memoryCache.keys()).slice(0, Math.floor(MAX_CACHE_ENTRIES * 0.1));
      for (const k of keysToDelete) {
        memoryCache.delete(k);
      }
    }
  }

  const now = Date.now();
  memoryCache.set(key, {
    data,
    expiresAt: now + ttlMs,
    createdAt: now,
    source,
  });
}

export function hasCached(key: string): boolean {
  return getCached(key) !== null;
}

export function deleteCached(key: string): boolean {
  return memoryCache.delete(key);
}

export function clearExpired(): number {
  const now = Date.now();
  let deletedCount = 0;
  for (const [k, v] of memoryCache.entries()) {
    if (now > v.expiresAt) {
      memoryCache.delete(k);
      deletedCount++;
    }
  }
  return deletedCount;
}

export function clearCache(keyPrefix?: string): void {
  if (!keyPrefix) {
    memoryCache.clear();
    return;
  }
  for (const k of memoryCache.keys()) {
    if (k.startsWith(keyPrefix)) {
      memoryCache.delete(k);
    }
  }
}

export function getCacheStats(): { size: number; max: number } {
  return { size: memoryCache.size, max: MAX_CACHE_ENTRIES };
}

// Convenient unified object export
export const diseaseCache = {
  get: getCached,
  set: setCached,
  has: hasCached,
  delete: deleteCached,
  clear: clearCache,
  clearExpired,
  createKey: createCacheKey,
  getStats: getCacheStats,
};
