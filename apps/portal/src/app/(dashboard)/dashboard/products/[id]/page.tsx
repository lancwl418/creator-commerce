import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProductActions } from './ProductActions';

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: product } = await supabase
    .from('sellable_product_instances')
    .select(`
      *,
      designs (id, title, status),
      design_versions!design_versions_design_id_fkey (id, version_number),
      product_configurations (id, layers, finalized_at),
      channel_listings (id, channel_type, price, currency, status, published_at, error_message)
    `)
    .eq('id', id)
    .single();

  if (!product) notFound();

  const { data: artwork } = await supabase
    .from('design_assets')
    .select('file_url')
    .eq('design_version_id', product.design_version_id)
    .eq('asset_type', 'artwork')
    .single();

  const previewUrl = (product.preview_urls as string[])?.[0] || artwork?.file_url;

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-5">
        <Link href="/dashboard/products" className="hover:text-primary-600 transition-colors">Products</Link>
        <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
        <span className="text-gray-900 font-medium">{product.title || 'Untitled'}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Preview */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-border bg-white overflow-hidden shadow-sm">
            <div className="aspect-video bg-surface-secondary flex items-center justify-center">
              {previewUrl ? (
                <img src={previewUrl} alt={product.title} className="max-w-full max-h-full object-contain p-10" />
              ) : (
                <div className="text-center">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                    </svg>
                  </div>
                  <span className="text-gray-400 text-sm">No preview — open editor to configure</span>
                </div>
              )}
            </div>
          </div>

          <ProductActions
            productId={product.id}
            designId={product.design_id}
            designVersionId={product.design_version_id}
            productTemplateId={product.product_template_id}
            currentStatus={product.status}
            hasConfiguration={!!product.product_configurations?.finalized_at}
            listings={product.channel_listings ?? []}
            baseCost={product.base_price_suggestion}
          />
        </div>

        {/* Details sidebar */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">{product.title || 'Untitled'}</h2>

            <div className="space-y-4 text-sm">
              <div>
                <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-1">Status</p>
                <StatusBadge status={product.status} />
              </div>
              <div>
                <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-1">Design</p>
                <Link href={`/dashboard/designs/${product.design_id}`} className="text-primary-600 hover:text-primary-700 font-medium transition-colors">
                  {product.designs?.title || '—'}
                </Link>
              </div>
              <div>
                <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-1">Template</p>
                <p className="text-gray-900 font-medium">{product.product_template_id}</p>
              </div>
              {product.base_price_suggestion && (
                <div>
                  <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-1">Suggested Price</p>
                  <p className="text-gray-900 font-bold text-lg">${Number(product.base_price_suggestion).toFixed(2)}</p>
                </div>
              )}
              <div>
                <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-1">Created</p>
                <p className="text-gray-900">{new Date(product.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {product.channel_listings && product.channel_listings.length > 0 && (
            <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Channel Listings</h3>
              <div className="space-y-3">
                {product.channel_listings.map((listing: {
                  id: string;
                  channel_type: string;
                  price: number;
                  currency: string;
                  status: string;
                  error_message?: string;
                }) => (
                  <div key={listing.id} className="flex items-center justify-between rounded-xl bg-surface-secondary p-3">
                    <div>
                      <p className="font-medium text-sm text-gray-900">{listing.channel_type === 'marketplace' ? 'Marketplace' : 'Creator Store'}</p>
                      <StatusBadge status={listing.status} />
                    </div>
                    <p className="font-bold text-gray-900">{listing.currency} {Number(listing.price).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
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
    pending: 'bg-amber-50 text-amber-700 border border-amber-200',
    active: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    error: 'bg-red-50 text-red-700 border border-red-200',
    removed: 'bg-gray-100 text-gray-500',
  };

  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold mt-0.5 ${styles[status] || styles.draft}`}>
      {status}
    </span>
  );
}
