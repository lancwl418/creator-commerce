import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

const API_VERSION = process.env.SHOPIFY_API_VERSION ?? '2024-10';
const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID ?? '';
const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET ?? '';

/**
 * POST /api/shopify/fetch-orders
 * Body: { store_connection_id }
 *
 * Manually fetches all orders from a connected Shopify store and processes
 * them the same way as the webhook handler. Useful for:
 * - Initial sync of existing orders
 * - Debugging webhook issues
 * - Recovering missed webhooks
 */
export async function POST(req: NextRequest) {
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

  const { store_connection_id } = await req.json();
  if (!store_connection_id) {
    return NextResponse.json({ error: 'Missing store_connection_id' }, { status: 400 });
  }

  // Fetch store connection (verify ownership)
  const { data: connection } = await supabase
    .from('creator_store_connections')
    .select('*')
    .eq('id', store_connection_id)
    .eq('creator_id', creator.id)
    .single();

  if (!connection) {
    return NextResponse.json({ error: 'Store connection not found' }, { status: 404 });
  }

  // Refresh token if expired
  const shopDomain = connection.store_url?.replace('https://', '').replace('http://', '').replace(/\/$/, '');
  let accessToken = connection.access_token;
  if (connection.token_expires_at && new Date(connection.token_expires_at) <= new Date()) {
    if (!connection.refresh_token) {
      return NextResponse.json({ error: 'Token expired, please reconnect' }, { status: 401 });
    }
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
    if (!refreshRes.ok) {
      return NextResponse.json({ error: 'Token refresh failed, please reconnect' }, { status: 401 });
    }
    const refreshData = await refreshRes.json();
    accessToken = refreshData.access_token;
    await supabase.from('creator_store_connections').update({
      access_token: refreshData.access_token,
      refresh_token: refreshData.refresh_token || connection.refresh_token,
      token_expires_at: refreshData.expires_in
        ? new Date(Date.now() + refreshData.expires_in * 1000).toISOString()
        : connection.token_expires_at,
    }).eq('id', store_connection_id);
  }

  const serviceSupabase = createServiceClient();

  // Fetch orders from Shopify (paginated, up to 250 per page)
  let allOrders: Record<string, unknown>[] = [];
  let pageUrl: string | null = `https://${shopDomain}/admin/api/${API_VERSION}/orders.json?status=any&limit=250`;

  while (pageUrl) {
    const res = await fetch(pageUrl, {
      headers: { 'X-Shopify-Access-Token': accessToken },
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: `Shopify API error (${res.status}): ${errText}` }, { status: res.status });
    }

    const data = await res.json();
    allOrders = [...allOrders, ...(data.orders || [])];

    // Check Link header for next page
    const linkHeader = res.headers.get('link');
    const nextMatch = linkHeader?.match(/<([^>]+)>;\s*rel="next"/);
    pageUrl = nextMatch ? nextMatch[1] : null;
  }

  // Process each order using the same logic as the webhook handler
  let processed = 0;
  let skipped = 0;
  let matched = 0;

  for (const order of allOrders) {
    const lineItems = (order.line_items || []) as Record<string, unknown>[];

    // Match line items to our products
    const matchedItems: {
      item: Record<string, unknown>;
      variant: { id: string; sale_price: number; base_cost_snapshot: number };
    }[] = [];

    for (const item of lineItems) {
      const shopifyVariantId = item.variant_id ? String(item.variant_id) : null;
      if (!shopifyVariantId) continue;

      const { data: variants } = await serviceSupabase
        .from('channel_listing_variants')
        .select('id, sale_price, base_cost_snapshot, channel_listing_id')
        .eq('external_variant_id', shopifyVariantId)
        .limit(5);

      if (!variants || variants.length === 0) continue;

      for (const v of variants) {
        const { data: listing } = await serviceSupabase
          .from('channel_listings')
          .select('creator_store_connection_id')
          .eq('id', v.channel_listing_id)
          .single();

        if (listing?.creator_store_connection_id === connection.id) {
          matchedItems.push({
            item,
            variant: {
              id: v.id,
              sale_price: Number(v.sale_price),
              base_cost_snapshot: Number(v.base_cost_snapshot),
            },
          });
          break;
        }
      }
    }

    if (matchedItems.length === 0) {
      skipped++;
      continue;
    }

    // Upsert order
    const customer = order.customer as Record<string, unknown> | null;
    const shippingAddress = order.shipping_address as Record<string, unknown> | null;

    const { data: creatorOrder, error: orderError } = await serviceSupabase
      .from('creator_orders')
      .upsert({
        creator_id: creator.id,
        creator_store_connection_id: connection.id,
        shopify_order_id: String(order.id),
        shopify_order_number: String(order.order_number || ''),
        shopify_order_name: String(order.name || ''),
        financial_status: String(order.financial_status || 'pending'),
        fulfillment_status: order.fulfillment_status ? String(order.fulfillment_status) : null,
        total_price: parseFloat(String(order.total_price)) || 0,
        subtotal_price: parseFloat(String(order.subtotal_price)) || 0,
        total_tax: parseFloat(String(order.total_tax)) || 0,
        currency: String(order.currency || 'USD'),
        customer_email: customer?.email ? String(customer.email) : null,
        customer_name: customer
          ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
          : null,
        shipping_address: shippingAddress
          ? { country: shippingAddress.country, province: shippingAddress.province, city: shippingAddress.city }
          : {},
        order_placed_at: order.created_at ? String(order.created_at) : new Date().toISOString(),
      }, { onConflict: 'shopify_order_id,creator_store_connection_id' })
      .select('id')
      .single();

    if (orderError || !creatorOrder) {
      console.error('[Fetch Orders] Failed to upsert order:', orderError);
      continue;
    }

    // Insert matched line items
    for (const { item, variant } of matchedItems) {
      const quantity = Number(item.quantity) || 1;
      const unitPrice = parseFloat(String(item.price)) || 0;
      const lineItemId = item.id ? String(item.id) : null;

      if (lineItemId) {
        const { data: existing } = await serviceSupabase
          .from('creator_order_items')
          .select('id')
          .eq('creator_order_id', creatorOrder.id)
          .eq('shopify_line_item_id', lineItemId)
          .single();

        if (existing) continue;
      }

      await serviceSupabase.from('creator_order_items').insert({
        creator_order_id: creatorOrder.id,
        channel_listing_variant_id: variant.id,
        shopify_line_item_id: lineItemId,
        shopify_variant_id: item.variant_id ? String(item.variant_id) : null,
        shopify_product_id: item.product_id ? String(item.product_id) : null,
        title: String(item.title || ''),
        variant_title: item.variant_title ? String(item.variant_title) : null,
        sku: item.sku ? String(item.sku) : null,
        quantity,
        unit_price: unitPrice,
        total_price: unitPrice * quantity,
        sale_price_snapshot: variant.sale_price,
        base_cost_snapshot: variant.base_cost_snapshot,
        earnings_amount: (variant.sale_price - variant.base_cost_snapshot) * quantity,
      });

      matched++;
    }

    processed++;
  }

  return NextResponse.json({
    success: true,
    total_shopify_orders: allOrders.length,
    orders_with_our_products: processed,
    orders_skipped: skipped,
    line_items_matched: matched,
  });
}
