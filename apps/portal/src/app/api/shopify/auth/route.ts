import { NextRequest, NextResponse } from 'next/server';
import {
  SHOPIFY_OAUTH_COOKIES,
  SHOPIFY_OAUTH_COOKIE_MAX_AGE,
  buildAuthorizeUrl,
  createOAuthState,
  isValidShopDomain,
  shopifyAppConfigFromEnv,
} from '@creator-commerce/shared/shopify';
import { createClient } from '@/lib/supabase/server';

function getAppUrl(req: NextRequest): string {
  // APP_URL (runtime) takes priority, then NEXT_PUBLIC_APP_URL (build-time inline)
  return process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || `${req.nextUrl.protocol}//${req.nextUrl.host}`;
}

const OAUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax' as const,
  maxAge: SHOPIFY_OAUTH_COOKIE_MAX_AGE,
  path: '/',
};

/**
 * GET /api/shopify/auth?shop=mystore.myshopify.com
 * Initiates Shopify OAuth flow.
 */
export async function GET(req: NextRequest) {
  const shop = req.nextUrl.searchParams.get('shop')?.trim();

  if (!shop || !isValidShopDomain(shop)) {
    return NextResponse.json({ error: 'Invalid shop domain. Use format: mystore.myshopify.com' }, { status: 400 });
  }

  let config;
  try {
    config = shopifyAppConfigFromEnv();
  } catch {
    return NextResponse.json({ error: 'Shopify app not configured' }, { status: 500 });
  }

  // Verify user is authenticated
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL('/login', getAppUrl(req)));
  }

  const { data: creator } = await supabase
    .from('creators')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  if (!creator) {
    return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
  }

  const state = createOAuthState();
  const redirectUri = `${getAppUrl(req)}/api/shopify/callback`;
  const authUrl = buildAuthorizeUrl(config, shop, redirectUri, state);

  console.log('[Shopify OAuth] Auth URL:', authUrl);
  console.log('[Shopify OAuth] Scopes:', config.scopes);
  console.log('[Shopify OAuth] Redirect URI:', redirectUri);

  // Store state and creator_id in cookies for callback verification
  const response = NextResponse.redirect(authUrl);
  response.cookies.set(SHOPIFY_OAUTH_COOKIES.state, state, OAUTH_COOKIE_OPTIONS);
  response.cookies.set(SHOPIFY_OAUTH_COOKIES.creator, creator.id, OAUTH_COOKIE_OPTIONS);
  response.cookies.set(SHOPIFY_OAUTH_COOKIES.shop, shop, OAUTH_COOKIE_OPTIONS);
  return response;
}
