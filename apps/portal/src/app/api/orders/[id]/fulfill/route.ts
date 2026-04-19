import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { pushFulfillmentToShopify } from '@/lib/shopify-fulfill';

/**
 * POST /api/orders/:id/fulfill
 * Manual fulfillment from Portal UI (for testing or manual override).
 *
 * Body: {
 *   tracking_number: string,
 *   carrier: string,
 *   tracking_url?: string,
 *   line_item_ids: string[],  // shopify_line_item_ids to fulfill
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

  // Verify ownership
  const { data: order } = await supabase
    .from('creator_orders')
    .select('id')
    .eq('id', id)
    .eq('creator_id', creator.id)
    .single();

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const body = await req.json();
  const { tracking_number, carrier, tracking_url, line_item_ids, note } = body;

  if (!tracking_number || !carrier) {
    return NextResponse.json({ error: 'tracking_number and carrier are required' }, { status: 400 });
  }
  if (!line_item_ids?.length) {
    return NextResponse.json({ error: 'line_item_ids required' }, { status: 400 });
  }

  const result = await pushFulfillmentToShopify({
    orderId: id,
    lineItemIds: line_item_ids,
    trackingNumber: tracking_number,
    carrier,
    trackingUrl: tracking_url,
    note: note || `Manual fulfillment`,
    source: 'manual',
    createdBy: user.id,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json(result);
}
