'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateCnSellerSuppliers } from '@/lib/cn-sellers/mutations';
import type { SupplierOptionLite } from '@/lib/types/cn-seller';
import { useT } from '@/lib/i18n/client';

interface SellerSupplierAccessProps {
  sellerId: string;
  /** 当前白名单；空 = 看全部 */
  supplierIds: string[];
  /** ERP 目录里的全部主供应商；ERP 加载失败时为 null */
  options: SupplierOptionLite[] | null;
}

/** 卖家可见供应商：空 = 全部；编辑时勾选白名单。 */
export function SellerSupplierAccess({ sellerId, supplierIds, options }: SellerSupplierAccessProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(supplierIds));
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const t = useT();

  const nameById = new Map((options ?? []).map((option) => [option.id, option.name]));
  // 白名单里可能有 ERP 目录已不再出现的供应商：编辑时照样列出来，方便取消勾选
  const editableOptions: SupplierOptionLite[] = [
    ...(options ?? []),
    ...supplierIds.filter((id) => !nameById.has(id)).map((id) => ({ id, name: id, productCount: 0 })),
  ];

  function startEditing() {
    setSelected(new Set(supplierIds));
    setError(null);
    setEditing(true);
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        await updateCnSellerSuppliers(sellerId, [...selected]);
        setEditing(false);
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : t('common.updateFailed'));
      }
    });
  }

  if (!editing) {
    return (
      <div className="max-w-xs">
        {supplierIds.length === 0 ? (
          <span className="text-xs text-gray-500">{t('cnSellers.suppliers.all')}</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {supplierIds.map((id) => (
              <span key={id} className="inline-block rounded-md bg-primary-50 px-2 py-0.5 text-xs text-primary-700" title={id}>
                {nameById.get(id) ?? id}
              </span>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={startEditing}
          disabled={options === null}
          className="mt-1 block text-xs font-medium text-primary-600 hover:text-primary-500 disabled:text-gray-300"
        >
          {t('common.edit')}
        </button>
      </div>
    );
  }

  return (
    <div className="w-72 rounded-xl border border-border-light bg-gray-50 p-3">
      <p className="text-xs text-gray-500">{t('cnSellers.suppliers.hint')}</p>
      <div className="mt-2 max-h-56 space-y-1 overflow-y-auto">
        {editableOptions.map((option) => (
          <label key={option.id} className="flex items-center gap-2 text-sm text-gray-800">
            <input
              type="checkbox"
              checked={selected.has(option.id)}
              onChange={() => toggle(option.id)}
              disabled={isPending}
            />
            <span className="flex-1 truncate" title={option.id}>{option.name}</span>
            <span className="text-xs text-gray-400">{option.productCount}</span>
          </label>
        ))}
        {editableOptions.length === 0 && <p className="text-xs text-gray-400">{t('cnSellers.suppliers.none')}</p>}
      </div>
      {error && <p className="mt-2 text-xs text-danger-600">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={isPending}
          className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-500 disabled:opacity-50"
        >
          {isPending ? t('common.saving') : t('common.save')}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          disabled={isPending}
          className="rounded-lg border border-border-light bg-white px-3 py-1.5 text-xs text-gray-700 disabled:opacity-50"
        >
          {t('common.cancel')}
        </button>
      </div>
    </div>
  );
}
