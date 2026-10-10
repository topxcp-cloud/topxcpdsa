import type { NextRequest } from 'next/server';
import { handleNextApiRequest } from '../../../../lib/api/next-api-runtime';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  let body: { handle?: string };
  try { body = await request.json(); } catch { return Response.json({ error: 'A Codeforces handle is required.' }, { status: 400 }); }
  const handle = String(body.handle || '').trim();
  if (!/^[A-Za-z0-9_.-]{1,24}$/.test(handle)) return Response.json({ error: 'Invalid Codeforces handle.' }, { status: 400 });
  return handleNextApiRequest(request, `/api/sync/codeforces/${encodeURIComponent(handle)}`, 'GET');
}
