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

### C. Phase 3: Disease Lab UI & Study Flow
- Disease Lab UI components:
  - Category selector chips (Body Systems & Disease Types).
  - "Surprise Me" random disease spinner with active filter visualization.
  - Disease Detail view displaying authoritative DO definitions, classified categories, and provenance links.
  - MedlinePlus enrichment section (summary, topics, source links) with clean fallback when ungrounded.
- Study session flow & persistence integration:
  - Integration with existing `public.disease_profiles` and `public.disease_study_sessions` tables.
  - Study timer, session notes, confidence ratings, and review intervals.
  - Client-side and server-side repeat prevention wired to the user's studied history.

### D. Learning Sprint Question Engine (Post-Disease Lab)
*To be implemented strictly after Disease Lab is operating end-to-end.*

#### Learning Sprint Requirements & Architectural Constraints:
1. **Diagnosis of Question Repetition**:
   - Inspect why existing questions repeat (small hardcoded banks, deterministic selection indices, unpersisted history, or aggressive cache reuse).
2. **On-Demand Expandable Question Generation**:
   - Transition from fixed banks to dynamic, diverse on-demand questions.
   - Expand dimensions: topic/subtopic, difficulty levels, learning objectives, multiple question formats (multiple choice, flashcard, scenario/application, comparison, debugging/troubleshooting, conceptual explanations).
3. **Authoritative Grounding**:
   - Source questions directly from verified retrieved materials (Disease Ontology, MedlinePlus, authoritative documentation).
   - Ground factual answers strictly in reference sources; never present ungrounded model hallucinations as verified quiz answers.
   - Retain source excerpts, attribution links, and rationales for answers.
   - Distinctly separate generated open-ended study prompts from verified multiple-choice/factual questions.
4. **Deduplication & Anti-Repeat Mechanism**:
   - Compute question fingerprints and semantic embeddings/hashes to detect and reject both verbatim and near-paraphrase repeats.
   - Maintain bounded per-user/per-topic history of recent question IDs and covered concepts.
   - Cache public source materials separately from private user question history.
5. **Data Safety, Privacy & Performance**:
   - API keys remain strictly server-side.
   - Zero transmission of personal notes, journals, or user IDs to external AI providers.
   - Respect provider and source rate limits with configurable query budgets.
   - Treat "unlimited" as expandable variety, not infinite uniqueness or unmetered third-party API usage.
6. **Failure & Exhaustion Behavior**:
   - If sources or generators fail or become exhausted, return a truthful status or clearly labeled fallback; never disguise repeated questions as newly generated.
   - Ensure comprehensive automated tests covering variety, deduplication, grounding, provider failure fallbacks, and storage regression safety.
