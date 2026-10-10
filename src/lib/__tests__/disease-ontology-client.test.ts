import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import {
  searchDiseaseOntology,
  getDiseaseOntologyTermById,
  getDiseaseOntologyTermByLabel,
  getDiseaseOntologyInfo,
  normalizeDiseaseOntologyTerm,
  normalizeDoid,
} from '../disease/disease-ontology-client';
import { diseaseCache } from '../disease/disease-cache';

describe('Disease Ontology API Client Test Suite', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    diseaseCache.clear();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    diseaseCache.clear();
  });

  // 1. DOID Normalizer
  it('1. normalizeDoid: correctly normalizes pure numbers and DOID strings', () => {
    assert.strictEqual(normalizeDoid('10652'), 'DOID:10652');
    assert.strictEqual(normalizeDoid('DOID:10652'), 'DOID:10652');
    assert.strictEqual(normalizeDoid('  doid:10652  '), 'DOID:10652');
  });

  // 2. Empty query validation
  it('2. Empty query rejection: returns INVALID_QUERY on empty/whitespace query', async () => {
    const res1 = await searchDiseaseOntology('');
    assert.strictEqual(res1.ok, false);
    if (!res1.ok) {
      assert.strictEqual(res1.error, 'INVALID_QUERY');
    }

    const res2 = await searchDiseaseOntology('   ');
    assert.strictEqual(res2.ok, false);
    if (!res2.ok) {
      assert.strictEqual(res2.error, 'INVALID_QUERY');
    }
  });

  // 3. Search request construction & normalization
  it('3. Search request construction & term normalization: calls POST /terms/search and normalizes result', async () => {
    let capturedUrl = '';
    let capturedOptions: RequestInit | undefined;

    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      capturedUrl = url.toString();
      capturedOptions = init;
      return new Response(
        JSON.stringify([
          {
            doid: 'DOID:10652',
            name: 'Alzheimer disease',
            definition: 'A progressive neurodegenerative disease characterized by loss of memory.',
            synonyms: ['Alzheimer dementia', 'AD'],
            xrefs: ['ICD10CM:G30', 'MESH:D000544', 'OMIM:104300'],
          },
        ]),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }) as unknown as typeof fetch;

    const res = await searchDiseaseOntology('alzheimer', { page: 1, limit: 10, skipCache: true });
    assert.strictEqual(res.ok, true);
    if (res.ok) {
      assert.strictEqual(capturedUrl.endsWith('/terms/search'), true);
      assert.strictEqual(capturedOptions?.method, 'POST');
      const body = JSON.parse(capturedOptions?.body as string);
      assert.strictEqual(body.search, 'alzheimer');
      assert.strictEqual(body.limit, 10);

      assert.strictEqual(res.data.count, 1);
      const disease = res.data.results[0];
      assert.strictEqual(disease.externalId, 'DOID:10652');
      assert.strictEqual(disease.name, 'Alzheimer disease');
      assert.strictEqual(disease.synonyms.includes('Alzheimer dementia'), true);
      assert.strictEqual(disease.crossReferences?.['ICD10CM']?.[0], 'G30');
      assert.strictEqual(disease.source, 'Disease Ontology');
      assert.strictEqual(disease.bodySystems.includes('Brain & Neurology'), true);
      assert.strictEqual(disease.diseaseTypes.includes('Degenerative Diseases'), true);
    }
  });

  // 4. Synonym & Definition Normalization
  it('4. Synonym & Definition Normalization: trims, deduplicates, and extracts structured definition objects', () => {
    const rawTerm = {
      doid: 'DOID:1234',
      name: 'Sample Condition',
      definition: { definition: '  A rare metabolic disorder.  ' },
      synonyms: [
        'Sample syndrome',
        '  Sample syndrome  ', // duplicate after trim
        { synonym: 'Alternative sample name' },
      ],
      xrefs: ['OMIM:600000'],
    };

    const normalized = normalizeDiseaseOntologyTerm(rawTerm);
    assert.notStrictEqual(normalized, null);
    if (normalized) {
      assert.strictEqual(normalized.definition, 'A rare metabolic disorder.');
      assert.strictEqual(normalized.synonyms.length, 2);
      assert.strictEqual(normalized.synonyms[0], 'Sample syndrome');
      assert.strictEqual(normalized.synonyms[1], 'Alternative sample name');
      assert.strictEqual(normalized.diseaseTypes.includes('Metabolic Diseases'), true);
    }
  });

  // 5. Cross-reference normalization
  it('5. Cross-reference normalization: categorizes prefixes correctly', () => {
    const rawTerm = {
      doid: 'DOID:4321',
      name: 'Genetic Kidney Condition',
      definition: 'Renal condition caused by chromosome mutation.',
      xrefs: [
        'ICD10:N04',
        'ICD9:581',
        'MESH:D009404',
        'OMIM:256300',
        'ORPHANET:634',
      ],
    };

    const normalized = normalizeDiseaseOntologyTerm(rawTerm);
    assert.notStrictEqual(normalized, null);
    if (normalized) {
      assert.deepStrictEqual(normalized.crossReferences?.['ICD10'], ['N04']);
      assert.deepStrictEqual(normalized.crossReferences?.['MESH'], ['D009404']);
      assert.deepStrictEqual(normalized.crossReferences?.['OMIM'], ['256300']);
      assert.deepStrictEqual(normalized.crossReferences?.['ORPHANET'], ['634']);
      assert.strictEqual(normalized.bodySystems.includes('Kidney & Urinary'), true);
      assert.strictEqual(normalized.diseaseTypes.includes('Genetic & Rare Diseases'), true);
    }
  });

  // 6. Get term by DOID
  it('6. getDiseaseOntologyTermById: fetches term by DOID with encoded URL', async () => {
    let capturedUrl = '';
    globalThis.fetch = (async (url: string | URL | Request) => {
      capturedUrl = url.toString();
      return new Response(
        JSON.stringify({
          doid: 'DOID:10652',
          name: 'Alzheimer disease',
          definition: 'A neurodegenerative dementia.',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }) as unknown as typeof fetch;

    const res = await getDiseaseOntologyTermById('10652', { skipCache: true });
    assert.strictEqual(res.ok, true);
    if (res.ok) {
      assert.strictEqual(capturedUrl.includes('/terms/DOID%3A10652'), true);
      assert.strictEqual(res.data.externalId, 'DOID:10652');
      assert.strictEqual(res.data.name, 'Alzheimer disease');
    }
  });

  // 7. Get term by Label with URL encoding
  it('7. getDiseaseOntologyTermByLabel: encodes spaces and special characters', async () => {
    let capturedUrl = '';
    globalThis.fetch = (async (url: string | URL | Request) => {
      capturedUrl = url.toString();
      return new Response(
        JSON.stringify({
          doid: 'DOID:162',
          name: 'cancer of bladder',
          definition: 'A urinary bladder neoplasm.',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }) as unknown as typeof fetch;

    const res = await getDiseaseOntologyTermByLabel('cancer of bladder', { skipCache: true });
    assert.strictEqual(res.ok, true);
    if (res.ok) {
      assert.strictEqual(capturedUrl.includes('/terms/label/cancer%20of%20bladder'), true);
      assert.strictEqual(res.data.name, 'cancer of bladder');
      assert.strictEqual(res.data.diseaseTypes.includes('Cancer / Neoplastic Diseases'), true);
    }
  });

  // 8. Cache hit behavior
  it('8. Cache hit behavior: second request is served from cache without second fetch', async () => {
    let fetchCount = 0;
    globalThis.fetch = (async () => {
      fetchCount++;
      return new Response(
        JSON.stringify({
          doid: 'DOID:999',
          name: 'Cached Disease',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }) as unknown as typeof fetch;

    const first = await getDiseaseOntologyTermById('DOID:999');
    assert.strictEqual(first.ok, true);
    assert.strictEqual(fetchCount, 1);
    if (first.ok) {
      assert.strictEqual(first.fromCache, false);
    }

    const second = await getDiseaseOntologyTermById('DOID:999');
    assert.strictEqual(second.ok, true);
    assert.strictEqual(fetchCount, 1, 'Second call must NOT make a second fetch');
    if (second.ok) {
      assert.strictEqual(second.fromCache, true);
      assert.strictEqual(second.data.externalId, 'DOID:999');
    }
  });

  // 9. 404 Mapping
  it('9. 404 mapping: returns structured NOT_FOUND error', async () => {
    globalThis.fetch = (async () => {
      return new Response('Not Found', { status: 404 });
    }) as unknown as typeof fetch;

    const res = await getDiseaseOntologyTermById('DOID:99999999', { skipCache: true });
    assert.strictEqual(res.ok, false);
    if (!res.ok) {
      assert.strictEqual(res.error, 'NOT_FOUND');
      assert.strictEqual(res.statusCode, 404);
    }
  });

  // 10. 429 Mapping
  it('10. 429 mapping: returns RATE_LIMITED error', async () => {
    globalThis.fetch = (async () => {
      return new Response('Too Many Requests', { status: 429 });
    }) as unknown as typeof fetch;

    const res = await searchDiseaseOntology('asthma', { skipCache: true });
    assert.strictEqual(res.ok, false);
    if (!res.ok) {
      assert.strictEqual(res.error, 'RATE_LIMITED');
      assert.strictEqual(res.statusCode, 429);
    }
  });

  // 11. 500 Mapping
  it('11. 500 mapping: returns DISEASE_SOURCE_UNAVAILABLE error', async () => {
    globalThis.fetch = (async () => {
      return new Response('Internal Server Error', { status: 500 });
    }) as unknown as typeof fetch;

    const res = await searchDiseaseOntology('asthma', { skipCache: true });
    assert.strictEqual(res.ok, false);
    if (!res.ok) {
      assert.strictEqual(res.error, 'DISEASE_SOURCE_UNAVAILABLE');
      assert.strictEqual(res.statusCode, 500);
    }
  });

  // 12. Timeout / Network Failure
  it('12. Timeout & Network Failure: abort error mapped to DISEASE_SOURCE_UNAVAILABLE', async () => {
    globalThis.fetch = (async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      throw abortError;
    }) as unknown as typeof fetch;

    const res = await getDiseaseOntologyTermById('DOID:123', { timeoutMs: 10, skipCache: true });
    assert.strictEqual(res.ok, false);
    if (!res.ok) {
      assert.strictEqual(res.error, 'DISEASE_SOURCE_UNAVAILABLE');
      assert.strictEqual(res.message.includes('timed out'), true);
    }
  });

  // 13. Malformed JSON Response
  it('13. Malformed response: invalid JSON returns PARSING_ERROR', async () => {
    globalThis.fetch = (async () => {
      return new Response('Not valid json {', { status: 200 });
    }) as unknown as typeof fetch;

    const res = await getDiseaseOntologyTermById('DOID:100', { skipCache: true });
    assert.strictEqual(res.ok, false);
    if (!res.ok) {
      assert.strictEqual(res.error, 'PARSING_ERROR');
    }
  });

  // 14. Info Endpoint
  it('14. getDiseaseOntologyInfo: fetches release info from GET /info', async () => {
    globalThis.fetch = (async () => {
      return new Response(JSON.stringify({ version: '2026-03', terms_count: 11000 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as unknown as typeof fetch;

    const res = await getDiseaseOntologyInfo({ skipCache: true });
    assert.strictEqual(res.ok, true);
    if (res.ok) {
      assert.strictEqual(res.data.version, '2026-03');
    }
  });
});
