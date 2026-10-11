import type { SellerOrderRow } from '@/lib/types/order';
import { t, type MessageKey } from '@/lib/i18n';

const FINANCIAL_LABELS: Record<string, MessageKey> = {
  paid: 'orders.financial.paid',
  pending: 'orders.financial.pending',
  partially_paid: 'orders.financial.partiallyPaid',
  refunded: 'orders.financial.refunded',
  partially_refunded: 'orders.financial.refunded',
  voided: 'orders.financial.voided',
};

const FULFILLMENT_LABELS: Record<string, MessageKey> = {
  fulfilled: 'orders.fulfillment.fulfilled',
  partial: 'orders.fulfillment.partial',
};

function formatMoney(amount: number | null, currency: string | null): string {
  if (amount == null) return '—';
  return `${currency && currency !== 'USD' ? `${currency} ` : '$'}${Number(amount).toFixed(2)}`;
}

export default function OrdersList({ orders }: { orders: SellerOrderRow[] }) {
  if (orders.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-gray-300 p-12 text-center bg-white">
        <p className="text-gray-500">{t('orders.empty')}</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-gray-500">
            <th className="px-4 py-2.5 font-medium">{t('orders.col.order')}</th>
            <th className="px-4 py-2.5 font-medium">{t('orders.col.items')}</th>
            <th className="px-4 py-2.5 font-medium">{t('orders.col.customer')}</th>
            <th className="px-4 py-2.5 font-medium">{t('orders.col.total')}</th>
            <th className="px-4 py-2.5 font-medium">{t('orders.col.status')}</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const items = order.creator_order_items ?? [];
            const quantity = items.reduce((sum, item) => sum + (item.quantity ?? 0), 0);
            const placedAt = order.order_placed_at ?? order.created_at;
            return (
              <tr key={order.id} className="border-b border-border last:border-0 align-top">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{order.shopify_order_name ?? order.shopify_order_number ?? '—'}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(placedAt).toLocaleString('zh-CN')}
                    {order.creator_store_connections?.store_name && ` · ${order.creator_store_connections.store_name}`}
                  </p>
                </td>
                <td className="px-4 py-3 text-gray-700">
                  <p>{items[0] ? `${items[0].title}${items[0].variant_title ? ` / ${items[0].variant_title}` : ''}` : '—'}</p>
                  {items.length > 1 && <p className="text-xs text-gray-400">{t('orders.moreItems', 'zh', { n: items.length - 1 })}</p>}
                  <p className="text-xs text-gray-400">{t('orders.quantity', 'zh', { n: quantity })}</p>
                </td>
                <td className="px-4 py-3 text-gray-700">{order.customer_name ?? '—'}</td>
                <td className="px-4 py-3 text-gray-900 whitespace-nowrap">{formatMoney(order.total_price, order.currency)}</td>
                <td className="px-4 py-3">
                  <span className="inline-block rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                    {t(FINANCIAL_LABELS[order.financial_status ?? ''] ?? 'orders.financial.unknown')}
                  </span>
                  <span className="ml-1 inline-block rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                    {t(FULFILLMENT_LABELS[order.fulfillment_status ?? ''] ?? 'orders.fulfillment.unfulfilled')}
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
