import type { ImportedOrderGroup } from '@/lib/types/bulk-order';
import { orderQuantity, orderSubtotal } from '@/lib/orders/bulk-order';
import { t } from '@/lib/i18n';

export default function ImportPreview({ groups }: { groups: ImportedOrderGroup[] }) {
  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold text-gray-800">{t('import.previewTitle', 'zh', { n: groups.length })}</h2>
      {groups.map((group) => (
        <div key={group.ref} className={`rounded-2xl border bg-white p-5 ${group.errors.length ? 'border-red-300' : 'border-border'}`}>
          <div className="flex items-start justify-between gap-4">
            <p className="text-sm font-semibold text-gray-900">#{group.ref}</p>
            {group.items.length > 0 && (
              <p className="text-sm text-gray-700">{t('order.quantityTotal', 'zh', { n: orderQuantity(group.items) })} · ${orderSubtotal(group.items).toFixed(2)}</p>
            )}
          </div>
          {group.errors.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm text-red-600">
              {group.errors.map((error) => <li key={error}>{error}</li>)}
            </ul>
          )}
          {group.items.length > 0 && (
            <table className="w-full text-sm mt-3">
              <tbody>
                {group.items.map((item) => (
                  <tr key={item.sku_id} className="border-t border-border">
                    <td className="py-1.5 pr-3 text-gray-800">{item.product_title}</td>
                    <td className="py-1.5 pr-3 text-gray-600">{item.sku} {[item.option1, item.option2, item.option3].filter(Boolean).join(' / ')}</td>
                    <td className="py-1.5 pr-3 text-gray-800 whitespace-nowrap">${item.unit_cost.toFixed(2)} × {item.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {group.address && (
            <p className="mt-3 text-xs text-gray-500">
              {t('order.section.address')}：{group.address.name} · {group.address.phone} · {[group.address.address1, group.address.address2, group.address.city, group.address.province, group.address.zip, group.address.country].filter(Boolean).join(', ')}
            </p>
          )}
        </div>
      ))}
    </section>
  );
}
