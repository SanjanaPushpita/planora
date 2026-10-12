/**
 * Safe, bounded public source retrieval for Learning Sprint question grounding.
 * Enforces strict anti-SSRF, domain whitelisting, timeout bounding, and public LRU caching.
 */

import { RetrievedMaterial, SourceReference } from './types';

export interface SourceProvider {
  name: string;
  canHandle(topic: string, subtopics?: string[]): boolean;
  retrieve(topic: string, subtopics?: string[]): Promise<RetrievedMaterial | null>;
}

// Bounded in-memory public cache: max 60 entries, 30-minute TTL
interface CacheEntry {
  material: RetrievedMaterial;
  expiresAt: number;
}

const PUBLIC_SOURCE_CACHE = new Map<string, CacheEntry>();
const MAX_CACHE_ENTRIES = 60;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

function pruneCacheIfNeeded() {
  const now = Date.now();
  // Remove expired
  for (const [key, entry] of PUBLIC_SOURCE_CACHE.entries()) {
    if (entry.expiresAt <= now) {
      PUBLIC_SOURCE_CACHE.delete(key);
    }
  }
  // Enforce capacity (FIFO)
  while (PUBLIC_SOURCE_CACHE.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = PUBLIC_SOURCE_CACHE.keys().next().value;
    if (oldestKey) PUBLIC_SOURCE_CACHE.delete(oldestKey);
    else break;
  }
}

/**
 * SSRF & IP safety checks
 */
export function isSafePublicUrl(urlString: string): boolean {
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return false;
    }
    const hostname = parsed.hostname.toLowerCase();
    
    // Disallow loopback / private IP patterns
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '0.0.0.0' ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('169.254.') || // AWS/cloud metadata
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
    ) {
      return false;
    }

    // Only allow verified public educational / documentation domains
    const ALLOWED_SUFFIXES = [
      'wikipedia.org',
      'wikimedia.org',
      'nih.gov',
      'nlm.nih.gov',
      'developer.mozilla.org',
      'python.org',
      'nodejs.org',
      'react.dev',
      'nextjs.org',
      'disease-ontology.org'
    ];

    return ALLOWED_SUFFIXES.some(suffix => hostname === suffix || hostname.endsWith('.' + suffix));
  } catch {
    return false;
  }
}

/**
 * Clean and segment plain text into coherent passages (30 to 120 words).
 */
export function extractKeyPassages(text: string, maxPassages = 6): string[] {
  if (!text || typeof text !== 'string') return [];
  
  // Strip markup/HTML if present
  const cleaned = text
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Split into sentences
  const sentences = cleaned.match(/[^.!?]+[.!?]+(\s|$)/g) || [cleaned];
  const passages: string[] = [];
  let currentPassage = '';

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    if ((currentPassage + ' ' + trimmed).split(' ').length > 80 && currentPassage.length > 50) {
      passages.push(currentPassage.trim());
      currentPassage = trimmed;
      if (passages.length >= maxPassages) break;
    } else {
      currentPassage = currentPassage ? `${currentPassage} ${trimmed}` : trimmed;
    }
  }

  if (currentPassage && passages.length < maxPassages && currentPassage.length > 40) {
    passages.push(currentPassage.trim());
  }

  return passages;
}

/**
 * Wikipedia educational summary provider (public REST API)
 */
export class WikipediaEducationalProvider implements SourceProvider {
  name = 'Wikipedia Educational API';

  canHandle(topic: string): boolean {
    return Boolean(topic && topic.trim().length >= 2);
  }

  async retrieve(topic: string): Promise<RetrievedMaterial | null> {
    const query = encodeURIComponent(topic.trim().replace(/\s+/g, '_'));
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${query}`;

    if (!isSafePublicUrl(url)) {
      return null;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'PlanoraLearningSprint/1.0 (Educational Assistant; mailto:support@planora.local)'
        }
      });

      if (!res.ok) {
        return null;
      }

      // Bound response size: read text up to 100KB max
      const text = await res.text();
      if (text.length > 100 * 1024) {
        return null;
      }

      const data = JSON.parse(text);
      if (!data.extract || data.type === 'disambiguation') {
        return null;
      }

      const content = String(data.extract).trim();
      const passages = extractKeyPassages(content, 5);

      return {
        topic,
        title: data.title ? `Wikipedia: ${data.title}` : `Wikipedia: ${topic}`,
        url: data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${query}`,
        retrievedAt: new Date().toISOString(),
        sourceDomain: 'en.wikipedia.org',
        content,
        keyPassages: passages.length > 0 ? passages : [content]
      };
    } catch {
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Curated educational repository provider for core technical topics
 */
export class CuratedEducationalDocsProvider implements SourceProvider {
  name = 'Curated Educational Docs';

  private static CURATED_CORPUS: Record<string, { title: string; url: string; domain: string; content: string }> = {
    'typescript': {
      title: 'TypeScript Documentation - Types and Interfaces',
      url: 'https://www.typescriptlang.org/docs/handbook/2/everyday-types.html',
      domain: 'typescriptlang.org',
      content: 'TypeScript is a strongly typed programming language that builds on JavaScript. Interfaces and type aliases define object shapes. Type narrowing uses type guards, discriminated unions, and instanceof checks to refine unions to more specific types. Generics provide type variables that allow components to work over a variety of types rather than a single one.'
    },
    'javascript': {
      title: 'MDN Web Docs - JavaScript Event Loop and Asynchronous Programming',
      url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Event_loop',
      domain: 'developer.mozilla.org',
      content: 'JavaScript has an event loop model of execution where run-to-completion applies to synchronous frames in the call stack. Asynchronous operations queue callbacks into task queues: microtasks (Promises, queueMicrotask) run before macrotasks (setTimeout, setInterval, I/O). Closures capture lexical scope variables even after outer functions return.'
    },
    'react': {
      title: 'React Documentation - Component State and Effects',
      url: 'https://react.dev/reference/react/useEffect',
      domain: 'react.dev',
      content: 'React components render pure representations of state and props. The useState hook schedules state updates asynchronously. The useEffect hook synchronizes components with external systems, running after painting and executing cleanup functions prior to component unmounting or dependency changes.'
    },
    'next.js': {
      title: 'Next.js App Router Documentation',
      url: 'https://nextjs.org/docs/app/building-your-application/routing',
      domain: 'nextjs.org',
      content: 'Next.js App Router uses Server Components by default to reduce client bundle size and fetch data near the database. Client Components are marked with use client for browser interactivity. Route Handlers define custom request handlers using Web Request and Response APIs.'
    },
    'python': {
      title: 'Python Official Documentation - Data Model and Generators',
      url: 'https://docs.python.org/3/reference/datamodel.html',
      domain: 'docs.python.org',
      content: 'Python supports object-oriented, imperative, and functional programming. Generators use the yield keyword to produce iterators lazily without buffering entire sequences in memory. Dunder methods like __iter__, __getitem__, and __enter__ implement protocols for iteration, container access, and context management.'
    }
  };

  canHandle(topic: string): boolean {
    const key = topic.trim().toLowerCase();
    return Object.keys(CuratedEducationalDocsProvider.CURATED_CORPUS).some(k => k === key || key.includes(k));
  }

  async retrieve(topic: string): Promise<RetrievedMaterial | null> {
    const key = topic.trim().toLowerCase();
    const matchKey = Object.keys(CuratedEducationalDocsProvider.CURATED_CORPUS).find(k => k === key || key.includes(k));
    if (!matchKey) return null;

    const doc = CuratedEducationalDocsProvider.CURATED_CORPUS[matchKey];
    return {
      topic,
      title: doc.title,
      url: doc.url,
      retrievedAt: new Date().toISOString(),
      sourceDomain: doc.domain,
      content: doc.content,
      keyPassages: extractKeyPassages(doc.content, 4)
    };
  }
}

/**
 * Unified Source Retrieval Service
 */
export class SourceRetrievalService {
  private providers: SourceProvider[] = [
    new CuratedEducationalDocsProvider(),
    new WikipediaEducationalProvider()
  ];

  async retrieveMaterial(topic: string, subtopics?: string[]): Promise<RetrievedMaterial | null> {
    if (!topic || typeof topic !== 'string') return null;
    const cacheKey = `${topic.trim().toLowerCase()}:${(subtopics || []).sort().join(',')}`;

    // Check public cache
    const cached = PUBLIC_SOURCE_CACHE.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.material;
    }

    for (const provider of this.providers) {
      if (provider.canHandle(topic, subtopics)) {
        try {
          const material = await provider.retrieve(topic, subtopics);
          if (material && material.content && material.content.length > 50) {
            pruneCacheIfNeeded();
            PUBLIC_SOURCE_CACHE.set(cacheKey, {
              material,
              expiresAt: Date.now() + CACHE_TTL_MS
            });
            return material;
          }
        } catch {
          // Continue to next provider
        }
      }
    }

    return null;
  }

  /**
   * Clears public cache (useful for testing)
   */
  clearCache(): void {
    PUBLIC_SOURCE_CACHE.clear();
  }
}

export const sourceRetrievalService = new SourceRetrievalService();
