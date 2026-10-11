import Link from 'next/link';
import { getLastShippingAddress } from '@/lib/queries/bulk-orders';
import { requireSeller } from '@/lib/sellers/session';
import { t } from '@/lib/i18n';
import ImportForm from '@/components/orders/import/ImportForm';

export const dynamic = 'force-dynamic';

export default async function ImportOrdersPage() {
  const seller = await requireSeller();
  const lastAddress = await getLastShippingAddress(seller.id);
  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <Link href="/orders" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">← {t('nav.orders')}</Link>
      <h1 className="text-xl font-bold text-gray-900 mt-3">{t('import.title')}</h1>
      <p className="text-sm text-gray-500 mt-1 mb-6">{t('import.subtitle')}</p>
      <ImportForm defaultAddress={lastAddress} />
    </div>
  );
}
