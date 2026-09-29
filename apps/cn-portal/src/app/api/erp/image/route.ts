import { NextRequest, NextResponse } from 'next/server';
import { erpImageBaseUrl } from '@creator-commerce/shared/erp';
import { erpConfig } from '@/lib/erp';

const IMAGE_BASE = erpImageBaseUrl(erpConfig);

// ERP 图片代理：把 ERP 静态资源路径透传出来，避免前端直连 ERP。
export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get('path');
  if (!path) {
    return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 });
  }

  const imageUrl = path.startsWith('http') ? path : `${IMAGE_BASE}${path}`;

  try {
    const res = await fetch(imageUrl);
    if (!res.ok) {
      return NextResponse.json(
        { error: `Image fetch failed: ${res.status}` },
        { status: res.status }
      );
    }

    const buffer = await res.arrayBuffer();
    const ext = path.split('.').pop()?.toLowerCase();
    const contentTypeMap: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
    };
    const contentType = contentTypeMap[ext ?? ''] ?? 'image/jpeg';

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Image proxy error' },
      { status: 500 }
    );
  }
}
