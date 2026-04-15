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
        <div className="rounded-2xl border border-border bg-white overflow-hidden shadow-sm">
          {/* Table header */}
          <div className="hidden sm:grid sm:grid-cols-[auto_1fr_160px_120px_100px_100px] gap-4 items-center px-5 py-3 bg-surface-secondary border-b border-border-light text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            <div className="w-10" />
            <div>Product</div>
            <div>Design</div>
            <div>Channel</div>
            <div>Price</div>
            <div>Status</div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-border-light">
            {products.map((product) => {
              const previewUrl = (product.preview_urls as string[])?.[0];
              const artworkUrls = (product.design_artwork_urls as string[]) ?? [];
              const listing = product.channel_listings?.[0];

              return (
                <Link
                  key={product.id}
                  href={`/dashboard/products/${product.id}`}
                  className="group flex flex-col sm:grid sm:grid-cols-[auto_1fr_160px_120px_100px_100px] gap-3 sm:gap-4 items-start sm:items-center px-5 py-4 hover:bg-surface-hover transition-colors"
                >
                  {/* Thumbnail */}
                  <div className="w-10 h-10 rounded-lg bg-surface-secondary flex items-center justify-center overflow-hidden shrink-0">
                    {previewUrl ? (
                      <img src={previewUrl} alt={product.title} className="w-full h-full object-contain" />
                    ) : (
                      <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                      </svg>
                    )}
                  </div>

                  {/* Title */}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-primary-700 transition-colors">
                      {product.title || product.designs?.title || 'Untitled'}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {new Date(product.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>

                  {/* Design */}
                  <div className="min-w-0">
                    {artworkUrls.length > 0 ? (
                      <div className="flex items-center gap-1.5">
                        {artworkUrls.slice(0, 3).map((url, i) => (
                          <div key={i} className="w-8 h-8 rounded-md bg-surface-secondary overflow-hidden shrink-0 border border-border-light">
                            <img src={url} alt="" className="w-full h-full object-contain" />
                          </div>
                        ))}
                        {artworkUrls.length > 3 && (
                          <span className="text-[10px] text-gray-400 font-medium">+{artworkUrls.length - 3}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </div>

                  {/* Channel */}
                  <div>
                    {listing ? (
                      <ChannelBadge channelType={listing.channel_type} />
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </div>

                  {/* Price */}
                  <div>
                    {listing ? (
                      <span className="text-sm font-semibold text-gray-900">
                        ${Number(listing.price).toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </div>

                  {/* Status */}
                  <div>
                    <StatusBadge status={product.status} />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600',
    pending_review: 'bg-amber-50 text-amber-700 border border-amber-200',
    approved: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    ready: 'bg-blue-50 text-blue-700 border border-blue-200',
    listed: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    published: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    paused: 'bg-amber-50 text-amber-700 border border-amber-200',
    archived: 'bg-gray-100 text-gray-500',
  };

  const labels: Record<string, string> = {
    draft: 'Draft',
    pending_review: 'In Review',
    approved: 'Approved',
    ready: 'Ready',
    listed: 'Listed',
    published: 'Published',
    paused: 'Paused',
    archived: 'Archived',
  };

  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${styles[status] || styles.draft}`}>
      {labels[status] || status}
    </span>
  );
}

function ChannelBadge({ channelType }: { channelType: string }) {
  const labels: Record<string, string> = {
    our_shopify: 'Marketplace',
    creator_shopify: 'Shopify',
    creator_etsy: 'Etsy',
    creator_tiktok: 'TikTok',
    distributor_shopify: 'Shopify',
    distributor_etsy: 'Etsy',
  };

  return (
    <span className="inline-block rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
      {labels[channelType] || channelType}
    </span>
  );
}
