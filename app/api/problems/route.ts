import type { NextRequest } from 'next/server';
import { handleNextApiRequest } from '../../../lib/api/next-api-runtime';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = (request: NextRequest) => handleNextApiRequest(request, '/api/vault/problems');
export const POST = (request: NextRequest) => handleNextApiRequest(request, '/api/admin/vault/problems');
