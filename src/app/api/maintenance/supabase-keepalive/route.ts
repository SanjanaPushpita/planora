import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getKeepaliveSecret(): string | undefined {
  return process.env.KEEPALIVE_SECRET;
}

function verifyAuthorization(req: NextRequest): boolean {
  const secret = getKeepaliveSecret();
  if (!secret) {
    // If secret is not configured in environment, fail securely
    return false;
  }

  // Check Bearer token in Authorization header
  const authHeader = req.headers.get('authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token === secret) return true;
  }

  // Check custom header
  const customHeader = req.headers.get('x-keepalive-secret');
  if (customHeader && customHeader === secret) {
    return true;
  }

  // Check query parameter fallback for secure webhooks if needed
  const url = new URL(req.url);
  const querySecret = url.searchParams.get('secret');
  if (querySecret && querySecret === secret) {
    return true;
  }

  return false;
}

async function handleHeartbeat(req: NextRequest) {
  // 1. Verify Authorization
  if (!verifyAuthorization(req)) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized. Valid keep-alive authorization required.' },
      { status: 401 }
    );
  }

  // 2. Initialize Server-Side Supabase Client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { ok: false, error: 'Supabase credentials not configured in server environment.' },
      { status: 503 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const nowIso = new Date().toISOString();

  try {
    // 3. Perform a lightweight read & upsert on the dedicated system_heartbeat row
    const { data, error } = await supabase
      .from('system_heartbeat')
      .upsert(
        {
          id: 'planora-main',
          last_ping_at: nowIso,
          source: 'scheduled-automation',
          updated_at: nowIso
        },
        { onConflict: 'id' }
      )
      .select('id, last_ping_at, source')
      .single();

    if (error) {
      // If table does not exist or database permission issue, return clean error
      return NextResponse.json(
        {
          ok: false,
          error: 'Failed to update heartbeat table.',
          details: error.message
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        timestamp: nowIso,
        heartbeat: data?.last_ping_at || nowIso,
        message: 'Planora Supabase heartbeat recorded successfully.'
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { ok: false, error: 'Internal server error during heartbeat ping.', details: errorMsg },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return handleHeartbeat(req);
}

export async function POST(req: NextRequest) {
  return handleHeartbeat(req);
}
