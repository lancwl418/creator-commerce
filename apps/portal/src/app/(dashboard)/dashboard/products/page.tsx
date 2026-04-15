import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function ProductsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { data: creator } = await supabase
    .from('creators')
    .select('id')
    .eq('auth_user_id', user!.id)
    .single();

  const { data: products } = await supabase
    .from('sellable_product_instances')
    .select(`
      *,
      designs (id, title),
      channel_listings (id, channel_type, status, price, currency)
    `)
    .eq('creator_id', creator!.id)
    .order('created_at', { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Created Products</h2>
          <p className="text-gray-500 text-sm mt-1">Products you've created and their current status</p>
        </div>
        <Link
          href="/dashboard/products/new"
          className="rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-500 transition-colors shadow-md shadow-primary-600/25"
        >
          Create Product
        </Link>
      </div>

      {!products || products.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-300 p-12 text-center bg-white">
          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
            </svg>
          </div>
          <p className="text-gray-500 mb-4">No products yet. Create one from your designs.</p>
          <Link
            href="/dashboard/products/new"
            className="inline-block rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-500 transition-colors shadow-md shadow-primary-600/25"
          >
            Create Product
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {products.map((product) => {
            const previewUrl = (product.preview_urls as string[])?.[0];
            const listing = product.channel_listings?.[0];

            return (
              <Link
                key={product.id}
                href={`/dashboard/products/${product.id}`}
                className="group rounded-2xl border border-border bg-white overflow-hidden hover:shadow-lg hover:shadow-gray-200/50 transition-all duration-200 hover:-translate-y-0.5"
              >
                <div className="aspect-square bg-surface-secondary flex items-center justify-center">
                  {previewUrl ? (
                    <img src={previewUrl} alt={product.title} className="w-full h-full object-contain p-6" />
                  ) : (
                    <span className="text-gray-400 text-sm">No preview</span>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {product.title || product.designs?.title || 'Untitled'}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Design: {product.designs?.title || '—'}
                  </p>
                  <div className="flex items-center justify-between mt-3">
                    <StatusBadge status={product.status} />
                    {listing && (
                      <span className="text-sm font-semibold text-gray-900">
                        {listing.currency} {Number(listing.price).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600',
    ready: 'bg-blue-50 text-blue-700 border border-blue-200',
    listed: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    paused: 'bg-amber-50 text-amber-700 border border-amber-200',
    archived: 'bg-gray-100 text-gray-500',
  };

  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${styles[status] || styles.draft}`}>
      {status}
    </span>
  );
}
