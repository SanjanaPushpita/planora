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
      'typescriptlang.org',
      'disease-ontology.org'
    ];

    return ALLOWED_SUFFIXES.some(suffix => hostname === suffix || hostname.endsWith('.' + suffix));
  } catch {
    return false;
  }
}

/**
 * Strips conversational question wrappers to extract core subject for encyclopedia search.
 */
export function cleanTopicForSearch(topic: string): string {
  if (!topic || typeof topic !== 'string') return '';
  return topic
    .trim()
    .replace(/^(how\s+(does|do|the|a)\s+|what\s+(is|are)\s+|why\s+(does|do|is|are)\s+)/i, '')
    .replace(/\s+(work|works|operate|operates)(\s+in\s+.*)?\??$/i, '')
    .replace(/\s+(in modern systems)\??$/i, '')
    .replace(/[\?\(\)]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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
    const fetchSummaryByTitle = async (pageTitle: string): Promise<RetrievedMaterial | null> => {
      const query = encodeURIComponent(pageTitle.trim().replace(/\s+/g, '_'));
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

        const text = await res.text();
        if (text.length > 100 * 1024) {
          return null;
        }

        const data = JSON.parse(text);
        if (!data.extract || data.type === 'disambiguation') {
          return null;
        }

        const content = String(data.extract).trim();
        const passages = extractKeyPassages(content, 6);

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
    };

    // 1. Direct summary attempt
    const directResult = await fetchSummaryByTitle(topic.trim());
    if (directResult) return directResult;

    // 2. Search resolution fallback for conversational or formatted queries
    const cleaned = cleanTopicForSearch(topic);
    const searchTarget = cleaned || topic.trim();
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchTarget)}&format=json&utf8=1&srlimit=1`;

    if (!isSafePublicUrl(searchUrl)) return null;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    try {
      const searchRes = await fetch(searchUrl, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'PlanoraLearningSprint/1.0 (Educational Assistant; mailto:support@planora.local)'
        }
      });

      if (!searchRes.ok) return null;

      const searchData = await searchRes.json();
      const hitTitle = searchData?.query?.search?.[0]?.title;
      if (!hitTitle || typeof hitTitle !== 'string') return null;

      return await fetchSummaryByTitle(hitTitle);
    } catch {
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Curated educational repository provider for core technical topics.
 * Contains rich multi-concept documentation passages enabling multi-batch diversity.
 */
export class CuratedEducationalDocsProvider implements SourceProvider {
  name = 'Curated Educational Docs';

  private static CURATED_CORPUS: Record<string, { title: string; url: string; domain: string; content: string }> = {
    'python': {
      title: 'Python Official Documentation - Data Model and Architecture',
      url: 'https://docs.python.org/3/reference/datamodel.html',
      domain: 'docs.python.org',
      content: 'Python supports object-oriented, imperative, and functional programming methodologies. Python utilizes dynamic typing with an automatic reference counting memory manager coupled to a cyclic garbage collector. Generators evaluate lazily via the yield keyword, returning generator iterators without allocating sequential arrays in memory. The CPython implementation incorporates a Global Interpreter Lock preventing multiple native threads from executing Python bytecodes concurrently. Special dunder methods such as __iter__, __getitem__, and __enter__ define polymorphic interfaces for iteration, indexing, and context management. The with statement manages deterministic acquisition and release of resources through __enter__ and __exit__ protocol methods. Python asyncio uses async and await keywords to schedule cooperative coroutines on a single-threaded event loop. Decorators wrap function definitions using first-class functions and closures to alter behavior without mutating original source code. Python type hints use PEP 484 annotations for static validation through tools like mypy without enforcing runtime type checks. List comprehensions eagerly construct new lists while generator expressions evaluate values on-demand using parentheses. Primitive integers, strings, and tuples are immutable, whereas lists, dictionaries, and sets are mutable reference objects. Python exception handling relies on try, except, and finally blocks inheriting from BaseException and Exception.'
    },
    'typescript': {
      title: 'TypeScript Handbook - Types, Generics, and Structural Systems',
      url: 'https://www.typescriptlang.org/docs/handbook/2/everyday-types.html',
      domain: 'typescriptlang.org',
      content: 'TypeScript is a strongly typed superset of JavaScript that compiles directly down to plain JavaScript. TypeScript relies on structural typing where compatibility is determined by object shapes rather than nominal declarations. Interfaces can be extended through declaration merging, whereas type aliases model primitives, unions, and intersections. Generics provide type variables that enable components to operate safely across multiple types rather than a single concrete type. Type narrowing uses type guards, discriminated unions, and instanceof checks to refine union types into specific members. Discriminated unions leverage common literal property tags across variants to achieve exhaustive compile-time pattern matching. Strict null checks differentiate null and undefined from domain types, requiring explicit handling or optional chaining. Built-in utility types like Partial, Readonly, Pick, and Record perform compile-time property transformations systematically. The keyof operator produces string or numeric literal unions representing keys of an object type. Conditional types evaluate type relationships dynamically using the T extends U ternary pattern.'
    },
    'javascript': {
      title: 'MDN Web Docs - JavaScript Runtime, Event Loop, and Asynchrony',
      url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Event_loop',
      domain: 'developer.mozilla.org',
      content: 'JavaScript executes synchronously on a single call stack supported by an asynchronous event loop and task queues. Microtasks originating from Promises and queueMicrotask execute immediately after the current script frame before macrotasks like setTimeout. Closures retain access to their outer lexical scope environment even after the enclosing outer function has completed execution. JavaScript objects inherit properties and methods directly through an internal prototype chain accessed via Object.getPrototypeOf. Variables declared with let and const are block-scoped and subject to the temporal dead zone, whereas var is function-scoped. Promises represent the eventual completion or failure of asynchronous operations, orchestrated cleanly with async and await. Browser events propagate through three sequential phases: capturing, targeting, and bubbling. The JavaScript runtime uses mark-and-sweep garbage collection to identify and reclaim unreferenced memory objects.'
    },
    'react': {
      title: 'React Documentation - Component State, Effects, and Reconciliation',
      url: 'https://react.dev/reference/react/useEffect',
      domain: 'react.dev',
      content: 'React components render pure declarative representations of state and props. The reconciliation algorithm diffs virtual DOM trees to minimize expensive direct mutations against the browser DOM. The useState hook schedules asynchronous component state transitions and preserves state across re-renders. The useEffect hook coordinates side effects with external systems, firing after paint and executing cleanup callbacks prior to rerunning. React state updates require immutable data changes so shallow equality comparisons can accurately trigger updates. Custom hooks encapsulate and share stateful logic between components without adding intermediate nesting in the component hierarchy. React components transition through mounting, updating, and unmounting phases, executing corresponding hooks and lifecycles. React Fiber enables incremental rendering by splitting rendering work into chunks and yielding execution back to the browser.'
    },
    'next.js': {
      title: 'Next.js App Router Documentation - Server Architecture and Routing',
      url: 'https://nextjs.org/docs/app/building-your-application/routing',
      domain: 'nextjs.org',
      content: 'Next.js App Router utilizes React Server Components by default to deliver zero-bundle-size server rendering. Components requiring browser interactivity or state hooks specify the use client directive at the file boundary. Next.js supports dynamic server-side rendering, static site generation, and incremental static regeneration. Route Handlers define custom HTTP endpoints using Web standard Request and Response primitives in route.ts files. React Suspense enables streaming UI segments progressively from the server to reduce initial page time-to-first-byte. Edge middleware intercepts incoming requests before route execution for authentication, rewriting, and header mutations.'
    },
    'web architecture': {
      title: 'Web Architecture - DNS, Transport, and Critical Rendering Path',
      url: 'https://developer.mozilla.org/en-US/docs/Learn/Common_questions/Web_mechanisms/How_does_the_Internet_work',
      domain: 'developer.mozilla.org',
      content: 'Domain Name System (DNS) resolves human-readable domain names into IP addresses through hierarchical recursive and authoritative nameservers. Transmission Control Protocol (TCP) establishes reliable connections using SYN, SYN-ACK, and ACK packets. Transport Layer Security (TLS) establishes encrypted communication through public key certificate validation and symmetric session keys. Hypertext Transfer Protocol (HTTP) coordinates client requests with headers, methods, status codes, and message bodies. Content Delivery Networks (CDNs) distribute static and dynamic web assets across geographically distributed edge nodes. Browsers parse HTML into the DOM and CSS into CSSOM, combining them into a render tree for layout and painting.'
    },
    'how the web works': {
      title: 'Web Architecture - DNS, Transport, and Critical Rendering Path',
      url: 'https://developer.mozilla.org/en-US/docs/Learn/Common_questions/Web_mechanisms/How_does_the_Internet_work',
      domain: 'developer.mozilla.org',
      content: 'Domain Name System (DNS) resolves human-readable domain names into IP addresses through hierarchical recursive and authoritative nameservers. Transmission Control Protocol (TCP) establishes reliable connections using SYN, SYN-ACK, and ACK packets. Transport Layer Security (TLS) establishes encrypted communication through public key certificate validation and symmetric session keys. Hypertext Transfer Protocol (HTTP) coordinates client requests with headers, methods, status codes, and message bodies. Content Delivery Networks (CDNs) distribute static and dynamic web assets across geographically distributed edge nodes. Browsers parse HTML into the DOM and CSS into CSSOM, combining them into a render tree for layout and painting.'
    },
    'transformer': {
      title: 'Machine Learning - Transformer Architecture and Self-Attention Mechanism',
      url: 'https://en.wikipedia.org/wiki/Transformer_(deep_learning)',
      domain: 'en.wikipedia.org',
      content: 'Self-attention computes dynamic attention weights between all token pairs in a sequence using query, key, and value vectors. Attention weights are calculated by dividing the dot product of queries and keys by the square root of key dimensions, followed by softmax. Multi-head attention projects queries, keys, and values into multiple representation subspaces to attend to information at different positions. Transformers use sinusoidal or learned positional encodings to inject token order information into parallel sequence representations. Transformer blocks combine multi-head attention with residual skip connections and layer normalization for stable gradient flow. Each transformer block applies an independent position-wise feed-forward neural network after the attention mechanism.'
    },
    'vector databases': {
      title: 'Vector Databases and Retrieval-Augmented Generation (RAG)',
      url: 'https://en.wikipedia.org/wiki/Vector_database',
      domain: 'en.wikipedia.org',
      content: 'Vector embeddings convert text, audio, and images into dense numerical vectors capturing semantic relationships. Vector databases use approximate nearest neighbor (ANN) algorithms like HNSW to index millions of high-dimensional vectors. Vector similarity is evaluated using distance metrics including cosine similarity, dot product, and Euclidean distance. Retrieval-Augmented Generation (RAG) architectures retrieve relevant document chunks from vector stores and append them as grounding context to LLM prompts. Effective retrieval depends on document chunking strategies that balance semantic coherence against model context window limits.'
    },
    'cognitive biases': {
      title: 'Cognitive Science - Heuristics and Cognitive Biases',
      url: 'https://en.wikipedia.org/wiki/Cognitive_bias',
      domain: 'en.wikipedia.org',
      content: 'Cognitive biases are systematic deviations from norm or rationality in judgment resulting from mental shortcuts and heuristics. Confirmation bias leads individuals to favor, search for, and recall information that confirms preexisting beliefs. The availability heuristic estimates event probability based on how easily examples come to mind rather than objective statistical frequency. Anchoring bias occurs when initial exposure to a number or datum disproportionately influences subsequent estimations and decisions. The framing effect causes people to draw different conclusions from the same information depending on whether it is presented as a gain or a loss.'
    }
  };

  canHandle(topic: string): boolean {
    const key = topic.trim().toLowerCase();
    return Object.keys(CuratedEducationalDocsProvider.CURATED_CORPUS).some(k => 
      key === k || key.includes(k) || k.split(' ').every(word => key.includes(word))
    );
  }

  async retrieve(topic: string): Promise<RetrievedMaterial | null> {
    const key = topic.trim().toLowerCase();
    const matchKey = Object.keys(CuratedEducationalDocsProvider.CURATED_CORPUS).find(k => 
      key === k || key.includes(k) || k.split(' ').every(word => key.includes(word))
    );
    if (!matchKey) return null;

    const doc = CuratedEducationalDocsProvider.CURATED_CORPUS[matchKey];
    return {
      topic,
      title: doc.title,
      url: doc.url,
      retrievedAt: new Date().toISOString(),
      sourceDomain: doc.domain,
      content: doc.content,
      keyPassages: extractKeyPassages(doc.content, 6)
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
