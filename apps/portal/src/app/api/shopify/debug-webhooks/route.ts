import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SHOPIFY_API_VERSION, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET } from '@/lib/constants';

/**
 * GET /api/shopify/debug-webhooks?store_connection_id=xxx
 *
 * Lists all registered webhooks on a connected Shopify store.
 * For debugging webhook registration issues.
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: creator } = await supabase
    .from('creators')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();
  if (!creator) return NextResponse.json({ error: 'Creator not found' }, { status: 404 });

  const storeConnectionId = req.nextUrl.searchParams.get('store_connection_id');
  if (!storeConnectionId) return NextResponse.json({ error: 'Missing store_connection_id' }, { status: 400 });

  const { data: connection } = await supabase
    .from('creator_store_connections')
    .select('*')
    .eq('id', storeConnectionId)
    .eq('creator_id', creator.id)
    .single();

  if (!connection) return NextResponse.json({ error: 'Connection not found' }, { status: 404 });

  // Refresh token if needed
  let accessToken = connection.access_token;
  if (connection.token_expires_at && new Date(connection.token_expires_at) <= new Date()) {
    if (!connection.refresh_token) {
      return NextResponse.json({ error: 'Token expired' }, { status: 401 });
    }
    const shopDomain = connection.store_url?.replace('https://', '').replace('http://', '').replace(/\/$/, '');
    const refreshRes = await fetch(`https://${shopDomain}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: SHOPIFY_CLIENT_ID,
        client_secret: SHOPIFY_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: connection.refresh_token,
      }),
    });
    if (!refreshRes.ok) return NextResponse.json({ error: 'Token refresh failed' }, { status: 401 });
    const refreshData = await refreshRes.json();
    accessToken = refreshData.access_token;
  }

  const shopDomain = connection.store_url?.replace('https://', '').replace('http://', '').replace(/\/$/, '');

  // List webhooks
  const res = await fetch(`https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/webhooks.json`, {
    headers: { 'X-Shopify-Access-Token': accessToken },
  });

  if (!res.ok) {
    return NextResponse.json({ error: `Shopify API error: ${res.status}`, body: await res.text() }, { status: res.status });
  }

  const data = await res.json();

  return NextResponse.json({
    store: shopDomain,
    scopes: connection.scopes,
    webhooks: (data.webhooks || []).map((w: Record<string, unknown>) => ({
      id: w.id,
      topic: w.topic,
      address: w.address,
      created_at: w.created_at,
    })),
  });
}
