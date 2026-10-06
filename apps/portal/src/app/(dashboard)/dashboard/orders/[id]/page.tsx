import { notFound } from 'next/navigation';
import { getOrderById } from '@/lib/queries/orders';
import type { OrderDetailPageProps } from '@/lib/types/order';
import OrderDetail from '@/components/orders/OrderDetail';

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) notFound();
  return <OrderDetail order={order} />;
}
