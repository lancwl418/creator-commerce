import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServiceClient } from '@/lib/supabase/service';

const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET ?? '';

/**
 * POST /api/webhooks/shopify/orders
 *
 * Receives Shopify order webhooks (orders/create, orders/paid, orders/updated).
 * Verifies HMAC signature, matches line items to our channel_listing_variants,
 * calculates earnings, and stores in creator_orders + creator_order_items.
 */
export async function POST(req: NextRequest) {
  // Read raw body for HMAC verification
  const rawBody = await req.text();

  // Verify HMAC
  const hmacHeader = req.headers.get('x-shopify-hmac-sha256') || '';
  const expectedHmac = crypto
    .createHmac('sha256', SHOPIFY_CLIENT_SECRET)
    .update(rawBody, 'utf8')
    .digest('base64');

  if (hmacHeader !== expectedHmac) {
    console.error('[Webhook] HMAC verification failed');
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const topic = req.headers.get('x-shopify-topic') || '';
  const shopDomain = req.headers.get('x-shopify-shop-domain') || '';

  console.log(`[Webhook] Received ${topic} from ${shopDomain}`);

  try {
    const order = JSON.parse(rawBody);
    const supabase = createServiceClient();

    // Find the store connection by shop domain
    const { data: connection } = await supabase
      .from('creator_store_connections')
      .select('id, creator_id')
      .or(`store_url.eq.https://${shopDomain},store_url.eq.https://${shopDomain}/`)
      .eq('status', 'connected')
      .single();

    if (!connection) {
      console.warn(`[Webhook] No store connection found for ${shopDomain}`);
      return new NextResponse('OK', { status: 200 });
    }

    if (topic === 'orders/create' || topic === 'orders/paid' || topic === 'orders/updated') {
      await processOrder(supabase, connection, order);
    }

    return new NextResponse('OK', { status: 200 });
  } catch (err) {
    console.error('[Webhook] Processing error:', err);
    // Return 200 to prevent Shopify from retrying on our logic errors
    return new NextResponse('OK', { status: 200 });
  }
}

async function processOrder(
  supabase: ReturnType<typeof createServiceClient>,
  connection: { id: string; creator_id: string },
  order: Record<string, unknown>,
) {
  const shopifyOrderId = String(order.id);
  const lineItems = (order.line_items || []) as Record<string, unknown>[];

  // First pass: match line items to our products, skip orders with no matches
  const matchedItems: {
    item: Record<string, unknown>;
    variant: { id: string; sale_price: number; base_cost_snapshot: number };
  }[] = [];

  for (const item of lineItems) {
    const shopifyVariantId = item.variant_id ? String(item.variant_id) : null;
    if (!shopifyVariantId) continue;

    const { data } = await supabase
      .from('channel_listing_variants')
      .select('id, sale_price, base_cost_snapshot, channel_listing_id')
      .eq('external_variant_id', shopifyVariantId)
      .limit(5);

    if (!data || data.length === 0) continue;

    for (const v of data) {
      const { data: listing } = await supabase
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

  // No matched products → skip this order entirely
  if (matchedItems.length === 0) {
    console.log(`[Webhook] Order ${order.name} has no platform products, skipping`);
    return;
  }

  // Create/update the order (only for orders containing our products)
  const customer = order.customer as Record<string, unknown> | null;
  const shippingAddress = order.shipping_address as Record<string, unknown> | null;

  const { data: creatorOrder, error: orderError } = await supabase
    .from('creator_orders')
    .upsert({
      creator_id: connection.creator_id,
      creator_store_connection_id: connection.id,
      shopify_order_id: shopifyOrderId,
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
        ? {
            name: shippingAddress.name,
            address1: shippingAddress.address1,
            address2: shippingAddress.address2,
            city: shippingAddress.city,
            province: shippingAddress.province,
            province_code: shippingAddress.province_code,
            country: shippingAddress.country,
            country_code: shippingAddress.country_code,
            zip: shippingAddress.zip,
            phone: shippingAddress.phone,
          }
        : {},
      order_placed_at: order.created_at ? String(order.created_at) : new Date().toISOString(),
    }, { onConflict: 'shopify_order_id,creator_store_connection_id' })
    .select('id')
    .single();

  if (orderError || !creatorOrder) {
    console.error('[Webhook] Failed to upsert order:', orderError);
    return;
  }

  // Insert only matched line items (our products only)
  for (const { item, variant } of matchedItems) {
    const quantity = Number(item.quantity) || 1;
    const unitPrice = parseFloat(String(item.price)) || 0;
    const earningsAmount = (variant.sale_price - variant.base_cost_snapshot) * quantity;

    const lineItemId = item.id ? String(item.id) : null;
    if (lineItemId) {
      const { data: existing } = await supabase
        .from('creator_order_items')
        .select('id')
        .eq('creator_order_id', creatorOrder.id)
        .eq('shopify_line_item_id', lineItemId)
        .single();

      if (existing) continue;
    }

    await supabase.from('creator_order_items').insert({
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
      earnings_amount: earningsAmount,
    });
  }

  console.log(`[Webhook] Processed order ${order.name} — ${matchedItems.length}/${lineItems.length} matched items, creator ${connection.creator_id}`);
}
