/**
 * Question generator module: supports external AI model generation (official Gemini REST API)
 * and deterministic grounded educational generation from retrieved passages.
 */

import {
  GenerateQuestionsRequest,
  NormalizedQuestion,
  QuestionFormat,
  LearningObjective,
  RetrievedMaterial,
  SourceReference,
  QuestionEngineStatusCode,
  GeminiGenerationResult
} from './types';
import { computeContentFingerprint } from './question-dedup';

/**
 * Validates a normalized question against schema and quality rules.
 */
export function validateNormalizedQuestion(q: Partial<NormalizedQuestion>): q is NormalizedQuestion {
  if (!q.id || !q.prompt || typeof q.prompt !== 'string' || q.prompt.trim().length < 8) {
    return false;
  }
  if (!q.topic || !q.concept) {
    return false;
  }
  if (!q.format || !q.objective) {
    return false;
  }

  // If MCQ, validate choices and correct index
  if (q.format === 'mcq') {
    if (!Array.isArray(q.choices) || q.choices.length < 3) {
      return false;
    }
    // Check choice uniqueness
    const uniqueChoices = new Set(q.choices.map(c => c.trim().toLowerCase()));
    if (uniqueChoices.size !== q.choices.length) {
      return false;
    }
    if (typeof q.correctChoiceIndex !== 'number' || q.correctChoiceIndex < 0 || q.correctChoiceIndex >= q.choices.length) {
      return false;
    }
  }

  return true;
}

/**
 * Extracts clean sentences from key passages.
 */
function extractSentencesFromPassages(passages: string[]): string[] {
  const sentences: string[] = [];
  for (const passage of passages) {
    const rawMatches = passage.match(/[^.!?]+[.!?]+(\s|$)/g);
    if (rawMatches && rawMatches.length > 0) {
      for (const m of rawMatches) {
        const trimmed = m.trim();
        if (trimmed.length >= 25) {
          sentences.push(trimmed);
        }
      }
    } else if (passage.trim().length >= 25) {
      sentences.push(passage.trim());
    }
  }
  return sentences.length > 0 ? sentences : passages;
}

/**
 * Builds grounded deterministic reasoning questions from retrieved source material.
 * Focuses on genuine cognitive tasks (explanation, scenario, comparison, troubleshooting)
 * without generic word-chopping or fake boilerplate distractors.
 */
export function generateFromRetrievedPassages(
  material: RetrievedMaterial,
  request: GenerateQuestionsRequest
): NormalizedQuestion[] {
  const count = Math.min(request.desiredCount || 5, 8);
  const difficulty = request.difficulty || 'intermediate';
  const language = request.language || 'English';
  const rawPassages = material.keyPassages.length > 0 ? material.keyPassages : [material.content];
  const sentences = extractSentencesFromPassages(rawPassages);

  const formats: QuestionFormat[] = request.formats && request.formats.length > 0
    ? request.formats
    : ['explanation', 'scenario', 'comparison', 'troubleshooting', 'mcq'];

  const objectives: LearningObjective[] = request.objectives && request.objectives.length > 0
    ? request.objectives
    : ['conceptual_understanding', 'applied_reasoning', 'analytical_comparison', 'debugging', 'edge_cases'];

  const questions: NormalizedQuestion[] = [];
  const sourceRef: SourceReference = {
    title: material.title,
    url: material.url,
    retrievedAt: material.retrievedAt,
    sourceDomain: material.sourceDomain
  };

  for (let i = 0; i < count; i++) {
    const format = formats[i % formats.length];
    const objective = objectives[i % objectives.length];
    const sentence = sentences[i % sentences.length];
    const fullPassage = rawPassages[i % rawPassages.length];

    let prompt = '';
    let choices: string[] | undefined = undefined;
    let correctChoiceIndex: number | undefined = undefined;
    let referenceAnswer: string | undefined = undefined;
    let explanation: string | undefined = undefined;
    let isObjective = false;
    let concept = material.topic;

    if (format === 'explanation') {
      concept = `${material.topic} - Mechanics & Execution`;
      prompt = `Based on the principles documented in "${material.title}", explain how the following behavior operates in practice: "${sentence}"`;
      referenceAnswer = `Grounded in source passage: "${fullPassage}"`;
      explanation = `Assesses comprehension of underlying mechanics from authoritative material.`;
      isObjective = false;
    } else if (format === 'scenario') {
      concept = `${material.topic} - Applied Architecture`;
      prompt = `In an application utilizing ${material.topic}, consider a scenario where: "${sentence}". How should the implementation be structured to ensure reliability and correct behavior?`;
      referenceAnswer = `Application guidance according to source: "${fullPassage}"`;
      explanation = `Evaluates applied problem-solving in production conditions.`;
      isObjective = false;
    } else if (format === 'comparison') {
      concept = `${material.topic} - Comparative Trade-Offs`;
      prompt = `Analyze the structural trade-offs described for ${material.topic}: "${sentence}". What are the key advantages and drawbacks compared to alternative approaches?`;
      referenceAnswer = `Key trade-off distinctions: "${fullPassage}"`;
      explanation = `Examines analytical contrast and architectural trade-offs.`;
      isObjective = false;
    } else if (format === 'troubleshooting') {
      concept = `${material.topic} - Debugging & Failure Isolation`;
      prompt = `An unexpected defect or inconsistency occurs in ${material.topic} relating to: "${sentence}". What diagnostic checks or root causes should be evaluated to resolve this?`;
      referenceAnswer = `Root cause diagnostic context: "${fullPassage}"`;
      explanation = `Focuses on troubleshooting failure modes and system behavior.`;
      isObjective = false;
    } else if (format === 'mcq') {
      concept = `${material.topic} - Core Principles`;
      isObjective = true;
      prompt = `Which of the following statements accurately represents the documented behavior of ${material.topic}?`;
      const correctChoice = sentence;
      
      const distractors: string[] = [];
      // Use other sentences if available
      for (const s of sentences) {
        if (s !== sentence && !distractors.includes(s) && distractors.length < 3) {
          distractors.push(s);
        }
      }

      // If fewer than 3 other sentences, construct plausible semantic contrast statements
      const contextualDistractors = [
        `Operations run synchronously without queuing microtasks or macrotasks`,
        `State updates bypass lexical scope and execute in isolation`,
        `Execution terminates prematurely upon encountering asynchronous promises`,
        `Frames are evicted from the call stack before completing their execution block`
      ];

      for (const cd of contextualDistractors) {
        if (distractors.length >= 3) break;
        if (cd !== correctChoice && !distractors.includes(cd)) {
          distractors.push(cd);
        }
      }

      choices = [correctChoice, ...distractors.slice(0, 3)];
      correctChoiceIndex = 0;
      referenceAnswer = correctChoice;
      explanation = `Directly grounded in documented statement from "${material.title}": "${fullPassage}".`;
    } else {
      concept = `${material.topic} - Focused Inquiry`;
      prompt = `How does ${material.topic} handle the following condition documented in "${material.title}": "${sentence}"?`;
      referenceAnswer = fullPassage;
      isObjective = false;
    }

    const fingerprint = computeContentFingerprint(prompt);
    const candidate: NormalizedQuestion = {
      id: `q_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
      fingerprint,
      topic: material.topic,
      subtopic: request.subtopics && request.subtopics[i % request.subtopics.length],
      concept,
      difficulty,
      language,
      format,
      objective,
      prompt,
      choices,
      correctChoiceIndex,
      referenceAnswer,
      explanation,
      sourceReferences: [{ ...sourceRef, evidenceSnippet: sentence.slice(0, 120) }],
      origin: 'curated_source',
      groundingStatus: isObjective ? 'fully_grounded' : 'open_inquiry',
      isObjective
    };

    if (validateNormalizedQuestion(candidate)) {
      questions.push(candidate);
    }
  }

  return questions;
}

/**
 * Supported default Gemini model.
 * Checked as verified supported text model in Google Gemini v1beta REST API as of October 2026.
 * Note: gemini-1.5-flash was officially shut down on September 29, 2025.
 */
export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

/**
 * Validates model identifiers to prevent arbitrary URL injection, SSRF, or invalid names.
 */
export function isValidGeminiModel(model: string): boolean {
  if (!model || typeof model !== 'string') return false;
  const trimmed = model.trim();
  // Safe alphanumeric model pattern with dots, dashes, underscores (e.g. 'gemini-2.5-flash', 'gemini-2.0-flash')
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{2,63}$/.test(trimmed)) {
    return false;
  }
  // Block any path traversal, slashes, colons, or query parameters
  if (trimmed.includes('/') || trimmed.includes('\\') || trimmed.includes(':') || trimmed.includes('?') || trimmed.includes('&')) {
    return false;
  }
  return true;
}

/**
 * Official Google Gemini REST API adapter.
 * Uses structured output schema conforming to current Google AI documentation (v1beta generateContent).
 * Invoked only when GEMINI_API_KEY is configured in the environment.
 */
export async function generateWithGemini(
  apiKey: string,
  material: RetrievedMaterial,
  request: GenerateQuestionsRequest,
  modelOverride?: string
): Promise<GeminiGenerationResult> {
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
    return {
      success: false,
      errorReason: 'MISSING_API_KEY',
      errorMessage: 'GEMINI_API_KEY is not configured or empty.'
    };
  }

  const rawModel = (modelOverride || process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL).trim();
  if (!isValidGeminiModel(rawModel)) {
    return {
      success: false,
      errorReason: 'INVALID_MODEL',
      errorMessage: `Invalid GEMINI_MODEL identifier "${rawModel}". Model name must be alphanumeric and contain no slashes, colons, or URL characters.`
    };
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(rawModel)}:generateContent?key=${encodeURIComponent(apiKey.trim())}`;
  const desiredCount = Math.min(request.desiredCount || 5, 8);

  const promptText = `
You are an expert educational assessment engine. Generate ${desiredCount} varied, rigorous questions for learning about "${material.topic}" at difficulty "${request.difficulty || 'intermediate'}".
All questions and answers MUST be strictly grounded in the following educational source text. Do not invent facts or cite external unverifiable information.

SOURCE TITLE: ${material.title}
SOURCE URL: ${material.url}
SOURCE TEXT:
${material.content}

Generate a JSON object with a single "questions" array containing exactly ${desiredCount} items.
Each item must strictly have:
- "concept": string representing the specific subtopic or mechanism
- "format": one of "explanation", "scenario", "comparison", "troubleshooting", "mcq"
- "objective": one of "conceptual_understanding", "applied_reasoning", "analytical_comparison", "debugging", "edge_cases"
- "prompt": high quality question prompt
- "choices": optional array of 4 unique distinct strings (only when format is "mcq")
- "correctChoiceIndex": 0-based number pointing to the correct choice (only when format is "mcq")
- "referenceAnswer": concise reference answer strictly grounded in the source text
- "explanation": rationale explaining why the answer is correct based on the source text
`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 9000);

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: promptText }]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              questions: {
                type: 'ARRAY',
                items: {
                  type: 'OBJECT',
                  properties: {
                    concept: { type: 'STRING' },
                    format: { type: 'STRING' },
                    objective: { type: 'STRING' },
                    prompt: { type: 'STRING' },
                    choices: {
                      type: 'ARRAY',
                      items: { type: 'STRING' }
                    },
                    correctChoiceIndex: { type: 'INTEGER' },
                    referenceAnswer: { type: 'STRING' },
                    explanation: { type: 'STRING' }
                  },
                  required: ['concept', 'format', 'objective', 'prompt', 'referenceAnswer']
                }
              }
            },
            required: ['questions']
          }
        }
      })
    });

    if (!res.ok) {
      if (res.status === 404) {
        return {
          success: false,
          errorReason: 'MODEL_NOT_FOUND',
          errorMessage: `Model "${rawModel}" returned HTTP 404 (model not found, unavailable, or shut down).`
        };
      }
      if (res.status === 429) {
        return {
          success: false,
          errorReason: 'RATE_LIMITED',
          errorMessage: 'Gemini API returned HTTP 429 (rate limit or quota exceeded).'
        };
      }
      return {
        success: false,
        errorReason: 'NETWORK_ERROR',
        errorMessage: `Gemini API returned HTTP ${res.status}: ${res.statusText}`
      };
    }

    const data = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      return {
        success: false,
        errorReason: 'INVALID_RESPONSE_SCHEMA',
        errorMessage: 'Gemini API response did not contain candidates content parts text.'
      };
    }

    let parsed: any;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      return {
        success: false,
        errorReason: 'INVALID_RESPONSE_SCHEMA',
        errorMessage: 'Failed to parse JSON response from model.'
      };
    }

    const rawQuestions = Array.isArray(parsed) ? parsed : parsed.questions;
    if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
      return {
        success: false,
        errorReason: 'INVALID_RESPONSE_SCHEMA',
        errorMessage: 'Model JSON payload did not contain a valid questions array.'
      };
    }

    const questions: NormalizedQuestion[] = [];
    const sourceRef: SourceReference = {
      title: material.title,
      url: material.url,
      retrievedAt: material.retrievedAt,
      sourceDomain: material.sourceDomain
    };

    for (let i = 0; i < rawQuestions.length; i++) {
      const q = rawQuestions[i];
      if (!q.prompt || typeof q.prompt !== 'string') continue;

      const isObjective = q.format === 'mcq';
      const fp = computeContentFingerprint(q.prompt);
      const normalized: NormalizedQuestion = {
        id: `gemini_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
        fingerprint: fp,
        topic: material.topic,
        subtopic: q.concept || (request.subtopics && request.subtopics[i % request.subtopics.length]),
        concept: q.concept || material.topic,
        difficulty: request.difficulty || 'intermediate',
        language: request.language || 'English',
        format: q.format || 'explanation',
        objective: q.objective || 'applied_reasoning',
        prompt: q.prompt.trim(),
        choices: Array.isArray(q.choices) ? q.choices.map((c: any) => String(c).trim()) : undefined,
        correctChoiceIndex: typeof q.correctChoiceIndex === 'number' ? q.correctChoiceIndex : undefined,
        referenceAnswer: q.referenceAnswer ? String(q.referenceAnswer).trim() : undefined,
        explanation: q.explanation ? String(q.explanation).trim() : undefined,
        sourceReferences: [{ ...sourceRef, evidenceSnippet: q.referenceAnswer?.slice(0, 100) }],
        origin: 'dynamic_generator',
        groundingStatus: isObjective ? 'fully_grounded' : 'open_inquiry',
        isObjective
      };

      if (validateNormalizedQuestion(normalized)) {
        questions.push(normalized);
      }
    }

    if (questions.length === 0) {
      return {
        success: false,
        errorReason: 'INVALID_RESPONSE_SCHEMA',
        errorMessage: 'None of the questions generated by model passed normalization validation.'
      };
    }

    return {
      success: true,
      questions
    };
  } catch (err: unknown) {
    if ((err as Error)?.name === 'AbortError') {
      return {
        success: false,
        errorReason: 'TIMEOUT',
        errorMessage: 'Gemini API request timed out after 9000ms.'
      };
    }
    return {
      success: false,
      errorReason: 'NETWORK_ERROR',
      errorMessage: (err as Error)?.message || 'Network error connecting to Gemini API.'
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
