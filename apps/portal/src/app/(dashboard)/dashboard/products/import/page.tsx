'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface CreatedProduct {
  id: string;
  title: string;
  status: string;
  base_price_suggestion: number | null;
  preview_urls: string[];
  product_template_id: string;
  created_at: string;
}

export default function ImportFromEditorPage() {
  const router = useRouter();
  const supabase = createClient();
  const [status, setStatus] = useState<'saving' | 'error' | 'success'>('saving');
  const [error, setError] = useState('');
  const [createdProducts, setCreatedProducts] = useState<CreatedProduct[]>([]);

  useEffect(() => {
    saveProducts();
  }, []);

  async function saveProducts() {
    try {
      const hash = window.location.hash.slice(1);
      if (!hash) {
        setError('No product data received');
        setStatus('error');
        return;
      }

      const payload = JSON.parse(decodeURIComponent(hash));
      const { design_id, products, title_prefix } = payload;

      if (!products || products.length === 0) {
        setError('No products to save');
        setStatus('error');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Not authenticated. Please log in and try again.');
        setStatus('error');
        return;
      }

      const { data: creator } = await supabase
        .from('creators')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();
      if (!creator) {
        setError('Creator not found');
        setStatus('error');
        return;
      }

      let designVersionId: string | null = null;
      let artworkFallbackUrl: string | null = null;

      if (design_id) {
        const { data: design } = await supabase
          .from('designs')
          .select('id, current_version_id')
          .eq('id', design_id)
          .single();

        if (design?.current_version_id) {
          designVersionId = design.current_version_id;

          const { data: artworkAsset } = await supabase
            .from('design_assets')
            .select('file_url')
            .eq('design_version_id', designVersionId)
            .eq('asset_type', 'artwork')
            .single();

          artworkFallbackUrl = artworkAsset?.file_url ?? null;
        }
      }

      const created: CreatedProduct[] = [];

      for (const product of products) {
        const productTitle = products.length > 1
          ? `${title_prefix || 'Product'} — ${product.name}`
          : title_prefix || product.name || 'Untitled Product';

        let previewUrls: string[] = [];
        if (product.thumbnail && product.thumbnail.startsWith('data:')) {
          try {
            const base64 = product.thumbnail.split(',')[1];
            const mimeMatch = product.thumbnail.match(/data:([^;]+);/);
            const mime = mimeMatch?.[1] || 'image/jpeg';
            const ext = mime === 'image/png' ? 'png' : 'jpg';
            const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
            const filePath = `${creator.id}/previews/${crypto.randomUUID()}.${ext}`;

            const { error: uploadError } = await supabase.storage
              .from('design-assets')
              .upload(filePath, bytes, { contentType: mime });

            if (!uploadError) {
              const { data: urlData } = supabase.storage
                .from('design-assets')
                .getPublicUrl(filePath);
              previewUrls = [urlData.publicUrl];
            }
          } catch (e) {
            console.error('Preview upload failed:', e);
          }
        } else if (product.thumbnail) {
          previewUrls = [product.thumbnail];
        }

        if (previewUrls.length === 0 && artworkFallbackUrl) {
          previewUrls = [artworkFallbackUrl];
        }

        const basePriceSuggestion = product.base_cost ? product.base_cost * 2.5 : null;

        const { data: instance, error: instanceError } = await supabase
          .from('sellable_product_instances')
          .insert({
            creator_id: creator.id,
            design_id: design_id || null,
            design_version_id: designVersionId,
            product_template_id: product.template_id,
            title: productTitle,
            status: 'draft',
            base_price_suggestion: basePriceSuggestion,
            preview_urls: previewUrls,
          })
          .select('*')
          .single();

        if (instanceError) {
          console.error('Failed to create product:', instanceError);
          continue;
        }

        if (designVersionId) {
          await supabase
            .from('product_configurations')
            .insert({
              sellable_product_instance_id: instance.id,
              design_version_id: designVersionId,
              product_template_id: product.template_id,
              layers: product.layers || [],
            });
        }

        created.push(instance);
      }

      if (created.length === 0) {
        setError('Failed to create any products');
        setStatus('error');
        return;
      }

      setCreatedProducts(created);
      setStatus('success');
    } catch (err) {
      console.error('Import error:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setStatus('error');
    }
  }

  // Saving state
  if (status === 'saving') {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-10 h-10 border-3 border-primary-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-600 font-medium">Saving products...</p>
      </div>
    );
  }

  // Error state
  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
        </div>
        <p className="text-red-600 font-medium mb-2">Failed to save products</p>
        <p className="text-gray-500 text-sm mb-4">{error}</p>
        <button
          onClick={() => router.push('/dashboard/products')}
          className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-500 transition-colors"
        >
          Go to Products
        </button>
      </div>
    );
  }

  // Success — show created products
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
              <svg className="w-4.5 h-4.5 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              {createdProducts.length === 1 ? 'Product Created' : `${createdProducts.length} Products Created`}
            </h2>
          </div>
          <p className="text-gray-500 text-sm mt-1">
            Review your products below. You can edit details, set pricing, and publish to channels.
          </p>
        </div>
        <Link
          href="/dashboard/products"
          className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          View All Products
        </Link>
      </div>

      {/* Product cards — vertical list */}
      <div className="space-y-4">
        {createdProducts.map((product) => {
          const previewUrl = (product.preview_urls as string[])?.[0];

          return (
            <Link
              key={product.id}
              href={`/dashboard/products/${product.id}`}
              className="group flex gap-5 rounded-2xl border border-border bg-white p-5 hover:shadow-lg hover:shadow-gray-200/50 transition-all duration-200"
            >
              {/* Preview */}
              <div className="w-28 h-28 rounded-xl bg-surface-secondary flex items-center justify-center overflow-hidden shrink-0">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt={product.title}
                    className="w-full h-full object-contain p-2"
                  />
                ) : (
                  <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                  </svg>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-gray-900 group-hover:text-primary-700 transition-colors truncate">
                  {product.title || 'Untitled Product'}
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Created {new Date(product.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>

                <div className="flex items-center gap-3 mt-3">
                  <span className="inline-block rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-semibold text-gray-600">
                    Draft
                  </span>
                  {product.base_price_suggestion && (
                    <span className="text-sm text-gray-500">
                      Suggested price: <span className="font-semibold text-gray-900">${Number(product.base_price_suggestion).toFixed(2)}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Arrow */}
              <div className="flex items-center shrink-0">
                <svg className="w-5 h-5 text-gray-300 group-hover:text-primary-500 transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
