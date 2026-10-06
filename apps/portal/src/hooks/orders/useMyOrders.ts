'use client';

import { useEffect, useState } from 'react';
import { fetchBuyerOrders } from '@/lib/api/buyer-orders';
import type { BuyerOrdersState } from '@/lib/types/buyer-order';

export function useMyOrders(): BuyerOrdersState {
  const [state, setState] = useState<BuyerOrdersState>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    fetchBuyerOrders(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setState({ status: 'ready', ...data });
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setState({ status: 'error', error: error instanceof Error ? error.message : 'Failed to load orders' });
        }
      });
    return () => controller.abort();
  }, []);

  return state;
}
