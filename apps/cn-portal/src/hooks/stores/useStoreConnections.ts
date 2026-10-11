'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { normalizeShopDomain } from '@creator-commerce/shared/shopify/domain';
import { disconnectStore } from '@/lib/stores/mutations';
import type { StoreConnection } from '@/lib/types/store';
import { t } from '@/lib/i18n';

/** 店铺连接的交互状态：发起 Shopify 授权、断开连接。 */
export function useStoreConnections(initialStores: StoreConnection[]) {
  const router = useRouter();
  const [connections, setConnections] = useState(initialStores);
  const [shopInput, setShopInput] = useState('');
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [error, setError] = useState('');

  function connectShopify() {
    const shop = normalizeShopDomain(shopInput);
    if (!shop) {
      setError(t('stores.error.invalidShop'));
      return;
    }
    setError('');
    router.push(`/api/shopify/auth?shop=${encodeURIComponent(shop)}`);
  }

  async function disconnect(id: string) {
    if (disconnecting) return;
    setDisconnecting(id);
    setError('');
    try {
      await disconnectStore(id);
      setConnections((previous) =>
        previous.map((store) => (store.id === id ? { ...store, status: 'disconnected' } : store))
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('stores.error.generic'));
    } finally {
      setDisconnecting(null);
    }
  }

  return {
    shopify: connections.find((store) => store.platform === 'shopify'),
    shopInput,
    setShopInput,
    connectShopify,
    disconnect,
    disconnecting,
    error,
  };
}
