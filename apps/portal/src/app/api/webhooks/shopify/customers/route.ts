import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServiceClient } from '@/lib/supabase/service';
import { SHOPIFY_WEBHOOK_SECRET } from '@/lib/constants';

/**
 * POST /api/webhooks/shopify/customers
 *
 * Receives the ghostyle custom app's customers/create (and customers/update)
 * webhooks. Stages the Shopify customer so a later Creator Commerce signup with
 * the same email gets linked (Step 3, option A), and back-fills any existing
 * creator with the shopify_customer_id.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // Verify HMAC against the ghostyle custom app's secret.
  const hmacHeader = req.headers.get('x-shopify-hmac-sha256') || '';
  const expected = SHOPIFY_WEBHOOK_SECRET
    ? crypto.createHmac('sha256', SHOPIFY_WEBHOOK_SECRET).update(rawBody, 'utf8').digest('base64')
    : '';
  if (!SHOPIFY_WEBHOOK_SECRET || hmacHeader !== expected) {
    console.error('[Webhook customers] HMAC verification failed');
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const customer = JSON.parse(rawBody);
    if (!customer?.id) return NextResponse.json({ ok: true });

    const shopifyCustomerId = String(customer.id);
    const email = customer.email ? String(customer.email) : null;
    const supabase = createServiceClient();

    // Stage the mapping (idempotent on shopify_customer_id).
    await supabase.from('shopify_customers').upsert(
      {
        shopify_customer_id: shopifyCustomerId,
        email,
        first_name: customer.first_name ?? null,
        last_name: customer.last_name ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'shopify_customer_id' },
    );

    // Back-fill an existing creator with the same email (customer registered on
    // Creator Commerce before this webhook arrived).
    if (email) {
      await supabase
        .from('creators')
        .update({ shopify_customer_id: shopifyCustomerId })
        .ilike('email', email)
        .is('shopify_customer_id', null);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Webhook customers] error:', err);
    return new NextResponse('Bad Request', { status: 400 });
  }
}
