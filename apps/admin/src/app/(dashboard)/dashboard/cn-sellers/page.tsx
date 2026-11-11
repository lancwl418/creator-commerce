import { getCnSellers } from '@/lib/queries/cn-sellers';
import { getCnSellerSupplierAccess, getErpSupplierOptions } from '@/lib/queries/cn-seller-suppliers';
import type { CnSellersPageProps, SupplierOptionLite } from '@/lib/types/cn-seller';
import { CnSellersTable } from '@/components/cn-sellers/CnSellersTable';
import { getTranslator } from '@/lib/i18n/server';

/** ERP 供应商列表；ERP 不可用时返回 null，页面照常显示卖家，只是不能编辑供应商。 */
async function loadSupplierOptions(): Promise<SupplierOptionLite[] | null> {
  try {
    const suppliers = await getErpSupplierOptions();
    return suppliers.map((s) => ({ id: s.id, name: s.originalName || s.id, productCount: s.productCount }));
  } catch (error) {
    console.error('Failed to load ERP suppliers', error);
    return null;
  }
}

export default async function CnSellersPage({ searchParams }: CnSellersPageProps) {
  const { q = '' } = await searchParams;
  const [sellers, { t }] = await Promise.all([getCnSellers(q), getTranslator()]);
  const [supplierAccess, supplierOptions] = await Promise.all([
    getCnSellerSupplierAccess(sellers.map((seller) => seller.id)),
    loadSupplierOptions(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('cnSellers.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('cnSellers.subtitle')}</p>
        </div>
        <form className="flex gap-2">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder={t('cnSellers.searchPlaceholder')}
            className="rounded-xl border border-border-light bg-white px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400"
          />
          <button type="submit" className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-500">
            {t('common.search')}
          </button>
        </form>
      </div>
      {supplierOptions === null && (
        <p className="rounded-xl bg-danger-50 px-4 py-3 text-sm text-danger-600">{t('cnSellers.erpLoadError')}</p>
      )}
      <CnSellersTable sellers={sellers} supplierAccess={supplierAccess} supplierOptions={supplierOptions} />
    </div>
  );
}
