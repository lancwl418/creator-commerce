'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import GhostLoader from '@/components/GhostLoader';
import type { Listing } from '@/lib/types';

interface UnlistModalProps {
  productId: string;
  listings: Listing[];
  onClose: () => void;
  onUnlisted?: () => void;
}

const platformIcons: Record<string, { name: string; color: string }> = {
  shopify: { name: 'Shopify', color: 'bg-[#96bf48]' },
  etsy: { name: 'Etsy', color: 'bg-[#F1641E]' },
  tiktok_shop: { name: 'TikTok Shop', color: 'bg-black' },
};

export default function UnlistModal({ productId, listings, onClose, onUnlisted }: UnlistModalProps) {
  const router = useRouter();
  const [unlistingId, setUnlistingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState('');
  // Track removed connection ids so the row updates immediately
  const [removed, setRemoved] = useState<Set<string>>(new Set());

  // Only listings tied to a store that haven't been removed
  const active = listings.filter(
    (l) => l.creator_store_connection_id && l.status !== 'removed' && !removed.has(l.creator_store_connection_id!),
  );

  async function handleUnlist(listing: Listing) {
    const storeId = listing.creator_store_connection_id!;
    setUnlistingId(storeId);
    setError('');

    try {
      const res = await fetch('/api/shopify/unlist-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_instance_id: productId,
          store_connection_id: storeId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Unlist failed (${res.status})`);
      }

      setRemoved((prev) => new Set(prev).add(storeId));
      setConfirmId(null);
      onUnlisted?.();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unlist');
    } finally {
      setUnlistingId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">Unlist from Store</h3>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
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
                const platformInfo = platformIcons[platform] || { name: platform, color: 'bg-gray-500' };
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
                          onClick={() => handleUnlist(listing)}
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
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-gray-600 hover:bg-white transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
