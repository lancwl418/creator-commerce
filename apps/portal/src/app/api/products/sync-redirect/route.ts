import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/products/sync-redirect
 *
 * Cross-site entry for the "Sync to your store" action on an externally
 * embedded Design Engine (e.g. the ghostyle storefront). The editor form-POSTs
 * its design payload here; we stash it in sessionStorage and navigate to the
 * same-origin /dashboard/products/sync page, which creates the product and
 * drops the user on the Detail step. Same mechanism as import-redirect — a
 * client-side hop avoids header-size limits on large base64 payloads.
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

  const target = '/dashboard/products/sync';
  const escaped = JSON.stringify(payload);

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Syncing…</title></head>
<body style="font-family:system-ui;background:#f9fafb;color:#374151;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
<div>Syncing your design…</div>
<script>
(function () {
  try {
    sessionStorage.setItem('product_sync_payload', ${escaped});
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
