'use client';

import { useOrderSync } from '@/hooks/orders/useOrderSync';
import type { OrderSyncStore } from '@/lib/types/order';

export default function SyncOrdersButton({ stores }: { stores: OrderSyncStore[] }) {
  const { syncing, result, handleSync } = useOrderSync(stores);
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
