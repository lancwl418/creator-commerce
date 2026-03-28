'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/**
 * /dashboard/products/import
 *
 * Landing page after Design Engine "Save & Finish".
 * Reads product data from URL hash, creates products in DB, redirects to products list.
 * This runs client-side on the Portal domain, so auth cookies are available.
 */
export default function ImportFromEditorPage() {
  const router = useRouter();
  const supabase = createClient();
  const [status, setStatus] = useState<'saving' | 'error' | 'success'>('saving');
  const [error, setError] = useState('');

  useEffect(() => {
    saveProducts();
  }, []);

  async function saveProducts() {
    try {
      // Read data from URL hash
      const hash = window.location.hash.slice(1); // remove #
      if (!hash) {
        setError('No product data received');
        setStatus('error');
        return;
      }

      const payload = JSON.parse(decodeURIComponent(hash));
      const { design_id, products, title_prefix } = payload;

      if (!design_id || !products || products.length === 0) {
        setError('Invalid product data');
        setStatus('error');
        return;
      }

      // Get current user & creator
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

      // Get design version and artwork
      const { data: design } = await supabase
        .from('designs')
        .select('id, current_version_id')
        .eq('id', design_id)
        .single();

      if (!design?.current_version_id) {
        setError('Design or version not found');
        setStatus('error');
        return;
      }

      // Get artwork URL as fallback preview
      const { data: artworkAsset } = await supabase
        .from('design_assets')
        .select('file_url')
        .eq('design_version_id', design.current_version_id)
        .eq('asset_type', 'artwork')
        .single();

      // Create products
      let createdCount = 0;
      for (const product of products) {
        const productTitle = products.length > 1
          ? `${title_prefix} — ${product.name}`
          : title_prefix || product.name;

        // Upload mockup preview to Supabase Storage if it's a data URL
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

        if (previewUrls.length === 0 && artworkAsset?.file_url) {
          previewUrls = [artworkAsset.file_url];
        }

        const { data: instance, error: instanceError } = await supabase
          .from('sellable_product_instances')
          .insert({
            creator_id: creator.id,
            design_id: design.id,
            design_version_id: design.current_version_id,
            product_template_id: product.template_id,
            title: productTitle,
            status: 'draft',
            base_price_suggestion: product.base_cost ? product.base_cost * 2.5 : null,
            preview_urls: previewUrls,
          })
          .select('id')
          .single();

        if (instanceError) {
          console.error('Failed to create product:', instanceError);
          continue;
        }

        await supabase
          .from('product_configurations')
          .insert({
            sellable_product_instance_id: instance.id,
            design_version_id: design.current_version_id,
            product_template_id: product.template_id,
            layers: product.layers || [],
          });

        createdCount++;
      }

      if (createdCount === 0) {
        setError('Failed to create any products');
        setStatus('error');
        return;
      }

      setStatus('success');
      router.replace('/dashboard/products');
    } catch (err) {
      console.error('Import error:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setStatus('error');
    }
  }

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

  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-10 h-10 border-3 border-primary-600 border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-gray-600 font-medium">Saving products...</p>
    </div>
  );
}
