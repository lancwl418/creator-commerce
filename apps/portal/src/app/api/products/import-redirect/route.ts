import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/products/import-redirect
 *
 * Thin redirect proxy for the Design Engine's cross-origin form POST.
 * Receives the product payload via form data, then redirects (303) to
 * /dashboard/products/import with the payload in the URL hash.
 *
 * This avoids Chrome's popup blocker which blocks cross-origin
 * window.location.href navigations triggered after async operations.
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
  const encodedPayload = encodeURIComponent(payload);
  return NextResponse.redirect(
    `${origin}/dashboard/products/import#${encodedPayload}`,
    { status: 303 }
  );
}
