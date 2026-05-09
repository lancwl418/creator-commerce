import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/products/import-redirect
 *
 * Receives the Design Engine's cross-origin form POST and hands the payload
 * to the same-origin import page. The payload contains base64 thumbnails and
 * artwork data URLs which can easily exceed multi-MB; previously we shoved it
 * into a 303 Location hash, but that header is rejected by upstream proxies
 * (nginx/Cloudflare/Vercel header size caps) and surfaces as 502 Bad Gateway
 * even though Next.js itself returns successfully.
 *
 * Instead we return a small HTML doc that stashes the payload in
 * sessionStorage and navigates client-side — same origin, no header limits.
 */
export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type') || '';
  let payload = '';

  if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    payload = (formData.get('payload') as string) || '';
  } else {
    const body = await request.json();
    payload = JSON.stringify(body);
  }

  if (!payload) {
    return NextResponse.json({ error: 'Missing payload' }, { status: 400 });
  }

  const origin = request.nextUrl.origin;
  const target = `${origin}/dashboard/products/import`;
  const escaped = JSON.stringify(payload);

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Importing…</title></head>
<body style="font-family:system-ui;background:#f9fafb;color:#374151;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
<div>Loading product import…</div>
<script>
(function () {
  try {
    sessionStorage.setItem('product_import_payload', ${escaped});
  } catch (e) {}
  location.replace(${JSON.stringify(target)});
})();
</script>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
