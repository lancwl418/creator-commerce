import { useState } from 'react';
import type { StoreConnection } from '@/lib/types/store';
import type { PLATFORMS } from './platforms';

const statusConfig: Record<string, { label: string; style: string }> = {
  connected: { label: 'Connected', style: 'bg-emerald-50 text-emerald-700' },
  disconnected: { label: 'Disconnected', style: 'bg-gray-100 text-gray-600' },
  expired: { label: 'Expired', style: 'bg-amber-50 text-amber-700' },
  error: { label: 'Error', style: 'bg-red-50 text-red-600' },
};

interface StoreConnectionCardProps {
  platform: (typeof PLATFORMS)[number];
  conn?: StoreConnection;
  disconnecting: string | null;
  handleDisconnect: (id: string) => void;
}

export default function StoreConnectionCard({ platform, conn, disconnecting, handleDisconnect }: StoreConnectionCardProps) {
  const isConnected = conn?.status === 'connected';
  const status = conn ? statusConfig[conn.status] || statusConfig.disconnected : null;
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [shopDomain, setShopDomain] = useState('');
  function handleConnect(platformId: string) {
    if (platformId === 'shopify') {
      setConnectingPlatform('shopify');
      setShopDomain('');
    } else {
      alert(`${platformId} connection coming soon!`);
    }
  }

  function handleShopifyOAuth() {
    let domain = shopDomain.trim();
    if (domain && !domain.includes('.')) {
      domain = `${domain}.myshopify.com`;
    }
    if (!domain.endsWith('.myshopify.com')) {
      alert('Please enter a valid Shopify domain (e.g., mystore.myshopify.com)');
      return;
    }
    window.location.href = `/api/shopify/auth?shop=${encodeURIComponent(domain)}`;
  }


  const handleReconnect = handleConnect;
  return (
    <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
      <div className="flex items-start gap-5">
        {/* Platform icon */}
        <div className={`w-14 h-14 rounded-xl ${platform.color} text-white flex items-center justify-center shrink-0`}>
          {platform.icon}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-900">{platform.name}</h3>
            {status && (
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${status.style}`}>
                {status.label}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{platform.description}</p>

          {/* Connected store details */}
          {conn && isConnected && (
            <div className="mt-3 rounded-xl bg-surface-secondary p-3 space-y-1.5">
              {conn.store_name && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-400">Store:</span>
                  <span className="font-medium text-gray-900">{conn.store_name}</span>
                </div>
              )}
              {conn.store_url && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-400">URL:</span>
                  <a href={conn.store_url} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-700 font-medium truncate">
                    {conn.store_url}
                  </a>
                </div>
              )}
              {conn.last_sync_at && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-400">Last sync:</span>
                  <span className="text-gray-700">{new Date(conn.last_sync_at).toLocaleString()}</span>
                </div>
              )}
              {conn.connected_at && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-400">Connected:</span>
                  <span className="text-gray-700">{new Date(conn.connected_at).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action button */}
        <div className="shrink-0">
          {!conn || conn.status === 'disconnected' ? (
            <button
              onClick={() => handleConnect(platform.id)}
              className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-500 transition-all shadow-sm"
            >
              Connect
            </button>
          ) : conn.status === 'expired' || conn.status === 'error' ? (
            <button
              onClick={() => handleReconnect(platform.id)}
              className="rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-500 transition-all shadow-sm"
            >
              Reconnect
            </button>
          ) : (
            <button
              onClick={() => handleDisconnect(conn.id)}
              disabled={disconnecting === conn.id}
              className="rounded-xl border border-red-200 px-5 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 transition-all"
            >
              {disconnecting === conn.id ? 'Disconnecting...' : 'Disconnect'}
            </button>
          )}
        </div>
      </div>

      {/* Shopify domain input */}
      {connectingPlatform === platform.id && platform.id === 'shopify' && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-sm text-gray-600 mb-2">Enter your Shopify store domain:</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={shopDomain}
              onChange={(e) => setShopDomain(e.target.value)}
              placeholder="mystore.myshopify.com"
              className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
              onKeyDown={(e) => e.key === 'Enter' && handleShopifyOAuth()}
            />
            <button
              onClick={handleShopifyOAuth}
              className="rounded-xl bg-[#96bf48] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#7ea73d] transition-all shrink-0"
            >
              Continue to Shopify
            </button>
            <button
              onClick={() => setConnectingPlatform(null)}
              className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all shrink-0"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
