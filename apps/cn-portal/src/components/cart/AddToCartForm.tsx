'use client';

import { useActionState } from 'react';
import { addToCart } from '@/lib/cart/actions';
import type { BlankVariant } from '@/lib/types/product';
import type { BulkOrderFormState } from '@/lib/types/bulk-order';
import { t } from '@/lib/i18n';
import AuthFormStatus from '@/components/auth/AuthFormStatus';
import AuthSubmitButton from '@/components/auth/AuthSubmitButton';
import OrderQuantityTable from '@/components/orders/bulk/OrderQuantityTable';

const INITIAL_STATE: BulkOrderFormState = {};

export default function AddToCartForm({ erpProductId, variants, moqBySku }: { erpProductId: string; variants: BlankVariant[]; moqBySku: Record<string, number | null> }) {
  const [state, action, pending] = useActionState(addToCart, INITIAL_STATE);
  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="erpProductId" value={erpProductId} />
      <section className="rounded-2xl border border-border bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-1">{t('order.section.items')}</h2>
        <p className="text-xs text-gray-400 mb-3">{t('cart.addHint')}</p>
        <OrderQuantityTable variants={variants} moqBySku={moqBySku} />
      </section>
      <AuthFormStatus state={state} />
      <AuthSubmitButton pending={pending} label={t('cart.add')} pendingLabel={t('cart.adding')} />
    </form>
  );
}
