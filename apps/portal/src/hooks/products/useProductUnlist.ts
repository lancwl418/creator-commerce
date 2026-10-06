'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { unlistProductFromStore } from '@/lib/api/product-listings';
import type { Listing } from '@/lib/types/product';

export function useProductUnlist(productId: string, onUnlisted?: () => void) {
  const router = useRouter();
  const pending = useRef(false);
  const [unlistingId, setUnlistingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [removed, setRemoved] = useState(new Set<string>());

  async function handleUnlist(listing: Listing) {
    const storeId = listing.creator_store_connection_id;
    if (!storeId || pending.current) return;
    pending.current = true;
    setUnlistingId(storeId);
    setError('');
    try {
      await unlistProductFromStore(productId, storeId);
      setRemoved(previous => new Set(previous).add(storeId));
      onUnlisted?.();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unlist');
    } finally {
      pending.current = false;
      setUnlistingId(null);
    }
  }

  return { unlistingId, error, removed, handleUnlist };
}
