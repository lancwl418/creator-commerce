import { removeCartItem, updateCartItem } from '@/lib/cart/actions';
import type { PricedCartItem } from '@/lib/types/bulk-order';
import { t } from '@/lib/i18n';
import { faceLabel } from '@/lib/orders/face-label';

/** 分组键：同一产品的白板行一组；带设计的行按设计组合分组（同一次加入的在一起） */
function groupKey(item: PricedCartItem): string {
  const designs = (item.design_files ?? []).map((file) => file.design_url).join(',');
  return `${item.erp_product_id}|${item.faces}|${designs}`;
}

/** 先按供应商分、再按产品 + 设计分（不同供应商的产品分开展示） */
function groupBySupplier(items: PricedCartItem[]): { supplierName: string | null; groups: PricedCartItem[][] }[] {
  const bySupplier = new Map<string, { supplierName: string | null; groups: Map<string, PricedCartItem[]> }>();
  for (const item of items) {
    const supplierKey = item.supplier_id ?? '';
    const section = bySupplier.get(supplierKey) ?? { supplierName: item.supplier_name, groups: new Map() };
    const key = groupKey(item);
    section.groups.set(key, [...(section.groups.get(key) ?? []), item]);
    bySupplier.set(supplierKey, section);
  }
  return [...bySupplier.values()].map(({ supplierName, groups }) => ({ supplierName, groups: [...groups.values()] }));
}

/** 购物车行：按供应商 → 产品 + 设计分组，数量可改、可删除；没价的行标红，结算时必须先删掉。 */
export default function CartItems({ items }: { items: PricedCartItem[] }) {
  const sections = groupBySupplier(items);
  const subtotal = items.reduce((sum, item) => sum + (item.unit_cost ?? 0) * item.quantity, 0);

  return (
    <div className="space-y-4">
      {sections.map((section, sectionIndex) => (
        <div key={section.supplierName ?? `supplier-${sectionIndex}`} className="rounded-2xl border border-border bg-white overflow-hidden">
          {section.supplierName && (
            <div className="px-5 py-2.5 border-b border-border text-xs font-semibold text-gray-500">
              {t('detail.supplier')}：<span className="text-gray-800">{section.supplierName}</span>
            </div>
          )}
          {section.groups.map((rows) => {
            const designs = rows[0].design_files ?? [];
            return (
              <div key={groupKey(rows[0])} className="border-b border-border last:border-0">
            <div className="px-5 py-3 bg-surface-secondary">
              <p className="text-sm font-semibold text-gray-800">
                {rows[0].product_title}
                <span className="ml-2 rounded-md bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium text-gray-500">
                  {rows[0].faces > 0 ? t('cart.designed', 'zh', { n: rows[0].faces }) : t('order.type.blank')}
                </span>
              </p>
              {designs.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {designs.map((file) => (
                    <a key={file.design_url} href={file.design_url} target="_blank" rel="noopener noreferrer" className="text-center">
                      {file.preview_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={file.preview_url} alt="" className="h-12 w-12 rounded-md border border-border bg-white object-contain p-0.5" />
                      ) : (
                        <span className="flex h-12 w-12 items-center justify-center rounded-md border border-dashed border-border text-[10px] text-gray-400">{faceLabel(file.face)}</span>
                      )}
                      <span className="block text-[10px] text-gray-500 mt-0.5">{faceLabel(file.face)}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
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
            );
          })}
        </div>
      ))}
      <div className="rounded-2xl border border-border bg-white px-5 py-3 flex justify-between text-sm">
        <span className="text-gray-500">{t('order.quantityTotal', 'zh', { n: items.reduce((s, i) => s + i.quantity, 0) })}</span>
        <span className="font-semibold text-gray-900">${subtotal.toFixed(2)}</span>
      </div>
    </div>
  );
}
