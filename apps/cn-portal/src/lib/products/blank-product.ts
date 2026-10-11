import type { ErpProduct, ErpSku } from '@creator-commerce/shared/erp/types';
import { resolveOptionDimensions } from '@creator-commerce/shared/erp/options';
import { resolveTierPriceTables, type SellerTier, type TierPriceRow } from '@creator-commerce/shared/erp/pricing';
import type { SkuSelection } from '@creator-commerce/shared/shopify/listing-prices';
import type { MessageKey } from '../i18n';
import { erpImage } from '../image';
import type { BlankProductImage, BlankProductInput, BlankProductRow, BlankVariant } from '../types/product';

/** 同步白板时 ERP 产品 id 的模板标识，与 Creator Portal 一致（同步时去掉前缀） */
export const ERP_TEMPLATE_PREFIX = 'erp-';

function rowCovers(row: TierPriceRow, sku: ErpSku, sizeKey?: keyof ErpSku, colorKey?: keyof ErpSku): boolean {
  const size = sizeKey ? (sku[sizeKey] as string | null) : null;
  const color = colorKey ? (sku[colorKey] as string | null) : null;
  return (!sizeKey || row.sizes.length === 0 || row.sizes.includes(size ?? ''))
    && (!colorKey || row.colors.length === 0 || row.colors.includes(color ?? ''));
}

/**
 * 可以作为白板同步的 variant：该等级下有大于 0 的空白件售价（作为成本）。
 * 一个产品有多组定价时，取第一组里有价的那一档；空白件价为 0 或缺失的 variant 不能同步。
 */
export function buildBlankVariants(product: ErpProduct, tier: SellerTier, listableSkus: ErpSku[]): BlankVariant[] {
  const dimensions = resolveOptionDimensions(product);
  const sizeKey = dimensions.find((d) => d.isSize)?.key;
  const colorKey = dimensions.find((d) => d.isColor)?.key;
  const tables = resolveTierPriceTables(product, tier, listableSkus);

  const variants: BlankVariant[] = [];
  for (const sku of listableSkus) {
    let cost: number | null = null;
    for (const rows of tables) {
      const row = rows.find((r) => r.blankPrice != null && r.blankPrice > 0 && rowCovers(r, sku, sizeKey, colorKey));
      if (row) { cost = row.blankPrice; break; }
    }
    if (cost == null) continue;
    variants.push({
      skuId: sku.id, sku: sku.sku, option1: sku.option1, option2: sku.option2, option3: sku.option3,
      skuImage: sku.skuImage, cost,
    });
  }
  return variants;
}

export function buildBlankProductImages(product: ErpProduct): BlankProductImage[] {
  const paths = [product.mainPic, ...(product.prodImageList ?? []).map((image) => image.picSrc)].filter(Boolean) as string[];
  return [...new Set(paths)].map((rawPath, index) => ({ id: `img-${index}`, rawPath, isMain: index === 0 }));
}

export type ParsedBlankProduct =
  | { ok: true; input: BlankProductInput }
  | { ok: false; error: MessageKey };

function readPrice(value: FormDataEntryValue | null): number | null {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const price = Number(value);
  return Number.isFinite(price) && price > 0 ? price : NaN;
}

/** 解析同步白板表单；售价必须是正数，至少启用一个 variant。 */
export function parseBlankProductForm(form: FormData, variants: BlankVariant[], images: BlankProductImage[]): ParsedBlankProduct {
  const title = String(form.get('title') ?? '').trim();
  if (!title) return { ok: false, error: 'sync.error.titleRequired' };

  const retailPrice = readPrice(form.get('retailPrice'));
  if (retailPrice == null || Number.isNaN(retailPrice)) return { ok: false, error: 'sync.error.priceInvalid' };

  const variantIds = new Set(variants.map((v) => v.skuId));
  const enabledSkuIds = form.getAll('enabledSku').map(String).filter((id) => variantIds.has(id));
  if (enabledSkuIds.length === 0) return { ok: false, error: 'sync.error.noVariants' };

  const variantPrices: Record<string, number> = {};
  for (const skuId of enabledSkuIds) {
    const price = readPrice(form.get(`price:${skuId}`));
    if (price == null) continue;
    if (Number.isNaN(price)) return { ok: false, error: 'sync.error.priceInvalid' };
    variantPrices[skuId] = price;
  }

  const imageIds = new Set(images.map((image) => image.id));
  const selectedImageIds = form.getAll('image').map(String).filter((id) => imageIds.has(id));

  return {
    ok: true,
    input: {
      title,
      description: String(form.get('description') ?? '').trim(),
      retailPrice,
      variantPrices,
      enabledSkuIds,
      selectedImageIds,
      publishStatus: form.get('publishStatus') === 'draft' ? 'draft' : 'active',
    },
  };
}

/** 组装产品记录：成本 = 启用 variant 里最低的空白件价，选项名按 SKU 字段顺序。 */
export function buildBlankProductRow(
  creatorId: string,
  product: ErpProduct,
  variants: BlankVariant[],
  images: BlankProductImage[],
  input: BlankProductInput
): BlankProductRow {
  const enabled = new Set(input.enabledSkuIds);
  const selectedSkus: SkuSelection[] = variants.map((variant) => ({
    sku_id: variant.skuId,
    sku: variant.sku,
    option1: variant.option1,
    option2: variant.option2,
    option3: variant.option3,
    enabled: enabled.has(variant.skuId),
    price: input.variantPrices[variant.skuId] ?? null,
    erpPrice: variant.cost,
    skuImage: variant.skuImage,
  }));
  const enabledCosts = variants.filter((v) => enabled.has(v.skuId)).map((v) => v.cost);
  const selectedImages = new Set(input.selectedImageIds);

  return {
    creator_id: creatorId,
    product_template_id: `${ERP_TEMPLATE_PREFIX}${product.id}`,
    erp_product_id: product.id,
    title: input.title,
    description: input.description,
    status: 'ready',
    selected_skus: selectedSkus,
    option_names: resolveOptionDimensions(product).map((d) => d.name),
    product_images: images
      .filter((image) => selectedImages.has(image.id))
      .map((image) => ({ id: image.id, url: erpImage(image.rawPath) ?? '', rawPath: image.rawPath, isMain: image.isMain })),
    retail_price: input.retailPrice,
    cost: Math.min(...enabledCosts),
    preview_urls: [],
    design_artwork_urls: [],
  };
}

/** ERP 图片路径 → Shopify 能访问的公网地址（本站图片代理） */
export function erpImagePublicUrl(origin: string, path: string): string {
  if (!path) return '';
  if (path.startsWith('https://')) return path;
  if (path.startsWith('http://')) {
    const match = path.match(/\/sys\/common\/static\/(.+)$/);
    if (!match) return '';
    path = match[1];
  }
  return `${origin}${erpImage(path)}`;
}
