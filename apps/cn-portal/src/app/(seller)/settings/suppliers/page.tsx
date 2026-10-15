import { requireAdmin } from '@/lib/sellers/session';
import { loadAllErpProducts } from '@/lib/erp-products.server';
import { isApprovedErpProduct } from '@/lib/catalog';
import { loadSupplierNames } from '@/lib/queries/supplier-settings';
import { collectSuppliers, type SupplierSummary } from '@/lib/suppliers/suppliers';
import SupplierSettingsForm from '@/components/settings/SupplierSettingsForm';
import { t } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

/** 供应商显示名设置：只有管理员能进（requireAdmin），卖家访问会回到选品页。 */
export default async function SupplierSettingsPage() {
  await requireAdmin();
  let suppliers: SupplierSummary[] = [];
  let names = new Map<string, string>();
  let errored = false;
  try {
    const [products, loadedNames] = await Promise.all([loadAllErpProducts(), loadSupplierNames()]);
    suppliers = collectSuppliers(products.filter(isApprovedErpProduct));
    names = loadedNames;
  } catch (error) {
    console.error('Failed to load supplier settings', error);
    errored = true;
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-900">{t('settings.suppliers.title')}</h1>
      <p className="text-sm text-gray-500 mt-1 mb-6">{t('settings.suppliers.subtitle')}</p>
      {errored ? (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm text-red-600">{t('settings.suppliers.loadError')}</p>
        </div>
      ) : (
        <SupplierSettingsForm
          suppliers={suppliers.map((s) => ({ ...s, displayName: names.get(s.id) ?? '' }))}
        />
      )}
    </div>
  );
}
