'use client';

import { useState } from 'react';

interface Store {
  id: string;
  name: string;
  platform: string;
}

export default function SyncOrdersButton({ stores }: { stores: Store[] }) {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleSync() {
    if (stores.length === 0) return;
    setSyncing(true);
    setResult(null);

    try {
      let totalProcessed = 0;
      let totalMatched = 0;
      let totalShopify = 0;

      for (const store of stores) {
        const res = await fetch('/api/shopify/fetch-orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ store_connection_id: store.id }),
        });

        if (res.ok) {
          const data = await res.json();
          totalShopify += data.total_shopify_orders || 0;
          totalProcessed += data.orders_with_our_products || 0;
          totalMatched += data.line_items_matched || 0;
        } else {
          const err = await res.json().catch(() => ({}));
          console.error(`Sync failed for ${store.name}:`, err);
        }
      }

      setResult(`Synced: ${totalShopify} Shopify orders found, ${totalProcessed} with our products, ${totalMatched} items matched`);
      // Reload page to show new orders
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      setResult(`Error: ${err instanceof Error ? err.message : 'Failed to sync'}`);
    } finally {
      setSyncing(false);
    }
  }

  if (stores.length === 0) return null;

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleSync}
        disabled={syncing}
        className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-all flex items-center gap-2"
      >
        {syncing ? (
          <>
            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            Syncing...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
            </svg>
            Sync Orders
          </>
        )}
      </button>
      {result && (
        <span className="text-xs text-gray-500">{result}</span>
      )}
    </div>
  );
}
