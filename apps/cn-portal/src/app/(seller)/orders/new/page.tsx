import Link from 'next/link';
import { getCatalog } from '@/lib/catalog.server';
import { requireSeller } from '@/lib/sellers/session';
import { t } from '@/lib/i18n';
import CreateOrderPicker from '@/components/orders/CreateOrderPicker';

export const dynamic = 'force-dynamic';

/** 创建订单：从目录选产品后进入该产品的统一下单页（上传设计可选） */
export default async function CreateOrderPage() {
  const seller = await requireSeller();
  const { items } = await getCatalog(seller.tier);
  const products = items.map(({ id, name, itemNo, fromPrice, maxPrice, supplierId, supplierName }) => ({ id, name, itemNo, fromPrice, maxPrice, supplierId, supplierName }));

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <Link href="/orders" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">← {t('order.list.title')}</Link>
      <h1 className="text-xl font-bold text-gray-900 mt-3">{t('orders.create')}</h1>
      <p className="text-sm text-gray-500 mt-1 mb-6">{t('orders.create.subtitle')}</p>
      <CreateOrderPicker products={products} />
    </div>
  );
}
