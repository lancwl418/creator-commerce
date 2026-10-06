import { erpBaseUrlFromEnv } from './client';

const IMAGE_CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
};

/** 图片代理只请求 ERP 静态目录或明确配置的图片源。 */
export function resolveErpImageSource(
  path: string,
  baseUrl: string,
  extraOrigins: string[] = []
): URL | null {
  try {
    const base = new URL(`${baseUrl.replace(/\/$/, '')}/sys/common/static/`);
    // ERP 历史相对路径可能带一个前导 /，仍然归于静态目录。
    const source = path.startsWith('/') && !path.startsWith('//') && !path.startsWith(base.pathname)
      ? path.slice(1) : path;
    const url = new URL(source, base);
    const allowedOrigins = new Set([base.origin, ...extraOrigins.map((o) => new URL(o).origin)]);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    if (!allowedOrigins.has(url.origin)) return null;
    if (url.origin === base.origin && !url.pathname.startsWith(base.pathname)) return null;
    const segments = decodeURIComponent(url.pathname).split(/[\\/]/);
    if (segments.some((part) => part === '..' || part === '.')) return null;
    return url;
  } catch {
    return null;
  }
}

/** 标准 Response 实现，三个 Next app 复用；各 app 只提供自己的响应头。 */
export async function proxyErpImage(
  request: Request,
  extraHeaders: Record<string, string> = {}
): Promise<Response> {
  const path = new URL(request.url).searchParams.get('path');
  if (!path) return Response.json({ error: 'Missing path parameter' }, { status: 400 });

  try {
    const extraOrigins = (process.env.ERP_IMAGE_ALLOWED_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
    const url = resolveErpImageSource(path, erpBaseUrlFromEnv(), extraOrigins);
    if (!url) return Response.json({ error: 'Invalid ERP image path' }, { status: 400 });

    // 不自动跟随重定向，避免允许的源跳转到未允许的地址。
    const res = await fetch(url, { redirect: 'error' });
    if (!res.ok) {
      return Response.json({ error: `Image fetch failed: ${res.status}` }, { status: res.status });
    }
    const ext = url.pathname.split('.').pop()?.toLowerCase() ?? '';
    const contentType = res.headers.get('content-type')?.split(';')[0];
    return new Response(await res.arrayBuffer(), {
      headers: {
        'Content-Type': contentType?.startsWith('image/')
          ? contentType : (IMAGE_CONTENT_TYPES[ext] ?? 'image/jpeg'),
        'Cache-Control': 'public, max-age=86400',
        ...extraHeaders,
      },
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Image proxy error' },
      { status: 500 }
    );
  }
}
