'use client';

import { useActionState } from 'react';
import type { BlankVariant } from '@/lib/types/product';
import type { BulkOrderFormState, ShippingAddress } from '@/lib/types/bulk-order';
import type { PrintFace } from '@/lib/products/print-faces';
import DesignUploadFields from './DesignUploadFields';
import { t } from '@/lib/i18n';
import AuthFormStatus from '@/components/auth/AuthFormStatus';
import AuthSubmitButton from '@/components/auth/AuthSubmitButton';
import OrderQuantityTable from './OrderQuantityTable';
import ShippingAddressFields from './ShippingAddressFields';

type OrderAction = (state: BulkOrderFormState, form: FormData) => Promise<BulkOrderFormState>;

interface BulkOrderFormProps {
  action: OrderAction;
  hiddenFields: Record<string, string>;
  variants: BlankVariant[];
  moqBySku: Record<string, number | null>;
  defaultAddress: Partial<ShippingAddress> | null;
  /** 上传设计下单时可上传的印刷面 */
  designFaces?: PrintFace[];
}

const INITIAL_STATE: BulkOrderFormState = {};

/** 采购单表单：白板下单与设计下单共用，差别只在单价来源和提交动作。 */
export default function BulkOrderForm({ action, hiddenFields, variants, moqBySku, defaultAddress, designFaces }: BulkOrderFormProps) {
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE);
  const address = state.address ?? defaultAddress ?? {};
  return (
    <form action={formAction} className="space-y-6">
      {Object.entries(hiddenFields).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}

      {designFaces && (
        <section className="rounded-2xl border border-border bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-1">{t('order.section.design')}</h2>
          <p className="text-xs text-gray-400 mb-3">{t('order.section.designHint')}</p>
          <DesignUploadFields faces={designFaces} />
        </section>
      )}

      <section className="rounded-2xl border border-border bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-1">{t('order.section.items')}</h2>
        <p className="text-xs text-gray-400 mb-3">{t('order.section.itemsHint')}</p>
        <OrderQuantityTable variants={variants} moqBySku={moqBySku} />
      </section>

      <section className="rounded-2xl border border-border bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">{t('order.section.address')}</h2>
        <ShippingAddressFields address={address} />
      </section>

      <section className="rounded-2xl border border-border bg-white p-5">
        <label htmlFor="note" className="block text-sm font-medium text-gray-700 mb-1.5">{t('order.field.note')}</label>
        <textarea id="note" name="note" rows={3} maxLength={1000}
          className="w-full rounded-xl border border-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/60 focus:border-brand-500" />
      </section>

      <p className="text-xs text-gray-500">{t('order.paymentNote')}</p>
      <AuthFormStatus state={state} />
      <AuthSubmitButton pending={pending} label={t('order.submit')} pendingLabel={t('order.pending')} />
    </form>
  );
}
