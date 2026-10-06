import type { SkuSelection } from '@/lib/types/product';

export function validateListingPrices(skus: SkuSelection[], productPrice: number | null): void {
  for (const sku of skus) {
    const salePrice = sku.price ?? productPrice;
    if (salePrice == null || !Number.isFinite(salePrice) || salePrice <= 0) {
      throw new Error(`Enter a valid sale price for variant ${sku.sku || sku.sku_id}`);
    }
    if (sku.erpPrice == null || !Number.isFinite(sku.erpPrice) || sku.erpPrice < 0) {
      throw new Error(`Cost is missing for variant ${sku.sku || sku.sku_id}. Reload its cost before publishing.`);
    }
  }
}
