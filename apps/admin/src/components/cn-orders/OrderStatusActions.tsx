'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateCnOrderStatus } from '@/lib/cn-orders/mutations';
import type { CnOrderStatus } from '@/lib/types/cn-order';

export function OrderStatusActions({ orderId, status }: { orderId: string; status: CnOrderStatus }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function change(next: 'confirmed' | 'cancelled') {
    setError(null);
    startTransition(async () => {
      try {
        await updateCnOrderStatus(orderId, next);
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Update failed');
      }
    });
  }

  if (status !== 'pending_confirmation') return null;
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <button type="button" onClick={() => change('confirmed')} disabled={isPending}
          className="rounded-lg bg-success-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-success-600 disabled:opacity-50">
          Confirm
        </button>
        <button type="button" onClick={() => change('cancelled')} disabled={isPending}
          className="rounded-lg border border-danger-200 px-3 py-1.5 text-xs font-medium text-danger-600 hover:bg-danger-50 disabled:opacity-50">
          Cancel
        </button>
      </div>
      {error && <p className="text-xs text-danger-600">{error}</p>}
    </div>
  );
}
