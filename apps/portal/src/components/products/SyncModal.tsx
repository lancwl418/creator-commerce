'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import GhostLoader from '@/components/GhostLoader';
import Modal from '@/components/ui/Modal';
import { getChannelInfo } from '@/lib/channels';
import { useProductSync } from '@/hooks/products/useProductSync';
import type { Listing } from '@/lib/types/product';

interface SyncModalProps {
  productId: string;
  listings: Listing[];
  onClose: () => void;
  onSynced: () => void;
  onBeforeSync?: () => Promise<void>;
}

export default function SyncModal({ productId, listings, onClose, onSynced, onBeforeSync }: SyncModalProps) {
  const router = useRouter();
  const { stores, loading, syncingId, error, success, storeStatuses, setStoreStatus, handleSync } = useProductSync(productId, onSynced, onBeforeSync);
  const isAlreadySynced = (storeId: string) => listings.find(listing => listing.creator_store_connection_id === storeId && listing.status !== 'removed');
  const handleDismiss = () => { if (success) router.push('/dashboard/products'); else onClose(); };
  return (
    <Modal title="Sync to Store" onClose={handleDismiss} footer={
      <button
        onClick={handleDismiss}
        className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-gray-600 hover:bg-white transition-colors"
      >
        {success ? 'Done' : 'Cancel'}
      </button>
    }>

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
      {loading && !success && !syncingId && (
        <GhostLoader size="sm" message="Loading stores…" />
      )}

      {/* Syncing in progress */}
      {syncingId && !success && (
        <GhostLoader
          size="md"
          message={`Syncing to ${stores.find((s) => s.id === syncingId)?.store_name ||
            stores.find((s) => s.id === syncingId)?.platform ||
            'your store'
            }…`}
        />
      )}

      {/* No stores */}
      {!loading && !success && !syncingId && stores.length === 0 && (
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
      {!loading && !success && !syncingId && stores.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">Choose a store to sync this product to:</p>
          {stores.map(store => {
            const existing = isAlreadySynced(store.id);
            const platformInfo = getChannelInfo(store.platform);
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
                  <div className="flex items-center gap-2">
                    <select
                      value={storeStatuses[store.id] || 'active'}
                      onChange={(e) => setStoreStatus(store.id, e.target.value === 'draft' ? 'draft' : 'active')}
                      className="rounded-lg border border-border px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    >
                      <option value="active">Active</option>
                      <option value="draft">Draft</option>
                    </select>
                    <button
                      onClick={() => handleSync(store)}
                      disabled={isSyncing || syncingId !== null}
                      className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50 transition-all"
                    >
                      {isSyncing ? 'Syncing...' : 'Sync'}
                    </button>
                  </div>
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

    </Modal>
  );
}
