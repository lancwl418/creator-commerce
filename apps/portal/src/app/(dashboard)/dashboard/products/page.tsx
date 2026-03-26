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
          <h2 className="text-2xl font-bold">Products</h2>
          <p className="text-gray-500 text-sm mt-1">Your sellable product instances</p>
        </div>
        <Link
          href="/dashboard/products/new"
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Create Product
        </Link>
      </div>

      {!products || products.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <p className="text-gray-500 mb-4">No products yet. Create one from your designs.</p>
          <Link
            href="/dashboard/products/new"
            className="inline-block rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Create Product
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => {
            const previewUrl = (product.preview_urls as string[])?.[0];
            const listing = product.channel_listings?.[0];

            return (
              <Link
                key={product.id}
                href={`/dashboard/products/${product.id}`}
                className="group rounded-lg border border-gray-200 bg-white overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="aspect-square bg-gray-100 flex items-center justify-center">
                  {previewUrl ? (
                    <img src={previewUrl} alt={product.title} className="w-full h-full object-contain p-4" />
                  ) : (
                    <span className="text-gray-400 text-sm">No preview</span>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-medium text-gray-900 truncate">
                    {product.title || product.designs?.title || 'Untitled'}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Design: {product.designs?.title || '—'}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <StatusBadge status={product.status} />
                    {listing && (
                      <span className="text-sm font-medium text-gray-700">
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
    ready: 'bg-blue-100 text-blue-700',
    listed: 'bg-green-100 text-green-700',
    paused: 'bg-yellow-100 text-yellow-700',
    archived: 'bg-gray-100 text-gray-500',
  };

  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] || styles.draft}`}>
      {status}
    </span>
  );
}
