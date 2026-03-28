import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/image-proxy?url=<encoded_url>
 *
 * Generic image proxy to avoid CORS issues when loading external images
 * onto the Fabric.js canvas. Without this, canvas.toDataURL() fails
 * because cross-origin images taint the canvas.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  try {
    const decoded = decodeURIComponent(url);
    const res = await fetch(decoded, {
      headers: {
        'User-Agent': 'DesignEngine-ImageProxy/1.0',
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Upstream returned ${res.status}` },
        { status: res.status }
      );
    }

    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get('content-type') || 'image/jpeg';

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Proxy failed' },
      { status: 500 }
    );
  }
}
