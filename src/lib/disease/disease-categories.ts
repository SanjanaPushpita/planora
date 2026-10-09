import { BodySystemCategory, DiseaseTypeCategory } from '../types';

export const BODY_SYSTEMS: BodySystemCategory[] = [
  'Brain & Neurology',
  'Cardiovascular / Heart',
  'Kidney & Urinary',
  'Respiratory / Lungs',
  'Digestive / Gastrointestinal',
  'Liver & Biliary',
  'Endocrine & Hormonal',
  'Blood / Hematology',
  'Musculoskeletal',
  'Skin / Dermatology',
  'Eye / Ophthalmology',
  'Ear / Hearing',
  'Reproductive',
  'Immune System',
  'Oral / Dental',
  'Multisystem',
];

export const DISEASE_TYPES: DiseaseTypeCategory[] = [
  'Infectious Diseases',
  'Genetic & Rare Diseases',
  'Autoimmune Diseases',
  'Cancer / Neoplastic Diseases',
  'Metabolic Diseases',
  'Degenerative Diseases',
  'Congenital Diseases',
  'Parasitic Diseases',
  'Nutritional Diseases',
  'Neurological Disorders',
  'Mental / Behavioral Disorders',
  'Other',
];

// Normalized case-insensitive lookup table for MedlinePlus Health Topic groups
const MEDLINE_GROUP_TO_BODY_SYSTEMS: Record<string, BodySystemCategory[]> = {
  'brain and nerves': ['Brain & Neurology'],
  'heart and circulation': ['Cardiovascular / Heart'],
  'kidneys and urinary system': ['Kidney & Urinary'],
  'lungs and breathing': ['Respiratory / Lungs'],
  'digestive system': ['Digestive / Gastrointestinal'],
  'liver diseases': ['Liver & Biliary'],
  'endocrine system': ['Endocrine & Hormonal'],
  'hormones': ['Endocrine & Hormonal'],
  'blood, heart and circulation': ['Cardiovascular / Heart', 'Blood / Hematology'],
  'blood and blood disorders': ['Blood / Hematology'],
  'bones, joints and muscles': ['Musculoskeletal'],
  'skin, hair and nails': ['Skin / Dermatology'],
  'eyes and vision': ['Eye / Ophthalmology'],
  'ear, nose and throat': ['Ear / Hearing'],
  'female reproductive system': ['Reproductive'],
  'male reproductive system': ['Reproductive'],
  'reproduction and sexual health': ['Reproductive'],
  'immune system': ['Immune System'],
  'mouth and teeth': ['Oral / Dental'],
};

const MEDLINE_GROUP_TO_DISEASE_TYPES: Record<string, DiseaseTypeCategory[]> = {
  'infectious diseases': ['Infectious Diseases'],
  'infections': ['Infectious Diseases'],
  'bacterial infections': ['Infectious Diseases'],
  'viral infections': ['Infectious Diseases'],
  'cancers': ['Cancer / Neoplastic Diseases'],
  'cancer': ['Cancer / Neoplastic Diseases'],
  'tumors': ['Cancer / Neoplastic Diseases'],
  'genetic disorders': ['Genetic & Rare Diseases'],
  'autoimmune diseases': ['Autoimmune Diseases'],
  'metabolic disorders': ['Metabolic Diseases'],
  'mental health and behavior': ['Mental / Behavioral Disorders'],
};

// Keyword rules for Body Systems (conservative regex boundaries)
const BODY_SYSTEM_KEYWORDS: Array<{ system: BodySystemCategory; regex: RegExp }> = [
  {
    system: 'Brain & Neurology',
    regex: /\b(brain|neural|neuron|neurolog|cerebr|cerebell|cortex|spine|spinal cord|cranial|encephal|mening|seizure|epilep|alzheimer|parkinson|multiple sclerosis|neuropathy|ataxia|aphasia|dementia|stroke|headache|migraine|central nervous system|peripheral nervous system)\b/i,
  },
  {
    system: 'Cardiovascular / Heart',
    regex: /\b(heart|cardiac|cardio|vascular|arter|vein|myocard|endocard|pericard|arrhythm|coronary|hypertens|aort|valvular|atheroscler|thrombos|ischemi)\b/i,
  },
  {
    system: 'Kidney & Urinary',
    regex: /\b(kidney|renal|nephr|glomerul|urinary|bladder|ureter|urethr|pyelonephr|dialysis|proteinuria|hematuria|uremia)\b/i,
  },
  {
    system: 'Respiratory / Lungs',
    regex: /\b(lung|pulmon|respirat|bronch|alveol|trachea|asthma|pneumon|pleur|copd|emphysema|asbestosis|cystic fibrosis)\b/i,
  },
  {
    system: 'Digestive / Gastrointestinal',
    regex: /\b(gastro|digest|stomach|intestine|colon|bowel|esophag|duoden|gastric|crohn|colitis|celiac|peptic|appendic)\b/i,
  },
  {
    system: 'Liver & Biliary',
    regex: /\b(liver|hepat|biliary|gallbladder|bile|cirrhosis|cholang|jaundice)\b/i,
  },
  {
    system: 'Endocrine & Hormonal',
    regex: /\b(endocrine|hormon|thyroid|adrenal|pituitary|pancrea|islet|diabet|cushing|addison|graves|hashimoto)\b/i,
  },
  {
    system: 'Blood / Hematology',
    regex: /\b(blood|hemat|anemia|leukem|lymphom|platelet|coagulat|hemophil|sickle cell|thalassem|myeloma|erythrocyt|neutropen)\b/i,
  },
  {
    system: 'Musculoskeletal',
    regex: /\b(bone|joint|muscle|skelet|myopath|arthr|osteopor|tendon|cartilage|ligament|fibromyalg|muscular dystrophy|scoliosis)\b/i,
  },
  {
    system: 'Skin / Dermatology',
    regex: /\b(skin|dermat|epiderm|cutaneous|psoriasis|eczema|melanoma|dermatitis|rash|alopecia|vitiligo|acne)\b/i,
  },
  {
    system: 'Eye / Ophthalmology',
    regex: /\b(eye|ocular|ophthal|retin|cornea|glaucoma|cataract|macul|vision|blindness|conjunctiv)\b/i,
  },
  {
    system: 'Ear / Hearing',
    regex: /\b(ear|audit|hearing|otitis|cochlea|tympan|tinnitus|vertigo|meniere)\b/i,
  },
  {
    system: 'Reproductive',
    regex: /\b(reproduct|ovary|ovarian|uter|cervix|endometr|testis|testicular|prostate|placenta|pregnancy|fallopian)\b/i,
  },
  {
    system: 'Immune System',
    regex: /\b(immune|immunolog|lymph|spleen|thymus|antibody|allergy|anaphylax|histamin|complement|immunodef)\b/i,
  },
  {
    system: 'Oral / Dental',
    regex: /\b(oral|mouth|dental|tooth|teeth|gingiv|periodont|stomatitis|tongue|salivary)\b/i,
  },
  {
    system: 'Multisystem',
    regex: /\b(systemic|multisystem|generalized disease|multiorgan|pan-systemic|disseminated disease)\b/i,
  },
];

// Keyword rules for Disease Types
const DISEASE_TYPE_KEYWORDS: Array<{ type: DiseaseTypeCategory; regex: RegExp }> = [
  {
    type: 'Infectious Diseases',
    regex: /\b(infect|bacteri|viral|virus|fungal|fungus|pathogen|mycobacter|tuberculosis|influenza|covid|hepatitis [a-e]|sepsis|malaria|streptoc|staphyloc)\b/i,
  },
  {
    type: 'Cancer / Neoplastic Diseases',
    regex: /\b(cancer|carcinoma|sarcoma|neoplasm|tumor|tumour|malignan|leukemia|lymphoma|melanoma|glioma|blastom|metastat)\b/i,
  },
  {
    type: 'Autoimmune Diseases',
    regex: /\b(autoimmun|autoantibody|immune-mediated|lupus|rheumatoid|hashimoto|graves|sjogren|myasthenia|multiple sclerosis|celiac|type 1 diabetes|vasculitis)\b/i,
  },
  {
    type: 'Genetic & Rare Diseases',
    regex: /\b(genetic|hereditary|inherited|chromosom|mutation|recessive|dominant|x-linked|huntington|cystic fibrosis|sickle cell|marfan|turner|down syndrome|fragile x)\b/i,
  },
  {
    type: 'Metabolic Diseases',
    regex: /\b(metabolic|metabolism|diabetes|glycogen|lipid|storage disease|phenylketonuria|wilson disease|hemochromatosis|hypercholesterol|acidosis)\b/i,
  },
  {
    type: 'Degenerative Diseases',
    regex: /\b(degenerat|atrophy|alzheimer|parkinson|amyotrophic|als|osteoarthr|macular degenerat|huntington)\b/i,
  },
  {
    type: 'Congenital Diseases',
    regex: /\b(congenital|present at birth|birth defect|malformation|agenesis|dysplasia|cleft|tetralogy|spina bifida)\b/i,
  },
  {
    type: 'Parasitic Diseases',
    regex: /\b(parasit|protozoa|helminth|worm|leishmania|malaria|toxoplasm|schistosom|giardia|amoeba)\b/i,
  },
  {
    type: 'Nutritional Diseases',
    regex: /\b(nutrition|deficiency|scurvy|rickets|beriberi|pellagra|kwashiorkor|malnutrition|anorexia|vitamin)\b/i,
  },
  {
    type: 'Neurological Disorders',
    regex: /\b(neurolog|seizure|epilep|neuropathy|migraine|ataxia|paralysis|chorea|dystonia|meningitis|encephalitis)\b/i,
  },
  {
    type: 'Mental / Behavioral Disorders',
    regex: /\b(psychiatr|mental|depress|anxiety|bipolar|schizophr|autism|adhd|phobia|ptsd|obsessive|compulsive|dementia)\b/i,
  },
];

/**
 * Normalizes an array of raw body system strings to valid BodySystemCategory items.
 */
export function normalizeBodySystems(systems: string[]): BodySystemCategory[] {
  if (!Array.isArray(systems)) return [];
  const validSet = new Set<string>(BODY_SYSTEMS);
  const result = new Set<BodySystemCategory>();

  for (const s of systems) {
    if (typeof s !== 'string') continue;
    const trimmed = s.trim();
    if (validSet.has(trimmed)) {
      result.add(trimmed as BodySystemCategory);
    }
  }

  return Array.from(result);
}

/**
 * Normalizes an array of raw disease type strings to valid DiseaseTypeCategory items.
 */
export function normalizeDiseaseTypes(types: string[]): DiseaseTypeCategory[] {
  if (!Array.isArray(types)) return ['Other'];
  const validSet = new Set<string>(DISEASE_TYPES);
  const result = new Set<DiseaseTypeCategory>();

  for (const t of types) {
    if (typeof t !== 'string') continue;
    const trimmed = t.trim();
    if (validSet.has(trimmed)) {
      result.add(trimmed as DiseaseTypeCategory);
    }
  }

  return result.size > 0 ? Array.from(result) : ['Other'];
}

/**
 * Maps a MedlinePlus group name (case-insensitive) to recognized BodySystemCategory array.
 */
export function mapMedlinePlusGroupToBodySystems(group: string): BodySystemCategory[] {
  if (!group || typeof group !== 'string') return [];
  const clean = group.trim().toLowerCase();
  return MEDLINE_GROUP_TO_BODY_SYSTEMS[clean] || [];
}

/**
 * Maps a MedlinePlus group name (case-insensitive) to recognized DiseaseTypeCategory array.
 */
export function mapMedlinePlusGroupToDiseaseTypes(group: string): DiseaseTypeCategory[] {
  if (!group || typeof group !== 'string') return [];
  const clean = group.trim().toLowerCase();
  return MEDLINE_GROUP_TO_DISEASE_TYPES[clean] || [];
}

/**
 * Infers body system categories from freeform clinical/metadata text.
 */
export function inferBodySystemsFromText(text: string): BodySystemCategory[] {
  if (!text || typeof text !== 'string') return [];
  const matched = new Set<BodySystemCategory>();

  for (const { system, regex } of BODY_SYSTEM_KEYWORDS) {
    if (regex.test(text)) {
      matched.add(system);
    }
  }

  // If 3 or more distinct major systems are involved, conservatively add Multisystem
  if (matched.size >= 3) {
    matched.add('Multisystem');
  }

  return Array.from(matched);
}

/**
 * Infers disease types from freeform clinical/metadata text.
 */
export function inferDiseaseTypesFromText(text: string): DiseaseTypeCategory[] {
  if (!text || typeof text !== 'string') return ['Other'];
  const matched = new Set<DiseaseTypeCategory>();

  for (const { type, regex } of DISEASE_TYPE_KEYWORDS) {
    if (regex.test(text)) {
      matched.add(type);
    }
  }

  return matched.size > 0 ? Array.from(matched) : ['Other'];
}

export interface ClassificationInput {
  name: string;
  definition?: string;
  synonyms?: string[];
  doid?: string;
  parents?: string[];
  medlineGroups?: string[];
  meshHeadings?: string[];
}

/**
 * Classifies a disease's metadata into user-friendly Planora categories.
 * Returns deduplicated bodySystems and diseaseTypes.
 * If no body system is matched with confidence, bodySystems remains empty ([]).
 * If no disease type is matched with confidence, diseaseTypes defaults to ['Other'].
 */
export function classifyDiseaseMetadata(input: ClassificationInput): {
  bodySystems: BodySystemCategory[];
  diseaseTypes: DiseaseTypeCategory[];
} {
  if (!input || typeof input !== 'object') {
    return { bodySystems: [], diseaseTypes: ['Other'] };
  }

  const bodySystemsSet = new Set<BodySystemCategory>();
  const diseaseTypesSet = new Set<DiseaseTypeCategory>();

  // 1. Map directly from MedlinePlus groups if available
  if (Array.isArray(input.medlineGroups)) {
    for (const g of input.medlineGroups) {
      for (const bs of mapMedlinePlusGroupToBodySystems(g)) {
        bodySystemsSet.add(bs);
      }
      for (const dt of mapMedlinePlusGroupToDiseaseTypes(g)) {
        diseaseTypesSet.add(dt);
      }
    }
  }

  // 2. Combine textual signals for keyword inference
  const textParts = [
    input.name || '',
    input.definition || '',
    ...(Array.isArray(input.synonyms) ? input.synonyms : []),
    ...(Array.isArray(input.parents) ? input.parents : []),
    ...(Array.isArray(input.meshHeadings) ? input.meshHeadings : []),
  ].filter(Boolean);

  const combinedText = textParts.join(' ').trim();

  if (combinedText.length > 0) {
    for (const bs of inferBodySystemsFromText(combinedText)) {
      bodySystemsSet.add(bs);
    }
    for (const dt of inferDiseaseTypesFromText(combinedText)) {
      if (dt !== 'Other') {
        diseaseTypesSet.add(dt);
      }
    }
  }

  // 3. Low-confidence / unknown fallbacks:
  // - Body systems: do NOT invent one, leave empty if none matched
  // - Disease types: fall back to ['Other'] if none matched
  const finalTypes = diseaseTypesSet.size > 0 ? Array.from(diseaseTypesSet) : (['Other'] as DiseaseTypeCategory[]);

  return {
    bodySystems: Array.from(bodySystemsSet),
    diseaseTypes: finalTypes,
  };
}

// Convenient alias matching previous callers
export const classifyDisease = classifyDiseaseMetadata;
