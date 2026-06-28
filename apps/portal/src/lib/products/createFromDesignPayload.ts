import type { SupabaseClient } from '@supabase/supabase-js';
import type { DesignEditorPayload, DesignEditorProduct } from '@creator-commerce/shared';

/**
 * Product/payload shapes emitted by the Design Engine. These come from the
 * shared host ⇄ editor contract (`@creator-commerce/shared`); aliased here for
 * local readability and backwards compatibility.
 */
export type DesignPayloadProduct = DesignEditorProduct;
export type DesignPayload = DesignEditorPayload;

export interface CreatedProductRow {
  id: string;
  title: string;
  description: string | null;
  status: string;
  base_price_suggestion: number | null;
  preview_urls: string[];
  design_artwork_urls: string[];
  product_template_id: string;
  created_at: string;
}

// ── Pure transforms (exported for unit testing) ──

/** Build the product title. Multi-product imports get a "<prefix> — <name>" form. */
export function buildProductTitle(
  name: string | undefined,
  titlePrefix: string | undefined,
  productCount: number,
): string {
  const erpName = name || 'Untitled Product';
  return productCount > 1 ? `${titlePrefix || 'Design'} — ${erpName}` : erpName;
}

/** Strip HTML tags and trim a raw description string. */
export function cleanDescriptionHtml(raw: string | undefined): string {
  return (raw || '').replace(/<[^>]*>/g, '').trim();
}

/** Resolve artwork URLs: prefer explicit artwork_urls, else derive from image layers. */
export function deriveArtworkUrls(product: DesignPayloadProduct): string[] {
  if (product.artwork_urls && product.artwork_urls.length > 0) return product.artwork_urls;
  if (product.layers) {
    return product.layers
      .filter((l) => l.type === 'image' && l.data?.src)
      .map((l) => (l.data as { src: string }).src);
  }
  return [];
}

/** Choose the preview image: thumbnail > design artwork fallback > first stored artwork. */
export function pickPreviewUrls(
  thumbnailUrl: string | null,
  artworkFallbackUrl: string | null,
  storedArtworkUrls: string[],
): string[] {
  if (thumbnailUrl) return [thumbnailUrl];
  if (artworkFallbackUrl) return [artworkFallbackUrl];
  if (storedArtworkUrls.length > 0) return [storedArtworkUrls[0]];
  return [];
}

/** Suggested retail price = supply cost × 2.5 (null when cost is missing/zero). */
export function suggestBasePrice(baseCost: number | undefined): number | null {
  return baseCost ? baseCost * 2.5 : null;
}

/**
 * Upload a data: URL to R2 and return the public URL. Pass-through for
 * already-hosted https URLs; drop transient blob: URLs.
 */
async function uploadDataUrlOrPassThrough(
  value: string | undefined | null,
  folder: string,
): Promise<string | null> {
  if (!value) return null;
  if (!value.startsWith('data:')) {
    return value.startsWith('blob:') ? null : value;
  }
  try {
    const res = await fetch('/api/upload-r2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data_url: value, folder }),
    });
    if (!res.ok) return null;
    const { url } = await res.json();
    return url ?? null;
  } catch (e) {
    console.error(`Upload failed (${folder}):`, e);
    return null;
  }
}

/**
 * Turn a Design Engine save payload into draft sellable_product_instances
 * (status 'draft' = Mockup) plus their product_configurations. Uploads any
 * inline artwork/thumbnail data URLs to R2 first. Runs all products in
 * parallel. Returns the rows that were created (nulls filtered out).
 */
export async function createProductsFromDesignPayload(
  supabase: SupabaseClient,
  creatorId: string,
  payload: DesignPayload,
): Promise<CreatedProductRow[]> {
  const { design_id, products, title_prefix } = payload;
  if (!products || products.length === 0) return [];

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

  const createdResults = await Promise.all(
    products.map(async (product) => {
      const productTitle = buildProductTitle(product.name, title_prefix, products.length);
      const cleanDesc = cleanDescriptionHtml(product.description);
      const designArtworkUrls = deriveArtworkUrls(product);

      const [thumbnailUrl, ...artworkResults] = await Promise.all([
        uploadDataUrlOrPassThrough(product.thumbnail, 'previews'),
        ...designArtworkUrls.map((u) => uploadDataUrlOrPassThrough(u, 'artworks')),
      ]);
      const storedArtworkUrls = artworkResults.filter((u): u is string => !!u);

      const previewUrls = pickPreviewUrls(thumbnailUrl, artworkFallbackUrl, storedArtworkUrls);
      const basePriceSuggestion = suggestBasePrice(product.base_cost);

      const { data: instance, error: instanceError } = await supabase
        .from('sellable_product_instances')
        .insert({
          creator_id: creatorId,
          design_id: design_id || null,
          design_version_id: designVersionId,
          product_template_id: product.template_id,
          title: productTitle,
          description: cleanDesc,
          status: 'draft',
          base_price_suggestion: basePriceSuggestion,
          preview_urls: previewUrls,
          design_artwork_urls: storedArtworkUrls,
          variant_preview_urls: product.variant_previews || null,
          product_images: product.product_images || [],
        })
        .select('*')
        .single();

      if (instanceError) {
        console.error('Failed to create product:', instanceError);
        return null;
      }

      if (product.layers && product.layers.length > 0) {
        await supabase.from('product_configurations').upsert(
          {
            sellable_product_instance_id: instance.id,
            design_version_id: designVersionId || '00000000-0000-0000-0000-000000000000',
            product_template_id: product.template_id,
            layers: product.layers,
            print_area_snapshot: product.print_area_snapshot || null,
            design_metadata: product.design_metadata || null,
          },
          { onConflict: 'sellable_product_instance_id' },
        );
      }

      return instance as CreatedProductRow;
    }),
  );

  return createdResults.filter((x): x is CreatedProductRow => x !== null);
}
