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
import { getCurrentSeller } from '@/lib/queries/sellers';
import { getRequestOrigin } from '@/lib/request-origin';
import { getOrderWebhookBaseUrl } from '@/lib/shopify';
import { createClient } from '@/lib/supabase/server';

async function redirectTo(path: string): Promise<NextResponse> {
  return NextResponse.redirect(new URL(path, await getRequestOrigin()));
}

/** GET /api/shopify/callback：商家在 Shopify 同意授权后回到这里 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get('code');
  const shop = searchParams.get('shop');
  const state = searchParams.get('state');

  const savedState = req.cookies.get(SHOPIFY_OAUTH_COOKIES.state)?.value;
  const creatorId = req.cookies.get(SHOPIFY_OAUTH_COOKIES.creator)?.value;

  if (!code || !shop || !state || !searchParams.get('hmac')) return redirectTo('/stores?error=missing_params');
  if (state !== savedState) return redirectTo('/stores?error=invalid_state');

  // 授权 cookie 里的卖家必须就是当前登录的卖家
  const seller = await getCurrentSeller();
  if (!creatorId || !seller || seller.id !== creatorId) return redirectTo('/stores?error=session_expired');

  const config = shopifyAppConfigFromEnv();
  if (!verifyOAuthHmac(config, searchParams)) return redirectTo('/stores?error=invalid_hmac');

  let grant;
  try {
    grant = await exchangeAccessToken(config, shop, code);
  } catch (error) {
    console.error('[Shopify OAuth] Token exchange failed', error);
    return redirectTo('/stores?error=token_exchange');
  }

  const storeName = await fetchShopName(config, shop, grant.accessToken);
  const supabase = await createClient();
  const { error } = await supabase
    .from('creator_store_connections')
    .upsert(buildStoreConnection(seller.id, shop, storeName, grant), { onConflict: 'creator_id,platform' });
  if (error) {
    console.error('[Shopify OAuth] Failed to save store connection', error);
    return redirectTo('/stores?error=save_failed');
  }

  // 订单 webhook 指向 Creator Portal；没配地址时跳过，不影响授权
  const webhookBaseUrl = getOrderWebhookBaseUrl();
  if (webhookBaseUrl) {
    const results = await registerOrderWebhooks(config, shop, grant.accessToken, `${webhookBaseUrl}/api/webhooks/shopify/orders`);
    for (const result of results.filter((r) => !r.ok)) {
      console.warn(`[Shopify OAuth] Webhook ${result.topic} registration failed`, result.status, result.error);
    }
  } else {
    console.warn('[Shopify OAuth] SHOPIFY_WEBHOOK_BASE_URL / APP_URL not set; order webhooks not registered');
  }

  const response = await redirectTo('/stores?connected=shopify');
  response.cookies.delete(SHOPIFY_OAUTH_COOKIES.state);
  response.cookies.delete(SHOPIFY_OAUTH_COOKIES.creator);
  response.cookies.delete(SHOPIFY_OAUTH_COOKIES.shop);
  return response;
}
