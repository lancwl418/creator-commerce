import type { ErpProduct, ErpSku } from '@creator-commerce/shared/erp/types';
import { resolveOptionDimensions } from '@creator-commerce/shared/erp/options';
import { resolveTierPriceTables, type SellerTier, type TierPriceRow } from '@creator-commerce/shared/erp/pricing';
import type { SkuSelection } from '@creator-commerce/shared/shopify/listing-prices';
import { erpImage } from '../image';
import type { BlankProductImage, BlankProductInput, BlankVariant } from '../types/product';

function rowCovers(row: TierPriceRow, sku: ErpSku, sizeKey?: keyof ErpSku, colorKey?: keyof ErpSku): boolean {
  const size = sizeKey ? (sku[sizeKey] as string | null) : null;
  const color = colorKey ? (sku[colorKey] as string | null) : null;
  return (!sizeKey || row.sizes.length === 0 || row.sizes.includes(size ?? ''))
    && (!colorKey || row.colors.length === 0 || row.colors.includes(color ?? ''));
}

/** 一档的单价：空白件 + （带设计时）第一种工艺的单面印花价；缺印花价时返回 null */
function rowCost(row: TierPriceRow, includePrint: boolean): number | null {
  const blank = row.blankPrice ?? 0;
  if (!includePrint) return row.blankPrice != null && row.blankPrice > 0 ? row.blankPrice : null;
  const face = row.prints[0]?.faces.find((f) => f.faces === 1) ?? row.prints[0]?.faces[0];
  if (!face) return null;
  const cost = blank + face.price;
  return cost > 0 ? cost : null;
}

/**
 * 可以同步到店铺的 variant 及其成本。
 * - 白板（includePrint = false）：成本 = 该等级的空白件售价，为 0 或缺失的 variant 不能同步；
 * - 带设计（includePrint = true）：成本 = 空白件售价 + 第一种工艺的单面印花价（与目录起价口径一致），
 *   一个产品有多组定价时取第一组有价的档位。
 */
export function buildSyncVariants(product: ErpProduct, tier: SellerTier, listableSkus: ErpSku[], includePrint: boolean): BlankVariant[] {
  const dimensions = resolveOptionDimensions(product);
  const sizeKey = dimensions.find((d) => d.isSize)?.key;
  const colorKey = dimensions.find((d) => d.isColor)?.key;
  const tables = resolveTierPriceTables(product, tier, listableSkus);

  const variants: BlankVariant[] = [];
  for (const sku of listableSkus) {
    let cost: number | null = null;
    for (const rows of tables) {
      for (const row of rows) {
        if (!rowCovers(row, sku, sizeKey, colorKey)) continue;
        cost = rowCost(row, includePrint);
        if (cost != null) break;
      }
      if (cost != null) break;
    }
    if (cost == null) continue;
    variants.push({
      skuId: sku.id, sku: sku.sku, option1: sku.option1, option2: sku.option2, option3: sku.option3,
      skuImage: sku.skuImage, cost,
    });
  }
  return variants;
}

/** 把表单结果写回已存在的产品记录（设计后同步）；成本 = 启用 variant 里最低的单价。 */
export function buildProductSyncUpdate(product: ErpProduct, variants: BlankVariant[], images: BlankProductImage[], input: BlankProductInput) {
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
  const selectedImages = new Set(input.selectedImageIds);
  return {
    title: input.title,
    description: input.description,
    status: 'ready' as const,
    selected_skus: selectedSkus,
    option_names: resolveOptionDimensions(product).map((d) => d.name),
    product_images: images
      .filter((image) => selectedImages.has(image.id))
      .map((image) => ({ id: image.id, url: erpImage(image.rawPath) ?? '', rawPath: image.rawPath, isMain: image.isMain })),
    retail_price: input.retailPrice,
    cost: Math.min(...variants.filter((v) => enabled.has(v.skuId)).map((v) => v.cost)),
    updated_at: new Date().toISOString(),
  };
}
