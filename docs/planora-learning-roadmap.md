# Planora Learning & Discovery Roadmap

## Overview

This roadmap defines the sequential development phases for the **Planora Disease Discovery Lab** and the subsequent **Learning Sprint Question Engine**.

---

## Phase Sequence

### A. Phase 2C: Public Unified Disease Engine (Current Pass)
- **Unified Disease Search (`searchDiseases`)**:
  - Disease Ontology (DO) as primary identity source with stable `DOID` identifiers.
  - Upstream totals separated from deduplicated filtered counts.
  - MedlinePlus health-topic candidates kept distinct without ungrounded merging.
  - Failures reported truthfully via structured errors.
- **Authoritative Details & Conservative Enrichment (`getDiseaseDetails`)**:
  - Disease Ontology term retrieval by ID or label.
  - Optional MedlinePlus enrichment using conservative matcher (exact title, MeSH ID, exact synonym).
  - Broad umbrella topics rejected for specific disease subtypes.
  - Enrichment failures preserved with explicit `enrichmentStatus` without destroying primary DO details.
- **Category Candidate Discovery (`getDiseaseCandidates`)**:
  - Standardized category filtering: OR within body systems, OR within disease types, AND across groups.
  - Documented DO listing and search endpoints with bounded pagination and public cache.
  - Obsolete and non-disease terms excluded.
- **Random Selection & Repeat Prevention (`getRandomDisease`)**:
  - Caller-supplied exclusions (studied, recent, current).
  - DOID normalization for consistent exclusion across numeric/prefixed formats.
  - Exhaustion detection returning `NO_UNSEEN_DISEASE` without silently clearing history.
  - Injected RNG support for deterministic verification.
  - Post-selection enrichment applied only to the chosen disease.

### B. Phase 2D: Integration Checks & Live Source Compatibility (Completed)
- **Verified Source Contract (Disease Ontology API v1.0.0 / OpenAPI Specification)**:
  - `POST /terms/search`: Request body must be `{ data: { names: [string] } }`. Pagination is via query parameter `?page=${page}` (1-indexed). The old top-level `search` property caused HTTP 400 schema validation errors (`additionalProperties: false`). Response envelope: `{ page, page_count, page_size, result_count, results: Term[] }`.
  - `GET /terms`: Documented listing endpoint with fixed `page_size: 20` (defaults to 50 if requested). Query param `?page=1` is 1-indexed. Verified subsequent pages return completely distinct DOIDs without ID overlap.
  - `GET /terms/{termId}`: Strictly requires the `DOID:` prefix URL-encoded (`DOID%3A0001816`). Bare numeric strings return HTTP 400.
  - Normal text search behavior: Exact/substring token matching across name, synonyms, and identifiers. Upstream total count (`result_count`) preserved separately from deduplicated/filtered candidate counts.
- **Cache Isolation & Refill Advancement**:
  - Discovery cache keys deterministically include `startPage`, `maxPages`, `targetLimit`, `seedQuery`, and sorted/deduplicated category filters (`candidates:${bsKey}:${dtKey}:${startPage}:${maxPages}:${limit}:${seed}`).
  - Caller exclusions, user IDs, and recent study history are strictly excluded from shared/public caches.
  - Candidate discovery accurately distinguishes discovery-budget truncation (`pagesEvaluated >= pageBudget && currentPage < totalUpstreamPages`) from true ontology exhaustion (`currentPage >= totalUpstreamPages` or repeated pages).
  - Bounded refill safely advances `startPage` past explored pages (`(pagesEvaluated || 3) + 1`) to reach previously unexplored terms.
- **Verification Outcomes**:
  - Automated test suite: 82/82 passing tests across 13 test suites (100% pass rate, mock-verified).
  - Typecheck (`npx tsc --noEmit`): 0 errors.
  - Linter (`npm run lint`): 0 errors (0 new warnings; 3 pre-existing warnings in unrelated pages).
  - Production build (`npm run build`): Successfully built 27 static and dynamic Next.js routes.
  - Opt-in live smoke verification: Live searches (`asthma`, `diabetes`), 2-page pagination (0 ID overlap), detail lookup (`DOID:2841`) with live MedlinePlus enrichment, and targeted category discovery all verified live.
  - Data safety: Zero production database migrations, Supabase resets, table alterations, or user data modifications performed.

### C. Phase 3: Disease Lab UI & Study Flow (Completed)
- **User Interface & Navigation**:
  - Implemented `/disease-lab` route with dedicated desktop and mobile navigation entries (`Stethoscope` icon, active highlight).
  - Responsive glassmorphic layout matching Planora design tokens (`bg-[var(--bg-paper)]/85`, `backdrop-blur-xl`, `border-[var(--border-color)]`, `shadow-glass`).
  - Seamless view switching between "Discover" and "Saved Studies ({count})" with persistence status indicator.
- **Safe Server Data Boundary**:
  - Exposed validated, same-origin route handlers:
    - `GET /api/disease/search`: Validates query lengths (<=250 chars) and pagination bounds; returns cached search results.
    - `GET /api/disease/details`: Validates disease identifiers and returns authoritative DO details + optional MedlinePlus enrichment.
    - `POST /api/disease/random`: Validates category filters against official definitions, bounds exclusion lists (<=500 IDs), and returns un-cached (`no-store`) random discovery results.
  - Zero leakage of private notes, user profiles, or credentials across server boundaries.
- **Discovery Controls & Spinner**:
  - 16 Body System and 12 Disease Type multi-select glass chips with explicit filter semantics ("OR within group, AND between groups").
  - Debounced autocomplete search input for direct DOID or keyword lookups.
  - Interactive "Discover a Disease" with accessible progressive status updates ("Consulting Disease Ontology...", "Applying organ system & disease type filters...").
  - Honest outcomes: Exhausted candidate pools or empty category filters display actionable resolution hints (reset filters, clear recent history).
- **Disease Detail & Study Studio Workflow**:
  - Authoritative Disease Card: DOID badge, official external records link, ontology definition, categorization pills, synonyms, and attributed MedlinePlus consumer summary. Clear medical study disclaimer.
  - Interactive Study Studio: Configurable study timer (15m, 20m, 25m, surprise 15-20m) with accurate timestamp recovery across browser reloads, background tabs, and window minimization.
  - 4 Topic-specific research tasks (Classification, Affected Systems, Clinical Presentation, Management & Research).
  - Active recall prompts: Overview notes, 3 numbered key recall facts, and Feynman simple explanation.
  - Review confidence rating (`needs_review`, `learning`, `comfortable`) updating profile metrics upon session completion.
- **Saved Studies Library**:
  - Searchable and filterable portfolio of saved diseases and review statuses.
  - Offline-resilient: Saved profiles and study sessions remain fully accessible and editable during upstream API outages.
- **Verification Outcomes**:
  - 91 / 91 passing tests (100% pass rate) across 16 test suites.
  - 0 lint errors (0 new warnings; 3 pre-existing warnings in unrelated files).
  - Clean TypeScript compilation (`npx tsc --noEmit`).
  - Next.js Turbopack production build succeeded across 28 routes (`○ /disease-lab`, `ƒ /api/disease/...`).
  - Browser subagent visual verification completed on desktop and mobile (`375x750`) viewports with zero console exceptions.

### D. Learning Sprint Question Engine

#### 1. Phase LS1: Diagnosis, Source Grounding & Repeat Prevention Foundation (Completed)
- **Repetition Root Cause Diagnosis**:
  - Traced to `src/app/sprint/page.tsx:322–327` and `src/lib/learning-topics.ts`: Every curated topic in `CURATED_TOPICS` defined 2–3 static strings under `starterQuestions`. For custom topics, line 142/326 hardcoded `['What is the core idea?', 'Why does this matter?']`. There was zero dynamic generation, external retrieval, concept tracking, format variation, or repeat-prevention history.
- **Normalized Data Architecture (`src/lib/learning/questions/types.ts`)**:
  - Stable IDs, deterministic FNV-1a content fingerprints, topic/subtopic, concept, difficulty (`introductory`, `intermediate`, `advanced`), format (`explanation`, `scenario`, `comparison`, `troubleshooting`, `prediction`, `short_answer`, `mcq`), and learning objective (`conceptual_understanding`, `applied_reasoning`, `edge_cases`, `analytical_comparison`, `debugging`, `evaluation`).
  - Source references with verified title, URL, retrieval timestamp, domain, and evidence snippets.
  - Runtime validation separating objective answerable questions from open inquiry prompts without fake auto-grading.
- **Safe Source Grounding (`src/lib/learning/questions/source-service.ts`)**:
  - Pluggable provider architecture with strict anti-SSRF protections (blocking loopback, private IPv4/IPv6 subnets, and cloud metadata IPs).
  - Source whitelisting for verified educational documentation (Wikipedia Educational API, MDN, Python docs, TypeScript docs, Node.js docs, NIH/MedlinePlus, Disease Ontology).
  - Bounded response sizes (<=100KB), timeouts (4500ms), and isolated public LRU cache (max 60 entries, 30m TTL).
- **Dynamic Reasoning Generator (`src/lib/learning/questions/question-generator.ts`)**:
  - Multi-angle reasoning synthesis from retrieved passages covering explanations, real-world scenarios, trade-off comparisons, troubleshooting/debugging, and objective MCQs with unique distractors.
  - Reference answers derived strictly from source evidence.
  - Transparent support for external LLM provider schemas (Gemini / OpenAI compatible) with explicit provider status codes.
- **Deterministic Deduplication (`src/lib/learning/questions/question-dedup.ts`)**:
  - Normalization preserving critical negation words (`not`, `no`, `never`, `without`, `except`, `neither`, `nor`) and numeric distinctions (`0-9`).
  - Combined token overlap and 2-word shingle Jaccard similarity catching close paraphrases while permitting materially different reasoning tasks on the same concept.
- **Durable User History (`src/lib/learning/questions/question-history.ts`)**:
  - User-scoped local persistence (`planora_question_history_${userId}`) surviving reloads and new sprint sessions.
  - Idempotent recording of served questions preventing duplicates on double-clicks or rerenders.
  - Bounded FIFO pruning per topic (max 100 entries).
  - Strict isolation: public source cache never shares or stores user IDs or history.
- **Server Route Boundary (`src/app/api/learning/questions/generate/route.ts`)**:
  - Validated same-origin POST endpoint with bounded inputs, zero-store cache-control headers, and honest status codes:
    `SUCCESS`, `PARTIAL_BATCH`, `NO_NEW_QUESTIONS`, `SOURCE_UNAVAILABLE`, `INSUFFICIENT_SOURCE_MATERIAL`, `PROVIDER_NOT_CONFIGURED`, `PROVIDER_UNAVAILABLE`.
  - External Provider Configuration: When neither `GEMINI_API_KEY` nor `OPENAI_API_KEY` is present in server environment, the endpoint returns a structured `providerConfigNotice` guiding `.env.local` setup without failing or disguising static banks as dynamic.
- **Verification Outcomes**:
  - 113 / 113 passing tests (100% pass rate) across 23 test suites.
  - 0 lint errors (0 new warnings; 3 pre-existing warnings in unrelated files).
  - 0 TypeScript compilation errors (`npx tsc --noEmit`).
  - Next.js Turbopack production build succeeded across 28 routes (`ƒ /api/learning/questions/generate`).

#### 2. Phase LS2: Sprint UI Integration & End-to-End Verification (Upcoming)
- Connect `src/app/sprint/page.tsx` sprint startup to `/api/learning/questions/generate`.
- Wire dynamic question display, active question navigation, and grounded source references into the Learning Sprint UI.
- Record accepted questions to durable history upon sprint start.
- Preserve existing notes, custom topics, timer behavior, and completed sprint storage.
- Visual and end-to-end verification of non-repeating question variety across sequential sprints.

