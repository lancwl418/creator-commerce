import type { CnSellerRow, SupplierOptionLite } from '@/lib/types/cn-seller';
import { SellerSupplierAccess } from './SellerSupplierAccess';
import { SellerTierSelect } from './SellerTierSelect';
import { RetryErpSyncButton } from './RetryErpSyncButton';
import { getTranslator } from '@/lib/i18n/server';
import { dateLocale, type Locale } from '@/lib/i18n/messages';

const SYNC_STYLES: Record<CnSellerRow['erp_sync_status'], string> = {
  synced: 'bg-success-50 text-success-600',
  pending: 'bg-gray-100 text-gray-500',
  failed: 'bg-danger-50 text-danger-600',
};

function formatDate(value: string, locale: Locale): string {
  return new Date(value).toLocaleDateString(dateLocale(locale), { year: 'numeric', month: 'short', day: 'numeric' });
}

interface CnSellersTableProps {
  sellers: CnSellerRow[];
  /** sellerId → 可见供应商白名单；不在 Map 里 = 看全部 */
  supplierAccess: Map<string, string[]>;
  /** ERP 目录的全部主供应商；加载失败为 null */
  supplierOptions: SupplierOptionLite[] | null;
}

const NO_SUPPLIERS: string[] = [];

export async function CnSellersTable({ sellers, supplierAccess, supplierOptions }: CnSellersTableProps) {
  const { locale, t } = await getTranslator();
  if (sellers.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border-light bg-white p-12 text-center">
        <p className="text-sm text-gray-400">{t('cnSellers.empty')}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border-light bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-light text-left text-xs text-gray-500">
            <th className="px-5 py-3 font-medium">{t('cnSellers.col.company')}</th>
            <th className="px-5 py-3 font-medium">{t('cnSellers.col.contact')}</th>
            <th className="px-5 py-3 font-medium">{t('cnSellers.col.tier')}</th>
            <th className="px-5 py-3 font-medium">{t('cnSellers.col.suppliers')}</th>
            <th className="px-5 py-3 font-medium">{t('cnSellers.col.erp')}</th>
            <th className="px-5 py-3 font-medium">{t('cnSellers.col.registered')}</th>
          </tr>
        </thead>
        <tbody>
          {sellers.map((seller) => (
            <tr key={seller.id} className="border-b border-border-light last:border-0 align-top">
              <td className="px-5 py-3">
                <p className="font-medium text-gray-900">{seller.company_name || '—'}</p>
                <p className="text-xs text-gray-400">{seller.email}</p>
              </td>
              <td className="px-5 py-3 text-gray-700">
                <p>{seller.contact_name || '—'}</p>
                <p className="text-xs text-gray-400">{seller.phone}</p>
              </td>
              <td className="px-5 py-3">
                <SellerTierSelect sellerId={seller.id} tier={seller.seller_tier} />
              </td>
              <td className="px-5 py-3">
                <SellerSupplierAccess
                  // 白名单变了（保存后 refresh）就重置编辑态
                  key={(supplierAccess.get(seller.id) ?? NO_SUPPLIERS).join(',')}
                  sellerId={seller.id}
                  supplierIds={supplierAccess.get(seller.id) ?? NO_SUPPLIERS}
                  options={supplierOptions}
                />
              </td>
              <td className="px-5 py-3">
                <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium ${SYNC_STYLES[seller.erp_sync_status]}`}>
                  {t(`cnSellers.sync.${seller.erp_sync_status}`)}
                </span>
                {seller.erp_customer_id && (
                  <p className="mt-1 text-xs text-gray-400">#{seller.erp_customer_id}</p>
                )}
                {seller.erp_sync_status === 'failed' && seller.erp_sync_error && (
                  <p className="mt-1 max-w-xs text-xs text-danger-600 break-words" title={seller.erp_sync_error}>
                    {seller.erp_sync_error}
                  </p>
                )}
                {seller.erp_sync_status === 'failed' && <RetryErpSyncButton sellerId={seller.id} />}
              </td>
              <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{formatDate(seller.created_at, locale)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
