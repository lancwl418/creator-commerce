import { NextRequest, NextResponse } from 'next/server';
import {
  SHOPIFY_OAUTH_COOKIES,
  SHOPIFY_OAUTH_COOKIE_MAX_AGE,
  buildAuthorizeUrl,
  createOAuthState,
  isValidShopDomain,
  shopifyAppConfigFromEnv,
} from '@creator-commerce/shared/shopify';
import { getCurrentSeller } from '@/lib/queries/sellers';
import { getRequestOrigin } from '@/lib/request-origin';

const OAUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax' as const,
  maxAge: SHOPIFY_OAUTH_COOKIE_MAX_AGE,
  path: '/',
};

/** GET /api/shopify/auth?shop=mystore.myshopify.com：跳到 Shopify 授权页 */
export async function GET(req: NextRequest) {
  const shop = req.nextUrl.searchParams.get('shop')?.trim();
  if (!shop || !isValidShopDomain(shop)) {
    return NextResponse.redirect(new URL('/stores?error=invalid_shop', await getRequestOrigin()));
  }

  const seller = await getCurrentSeller();
  if (!seller) {
    return NextResponse.redirect(new URL('/login?next=/stores', await getRequestOrigin()));
  }

  // 回调必须回到 cn-portal 自己的域名，并且该地址要在 Shopify App 的回调白名单里
  const config = shopifyAppConfigFromEnv();
  const state = createOAuthState();
  const redirectUri = `${await getRequestOrigin()}/api/shopify/callback`;

  const response = NextResponse.redirect(buildAuthorizeUrl(config, shop, redirectUri, state));
  response.cookies.set(SHOPIFY_OAUTH_COOKIES.state, state, OAUTH_COOKIE_OPTIONS);
  response.cookies.set(SHOPIFY_OAUTH_COOKIES.creator, seller.id, OAUTH_COOKIE_OPTIONS);
  response.cookies.set(SHOPIFY_OAUTH_COOKIES.shop, shop, OAUTH_COOKIE_OPTIONS);
  return response;
}
