'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface StoreConnection {
  id: string;
  platform: string;
  store_name: string | null;
  store_url: string | null;
  status: string;
  last_sync_at: string | null;
  connected_at: string | null;
}

const PLATFORMS = [
  {
    id: 'shopify',
    name: 'Shopify',
    description: 'Sync products to your Shopify store',
    color: 'bg-[#96bf48]',
    icon: (
      <svg viewBox="0 0 24 24" className="w-7 h-7" fill="currentColor">
        <path d="M15.337 3.415c-.03-.149-.18-.224-.3-.224-.12 0-2.403-.06-2.403-.06s-1.592-1.586-1.77-1.764c-.18-.18-.53-.12-.668-.09-.02 0-.37.12-.94.3C8.806.68 8.207 0 7.257 0 5.307 0 4.307 2.498 3.997 3.767c-.81.254-1.388.43-1.468.454-.458.149-.468.164-.528.598C1.937 5.25 0 20.641 0 20.641L15.127 23.5l.21-20.085zM9.087 2.382c-.45.142-.96.3-1.5.464.29-1.105.84-1.644 1.32-1.852.12.299.18.704.18 1.388zm-1.5-1.82c.09 0 .18.03.27.09-.63.3-1.305 1.05-1.59 2.552-.45.14-.87.27-1.26.389C5.427 2.098 6.297 0 7.257 0h.33zm.45 8.493s-.54-.299-1.2-.299c-.97 0-1.02.61-1.02.764 0 .837 2.19 1.16 2.19 3.116 0 1.54-.979 2.533-2.297 2.533-1.583 0-2.393-1.017-2.393-1.017l.42-1.407s.83.719 1.533.719c.46 0 .648-.36.648-.625 0-1.093-1.8-1.143-1.8-2.937 0-1.51 1.082-2.97 3.27-2.97.84 0 1.258.24 1.258.24l-.609 1.883z" />
      </svg>
    ),
  },
  {
    id: 'etsy',
    name: 'Etsy',
    description: 'List your designs on Etsy marketplace',
    color: 'bg-[#F1641E]',
    icon: (
      <svg viewBox="0 0 24 24" className="w-7 h-7" fill="currentColor">
        <path d="M8.559 3.074c0-.26.104-.39.39-.39h4.68c2.158 0 2.418.96 2.768 2.208l.39.078.78-3.9-.39-.078c-.26.52-.52.52-1.56.52H5.791c-.26 0-.39.13-.39.39v.26l.78.13c.91.182 1.17.442 1.248 1.352 0 0 .078 2.808.078 6.708 0 3.9-.078 6.708-.078 6.708-.078.91-.338 1.17-1.248 1.352l-.78.13v.26c0 .26.13.39.39.39h6.838c.26 0 .39-.13.39-.39v-.26l-1.04-.13c-.91-.182-1.17-.442-1.248-1.352 0 0-.052-1.95-.078-4.134h2.418c1.56 0 1.95.52 2.418 2.002l.39.052.52-4.94-.39-.052c-.52 1.69-.91 1.95-2.418 1.95H9.451c.026-2.106.078-3.952.078-3.952 0-.91.078-3.38.078-3.38v-.26h2.808c2.158 0 2.418.96 2.768 2.47l.39.078.78-4.16-.39-.078c-.26.52-.52.52-1.56.52H9.559v-.26c-.052-.104-.104-.208-.104-.312v.052z" />
      </svg>
    ),
  },
  {
    id: 'tiktok_shop',
    name: 'TikTok Shop',
    description: 'Sell through TikTok Shop',
    color: 'bg-black',
    icon: (
      <svg viewBox="0 0 24 24" className="w-7 h-7" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V9.05a8.27 8.27 0 0 0 4.76 1.5V7.1a4.83 4.83 0 0 1-1-.41z" />
      </svg>
    ),
  },
];

const statusConfig: Record<string, { label: string; style: string }> = {
  connected: { label: 'Connected', style: 'bg-emerald-50 text-emerald-700' },
  disconnected: { label: 'Disconnected', style: 'bg-gray-100 text-gray-600' },
  expired: { label: 'Expired', style: 'bg-amber-50 text-amber-700' },
  error: { label: 'Error', style: 'bg-red-50 text-red-600' },
};

interface StoresClientProps {
  creatorId: string;
  initialStores: StoreConnection[];
}

export default function StoresClient({ creatorId, initialStores }: StoresClientProps) {
  const supabase = createClient();
  const [connections, setConnections] = useState<StoreConnection[]>(initialStores);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [shopDomain, setShopDomain] = useState('');

  function getConnection(platformId: string) {
    return connections.find(c => c.platform === platformId);
  }

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

  async function handleDisconnect(connectionId: string) {
    setDisconnecting(connectionId);
    const { error } = await supabase
      .from('creator_store_connections')
      .update({ status: 'disconnected', access_token: null, refresh_token: null })
      .eq('id', connectionId);

    if (!error) {
      setConnections(prev =>
        prev.map(c => c.id === connectionId ? { ...c, status: 'disconnected' } : c)
      );
    }
    setDisconnecting(null);
  }

  async function handleReconnect(platformId: string) {
    handleConnect(platformId);
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Channels & Stores</h1>
        <p className="text-sm text-gray-500 mt-1">Connect your stores to sync products and receive orders.</p>
      </div>

      <div className="space-y-4">
        {PLATFORMS.map((platform) => {
          const conn = getConnection(platform.id);
          const isConnected = conn?.status === 'connected';
          const status = conn ? statusConfig[conn.status] || statusConfig.disconnected : null;

          return (
            <div key={platform.id} className="rounded-2xl border border-border bg-white p-6 shadow-sm">
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
        })}
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
