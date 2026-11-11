import type { CnOrderRow, OrderPushPrepMap } from '@/lib/types/cn-order';
import type { FactoryPushMap } from '@/lib/queries/cn-factory-pushes';
import { CnOrderCard } from './CnOrderCard';
import { getTranslator } from '@/lib/i18n/server';

export async function CnOrdersTable({
  orders,
  pushPrep = {},
  factoryPushes = {},
}: {
  orders: CnOrderRow[];
  pushPrep?: OrderPushPrepMap;
  factoryPushes?: FactoryPushMap;
}) {
  const { t } = await getTranslator();
  if (orders.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border-light bg-white p-12 text-center">
        <p className="text-sm text-gray-400">{t('cnOrders.empty')}</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <CnOrderCard key={order.id} order={order} pushPrep={pushPrep[order.id]} pushes={factoryPushes[order.id] ?? []} linkToDetail />
      ))}
    </div>
  );
}
