'use client';

import { useState } from 'react';
import GhostLoader from '@/components/GhostLoader';
import Modal from '@/components/ui/Modal';
import { getChannelInfo } from '@/lib/channels';
import { useProductUnlist } from '@/hooks/products/useProductUnlist';
import type { Listing } from '@/lib/types/product';

interface UnlistModalProps {
  productId: string;
  listings: Listing[];
  onClose: () => void;
  onUnlisted?: () => void;
}

export default function UnlistModal({ productId, listings, onClose, onUnlisted }: UnlistModalProps) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const { unlistingId, error, removed, handleUnlist } = useProductUnlist(productId, onUnlisted);
  const active = listings.filter(listing => listing.creator_store_connection_id && listing.status !== 'removed' && !removed.has(listing.creator_store_connection_id));
  return (
    <Modal title="Unlist from Store" onClose={onClose} footer={
      <button
        onClick={onClose}
        className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-gray-600 hover:bg-white transition-colors"
      >
        Done
      </button>
    }>

      {unlistingId && (
        <GhostLoader size="md" message="Removing from store…" />
      )}

      {!unlistingId && active.length === 0 && (
        <div className="text-center py-6">
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>
          <p className="text-sm text-gray-600">This product is no longer listed on any store.</p>
        </div>
      )}

      {!unlistingId && active.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">Choose a store to remove this product from. It will be deleted from the store and taken down here.</p>
          {active.map((listing) => {
            const platform = listing.creator_store_connections?.platform || listing.channel_type;
            const platformInfo = getChannelInfo(platform);
            const storeName = listing.creator_store_connections?.store_name || platformInfo.name;
            const isConfirming = confirmId === listing.creator_store_connection_id;

            return (
              <div key={listing.id} className="flex items-center justify-between rounded-xl border border-border p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-lg ${platformInfo.color} text-white flex items-center justify-center text-xs font-bold shrink-0`}>
                    {platformInfo.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{storeName}</p>
                    <p className="text-xs text-gray-400">{platformInfo.name}</p>
                  </div>
                </div>

                {isConfirming ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setConfirmId(null)}
                      className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => { await handleUnlist(listing); setConfirmId(null); }}
                      className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-500 transition-colors"
                    >
                      Confirm
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmId(listing.creator_store_connection_id!)}
                    className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100 transition-colors shrink-0"
                  >
                    Unlist
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-xl bg-red-50 border border-red-200 px-4 py-2.5">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

    </Modal>
  );
}
