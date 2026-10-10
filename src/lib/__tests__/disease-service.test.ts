import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import {
  searchDiseases,
  getDiseaseDetails,
  getDiseaseCandidates,
  matchesCategoryFilters,
} from '../disease/disease-service';
import { diseaseCache } from '../disease/disease-cache';
import { ExternalDisease } from '../disease/types';

describe('Unified Disease Service Test Suite', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    diseaseCache.clear();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    diseaseCache.clear();
  });

  const sampleDoTerm = {
    doid: 'DOID:2841',
    name: 'Asthma',
    definition: 'A chronic respiratory disease characterized by airway inflammation.',
    synonyms: ['Bronchial asthma', 'Hyperactive airway disease'],
    parents: ['DOID:0050117'],
    xrefs: ['MESH:D001249'],
  };

  const sampleMedlineTopicXml = `
    <nlmSearchResult>
      <count>1</count>
      <list>
        <document rank="0" url="https://medlineplus.gov/asthma.html">
          <content name="healthTopic">
            <health-topic id="3061" title="Asthma" url="https://medlineplus.gov/asthma.html" language="English">
              <full-summary><p>Asthma is a long-term disease of the lungs.</p></full-summary>
              <group id="1">Lungs and Breathing</group>
              <mesh-heading>
                <descriptor id="D001249">Asthma</descriptor>
              </mesh-heading>
            </health-topic>
          </content>
        </document>
      </list>
    </nlmSearchResult>
  `;

  // ---------------------------------------------------------
  // 1. Unified Search Tests
  // ---------------------------------------------------------
  describe('searchDiseases', () => {
    it('1. Rejects empty, whitespace, and excessively long queries', async () => {
      const res1 = await searchDiseases('');
      assert.strictEqual(res1.ok, false);
      if (!res1.ok) assert.strictEqual(res1.error, 'INVALID_QUERY');

      const res2 = await searchDiseases('   ');
      assert.strictEqual(res2.ok, false);
      if (!res2.ok) assert.strictEqual(res2.error, 'INVALID_QUERY');

      const res3 = await searchDiseases('x'.repeat(251));
      assert.strictEqual(res3.ok, false);
      if (!res3.ok) assert.strictEqual(res3.error, 'INVALID_QUERY');
    });

    it('2. Search success: normalizes DO terms and deduplicates by canonical source + externalId', async () => {
      globalThis.fetch = (async (url: string | URL | Request) => {
        const urlStr = url.toString();
        if (urlStr.includes('/terms/search')) {
          return new Response(
            JSON.stringify({
              page: 1,
              page_count: 1,
              page_size: 20,
              result_count: 2,
              results: [
                sampleDoTerm,
                { ...sampleDoTerm }, // Duplicate record
              ],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        return new Response('Not found', { status: 404 });
      }) as typeof fetch;

      const res = await searchDiseases('asthma');
      assert.strictEqual(res.ok, true);
      if (res.ok) {
        assert.strictEqual(res.data.results.length, 1); // Deduplicated to 1
        assert.strictEqual(res.data.results[0].externalId, 'DOID:2841');
        assert.strictEqual(res.data.results[0].source, 'Disease Ontology');
        assert.strictEqual(res.data.count, 1);
        assert.strictEqual(res.data.totalCount, 2);
      }
    });

    it('3. Source failure: DO error is returned and NOT disguised as empty search', async () => {
      globalThis.fetch = (async (url: string | URL | Request) => {
        const urlStr = url.toString();
        if (urlStr.includes('/terms/search')) {
          return new Response('Internal Server Error', { status: 500 });
        }
        return new Response('Not found', { status: 404 });
      }) as typeof fetch;

      const res = await searchDiseases('asthma_error');
      assert.strictEqual(res.ok, false);
      if (!res.ok) {
        assert.strictEqual(res.error, 'DISEASE_SOURCE_UNAVAILABLE');
      }
    });

    it('4. Separate MedlinePlus candidates: candidates remain distinct from DO diseases without merging', async () => {
      globalThis.fetch = (async (url: string | URL | Request) => {
        const urlStr = url.toString();
        if (urlStr.includes('/terms/search')) {
          return new Response(
            JSON.stringify({
              page: 1,
              page_count: 1,
              page_size: 20,
              result_count: 1,
              results: [sampleDoTerm],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        if (urlStr.includes('wsearch.nlm.nih.gov')) {
          return new Response(sampleMedlineTopicXml, { status: 200 });
        }
        return new Response('Not found', { status: 404 });
      }) as typeof fetch;

      const res = await searchDiseases('asthma', { includeMedlinePlusCandidates: true });
      assert.strictEqual(res.ok, true);
      if (res.ok) {
        assert.strictEqual(res.data.results.length, 1);
        assert.strictEqual(res.data.results[0].source, 'Disease Ontology');
        // Separately labeled candidate list
        assert.ok(res.data.medlinePlusCandidates);
        assert.strictEqual(res.data.medlinePlusCandidates?.length, 1);
        assert.strictEqual(res.data.medlinePlusCandidates?.[0].title, 'Asthma');
      }
    });
  });

  // ---------------------------------------------------------
  // 2. Disease Details & Conservative Enrichment Tests
  // ---------------------------------------------------------
  describe('getDiseaseDetails', () => {
    it('5. Confident enrichment: matches exact title and MeSH ID, attaching summary and URL', async () => {
      globalThis.fetch = (async (url: string | URL | Request) => {
        const urlStr = url.toString();
        if (urlStr.includes('2841')) {
          return new Response(JSON.stringify(sampleDoTerm), { status: 200 });
        }
        if (urlStr.includes('wsearch.nlm.nih.gov')) {
          return new Response(sampleMedlineTopicXml, { status: 200 });
        }
        return new Response('Not found', { status: 404 });
      }) as typeof fetch;

      const res = await getDiseaseDetails('DOID:2841', { enrich: true });
      assert.strictEqual(res.ok, true);
      if (res.ok) {
        assert.strictEqual(res.data.externalId, 'DOID:2841');
        assert.strictEqual(res.data.enrichmentStatus, 'enriched');
        assert.strictEqual(res.data.medlinePlusUrl, 'https://medlineplus.gov/asthma.html');
        assert.ok(res.data.medlinePlusSummary?.includes('Asthma is a long-term disease'));
        assert.deepStrictEqual(res.data.medlinePlusGroups, ['Lungs and Breathing']);
        assert.ok(res.data.enrichmentBasis?.includes('Exact title match'));
      }
    });

    it('6. Broad topic mismatch: broad umbrella topics are not mapped to specific subtypes', async () => {
      const specificNephroticTerm = {
        doid: 'DOID:1184',
        name: 'Nephrotic syndrome, idiopathic',
        definition: 'A kidney disease causing high protein in urine.',
        synonyms: [],
        parents: ['DOID:563'],
      };

      const broadKidneyXml = `
        <nlmSearchResult>
          <count>1</count>
          <list>
            <document rank="0" url="https://medlineplus.gov/kidneydiseases.html">
              <content name="healthTopic">
                <health-topic id="101" title="Kidney Diseases" url="https://medlineplus.gov/kidneydiseases.html">
                  <full-summary><p>General info about kidneys.</p></full-summary>
                </health-topic>
              </content>
            </document>
          </list>
        </nlmSearchResult>
      `;

      globalThis.fetch = (async (url: string | URL | Request) => {
        const urlStr = url.toString();
        if (urlStr.includes('1184')) {
          return new Response(JSON.stringify(specificNephroticTerm), { status: 200 });
        }
        if (urlStr.includes('wsearch.nlm.nih.gov')) {
          return new Response(broadKidneyXml, { status: 200 });
        }
        return new Response('Not found', { status: 404 });
      }) as typeof fetch;

      const res = await getDiseaseDetails('DOID:1184', { enrich: true });
      assert.strictEqual(res.ok, true);
      if (res.ok) {
        assert.strictEqual(res.data.externalId, 'DOID:1184');
        assert.strictEqual(res.data.enrichmentStatus, 'unmatched');
        assert.strictEqual(res.data.medlinePlusUrl, undefined);
        assert.strictEqual(res.data.medlinePlusSummary, undefined);
      }
    });

    it('7. Enrichment failure preserves DO details: MedlinePlus outage does not destroy DO result', async () => {
      globalThis.fetch = (async (url: string | URL | Request) => {
        const urlStr = url.toString();
        if (urlStr.includes('2841')) {
          return new Response(JSON.stringify(sampleDoTerm), { status: 200 });
        }
        if (urlStr.includes('wsearch.nlm.nih.gov')) {
          return new Response('MedlinePlus 503 Service Unavailable', { status: 503 });
        }
        return new Response('Not found', { status: 404 });
      }) as typeof fetch;

      const res = await getDiseaseDetails('DOID:2841', { enrich: true });
      assert.strictEqual(res.ok, true);
      if (res.ok) {
        assert.strictEqual(res.data.externalId, 'DOID:2841');
        assert.strictEqual(res.data.name, 'Asthma');
        assert.strictEqual(res.data.enrichmentStatus, 'unavailable');
        assert.ok(res.data.enrichmentBasis?.includes('unavailable'));
      }
    });

    it('8. Input immutability: returns fresh cloned objects without mutating cached DO term', async () => {
      globalThis.fetch = (async (url: string | URL | Request) => {
        const urlStr = url.toString();
        if (urlStr.includes('2841')) {
          return new Response(JSON.stringify(sampleDoTerm), { status: 200 });
        }
        return new Response('Not found', { status: 404 });
      }) as typeof fetch;

      const res1 = await getDiseaseDetails('DOID:2841', { enrich: false });
      assert.strictEqual(res1.ok, true);
      if (res1.ok) {
        res1.data.name = 'Mutated Name';
      }

      // Second retrieval from cache
      const res2 = await getDiseaseDetails('DOID:2841', { enrich: false });
      assert.strictEqual(res2.ok, true);
      if (res2.ok) {
        assert.strictEqual(res2.data.name, 'Asthma'); // Not mutated!
      }
    });
  });

  // ---------------------------------------------------------
  // 3. Category Filter Semantics & Candidate Discovery
  // ---------------------------------------------------------
  describe('getDiseaseCandidates & Filter Semantics', () => {
    const mockTermsListing = {
      page: 1,
      page_count: 1,
      page_size: 50,
      result_count: 3,
      results: [
        {
          doid: 'DOID:10652',
          name: 'Alzheimer disease',
          definition: 'A progressive neurodegenerative disorder of the brain.',
          parents: ['DOID:0050117'],
        },
        {
          doid: 'DOID:2841',
          name: 'Asthma',
          definition: 'A chronic lung condition.',
          parents: ['DOID:0050117'],
        },
        {
          doid: 'DOID:99999',
          name: 'obsolete non-disease term',
          definition: 'Old obsolete placeholder.',
          is_obsolete: true,
        },
      ],
    };

    it('9. matchesCategoryFilters: evaluates OR within body-systems and AND with disease-types', () => {
      const mockDisease: ExternalDisease = {
        externalId: 'DOID:1',
        name: 'Multiple Sclerosis',
        synonyms: [],
        bodySystems: ['Brain & Neurology'],
        diseaseTypes: ['Autoimmune Diseases'],
        source: 'Disease Ontology',
        sourceUrl: '',
      };

      // 1. Matches single active filter
      assert.strictEqual(
        matchesCategoryFilters(mockDisease, {
          bodySystems: ['Brain & Neurology'],
          diseaseTypes: [],
        }),
        true
      );

      // 2. OR within body systems: matches if any selected system matches
      assert.strictEqual(
        matchesCategoryFilters(mockDisease, {
          bodySystems: ['Kidney & Urinary', 'Brain & Neurology'],
          diseaseTypes: [],
        }),
        true
      );

      // 3. AND between groups: fails if disease type does not match
      assert.strictEqual(
        matchesCategoryFilters(mockDisease, {
          bodySystems: ['Brain & Neurology'],
          diseaseTypes: ['Infectious Diseases'],
        }),
        false
      );

      // 4. AND between groups: passes if both match
      assert.strictEqual(
        matchesCategoryFilters(mockDisease, {
          bodySystems: ['Brain & Neurology'],
          diseaseTypes: ['Autoimmune Diseases'],
        }),
        true
      );

      // 5. No filters: matches all
      assert.strictEqual(
        matchesCategoryFilters(mockDisease, {
          bodySystems: [],
          diseaseTypes: [],
        }),
        true
      );
    });

    it('10. getDiseaseCandidates: discovers candidates, filters categories, and excludes obsolete terms', async () => {
      globalThis.fetch = (async (url: string | URL | Request) => {
        const urlStr = url.toString();
        if (urlStr.includes('/terms')) {
          return new Response(JSON.stringify(mockTermsListing), { status: 200 });
        }
        return new Response('Not found', { status: 404 });
      }) as typeof fetch;

      const res = await getDiseaseCandidates({
        bodySystems: ['Brain & Neurology'],
      });

      assert.strictEqual(res.ok, true);
      if (res.ok) {
        assert.strictEqual(res.data.candidates.length, 1);
        assert.strictEqual(res.data.candidates[0].name, 'Alzheimer disease');
        // Obsolete term was excluded
        assert.ok(!res.data.candidates.some((c) => c.name.includes('obsolete')));
      }
    });

    it('11. Public pool caching: caches candidate pool independent of user exclusions', async () => {
      let fetchCount = 0;
      globalThis.fetch = (async () => {
        fetchCount++;
        return new Response(JSON.stringify(mockTermsListing), { status: 200 });
      }) as typeof fetch;

      const res1 = await getDiseaseCandidates({ bodySystems: ['Respiratory / Lungs'] });
      assert.strictEqual(res1.ok, true);
      assert.strictEqual(fetchCount, 1);

      // Second identical call served from cache
      const res2 = await getDiseaseCandidates({ bodySystems: ['Respiratory / Lungs'] });
      assert.strictEqual(res2.ok, true);
      assert.strictEqual(fetchCount, 1); // Not fetched again
      if (res2.ok) assert.strictEqual(res2.fromCache, true);
    });

    it('12. Stable identity on DOID lookup: missing supplied DOID returns NOT_FOUND and does not silently fall back to a different label', async () => {
      globalThis.fetch = (async (url: string | URL | Request) => {
        const urlStr = url.toString();
        // If lookup for DOID:9999999 is requested
        if (urlStr.includes('9999999')) {
          return new Response('Not found', { status: 404 });
        }
        // Label endpoint has "asthma"
        if (urlStr.includes('/terms/label')) {
          return new Response(JSON.stringify(sampleDoTerm), { status: 200 });
        }
        return new Response('Not found', { status: 404 });
      }) as typeof fetch;

      // Passing an explicit DOID must not silently fall back to a label
      const res = await getDiseaseDetails('DOID:9999999');
      assert.strictEqual(res.ok, false);
      if (!res.ok) {
        assert.strictEqual(res.error, 'NOT_FOUND');
      }
    });

    it('13. Cache isolation: differently budgeted requests or different startPages do not collide in cache', async () => {
      let fetchCount = 0;
      globalThis.fetch = (async () => {
        fetchCount++;
        return new Response(JSON.stringify(mockTermsListing), { status: 200 });
      }) as typeof fetch;

      // Request with maxPages: 1, startPage: 1
      const res1 = await getDiseaseCandidates({
        bodySystems: ['Brain & Neurology'],
        maxPages: 1,
        startPage: 1,
      });
      assert.strictEqual(res1.ok, true);
      assert.strictEqual(fetchCount, 1);

      // Request with maxPages: 2, startPage: 2 (different page budget and start page)
      const res2 = await getDiseaseCandidates({
        bodySystems: ['Brain & Neurology'],
        maxPages: 2,
        startPage: 2,
      });
      assert.strictEqual(res2.ok, true);
      // Must not collide with res1's cache entry
      assert.strictEqual(fetchCount, 2);
    });

    it('14. Repeated page detection stops safely without infinite loops', async () => {
      let pageCallCount = 0;
      globalThis.fetch = (async () => {
        pageCallCount++;
        // Always return the exact same items on every page, claiming 5 total pages exist
        return new Response(JSON.stringify({ ...mockTermsListing, page_count: 5 }), { status: 200 });
      }) as typeof fetch;

      const res = await getDiseaseCandidates({
        maxPages: 5,
        limit: 100, // Wants 100 items, but upstream only has 3 repeated items
      });

      assert.strictEqual(res.ok, true);
      // Stopped after detecting repeated page on page 2
      assert.strictEqual(pageCallCount, 2);
    });
  });
});
