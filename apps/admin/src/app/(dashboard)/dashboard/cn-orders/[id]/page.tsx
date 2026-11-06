import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCnOrder } from '@/lib/queries/cn-orders';
import { getCnOrderPushPrep } from '@/lib/queries/cn-order-suppliers';
import { getFactoryPushes } from '@/lib/queries/cn-factory-pushes';
import { formatCnOrderNumber } from '@/lib/types/cn-order';
import { CnOrderCard } from '@/components/cn-orders/CnOrderCard';

export default async function CnOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getCnOrder(id);
  if (!order) notFound();

  const [pushPrep, factoryPushes] = await Promise.all([
    getCnOrderPushPrep([order]),
    getFactoryPushes([order.id]),
  ]);

  return (
    <div className="space-y-4 max-w-4xl">
      <Link href="/dashboard/cn-orders" className="text-sm text-gray-500 hover:text-gray-800">
        ← CN Purchase Orders
      </Link>
      <h1 className="text-2xl font-bold text-gray-900">{formatCnOrderNumber(order.order_number)}</h1>
      <CnOrderCard order={order} pushPrep={pushPrep[order.id]} pushes={factoryPushes[order.id] ?? []} />
    </div>
  );
}
