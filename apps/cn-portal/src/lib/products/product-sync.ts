import type { ErpProduct, ErpSku } from '@creator-commerce/shared/erp/types';
import { resolveOptionDimensions } from '@creator-commerce/shared/erp/options';
import { resolveTierPriceTables, type TierPriceRow } from '@creator-commerce/shared/erp/pricing';
import type { SkuSelection } from '@creator-commerce/shared/shopify/listing-prices';
import { CN_PRICE_TIER } from '../catalog';
import { erpImage } from '../image';
import type { BlankProductImage, BlankProductInput, BlankVariant } from '../types/product';

function rowCovers(row: TierPriceRow, sku: ErpSku, sizeKey?: keyof ErpSku, colorKey?: keyof ErpSku): boolean {
  const size = sizeKey ? (sku[sizeKey] as string | null) : null;
  const color = colorKey ? (sku[colorKey] as string | null) : null;
  return (!sizeKey || row.sizes.length === 0 || row.sizes.includes(size ?? ''))
    && (!colorKey || row.colors.length === 0 || row.colors.includes(color ?? ''));
}

/**
 * 一档的单价：
 * - print = false：空白件售价，必须大于 0；
 * - print = N：空白件售价 + 第一种工艺 N 面的印花价（face_N）；没有 N 面价时不可用。
 */
function rowCost(row: TierPriceRow, print: PrintFaces): number | null {
  if (print === false) return row.blankPrice != null && row.blankPrice > 0 ? row.blankPrice : null;
  const face = row.prints[0]?.faces.find((f) => f.faces === print);
  if (!face) return null;
  const cost = (row.blankPrice ?? 0) + face.price;
  return cost > 0 ? cost : null;
}

/** false = 只要白板；N = 设计了 N 面 */
export type PrintFaces = false | number;

/**
 * 可以同步 / 下单的 variant 及其成本。
 * - 白板：成本 = 该等级的空白件售价，为 0 或缺失的 variant 不能用；
 * - 带设计（N 面）：成本 = 空白件售价 + 第一种工艺 N 面的印花价（1 面即目录起价口径），
 *   价格只取主供应商（mainSupplierId）的定价组；仍有多组时取第一组有价的档位。
 */
export function buildSyncVariants(product: ErpProduct, listableSkus: ErpSku[], print: PrintFaces): BlankVariant[] {
  const dimensions = resolveOptionDimensions(product);
  const sizeKey = dimensions.find((d) => d.isSize)?.key;
  const colorKey = dimensions.find((d) => d.isColor)?.key;
  const tables = resolveTierPriceTables(product, CN_PRICE_TIER, listableSkus);

  const variants: BlankVariant[] = [];
  for (const sku of listableSkus) {
    let cost: number | null = null;
    for (const rows of tables) {
      for (const row of rows) {
        if (!rowCovers(row, sku, sizeKey, colorKey)) continue;
        cost = rowCost(row, print);
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
