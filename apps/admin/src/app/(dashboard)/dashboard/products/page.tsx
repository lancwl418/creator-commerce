import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-500',
  ready: 'bg-blue-50 text-blue-600',
  listed: 'bg-success-50 text-success-600',
  paused: 'bg-warning-50 text-warning-600',
  archived: 'bg-gray-100 text-gray-400',
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status, q } = await searchParams;
  const supabase = await createClient();
  const filterStatus = status || 'all';

  let query = supabase
    .from('sellable_product_instances')
    .select(`
      id, title, status, retail_price, cost, created_at, preview_urls,
      creators(email, creator_profiles(display_name)),
      designs(title),
      channel_listings(id, channel_type, status)
    `)
    .order('created_at', { ascending: false })
    .limit(50);

  if (filterStatus !== 'all') {
    query = query.eq('status', filterStatus);
  }
  if (q) {
    query = query.ilike('title', `%${q}%`);
  }

  const { data: products } = await query;

  const [
    { count: allCount },
    { count: draftCount },
    { count: listedCount },
    { count: pausedCount },
  ] = await Promise.all([
    supabase.from('sellable_product_instances').select('*', { count: 'exact', head: true }),
    supabase.from('sellable_product_instances').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
    supabase.from('sellable_product_instances').select('*', { count: 'exact', head: true }).eq('status', 'listed'),
    supabase.from('sellable_product_instances').select('*', { count: 'exact', head: true }).eq('status', 'paused'),
  ]);

  const tabs = [
    { key: 'all', label: 'All', count: allCount ?? 0 },
    { key: 'draft', label: 'Draft', count: draftCount ?? 0 },
    { key: 'listed', label: 'Listed', count: listedCount ?? 0 },
    { key: 'paused', label: 'Paused', count: pausedCount ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        <p className="text-sm text-gray-500 mt-1">All sellable product instances across creators</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-xl border border-border-light p-1 w-fit">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={`/dashboard/products${tab.key === 'all' ? '' : `?status=${tab.key}`}`}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
              filterStatus === tab.key
                ? 'bg-gray-900 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {tab.label}
            <span className={`ml-1.5 text-xs ${filterStatus === tab.key ? 'text-white/60' : 'text-gray-400'}`}>
              {tab.count}
            </span>
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-border-light shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-light">
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Product</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Creator</th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Price</th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Cost</th>
              <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Listings</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light">
            {(!products || products.length === 0) ? (
              <tr>
                <td colSpan={7} className="px-6 py-16 text-center">
                  <p className="text-sm text-gray-400">No products found</p>
                </td>
              </tr>
            ) : (
              products.map((product) => {
                const creator = Array.isArray(product.creators) ? product.creators[0] : product.creators;
                const profile = Array.isArray(creator?.creator_profiles) ? creator.creator_profiles[0] : creator?.creator_profiles;
                const design = Array.isArray(product.designs) ? product.designs[0] : product.designs;
                const listings = Array.isArray(product.channel_listings) ? product.channel_listings : [];
                const previewUrl = (product.preview_urls as string[])?.[0];

                return (
                  <tr key={product.id} className="hover:bg-surface-hover transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                          {previewUrl ? (
                            <img src={previewUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{product.title || 'Untitled'}</p>
                          {(design as { title?: string })?.title && (
                            <p className="text-xs text-gray-400 truncate">{(design as { title: string }).title}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <p className="text-sm text-gray-600">{(profile as { display_name?: string })?.display_name || creator?.email || '-'}</p>
                    </td>
                    <td className="px-6 py-3.5 text-right text-sm font-medium text-gray-900">
                      {product.retail_price ? `$${product.retail_price}` : '-'}
                    </td>
                    <td className="px-6 py-3.5 text-right text-sm text-gray-400">
                      {product.cost ? `$${product.cost}` : '-'}
                    </td>
                    <td className="px-6 py-3.5 text-center text-sm text-gray-600">
                      {listings.length}
                    </td>
                    <td className="px-6 py-3.5">
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[product.status] || 'bg-gray-100 text-gray-500'}`}>
                        {product.status}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-sm text-gray-400">
                      {new Date(product.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
