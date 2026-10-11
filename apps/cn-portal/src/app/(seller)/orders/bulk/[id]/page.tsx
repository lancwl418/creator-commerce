import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBulkOrder } from '@/lib/queries/bulk-orders';
import { requireSeller } from '@/lib/sellers/session';
import type { BulkOrderPageProps } from '@/lib/types/bulk-order';
import { t } from '@/lib/i18n';
import BulkOrderDetail from '@/components/orders/bulk/BulkOrderDetail';

export const dynamic = 'force-dynamic';

export default async function BulkOrderPage({ params, searchParams }: BulkOrderPageProps & { searchParams: Promise<{ created?: string }> }) {
  const { id } = await params;
  const { created } = await searchParams;
  const seller = await requireSeller();
  const order = await getBulkOrder(seller.id, id);
  if (!order) notFound();
  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <Link href="/orders" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">← {t('nav.orders')}</Link>
      <h1 className="text-xl font-bold text-gray-900 mt-3 mb-4">{t('order.detailTitle')}</h1>
      {created && (
        <div role="status" className="mb-4 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">{t('order.created')}</div>
      )}
      <BulkOrderDetail order={order} />
    </div>
  );
}
