import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory cache for passing product data to Design Engine
// Keys expire after 5 minutes
const cache = new Map<string, { data: unknown; expires: number }>();

function cleanup() {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (entry.expires < now) cache.delete(key);
  }
}

export async function POST(request: NextRequest) {
  cleanup();
  const body = await request.json();
  const key = crypto.randomUUID();
  cache.set(key, { data: body.products, expires: Date.now() + 5 * 60 * 1000 });
  return NextResponse.json({ key }, {
    headers: { 'Access-Control-Allow-Origin': '*' },
  });
}

export async function GET(request: NextRequest) {
  cleanup();
  const key = request.nextUrl.searchParams.get('key');
  if (!key) {
    return NextResponse.json({ error: 'Missing key' }, { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } });
  }
  const entry = cache.get(key);
  if (!entry) {
    return NextResponse.json({ error: 'Not found or expired' }, { status: 404, headers: { 'Access-Control-Allow-Origin': '*' } });
  }
  cache.delete(key);
  return NextResponse.json({ products: entry.data }, {
    headers: { 'Access-Control-Allow-Origin': '*' },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
