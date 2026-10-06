'use client';

import { useOrderSync } from '@/hooks/orders/useOrderSync';

interface ResyncButtonProps { orderId: string; shopifyOrderId: string; storeConnectionId: string; }

export function ResyncButton({ shopifyOrderId, storeConnectionId }: ResyncButtonProps) {
  const { syncing: resyncing, result, handleSync: handleResync } = useOrderSync([{ id: storeConnectionId, name: 'Store', platform: 'shopify' }], shopifyOrderId);
  return (
    <div>
      <button onClick={handleResync} disabled={resyncing}
        className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-all flex items-center gap-1.5">
        {resyncing ? (
          <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
          </svg>
        )}
        Resync
      </button>
      {result && <p role="status" className="text-xs text-gray-500">{result}</p>}
    </div>
  );
}

