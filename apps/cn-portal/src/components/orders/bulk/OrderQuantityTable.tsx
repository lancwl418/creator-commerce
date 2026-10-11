'use client';

import { useState } from 'react';
import type { BlankVariant } from '@/lib/types/product';
import { t } from '@/lib/i18n';

interface OrderQuantityTableProps {
  variants: BlankVariant[];
  moqBySku: Record<string, number | null>;
}

/** 数量输入表，底部实时显示件数和小计（最终金额以服务端计算为准）。 */
export default function OrderQuantityTable({ variants, moqBySku }: OrderQuantityTableProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const totalQuantity = Object.values(quantities).reduce((sum, qty) => sum + qty, 0);
  const subtotal = variants.reduce((sum, v) => sum + (quantities[v.skuId] ?? 0) * v.cost, 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-gray-500">
            <th className="px-3 py-2 font-medium">SKU</th>
            <th className="px-3 py-2 font-medium">{t('sync.variant.options')}</th>
            <th className="px-3 py-2 font-medium whitespace-nowrap">{t('order.col.unitCost')}</th>
            <th className="px-3 py-2 font-medium whitespace-nowrap">{t('order.col.quantity')}</th>
          </tr>
        </thead>
        <tbody>
          {variants.map((variant) => {
            const moq = moqBySku[variant.sku];
            return (
              <tr key={variant.skuId} className="border-b border-border last:border-0">
                <td className="px-3 py-2 text-gray-800">{variant.sku}</td>
                <td className="px-3 py-2 text-gray-800">{[variant.option1, variant.option2, variant.option3].filter(Boolean).join(' / ')}</td>
                <td className="px-3 py-2 text-gray-800 whitespace-nowrap">${variant.cost.toFixed(2)}</td>
                <td className="px-3 py-2">
                  <input name={`qty:${variant.skuId}`} type="number" min="0" step="1" inputMode="numeric" placeholder="0"
                    aria-label={`${variant.sku} ${t('order.col.quantity')}`}
                    onChange={(event) => setQuantities((prev) => ({ ...prev, [variant.skuId]: Math.max(0, Math.floor(Number(event.target.value) || 0)) }))}
                    className="w-24 rounded-lg border border-border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/60 focus:border-brand-500" />
                  {moq != null && <p className="mt-1 text-[11px] text-gray-400">{t('moq.hint', 'zh', { n: moq })}</p>}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="text-sm">
            <td colSpan={3} className="px-3 py-3 text-right text-gray-500">{t('order.quantityTotal', 'zh', { n: totalQuantity })}</td>
            <td className="px-3 py-3 font-semibold text-gray-900 whitespace-nowrap">${subtotal.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
