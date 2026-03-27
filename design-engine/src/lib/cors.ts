import { NextResponse } from 'next/server';

const ALLOWED_ORIGINS = process.env.NEXT_PUBLIC_ALLOWED_ORIGINS
  ?.split(',')
  .map((s) => s.trim())
  .filter(Boolean) ?? [];

export function corsHeaders(origin?: string | null): HeadersInit {
  const allowedOrigin =
    origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0] || '*';

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export function handleCorsOptions(request: Request) {
  const origin = request.headers.get('origin');
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(origin),
  });
}

export function jsonWithCors(data: unknown, request: Request, init?: { status?: number }) {
  const origin = request.headers.get('origin');
  return NextResponse.json(data, {
    status: init?.status,
    headers: corsHeaders(origin),
  });
}
