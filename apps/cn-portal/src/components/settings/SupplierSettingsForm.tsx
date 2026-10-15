'use client';

import { useActionState } from 'react';
import { saveSupplierNames, type SupplierSettingsFormState } from '@/lib/suppliers/actions';
import { SUPPLIER_NAME_MAX_LENGTH } from '@/lib/suppliers/suppliers';
import { t } from '@/lib/i18n';

export interface SupplierSettingRow {
  id: string;
  originalName: string;
  productCount: number;
  /** 已保存的自定义显示名；没有为空串 */
  displayName: string;
}

const INITIAL_STATE: SupplierSettingsFormState = {};

export default function SupplierSettingsForm({ suppliers }: { suppliers: SupplierSettingRow[] }) {
  const [state, action, pending] = useActionState(saveSupplierNames, INITIAL_STATE);

  if (suppliers.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-gray-300 p-12 text-center bg-white">
        <p className="text-gray-500">{t('settings.suppliers.empty')}</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div className="rounded-2xl border border-border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-secondary text-left text-xs text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">{t('settings.suppliers.col.original')}</th>
              <th className="px-4 py-3 font-medium w-24 text-right">{t('settings.suppliers.col.products')}</th>
              <th className="px-4 py-3 font-medium w-1/2">{t('settings.suppliers.col.display')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {suppliers.map((supplier) => (
              <tr key={supplier.id}>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{supplier.originalName || '—'}</p>
                  <p className="text-[11px] text-gray-400 font-mono">{supplier.id}</p>
                </td>
                <td className="px-4 py-3 text-right text-gray-600">{supplier.productCount}</td>
                <td className="px-4 py-3">
                  <input
                    name={`name:${supplier.id}`}
                    type="text"
                    defaultValue={supplier.displayName}
                    placeholder={supplier.originalName || t('settings.suppliers.placeholder')}
                    maxLength={SUPPLIER_NAME_MAX_LENGTH}
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.notice && !state.error && <p className="text-sm text-green-700">{state.notice}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60 transition-colors"
      >
        {pending ? t('settings.suppliers.saving') : t('settings.suppliers.save')}
      </button>
    </form>
  );
}
