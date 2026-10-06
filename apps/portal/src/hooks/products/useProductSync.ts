'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getConnectedStores } from '@/lib/queries/store-connections.client';
import { syncProductToStore } from '@/lib/api/product-listings';
import type { StoreConnection, PublishStatus } from '@/lib/types/store';

export function useProductSync(productId: string, onSynced: () => void, onBeforeSync?: () => Promise<void>) {
  const router = useRouter();
  const pending = useRef(false);
  const [stores, setStores] = useState<StoreConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ url: string; storeName: string } | null>(null);
  const [storeStatuses, setStoreStatuses] = useState<Record<string, PublishStatus>>({});

  useEffect(() => {
    let active = true;
    getConnectedStores().then(data => { if (active) setStores(data); })
      .catch(err => { if (active) setError(err instanceof Error ? err.message : 'Failed to load stores'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function handleSync(store: StoreConnection) {
    if (pending.current) return;
    pending.current = true;
    setSyncingId(store.id);
    setError('');
    try {
      await onBeforeSync?.();
      const url = await syncProductToStore(productId, store.id, storeStatuses[store.id] || 'active');
      setSuccess({ url, storeName: store.store_name || store.platform });
      onSynced();
      router.prefetch('/dashboard/products');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync');
    } finally {
      pending.current = false;
      setSyncingId(null);
    }
  }

  return {
    stores, loading, syncingId, error, success, storeStatuses, handleSync,
    setStoreStatus: (storeId: string, status: PublishStatus) => setStoreStatuses(previous => ({ ...previous, [storeId]: status }))
  };
}
