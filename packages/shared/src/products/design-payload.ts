import type { SupabaseClient } from '@supabase/supabase-js';
import type { DesignEditorPayload, DesignEditorProduct } from '../design-engine-protocol';

// Design Engine 保存结果 → 产品记录（sellable_product_instances + product_configurations）。
// 从 Creator Portal 迁入，cn-portal 共用。上传和售价倍率由调用方注入，这里不依赖任何 app 的路由。

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

/** 把 data: URL 上传到对象存储并返回公网地址；https 地址原样返回；blob: 地址返回 null */
export type UploadDataUrl = (value: string | undefined | null, folder: string) => Promise<string | null>;

export interface DesignPayloadOptions {
  uploadDataUrl: UploadDataUrl;
  /** 建议售价 = 成本 × 倍率 */
  priceMultiplier: number;
}

// ── Pure transforms (exported for unit testing) ──

/** Build the product title. Multi-product imports get a "<prefix> — <name>" form. */
export function buildProductTitle(name: string | undefined, titlePrefix: string | undefined, productCount: number): string {
  const erpName = name || 'Untitled Product';
  return productCount > 1 ? `${titlePrefix || 'Design'} — ${erpName}` : erpName;
}

/** Strip HTML tags and trim a raw description string. */
export function cleanDescriptionHtml(raw: string | undefined): string {
  return (raw || '').replace(/<[^>]*>/g, '').trim();
}

/** Resolve artwork URLs: prefer explicit artwork_urls, else derive from image layers. */
export function deriveArtworkUrls(product: DesignEditorProduct): string[] {
  if (product.artwork_urls && product.artwork_urls.length > 0) return product.artwork_urls;
  if (product.layers) {
    return product.layers
      .filter((l) => l.type === 'image' && l.data?.src)
      .map((l) => (l.data as { src: string }).src);
  }
  return [];
}

/** Choose the preview image: thumbnail > design artwork fallback > first stored artwork. */
export function pickPreviewUrls(thumbnailUrl: string | null, artworkFallbackUrl: string | null, storedArtworkUrls: string[]): string[] {
  if (thumbnailUrl) return [thumbnailUrl];
  if (artworkFallbackUrl) return [artworkFallbackUrl];
  if (storedArtworkUrls.length > 0) return [storedArtworkUrls[0]];
  return [];
}

/** Suggested retail price = cost × multiplier; missing or invalid costs stay unset. */
export function suggestBasePrice(baseCost: number | undefined, multiplier: number): number | null {
  return baseCost != null && Number.isFinite(baseCost) && baseCost >= 0 ? baseCost * multiplier : null;
}

async function resolveDesignVersion(supabase: SupabaseClient, designId: string | null | undefined) {
  if (!designId) return { designVersionId: null, artworkFallbackUrl: null };
  const { data: design } = await supabase.from('designs').select('id, current_version_id').eq('id', designId).single();
  if (!design?.current_version_id) return { designVersionId: null, artworkFallbackUrl: null };
  const { data: artworkAsset } = await supabase
    .from('design_assets')
    .select('file_url')
    .eq('design_version_id', design.current_version_id)
    .eq('asset_type', 'artwork')
    .single();
  return { designVersionId: design.current_version_id as string, artworkFallbackUrl: (artworkAsset?.file_url as string | undefined) ?? null };
}

async function upsertConfiguration(
  supabase: SupabaseClient,
  productInstanceId: string,
  product: DesignEditorProduct,
  designVersionId: string | null
) {
  if (!product.layers || product.layers.length === 0) return;
  const { error } = await supabase.from('product_configurations').upsert(
    {
      sellable_product_instance_id: productInstanceId,
      design_version_id: designVersionId,
      product_template_id: product.template_id,
      layers: product.layers,
      print_area_snapshot: product.print_area_snapshot || null,
      design_metadata: product.design_metadata || null,
    },
    { onConflict: 'sellable_product_instance_id' },
  );
  if (error) console.error('Failed to save product configuration:', error);
}

/**
 * Turn a Design Engine save payload into draft sellable_product_instances
 * (status 'draft' = Mockup) plus their product_configurations. Uploads any
 * inline artwork/thumbnail data URLs first. Returns the rows that were created.
 */
export async function createProductsFromDesignPayload(
  supabase: SupabaseClient,
  creatorId: string,
  payload: DesignEditorPayload,
  options: DesignPayloadOptions,
): Promise<CreatedProductRow[]> {
  const { design_id, products, title_prefix } = payload;
  if (!products || products.length === 0) return [];
  const { designVersionId, artworkFallbackUrl } = await resolveDesignVersion(supabase, design_id);

  const created = await Promise.all(
    products.map(async (product) => {
      const designArtworkUrls = deriveArtworkUrls(product);
      const [thumbnailUrl, ...artworkResults] = await Promise.all([
        options.uploadDataUrl(product.thumbnail, 'previews'),
        ...designArtworkUrls.map((u) => options.uploadDataUrl(u, 'artworks')),
      ]);
      const storedArtworkUrls = artworkResults.filter((u): u is string => !!u);

      const { data: instance, error } = await supabase
        .from('sellable_product_instances')
        .insert({
          creator_id: creatorId,
          design_id: design_id || null,
          design_version_id: designVersionId,
          product_template_id: product.template_id,
          title: buildProductTitle(product.name, title_prefix, products.length),
          description: cleanDescriptionHtml(product.description),
          status: 'draft',
          base_price_suggestion: suggestBasePrice(product.base_cost, options.priceMultiplier),
          preview_urls: pickPreviewUrls(thumbnailUrl, artworkFallbackUrl, storedArtworkUrls),
          design_artwork_urls: storedArtworkUrls,
          variant_preview_urls: product.variant_previews || null,
          product_images: product.product_images || [],
        })
        .select('*')
        .single();
      if (error) {
        console.error('Failed to create product:', error);
        return null;
      }
      await upsertConfiguration(supabase, instance.id, product, designVersionId);
      return instance as CreatedProductRow;
    }),
  );
  return created.filter((x): x is CreatedProductRow => x !== null);
}

/**
 * Re-edit flow: apply an updated design to an EXISTING product. Refreshes
 * preview/artwork URLs + variant previews and upserts the configuration;
 * leaves title/description/status/pricing untouched.
 */
export async function updateProductFromDesignPayload(
  supabase: SupabaseClient,
  productInstanceId: string,
  payload: DesignEditorPayload,
  options: Pick<DesignPayloadOptions, 'uploadDataUrl'>,
): Promise<boolean> {
  const product = payload.products?.[0];
  if (!product) return false;
  const { designVersionId, artworkFallbackUrl } = await resolveDesignVersion(supabase, payload.design_id);

  const designArtworkUrls = deriveArtworkUrls(product);
  const [thumbnailUrl, ...artworkResults] = await Promise.all([
    options.uploadDataUrl(product.thumbnail, 'previews'),
    ...designArtworkUrls.map((u) => options.uploadDataUrl(u, 'artworks')),
  ]);
  const storedArtworkUrls = artworkResults.filter((u): u is string => !!u);
  const previewUrls = pickPreviewUrls(thumbnailUrl, artworkFallbackUrl, storedArtworkUrls);

  const update: Record<string, unknown> = {
    variant_preview_urls: product.variant_previews || null,
    updated_at: new Date().toISOString(),
  };
  if (previewUrls.length > 0) update.preview_urls = previewUrls;
  if (storedArtworkUrls.length > 0) update.design_artwork_urls = storedArtworkUrls;

  const { error } = await supabase.from('sellable_product_instances').update(update).eq('id', productInstanceId);
  if (error) {
    console.error('Failed to update product:', error);
    return false;
  }
  await upsertConfiguration(supabase, productInstanceId, product, designVersionId);
  return true;
}

/** 校验编辑器回传的保存结果：至少一个带 template_id 的产品。 */
export function parseDesignPayload(value: unknown): DesignEditorPayload {
  const payload: unknown = typeof value === 'string' ? JSON.parse(value) : value;
  if (!payload || typeof payload !== 'object' || !('products' in payload)
    || !Array.isArray(payload.products) || !payload.products.length
    || !payload.products.every((product) => product && typeof product === 'object' && typeof product.template_id === 'string')) {
    throw new Error('No valid products received from the editor');
  }
  return payload as DesignEditorPayload;
}
