import type { SellerTier } from '@creator-commerce/shared/erp/pricing';
import { getListableSkus } from '../catalog';
import { getProductDetail } from '../catalog.server';
import { buildSyncVariants } from '../products/product-sync';
import type { BulkOrderItem, CartItemRow, PricedCartItem } from '../types/bulk-order';

/** 按当前等级给购物车的每一行算单价（白板价）；产品下架或没价时为 null。 */
export async function priceCartItems(items: CartItemRow[], tier: SellerTier): Promise<PricedCartItem[]> {
  const productIds = [...new Set(items.map((item) => item.erp_product_id))];
  const costBySku = new Map<string, number>();
  await Promise.all(productIds.map(async (erpProductId) => {
    const { product, data } = await getProductDetail(erpProductId, tier);
    if (!product) return;
    for (const variant of buildSyncVariants(product, getListableSkus(product, data), false)) {
      costBySku.set(variant.skuId, variant.cost);
    }
  }));
  return items.map((item) => ({ ...item, unit_cost: costBySku.get(item.sku_id) ?? null }));
}

/** 全部有价的购物车行 → 采购单条目 */
export function cartToOrderItems(items: PricedCartItem[]): BulkOrderItem[] {
  return items
    .filter((item): item is PricedCartItem & { unit_cost: number } => item.unit_cost != null)
    .map((item) => ({
      erp_product_id: item.erp_product_id,
      product_title: item.product_title,
      sku_id: item.sku_id, sku: item.sku,
      option1: item.option1, option2: item.option2, option3: item.option3,
      quantity: item.quantity, unit_cost: item.unit_cost,
    }));
}
