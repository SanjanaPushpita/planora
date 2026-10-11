import { NextRequest, NextResponse } from 'next/server';
import { questionService } from '@/lib/learning/questions/question-service';
import {
  GenerateQuestionsRequest,
  QuestionDifficulty,
  QuestionFormat,
  LearningObjective
} from '@/lib/learning/questions/types';

export const dynamic = 'force-dynamic';

const VALID_DIFFICULTIES: QuestionDifficulty[] = ['introductory', 'intermediate', 'advanced'];
const VALID_FORMATS: QuestionFormat[] = [
  'explanation',
  'scenario',
  'comparison',
  'troubleshooting',
  'prediction',
  'short_answer',
  'mcq'
];
const VALID_OBJECTIVES: LearningObjective[] = [
  'conceptual_understanding',
  'applied_reasoning',
  'edge_cases',
  'analytical_comparison',
  'debugging',
  'evaluation'
];

export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          statusCode: 'INSUFFICIENT_SOURCE_MATERIAL',
          message: 'Malformed request JSON payload.',
          questions: [],
          topic: '',
          difficulty: 'intermediate',
          retrievedSources: [],
          requestedCount: 0,
          servedCount: 0,
          refillCount: 0,
          dedupStats: { exactFiltered: 0, similarityFiltered: 0, candidateCount: 0 }
        },
        { status: 400 }
      );
    }

    // 1. Topic validation (1..100 chars)
    const rawTopic = typeof body.topic === 'string' ? body.topic.trim() : '';
    if (!rawTopic || rawTopic.length > 100) {
      return NextResponse.json(
        {
          statusCode: 'INSUFFICIENT_SOURCE_MATERIAL',
          message: 'Topic is required and must be between 1 and 100 characters.',
          questions: [],
          topic: rawTopic,
          difficulty: 'intermediate',
          retrievedSources: [],
          requestedCount: 0,
          servedCount: 0,
          refillCount: 0,
          dedupStats: { exactFiltered: 0, similarityFiltered: 0, candidateCount: 0 }
        },
        { status: 400 }
      );
    }

    // 2. Subtopics validation (array of max 10 strings, each <= 50 chars)
    const validSubtopics: string[] = [];
    if (Array.isArray(body.subtopics)) {
      for (const item of body.subtopics.slice(0, 10)) {
        if (typeof item === 'string' && item.trim().length > 0 && item.trim().length <= 50) {
          validSubtopics.push(item.trim());
        }
      }
    }

    // 3. Difficulty validation
    const difficulty: QuestionDifficulty = VALID_DIFFICULTIES.includes(body.difficulty)
      ? body.difficulty
      : 'intermediate';

    // 4. Desired count (1..10, default 5)
    const desiredCount = typeof body.desiredCount === 'number'
      ? Math.max(1, Math.min(10, Math.floor(body.desiredCount)))
      : 5;

    // 5. Excluded fingerprints (max 200 items, each <= 32 chars)
    const validExcludedFingerprints: string[] = [];
    if (Array.isArray(body.excludeFingerprints)) {
      for (const fp of body.excludeFingerprints.slice(0, 200)) {
        if (typeof fp === 'string' && fp.trim().length > 0 && fp.trim().length <= 32) {
          validExcludedFingerprints.push(fp.trim());
        }
      }
    }

    // 6. Formats & Objectives filtering
    const validFormats: QuestionFormat[] = [];
    if (Array.isArray(body.formats)) {
      for (const f of body.formats) {
        if (VALID_FORMATS.includes(f)) validFormats.push(f);
      }
    }

    const validObjectives: LearningObjective[] = [];
    if (Array.isArray(body.objectives)) {
      for (const o of body.objectives) {
        if (VALID_OBJECTIVES.includes(o)) validObjectives.push(o);
      }
    }

    const requestPayload: GenerateQuestionsRequest = {
      topic: rawTopic,
      subtopics: validSubtopics.length > 0 ? validSubtopics : undefined,
      difficulty,
      desiredCount,
      language: typeof body.language === 'string' ? body.language.slice(0, 30) : 'English',
      excludeFingerprints: validExcludedFingerprints,
      formats: validFormats.length > 0 ? validFormats : undefined,
      objectives: validObjectives.length > 0 ? validObjectives : undefined,
      maxRefillAttempts: 1
    };

    const response = await questionService.generateQuestions(requestPayload);

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      }
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown generation error';
    return NextResponse.json(
      {
        statusCode: 'PROVIDER_UNAVAILABLE',
        message: `Internal question generation failure: ${errorMsg}`,
        questions: [],
        topic: '',
        difficulty: 'intermediate',
        retrievedSources: [],
        requestedCount: 0,
        servedCount: 0,
        refillCount: 0,
        dedupStats: { exactFiltered: 0, similarityFiltered: 0, candidateCount: 0 }
      },
      { status: 500 }
    );
  }
}
