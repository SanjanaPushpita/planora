/**
 * Durable, user-scoped question history storage for repeat-prevention.
 * Preserves past sprint sessions without destructive mutations.
 * Bounded per user/topic, idempotent writes, and reload persistence.
 */

import { QuestionHistoryEntry, NormalizedQuestion } from './types';
import { normalizeQuestionText } from './question-dedup';

const MAX_HISTORY_PER_TOPIC = 100;

/**
 * Normalizes topic names to bridge aliases (e.g. "Python" vs "Python Programming", "TypeScript Mastery" vs "TypeScript")
 * while preserving original storage records intact.
 */
export function canonicalizeTopicKey(topic: string): string {
  if (!topic || typeof topic !== 'string') return '';
  return topic
    .toLowerCase()
    .replace(/^(how\s+(does|do|the|a)\s+|what\s+(is|are)\s+|why\s+(does|do|is|are)\s+)/i, '')
    .replace(/\s+(work|works|operate|operates|in modern systems|mastery|fundamentals|programming|basics)\b/gi, '')
    .replace(/[\?\(\)\,\.\:\-\_\/\&]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getStorageKey(userId?: string): string {
  const safeId = userId && userId.trim() ? userId.trim() : 'guest_user';
  return `planora_question_history_${safeId}`;
}

/**
 * Loads user question history from local persistence.
 * Bridges pre-hydration guest entries and aliases safely.
 */
export function loadUserQuestionHistory(userId?: string, topic?: string): QuestionHistoryEntry[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    let parsed: QuestionHistoryEntry[] = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) parsed = [];

    // If authenticated, also merge any pre-hydration guest entries
    if (userId && userId.trim() && userId.trim() !== 'guest_user') {
      try {
        const guestRaw = localStorage.getItem(getStorageKey('guest_user'));
        if (guestRaw) {
          const guestParsed: QuestionHistoryEntry[] = JSON.parse(guestRaw);
          if (Array.isArray(guestParsed)) {
            const existingFps = new Set(parsed.map(p => p.fingerprint));
            for (const g of guestParsed) {
              if (g && g.fingerprint && !existingFps.has(g.fingerprint)) {
                parsed.push(g);
                existingFps.add(g.fingerprint);
              }
            }
          }
        }
      } catch {
        // Non-blocking guest merge
      }
    }

    if (topic && topic.trim()) {
      const normalizedTopic = topic.trim().toLowerCase();
      const canonTopic = canonicalizeTopicKey(topic);
      return parsed.filter(item => {
        if (!item.topic) return false;
        const itemNorm = item.topic.trim().toLowerCase();
        if (itemNorm === normalizedTopic) return true;
        if (canonTopic && canonicalizeTopicKey(item.topic) === canonTopic) return true;
        return false;
      });
    }

    return parsed;
  } catch {
    return [];
  }
}

/**
 * Idempotently records questions that have been officially served to the user.
 * Unseen candidates from failed or cancelled requests are NOT recorded.
 */
export function recordServedQuestions(
  userId: string | undefined,
  questions: NormalizedQuestion[]
): QuestionHistoryEntry[] {
  if (typeof window === 'undefined' || !questions || questions.length === 0) {
    return [];
  }

  try {
    const storageKey = getStorageKey(userId);
    const existing = loadUserQuestionHistory(userId);
    const existingFingerprints = new Set(existing.map(e => e.fingerprint));

    const now = new Date().toISOString();
    const newEntries: QuestionHistoryEntry[] = [];

    for (const q of questions) {
      if (!existingFingerprints.has(q.fingerprint)) {
        const entry: QuestionHistoryEntry = {
          id: q.id,
          fingerprint: q.fingerprint,
          topic: q.topic,
          subtopic: q.subtopic,
          concept: q.concept,
          format: q.format,
          objective: q.objective,
          timestamp: now,
          servedAt: now,
          normalizedPromptSnippet: normalizeQuestionText(q.prompt).slice(0, 160)
        };
        newEntries.push(entry);
        existingFingerprints.add(q.fingerprint);
      }
    }

    if (newEntries.length === 0) {
      return existing;
    }

    // Combine and apply bounded FIFO per topic
    const updated = [...existing, ...newEntries];
    
    // Group by topic to enforce bounds
    const byTopic = new Map<string, QuestionHistoryEntry[]>();
    for (const item of updated) {
      const t = (item.topic || 'general').toLowerCase();
      const list = byTopic.get(t) || [];
      list.push(item);
      byTopic.set(t, list);
    }

    const pruned: QuestionHistoryEntry[] = [];
    for (const [, list] of byTopic.entries()) {
      // Keep only most recent MAX_HISTORY_PER_TOPIC
      const slice = list.slice(-MAX_HISTORY_PER_TOPIC);
      pruned.push(...slice);
    }

    localStorage.setItem(storageKey, JSON.stringify(pruned));
    return pruned;
  } catch {
    return [];
  }
}

/**
 * Helper to clear test history in isolated environments
 */
export function clearTestQuestionHistory(userId?: string): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(getStorageKey(userId));
  }
}
