import { NextRequest, NextResponse } from 'next/server';
import { getRandomDisease } from '@/lib/disease/disease-random';
import { BODY_SYSTEMS, DISEASE_TYPES } from '@/lib/disease/disease-categories';
import { BodySystemCategory, DiseaseTypeCategory } from '@/lib/disease/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Empty body is acceptable for unfiltered random discovery
      body = {};
    }

    // 1. Validate & filter bodySystems
    const validBodySystems: BodySystemCategory[] = [];
    if (Array.isArray(body.bodySystems)) {
      for (const item of body.bodySystems) {
        if (typeof item === 'string' && (BODY_SYSTEMS as readonly string[]).includes(item)) {
          validBodySystems.push(item as BodySystemCategory);
        }
      }
    }

    // 2. Validate & filter diseaseTypes
    const validDiseaseTypes: DiseaseTypeCategory[] = [];
    if (Array.isArray(body.diseaseTypes)) {
      for (const item of body.diseaseTypes) {
        if (typeof item === 'string' && (DISEASE_TYPES as readonly string[]).includes(item)) {
          validDiseaseTypes.push(item as DiseaseTypeCategory);
        }
      }
    }

    // 3. Validate & bound excluded IDs (Max 500 items, string <= 50 chars)
    const validExcludedIds: string[] = [];
    if (Array.isArray(body.excludedDiseaseIds)) {
      for (const item of body.excludedDiseaseIds.slice(0, 500)) {
        if (typeof item === 'string' && item.trim().length > 0 && item.trim().length <= 50) {
          validExcludedIds.push(item.trim());
        }
      }
    }

    // 4. Validate refillBudget (0..5)
    const refillBudget = typeof body.refillBudget === 'number'
      ? Math.max(0, Math.min(5, Math.floor(body.refillBudget)))
      : 2;

    const enrich = body.enrich !== false;
    const category = typeof body.category === 'string' ? body.category.trim().slice(0, 100) : undefined;

    const result = await getRandomDisease({
      bodySystems: validBodySystems.length > 0 ? validBodySystems : undefined,
      diseaseTypes: validDiseaseTypes.length > 0 ? validDiseaseTypes : undefined,
      category,
      excludedDiseaseIds: validExcludedIds,
      refillBudget,
      enrich,
      timeoutMs: 10000,
    });

    const status = result.ok
      ? 200
      : (result.error === 'NO_UNSEEN_DISEASE' || result.error === 'EMPTY_CANDIDATE_POOL' ? 200 : 500);

    return NextResponse.json(result, {
      status,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown server error';
    return NextResponse.json(
      {
        ok: false,
        error: 'DISEASE_SOURCE_UNAVAILABLE',
        message: `Failed to discover random disease: ${message}`,
        poolSize: 0,
        eligibleCount: 0,
      },
      { status: 500 }
    );
  }
}
