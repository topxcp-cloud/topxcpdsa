import type { NextRequest } from 'next/server';
import { handleNextApiRequest } from '../../../lib/api/next-api-runtime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export const GET = (request: NextRequest) => handleNextApiRequest(request);
export const POST = (request: NextRequest) => handleNextApiRequest(request);
export const PUT = (request: NextRequest) => handleNextApiRequest(request);
export const PATCH = (request: NextRequest) => handleNextApiRequest(request);
export const DELETE = (request: NextRequest) => handleNextApiRequest(request);
export const OPTIONS = (request: NextRequest) => handleNextApiRequest(request);
