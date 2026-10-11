import Link from 'next/link';
import type { BulkOrderRow } from '@/lib/types/bulk-order';
import { orderQuantity } from '@/lib/orders/bulk-order';
import { t } from '@/lib/i18n';
import { BULK_STATUS_STYLES, bulkStatusLabel } from './BulkOrderDetail';

export default function BulkOrdersList({ orders }: { orders: BulkOrderRow[] }) {
  if (orders.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-gray-300 p-10 text-center bg-white">
        <p className="text-gray-500">{t('order.list.empty')}</p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-border bg-white overflow-hidden">
      <ul className="divide-y divide-border">
        {orders.map((order) => (
          <li key={order.id}>
            <Link href={`/orders/bulk/${order.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-surface-secondary transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{order.product_title}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {t(order.order_type === 'blank' ? 'order.type.blank' : 'order.type.designed')} · {new Date(order.created_at).toLocaleString('zh-CN')} · {t('order.quantityTotal', 'zh', { n: orderQuantity(order.items) })}
                </p>
              </div>
              <span className="text-sm font-medium text-gray-900 whitespace-nowrap">${Number(order.subtotal).toFixed(2)}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${BULK_STATUS_STYLES[order.status]}`}>{bulkStatusLabel(order.status)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
