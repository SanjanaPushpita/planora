import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import {
  searchMedlinePlusTopics,
  classifyMedlinePlusTopic,
  _clearInFlightRequestsForTesting,
} from '../disease/medlineplus-client';
import {
  parseMedlinePlusXml,
  htmlToPlainText,
  decodeHtmlEntities,
  isValidTopicUrl,
} from '../disease/medlineplus-parser';
import {
  matchMedlinePlusTopic,
  normalizeStringForMatching,
  isBroadUmbrellaTitle,
  hasSubtypeIndicators,
} from '../disease/medlineplus-matching';
import { diseaseCache } from '../disease/disease-cache';
import { ExternalDisease, MedlinePlusTopic } from '../disease/types';

describe('MedlinePlus Client, Parser, and Matching Suite', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    diseaseCache.clear();
    _clearInFlightRequestsForTesting();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    diseaseCache.clear();
    _clearInFlightRequestsForTesting();
  });

  // ---------------------------------------------------------
  // XML Parser & Text Normalization Tests
  // ---------------------------------------------------------
  describe('MedlinePlus XML Parser & Utilities', () => {
    it('1. decodeHtmlEntities: decodes named, decimal, and hex HTML entities safely', () => {
      const raw = 'Diabetes &amp; Heart &quot;Risk&quot; &#39;Notes&#39; &mdash; &lt;safe&gt; &#65; &#x42;';
      const decoded = decodeHtmlEntities(raw);
      assert.strictEqual(decoded, 'Diabetes & Heart "Risk" \'Notes\' — <safe> A B');
    });

    it('2. htmlToPlainText: preserves paragraphs and bullet lists while stripping raw tags', () => {
      const rawHtml = `
        <p>Asthma is a chronic disease that affects the airways.</p>
        <p>Symptoms include:</p>
        <ul>
          <li>Wheezing</li>
          <li>Chest tightness</li>
          <li>Shortness of breath</li>
        </ul>
        <p>NIH: National Heart, Lung, and Blood Institute</p>
      `;
      const plain = htmlToPlainText(rawHtml);
      assert.ok(plain.includes('Asthma is a chronic disease'));
      assert.ok(plain.includes('• Wheezing'));
      assert.ok(plain.includes('• Chest tightness'));
      assert.ok(plain.includes('• Shortness of breath'));
      assert.ok(!plain.includes('<p>'));
      assert.ok(!plain.includes('<li>'));
      assert.ok(!plain.includes('<ul>'));
    });

    it('3. isValidTopicUrl: accepts valid http/https URLs and rejects unsafe schemes', () => {
      assert.strictEqual(isValidTopicUrl('https://medlineplus.gov/asthma.html'), true);
      assert.strictEqual(isValidTopicUrl('http://medlineplus.gov/diabetes.html'), true);
      assert.strictEqual(isValidTopicUrl('javascript:alert(1)'), false);
      assert.strictEqual(isValidTopicUrl('data:text/html,<script>'), false);
      assert.strictEqual(isValidTopicUrl(''), false);
      assert.strictEqual(isValidTopicUrl(null), false);
    });

    it('4. parseMedlinePlusXml: handles valid empty results (count 0)', () => {
      const emptyXml = `
        <nlmSearchResult>
          <term>nonexistentdisease12345</term>
          <count>0</count>
          <retstart>0</retstart>
          <retmax>10</retmax>
          <list></list>
        </nlmSearchResult>
      `;
      const res = parseMedlinePlusXml(emptyXml);
      assert.strictEqual(res.ok, true);
      if (res.ok) {
        assert.strictEqual(res.count, 0);
        assert.strictEqual(res.totalCount, 0);
        assert.strictEqual(res.topics.length, 0);
      }
    });

    it('5. parseMedlinePlusXml: parses rettype=topic with full health-topic details', () => {
      const topicXml = `
        <nlmSearchResult>
          <term>asthma</term>
          <count>1</count>
          <retstart>0</retstart>
          <retmax>10</retmax>
          <list>
            <document rank="0" url="https://medlineplus.gov/asthma.html">
              <content name="healthTopic">
                <health-topic id="3061" title="Asthma" url="https://medlineplus.gov/asthma.html" language="English" date-created="01/07/2003" meta-desc="Asthma summary">
                  <also-called>Bronchial asthma</also-called>
                  <also-called>Reactive airway disease</also-called>
                  <see-reference>Exercise-induced asthma</see-reference>
                  <full-summary><p>Asthma is a chronic disease of the lungs.</p></full-summary>
                  <group id="1" url="https://medlineplus.gov/lungsandbreathing.html">Lungs and Breathing</group>
                  <group id="2" url="https://medlineplus.gov/immunesystem.html">Immune System</group>
                  <mesh-heading>
                    <descriptor id="D001249">Asthma</descriptor>
                  </mesh-heading>
                </health-topic>
              </content>
            </document>
          </list>
        </nlmSearchResult>
      `;
      const res = parseMedlinePlusXml(topicXml);
      assert.strictEqual(res.ok, true);
      if (res.ok) {
        assert.strictEqual(res.count, 1);
        const topic = res.topics[0];
        assert.strictEqual(topic.id, '3061');
        assert.strictEqual(topic.title, 'Asthma');
        assert.strictEqual(topic.url, 'https://medlineplus.gov/asthma.html');
        assert.strictEqual(topic.language, 'English');
        assert.deepStrictEqual(topic.altTitles, ['Bronchial asthma', 'Reactive airway disease']);
        assert.deepStrictEqual(topic.seeReferences, ['Exercise-induced asthma']);
        assert.strictEqual(topic.fullSummary, 'Asthma is a chronic disease of the lungs.');
        assert.deepStrictEqual(topic.groupNames, ['Lungs and Breathing', 'Immune System']);
        assert.deepStrictEqual(topic.meshHeadings, ['Asthma']);
        assert.strictEqual(topic.meshDescriptors?.[0]?.id, 'D001249');
        assert.strictEqual(topic.meshDescriptors?.[0]?.descriptor, 'Asthma');
      }
    });

    it('6. parseMedlinePlusXml: rejects malformed XML and reports syntax error', () => {
      const malformedXml = '<nlmSearchResult><count>1<unclosed></nlmSearchResult>';
      const res = parseMedlinePlusXml(malformedXml);
      assert.strictEqual(res.ok, false);
      if (!res.ok) {
        assert.strictEqual(res.error, 'PARSING_ERROR');
      }
    });

    it('7. parseMedlinePlusXml: handles XML-level service error elements', () => {
      const errorXml = `
        <nlmSearchResult>
          <error>Your search session has expired. Please initiate a new query.</error>
        </nlmSearchResult>
      `;
      const res = parseMedlinePlusXml(errorXml);
      assert.strictEqual(res.ok, false);
      if (!res.ok) {
        assert.strictEqual(res.error, 'PARSING_ERROR');
        assert.ok(res.message.includes('expired'));
      }
    });

    it('8. parseMedlinePlusXml: ignores documents with unsafe URLs', () => {
      const unsafeXml = `
        <nlmSearchResult>
          <count>1</count>
          <list>
            <document rank="0" url="javascript:stealCookie()">
              <content name="healthTopic">
                <health-topic id="999" title="Malicious Topic" url="javascript:stealCookie()">
                  <full-summary><p>Hacked</p></full-summary>
                </health-topic>
              </content>
            </document>
          </list>
        </nlmSearchResult>
      `;
      const res = parseMedlinePlusXml(unsafeXml);
      assert.strictEqual(res.ok, true);
      if (res.ok) {
        assert.strictEqual(res.topics.length, 0); // Unsafe URL topic dropped
      }
    });
  });

  // ---------------------------------------------------------
  // Category Integration Tests
  // ---------------------------------------------------------
  describe('Category Integration', () => {
    it('9. classifyMedlinePlusTopic: maps MedlinePlus groups to Planora body systems and disease types', () => {
      const topic: MedlinePlusTopic = {
        title: 'Asthma',
        altTitles: ['Bronchial Asthma'],
        fullSummary: 'Asthma is a respiratory lung condition.',
        url: 'https://medlineplus.gov/asthma.html',
        groupNames: ['Lungs and Breathing'],
        meshHeadings: ['Asthma'],
      };
      const classification = classifyMedlinePlusTopic(topic);
      assert.ok(classification.bodySystems.includes('Respiratory / Lungs'));
    });

    it('10. classifyMedlinePlusTopic: handles multiple distinct topic groups', () => {
      const topic: MedlinePlusTopic = {
        title: 'Stroke',
        altTitles: ['Cerebrovascular accident'],
        fullSummary: 'A stroke happens when blood flow to the brain is blocked.',
        url: 'https://medlineplus.gov/stroke.html',
        groupNames: ['Brain and Nerves', 'Heart and Circulation'],
        meshHeadings: ['Stroke'],
      };
      const classification = classifyMedlinePlusTopic(topic);
      assert.ok(classification.bodySystems.includes('Brain & Neurology'));
      assert.ok(classification.bodySystems.includes('Cardiovascular / Heart'));
    });
  });

  // ---------------------------------------------------------
  // Conservative Matching Tests
  // ---------------------------------------------------------
  describe('Conservative Disease-Topic Matching', () => {
    const baseDisease: ExternalDisease = {
      externalId: 'DOID:2841',
      name: 'Asthma',
      synonyms: ['Bronchial asthma', 'Chronic obstructive asthma'],
      bodySystems: ['Respiratory / Lungs'],
      diseaseTypes: ['Infectious Diseases'],
      source: 'Disease Ontology',
      sourceUrl: 'https://disease-ontology.org/?id=DOID:2841',
      crossReferences: {
        MESH: ['D001249'],
      },
    };

    it('11. Exact title match: matches when disease name matches topic title exactly', () => {
      const topics: MedlinePlusTopic[] = [
        {
          title: 'Asthma',
          altTitles: [],
          fullSummary: 'Asthma summary',
          url: 'https://medlineplus.gov/asthma.html',
          groupNames: ['Lungs and Breathing'],
          meshHeadings: [],
        },
      ];
      const match = matchMedlinePlusTopic(baseDisease, topics);
      assert.strictEqual(match.confidence, 'exact_title');
      assert.strictEqual(match.matchedTopic?.title, 'Asthma');
      assert.ok(match.matchBasis.includes('Exact title match'));
    });

    it('12. Authoritative MeSH ID match: matches via MeSH descriptor ID', () => {
      const diseaseWithoutExactName: ExternalDisease = {
        ...baseDisease,
        name: 'Reactive Airway Disease Variant',
        synonyms: [],
        crossReferences: {
          MESH: ['D001249'],
        },
      };
      const topics: MedlinePlusTopic[] = [
        {
          title: 'Asthma and Airway Health',
          altTitles: [],
          fullSummary: 'Asthma summary',
          url: 'https://medlineplus.gov/asthma.html',
          groupNames: ['Lungs and Breathing'],
          meshHeadings: ['Asthma'],
          meshDescriptors: [{ id: 'D001249', descriptor: 'Asthma' }],
        },
      ];
      const match = matchMedlinePlusTopic(diseaseWithoutExactName, topics);
      assert.strictEqual(match.confidence, 'mesh_descriptor');
      assert.strictEqual(match.matchedTopic?.title, 'Asthma and Airway Health');
      assert.ok(match.matchBasis.includes('D001249'));
    });

    it('13. Exact synonym match: matches disease synonym against topic title or also-called', () => {
      const diseaseWithSynonym: ExternalDisease = {
        ...baseDisease,
        name: 'Hyperactive Bronchial Disorder',
        synonyms: ['Bronchial asthma'],
        crossReferences: {},
      };
      const topics: MedlinePlusTopic[] = [
        {
          title: 'Asthma',
          altTitles: ['Bronchial asthma'],
          fullSummary: 'Asthma summary',
          url: 'https://medlineplus.gov/asthma.html',
          groupNames: ['Lungs and Breathing'],
          meshHeadings: [],
        },
      ];
      const match = matchMedlinePlusTopic(diseaseWithSynonym, topics);
      assert.strictEqual(match.confidence, 'exact_synonym');
      assert.strictEqual(match.matchedTopic?.title, 'Asthma');
    });

    it('14. Broad topic vs subtype mismatch: rejects broad umbrella topics for specific subtypes', () => {
      const specificDisease: ExternalDisease = {
        externalId: 'DOID:1184',
        name: 'Nephrotic syndrome, idiopathic',
        synonyms: [],
        bodySystems: ['Kidney & Urinary'],
        diseaseTypes: ['Other'],
        source: 'Disease Ontology',
        sourceUrl: 'https://disease-ontology.org/?id=DOID:1184',
      };
      const topics: MedlinePlusTopic[] = [
        {
          title: 'Kidney Diseases',
          altTitles: [],
          fullSummary: 'General information about kidney diseases.',
          url: 'https://medlineplus.gov/kidneydiseases.html',
          groupNames: ['Kidneys and Urinary System'],
          meshHeadings: ['Kidney Diseases'],
        },
      ];
      const match = matchMedlinePlusTopic(specificDisease, topics);
      assert.strictEqual(match.matchedTopic, null);
      assert.strictEqual(match.confidence, 'weak');
      assert.ok(match.matchBasis.includes('broad health topic umbrella'));
    });

    it('15. Subtype pattern check: rejects general Arthritis topic for Juvenile rheumatoid arthritis', () => {
      const juvenileArthritis: ExternalDisease = {
        externalId: 'DOID:595',
        name: 'Juvenile rheumatoid arthritis',
        synonyms: [],
        bodySystems: ['Musculoskeletal'],
        diseaseTypes: ['Autoimmune Diseases'],
        source: 'Disease Ontology',
        sourceUrl: 'https://disease-ontology.org/?id=DOID:595',
      };
      const topics: MedlinePlusTopic[] = [
        {
          title: 'Arthritis',
          altTitles: [],
          fullSummary: 'Arthritis summary',
          url: 'https://medlineplus.gov/arthritis.html',
          groupNames: ['Bones, Joints and Muscles'],
          meshHeadings: [],
        },
      ];
      const match = matchMedlinePlusTopic(juvenileArthritis, topics);
      assert.strictEqual(match.matchedTopic, null);
      assert.strictEqual(match.confidence, 'none');
    });

    it('16. Ambiguous results: returns no confident match when multiple topics match equally', () => {
      const ambiguousDisease: ExternalDisease = {
        ...baseDisease,
        name: 'Non-specific Syndrome',
        synonyms: ['Term A', 'Term B'],
        crossReferences: {},
      };
      const topics: MedlinePlusTopic[] = [
        {
          title: 'Topic A',
          altTitles: ['Term A'],
          fullSummary: 'Summary A',
          url: 'https://medlineplus.gov/a.html',
          groupNames: [],
          meshHeadings: [],
        },
        {
          title: 'Topic B',
          altTitles: ['Term B'],
          fullSummary: 'Summary B',
          url: 'https://medlineplus.gov/b.html',
          groupNames: [],
          meshHeadings: [],
        },
      ];
      const match = matchMedlinePlusTopic(ambiguousDisease, topics);
      assert.strictEqual(match.matchedTopic, null);
      assert.strictEqual(match.confidence, 'weak');
      assert.ok(match.matchBasis.includes('Ambiguous match'));
    });

    it('17. Immutability: matching does not mutate original disease or topics', () => {
      const diseaseCopy = JSON.parse(JSON.stringify(baseDisease));
      const topics: MedlinePlusTopic[] = [
        {
          title: 'Asthma',
          altTitles: [],
          fullSummary: 'Asthma summary',
          url: 'https://medlineplus.gov/asthma.html',
          groupNames: [],
          meshHeadings: [],
        },
      ];
      matchMedlinePlusTopic(baseDisease, topics);
      assert.deepStrictEqual(baseDisease, diseaseCopy);
    });
  });

  // ---------------------------------------------------------
  // MedlinePlus Client Tests (Requests, Caching, Errors)
  // ---------------------------------------------------------
  describe('MedlinePlus Client Requests & Cache Control', () => {
    const validSearchXml = `
      <nlmSearchResult>
        <term>asthma</term>
        <count>1</count>
        <list>
          <document rank="0" url="https://medlineplus.gov/asthma.html">
            <content name="healthTopic">
              <health-topic id="3061" title="Asthma" url="https://medlineplus.gov/asthma.html" language="English">
                <full-summary><p>Asthma summary</p></full-summary>
                <group id="1">Lungs and Breathing</group>
              </health-topic>
            </content>
          </document>
        </list>
      </nlmSearchResult>
    `;

    it('18. Query validation: rejects empty, whitespace, and excessively long queries', async () => {
      const res1 = await searchMedlinePlusTopics('');
      assert.strictEqual(res1.ok, false);
      if (!res1.ok) assert.strictEqual(res1.error, 'INVALID_QUERY');

      const res2 = await searchMedlinePlusTopics('   ');
      assert.strictEqual(res2.ok, false);
      if (!res2.ok) assert.strictEqual(res2.error, 'INVALID_QUERY');

      const res3 = await searchMedlinePlusTopics('a'.repeat(251));
      assert.strictEqual(res3.ok, false);
      if (!res3.ok) assert.strictEqual(res3.error, 'INVALID_QUERY');
    });

    it('19. Request construction: sets required query params db=healthTopics, rettype=topic, tool', async () => {
      let capturedUrl = '';

      globalThis.fetch = (async (url: string | URL | Request) => {
        capturedUrl = url.toString();
        return new Response(validSearchXml, { status: 200 });
      }) as typeof fetch;

      const res = await searchMedlinePlusTopics('asthma');
      assert.strictEqual(res.ok, true);
      assert.ok(capturedUrl.includes('db=healthTopics'));
      assert.ok(capturedUrl.includes('term=asthma'));
      assert.ok(capturedUrl.includes('rettype=topic'));
      assert.ok(capturedUrl.includes('retmax=10'));
      assert.ok(capturedUrl.includes('tool=PlanoraDiseaseLab'));
    });

    it('20. Spanish language option: sets db=healthTopicsSpanish', async () => {
      let capturedUrl = '';

      globalThis.fetch = (async (url: string | URL | Request) => {
        capturedUrl = url.toString();
        return new Response(validSearchXml, { status: 200 });
      }) as typeof fetch;

      const res = await searchMedlinePlusTopics('asma', { language: 'Spanish' });
      assert.strictEqual(res.ok, true);
      assert.ok(capturedUrl.includes('db=healthTopicsSpanish'));
      assert.ok(capturedUrl.includes('term=asma'));
    });

    it('21. Caching: serves subsequent identical search from cache', async () => {
      let fetchCount = 0;

      globalThis.fetch = (async () => {
        fetchCount++;
        return new Response(validSearchXml, { status: 200 });
      }) as typeof fetch;

      const res1 = await searchMedlinePlusTopics('asthma');
      assert.strictEqual(res1.ok, true);
      assert.strictEqual(fetchCount, 1);
      if (res1.ok) assert.strictEqual(res1.fromCache, false);

      const res2 = await searchMedlinePlusTopics('asthma');
      assert.strictEqual(res2.ok, true);
      assert.strictEqual(fetchCount, 1); // Not fetched again
      if (res2.ok) assert.strictEqual(res2.fromCache, true);
    });

    it('22. In-flight deduplication: simultaneous identical queries produce only 1 network fetch', async () => {
      let fetchCount = 0;

      globalThis.fetch = (async () => {
        fetchCount++;
        // Introduce small artificial latency
        await new Promise((resolve) => setTimeout(resolve, 30));
        return new Response(validSearchXml, { status: 200 });
      }) as typeof fetch;

      const [res1, res2] = await Promise.all([
        searchMedlinePlusTopics('asthma_concurrent'),
        searchMedlinePlusTopics('asthma_concurrent'),
      ]);

      assert.strictEqual(res1.ok, true);
      assert.strictEqual(res2.ok, true);
      assert.strictEqual(fetchCount, 1); // Deduplicated into a single call
    });

    it('23. HTTP 429 Rate limit: returns RATE_LIMITED structured error', async () => {
      globalThis.fetch = (async () => {
        return new Response('Rate limit reached', { status: 429 });
      }) as typeof fetch;

      const res = await searchMedlinePlusTopics('asthma_rate_limit');
      assert.strictEqual(res.ok, false);
      if (!res.ok) {
        assert.strictEqual(res.error, 'RATE_LIMITED');
        assert.strictEqual(res.statusCode, 429);
      }
    });

    it('24. HTTP 500 error: returns DISEASE_SOURCE_UNAVAILABLE', async () => {
      globalThis.fetch = (async () => {
        return new Response('Internal Server Error', { status: 500 });
      }) as typeof fetch;

      const res = await searchMedlinePlusTopics('asthma_server_error');
      assert.strictEqual(res.ok, false);
      if (!res.ok) {
        assert.strictEqual(res.error, 'DISEASE_SOURCE_UNAVAILABLE');
        assert.strictEqual(res.statusCode, 500);
      }
    });

    it('25. Timeout handling: returns DISEASE_SOURCE_UNAVAILABLE on AbortError', async () => {
      globalThis.fetch = (async () => {
        const error = new Error('The operation was aborted');
        error.name = 'AbortError';
        throw error;
      }) as typeof fetch;

      const res = await searchMedlinePlusTopics('asthma_timeout', { timeoutMs: 50 });
      assert.strictEqual(res.ok, false);
      if (!res.ok) {
        assert.strictEqual(res.error, 'DISEASE_SOURCE_UNAVAILABLE');
        assert.ok(res.message.includes('timed out'));
      }
    });

    it('26. Failures are not cached as successful empty results', async () => {
      globalThis.fetch = (async () => {
        return new Response('Server Error', { status: 503 });
      }) as typeof fetch;

      const failRes = await searchMedlinePlusTopics('asthma_no_cache_fail');
      assert.strictEqual(failRes.ok, false);

      // Now server recovers
      globalThis.fetch = (async () => {
        return new Response(validSearchXml, { status: 200 });
      }) as typeof fetch;

      const okRes = await searchMedlinePlusTopics('asthma_no_cache_fail');
      assert.strictEqual(okRes.ok, true);
      if (okRes.ok) {
        assert.strictEqual(okRes.fromCache, false);
      }
    });
  });
});
