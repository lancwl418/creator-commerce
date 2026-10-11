import type { BlankVariant } from '@/lib/types/product';
import { t } from '@/lib/i18n';

export default function BlankVariantTable({ variants }: { variants: BlankVariant[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-gray-500">
            <th className="px-3 py-2 font-medium">{t('sync.variant.enabled')}</th>
            <th className="px-3 py-2 font-medium">SKU</th>
            <th className="px-3 py-2 font-medium">{t('sync.variant.options')}</th>
            <th className="px-3 py-2 font-medium whitespace-nowrap">{t('sync.variant.cost')}</th>
            <th className="px-3 py-2 font-medium whitespace-nowrap">{t('sync.variant.price')}</th>
          </tr>
        </thead>
        <tbody>
          {variants.map((variant) => (
            <tr key={variant.skuId} className="border-b border-border last:border-0">
              <td className="px-3 py-2">
                <input type="checkbox" name="enabledSku" value={variant.skuId} defaultChecked aria-label={variant.sku} />
              </td>
              <td className="px-3 py-2 text-gray-800">{variant.sku}</td>
              <td className="px-3 py-2 text-gray-800">{[variant.option1, variant.option2, variant.option3].filter(Boolean).join(' / ')}</td>
              <td className="px-3 py-2 text-gray-800 whitespace-nowrap">${variant.cost.toFixed(2)}</td>
              <td className="px-3 py-2">
                <input name={`price:${variant.skuId}`} type="number" min="0.01" step="0.01" inputMode="decimal"
                  placeholder={t('sync.variant.pricePlaceholder')} aria-label={`${variant.sku} ${t('sync.variant.price')}`}
                  className="w-28 rounded-lg border border-border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/60 focus:border-brand-500" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
