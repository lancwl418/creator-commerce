import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

const CLIENT_ID = process.env.SHOPIFY_CLIENT_ID ?? '';
const SCOPES = process.env.SHOPIFY_SCOPES ?? 'write_products,read_products';

function getAppUrl(req: NextRequest): string {
  // APP_URL (runtime) takes priority, then NEXT_PUBLIC_APP_URL (build-time inline)
  return process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || `${req.nextUrl.protocol}//${req.nextUrl.host}`;
}

/**
 * GET /api/shopify/auth?shop=mystore.myshopify.com
 * Initiates Shopify OAuth flow.
 */
export async function GET(req: NextRequest) {
  const shop = req.nextUrl.searchParams.get('shop')?.trim();

  if (!shop || !/^[a-zA-Z0-9][a-zA-Z0-9\-]*\.myshopify\.com$/.test(shop)) {
    return NextResponse.json({ error: 'Invalid shop domain. Use format: mystore.myshopify.com' }, { status: 400 });
  }

  if (!CLIENT_ID) {
    return NextResponse.json({ error: 'Shopify app not configured' }, { status: 500 });
  }

  // Verify user is authenticated
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const { data: creator } = await supabase
    .from('creators')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  if (!creator) {
    return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
  }

  // Generate state nonce
  const state = crypto.randomBytes(16).toString('hex');
  const appUrl = getAppUrl(req);
  const redirectUri = `${appUrl}/api/shopify/callback`;

  const authUrl = `https://${shop}/admin/oauth/authorize?` +
    `client_id=${CLIENT_ID}&` +
    `scope=${encodeURIComponent(SCOPES)}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `state=${state}`;

  const response = NextResponse.redirect(authUrl);

  // Store state and creator_id in cookies for callback verification
  response.cookies.set('shopify_oauth_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  });
  response.cookies.set('shopify_oauth_creator', creator.id, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  });
  response.cookies.set('shopify_oauth_shop', shop, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  });

  return response;
}
