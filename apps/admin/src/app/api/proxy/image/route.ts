import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/proxy/image?url=https://scontent...
 *
 * Server-side image proxy for Instagram CDN images.
 * Instagram CDN blocks browser requests from third-party origins.
 * This proxy fetches the image server-side (no referrer/origin issues)
 * and streams it back to the client.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  if (!url) {
    return NextResponse.json({ error: 'url parameter required' }, { status: 400 });
  }

  // Only allow Instagram CDN domains
  try {
    const parsed = new URL(url);
    const allowed = [
      'cdninstagram.com',
      'fbcdn.net',
      'instagram.com',
    ];
    if (!allowed.some(d => parsed.hostname.endsWith(d))) {
      return NextResponse.json({ error: 'Domain not allowed' }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: response.status });
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Proxy fetch failed' }, { status: 500 });
  }
}
