import type { OrderFulfillmentInput } from '@/lib/types/order';

async function requestOrder(url: string, body: unknown, method = 'POST') {
  const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Order request failed (${response.status})`);
  return data;
}

export async function syncStoreOrders(storeId: string, shopifyOrderId?: string): Promise<{ total_shopify_orders: number; orders_with_our_products: number; line_items_matched: number }> {
  const data = await requestOrder('/api/shopify/fetch-orders', { store_connection_id: storeId, ...(shopifyOrderId ? { single_order_id: shopifyOrderId } : {}) });
  return { total_shopify_orders: data.total_shopify_orders ?? 0, orders_with_our_products: data.orders_with_our_products ?? 0, line_items_matched: data.line_items_matched ?? 0 };
}

export async function updateOrder(orderId: string, updates: Record<string, unknown>): Promise<void> {
  await requestOrder(`/api/orders/${encodeURIComponent(orderId)}`, updates, 'PUT');
}

export async function fulfillOrder(orderId: string, input: OrderFulfillmentInput): Promise<void> {
  await requestOrder(`/api/orders/${encodeURIComponent(orderId)}/fulfill`, input);
}
