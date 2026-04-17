import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ProductEditor from './ProductEditor';
import { BackButton } from './BackButton';

export default async function ProductDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { id } = await params;
  const { from } = await searchParams;
  const supabase = await createClient();

  const { data: product } = await supabase
    .from('sellable_product_instances')
    .select(`
      *,
      designs (id, title, status),
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
        {from === 'import' ? (
          <BackButton />
        ) : (
          <Link href="/dashboard/products" className="hover:text-primary-600 transition-colors">Created Products</Link>
        )}
        <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
        <span className="text-gray-900 font-medium">{product.title || 'Untitled'}</span>
      </div>

      <ProductEditor
        product={{
          id: product.id,
          title: product.title,
          description: product.description ?? '',
          status: product.status,
          cost: product.cost ?? 10,
          retail_price: product.retail_price,
          selected_skus: product.selected_skus ?? [],
          design_id: product.design_id,
          design_version_id: product.design_version_id,
          product_template_id: product.product_template_id,
          base_price_suggestion: product.base_price_suggestion,
          created_at: product.created_at,
        }}
        previewUrl={previewUrl}
        designTitle={product.designs?.title}
        listings={product.channel_listings ?? []}
      />
    </div>
  );
}
