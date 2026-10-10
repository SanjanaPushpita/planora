import { ExternalDisease, MedlinePlusTopic } from './types';

export type MatchConfidence =
  | 'exact_title'
  | 'exact_synonym'
  | 'mesh_descriptor'
  | 'weak'
  | 'none';

export interface TopicMatchResult {
  readonly matchedTopic: MedlinePlusTopic | null;
  readonly confidence: MatchConfidence;
  readonly matchBasis: string;
  readonly candidateTopics: readonly MedlinePlusTopic[];
}

/**
 * Standard broad umbrella topic titles that must not be equated to specific disease subtypes.
 */
const BROAD_UMBRELLA_TITLES = new Set([
  'kidney diseases',
  'heart diseases',
  'lung diseases',
  'liver diseases',
  'skin diseases',
  'skin conditions',
  'eye diseases',
  'blood disorders',
  'bone diseases',
  'brain diseases',
  'genetic disorders',
  'infections',
  'infectious diseases',
  'digestive diseases',
  'autoimmune diseases',
  'cancers',
  'cancer',
  'tumors',
  'mental disorders',
  'metabolic disorders',
  'endocrine diseases',
  'bacterial infections',
  'viral infections',
  'parasitic diseases',
  'neurological disorders',
]);

/**
 * Common subtype indicators in clinical disease nomenclature.
 */
const SUBTYPE_INDICATORS = [
  /\btype\s+(?:1|2|3|4|5|i|ii|iii|iv|v|a|b|c|d)\b/i,
  /\b(?:juvenile|infantile|childhood|adult[- ]onset|early[- ]onset|late[- ]onset)\b/i,
  /\b(?:congenital|familial|hereditary)\b/i,
  /\b(?:acute|chronic|subacute)\b/i,
  /\b(?:primary|secondary|idiopathic|refractory|relapsing)\b/i,
  /\b(?:stage\s+\d+|grade\s+\d+|class\s+\d+)\b/i,
  /\bsubtype\b/i,
];

/**
 * Normalizes text for conservative exact matching:
 * - Lowercase
 * - Strips accents/diacritics
 * - Removes non-alphanumeric punctuation
 * - Collapses whitespace
 */
export function normalizeStringForMatching(str: string): string {
  if (!str || typeof str !== 'string') return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['"`]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Checks whether a disease title contains specific subtype qualifiers.
 */
export function hasSubtypeIndicators(title: string): boolean {
  return SUBTYPE_INDICATORS.some((pattern) => pattern.test(title));
}

/**
 * Checks if a topic title represents a broad umbrella category.
 */
export function isBroadUmbrellaTitle(title: string): boolean {
  const norm = normalizeStringForMatching(title);
  return BROAD_UMBRELLA_TITLES.has(norm);
}

/**
 * Extracts normalized MeSH IDs from disease cross-references.
 */
function extractDiseaseMeshIds(disease: ExternalDisease): Set<string> {
  const set = new Set<string>();
  const xrefs = disease.crossReferences;
  if (!xrefs) return set;

  const meshList = xrefs['MESH'] || xrefs['MSH'] || [];
  for (const m of meshList) {
    if (typeof m === 'string') {
      const clean = m.trim().toUpperCase();
      if (clean) set.add(clean);
    }
  }
  return set;
}

/**
 * Extracts normalized MeSH IDs from a MedlinePlus topic.
 */
function extractTopicMeshIds(topic: MedlinePlusTopic): Set<string> {
  const set = new Set<string>();
  if (topic.meshDescriptors) {
    for (const desc of topic.meshDescriptors) {
      if (desc.id) {
        const clean = desc.id.trim().toUpperCase();
        if (clean) set.add(clean);
      }
    }
  }
  return set;
}

/**
 * Pure conservative disease-topic matcher:
 * - Checks exact normalized title match
 * - Checks authoritative MeSH descriptor ID overlap
 * - Checks exact synonym / also-called matches
 * - Rejects broad-topic versus subtype mismatches
 * - Rejects ambiguous multi-topic matches
 * - Never modifies the original disease or topic inputs
 *
 * Confidence is returned as a clear categorical label, not a calibrated probability.
 */
export function matchMedlinePlusTopic(
  disease: Readonly<ExternalDisease>,
  topics: ReadonlyArray<MedlinePlusTopic>
): TopicMatchResult {
  const candidateTopics = Object.freeze([...topics]);

  if (!disease || !disease.name || !topics || topics.length === 0) {
    return {
      matchedTopic: null,
      confidence: 'none',
      matchBasis: 'No topics or invalid disease provided.',
      candidateTopics,
    };
  }

  const diseaseNormName = normalizeStringForMatching(disease.name);
  const diseaseSynonymsNorm = (disease.synonyms || []).map(normalizeStringForMatching).filter(Boolean);
  const diseaseMeshIds = extractDiseaseMeshIds(disease);
  const diseaseHasSubtype = hasSubtypeIndicators(disease.name);

  // 1. Check for Exact Title Match
  const titleMatches: Array<{ topic: MedlinePlusTopic; basis: string }> = [];
  for (const topic of topics) {
    const topicNormTitle = normalizeStringForMatching(topic.title);
    if (!topicNormTitle) continue;

    if (diseaseNormName === topicNormTitle) {
      // Guard: if topic is an umbrella title and disease name is a subtype, reject as broad mismatch
      if (isBroadUmbrellaTitle(topic.title) && diseaseHasSubtype) {
        continue;
      }
      titleMatches.push({
        topic,
        basis: `Exact title match between "${disease.name}" and MedlinePlus topic "${topic.title}".`,
      });
    }
  }

  if (titleMatches.length === 1) {
    return {
      matchedTopic: titleMatches[0].topic,
      confidence: 'exact_title',
      matchBasis: titleMatches[0].basis,
      candidateTopics,
    };
  }

  if (titleMatches.length > 1) {
    // Ambiguity: multiple exact title matches
    return {
      matchedTopic: null,
      confidence: 'weak',
      matchBasis: `Ambiguous match: multiple topics matched disease title "${disease.name}".`,
      candidateTopics,
    };
  }

  // 2. Check for Authoritative MeSH ID Match
  if (diseaseMeshIds.size > 0) {
    const meshMatches: Array<{ topic: MedlinePlusTopic; meshId: string }> = [];
    for (const topic of topics) {
      const topicMeshIds = extractTopicMeshIds(topic);
      for (const meshId of diseaseMeshIds) {
        if (topicMeshIds.has(meshId)) {
          // Guard: if topic is a broad umbrella and disease is a subtype, verify MeSH descriptor
          if (isBroadUmbrellaTitle(topic.title) && diseaseHasSubtype) {
            continue;
          }
          meshMatches.push({ topic, meshId });
          break;
        }
      }
    }

    if (meshMatches.length === 1) {
      return {
        matchedTopic: meshMatches[0].topic,
        confidence: 'mesh_descriptor',
        matchBasis: `Authoritative MeSH descriptor match (ID: ${meshMatches[0].meshId}) for "${meshMatches[0].topic.title}".`,
        candidateTopics,
      };
    }

    if (meshMatches.length > 1) {
      return {
        matchedTopic: null,
        confidence: 'weak',
        matchBasis: `Ambiguous match: multiple topics shared MeSH descriptor IDs with "${disease.name}".`,
        candidateTopics,
      };
    }
  }

  // 3. Check for Exact Synonym / Also-Called Match
  const synonymMatches: Array<{ topic: MedlinePlusTopic; basis: string }> = [];

  for (const topic of topics) {
    const topicNormTitle = normalizeStringForMatching(topic.title);
    const topicAltNorm = (topic.altTitles || []).map(normalizeStringForMatching).filter(Boolean);

    // Guard against broad umbrella topics matching synonyms
    if (isBroadUmbrellaTitle(topic.title) && diseaseHasSubtype) {
      continue;
    }

    // A: Disease name matches any topic also-called
    if (topicAltNorm.includes(diseaseNormName)) {
      synonymMatches.push({
        topic,
        basis: `Exact synonym match: disease name "${disease.name}" matched topic also-called term.`,
      });
      continue;
    }

    // B: Disease synonym matches topic title
    if (topicNormTitle && diseaseSynonymsNorm.includes(topicNormTitle)) {
      synonymMatches.push({
        topic,
        basis: `Exact synonym match: disease synonym matched MedlinePlus topic title "${topic.title}".`,
      });
      continue;
    }

    // C: Disease synonym matches topic also-called
    const commonSynonym = diseaseSynonymsNorm.find((s) => topicAltNorm.includes(s));
    if (commonSynonym) {
      synonymMatches.push({
        topic,
        basis: `Exact synonym match on alternate title term "${commonSynonym}".`,
      });
      continue;
    }
  }

  if (synonymMatches.length === 1) {
    return {
      matchedTopic: synonymMatches[0].topic,
      confidence: 'exact_synonym',
      matchBasis: synonymMatches[0].basis,
      candidateTopics,
    };
  }

  if (synonymMatches.length > 1) {
    return {
      matchedTopic: null,
      confidence: 'weak',
      matchBasis: `Ambiguous match: multiple candidate topics matched disease synonyms.`,
      candidateTopics,
    };
  }

  // 4. Guard against broad umbrella / subtype mismatches among remaining candidates
  const topCandidate = topics[0];
  if (topCandidate && isBroadUmbrellaTitle(topCandidate.title)) {
    return {
      matchedTopic: null,
      confidence: 'weak',
      matchBasis: `Top search candidate "${topCandidate.title}" is a broad health topic umbrella and was conservatively rejected for disease "${disease.name}".`,
      candidateTopics,
    };
  }

  // 5. No confident match
  return {
    matchedTopic: null,
    confidence: 'none',
    matchBasis: `No confident title, synonym, or MeSH match found for disease "${disease.name}".`,
    candidateTopics,
  };
}
