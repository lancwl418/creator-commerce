import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

const CLIENT_ID = process.env.SHOPIFY_CLIENT_ID ?? '';
const CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET ?? '';
const API_VERSION = process.env.SHOPIFY_API_VERSION ?? '2024-10';

function getBaseUrl(req: NextRequest): string {
  return process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || `${req.nextUrl.protocol}//${req.nextUrl.host}`;
}

function redirectTo(path: string, req: NextRequest): NextResponse {
  return NextResponse.redirect(new URL(path, getBaseUrl(req)));
}

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
    return redirectTo('/dashboard/stores?error=missing_params', req);
  }

  if (state !== savedState) {
    return redirectTo('/dashboard/stores?error=invalid_state', req);
  }

  if (!creatorId) {
    return redirectTo('/dashboard/stores?error=session_expired', req);
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
    return redirectTo('/dashboard/stores?error=invalid_hmac', req);
  }

  // Exchange code for expiring offline access token
  const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      expiring: 1, // Request expiring token (required since 2025)
    }),
  });

  if (!tokenRes.ok) {
    console.error('[Shopify OAuth] Token exchange failed:', await tokenRes.text());
    return redirectTo('/dashboard/stores?error=token_exchange', req);
  }

  const tokenData = await tokenRes.json();
  const { access_token, scope, refresh_token } = tokenData;
  // Expiring tokens: access_token ~1h, refresh_token ~90 days
  const expiresIn = tokenData.expires_in as number | undefined;
  const refreshTokenExpiresIn = tokenData.refresh_token_expires_in as number | undefined;
  const tokenExpiresAt = expiresIn
    ? new Date(Date.now() + expiresIn * 1000).toISOString()
    : null;

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
        refresh_token: refresh_token || null,
        scopes: scope?.split(',') || [],
        status: 'connected',
        token_expires_at: tokenExpiresAt,
        metadata: {
          expires_in: expiresIn,
          refresh_token_expires_in: refreshTokenExpiresIn,
          token_type: 'expiring',
        },
        connected_at: new Date().toISOString(),
      },
      { onConflict: 'creator_id,platform' }
    );

  if (upsertError) {
    console.error('[Shopify OAuth] Upsert error:', upsertError);
    return redirectTo('/dashboard/stores?error=save_failed', req);
  }

  // Register order webhooks (best-effort, don't fail OAuth on error)
  try {
    const webhookAddress = `${getBaseUrl(req)}/api/webhooks/shopify/orders`;
    const topics = ['orders/create', 'orders/paid'];

    for (const topic of topics) {
      const whRes = await fetch(
        `https://${shop}/admin/api/${API_VERSION}/webhooks.json`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': access_token,
          },
          body: JSON.stringify({
            webhook: { topic, address: webhookAddress, format: 'json' },
          }),
        },
      );
      if (!whRes.ok) {
        const errText = await whRes.text();
        console.warn(`[Shopify OAuth] Webhook ${topic} registration failed:`, whRes.status, errText);
      } else {
        console.log(`[Shopify OAuth] Registered webhook: ${topic}`);
      }
    }
  } catch (e) {
    console.error('[Shopify OAuth] Webhook registration error:', e);
  }

  // Clear OAuth cookies
  const response = redirectTo('/dashboard/stores?connected=shopify', req);
  response.cookies.delete('shopify_oauth_state');
  response.cookies.delete('shopify_oauth_creator');
  response.cookies.delete('shopify_oauth_shop');

  return response;
}
