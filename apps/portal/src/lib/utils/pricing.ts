import { DEFAULT_COST } from '@/lib/constants';
import type { ErpSku } from '@/lib/types';

export interface ProfitRange {
  min: number;
  max: number;
  minMargin: number;
  maxMargin: number;
  costMin: number;
  costMax: number;
  uniform: boolean;
}

/** Get the ERP cost for a SKU, falling back to DEFAULT_COST */
export function getSkuCost(sku: ErpSku): number {
  return sku.price || DEFAULT_COST;
}

/** Get the effective sale price for a variant (custom override or product-level price) */
export function getEffectivePrice(
  skuId: string,
  variantPrices: Record<string, string>,
  productPrice: number,
): number {
  const override = variantPrices[skuId];
  if (override !== undefined && override !== '') return parseFloat(override) || 0;
  return productPrice;
}

/** Calculate profit for a single variant */
export function calculateVariantProfit(salePrice: number, cost: number): number {
  return salePrice - cost;
}

/** Calculate earnings for a line item */
export function calculateEarnings(salePrice: number, baseCost: number, quantity: number): number {
  return (salePrice - baseCost) * quantity;
}

/** Calculate profit range across all enabled variants */
export function calculateProfitRange(
  skus: ErpSku[],
  enabledSkuIds: Set<string>,
  variantPrices: Record<string, string>,
  productPrice: number,
): ProfitRange {
  const enabledSkus = skus.filter(s => enabledSkuIds.has(s.id));
  if (enabledSkus.length === 0) {
    return { min: 0, max: 0, minMargin: 0, maxMargin: 0, costMin: 0, costMax: 0, uniform: true };
  }

  let minProfit = Infinity;
  let maxProfit = -Infinity;
  let costMin = Infinity;
  let costMax = -Infinity;

  for (const sku of enabledSkus) {
    const cost = getSkuCost(sku);
    const salePrice = getEffectivePrice(sku.id, variantPrices, productPrice);
    const profit = salePrice - cost;
    if (profit < minProfit) minProfit = profit;
    if (profit > maxProfit) maxProfit = profit;
    if (cost < costMin) costMin = cost;
    if (cost > costMax) costMax = cost;
  }

  const minMargin = productPrice > 0 ? (minProfit / productPrice) * 100 : 0;
  const maxMargin = productPrice > 0 ? (maxProfit / productPrice) * 100 : 0;
  const uniform = Math.abs(minProfit - maxProfit) < 0.01;

  return { min: minProfit, max: maxProfit, minMargin, maxMargin, costMin, costMax, uniform };
}

/** Format a number as USD price string */
export function formatPrice(amount: number, decimals = 2): string {
  return `$${amount.toFixed(decimals)}`;
}

/** Format a price range */
export function formatPriceRange(min: number, max: number, decimals = 2): string {
  if (Math.abs(min - max) < 0.01) return formatPrice(min, decimals);
  return `${formatPrice(min, decimals)} – ${formatPrice(max, decimals)}`;
}

/** Format a percentage range */
export function formatPercentRange(min: number, max: number, decimals = 1): string {
  if (Math.abs(min - max) < 0.01) return `${min.toFixed(decimals)}%`;
  return `${min.toFixed(decimals)}% – ${max.toFixed(decimals)}%`;
}
