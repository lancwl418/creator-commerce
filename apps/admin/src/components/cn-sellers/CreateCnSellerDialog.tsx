'use client';

import { useActionState, useState } from 'react';
import { SELLER_TIERS } from '@creator-commerce/shared/erp/pricing';
import { createCnSellerAction, type CreateCnSellerState } from '@/lib/cn-sellers/actions';
import { useT } from '@/lib/i18n/client';
import type { SupplierOptionLite } from '@/lib/types/cn-seller';

const INITIAL_STATE: CreateCnSellerState = {};

const INPUT_CLASS =
  'mt-1 w-full rounded-lg border border-border-light bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20';

/** 「新建卖家」按钮 + 弹窗表单。suppliers 为 null 表示 ERP 供应商没加载到，可建好后再分配。 */
export function CreateCnSellerDialog({ suppliers }: { suppliers: SupplierOptionLite[] | null }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createCnSellerAction, INITIAL_STATE);
  // 成功后的提示放在弹窗外，关掉弹窗也能看到
  const [lastNotice, setLastNotice] = useState<string | null>(null);
  // 每次创建成功（createdAt 变化）关一次弹窗：在渲染中对比上次处理过的结果
  const [handledCreatedAt, setHandledCreatedAt] = useState<number | undefined>(undefined);
  if (state.createdAt && state.createdAt !== handledCreatedAt) {
    setHandledCreatedAt(state.createdAt);
    setLastNotice(state.notice ?? null);
    setOpen(false);
  }

  const values = state.values ?? {};

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
      >
        {t('cnSellers.create.button')}
      </button>
      {lastNotice && !open && (
        <p className="basis-full rounded-xl bg-success-50 px-4 py-2 text-sm text-success-600">{lastNotice}</p>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <form action={action} className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900">{t('cnSellers.create.title')}</h2>
            <p className="mt-1 text-xs text-gray-500">{t('cnSellers.create.subtitle')}</p>

            <div className="mt-4 space-y-3">
              <label className="block text-xs text-gray-500">
                {t('cnSellers.create.account')}
                <input name="account" required defaultValue={values.account} autoComplete="off" className={INPUT_CLASS} />
                <span className="mt-1 block text-[11px] text-gray-400">{t('cnSellers.create.accountHint')}</span>
              </label>
              <label className="block text-xs text-gray-500">
                {t('cnSellers.create.password')}
                <input name="password" type="text" required minLength={6} autoComplete="new-password" className={INPUT_CLASS} />
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block text-xs text-gray-500 sm:col-span-2">
                  {t('cnSellers.create.companyName')}
                  <input name="companyName" required defaultValue={values.companyName} className={INPUT_CLASS} />
                </label>
                <label className="block text-xs text-gray-500">
                  {t('cnSellers.create.contactName')}
                  <input name="contactName" required defaultValue={values.contactName} className={INPUT_CLASS} />
                </label>
                <label className="block text-xs text-gray-500">
                  {t('cnSellers.create.phone')}
                  <input name="phone" required defaultValue={values.phone} className={INPUT_CLASS} />
                </label>
              </div>
              <label className="block text-xs text-gray-500">
                {t('cnSellers.create.tier')}
                <select name="tier" defaultValue={values.tier || 'CN_MERCHANT'} className={INPUT_CLASS}>
                  {SELLER_TIERS.map((tier) => (
                    <option key={tier} value={tier}>{t(`cnSellers.tier.${tier}`)}</option>
                  ))}
                </select>
              </label>

              <fieldset>
                <legend className="text-xs text-gray-500">{t('cnSellers.create.suppliers')}</legend>
                {suppliers === null ? (
                  <p className="mt-1 text-xs text-gray-400">{t('cnSellers.create.suppliersUnavailable')}</p>
                ) : suppliers.length === 0 ? (
                  <p className="mt-1 text-xs text-gray-400">{t('cnSellers.suppliers.none')}</p>
                ) : (
                  <div className="mt-1 max-h-40 space-y-1 overflow-y-auto rounded-lg border border-border-light p-2">
                    {suppliers.map((supplier) => (
                      <label key={supplier.id} className="flex items-center gap-2 text-sm text-gray-800">
                        <input type="checkbox" name="supplier" value={supplier.id} />
                        <span className="flex-1 truncate" title={supplier.id}>{supplier.name}</span>
                        <span className="text-xs text-gray-400">{supplier.productCount}</span>
                      </label>
                    ))}
                  </div>
                )}
              </fieldset>
            </div>

            {state.error && <p className="mt-3 text-sm text-danger-600">{state.error}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={pending}
                className="rounded-lg border border-border-light px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={pending}
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {pending ? t('cnSellers.create.submitting') : t('cnSellers.create.submit')}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
