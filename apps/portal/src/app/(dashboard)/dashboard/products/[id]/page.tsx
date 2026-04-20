import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProductById, getProductArtwork } from '@/lib/queries/products';
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

  const product = await getProductById(id);
  if (!product) notFound();

  const artworkUrl = product.design_version_id
    ? await getProductArtwork(product.design_version_id)
    : null;

  const previewUrls = Array.isArray(product.preview_urls) ? product.preview_urls : [];
  const previewUrl = previewUrls[0] || artworkUrl;

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
          variant_preview_urls: product.variant_preview_urls ?? null,
          product_images: product.product_images ?? [],
          created_at: product.created_at,
        }}
        previewUrl={previewUrl}
        designTitle={product.designs?.title}
        designArtworkUrls={(product.design_artwork_urls as string[]) ?? []}
        listings={product.channel_listings ?? []}
      />
    </div>
  );
}
