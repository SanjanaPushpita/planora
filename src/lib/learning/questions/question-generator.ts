/**
 * Question generator module: supports external AI model generation (Gemini / OpenAI compatible)
 * and deterministic grounded educational generation from retrieved passages.
 */

import {
  GenerateQuestionsRequest,
  NormalizedQuestion,
  QuestionFormat,
  LearningObjective,
  RetrievedMaterial,
  SourceReference,
  QuestionEngineStatusCode
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
 * Builds grounded deterministic reasoning questions from retrieved source material.
 * Covers diverse formats: explanation, scenario, comparison, troubleshooting, mcq.
 */
export function generateFromRetrievedPassages(
  material: RetrievedMaterial,
  request: GenerateQuestionsRequest
): NormalizedQuestion[] {
  const count = Math.min(request.desiredCount || 5, 8);
  const difficulty = request.difficulty || 'intermediate';
  const language = request.language || 'English';
  const passages = material.keyPassages.length > 0 ? material.keyPassages : [material.content];
  
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
    const passage = passages[i % passages.length];
    const words = passage.split(' ').slice(0, 30).join(' ');

    let prompt = '';
    let choices: string[] | undefined = undefined;
    let correctChoiceIndex: number | undefined = undefined;
    let referenceAnswer: string | undefined = undefined;
    let explanation: string | undefined = undefined;
    let isObjective = false;
    let concept = material.topic;

    if (format === 'explanation') {
      concept = `${material.topic} - Mechanics`;
      prompt = `Based on the principles of ${material.topic}, explain how the following mechanism functions in practice: "${words}..."?`;
      referenceAnswer = `The mechanism operates according to: ${passage}`;
      explanation = `Grounded directly in documented behavior of ${material.title}.`;
      isObjective = false;
    } else if (format === 'scenario') {
      concept = `${material.topic} - Real-World Application`;
      prompt = `Consider a production scenario where an engineering or study team encounters: "${words}...". How should ${material.topic} be applied to address this condition?`;
      referenceAnswer = `Application strategy derived from reference: ${passage}`;
      explanation = `Assesses applied reasoning and contextual trade-offs.`;
      isObjective = false;
    } else if (format === 'comparison') {
      concept = `${material.topic} - Trade-Off Analysis`;
      prompt = `Compare the trade-offs of relying on ${material.topic} for the condition described by: "${words}..." versus alternative structural approaches. What are the key distinctions?`;
      referenceAnswer = `Key distinctions documented in source: ${passage}`;
      explanation = `Focuses on analytical contrast and edge case trade-offs.`;
      isObjective = false;
    } else if (format === 'troubleshooting') {
      concept = `${material.topic} - Debugging & Failure Modes`;
      prompt = `An unexpected fault occurs during execution relating to: "${words}...". What is the most plausible root cause according to ${material.topic} specifications, and how should it be diagnosed?`;
      referenceAnswer = `Diagnostic guidance according to reference: ${passage}`;
      explanation = `Focuses on troubleshooting and root-cause analysis.`;
      isObjective = false;
    } else if (format === 'mcq') {
      concept = `${material.topic} - Core Principles`;
      isObjective = true;
      prompt = `Which statement accurately reflects the documented specification of ${material.topic} regarding the following context: "${words}..."?`;
      
      const snippet = passage.slice(0, 100);
      choices = [
        `It conforms to the established principle: ${snippet}`,
        `It bypasses all structural guarantees without validation or scoping`,
        `It operates exclusively as an ungrounded non-deterministic fallback`,
        `It requires discarding previously validated state upon each transition`
      ];
      correctChoiceIndex = 0;
      referenceAnswer = choices[0];
      explanation = `Option 1 is grounded in: "${passage}". Other options represent implausible or destructive behaviors.`;
    } else {
      concept = `${material.topic} - Critical Inquiry`;
      prompt = `How does ${material.topic} ensure consistency when handling: "${words}..."?`;
      referenceAnswer = passage;
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
      sourceReferences: [{ ...sourceRef, evidenceSnippet: words }],
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
 * Formats structured prompt for external LLM API when configured.
 */
export function buildLlmGenerationPrompt(
  material: RetrievedMaterial,
  request: GenerateQuestionsRequest
): string {
  return JSON.stringify({
    instruction: "Generate high-quality grounded reasoning questions based strictly on the provided educational source text. Do not hallucinate facts outside the source.",
    topic: material.topic,
    difficulty: request.difficulty || 'intermediate',
    desiredCount: request.desiredCount || 5,
    sourceText: material.content,
    requiredSchema: {
      questions: [
        {
          concept: "string",
          format: "explanation | scenario | comparison | troubleshooting | mcq",
          objective: "conceptual_understanding | applied_reasoning | analytical_comparison | debugging | edge_cases",
          prompt: "string",
          choices: ["optional array of 4 distinct choices if mcq"],
          correctChoiceIndex: "0-based number if mcq",
          referenceAnswer: "string grounded strictly in sourceText",
          explanation: "string"
        }
      ]
    }
  });
}
