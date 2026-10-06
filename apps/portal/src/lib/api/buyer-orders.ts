import type { BuyerOrdersResponse } from '@/lib/types/buyer-order';

export async function fetchBuyerOrders(signal?: AbortSignal): Promise<BuyerOrdersResponse> {
  const response = await fetch('/api/shopify/my-orders', { signal });
  const data: BuyerOrdersResponse & { error?: string } = await response.json();
  if (!response.ok || data.error) {
    throw new Error(data.error || 'Failed to load your orders');
  }
  if (typeof data.linked !== 'boolean' || !Array.isArray(data.orders)) {
    throw new Error('Invalid orders response');
  }
  return { linked: data.linked, orders: data.orders };
}
