import Link from 'next/link';
import { getBulkOrders } from '@/lib/queries/bulk-orders';
import { getSellerOrders } from '@/lib/queries/orders';
import { requireSeller } from '@/lib/sellers/session';
import { t } from '@/lib/i18n';
import OrdersList from '@/components/orders/OrdersList';
import BulkOrdersList from '@/components/orders/bulk/BulkOrdersList';

export const dynamic = 'force-dynamic';

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ imported?: string }> }) {
  const seller = await requireSeller();
  const { imported } = await searchParams;
  const [bulkOrders, storeOrders] = await Promise.all([getBulkOrders(seller.id), getSellerOrders(seller.id)]);
  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-10">
      <section>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('order.list.title')}</h1>
            <p className="text-sm text-gray-500 mt-1">{t('order.list.subtitle')}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link href="/cart" className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">{t('nav.cart')}</Link>
            <Link href="/orders/import" className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">{t('import.title')}</Link>
            <Link href="/orders/new" className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">{t('orders.create')}</Link>
          </div>
        </div>
        {imported && <div role="status" className="mb-4 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">{t('import.done', 'zh', { n: imported })}</div>}
        <BulkOrdersList orders={bulkOrders} />
      </section>
      <section>
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-900">{t('orders.title')}</h2>
          <p className="text-sm text-gray-500 mt-1">{t('orders.subtitle')}</p>
        </div>
        <OrdersList orders={storeOrders} />
      </section>
    </div>
  );
}
