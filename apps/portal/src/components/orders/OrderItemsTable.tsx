import type { OrderDetailData } from '@/lib/types/order';
import Image from 'next/image';

interface OrderItemsTableProps { items: OrderDetailData['creator_order_items']; }

export default function OrderItemsTable({ items }: OrderItemsTableProps) {
  return (
    <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Items</h3>
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left px-6 py-2.5 text-[11px] font-semibold text-gray-400 uppercase">Product</th>
            <th className="text-left px-6 py-2.5 text-[11px] font-semibold text-gray-400 uppercase">SKU / IDs</th>
            <th className="text-center px-6 py-2.5 text-[11px] font-semibold text-gray-400 uppercase">Qty</th>
            <th className="text-right px-6 py-2.5 text-[11px] font-semibold text-gray-400 uppercase">Price</th>
            <th className="text-right px-6 py-2.5 text-[11px] font-semibold text-gray-400 uppercase">Cost</th>
            <th className="text-right px-6 py-2.5 text-[11px] font-semibold text-gray-400 uppercase">Earnings</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {items.map(item => {
            const customSku = item.channel_listing_variants?.custom_product_skus;
            const previewImg = customSku?.preview_image_url;
            return (
              <tr key={item.id}>
                <td className="px-6 py-3.5">
                  <div className="flex items-center gap-3">
                    {previewImg && (
                      <div className="w-10 h-10 rounded-md border border-border bg-gray-50 overflow-hidden shrink-0">
                        <Image unoptimized width={40} height={40} src={previewImg} alt="" className="w-full h-full object-contain" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.title}</p>
                      {item.variant_title && (
                        <p className="text-xs text-gray-400 mt-0.5">{item.variant_title}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-3.5">
                  <div className="space-y-1">
                    <p className="text-xs font-mono text-gray-600">{item.sku || '—'}</p>
                    <div className="text-[10px] text-gray-400 space-y-0.5">
                      {item.shopify_product_id && <p>Shopify Product: {item.shopify_product_id}</p>}
                      {item.shopify_variant_id && <p>Shopify Variant: {item.shopify_variant_id}</p>}
                      {customSku && (
                        <>
                          <p>Ideamax Product: {customSku.erp_product_id}</p>
                          <p>Ideamax SKU: {customSku.erp_sku_id}</p>
                          {customSku.erp_synced_sku_id && (
                            <p>Custom SKU: {customSku.erp_synced_sku_id}</p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-3.5 text-center">
                  <span className="text-sm text-gray-700">{item.quantity}</span>
                </td>
                <td className="px-6 py-3.5 text-right">
                  <span className="text-sm text-gray-900">${Number(item.unit_price).toFixed(2)}</span>
                </td>
                <td className="px-6 py-3.5 text-right">
                  <span className="text-sm text-gray-500">
                    {item.base_cost_snapshot != null ? `$${Number(item.base_cost_snapshot).toFixed(2)}` : '—'}
                  </span>
                </td>
                <td className="px-6 py-3.5 text-right">
                  <span className={`text-sm font-semibold ${item.earnings_amount != null && item.earnings_amount > 0 ? 'text-emerald-600' : 'text-gray-400'
                    }`}>
                    {item.earnings_amount != null ? `$${Number(item.earnings_amount).toFixed(2)}` : '—'}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
