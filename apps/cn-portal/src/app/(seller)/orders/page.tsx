import { getBulkOrders } from '@/lib/queries/bulk-orders';
import { getSellerOrders } from '@/lib/queries/orders';
import { requireSeller } from '@/lib/sellers/session';
import { t } from '@/lib/i18n';
import OrdersList from '@/components/orders/OrdersList';
import BulkOrdersList from '@/components/orders/bulk/BulkOrdersList';

export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
  const seller = await requireSeller();
  const [bulkOrders, storeOrders] = await Promise.all([getBulkOrders(seller.id), getSellerOrders(seller.id)]);
  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-10">
      <section>
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900">{t('order.list.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('order.list.subtitle')}</p>
        </div>
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
