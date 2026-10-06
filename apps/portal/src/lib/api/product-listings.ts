import type { PublishStatus } from '@/lib/types/store';

async function postListingAction(action: 'sync' | 'unlist', productId: string, storeId: string, publishStatus?: PublishStatus) {
  const response = await fetch(`/api/shopify/${action}-product`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      product_instance_id: productId, store_connection_id: storeId,
      ...(publishStatus ? { publish_status: publishStatus } : {})
    }),
  });
  const data: { shopify_url?: string; error?: string } = await response.json();
  if (!response.ok) throw new Error(data.error || `${action} failed (${response.status})`);
  return data;
}

export async function syncProductToStore(productId: string, storeId: string, status: PublishStatus): Promise<string> {
  const data = await postListingAction('sync', productId, storeId, status);
  if (!data.shopify_url) throw new Error('Sync response is missing the store URL');
  return data.shopify_url;
}

export async function unlistProductFromStore(productId: string, storeId: string): Promise<void> {
  await postListingAction('unlist', productId, storeId);
}
