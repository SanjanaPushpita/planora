import { NextRequest, NextResponse } from 'next/server';
import { searchDiseases } from '@/lib/disease/disease-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');

    if (!query || typeof query !== 'string' || !query.trim()) {
      return NextResponse.json(
        {
          ok: false,
          error: 'INVALID_QUERY',
          message: 'Query parameter "q" is required and cannot be whitespace only.',
        },
        { status: 400 }
      );
    }

    const trimmed = query.trim();
    if (trimmed.length > 250) {
      return NextResponse.json(
        {
          ok: false,
          error: 'INVALID_QUERY',
          message: 'Query parameter "q" cannot exceed 250 characters.',
        },
        { status: 400 }
      );
    }

    const page = pageParam ? Math.max(1, Math.min(100, parseInt(pageParam, 10) || 1)) : 1;
    const limit = limitParam ? Math.max(1, Math.min(50, parseInt(limitParam, 10) || 20)) : 20;

    const result = await searchDiseases(trimmed, {
      page,
      limit,
      includeMedlinePlusCandidates: true,
    });

    if (!result.ok) {
      return NextResponse.json(result, { status: result.statusCode || 500 });
    }

    return NextResponse.json(result, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown server error';
    return NextResponse.json(
      {
        ok: false,
        error: 'DISEASE_SOURCE_UNAVAILABLE',
        message: `Failed to execute disease search: ${message}`,
      },
      { status: 500 }
    );
  }
}
