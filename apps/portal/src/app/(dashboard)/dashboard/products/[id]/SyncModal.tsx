'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface StoreConnection {
  id: string;
  platform: string;
  store_name: string | null;
  store_url: string | null;
  status: string;
}

interface Listing {
  id: string;
  channel_type: string;
  creator_store_connection_id?: string;
  external_listing_url?: string;
  status: string;
}

interface SyncModalProps {
  productId: string;
  listings: Listing[];
  onClose: () => void;
  onSynced: () => void;
  onBeforeSync?: () => Promise<void>;
}

const platformIcons: Record<string, { name: string; color: string }> = {
  shopify: { name: 'Shopify', color: 'bg-[#96bf48]' },
  etsy: { name: 'Etsy', color: 'bg-[#F1641E]' },
  tiktok_shop: { name: 'TikTok Shop', color: 'bg-black' },
};

export default function SyncModal({ productId, listings, onClose, onSynced, onBeforeSync }: SyncModalProps) {
  const supabase = createClient();
  const [stores, setStores] = useState<StoreConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ url: string; storeName: string } | null>(null);

  useEffect(() => {
    loadStores();
  }, []);

  async function loadStores() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: creator } = await supabase
      .from('creators')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!creator) return;

    const { data } = await supabase
      .from('creator_store_connections')
      .select('id, platform, store_name, store_url, status')
      .eq('creator_id', creator.id)
      .eq('status', 'connected');

    setStores(data || []);
    setLoading(false);
  }

  function isAlreadySynced(storeId: string): Listing | undefined {
    return listings.find(l => l.creator_store_connection_id === storeId && l.status !== 'removed');
  }

  async function handleSync(store: StoreConnection) {
    setSyncingId(store.id);
    setError('');

    try {
      // Auto-save current variant selections before syncing
      if (onBeforeSync) {
        await onBeforeSync();
      }

      const res = await fetch('/api/shopify/sync-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_instance_id: productId,
          store_connection_id: store.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Sync failed (${res.status})`);
      }

      setSuccess({ url: data.shopify_url, storeName: store.store_name || store.platform });
      onSynced();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync');
    } finally {
      setSyncingId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">Sync to Store</h3>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {/* Success */}
          {success && (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </div>
              <p className="text-lg font-semibold text-gray-900 mb-1">Product Synced!</p>
              <p className="text-sm text-gray-500 mb-4">
                Successfully published to {success.storeName}
              </p>
              <a
                href={success.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                View on Shopify
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
              </a>
            </div>
          )}

          {/* Loading */}
          {loading && !success && (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-gray-500 ml-3">Loading stores...</span>
            </div>
          )}

          {/* No stores */}
          {!loading && !success && stores.length === 0 && (
            <div className="text-center py-6">
              <p className="text-sm text-gray-500 mb-3">No stores connected yet.</p>
              <Link
                href="/dashboard/stores"
                className="inline-block rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-500 transition-colors"
              >
                Connect a Store
              </Link>
            </div>
          )}

          {/* Store list */}
          {!loading && !success && stores.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">Choose a store to sync this product to:</p>
              {stores.map(store => {
                const existing = isAlreadySynced(store.id);
                const platformInfo = platformIcons[store.platform] || { name: store.platform, color: 'bg-gray-500' };
                const isSyncing = syncingId === store.id;

                return (
                  <div
                    key={store.id}
                    className="flex items-center justify-between rounded-xl border border-border p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg ${platformInfo.color} text-white flex items-center justify-center text-xs font-bold`}>
                        {platformInfo.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{store.store_name || platformInfo.name}</p>
                        <p className="text-xs text-gray-400">{platformInfo.name}</p>
                      </div>
                    </div>

                    {existing ? (
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                          Synced
                        </span>
                        {existing.external_listing_url && (
                          <a
                            href={existing.external_listing_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-600 hover:text-primary-700"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                            </svg>
                          </a>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => handleSync(store)}
                        disabled={isSyncing || syncingId !== null}
                        className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50 transition-all"
                      >
                        {isSyncing ? 'Syncing...' : 'Sync'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-3 rounded-xl bg-red-50 border border-red-200 px-4 py-2.5">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-gray-600 hover:bg-white transition-colors"
          >
            {success ? 'Done' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
}
