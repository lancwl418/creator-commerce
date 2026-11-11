import type { ErpProduct, ErpSku } from '@creator-commerce/shared/erp';
import { createClient } from './supabase/server';
import { buildCatalog, getListableSkus, isApprovedErpProduct } from './catalog';
import type { CatalogResult, PlatformData, ProductDetailData } from './types/catalog';
import { loadAllRows } from './platform-data';
import { loadAllErpProducts, loadErpProduct } from './erp-products.server';
import { loadSupplierNames } from './queries/supplier-settings';
import { getSellerSupplierScope } from './queries/supplier-access';
import { isProductInSupplierScope } from './suppliers/suppliers';
import type { Seller } from './types/seller';

/** 看目录的卖家；按其可见供应商白名单过滤（见 migration 038） */
type CatalogViewer = Pick<Seller, 'id'>;

/**
 * 装配 PlatformData：起订量（MOQ）+ 供应商显示名。可见性 / 库存过滤已取消，
 * 不再查那两张表，省掉每次列表 / 详情的两次全表扫描。
 */
export async function loadPlatformData(): Promise<PlatformData> {
  const supabase = await createClient();

  const [moqRows, supplierNames] = await Promise.all([
    loadAllRows<{ sku: string; min_qty: number | null; min_amount: number | null }>(
      'product_moq', (from, to) =>
        supabase
          .from('product_moq')
          .select('sku, min_qty, min_amount')
          .order('sku')
          .range(from, to)
    ),
    loadSupplierNames(),
  ]);

  const moq = new Map<string, { minQty: number | null; minAmount: number | null }>();
  for (const r of moqRows) {
    moq.set(r.sku, { minQty: r.min_qty, minAmount: r.min_amount });
  }

  // 保留 PlatformData 形状（可见性 / 库存字段留空，已不参与过滤）。
  return { hiddenSkusForTier: new Set(), stock: new Map(), moq, supplierNames };
}

/** 卖家可选的全部产品（只含审批通过、且主供应商在其白名单内的，未分页）。计价统一走 VIP。 */
export async function getCatalog(seller: CatalogViewer): Promise<CatalogResult> {
  const [products, data, scope] = await Promise.all([
    loadAllErpProducts(),
    loadPlatformData(),
    getSellerSupplierScope(seller.id),
  ]);
  return buildCatalog(products.filter((p) => isProductInSupplierScope(p, scope)), data);
}

async function loadApprovedProduct(erpProductId: string): Promise<{ product: ErpProduct | null; data: PlatformData }> {
  const [product, data] = await Promise.all([
    loadErpProduct(erpProductId),
    loadPlatformData(),
  ]);
  return { product: product && isApprovedErpProduct(product) ? product : null, data };
}

/**
 * 详情页 / 建品 / 下单入口用的原始产品 + 平台数据。
 * 未审批通过、或主供应商不在卖家白名单内的产品按不存在处理（返回 product=null）。
 */
export async function getProductDetail(
  erpProductId: string,
  seller: CatalogViewer
): Promise<ProductDetailData> {
  const [detail, scope] = await Promise.all([
    loadApprovedProduct(erpProductId),
    getSellerSupplierScope(seller.id),
  ]);
  return detail.product && isProductInSupplierScope(detail.product, scope)
    ? detail
    : { product: null, data: detail.data };
}

/**
 * 卖家「已建产品」用的产品详情：不按供应商白名单过滤。
 * 收回某供应商的可见权后，已建好的产品照常可同步 / 下单（只挡新建）。
 */
export function getCreatedProductDetail(erpProductId: string): Promise<ProductDetailData> {
  return loadApprovedProduct(erpProductId);
}

export interface SkuLookup {
  product: ErpProduct;
  sku: ErpSku;
}

/**
 * 卖家可见目录的 SKU 编码索引（批量 / 表格下单按 SKU 找产品用）。
 * 只收审批通过、且主供应商在卖家白名单内的产品；其每个 SKU 都收。
 */
export async function getSkuIndex(seller: CatalogViewer): Promise<Map<string, SkuLookup>> {
  const [products, data, scope] = await Promise.all([
    loadAllErpProducts(),
    loadPlatformData(),
    getSellerSupplierScope(seller.id),
  ]);
  const index = new Map<string, SkuLookup>();
  for (const product of products) {
    if (!isApprovedErpProduct(product) || !isProductInSupplierScope(product, scope)) continue;
    for (const sku of getListableSkus(product, data)) {
      if (sku.sku) index.set(sku.sku.trim().toUpperCase(), { product, sku });
    }
  }
  return index;
}
