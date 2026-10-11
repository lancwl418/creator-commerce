import { removeCartItem, updateCartItem } from '@/lib/cart/actions';
import type { PricedCartItem } from '@/lib/types/bulk-order';
import { t } from '@/lib/i18n';

/** 购物车行：按产品分组，数量可改、可删除；没价的行标红，结算时必须先删掉。 */
export default function CartItems({ items }: { items: PricedCartItem[] }) {
  const byProduct = new Map<string, PricedCartItem[]>();
  for (const item of items) {
    const list = byProduct.get(item.erp_product_id) ?? [];
    list.push(item);
    byProduct.set(item.erp_product_id, list);
  }
  const subtotal = items.reduce((sum, item) => sum + (item.unit_cost ?? 0) * item.quantity, 0);

  return (
    <div className="rounded-2xl border border-border bg-white overflow-hidden">
      {[...byProduct.entries()].map(([productId, rows]) => (
        <div key={productId} className="border-b border-border last:border-0">
          <div className="px-5 py-3 bg-surface-secondary text-sm font-semibold text-gray-800">{rows[0].product_title}</div>
          <table className="w-full text-sm">
            <tbody>
              {rows.map((item) => (
                <tr key={item.id} className="border-t border-border">
                  <td className="px-5 py-2.5 text-gray-800">{item.sku}</td>
                  <td className="px-3 py-2.5 text-gray-600">{[item.option1, item.option2, item.option3].filter(Boolean).join(' / ')}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {item.unit_cost == null ? <span className="text-red-600 text-xs">{t('cart.unpriced')}</span> : `$${item.unit_cost.toFixed(2)}`}
                  </td>
                  <td className="px-3 py-2.5">
                    <form action={updateCartItem} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={item.id} />
                      <input name="quantity" type="number" min="0" step="1" defaultValue={item.quantity} aria-label={`${item.sku} ${t('order.col.quantity')}`}
                        className="w-20 rounded-lg border border-border px-2 py-1 text-sm" />
                      <button type="submit" className="text-xs text-gray-600 underline underline-offset-2">{t('cart.update')}</button>
                    </form>
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    {item.unit_cost != null && <span className="text-gray-800">${(item.unit_cost * item.quantity).toFixed(2)}</span>}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <form action={removeCartItem}>
                      <input type="hidden" name="id" value={item.id} />
                      <button type="submit" className="text-xs text-red-600 underline underline-offset-2">{t('cart.remove')}</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      <div className="px-5 py-3 flex justify-between text-sm">
        <span className="text-gray-500">{t('order.quantityTotal', 'zh', { n: items.reduce((s, i) => s + i.quantity, 0) })}</span>
        <span className="font-semibold text-gray-900">${subtotal.toFixed(2)}</span>
      </div>
    </div>
  );
}
