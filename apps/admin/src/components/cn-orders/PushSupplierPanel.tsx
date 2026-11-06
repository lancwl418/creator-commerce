'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setPushSupplier } from '@/lib/cn-orders/mutations';
import type { ProductPushPrep, SupplierOptionView } from '@/lib/types/cn-order';

function optionLabel(option: SupplierOptionView): string {
  const cost = option.total !== null ? `$${option.total.toFixed(2)}` : `no quote for ${option.missingItems} item(s)`;
  const nickname = option.nickname ? `（卖家侧 ${option.nickname}）` : '';
  return `${option.name}${nickname} — ${cost}${option.isMain ? ' · default' : ''}`;
}

/** 推送预处理：按产品展示各工厂做本单的成本，运营改选后立即保存到 push_suppliers。 */
export function PushSupplierPanel({ orderId, products }: { orderId: string; products: ProductPushPrep[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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
        setError(cause instanceof Error ? cause.message : 'Save failed');
      }
    });
  }

  return (
    <div className="mt-3 rounded-xl bg-gray-50 border border-border-light p-3">
      <p className="text-xs font-medium text-gray-500 mb-2">Push factory (cost for this order&apos;s quantities)</p>
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
              <span className="text-gray-700 min-w-40">{product.productTitle}</span>
              <select
                value={selected?.quoteId ?? ''}
                onChange={(event) => select(product, event.target.value)}
                disabled={isPending}
                className="rounded-lg border border-border-light bg-white px-2 py-1 text-sm text-gray-800 disabled:opacity-50"
              >
                {product.options.map((option) => (
                  <option key={option.quoteId} value={option.quoteId} disabled={option.total === null}>
                    {optionLabel(option)}
                  </option>
                ))}
              </select>
              {cheapest && selected && cheapest.quoteId !== selected.quoteId && selected.total !== null && cheapest.total !== null && (
                <span className="text-xs text-warning-600">
                  {cheapest.name} is cheaper by ${(selected.total - cheapest.total).toFixed(2)}
                </span>
              )}
              {product.selectedQuoteId && <span className="text-xs text-primary-600">custom</span>}
            </div>
          );
        })}
      </div>
      {error && <p className="mt-2 text-xs text-danger-600">{error}</p>}
    </div>
  );
}
