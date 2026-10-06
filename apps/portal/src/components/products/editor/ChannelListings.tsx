'use client';

import type { Listing } from '@/lib/types';
import { PRODUCT_STATUS_COLORS } from '@/lib/constants';

interface ChannelListingsProps {
  listings: Listing[];
  onUnlist?: () => void;
}

export default function ChannelListings({ listings, onUnlist }: ChannelListingsProps) {
  if (listings.length === 0) return null;

  const hasActive = listings.some((l) => l.creator_store_connection_id && l.status !== 'removed');

  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Channel Listings</h3>
        {hasActive && onUnlist && (
          <button
            onClick={onUnlist}
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors"
          >
            Unlist
          </button>
        )}
      </div>
      <div className="space-y-2">
        {listings.map((listing) => (
          <div key={listing.id} className="flex items-center justify-between rounded-xl bg-surface-secondary p-3">
            <div>
              <p className="font-medium text-sm text-gray-900">
                {listing.creator_store_connections?.store_name || listing.channel_type}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-gray-400 capitalize">{listing.creator_store_connections?.platform || 'store'}</span>
                <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${PRODUCT_STATUS_COLORS[listing.status] || 'bg-gray-100 text-gray-600'}`}>
                  {listing.status}
                </span>
              </div>
            </div>
            <p className="font-bold text-gray-900">${Number(listing.price).toFixed(2)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
