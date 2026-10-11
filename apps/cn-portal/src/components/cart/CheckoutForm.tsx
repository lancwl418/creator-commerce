'use client';

import { useActionState } from 'react';
import { checkoutCart } from '@/lib/cart/actions';
import type { BulkOrderFormState, ShippingAddress } from '@/lib/types/bulk-order';
import { t } from '@/lib/i18n';
import AuthFormStatus from '@/components/auth/AuthFormStatus';
import AuthSubmitButton from '@/components/auth/AuthSubmitButton';
import ShippingAddressFields from '@/components/orders/bulk/ShippingAddressFields';

const INITIAL_STATE: BulkOrderFormState = {};

export default function CheckoutForm({ defaultAddress, disabled }: { defaultAddress: Partial<ShippingAddress> | null; disabled: boolean }) {
  const [state, action, pending] = useActionState(checkoutCart, INITIAL_STATE);
  return (
    <form action={action} className="space-y-6">
      <section className="rounded-2xl border border-border bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">{t('order.section.address')}</h2>
        <ShippingAddressFields address={state.address ?? defaultAddress ?? {}} />
      </section>
      <section className="rounded-2xl border border-border bg-white p-5">
        <label htmlFor="note" className="block text-sm font-medium text-gray-700 mb-1.5">{t('order.field.note')}</label>
        <textarea id="note" name="note" rows={3} maxLength={1000} className="w-full rounded-xl border border-border px-4 py-2.5 text-sm" />
      </section>
      <p className="text-xs text-gray-500">{t('order.paymentNote')}</p>
      <AuthFormStatus state={state} />
      <AuthSubmitButton pending={pending || disabled} label={t('cart.checkout')} pendingLabel={t('order.pending')} />
    </form>
  );
}
