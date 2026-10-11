import { NextRequest, NextResponse } from 'next/server';
import { getDiseaseDetails } from '@/lib/disease/disease-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const enrichParam = searchParams.get('enrich');

    if (!id || typeof id !== 'string' || !id.trim()) {
      return NextResponse.json(
        {
          ok: false,
          error: 'INVALID_ID',
          message: 'Parameter "id" is required and cannot be empty.',
        },
        { status: 400 }
      );
    }

    const trimmedId = id.trim();
    if (trimmedId.length > 100) {
      return NextResponse.json(
        {
          ok: false,
          error: 'INVALID_ID',
          message: 'Parameter "id" cannot exceed 100 characters.',
        },
        { status: 400 }
      );
    }

    const enrich = enrichParam !== 'false';

    const result = await getDiseaseDetails(trimmedId, { enrich });

    if (!result.ok) {
      return NextResponse.json(result, { status: result.statusCode || (result.error === 'NOT_FOUND' ? 404 : 500) });
    }

    return NextResponse.json(result, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown server error';
    return NextResponse.json(
      {
        ok: false,
        error: 'DISEASE_SOURCE_UNAVAILABLE',
        message: `Failed to fetch disease details: ${message}`,
      },
      { status: 500 }
    );
  }
}
