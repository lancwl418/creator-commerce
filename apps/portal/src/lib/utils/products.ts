import type { ErpSku } from '@/lib/types';

/** Extract unique option values from SKU list */
export function extractOptionValues(skus: ErpSku[]) {
  const option1 = [...new Set(skus.map(s => s.option1).filter(Boolean))] as string[];
  const option2 = [...new Set(skus.map(s => s.option2).filter(Boolean))] as string[];
  const option3 = [...new Set(skus.map(s => s.option3).filter(Boolean))] as string[];
  return { option1, option2, option3 };
}

export interface ColorVariant {
  color: string;
  imageUrl: string;
}

/** Extract unique color variants with images, preferring R2 design previews */
export function extractColorVariants(
  skus: ErpSku[],
  variantPreviewUrls: Record<string, string> | null,
  resolveImageUrl: (path: string) => string,
): ColorVariant[] {
  const seen = new Set<string>();
  const variants: ColorVariant[] = [];
  const previews = variantPreviewUrls || {};

  for (const sku of skus) {
    const color = sku.option1 || sku.option2;
    if (!color || seen.has(color)) continue;
    seen.add(color);
    const previewFromR2 = previews[color];
    const fallbackImage = sku.skuImage ? resolveImageUrl(sku.skuImage) : '';
    if (previewFromR2 || fallbackImage) {
      variants.push({ color, imageUrl: previewFromR2 || fallbackImage });
    }
  }

  return variants;
}

export interface SkuGroup {
  color: string;
  skus: ErpSku[];
}

/** Group SKUs by option1 (typically Color) */
export function groupSkusByColor(skus: ErpSku[], option1Values: string[]): SkuGroup[] | null {
  if (option1Values.length === 0) return null;

  const groups: SkuGroup[] = [];
  for (const color of option1Values) {
    groups.push({ color, skus: skus.filter(s => s.option1 === color) });
  }
  const noColor = skus.filter(s => !s.option1);
  if (noColor.length > 0) groups.push({ color: '', skus: noColor });
  return groups;
}

/** Check if all variants for a color are enabled */
export function isColorFullyEnabled(skus: ErpSku[], colorValue: string, enabledIds: Set<string>): boolean {
  return skus.filter(s => s.option1 === colorValue).every(s => enabledIds.has(s.id));
}

/** Check if some (but not all) variants for a color are enabled */
export function isColorPartiallyEnabled(skus: ErpSku[], colorValue: string, enabledIds: Set<string>): boolean {
  const skusForColor = skus.filter(s => s.option1 === colorValue);
  const enabledCount = skusForColor.filter(s => enabledIds.has(s.id)).length;
  return enabledCount > 0 && enabledCount < skusForColor.length;
}
