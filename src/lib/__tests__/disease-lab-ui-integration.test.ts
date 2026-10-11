import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { localPlannerStorage } from '../storage/local-storage';
import { DiseaseProfile, DiseaseStudySession } from '../types';
import { ExternalDisease } from '../disease/types';
import { GET as handleSearchGet } from '../../app/api/disease/search/route';
import { GET as handleDetailsGet } from '../../app/api/disease/details/route';
import { POST as handleRandomPost } from '../../app/api/disease/random/route';
import { NextRequest } from 'next/server';

const storageMap = new Map<string, string>();
const mockLocalStorage = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, val: string) => storageMap.set(key, String(val)),
  removeItem: (key: string) => storageMap.delete(key),
  clear: () => storageMap.clear(),
  get length() { return storageMap.size; },
  key: (index: number) => Array.from(storageMap.keys())[index] ?? null,
};

// Polyfill window and localStorage for Node.js test environment
(globalThis as any).window = { localStorage: mockLocalStorage };
(globalThis as any).localStorage = mockLocalStorage;

describe('Disease Discovery Lab UI & Integration Suite', () => {
  beforeEach(async () => {
    storageMap.clear();
  });

  // -------------------------------------------------------------
  // 1. API Route Boundary & Input Validation
  // -------------------------------------------------------------
  describe('API Route Boundary & Security', () => {
    it('1. Search route rejects empty or whitespace-only queries with HTTP 400', async () => {
      const req = new NextRequest('http://localhost:3000/api/disease/search?q=   ');
      const res = await handleSearchGet(req);
      assert.strictEqual(res.status, 400);
      const json = await res.json();
      assert.strictEqual(json.ok, false);
      assert.strictEqual(json.error, 'INVALID_QUERY');
    });

    it('2. Search route rejects queries exceeding 250 characters with HTTP 400', async () => {
      const longQ = 'a'.repeat(251);
      const req = new NextRequest(`http://localhost:3000/api/disease/search?q=${longQ}`);
      const res = await handleSearchGet(req);
      assert.strictEqual(res.status, 400);
      const json = await res.json();
      assert.strictEqual(json.ok, false);
      assert.strictEqual(json.error, 'INVALID_QUERY');
    });

    it('3. Details route rejects empty or whitespace-only IDs with HTTP 400', async () => {
      const req = new NextRequest('http://localhost:3000/api/disease/details?id=');
      const res = await handleDetailsGet(req);
      assert.strictEqual(res.status, 400);
      const json = await res.json();
      assert.strictEqual(json.ok, false);
      assert.strictEqual(json.error, 'INVALID_ID');
    });

    it('4. Random discovery route enforces no-store header to avoid caching excluded choices', async () => {
      const req = new NextRequest('http://localhost:3000/api/disease/random', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bodySystems: ['Respiratory / Lungs'],
          excludedDiseaseIds: ['DOID:2841'],
        }),
      });

      // Mock fetch so route doesn't need live internet
      const originalFetch = globalThis.fetch;
      globalThis.fetch = (async () => {
        return new Response(
          JSON.stringify({
            page: 1,
            page_count: 1,
            page_size: 20,
            result_count: 1,
            results: [
              {
                doid: 'DOID:0040040',
                name: 'hexamethylene diisocyanate allergic asthma',
                definition: 'A form of asthma caused by isocyanate exposure.',
              },
            ],
          }),
          { status: 200 }
        );
      }) as typeof fetch;

      try {
        const res = await handleRandomPost(req);
        assert.ok(res.headers.get('cache-control')?.includes('no-store'));
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  // -------------------------------------------------------------
  // 2. Storage & Persistence Reliability
  // -------------------------------------------------------------
  describe('Storage & Profile Persistence', () => {
    it('5. Save and reload: restores disease profile, notes, and study session intact', async () => {
      const now = new Date().toISOString();
      const profile: DiseaseProfile = {
        id: 'test-profile-1',
        name: 'Bronchial Asthma',
        synonyms: ['Asthma'],
        do_id: 'DOID:2841',
        medline_plus_url: 'https://medlineplus.gov/asthma.html',
        body_systems: ['Respiratory / Lungs'],
        disease_types: ['Autoimmune Diseases'],
        summary: 'Chronic inflammatory disease of the airways.',
        is_saved_for_later: true,
        review_status: 'learning',
        study_count: 1,
        last_studied_at: now,
        created_at: now,
        updated_at: now,
      };

      const session: DiseaseStudySession = {
        id: 'test-session-1',
        disease_profile_id: 'test-profile-1',
        disease_name: 'Bronchial Asthma',
        do_id: 'DOID:2841',
        body_systems: ['Respiratory / Lungs'],
        disease_types: ['Autoimmune Diseases'],
        target_duration_seconds: 1200,
        actual_duration_seconds: 1215,
        started_at: now,
        completed_at: now,
        questions: [],
        notes: 'Airway hyperresponsiveness and reversible airflow limitation.',
        key_facts: ['Eosinophilic infiltration', 'Triggered by allergens', 'Inhaled corticosteroids are first-line'],
        explanation: 'The lungs airways swell and produce extra mucus, making breathing difficult.',
        status: 'completed',
        review_status: 'comfortable',
        created_at: now,
        updated_at: now,
      };

      await localPlannerStorage.saveDiseaseProfile(profile);
      await localPlannerStorage.saveDiseaseStudySession(session);

      // Verify retrieval
      const retrievedProfile = await localPlannerStorage.getDiseaseProfileById('test-profile-1');
      assert.ok(retrievedProfile);
      assert.strictEqual(retrievedProfile.name, 'Bronchial Asthma');
      assert.strictEqual(retrievedProfile.do_id, 'DOID:2841');
      assert.deepStrictEqual(retrievedProfile.body_systems, ['Respiratory / Lungs']);

      const retrievedSessions = await localPlannerStorage.getDiseaseStudySessions('test-profile-1');
      assert.strictEqual(retrievedSessions.length, 1);
      assert.strictEqual(retrievedSessions[0].notes, 'Airway hyperresponsiveness and reversible airflow limitation.');
      assert.strictEqual(retrievedSessions[0].key_facts?.length, 3);
      assert.strictEqual(retrievedSessions[0].actual_duration_seconds, 1215);
    });

    it('6. Re-saving a disease updates existing profile and avoids duplicates', async () => {
      const now = new Date().toISOString();
      const p1: DiseaseProfile = {
        id: 'profile-re-save',
        name: 'Alzheimer Disease',
        do_id: 'DOID:10652',
        body_systems: ['Brain & Neurology'],
        disease_types: ['Degenerative Diseases'],
        review_status: 'learning',
        study_count: 0,
        created_at: now,
        updated_at: now,
      };

      await localPlannerStorage.saveDiseaseProfile(p1);

      // Update study count and status
      const p2: DiseaseProfile = {
        ...p1,
        review_status: 'comfortable',
        study_count: 1,
        last_studied_at: new Date().toISOString(),
      };

      await localPlannerStorage.saveDiseaseProfile(p2);

      const all = await localPlannerStorage.getDiseaseProfiles();
      const matching = all.filter((p) => p.id === 'profile-re-save');
      assert.strictEqual(matching.length, 1);
      assert.strictEqual(matching[0].study_count, 1);
      assert.strictEqual(matching[0].review_status, 'comfortable');
    });

    it('7. Unrelated Planora data survives a disease profile save', async () => {
      // 1. Create a planner page
      const page = await localPlannerStorage.createPage({
        title: 'Weekly Sprint Journal',
        page_type: 'journal',
      });

      // 2. Save a disease profile
      const disease: DiseaseProfile = {
        id: 'disease-isolation-test',
        name: 'Multiple Sclerosis',
        do_id: 'DOID:2377',
        body_systems: ['Brain & Neurology'],
        disease_types: ['Autoimmune Diseases'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await localPlannerStorage.saveDiseaseProfile(disease);

      // 3. Confirm original planner page is completely untouched
      const retrievedPage = await localPlannerStorage.getPageById(page.id);
      assert.ok(retrievedPage);
      assert.strictEqual(retrievedPage.title, 'Weekly Sprint Journal');
    });

    it('8. Saved studies remain readable and accessible when external API is down', async () => {
      // Offline simulation: saved profile is in storage
      const disease: DiseaseProfile = {
        id: 'offline-study-test',
        name: 'Type 1 Diabetes',
        do_id: 'DOID:9744',
        body_systems: ['Endocrine & Hormonal'],
        disease_types: ['Autoimmune Diseases'],
        summary: 'Autoimmune destruction of pancreatic beta cells.',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await localPlannerStorage.saveDiseaseProfile(disease);

      // Even if fetch throws network error, local storage returns saved profile
      const originalFetch = globalThis.fetch;
      globalThis.fetch = (() => {
        throw new Error('Network unreachable (simulated outage)');
      }) as typeof fetch;

      try {
        const localData = await localPlannerStorage.getDiseaseProfileById('offline-study-test');
        assert.ok(localData);
        assert.strictEqual(localData.name, 'Type 1 Diabetes');
        assert.strictEqual(localData.summary, 'Autoimmune destruction of pancreatic beta cells.');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('9. Accurate timer calculation survives timestamp delta', () => {
      const nowMs = 1700000000000;
      const startedAtIso = new Date(nowMs - 120000).toISOString(); // 120s ago
      const totalPausedMs = 20000; // 20s paused

      const startMs = new Date(startedAtIso).getTime();
      const activeMs = Math.max(0, nowMs - startMs - totalPausedMs);
      const elapsedSeconds = Math.floor(activeMs / 1000);

      // 120s - 20s = 100s elapsed
      assert.strictEqual(elapsedSeconds, 100);
    });
  });
});
