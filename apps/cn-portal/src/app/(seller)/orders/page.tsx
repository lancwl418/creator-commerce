import { getSellerOrders } from '@/lib/queries/orders';
import { requireSeller } from '@/lib/sellers/session';
import { t } from '@/lib/i18n';
import OrdersList from '@/components/orders/OrdersList';

export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
  const seller = await requireSeller();
  const orders = await getSellerOrders(seller.id);
  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('orders.title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('orders.subtitle')}</p>
      </div>
      <OrdersList orders={orders} />
    </div>
  );
}
