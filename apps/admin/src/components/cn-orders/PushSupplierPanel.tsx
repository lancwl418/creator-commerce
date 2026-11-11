'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setPushSupplier } from '@/lib/cn-orders/mutations';
import type { ProductPushPrep, SupplierOptionView } from '@/lib/types/cn-order';
import { useT } from '@/lib/i18n/client';
import type { Translate } from '@/lib/i18n/messages';

function optionLabel(option: SupplierOptionView, t: Translate): string {
  const cost = option.total !== null ? `$${option.total.toFixed(2)}` : t('pushSupplier.noQuote', { count: option.missingItems });
  const nickname = option.nickname ? t('pushSupplier.sellerNickname', { name: option.nickname }) : '';
  return `${option.name}${nickname} — ${cost}${option.isMain ? t('pushSupplier.default') : ''}`;
}

/** 推送预处理：按产品展示各工厂做本单的成本，运营改选后立即保存到 push_suppliers。 */
export function PushSupplierPanel({ orderId, products }: { orderId: string; products: ProductPushPrep[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const t = useT();

  function select(product: ProductPushPrep, quoteId: string) {
    const option = product.options.find((o) => o.quoteId === quoteId);
    setError(null);
    startTransition(async () => {
      try {
        await setPushSupplier(
          orderId,
          product.erpProductId,
          // 选回默认（主）供应商 = 清除覆盖
          !option || option.isMain
            ? null
            : { supplier_id: option.supplierId, supplier_name: option.name, quote_id: option.quoteId }
        );
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : t('common.saveFailed'));
      }
    });
  }

  return (
    <div className="mt-3 rounded-xl bg-gray-50 border border-border-light p-3">
      <p className="text-xs font-medium text-gray-500 mb-2">{t('pushSupplier.title')}</p>
      <div className="space-y-2">
        {products.map((product) => {
          const selected =
            product.options.find((o) => o.quoteId === product.selectedQuoteId) ??
            product.options.find((o) => o.isMain) ??
            product.options[0];
          const cheapest = product.options.reduce<SupplierOptionView | null>(
            (best, o) => (o.total !== null && (best?.total == null || o.total < best.total) ? o : best),
            null
          );
          return (
            <div key={product.erpProductId} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-gray-700 min-w-40">
                {product.productTitle}
                <span className="ml-1.5 font-mono text-xs text-gray-400 select-all">{product.erpItemNo ?? product.erpProductId}</span>
              </span>
              <select
                value={selected?.quoteId ?? ''}
                onChange={(event) => select(product, event.target.value)}
                disabled={isPending}
                className="rounded-lg border border-border-light bg-white px-2 py-1 text-sm text-gray-800 disabled:opacity-50"
              >
                {product.options.map((option) => (
                  <option key={option.quoteId} value={option.quoteId} disabled={option.total === null}>
                    {optionLabel(option, t)}
                  </option>
                ))}
              </select>
              {cheapest && selected && cheapest.quoteId !== selected.quoteId && selected.total !== null && cheapest.total !== null && (
                <span className="text-xs text-warning-600">
                  {t('pushSupplier.cheaper', { name: cheapest.name, amount: (selected.total - cheapest.total).toFixed(2) })}
                </span>
              )}
              {product.selectedQuoteId && <span className="text-xs text-primary-600">{t('pushSupplier.custom')}</span>}
            </div>
          );
        })}
      </div>
      {error && <p className="mt-2 text-xs text-danger-600">{error}</p>}
    </div>
  );
}
