'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { SELLER_TIERS, isSellerTier, type SellerTier } from '@creator-commerce/shared/erp/pricing';
import { updateCnSellerTier } from '@/lib/cn-sellers/mutations';

export const TIER_LABELS: Record<SellerTier, string> = {
  CN_MERCHANT: 'China merchant',
  VIP: 'VIP',
  WHOLESALE: 'Wholesale',
};

export function SellerTierSelect({ sellerId, tier }: { sellerId: string; tier: SellerTier }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleChange(value: string) {
    if (!isSellerTier(value) || value === tier) return;
    setError(null);
    startTransition(async () => {
      try {
        await updateCnSellerTier(sellerId, value);
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Update failed');
      }
    });
  }

  return (
    <div>
      <select
        value={tier}
        disabled={isPending}
        onChange={(event) => handleChange(event.target.value)}
        aria-label="Seller tier"
        className="rounded-lg border border-border-light bg-white px-2.5 py-1.5 text-sm text-gray-800 disabled:opacity-50"
      >
        {SELLER_TIERS.map((option) => (
          <option key={option} value={option}>{TIER_LABELS[option]}</option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-danger-600">{error}</p>}
    </div>
  );
}
