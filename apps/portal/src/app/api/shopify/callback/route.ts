import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

const CLIENT_ID = process.env.SHOPIFY_CLIENT_ID ?? '';
const CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET ?? '';
const API_VERSION = process.env.SHOPIFY_API_VERSION ?? '2025-01';

/**
 * GET /api/shopify/callback?code=...&shop=...&state=...&hmac=...
 * Shopify redirects here after merchant approves OAuth.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get('code');
  const shop = searchParams.get('shop');
  const state = searchParams.get('state');
  const hmac = searchParams.get('hmac');

  // Verify state matches cookie
  const savedState = req.cookies.get('shopify_oauth_state')?.value;
  const creatorId = req.cookies.get('shopify_oauth_creator')?.value;

  if (!code || !shop || !state || !hmac) {
    return NextResponse.redirect(new URL('/dashboard/stores?error=missing_params', req.url));
  }

  if (state !== savedState) {
    return NextResponse.redirect(new URL('/dashboard/stores?error=invalid_state', req.url));
  }

  if (!creatorId) {
    return NextResponse.redirect(new URL('/dashboard/stores?error=session_expired', req.url));
  }

  // Verify HMAC
  const params = new URLSearchParams(searchParams.toString());
  params.delete('hmac');
  const sortedParams = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  const expectedHmac = crypto
    .createHmac('sha256', CLIENT_SECRET)
    .update(sortedParams)
    .digest('hex');

  if (hmac !== expectedHmac) {
    return NextResponse.redirect(new URL('/dashboard/stores?error=invalid_hmac', req.url));
  }

  // Exchange code for access token
  const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
    }),
  });

  if (!tokenRes.ok) {
    console.error('[Shopify OAuth] Token exchange failed:', await tokenRes.text());
    return NextResponse.redirect(new URL('/dashboard/stores?error=token_exchange', req.url));
  }

  const { access_token, scope } = await tokenRes.json();

  // Fetch shop info for display name
  let storeName = shop;
  try {
    const shopRes = await fetch(`https://${shop}/admin/api/${API_VERSION}/shop.json`, {
      headers: { 'X-Shopify-Access-Token': access_token },
    });
    if (shopRes.ok) {
      const { shop: shopData } = await shopRes.json();
      storeName = shopData.name || shop;
    }
  } catch { /* use shop domain as fallback name */ }

  // Upsert store connection
  const supabase = await createClient();
  const { error: upsertError } = await supabase
    .from('creator_store_connections')
    .upsert(
      {
        creator_id: creatorId,
        platform: 'shopify',
        store_name: storeName,
        store_url: `https://${shop}`,
        access_token,
        scopes: scope?.split(',') || [],
        status: 'connected',
        connected_at: new Date().toISOString(),
      },
      { onConflict: 'creator_id,platform' }
    );

  if (upsertError) {
    console.error('[Shopify OAuth] Upsert error:', upsertError);
    return NextResponse.redirect(new URL('/dashboard/stores?error=save_failed', req.url));
  }

  // Clear OAuth cookies
  const response = NextResponse.redirect(new URL('/dashboard/stores?connected=shopify', req.url));
  response.cookies.delete('shopify_oauth_state');
  response.cookies.delete('shopify_oauth_creator');
  response.cookies.delete('shopify_oauth_shop');

  return response;
}
