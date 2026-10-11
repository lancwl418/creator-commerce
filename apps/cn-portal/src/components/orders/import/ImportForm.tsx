'use client';

import { useActionState } from 'react';
import { importOrders } from '@/lib/orders/actions';
import type { ImportFormState, ShippingAddress } from '@/lib/types/bulk-order';
import { t } from '@/lib/i18n';
import AuthSubmitButton from '@/components/auth/AuthSubmitButton';
import ShippingAddressFields from '@/components/orders/bulk/ShippingAddressFields';
import ImportPreview from './ImportPreview';

const INITIAL_STATE: ImportFormState = {};

/** 表格下单：上传 CSV → 预览每张采购单 → 确认提交 */
export default function ImportForm({ defaultAddress }: { defaultAddress: Partial<ShippingAddress> | null }) {
  const [state, action, pending] = useActionState(importOrders, INITIAL_STATE);
  const canConfirm = !!state.groups && state.groups.every((g) => g.errors.length === 0);

  return (
    <form action={action} className="space-y-6">
      <section className="rounded-2xl border border-border bg-white p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-800">{t('import.section.file')}</h2>
        <p className="text-xs text-gray-500">{t('import.fileHint')} <a href="/orders/import/template" className="underline underline-offset-2 text-gray-800">{t('import.template')}</a></p>
        <input name="file" type="file" accept=".csv,text/csv" className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-200" />
        {state.csv && <input type="hidden" name="csv" value={state.csv} />}
      </section>

      <section className="rounded-2xl border border-border bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-1">{t('import.section.address')}</h2>
        <p className="text-xs text-gray-400 mb-3">{t('import.addressHint')}</p>
        <ShippingAddressFields address={state.address ?? defaultAddress ?? {}} required={false} />
      </section>

      {state.error && <p role="alert" className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">{state.error}</p>}
      {state.groups && <ImportPreview groups={state.groups} />}

      <div className="flex gap-3">
        <AuthSubmitButton pending={pending} label={t('import.preview')} pendingLabel={t('import.parsing')} />
        {canConfirm && (
          <button type="submit" name="confirm" value="1" disabled={pending}
            className="w-full rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50">
            {t('import.confirm', 'zh', { n: state.groups!.length })}
          </button>
        )}
      </div>
      <p className="text-xs text-gray-500">{t('order.paymentNote')}</p>
    </form>
  );
}
