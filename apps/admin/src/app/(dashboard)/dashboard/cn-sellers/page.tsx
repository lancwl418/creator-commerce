import { getCnSellers } from '@/lib/queries/cn-sellers';
import type { CnSellersPageProps } from '@/lib/types/cn-seller';
import { CnSellersTable } from '@/components/cn-sellers/CnSellersTable';

export default async function CnSellersPage({ searchParams }: CnSellersPageProps) {
  const { q = '' } = await searchParams;
  const sellers = await getCnSellers(q);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CN Sellers</h1>
          <p className="text-sm text-gray-500 mt-1">
            Seller accounts from the CN portal. The tier decides which ERP price level they see.
          </p>
        </div>
        <form className="flex gap-2">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Company, email or contact"
            className="rounded-xl border border-border-light bg-white px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400"
          />
          <button type="submit" className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-500">
            Search
          </button>
        </form>
      </div>
      <CnSellersTable sellers={sellers} />
    </div>
  );
}
