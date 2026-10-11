/** 产品上要同步到店铺的一个 variant（存在 sellable_product_instances.selected_skus） */
export interface SkuSelection {
  sku_id: string;
  sku: string;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  enabled: boolean;
  /** 该 variant 的售价；为空时用产品统一售价 */
  price?: number | null;
  /** 供应链成本快照 */
  erpPrice?: number | null;
  skuImage?: string | null;
}

/** 发布前校验：每个 variant 都要有合法售价和成本，不能用默认值代替。 */
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
