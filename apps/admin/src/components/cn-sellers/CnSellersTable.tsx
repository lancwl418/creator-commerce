import type { CnSellerRow } from '@/lib/types/cn-seller';
import { SellerTierSelect } from './SellerTierSelect';

const SYNC_STYLES: Record<CnSellerRow['erp_sync_status'], string> = {
  synced: 'bg-success-50 text-success-600',
  pending: 'bg-gray-100 text-gray-500',
  failed: 'bg-danger-50 text-danger-600',
};

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function CnSellersTable({ sellers }: { sellers: CnSellerRow[] }) {
  if (sellers.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border-light bg-white p-12 text-center">
        <p className="text-sm text-gray-400">No sellers yet</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border-light bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-light text-left text-xs text-gray-500">
            <th className="px-5 py-3 font-medium">Company</th>
            <th className="px-5 py-3 font-medium">Contact</th>
            <th className="px-5 py-3 font-medium">Tier</th>
            <th className="px-5 py-3 font-medium">ERP</th>
            <th className="px-5 py-3 font-medium">Registered</th>
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
                <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium ${SYNC_STYLES[seller.erp_sync_status]}`}>
                  {seller.erp_sync_status}
                </span>
                {seller.erp_customer_id && (
                  <p className="mt-1 text-xs text-gray-400">#{seller.erp_customer_id}</p>
                )}
                {seller.erp_sync_status === 'failed' && seller.erp_sync_error && (
                  <p className="mt-1 max-w-xs text-xs text-danger-600 break-words" title={seller.erp_sync_error}>
                    {seller.erp_sync_error}
                  </p>
                )}
              </td>
              <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{formatDate(seller.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
