import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const API_VERSION = process.env.SHOPIFY_API_VERSION ?? '2024-10';
const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID ?? '';
const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET ?? '';

/**
 * POST /api/orders/:id/fulfill
 * Push fulfillment info to Shopify store.
 *
 * Body: {
 *   tracking_number: string,
 *   tracking_url?: string,
 *   carrier: string,
 *   line_item_ids?: string[], // specific items, or all if omitted
 *   note?: string,
 * }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: creator } = await supabase
    .from('creators')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();
  if (!creator) {
    return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
  }

  const { data: order } = await supabase
    .from('creator_orders')
    .select(`
      *,
      creator_store_connections (id, store_url, access_token, refresh_token, token_expires_at),
      creator_order_items (shopify_line_item_id)
    `)
    .eq('id', id)
    .eq('creator_id', creator.id)
    .single();

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const body = await req.json();
  const { tracking_number, tracking_url, carrier, note } = body;

  if (!tracking_number || !carrier) {
    return NextResponse.json({ error: 'tracking_number and carrier are required' }, { status: 400 });
  }

  const conn = order.creator_store_connections;
  if (!conn?.access_token) {
    return NextResponse.json({ error: 'Store not connected' }, { status: 400 });
  }

  // Refresh token if needed
  let accessToken = conn.access_token;
  if (conn.token_expires_at && new Date(conn.token_expires_at) <= new Date()) {
    if (!conn.refresh_token) {
      return NextResponse.json({ error: 'Token expired, please reconnect store' }, { status: 401 });
    }
    const shopDomain = conn.store_url?.replace('https://', '').replace('http://', '').replace(/\/$/, '');
    const refreshRes = await fetch(`https://${shopDomain}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: SHOPIFY_CLIENT_ID,
        client_secret: SHOPIFY_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: conn.refresh_token,
      }),
    });
    if (!refreshRes.ok) {
      return NextResponse.json({ error: 'Token refresh failed' }, { status: 401 });
    }
    const refreshData = await refreshRes.json();
    accessToken = refreshData.access_token;
  }

  const shopDomain = conn.store_url?.replace('https://', '').replace('http://', '').replace(/\/$/, '');

  // Get fulfillment orders from Shopify (required for fulfillment API)
  const foRes = await fetch(
    `https://${shopDomain}/admin/api/${API_VERSION}/orders/${order.shopify_order_id}/fulfillment_orders.json`,
    { headers: { 'X-Shopify-Access-Token': accessToken } },
  );

  if (!foRes.ok) {
    return NextResponse.json({ error: 'Failed to get fulfillment orders from Shopify' }, { status: 502 });
  }

  const foData = await foRes.json();
  const fulfillmentOrders = (foData.fulfillment_orders || []) as {
    id: number;
    line_items: { id: number; fulfillable_quantity: number }[];
  }[];

  if (fulfillmentOrders.length === 0) {
    return NextResponse.json({ error: 'No fulfillment orders found' }, { status: 400 });
  }

  // Create fulfillment via Shopify API
  const fulfillmentPayload = {
    fulfillment: {
      line_items_by_fulfillment_order: fulfillmentOrders.map(fo => ({
        fulfillment_order_id: fo.id,
        fulfillment_order_line_items: fo.line_items
          .filter(li => li.fulfillable_quantity > 0)
          .map(li => ({
            id: li.id,
            quantity: li.fulfillable_quantity,
          })),
      })).filter(fo => fo.fulfillment_order_line_items.length > 0),
      tracking_info: {
        number: tracking_number,
        url: tracking_url || undefined,
        company: carrier,
      },
      notify_customer: true,
    },
  };

  const fulfillRes = await fetch(
    `https://${shopDomain}/admin/api/${API_VERSION}/fulfillments.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      body: JSON.stringify(fulfillmentPayload),
    },
  );

  if (!fulfillRes.ok) {
    const errText = await fulfillRes.text();
    console.error('[Fulfillment] Shopify API error:', fulfillRes.status, errText);
    return NextResponse.json({ error: `Shopify fulfillment failed: ${errText}` }, { status: fulfillRes.status });
  }

  const fulfillData = await fulfillRes.json();
  const shopifyFulfillmentId = fulfillData.fulfillment?.id;

  // Save fulfillment record
  await supabase.from('creator_order_fulfillments').insert({
    creator_order_id: id,
    shopify_fulfillment_id: shopifyFulfillmentId ? String(shopifyFulfillmentId) : null,
    tracking_number,
    tracking_url: tracking_url || null,
    carrier,
    status: 'shipped',
    fulfilled_at: new Date().toISOString(),
    pushed_to_shopify: true,
    pushed_to_erp: false, // TODO: push to ERP when API ready
    line_item_ids: (order.creator_order_items || []).map((i: { shopify_line_item_id: string }) => i.shopify_line_item_id),
  });

  // Update order status
  await supabase.from('creator_orders').update({
    fulfillment_status: 'fulfilled',
  }).eq('id', id);

  // Audit log
  await supabase.from('creator_order_logs').insert({
    creator_order_id: id,
    action: 'fulfilled',
    source: 'system',
    changes: { tracking_number, carrier, tracking_url, shopify_fulfillment_id: shopifyFulfillmentId },
    note: note || null,
    created_by: user.id,
  });

  console.log(`[Fulfillment] Order ${order.shopify_order_name} fulfilled: ${carrier} ${tracking_number}`);

  return NextResponse.json({
    success: true,
    shopify_fulfillment_id: shopifyFulfillmentId,
    tracking_number,
    carrier,
  });
}
