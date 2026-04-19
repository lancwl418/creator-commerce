import { createServiceClient } from '@/lib/supabase/service';

const API_VERSION = process.env.SHOPIFY_API_VERSION ?? '2024-10';
const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID ?? '';
const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET ?? '';

interface FulfillmentInput {
  orderId: string;  // our creator_order.id
  lineItemIds: string[];  // shopify_line_item_id[] to fulfill
  trackingNumber: string;
  carrier: string;
  trackingUrl?: string;
  note?: string;
  source: 'erp' | 'manual' | 'system';
  createdBy?: string;  // user id for manual
}

interface FulfillmentResult {
  success: boolean;
  shopifyFulfillmentId?: string;
  error?: string;
}

/**
 * Shared fulfillment logic: push partial fulfillment to Shopify for specific line items.
 * Used by both ERP webhook and manual UI.
 */
export async function pushFulfillmentToShopify(input: FulfillmentInput): Promise<FulfillmentResult> {
  const supabase = createServiceClient();

  // Get order with store connection
  const { data: order } = await supabase
    .from('creator_orders')
    .select(`
      *,
      creator_store_connections (id, store_url, access_token, refresh_token, token_expires_at),
      creator_order_items (shopify_line_item_id)
    `)
    .eq('id', input.orderId)
    .single();

  if (!order) return { success: false, error: 'Order not found' };

  const conn = order.creator_store_connections;
  if (!conn?.access_token) return { success: false, error: 'Store not connected' };

  // Refresh token if needed
  let accessToken = conn.access_token;
  const shopDomain = conn.store_url?.replace('https://', '').replace('http://', '').replace(/\/$/, '');

  if (conn.token_expires_at && new Date(conn.token_expires_at) <= new Date()) {
    if (!conn.refresh_token) return { success: false, error: 'Token expired' };
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
    if (!refreshRes.ok) return { success: false, error: 'Token refresh failed' };
    const refreshData = await refreshRes.json();
    accessToken = refreshData.access_token;
    await supabase.from('creator_store_connections').update({
      access_token: refreshData.access_token,
      refresh_token: refreshData.refresh_token || conn.refresh_token,
      token_expires_at: refreshData.expires_in
        ? new Date(Date.now() + refreshData.expires_in * 1000).toISOString()
        : conn.token_expires_at,
    }).eq('id', conn.id);
  }

  // Get fulfillment orders from Shopify
  const foRes = await fetch(
    `https://${shopDomain}/admin/api/${API_VERSION}/orders/${order.shopify_order_id}/fulfillment_orders.json`,
    { headers: { 'X-Shopify-Access-Token': accessToken } },
  );

  if (!foRes.ok) return { success: false, error: 'Failed to get fulfillment orders' };

  const foData = await foRes.json();
  const fulfillmentOrders = (foData.fulfillment_orders || []) as {
    id: number;
    line_items: { id: number; fulfillable_quantity: number; line_item_id: number }[];
  }[];

  // Map our shopify_line_item_ids to fulfillment_order_line_items
  const targetLineItemIds = new Set(input.lineItemIds);

  const lineItemsByFO = fulfillmentOrders
    .map(fo => ({
      fulfillment_order_id: fo.id,
      fulfillment_order_line_items: fo.line_items
        .filter(li => li.fulfillable_quantity > 0 && targetLineItemIds.has(String(li.line_item_id)))
        .map(li => ({ id: li.id, quantity: li.fulfillable_quantity })),
    }))
    .filter(fo => fo.fulfillment_order_line_items.length > 0);

  if (lineItemsByFO.length === 0) {
    return { success: false, error: 'No fulfillable items found for the specified line items' };
  }

  // Push fulfillment to Shopify
  const fulfillRes = await fetch(
    `https://${shopDomain}/admin/api/${API_VERSION}/fulfillments.json`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': accessToken },
      body: JSON.stringify({
        fulfillment: {
          line_items_by_fulfillment_order: lineItemsByFO,
          tracking_info: {
            number: input.trackingNumber,
            url: input.trackingUrl || undefined,
            company: input.carrier,
          },
          notify_customer: true,
        },
      }),
    },
  );

  if (!fulfillRes.ok) {
    const errText = await fulfillRes.text();
    console.error('[Fulfillment] Shopify error:', fulfillRes.status, errText);
    return { success: false, error: `Shopify: ${errText}` };
  }

  const fulfillData = await fulfillRes.json();
  const shopifyFulfillmentId = fulfillData.fulfillment?.id ? String(fulfillData.fulfillment.id) : null;

  // Save fulfillment record
  await supabase.from('creator_order_fulfillments').insert({
    creator_order_id: input.orderId,
    shopify_fulfillment_id: shopifyFulfillmentId,
    tracking_number: input.trackingNumber,
    tracking_url: input.trackingUrl || null,
    carrier: input.carrier,
    status: 'shipped',
    fulfilled_at: new Date().toISOString(),
    pushed_to_shopify: true,
    pushed_to_erp: input.source === 'erp',
    line_item_ids: input.lineItemIds,
  });

  // Check if all our items are fulfilled
  const allOurItems = (order.creator_order_items || []).map((i: { shopify_line_item_id: string }) => i.shopify_line_item_id);
  const { data: allFulfillments } = await supabase
    .from('creator_order_fulfillments')
    .select('line_item_ids')
    .eq('creator_order_id', input.orderId);

  const fulfilledItemIds = new Set<string>();
  for (const f of allFulfillments || []) {
    for (const id of (f.line_item_ids as string[]) || []) {
      fulfilledItemIds.add(id);
    }
  }
  const allFulfilled = allOurItems.every((id: string) => fulfilledItemIds.has(id));

  await supabase.from('creator_orders').update({
    fulfillment_status: allFulfilled ? 'fulfilled' : 'partial',
  }).eq('id', input.orderId);

  // Audit log
  await supabase.from('creator_order_logs').insert({
    creator_order_id: input.orderId,
    action: 'fulfilled',
    source: input.source,
    changes: {
      tracking_number: input.trackingNumber,
      carrier: input.carrier,
      tracking_url: input.trackingUrl,
      line_items: input.lineItemIds,
      shopify_fulfillment_id: shopifyFulfillmentId,
      all_fulfilled: allFulfilled,
    },
    note: input.note || null,
    created_by: input.createdBy || null,
  });

  console.log(`[Fulfillment] Order ${order.shopify_order_name}: ${input.lineItemIds.length} items → ${input.carrier} ${input.trackingNumber} (${input.source})`);

  return { success: true, shopifyFulfillmentId: shopifyFulfillmentId || undefined };
}
