import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServiceClient } from '@/lib/supabase/service';

const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET ?? '';

type ServiceClient = ReturnType<typeof createServiceClient>;

/**
 * POST /api/webhooks/shopify/orders
 *
 * Receives Shopify order webhooks:
 * - orders/create, orders/paid — create/update order
 * - orders/updated — sync changes (shipping, items, customer)
 * - orders/cancelled — cancel order
 * All changes are audit-logged in creator_order_logs.
 */
export async function POST(req: NextRequest) {
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

    switch (topic) {
      case 'orders/create':
      case 'orders/paid':
        await processOrderCreate(supabase, connection, order);
        break;
      case 'orders/updated':
        await processOrderUpdate(supabase, connection, order);
        break;
      case 'orders/cancelled':
        await processOrderCancelled(supabase, connection, order);
        break;
    }

    return new NextResponse('OK', { status: 200 });
  } catch (err) {
    console.error('[Webhook] Processing error:', err);
    return new NextResponse('OK', { status: 200 });
  }
}

// ── Helpers ──

async function matchLineItems(
  supabase: ServiceClient,
  connectionId: string,
  lineItems: Record<string, unknown>[],
) {
  const matched: {
    item: Record<string, unknown>;
    variant: { id: string; sale_price: number; base_cost_snapshot: number };
  }[] = [];

  for (const item of lineItems) {
    const shopifyVariantId = item.variant_id ? String(item.variant_id) : null;
    if (!shopifyVariantId) continue;

    const { data: variants } = await supabase
      .from('channel_listing_variants')
      .select('id, sale_price, base_cost_snapshot, channel_listing_id')
      .eq('external_variant_id', shopifyVariantId)
      .limit(5);

    if (!variants || variants.length === 0) continue;

    for (const v of variants) {
      const { data: listing } = await supabase
        .from('channel_listings')
        .select('creator_store_connection_id')
        .eq('id', v.channel_listing_id)
        .single();

      if (listing?.creator_store_connection_id === connectionId) {
        matched.push({
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

  return matched;
}

function extractShippingAddress(order: Record<string, unknown>) {
  const sa = order.shipping_address as Record<string, unknown> | null;
  if (!sa) return {};
  return {
    name: sa.name,
    address1: sa.address1,
    address2: sa.address2,
    city: sa.city,
    province: sa.province,
    province_code: sa.province_code,
    country: sa.country,
    country_code: sa.country_code,
    zip: sa.zip,
    phone: sa.phone,
  };
}

function extractCustomerName(order: Record<string, unknown>): string | null {
  const customer = order.customer as Record<string, unknown> | null;
  if (!customer) return null;
  return `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || null;
}

async function writeLog(
  supabase: ServiceClient,
  orderId: string,
  action: string,
  source: string,
  changes: Record<string, unknown> = {},
  note?: string,
) {
  await supabase.from('creator_order_logs').insert({
    creator_order_id: orderId,
    action,
    source,
    changes,
    note,
  });
}

// TODO: Call ERP API when ready
async function syncOrderToErp(_orderId: string, _action: string, _data: Record<string, unknown>) {
  // Placeholder for ERP sync
  // Will call ERP's POST /orders or PUT /orders/:id
  console.log(`[ERP Sync] TODO: ${_action} order ${_orderId}`);
}

// ── Order Create ──

async function processOrderCreate(
  supabase: ServiceClient,
  connection: { id: string; creator_id: string },
  order: Record<string, unknown>,
) {
  const lineItems = (order.line_items || []) as Record<string, unknown>[];
  const matchedItems = await matchLineItems(supabase, connection.id, lineItems);

  if (matchedItems.length === 0) {
    console.log(`[Webhook] Order ${order.name} has no platform products, skipping`);
    return;
  }

  const shopifyOrderId = String(order.id);
  const customer = order.customer as Record<string, unknown> | null;

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
      customer_name: extractCustomerName(order),
      shipping_address: extractShippingAddress(order),
      order_placed_at: order.created_at ? String(order.created_at) : new Date().toISOString(),
    }, { onConflict: 'shopify_order_id,creator_store_connection_id' })
    .select('id')
    .single();

  if (orderError || !creatorOrder) {
    console.error('[Webhook] Failed to upsert order:', orderError);
    return;
  }

  // Replace line items: delete existing then insert fresh (idempotent)
  await supabase.from('creator_order_items').delete().eq('creator_order_id', creatorOrder.id);

  for (const { item, variant } of matchedItems) {
    const quantity = Number(item.quantity) || 1;
    const unitPrice = parseFloat(String(item.price)) || 0;

    await supabase.from('creator_order_items').insert({
      creator_order_id: creatorOrder.id,
      channel_listing_variant_id: variant.id,
      shopify_line_item_id: item.id ? String(item.id) : null,
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
  }

  await writeLog(supabase, creatorOrder.id, 'created', 'shopify_webhook', {
    shopify_order_id: shopifyOrderId,
    matched_items: matchedItems.length,
    total_items: lineItems.length,
  });

  // TODO: Sync to ERP
  await syncOrderToErp(creatorOrder.id, 'create', { order_name: order.name });

  console.log(`[Webhook] Created order ${order.name} — ${matchedItems.length}/${lineItems.length} matched, creator ${connection.creator_id}`);
}

// ── Order Updated ──

async function processOrderUpdate(
  supabase: ServiceClient,
  connection: { id: string; creator_id: string },
  order: Record<string, unknown>,
) {
  const shopifyOrderId = String(order.id);

  // Find existing order
  const { data: existingOrder } = await supabase
    .from('creator_orders')
    .select('*')
    .eq('shopify_order_id', shopifyOrderId)
    .eq('creator_store_connection_id', connection.id)
    .single();

  if (!existingOrder) {
    // Order doesn't exist yet — might be a new order with our products
    await processOrderCreate(supabase, connection, order);
    return;
  }

  const changes: Record<string, unknown> = {};

  // Check shipping address changes
  const newShipping = extractShippingAddress(order);
  const oldShipping = existingOrder.shipping_address as Record<string, unknown> || {};
  if (JSON.stringify(newShipping) !== JSON.stringify(oldShipping)) {
    changes.shipping_address = { old: oldShipping, new: newShipping };
  }

  // Check customer changes
  const newCustomerName = extractCustomerName(order);
  if (newCustomerName !== existingOrder.customer_name) {
    changes.customer_name = { old: existingOrder.customer_name, new: newCustomerName };
  }

  const customer = order.customer as Record<string, unknown> | null;
  const newEmail = customer?.email ? String(customer.email) : null;
  if (newEmail !== existingOrder.customer_email) {
    changes.customer_email = { old: existingOrder.customer_email, new: newEmail };
  }

  // Check financial/fulfillment status changes
  const newFinancial = String(order.financial_status || 'pending');
  if (newFinancial !== existingOrder.financial_status) {
    changes.financial_status = { old: existingOrder.financial_status, new: newFinancial };
  }

  const newFulfillment = order.fulfillment_status ? String(order.fulfillment_status) : null;
  if (newFulfillment !== existingOrder.fulfillment_status) {
    changes.fulfillment_status = { old: existingOrder.fulfillment_status, new: newFulfillment };
  }

  // Update order fields
  await supabase.from('creator_orders').update({
    financial_status: newFinancial,
    fulfillment_status: newFulfillment,
    total_price: parseFloat(String(order.total_price)) || 0,
    subtotal_price: parseFloat(String(order.subtotal_price)) || 0,
    total_tax: parseFloat(String(order.total_tax)) || 0,
    customer_email: newEmail,
    customer_name: newCustomerName,
    shipping_address: newShipping,
  }).eq('id', existingOrder.id);

  // Check line item changes — re-match against our products
  const lineItems = (order.line_items || []) as Record<string, unknown>[];
  const matchedItems = await matchLineItems(supabase, connection.id, lineItems);

  if (matchedItems.length === 0) {
    // Our products were all removed from this order → cancel it
    await supabase.from('creator_orders').update({
      financial_status: 'voided',
      cancel_reason: 'All platform products removed from order',
      cancelled_at: new Date().toISOString(),
    }).eq('id', existingOrder.id);

    await writeLog(supabase, existingOrder.id, 'cancelled', 'shopify_webhook', {
      reason: 'All platform products removed from order',
    });

    await syncOrderToErp(existingOrder.id, 'cancel', { reason: 'products_removed' });

    console.log(`[Webhook] Order ${order.name} cancelled — no platform products remaining`);
    return;
  }

  // Sync line items: remove old ones that no longer match, add new ones
  const existingItemIds = new Set<string>();
  const { data: existingItems } = await supabase
    .from('creator_order_items')
    .select('id, shopify_line_item_id')
    .eq('creator_order_id', existingOrder.id);

  for (const ei of existingItems || []) {
    existingItemIds.add(ei.shopify_line_item_id);
  }

  const newLineItemIds = new Set(matchedItems.map(m => m.item.id ? String(m.item.id) : ''));
  const removedItems = (existingItems || []).filter(ei => !newLineItemIds.has(ei.shopify_line_item_id));
  const addedItems = matchedItems.filter(m => !existingItemIds.has(m.item.id ? String(m.item.id) : ''));

  // Delete removed items
  if (removedItems.length > 0) {
    await supabase.from('creator_order_items')
      .delete()
      .in('id', removedItems.map(r => r.id));
    changes.items_removed = removedItems.length;
  }

  // Add new items
  for (const { item, variant } of addedItems) {
    const quantity = Number(item.quantity) || 1;
    const unitPrice = parseFloat(String(item.price)) || 0;
    await supabase.from('creator_order_items').insert({
      creator_order_id: existingOrder.id,
      channel_listing_variant_id: variant.id,
      shopify_line_item_id: item.id ? String(item.id) : null,
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
    changes.items_added = (changes.items_added as number || 0) + 1;
  }

  // Update existing items (quantity/price might have changed)
  for (const { item, variant } of matchedItems) {
    const lineItemId = item.id ? String(item.id) : null;
    if (!lineItemId || addedItems.some(a => String(a.item.id) === lineItemId)) continue;

    const quantity = Number(item.quantity) || 1;
    const unitPrice = parseFloat(String(item.price)) || 0;
    await supabase.from('creator_order_items').update({
      quantity,
      unit_price: unitPrice,
      total_price: unitPrice * quantity,
      earnings_amount: (variant.sale_price - variant.base_cost_snapshot) * quantity,
    }).eq('creator_order_id', existingOrder.id).eq('shopify_line_item_id', lineItemId);
  }

  // Determine log action
  const hasChanges = Object.keys(changes).length > 0;
  if (hasChanges) {
    const action = changes.shipping_address ? 'shipping_updated'
      : changes.customer_name || changes.customer_email ? 'customer_updated'
      : changes.items_removed || changes.items_added ? 'items_changed'
      : 'updated';

    await writeLog(supabase, existingOrder.id, action, 'shopify_webhook', changes);
    await syncOrderToErp(existingOrder.id, 'update', changes);
  }

  console.log(`[Webhook] Updated order ${order.name} — changes: ${JSON.stringify(Object.keys(changes))}`);
}

// ── Order Cancelled ──

async function processOrderCancelled(
  supabase: ServiceClient,
  connection: { id: string; creator_id: string },
  order: Record<string, unknown>,
) {
  const shopifyOrderId = String(order.id);

  const { data: existingOrder } = await supabase
    .from('creator_orders')
    .select('id')
    .eq('shopify_order_id', shopifyOrderId)
    .eq('creator_store_connection_id', connection.id)
    .single();

  if (!existingOrder) {
    console.log(`[Webhook] Cancelled order ${order.name} not found in our system, skipping`);
    return;
  }

  await supabase.from('creator_orders').update({
    financial_status: 'cancelled',
    cancel_reason: order.cancel_reason ? String(order.cancel_reason) : 'Cancelled by store',
    cancelled_at: order.cancelled_at ? String(order.cancelled_at) : new Date().toISOString(),
  }).eq('id', existingOrder.id);

  await writeLog(supabase, existingOrder.id, 'cancelled', 'shopify_webhook', {
    cancel_reason: order.cancel_reason || 'Cancelled by store',
    shopify_order_id: shopifyOrderId,
  });

  await syncOrderToErp(existingOrder.id, 'cancel', {
    reason: order.cancel_reason || 'Cancelled by store',
  });

  console.log(`[Webhook] Cancelled order ${order.name}`);
}
