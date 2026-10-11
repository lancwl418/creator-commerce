import type { SupabaseClient } from '@supabase/supabase-js';
import { refreshAccessToken, shopDomainFromStoreUrl, type ShopifyAppConfig } from './oauth';
import { createProductViaGraphQL } from './products';
import { validateListingPrices, type SkuSelection } from './listing-prices';

// 把一个已建产品同步到卖家的 Shopify 店铺。从 Creator Portal 的 sync-product 路由迁入，
// Creator Portal 与 cn-portal 共用；路由只负责认证、取产品与店铺记录、把错误映射成响应。

/** sellable_product_instances 里同步用到的列 */
export interface SyncableProduct {
  id: string;
  product_template_id: string | null;
  title: string | null;
  description: string | null;
  retail_price: number | null;
  base_price_suggestion: number | null;
  selected_skus: unknown;
  option_names: unknown;
  variant_preview_urls: unknown;
  preview_urls: unknown;
  design_artwork_urls: unknown;
  product_images: unknown;
  tags: unknown;
}

/** creator_store_connections 里同步用到的列 */
export interface SyncableStoreConnection {
  id: string;
  store_url: string | null;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  status: string;
}

export interface SyncProductInput {
  supabase: SupabaseClient;
  config: ShopifyAppConfig;
  product: SyncableProduct;
  connection: SyncableStoreConnection;
  publishStatus?: 'active' | 'draft';
  /** 把 ERP 图片路径转成 Shopify 能访问的公网 HTTPS 地址（各 app 自己的图片代理） */
  toPublicUrl: (path: string) => string;
}

export interface SyncProductResult {
  shopifyProductId: number | string;
  shopifyUrl: string;
  listingId: string | null;
  customSkusCreated: number;
  variantsMapped: number;
}

/** 同步失败；status 是建议返回给调用方的 HTTP 状态码 */
export class ProductSyncError extends Error {
  constructor(message: string, public readonly status: number, public readonly details?: unknown) {
    super(message);
    this.name = 'ProductSyncError';
  }
}

interface CustomSkuRow {
  id: string;
  erp_sku_id: string;
  sku_code: string | null;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  sale_price: number;
  base_cost_snapshot: number;
  external_variant_ids: Record<string, string> | null;
}

/** token 过期时用 refresh token 续期，并把新 token 写回店铺记录。 */
async function ensureAccessToken(
  supabase: SupabaseClient,
  config: ShopifyAppConfig,
  connection: SyncableStoreConnection
): Promise<string> {
  if (connection.status !== 'connected' || !connection.access_token) {
    throw new ProductSyncError('Store is not connected. Please reconnect.', 400);
  }
  if (!connection.token_expires_at || new Date(connection.token_expires_at) > new Date()) {
    return connection.access_token;
  }
  if (!connection.refresh_token) {
    throw new ProductSyncError('Token expired and no refresh token. Please reconnect.', 400);
  }
  let refreshed;
  try {
    refreshed = await refreshAccessToken(config, shopDomainFromStoreUrl(connection.store_url), connection.refresh_token);
  } catch (error) {
    console.error('[Shopify Sync] Token refresh failed:', error);
    await supabase.from('creator_store_connections').update({ status: 'expired' }).eq('id', connection.id);
    throw new ProductSyncError('Token refresh failed. Please reconnect your store.', 401);
  }
  await supabase.from('creator_store_connections').update({
    access_token: refreshed.accessToken,
    refresh_token: refreshed.refreshToken || connection.refresh_token,
    token_expires_at: refreshed.expiresIn
      ? new Date(Date.now() + refreshed.expiresIn * 1000).toISOString()
      : connection.token_expires_at,
  }).eq('id', connection.id);
  return refreshed.accessToken;
}

function sameVariant(
  a: { option1?: string | null; option2?: string | null; option3?: string | null },
  b: { option1?: string | null; option2?: string | null; option3?: string | null }
): boolean {
  return (a.option1 || null) === (b.option1 || null)
    && (a.option2 || null) === (b.option2 || null)
    && (a.option3 || null) === (b.option3 || null);
}

/**
 * 1. 为每个启用的 variant 建 custom_product_skus
 * 2. 在 Shopify 创建商品
 * 3. 记录 channel_listing + channel_listing_variants
 * 4. 把 Shopify variant id 回写到 custom SKU
 * 5. 产品状态置为 listed
 */
export async function syncProductToStore(input: SyncProductInput): Promise<SyncProductResult> {
  const { supabase, config, product, connection, toPublicUrl } = input;
  const shopifyStatus = input.publishStatus === 'draft' ? 'draft' : 'active';

  const accessToken = await ensureAccessToken(supabase, config, connection);

  const { data: existingListing } = await supabase
    .from('channel_listings')
    .select('id, external_product_id')
    .eq('sellable_product_instance_id', product.id)
    .eq('creator_store_connection_id', connection.id)
    .maybeSingle();
  if (existingListing) {
    throw new ProductSyncError('Product is already synced to this store', 409, { listing: existingListing });
  }

  // ── Step 1: 只同步明确启用的 variant ──
  const selectedSkus = ((product.selected_skus as SkuSelection[] | null) ?? []).filter((s) => s.enabled);
  const erpProductId = (product.product_template_id ?? '').replace('erp-', '').replace('shopify-', '');
  const savedOptionNames = (product.option_names as string[] | null) ?? [];
  if (selectedSkus.length === 0) {
    throw new ProductSyncError('No variants selected. Please save your variant selection before syncing.', 400);
  }

  let retailPrice = product.retail_price;
  try {
    validateListingPrices(selectedSkus, retailPrice ?? product.base_price_suggestion);
  } catch (error) {
    throw new ProductSyncError(error instanceof Error ? error.message : 'Invalid variant prices', 400);
  }
  if (!retailPrice && product.base_price_suggestion) {
    retailPrice = product.base_price_suggestion;
    await supabase.from('sellable_product_instances').update({ retail_price: retailPrice }).eq('id', product.id);
  }

  const variantPreviewMap = (product.variant_preview_urls as Record<string, string> | null) ?? {};
  const customSkuRows = selectedSkus.map((sku) => ({
    sellable_product_instance_id: product.id,
    erp_product_id: erpProductId,
    erp_sku_id: sku.sku_id,
    sku_code: sku.sku,
    option1: sku.option1,
    option2: sku.option2,
    option3: sku.option3,
    preview_image_url: (sku.option1 ? variantPreviewMap[sku.option1] : null) || null,
    sale_price: sku.price ?? retailPrice,
    base_cost_snapshot: sku.erpPrice,
    creator_store_connection_id: connection.id,
    is_active: true,
    erp_sync_status: 'pending',
  }));
  const { data: customSkus, error: skuError } = await supabase
    .from('custom_product_skus')
    .upsert(customSkuRows, { onConflict: 'sellable_product_instance_id,erp_sku_id,creator_store_connection_id' })
    .select('*')
    .returns<CustomSkuRow[]>();
  if (skuError) {
    console.error('[Sync] Failed to create custom SKUs:', skuError);
    throw new ProductSyncError(`Failed to create custom SKUs: ${skuError.message}`, 500);
  }

  // ── Step 2: 组装 Shopify 商品 ──
  const previewUrls = (product.preview_urls as string[] | null) ?? [];
  const artworkUrls = (product.design_artwork_urls as string[] | null) ?? [];
  const productImages = ((product.product_images as { rawPath?: string; url?: string }[] | null) ?? [])
    .map((img) => (img.rawPath ? toPublicUrl(img.rawPath) : img.url || ''))
    .filter(Boolean);
  const imageUrls = [...previewUrls, ...artworkUrls, ...productImages].filter((url) => url && url.startsWith('http'));

  const variantImageMap = new Map<string, string>();
  for (const sku of selectedSkus) {
    if (!sku.option1 || variantImageMap.has(sku.option1)) continue;
    const designPreview = variantPreviewMap[sku.option1];
    if (designPreview) variantImageMap.set(sku.option1, designPreview);
    else if (sku.skuImage) variantImageMap.set(sku.option1, toPublicUrl(sku.skuImage));
  }
  const allImageUrls = [...new Set([...imageUrls, ...variantImageMap.values()])].filter(Boolean);

  const optionSets: { name: string; values: string[] }[] = [];
  (['option1', 'option2', 'option3'] as const).forEach((key, index) => {
    const values = [...new Set(selectedSkus.map((s) => s[key]).filter(Boolean))] as string[];
    if (values.length > 0) optionSets.push({ name: savedOptionNames[index] || `Option ${index + 1}`, values });
  });

  const productTags = Array.isArray(product.tags) ? (product.tags as string[]) : [];
  const shopifyProduct: Record<string, unknown> = {
    title: product.title || 'Untitled',
    body_html: product.description || '',
    vendor: 'ideamax',
    tags: ['ideamax', ...productTags].join(', '),
    images: allImageUrls.map((url) => ({ src: url })),
    status: shopifyStatus,
  };
  const skuPriceMap = new Map((customSkus ?? []).map((csku) => [csku.erp_sku_id, Number(csku.sale_price)]));
  const shopDomain = shopDomainFromStoreUrl(connection.store_url);

  console.log(`[Shopify Sync] Creating product with ${selectedSkus.length} variants via GraphQL, ${variantImageMap.size} variant images`);
  const createdProduct = await createProductViaGraphQL(
    config, shopDomain, accessToken, shopifyProduct, selectedSkus, optionSets,
    retailPrice ?? 0, skuPriceMap, variantImageMap
  );
  const shopifyVariants = createdProduct.variants ?? [];

  // ── Step 3: 记录 listing ──
  const shopifyUrl = `https://${shopDomain}/products/${createdProduct.handle}`;
  const { data: listing, error: listingError } = await supabase
    .from('channel_listings')
    .insert({
      sellable_product_instance_id: product.id,
      channel_type: 'creator_store',
      creator_store_connection_id: connection.id,
      external_product_id: String(createdProduct.id),
      external_listing_url: shopifyUrl,
      price: retailPrice,
      currency: 'USD',
      status: 'active',
      published_at: new Date().toISOString(),
      metadata: {
        shopify_product_id: createdProduct.id,
        shopify_handle: createdProduct.handle,
        variant_count: shopifyVariants.length,
      },
    })
    .select('id')
    .single();
  if (listingError) console.error('[Shopify Sync] Failed to save listing:', listingError);

  // ── Step 4: listing variants + Shopify variant id 回写 ──
  if (listing && customSkus && customSkus.length > 0) {
    const listingVariantRows = customSkus.map((csku) => {
      const shopifyVariant = shopifyVariants.find((sv) => sameVariant(sv, csku))
        ?? shopifyVariants.find((sv) => sv.sku === csku.sku_code);
      return {
        channel_listing_id: listing.id,
        custom_product_sku_id: csku.id,
        sale_price: csku.sale_price,
        base_cost_snapshot: csku.base_cost_snapshot,
        external_variant_id: shopifyVariant ? String(shopifyVariant.id) : null,
        is_active: true,
      };
    });
    const { error: lvError } = await supabase.from('channel_listing_variants').insert(listingVariantRows);
    if (lvError) console.error('[Shopify Sync] Failed to save listing variants:', lvError);

    for (const csku of customSkus) {
      const shopifyVariant = shopifyVariants.find((sv) => sameVariant(sv, csku));
      if (!shopifyVariant) continue;
      await supabase
        .from('custom_product_skus')
        .update({ external_variant_ids: { ...(csku.external_variant_ids ?? {}), shopify: String(shopifyVariant.id) } })
        .eq('id', csku.id);
    }
  }

  // ── Step 5: 状态 ──
  await supabase.from('sellable_product_instances').update({ status: 'listed' }).eq('id', product.id);
  await supabase.from('creator_store_connections').update({ last_sync_at: new Date().toISOString() }).eq('id', connection.id);

  return {
    shopifyProductId: createdProduct.id,
    shopifyUrl,
    listingId: listing?.id ?? null,
    customSkusCreated: customSkus?.length ?? 0,
    variantsMapped: shopifyVariants.length,
  };
}
