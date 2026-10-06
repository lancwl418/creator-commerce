'use client';

import StoreConnectionCard from './StoreConnectionCard';
import { PLATFORMS } from './platforms';
import type { StoreConnection } from '@/lib/types/store';
import { useStoreConnections } from '@/hooks/stores/useStoreConnections';

export default function StoresClient({ initialStores }: { initialStores: StoreConnection[] }) {
  const { getConnection, disconnecting, error, handleDisconnect } = useStoreConnections(initialStores);
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Channels & Stores</h1>
        <p className="text-sm text-gray-500 mt-1">Connect your stores to sync products and receive orders.</p>
      </div>

      {error && <p role="alert" className="mb-4 text-sm text-red-600">{error}</p>}
      <div className="space-y-4">
        {PLATFORMS.map(platform => <StoreConnectionCard key={platform.id} platform={platform} conn={getConnection(platform.id)} disconnecting={disconnecting} handleDisconnect={handleDisconnect} />)}
      </div>

      {/* Help text */}
      <div className="mt-6 rounded-xl bg-surface-secondary p-4">
        <p className="text-xs text-gray-500">
          After connecting a store, you can sync your created products directly from the product detail page.
          Each store connection uses OAuth for secure access — we never store your store password.
        </p>
      </div>
    </div>
  );
}
