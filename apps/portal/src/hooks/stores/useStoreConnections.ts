'use client';

import { useState } from 'react';
import type { StoreConnection } from '@/lib/types/store';
import { disconnectStore } from '@/lib/stores/mutations';

export function useStoreConnections(initialStores: StoreConnection[]) {
  const [connections, setConnections] = useState(initialStores);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function handleDisconnect(id: string) {
    if (disconnecting) return;
    setDisconnecting(id); setError('');
    try {
      await disconnectStore(id);
      setConnections(previous => previous.map(store => store.id === id ? { ...store, status: 'disconnected' } : store));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect store');
    } finally { setDisconnecting(null); }
  }

  return { disconnecting, error, handleDisconnect, getConnection: (platform: string) => connections.find(store => store.platform === platform) };
}
