import { XMLParser, XMLValidator } from 'fast-xml-parser';
import {
  MedlinePlusTopic,
  MedlinePlusGroup,
  MedlinePlusMeshDescriptor,
} from './types';

export interface MedlinePlusParseSuccess {
  ok: true;
  totalCount: number;
  count: number;
  spellingCorrection?: string;
  topics: MedlinePlusTopic[];
}

export interface MedlinePlusParseFailure {
  ok: false;
  error: 'PARSING_ERROR' | 'INVALID_QUERY';
  message: string;
  source: 'MedlinePlus';
}

export type MedlinePlusParseResult = MedlinePlusParseSuccess | MedlinePlusParseFailure;

/**
 * Safely decodes standard XML and HTML entities.
 */
export function decodeHtmlEntities(str: string): string {
  if (!str || typeof str !== 'string') return '';

  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&hellip;/g, '…')
    .replace(/&rsquo;/g, '’')
    .replace(/&lsquo;/g, '‘')
    .replace(/&rdquo;/g, '”')
    .replace(/&ldquo;/g, '“')
    .replace(/&#(\d+);/g, (_, code) => {
      const n = parseInt(code, 10);
      return n > 0 && n < 65536 ? String.fromCharCode(n) : '';
    })
    .replace(/&#x([0-9a-fA-F]+);/gi, (_, hex) => {
      const n = parseInt(hex, 16);
      return n > 0 && n < 65536 ? String.fromCharCode(n) : '';
    });
}

/**
 * Converts summary markup into readable plain text:
 * - Preserves paragraph boundaries (\n\n)
 * - Preserves list item boundaries (\n• item)
 * - Preserves line breaks (\n)
 * - Safely decodes HTML entities
 * - Strips all tags so untrusted HTML is never exposed for direct rendering
 */
export function htmlToPlainText(html: string): string {
  if (!html || typeof html !== 'string') return '';

  let text = html;

  // Preserve list items
  text = text.replace(/<li[^>]*>/gi, '\n• ');
  text = text.replace(/<\/li>/gi, '\n');

  // Preserve paragraph endings and breaks
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<br\s*\/?>/gi, '\n');

  // Preserve headings
  text = text.replace(/<\/h[1-6]>/gi, '\n\n');

  // Preserve table cells
  text = text.replace(/<\/tr>/gi, '\n');
  text = text.replace(/<\/td>|<\/th>/gi, ' ');

  // Strip all remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // Decode entities
  text = decodeHtmlEntities(text);

  // Normalize whitespace: preserve paragraph/bullet structure, trim lines
  const lines = text.split('\n').map((line) => line.replace(/[ \t]+/g, ' ').trim());
  return lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Validates topic URLs to ensure they are well-formed HTTP/HTTPS URLs.
 * Rejects javascript:, data:, and malformed schemes.
 */
export function isValidTopicUrl(rawUrl: unknown): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  const trimmed = rawUrl.trim();
  if (!trimmed) return false;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    if (!parsed.hostname || parsed.hostname.includes(' ')) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Utility to normalize a single item or array into an array.
 */
function ensureArray<T>(val: unknown): T[] {
  if (val === undefined || val === null) return [];
  if (Array.isArray(val)) return val as T[];
  return [val as T];
}

/**
 * Recursively extracts and normalizes textual content from parsed XML node tree.
 */
function extractTextFromNode(node: unknown): string {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number' || typeof node === 'boolean') {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(extractTextFromNode).join(' ');
  }
  if (typeof node === 'object') {
    const obj = node as Record<string, unknown>;
    const parts: string[] = [];

    // Prioritize direct #text if present
    if (typeof obj['#text'] === 'string') {
      return obj['#text'];
    }

    for (const [key, val] of Object.entries(obj)) {
      if (key.startsWith('@_')) continue;
      const lower = key.toLowerCase();
      if (lower === 'p') {
        const pText = Array.isArray(val)
          ? val.map(extractTextFromNode).join('\n\n')
          : extractTextFromNode(val);
        parts.push(pText + '\n\n');
      } else if (lower === 'li') {
        const liText = Array.isArray(val)
          ? val.map(extractTextFromNode).join('\n• ')
          : extractTextFromNode(val);
        parts.push('• ' + liText + '\n');
      } else {
        parts.push(extractTextFromNode(val));
      }
    }
    return parts.join(' ');
  }
  return '';
}

/**
 * Normalizes a health-topic record or search document into Planora's MedlinePlusTopic.
 */
export function normalizeMedlinePlusTopic(
  rawTopic: unknown,
  documentRank?: number,
  documentUrl?: string
): MedlinePlusTopic | null {
  if (!rawTopic || typeof rawTopic !== 'object') return null;
  const topic = rawTopic as Record<string, unknown>;

  // 1. Topic ID - keep separate from Disease Ontology DOIDs
  const rawId = topic['@_id'] || topic['id'];
  const id = typeof rawId === 'string' && rawId.trim() ? rawId.trim() : typeof rawId === 'number' ? String(rawId) : undefined;

  // 2. Title
  let title = '';
  if (typeof topic['@_title'] === 'string') {
    title = topic['@_title'].trim();
  } else if (typeof topic['title'] === 'string') {
    title = topic['title'].trim();
  } else if (topic['title'] && typeof topic['title'] === 'object') {
    title = extractTextFromNode(topic['title']).trim();
  } else if (typeof topic['#text'] === 'string' && topic['#text'].trim()) {
    title = topic['#text'].trim();
  }
  title = decodeHtmlEntities(title);
  if (!title) return null;

  // 3. Topic URL
  let url = '';
  const rawUrl = topic['@_url'] || topic['url'] || documentUrl;
  if (typeof rawUrl === 'string') {
    url = rawUrl.trim();
  }
  if (!url || !isValidTopicUrl(url)) {
    return null; // Reject topic if URL is missing or unsafe
  }

  // 4. Language
  const rawLang = topic['@_language'] || topic['language'];
  const language = typeof rawLang === 'string' && rawLang.trim() ? rawLang.trim() : undefined;

  // 5. Date Created & Meta Description
  const rawDate = topic['@_date-created'] || topic['date-created'];
  const dateCreated = typeof rawDate === 'string' && rawDate.trim() ? rawDate.trim() : undefined;
  const rawMeta = topic['@_meta-desc'] || topic['meta-desc'];
  const metaDesc = typeof rawMeta === 'string' && rawMeta.trim() ? decodeHtmlEntities(rawMeta.trim()) : undefined;

  // 6. Also-called (synonyms) - deduplicated, trimmed
  const altTitlesSet = new Set<string>();
  const alsoCalledList = ensureArray<unknown>(topic['also-called'] || topic['alsoCalled'] || topic['altTitle']);
  for (const item of alsoCalledList) {
    const text = typeof item === 'string' ? item : extractTextFromNode(item);
    const cleaned = decodeHtmlEntities(text).trim();
    if (cleaned) altTitlesSet.add(cleaned);
  }

  // 7. See references - kept distinguishable from synonyms
  const seeReferencesSet = new Set<string>();
  const seeRefList = ensureArray<unknown>(topic['see-reference'] || topic['seeReference']);
  for (const item of seeRefList) {
    const text = typeof item === 'string' ? item : extractTextFromNode(item);
    const cleaned = decodeHtmlEntities(text).trim();
    if (cleaned) seeReferencesSet.add(cleaned);
  }

  // 8. Full summary - convert markup into readable plain text safely
  const rawSummary = topic['full-summary'] || topic['FullSummary'] || topic['fullSummary'] || topic['summary'];
  let fullSummary = '';
  if (typeof rawSummary === 'string') {
    fullSummary = htmlToPlainText(rawSummary);
  } else if (rawSummary && typeof rawSummary === 'object') {
    const rawText = extractTextFromNode(rawSummary);
    fullSummary = htmlToPlainText(rawText);
  }

  // 9. Groups
  const groupNamesSet = new Set<string>();
  const groupsList: MedlinePlusGroup[] = [];
  const rawGroups = ensureArray<unknown>(topic['group'] || topic['groupName']);
  for (const g of rawGroups) {
    if (typeof g === 'string') {
      const name = decodeHtmlEntities(g).trim();
      if (name) {
        groupNamesSet.add(name);
        groupsList.push({ name });
      }
    } else if (g && typeof g === 'object') {
      const gObj = g as Record<string, unknown>;
      const gNameRaw = gObj['#text'] || extractTextFromNode(gObj);
      const name = typeof gNameRaw === 'string' ? decodeHtmlEntities(gNameRaw).trim() : '';
      const gId = typeof gObj['@_id'] === 'string' ? gObj['@_id'].trim() : undefined;
      const gUrl = typeof gObj['@_url'] === 'string' && isValidTopicUrl(gObj['@_url']) ? gObj['@_url'].trim() : undefined;
      if (name) {
        groupNamesSet.add(name);
        groupsList.push({ id: gId, url: gUrl, name });
      }
    }
  }

  // 10. MeSH Headings & Descriptors
  const meshHeadingsSet = new Set<string>();
  const meshDescriptorsList: MedlinePlusMeshDescriptor[] = [];
  const rawMeshHeadings = ensureArray<unknown>(topic['mesh-heading'] || topic['meshHeading'] || topic['mesh']);
  for (const m of rawMeshHeadings) {
    if (typeof m === 'string') {
      const heading = decodeHtmlEntities(m).trim();
      if (heading) {
        meshHeadingsSet.add(heading);
        meshDescriptorsList.push({ descriptor: heading });
      }
    } else if (m && typeof m === 'object') {
      const mObj = m as Record<string, unknown>;
      const descriptors = ensureArray<unknown>(mObj['descriptor'] || mObj['descriptorName'] || mObj);
      for (const d of descriptors) {
        if (typeof d === 'string') {
          const heading = decodeHtmlEntities(d).trim();
          if (heading) {
            meshHeadingsSet.add(heading);
            meshDescriptorsList.push({ descriptor: heading });
          }
        } else if (d && typeof d === 'object') {
          const dObj = d as Record<string, unknown>;
          const dId = typeof dObj['@_id'] === 'string' ? dObj['@_id'].trim() : undefined;
          const dText = typeof dObj['#text'] === 'string' ? dObj['#text'] : extractTextFromNode(dObj);
          const heading = typeof dText === 'string' ? decodeHtmlEntities(dText).trim() : '';
          if (heading || dId) {
            if (heading) meshHeadingsSet.add(heading);
            meshDescriptorsList.push({ id: dId, descriptor: heading });
          }
        }
      }
    }
  }

  // 11. Snippet (optional search snippet)
  const rawSnippet = topic['snippet'];
  const snippet = typeof rawSnippet === 'string' ? htmlToPlainText(rawSnippet) : undefined;

  return {
    id,
    title,
    altTitles: Array.from(altTitlesSet),
    seeReferences: Array.from(seeReferencesSet),
    fullSummary,
    snippet,
    url,
    language,
    groupNames: Array.from(groupNamesSet),
    groups: groupsList.length > 0 ? groupsList : undefined,
    meshHeadings: Array.from(meshHeadingsSet),
    meshDescriptors: meshDescriptorsList.length > 0 ? meshDescriptorsList : undefined,
    rank: typeof documentRank === 'number' ? documentRank : undefined,
    dateCreated,
    metaDesc,
  };
}

/**
 * Parses raw XML response from MedlinePlus keyword search web service.
 * Supports rettype=topic, rettype=brief, rettype=all, and standalone health-topic records.
 * Disables external entity resolution and external DTD fetching for safety.
 */
export function parseMedlinePlusXml(xmlString: string): MedlinePlusParseResult {
  if (!xmlString || typeof xmlString !== 'string' || !xmlString.trim()) {
    return {
      ok: false,
      error: 'PARSING_ERROR',
      message: 'MedlinePlus XML response is empty or invalid.',
      source: 'MedlinePlus',
    };
  }

  // Quick XML validation
  const validation = XMLValidator.validate(xmlString);
  if (validation !== true) {
    return {
      ok: false,
      error: 'PARSING_ERROR',
      message: `Malformed MedlinePlus XML: ${typeof validation === 'object' ? validation.err.msg : 'Syntax error'}`,
      source: 'MedlinePlus',
    };
  }

  // Strict parser configuration: disable external entity resolution
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    processEntities: false,
    htmlEntities: false,
    allowBooleanAttributes: true,
    trimValues: true,
    parseTagValue: false,
    parseAttributeValue: false,
  });

  let parsed: Record<string, unknown>;
  try {
    parsed = parser.parse(xmlString);
  } catch (err: unknown) {
    return {
      ok: false,
      error: 'PARSING_ERROR',
      message: `Failed to parse MedlinePlus XML: ${(err as Error)?.message || 'Unknown XML parse error'}`,
      source: 'MedlinePlus',
    };
  }

  if (!parsed || typeof parsed !== 'object') {
    return {
      ok: false,
      error: 'PARSING_ERROR',
      message: 'MedlinePlus XML parser produced no root object.',
      source: 'MedlinePlus',
    };
  }

  // Handle standard <nlmSearchResult>
  const rootResult = parsed['nlmSearchResult'] as Record<string, unknown> | undefined;
  if (rootResult && typeof rootResult === 'object') {
    // Check for XML-level service error
    if (rootResult['error']) {
      const errorMsg = typeof rootResult['error'] === 'string'
        ? rootResult['error']
        : extractTextFromNode(rootResult['error']);
      return {
        ok: false,
        error: 'PARSING_ERROR',
        message: `MedlinePlus Web Service error: ${errorMsg || 'Unknown service error in XML.'}`,
        source: 'MedlinePlus',
      };
    }

    const countVal = rootResult['count'];
    const totalCount = typeof countVal === 'number'
      ? countVal
      : typeof countVal === 'string'
      ? parseInt(countVal, 10) || 0
      : 0;

    const rawCorrection = rootResult['spellingCorrection'];
    const spellingCorrection = typeof rawCorrection === 'string'
      ? rawCorrection.trim()
      : typeof rawCorrection === 'object'
      ? extractTextFromNode(rawCorrection).trim()
      : undefined;

    // Check list element
    const listNode = rootResult['list'] as Record<string, unknown> | undefined;
    if (!listNode || typeof listNode !== 'object') {
      return {
        ok: true,
        totalCount,
        count: 0,
        spellingCorrection,
        topics: [],
      };
    }

    const documents = ensureArray<Record<string, unknown>>(listNode['document']);
    const topics: MedlinePlusTopic[] = [];

    for (const doc of documents) {
      if (!doc || typeof doc !== 'object') continue;
      const docUrl = typeof doc['@_url'] === 'string' ? doc['@_url'] : undefined;
      const rankNum = typeof doc['@_rank'] === 'string' ? parseInt(doc['@_rank'], 10) : typeof doc['@_rank'] === 'number' ? doc['@_rank'] : undefined;

      // Documents can have contents
      const contents = ensureArray<Record<string, unknown>>(doc['content']);
      let foundHealthTopic: MedlinePlusTopic | null = null;

      // 1. Look for content with name="healthTopic" (rettype=topic)
      for (const c of contents) {
        if (!c || typeof c !== 'object') continue;
        const cName = c['@_name'];
        if (cName === 'healthTopic' && c['health-topic']) {
          foundHealthTopic = normalizeMedlinePlusTopic(c['health-topic'], rankNum, docUrl);
          if (foundHealthTopic) break;
        }
      }

      // 2. Direct health-topic child under document
      if (!foundHealthTopic && doc['health-topic']) {
        foundHealthTopic = normalizeMedlinePlusTopic(doc['health-topic'], rankNum, docUrl);
      }

      // 3. Fallback: document contents for rettype=brief / rettype=all
      if (!foundHealthTopic && contents.length > 0) {
        const docRecord: Record<string, unknown> = {
          url: docUrl,
          '@_url': docUrl,
          '@_rank': doc['@_rank'],
        };
        const altTitles: string[] = [];
        const groups: string[] = [];
        const meshList: string[] = [];

        for (const c of contents) {
          if (!c || typeof c !== 'object') continue;
          const name = String(c['@_name'] || '');
          const text = typeof c['#text'] === 'string' ? c['#text'] : extractTextFromNode(c);
          if (name.toLowerCase() === 'title') {
            docRecord['title'] = text;
          } else if (name.toLowerCase() === 'alttitle') {
            altTitles.push(text);
          } else if (name.toLowerCase() === 'fullsummary') {
            docRecord['full-summary'] = text;
          } else if (name.toLowerCase() === 'groupname') {
            groups.push(text);
          } else if (name.toLowerCase() === 'mesh') {
            meshList.push(text);
          } else if (name.toLowerCase() === 'snippet') {
            docRecord['snippet'] = text;
          }
        }
        if (altTitles.length > 0) docRecord['also-called'] = altTitles;
        if (groups.length > 0) docRecord['group'] = groups;
        if (meshList.length > 0) docRecord['mesh-heading'] = meshList;

        foundHealthTopic = normalizeMedlinePlusTopic(docRecord, rankNum, docUrl);
      }

      if (foundHealthTopic) {
        topics.push(foundHealthTopic);
      }
    }

    return {
      ok: true,
      totalCount: Math.max(totalCount, topics.length),
      count: topics.length,
      spellingCorrection,
      topics,
    };
  }

  // Handle standalone <health-topics> or <health-topic>
  const healthTopicsRoot = parsed['health-topics'] as Record<string, unknown> | undefined;
  if (healthTopicsRoot && typeof healthTopicsRoot === 'object') {
    const rawList = ensureArray<Record<string, unknown>>(healthTopicsRoot['health-topic']);
    const topics: MedlinePlusTopic[] = [];
    for (const item of rawList) {
      const normalized = normalizeMedlinePlusTopic(item);
      if (normalized) topics.push(normalized);
    }
    return {
      ok: true,
      totalCount: topics.length,
      count: topics.length,
      topics,
    };
  }

  if (parsed['health-topic'] && typeof parsed['health-topic'] === 'object') {
    const normalized = normalizeMedlinePlusTopic(parsed['health-topic']);
    return {
      ok: true,
      totalCount: normalized ? 1 : 0,
      count: normalized ? 1 : 0,
      topics: normalized ? [normalized] : [],
    };
  }

  return {
    ok: false,
    error: 'PARSING_ERROR',
    message: 'Unrecognized MedlinePlus XML document structure: expected <nlmSearchResult> or <health-topic>.',
    source: 'MedlinePlus',
  };
}
