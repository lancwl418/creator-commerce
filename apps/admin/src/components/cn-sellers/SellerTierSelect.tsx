'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { SELLER_TIERS, isSellerTier, type SellerTier } from '@creator-commerce/shared/erp/pricing';
import { updateCnSellerTier } from '@/lib/cn-sellers/mutations';
import { useT } from '@/lib/i18n/client';

export function SellerTierSelect({ sellerId, tier }: { sellerId: string; tier: SellerTier }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const t = useT();

  function handleChange(value: string) {
    if (!isSellerTier(value) || value === tier) return;
    setError(null);
    startTransition(async () => {
      try {
        await updateCnSellerTier(sellerId, value);
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : t('common.updateFailed'));
      }
    });
  }

  return (
    <div>
      <select
        value={tier}
        disabled={isPending}
        onChange={(event) => handleChange(event.target.value)}
        aria-label={t('cnSellers.tierLabel')}
        className="rounded-lg border border-border-light bg-white px-2.5 py-1.5 text-sm text-gray-800 disabled:opacity-50"
      >
        {SELLER_TIERS.map((option) => (
          <option key={option} value={option}>{t(`cnSellers.tier.${option}`)}</option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-danger-600">{error}</p>}
    </div>
  );
}
