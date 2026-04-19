import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { pushFulfillmentToShopify } from '@/lib/shopify-fulfill';

const ERP_API_KEY = process.env.ERP_WEBHOOK_API_KEY ?? '';

/**
 * POST /api/webhooks/erp/fulfillment
 *
 * ERP calls this when order items are shipped.
 * Can send multiple fulfillments (different tracking per group of items).
 *
 * Headers:
 *   x-api-key: ERP_WEBHOOK_API_KEY
 *
 * Body: {
 *   order_id?: string,          // our creator_order.id (preferred)
 *   shopify_order_id?: string,  // or lookup by shopify order id
 *   fulfillments: [
 *     {
 *       tracking_number: string,
 *       carrier: string,
 *       tracking_url?: string,
 *       line_item_skus?: string[],           // match by SKU
 *       shopify_line_item_ids?: string[],     // or by Shopify line item ID
 *     }
 *   ]
 * }
 */
export async function POST(req: NextRequest) {
  // Verify API key
  const apiKey = req.headers.get('x-api-key') || '';
  if (!ERP_API_KEY || apiKey !== ERP_API_KEY) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { order_id, shopify_order_id, fulfillments } = body;

    if (!fulfillments?.length) {
      return NextResponse.json({ error: 'fulfillments array required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Find the order
    let orderId = order_id;
    if (!orderId && shopify_order_id) {
      const { data } = await supabase
        .from('creator_orders')
        .select('id')
        .eq('shopify_order_id', String(shopify_order_id))
        .single();
      orderId = data?.id;
    }

    if (!orderId) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Get order items for SKU matching
    const { data: orderItems } = await supabase
      .from('creator_order_items')
      .select('shopify_line_item_id, sku')
      .eq('creator_order_id', orderId);

    const results = [];

    for (const fulfillment of fulfillments) {
      // Resolve line item IDs
      let lineItemIds: string[] = fulfillment.shopify_line_item_ids || [];

      // If SKUs provided, match to shopify_line_item_ids
      if (lineItemIds.length === 0 && fulfillment.line_item_skus?.length > 0) {
        const skuSet = new Set(fulfillment.line_item_skus);
        lineItemIds = (orderItems || [])
          .filter((item: { sku: string | null }) => item.sku && skuSet.has(item.sku))
          .map((item: { shopify_line_item_id: string }) => item.shopify_line_item_id);
      }

      // If still empty, fulfill all our items
      if (lineItemIds.length === 0) {
        lineItemIds = (orderItems || []).map((item: { shopify_line_item_id: string }) => item.shopify_line_item_id);
      }

      const result = await pushFulfillmentToShopify({
        orderId,
        lineItemIds,
        trackingNumber: fulfillment.tracking_number,
        carrier: fulfillment.carrier,
        trackingUrl: fulfillment.tracking_url,
        note: `ERP fulfillment: ${fulfillment.carrier} ${fulfillment.tracking_number}`,
        source: 'erp',
      });

      results.push({
        tracking_number: fulfillment.tracking_number,
        carrier: fulfillment.carrier,
        line_items: lineItemIds.length,
        ...result,
      });
    }

    return NextResponse.json({
      order_id: orderId,
      fulfillments: results,
    });
  } catch (err) {
    console.error('[ERP Fulfillment] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    );
  }
}
