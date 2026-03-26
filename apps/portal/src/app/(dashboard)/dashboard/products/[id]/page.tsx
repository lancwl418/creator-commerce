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
      design_versions (id, version_number),
      product_configurations (id, layers, finalized_at),
      channel_listings (id, channel_type, price, currency, status, published_at, error_message)
    `)
    .eq('id', id)
    .single();

  if (!product) notFound();

  // Get artwork URL from the design
  const { data: artwork } = await supabase
    .from('design_assets')
    .select('file_url')
    .eq('design_version_id', product.design_version_id)
    .eq('asset_type', 'artwork')
    .single();

  const previewUrl = (product.preview_urls as string[])?.[0] || artwork?.file_url;

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/dashboard/products" className="hover:text-gray-700">Products</Link>
        <span>/</span>
        <span className="text-gray-900">{product.title || 'Untitled'}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Preview */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
            <div className="aspect-video bg-gray-50 flex items-center justify-center">
              {previewUrl ? (
                <img src={previewUrl} alt={product.title} className="max-w-full max-h-full object-contain p-8" />
              ) : (
                <span className="text-gray-400">No preview — open editor to configure</span>
              )}
            </div>
          </div>

          {/* Editor iframe section */}
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
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <h2 className="text-lg font-bold mb-3">{product.title || 'Untitled'}</h2>

            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-500">Status</p>
                <StatusBadge status={product.status} />
              </div>
              <div>
                <p className="text-gray-500">Design</p>
                <Link href={`/dashboard/designs/${product.design_id}`} className="text-black hover:underline">
                  {product.designs?.title || '—'}
                </Link>
              </div>
              <div>
                <p className="text-gray-500">Template</p>
                <p className="text-gray-900">{product.product_template_id}</p>
              </div>
              {product.base_price_suggestion && (
                <div>
                  <p className="text-gray-500">Suggested Price</p>
                  <p className="text-gray-900">${Number(product.base_price_suggestion).toFixed(2)}</p>
                </div>
              )}
              <div>
                <p className="text-gray-500">Created</p>
                <p className="text-gray-900">{new Date(product.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* Channel Listings */}
          {product.channel_listings && product.channel_listings.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Channel Listings</h3>
              <div className="space-y-2">
                {product.channel_listings.map((listing: {
                  id: string;
                  channel_type: string;
                  price: number;
                  currency: string;
                  status: string;
                  error_message?: string;
                }) => (
                  <div key={listing.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium">{listing.channel_type === 'marketplace' ? 'Marketplace' : 'Creator Store'}</p>
                      <StatusBadge status={listing.status} />
                    </div>
                    <p className="font-medium">{listing.currency} {Number(listing.price).toFixed(2)}</p>
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
    ready: 'bg-blue-100 text-blue-700',
    listed: 'bg-green-100 text-green-700',
    paused: 'bg-yellow-100 text-yellow-700',
    archived: 'bg-gray-100 text-gray-500',
    pending: 'bg-yellow-100 text-yellow-700',
    active: 'bg-green-100 text-green-700',
    error: 'bg-red-100 text-red-700',
    removed: 'bg-gray-100 text-gray-500',
  };

  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium mt-0.5 ${styles[status] || styles.draft}`}>
      {status}
    </span>
  );
}
