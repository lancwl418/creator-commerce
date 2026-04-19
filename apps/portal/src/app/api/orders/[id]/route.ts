import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * PUT /api/orders/:id
 * Manual edit of order details. Does NOT push back to Shopify.
 * Requires a note explaining the change. Creates an audit log entry.
 *
 * Body: {
 *   note: string (required),
 *   shipping_address?: {...},
 *   customer_name?: string,
 *   customer_email?: string,
 *   financial_status?: string,
 *   fulfillment_status?: string,
 *   notes?: string,
 * }
 */
export async function PUT(
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

  // Verify order ownership
  const { data: order } = await supabase
    .from('creator_orders')
    .select('*')
    .eq('id', id)
    .eq('creator_id', creator.id)
    .single();

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const body = await req.json();
  const { note, ...updates } = body;

  if (!note || typeof note !== 'string' || note.trim().length === 0) {
    return NextResponse.json({ error: 'Note is required for manual edits' }, { status: 400 });
  }

  // Build changes diff
  const changes: Record<string, unknown> = {};
  const updateFields: Record<string, unknown> = {};

  if (updates.shipping_address !== undefined) {
    changes.shipping_address = { old: order.shipping_address, new: updates.shipping_address };
    updateFields.shipping_address = updates.shipping_address;
  }
  if (updates.customer_name !== undefined) {
    changes.customer_name = { old: order.customer_name, new: updates.customer_name };
    updateFields.customer_name = updates.customer_name;
  }
  if (updates.customer_email !== undefined) {
    changes.customer_email = { old: order.customer_email, new: updates.customer_email };
    updateFields.customer_email = updates.customer_email;
  }
  if (updates.financial_status !== undefined) {
    changes.financial_status = { old: order.financial_status, new: updates.financial_status };
    updateFields.financial_status = updates.financial_status;
  }
  if (updates.fulfillment_status !== undefined) {
    changes.fulfillment_status = { old: order.fulfillment_status, new: updates.fulfillment_status };
    updateFields.fulfillment_status = updates.fulfillment_status;
  }
  if (updates.notes !== undefined) {
    updateFields.notes = updates.notes;
  }

  if (Object.keys(updateFields).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  // Update order
  const { error: updateError } = await supabase
    .from('creator_orders')
    .update(updateFields)
    .eq('id', id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Write audit log
  await supabase.from('creator_order_logs').insert({
    creator_order_id: id,
    action: 'manual_edit',
    source: 'manual',
    changes,
    note: note.trim(),
    created_by: user.id,
  });

  // TODO: Sync changes to ERP (but NOT to Shopify — manual edits are internal only)
  console.log(`[Manual Edit] Order ${id} updated by ${user.id}: ${note}`);

  return NextResponse.json({ success: true, changes: Object.keys(changes) });
}
