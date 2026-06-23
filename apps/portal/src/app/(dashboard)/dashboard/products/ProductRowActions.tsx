'use client';

import { useState } from 'react';
import type { Listing } from '@/lib/types';
import UnlistModal from './[id]/UnlistModal';

interface ProductRowActionsProps {
  productId: string;
  listings: Listing[];
}

export default function ProductRowActions({ productId, listings }: ProductRowActionsProps) {
  const [showUnlist, setShowUnlist] = useState(false);

  const hasActive = listings.some((l) => l.creator_store_connection_id && l.status !== 'removed');
  if (!hasActive) return <div />;

  return (
    <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
      <button
        onClick={() => setShowUnlist(true)}
        title="Unlist from store"
        className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors"
      >
        Unlist
      </button>

      {showUnlist && (
        <UnlistModal
          productId={productId}
          listings={listings}
          onClose={() => setShowUnlist(false)}
        />
      )}
    </div>
  );
}
