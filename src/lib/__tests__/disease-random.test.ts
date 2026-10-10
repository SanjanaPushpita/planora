import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { getRandomDisease } from '../disease/disease-random';
import { diseaseCache } from '../disease/disease-cache';

describe('Disease Random Selection & Repeat Prevention Suite', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    diseaseCache.clear();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    diseaseCache.clear();
  });

  const mockTermsListing = {
    page: 1,
    page_count: 1,
    page_size: 50,
    result_count: 3,
    results: [
      {
        doid: 'DOID:10652',
        name: 'Alzheimer disease',
        definition: 'Brain neurodegeneration.',
        parents: ['DOID:0050117'],
      },
      {
        doid: 'DOID:2841',
        name: 'Asthma',
        definition: 'Lung chronic inflammation.',
        parents: ['DOID:0050117'],
      },
      {
        doid: 'DOID:1612',
        name: 'Breast cancer',
        definition: 'Malignant neoplasm of breast.',
        parents: ['DOID:14566'],
      },
    ],
  };

  it('1. Deterministic RNG: selects first candidate when RNG returns 0', async () => {
    globalThis.fetch = (async (url: string | URL | Request) => {
      const urlStr = url.toString();
      if (urlStr.includes('/terms')) {
        return new Response(JSON.stringify(mockTermsListing), { status: 200 });
      }
      return new Response('Not found', { status: 404 });
    }) as typeof fetch;

    const res = await getRandomDisease({
      rng: () => 0, // Deterministic first element
      enrich: false,
    });

    assert.strictEqual(res.ok, true);
    if (res.ok) {
      assert.strictEqual(res.disease.externalId, 'DOID:10652');
      assert.strictEqual(res.canonicalKey, 'Disease Ontology:DOID:10652');
      assert.ok(res.coverageLimitationNotice.includes('verified candidate pool'));
    }
  });

  it('2. Deterministic RNG: selects last candidate when RNG approaches 1', async () => {
    globalThis.fetch = (async (url: string | URL | Request) => {
      const urlStr = url.toString();
      if (urlStr.includes('/terms')) {
        return new Response(JSON.stringify(mockTermsListing), { status: 200 });
      }
      return new Response('Not found', { status: 404 });
    }) as typeof fetch;

    const res = await getRandomDisease({
      rng: () => 0.999, // Deterministic last element
      enrich: false,
    });

    assert.strictEqual(res.ok, true);
    if (res.ok) {
      assert.strictEqual(res.disease.externalId, 'DOID:1612');
    }
  });

  it('3. Repeat prevention: excluded and recent diseases are removed before sampling', async () => {
    globalThis.fetch = (async (url: string | URL | Request) => {
      const urlStr = url.toString();
      if (urlStr.includes('/terms')) {
        return new Response(JSON.stringify(mockTermsListing), { status: 200 });
      }
      return new Response('Not found', { status: 404 });
    }) as typeof fetch;

    // Exclude Alzheimer (10652) and Breast Cancer (1612)
    const res = await getRandomDisease({
      excludedDiseaseIds: ['DOID:10652'],
      recentDiseaseIds: ['DOID:1612'],
      enrich: false,
    });

    assert.strictEqual(res.ok, true);
    if (res.ok) {
      // Only Asthma remains
      assert.strictEqual(res.disease.externalId, 'DOID:2841');
      assert.strictEqual(res.eligibleCount, 1);
    }
  });

  it('4. DOID normalization in exclusions: handles pure numeric strings and case variations', async () => {
    globalThis.fetch = (async (url: string | URL | Request) => {
      const urlStr = url.toString();
      if (urlStr.includes('/terms')) {
        return new Response(JSON.stringify(mockTermsListing), { status: 200 });
      }
      return new Response('Not found', { status: 404 });
    }) as typeof fetch;

    // Exclude via pure number "10652" and currentDiseaseId "  doid:2841 "
    const res = await getRandomDisease({
      excludedDiseaseIds: ['10652'],
      currentDiseaseId: '  doid:2841  ',
      enrich: false,
    });

    assert.strictEqual(res.ok, true);
    if (res.ok) {
      assert.strictEqual(res.disease.externalId, 'DOID:1612');
    }
  });

  it('5. Pool exhaustion: returns NO_UNSEEN_DISEASE and never silently clears history', async () => {
    globalThis.fetch = (async (url: string | URL | Request) => {
      const urlStr = url.toString();
      if (urlStr.includes('/terms')) {
        return new Response(JSON.stringify(mockTermsListing), { status: 200 });
      }
      return new Response('Not found', { status: 404 });
    }) as typeof fetch;

    // Exclude all three candidates
    const res = await getRandomDisease({
      excludedDiseaseIds: ['DOID:10652', 'DOID:2841', 'DOID:1612'],
      refillBudget: 0,
      enrich: false,
    });

    assert.strictEqual(res.ok, false);
    if (!res.ok) {
      assert.strictEqual(res.error, 'NO_UNSEEN_DISEASE');
      assert.strictEqual(res.eligibleCount, 0);
      assert.ok(res.message.includes('already been studied'));
    }
  });

  it('6. Empty candidate pool: returns EMPTY_CANDIDATE_POOL when no terms match category', async () => {
    globalThis.fetch = (async (url: string | URL | Request) => {
      const urlStr = url.toString();
      if (urlStr.includes('/terms')) {
        return new Response(
          JSON.stringify({
            page: 1,
            page_count: 1,
            page_size: 50,
            result_count: 0,
            results: [],
          }),
          { status: 200 }
        );
      }
      return new Response('Not found', { status: 404 });
    }) as typeof fetch;

    const res = await getRandomDisease({
      bodySystems: ['Ear / Hearing'],
    });

    assert.strictEqual(res.ok, false);
    if (!res.ok) {
      assert.strictEqual(res.error, 'EMPTY_CANDIDATE_POOL');
    }
  });

  it('7. Post-selection enrichment: enriches ONLY the chosen disease', async () => {
    let detailCallCount = 0;
    const sampleMedlineTopicXml = `
      <nlmSearchResult>
        <count>1</count>
        <list>
          <document rank="0" url="https://medlineplus.gov/asthma.html">
            <content name="healthTopic">
              <health-topic id="3061" title="Asthma" url="https://medlineplus.gov/asthma.html">
                <full-summary><p>Asthma summary</p></full-summary>
              </health-topic>
            </content>
          </document>
        </list>
      </nlmSearchResult>
    `;

    globalThis.fetch = (async (url: string | URL | Request) => {
      const urlStr = url.toString();
      if (urlStr.includes('2841')) {
        detailCallCount++;
        return new Response(
          JSON.stringify({
            doid: 'DOID:2841',
            name: 'Asthma',
            definition: 'Lung chronic inflammation.',
          }),
          { status: 200 }
        );
      }
      if (urlStr.includes('/terms')) {
        return new Response(JSON.stringify(mockTermsListing), { status: 200 });
      }
      if (urlStr.includes('wsearch.nlm.nih.gov')) {
        return new Response(sampleMedlineTopicXml, { status: 200 });
      }
      return new Response('Not found', { status: 404 });
    }) as typeof fetch;

    const res = await getRandomDisease({
      // Select Asthma (index 1)
      rng: () => 0.5,
      enrich: true,
    });

    assert.strictEqual(res.ok, true);
    if (res.ok) {
      assert.strictEqual(res.disease.externalId, 'DOID:2841');
      assert.strictEqual(detailCallCount, 1); // Details fetched strictly once for chosen disease
      assert.strictEqual(res.disease.enrichmentStatus, 'enriched');
      assert.strictEqual(res.disease.medlinePlusUrl, 'https://medlineplus.gov/asthma.html');
    }
  });
});
