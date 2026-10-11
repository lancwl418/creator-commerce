import { NextRequest, NextResponse } from 'next/server';
import {
  SHOPIFY_OAUTH_COOKIES,
  buildStoreConnection,
  exchangeAccessToken,
  fetchShopName,
  registerOrderWebhooks,
  shopifyAppConfigFromEnv,
  verifyOAuthHmac,
} from '@creator-commerce/shared/shopify';
import { createClient } from '@/lib/supabase/server';

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
  const savedState = req.cookies.get(SHOPIFY_OAUTH_COOKIES.state)?.value;
  const creatorId = req.cookies.get(SHOPIFY_OAUTH_COOKIES.creator)?.value;

  if (!code || !shop || !state || !hmac) {
    return redirectTo('/dashboard/stores?error=missing_params', req);
  }

  if (state !== savedState) {
    return redirectTo('/dashboard/stores?error=invalid_state', req);
  }

  if (!creatorId) {
    return redirectTo('/dashboard/stores?error=session_expired', req);
  }

  const config = shopifyAppConfigFromEnv();
  if (!verifyOAuthHmac(config, searchParams)) {
    return redirectTo('/dashboard/stores?error=invalid_hmac', req);
  }

  let grant;
  try {
    grant = await exchangeAccessToken(config, shop, code);
  } catch (error) {
    console.error('[Shopify OAuth] Token exchange failed:', error);
    return redirectTo('/dashboard/stores?error=token_exchange', req);
  }

  const storeName = await fetchShopName(config, shop, grant.accessToken);

  // Upsert store connection
  const supabase = await createClient();
  const { error: upsertError } = await supabase
    .from('creator_store_connections')
    .upsert(buildStoreConnection(creatorId, shop, storeName, grant), { onConflict: 'creator_id,platform' });

  if (upsertError) {
    console.error('[Shopify OAuth] Upsert error:', upsertError);
    return redirectTo('/dashboard/stores?error=save_failed', req);
  }

  // Register order webhooks (best-effort, don't fail OAuth on error)
  const webhookAddress = `${getBaseUrl(req)}/api/webhooks/shopify/orders`;
  for (const result of await registerOrderWebhooks(config, shop, grant.accessToken, webhookAddress)) {
    if (result.ok) console.log(`[Shopify OAuth] Registered webhook: ${result.topic}`);
    else console.warn(`[Shopify OAuth] Webhook ${result.topic} registration failed:`, result.status, result.error);
  }

  // Clear OAuth cookies
  const response = redirectTo('/dashboard/stores?connected=shopify', req);
  response.cookies.delete(SHOPIFY_OAUTH_COOKIES.state);
  response.cookies.delete(SHOPIFY_OAUTH_COOKIES.creator);
  response.cookies.delete(SHOPIFY_OAUTH_COOKIES.shop);

  return response;
}
