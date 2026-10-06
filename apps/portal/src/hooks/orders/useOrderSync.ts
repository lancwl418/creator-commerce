'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { syncStoreOrders } from '@/lib/api/orders';
import type { OrderSyncStore } from '@/lib/types/order';

export function useOrderSync(stores: OrderSyncStore[], shopifyOrderId?: string) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleSync() {
    if (syncing || !stores.length) return;
    setSyncing(true); setResult(null);
    let total = 0, processed = 0, matched = 0;
    const failures: string[] = [];
    for (const store of stores) {
      try {
        const data = await syncStoreOrders(store.id, shopifyOrderId);
        total += data.total_shopify_orders; processed += data.orders_with_our_products; matched += data.line_items_matched;
      } catch (err) { failures.push(`${store.name}: ${err instanceof Error ? err.message : 'Failed to sync'}`); }
    }
    setResult(failures.length ? failures.join('; ') : `Synced: ${total} Shopify orders found, ${processed} with our products, ${matched} items matched`);
    router.refresh();
    setSyncing(false);
  }

  return { syncing, result, handleSync };
}
