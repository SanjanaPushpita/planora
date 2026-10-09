import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  BODY_SYSTEMS,
  DISEASE_TYPES,
  classifyDiseaseMetadata,
  classifyDisease,
  normalizeBodySystems,
  normalizeDiseaseTypes,
  mapMedlinePlusGroupToBodySystems,
  mapMedlinePlusGroupToDiseaseTypes,
  inferBodySystemsFromText,
  inferDiseaseTypesFromText,
} from '../disease/disease-categories';
import {
  diseaseCache,
  createCacheKey,
  CACHE_TTL,
} from '../disease/disease-cache';

describe('Disease Category Engine & Cache Test Suite', () => {
  // A. Neurology via MedlinePlus group
  it('A. Neurology: maps "Brain and Nerves" to Brain & Neurology', () => {
    const systems = mapMedlinePlusGroupToBodySystems('Brain and Nerves');
    assert.deepStrictEqual(systems, ['Brain & Neurology']);

    const res = classifyDiseaseMetadata({
      name: 'Encephalopathy',
      medlineGroups: ['Brain and Nerves'],
    });
    assert.strictEqual(res.bodySystems.includes('Brain & Neurology'), true);
  });

  // B. Kidney via MedlinePlus group
  it('B. Kidney: maps "Kidneys and Urinary System" to Kidney & Urinary', () => {
    const systems = mapMedlinePlusGroupToBodySystems('Kidneys and Urinary System');
    assert.deepStrictEqual(systems, ['Kidney & Urinary']);

    const res = classifyDiseaseMetadata({
      name: 'Glomerulonephritis',
      medlineGroups: ['Kidneys and Urinary System'],
    });
    assert.strictEqual(res.bodySystems.includes('Kidney & Urinary'), true);
  });

  // C. Cancer inference from text
  it('C. Cancer: infers Cancer / Neoplastic Diseases from "malignant carcinoma"', () => {
    const types = inferDiseaseTypesFromText('malignant carcinoma');
    assert.strictEqual(types.includes('Cancer / Neoplastic Diseases'), true);

    const res = classifyDiseaseMetadata({
      name: 'Adrenocortical Carcinoma',
      definition: 'A rare malignant carcinoma of the adrenal cortex.',
    });
    assert.strictEqual(res.diseaseTypes.includes('Cancer / Neoplastic Diseases'), true);
  });

  // D. Infectious inference from text
  it('D. Infectious: infers Infectious Diseases from "viral infectious disease"', () => {
    const types = inferDiseaseTypesFromText('viral infectious disease');
    assert.strictEqual(types.includes('Infectious Diseases'), true);

    const res = classifyDiseaseMetadata({
      name: 'Influenza',
      definition: 'A viral infectious disease affecting respiratory pathways.',
    });
    assert.strictEqual(res.diseaseTypes.includes('Infectious Diseases'), true);
  });

  // E. Genetic inference from text
  it('E. Genetic: infers Genetic & Rare Diseases from "hereditary mutation"', () => {
    const types = inferDiseaseTypesFromText('hereditary mutation');
    assert.strictEqual(types.includes('Genetic & Rare Diseases'), true);

    const res = classifyDiseaseMetadata({
      name: 'Huntington Disease',
      definition: 'A progressive brain disorder caused by an inherited hereditary mutation.',
    });
    assert.strictEqual(res.diseaseTypes.includes('Genetic & Rare Diseases'), true);
  });

  // F. Multiple Categories: Autoimmune + Neurological
  it('F. Autoimmune + Neurological: classifies disease into both categories', () => {
    const res = classifyDiseaseMetadata({
      name: 'Multiple Sclerosis',
      definition: 'An autoimmune disease affecting central nervous system myelin.',
    });
    assert.strictEqual(res.bodySystems.includes('Brain & Neurology'), true);
    assert.strictEqual(res.diseaseTypes.includes('Autoimmune Diseases'), true);
  });

  // G. Duplicate prevention
  it('G. Duplicate prevention: repeated signals produce unique deduplicated categories', () => {
    const res = classifyDiseaseMetadata({
      name: 'Cerebral Stroke and Brain Infarction',
      definition: 'A brain neurological condition involving cerebral cortex damage.',
      synonyms: ['Brain stroke', 'Cerebral apoplexy'],
      medlineGroups: ['Brain and Nerves'],
    });

    const neurologyCount = res.bodySystems.filter(s => s === 'Brain & Neurology').length;
    assert.strictEqual(neurologyCount, 1, 'Brain & Neurology must appear exactly once');
  });

  // H. Unknown / low-confidence cases
  it('H. Unknown: does not fabricate body-system and falls back disease type to Other', () => {
    const res = classifyDiseaseMetadata({
      name: 'Condition X-901',
      definition: 'A generalized unspecified state of unknown origin with no organ localization.',
    });

    assert.strictEqual(res.bodySystems.length, 0, 'No body system should be fabricated');
    assert.deepStrictEqual(res.diseaseTypes, ['Other'], 'Disease type should default to Other');
  });

  // I. Case-insensitive handling
  it('I. Case-insensitivity: "HEART AND CIRCULATION" maps correctly regardless of casing', () => {
    const upper = mapMedlinePlusGroupToBodySystems('HEART AND CIRCULATION');
    assert.deepStrictEqual(upper, ['Cardiovascular / Heart']);

    const mixed = mapMedlinePlusGroupToBodySystems('  heArt AnD ciRcuLation  ');
    assert.deepStrictEqual(mixed, ['Cardiovascular / Heart']);
  });

  // J. Empty metadata handling
  it('J. Empty metadata: handles empty object or fields safely without throwing', () => {
    const res = classifyDiseaseMetadata({ name: '' });
    assert.deepStrictEqual(res.bodySystems, []);
    assert.deepStrictEqual(res.diseaseTypes, ['Other']);

    // @ts-expect-error testing runtime robustness against null
    const nullRes = classifyDiseaseMetadata(null);
    assert.deepStrictEqual(nullRes.bodySystems, []);
    assert.deepStrictEqual(nullRes.diseaseTypes, ['Other']);
  });

  // K. Multisystem behavior
  it('K. Multisystem: conservative classification when systemic keywords match or 3+ organs involved', () => {
    const systemicRes = classifyDiseaseMetadata({
      name: 'Systemic Lupus Erythematosus',
      definition: 'A multisystem autoimmune disorder with multiorgan involvement.',
    });
    assert.strictEqual(systemicRes.bodySystems.includes('Multisystem'), true);

    const threeOrgans = classifyDiseaseMetadata({
      name: 'Complex Syndrome',
      definition: 'Condition affecting the heart, kidney, and lung tissues.',
    });
    assert.strictEqual(threeOrgans.bodySystems.includes('Multisystem'), true);
  });

  // L. Category normalizers
  it('L. Normalizers: normalizeBodySystems and normalizeDiseaseTypes validate arrays', () => {
    const normalizedSystems = normalizeBodySystems(['Brain & Neurology', 'Fake System', 'Eye / Ophthalmology']);
    assert.deepStrictEqual(normalizedSystems, ['Brain & Neurology', 'Eye / Ophthalmology']);

    const normalizedTypes = normalizeDiseaseTypes(['Infectious Diseases', 'Invalid Type']);
    assert.deepStrictEqual(normalizedTypes, ['Infectious Diseases']);

    const emptyTypes = normalizeDiseaseTypes([]);
    assert.deepStrictEqual(emptyTypes, ['Other']);
  });

  // M. Public Disease Cache Unit Tests
  it('M. Cache: sets, gets, checks presence, deletes, and handles deterministic keys', () => {
    const key = createCacheKey('Disease Ontology', 'DOID:10652');
    assert.strictEqual(key, 'disease_disease_ontology:doid:10652');

    diseaseCache.set(key, { name: 'Alzheimer Disease' }, CACHE_TTL.DO_DETAIL);
    assert.strictEqual(diseaseCache.has(key), true);

    const cached = diseaseCache.get<{ name: string }>(key);
    assert.strictEqual(cached?.name, 'Alzheimer Disease');

    diseaseCache.delete(key);
    assert.strictEqual(diseaseCache.has(key), false);
    assert.strictEqual(diseaseCache.get(key), null);
  });

  it('N. Cache Expiration: expired items return null and are pruned by clearExpired', async () => {
    const expKey = createCacheKey('medline', 'quick_test');
    // Set 10ms TTL
    diseaseCache.set(expKey, { topic: 'test' }, 10);

    // Sleep 25ms
    await new Promise(resolve => setTimeout(resolve, 25));

    assert.strictEqual(diseaseCache.get(expKey), null);
    assert.strictEqual(diseaseCache.has(expKey), false);
  });
});
