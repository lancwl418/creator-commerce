import type { SellerTier } from '@creator-commerce/shared/erp/pricing';
import { getListableSkus } from '../catalog';
import { getProductDetail } from '../catalog.server';
import { buildSyncVariants } from '../products/product-sync';
import { displaySupplierName, getMainSupplier } from '../suppliers/suppliers';
import type { BulkOrderItem, CartItemRow, PricedCartItem } from '../types/bulk-order';

/**
 * 按当前等级给购物车的每一行算单价；产品下架或没价时为 null。
 * 白板行（faces=0）用空白件价，带设计的行用「空白件价 + faces 面印花价」。
 */
export async function priceCartItems(items: CartItemRow[], tier: SellerTier): Promise<PricedCartItem[]> {
  // 同一产品可能同时有白板行和不同面数的设计行，按 (产品, 面数) 分别取价
  const groups = [...new Set(items.map((item) => `${item.erp_product_id}:${item.faces}`))];
  const costBySkuFaces = new Map<string, number>();
  const supplierByProduct = new Map<string, { id: string | null; name: string | null }>();
  await Promise.all(groups.map(async (group) => {
    const splitAt = group.lastIndexOf(':');
    const erpProductId = group.slice(0, splitAt);
    const faces = Number(group.slice(splitAt + 1));
    const { product, data } = await getProductDetail(erpProductId, tier);
    if (!product) return;
    const supplier = getMainSupplier(product);
    supplierByProduct.set(erpProductId, {
      id: supplier?.id ?? null,
      name: supplier ? displaySupplierName(supplier, data.supplierNames) : null,
    });
    for (const variant of buildSyncVariants(product, getListableSkus(product, data), faces === 0 ? false : faces)) {
      costBySkuFaces.set(`${variant.skuId}:${faces}`, variant.cost);
    }
  }));
  return items.map((item) => ({
    ...item,
    unit_cost: costBySkuFaces.get(`${item.sku_id}:${item.faces}`) ?? null,
    supplier_id: supplierByProduct.get(item.erp_product_id)?.id ?? null,
    supplier_name: supplierByProduct.get(item.erp_product_id)?.name ?? null,
  }));
}

/** 全部有价的购物车行 → 采购单条目（带设计的行把设计文件和面数带进条目） */
export function cartToOrderItems(items: PricedCartItem[]): BulkOrderItem[] {
  return items
    .filter((item): item is PricedCartItem & { unit_cost: number } => item.unit_cost != null)
    .map((item) => ({
      erp_product_id: item.erp_product_id,
      product_title: item.product_title,
      sku_id: item.sku_id, sku: item.sku,
      option1: item.option1, option2: item.option2, option3: item.option3,
      quantity: item.quantity, unit_cost: item.unit_cost,
      supplier_name: item.supplier_name,
      ...(item.faces > 0 && item.design_files ? { design_files: item.design_files, faces: item.faces } : {}),
    }));
}
