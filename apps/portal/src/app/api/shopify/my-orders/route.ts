import { NextResponse } from 'next/server';
import { requireCreator } from '@/lib/server/auth';
import { SHOPIFY_API_VERSION } from '@/lib/constants';

const STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN ?? '';
const TOKEN = process.env.SHOPIFY_ACCESS_TOKEN ?? '';

/**
 * GET /api/shopify/my-orders
 *
 * The buyer side of the account hub: this creator's own ghostyle orders. We
 * read their linked Shopify customer (creators.shopify_customer_id, set by the
 * customers webhook / signup linking in Step 3) and fetch that customer's
 * orders from our own store via the Admin API.
 */
export async function GET() {
  let supabase, creator;
  try {
    ({ supabase, creator } = await requireCreator());
  } catch {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: row } = await supabase
    .from('creators')
    .select('shopify_customer_id')
    .eq('id', creator.id)
    .single();

  const customerId = (row as { shopify_customer_id?: string | null } | null)?.shopify_customer_id;
  if (!customerId) {
    // No linked Shopify customer yet (not purchased on ghostyle, or not linked).
    return NextResponse.json({ linked: false, orders: [] });
  }

  if (!STORE_DOMAIN || !TOKEN) {
    return NextResponse.json({ error: 'Store not configured' }, { status: 500 });
  }

  const url =
    `https://${STORE_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/orders.json` +
    `?customer_id=${encodeURIComponent(customerId)}&status=any&limit=50`;

  const res = await fetch(url, { headers: { 'X-Shopify-Access-Token': TOKEN } });
  if (!res.ok) {
    return NextResponse.json({ error: `Shopify returned ${res.status}` }, { status: 502 });
  }

  const data = await res.json();
  type ShopLineItem = { title: string; variant_title?: string; quantity: number; properties?: { name: string; value: string }[] };
  type ShopOrder = {
    id: number; name: string; created_at: string; total_price: string; currency: string;
    financial_status?: string; fulfillment_status?: string | null; order_status_url?: string;
    line_items?: ShopLineItem[];
  };

  const orders = ((data.orders ?? []) as ShopOrder[]).map((o) => ({
    id: o.id,
    name: o.name,
    createdAt: o.created_at,
    total: o.total_price,
    currency: o.currency,
    financialStatus: o.financial_status ?? null,
    fulfillmentStatus: o.fulfillment_status ?? null,
    statusUrl: o.order_status_url ?? null,
    items: (o.line_items ?? []).map((li) => ({
      title: li.title,
      variant: li.variant_title ?? null,
      quantity: li.quantity,
      preview: (li.properties ?? []).find((p) => p.name === '_design_preview' || p.name === '_preview')?.value || null,
    })),
  }));

  return NextResponse.json({ linked: true, orders });
}
