import {
  erpConfigFromEnv,
  findProductById,
  resolveSupplierSkuCost,
  type ErpProduct,
} from '@creator-commerce/shared/erp';
import { createClient } from '@/lib/supabase/server';
import type {
  CnOrderItem,
  CnOrderRow,
  OrderPushPrepMap,
  ProductPushPrep,
  SupplierOptionView,
} from '@/lib/types/cn-order';

/** 还没推送 ERP 的单才需要工厂比价 */
function needsPushPrep(order: CnOrderRow): boolean {
  return order.status !== 'cancelled' && !order.erp_order_id;
}

/** 条目的印花面数：条目级优先，其次单级；设计单缺省按单面 */
function itemFaces(order: CnOrderRow, item: CnOrderItem): number {
  return item.faces ?? order.faces ?? (order.order_type === 'designed' ? 1 : 0);
}

/** 按产品聚合条目（多产品批量单的产品信息在条目上） */
function groupItemsByProduct(order: CnOrderRow): Map<string, { title: string; items: CnOrderItem[] }> {
  const groups = new Map<string, { title: string; items: CnOrderItem[] }>();
  for (const item of order.items) {
    const productId = item.erp_product_id ?? order.erp_product_id;
    if (!productId) continue;
    const title = item.product_title ?? order.product_title ?? '';
    const group = groups.get(productId);
    if (group) group.items.push(item);
    else groups.set(productId, { title, items: [item] });
  }
  return groups;
}

function buildOptions(
  order: CnOrderRow,
  product: ErpProduct,
  items: CnOrderItem[],
  supplierNames: Map<string, string>
): SupplierOptionView[] {
  return (product.suppliers ?? []).map((quote) => {
    let total: number | null = 0;
    let missingItems = 0;
    for (const item of items) {
      const cost = resolveSupplierSkuCost(product, quote, item.sku_id, itemFaces(order, item));
      if (cost.unit === null) {
        missingItems += 1;
        total = null;
      } else if (total !== null) {
        total += cost.unit * item.quantity;
      }
    }
    const supplierId = quote.supplierId?.trim() || null;
    // Admin 用真实工厂名（ERP 原名）；cn_supplier_settings 的自定义名是给卖家看的昵称，只作备注
    const name = quote.name?.trim() || supplierId || quote.id;
    const nickname = (supplierId && supplierNames.get(supplierId)?.trim()) || null;
    return {
      quoteId: quote.id,
      supplierId,
      name,
      nickname: nickname && nickname !== name ? nickname : null,
      isMain: !!supplierId && supplierId === product.mainSupplierId?.trim(),
      total: total !== null ? Math.round(total * 100) / 100 : null,
      missingItems,
    };
  });
}

/**
 * 推送预处理数据：给每张待推送的单，按产品列出各工厂报价算出的本单成本。
 * ERP 取数失败的产品没有比价（UI 退回只显示下单快照的工厂）。
 */
export async function getCnOrderPushPrep(orders: CnOrderRow[]): Promise<OrderPushPrepMap> {
  const pending = orders.filter(needsPushPrep);
  if (pending.length === 0) return {};

  const productIds = [...new Set(pending.flatMap((order) => [...groupItemsByProduct(order).keys()]))];
  if (productIds.length === 0) return {};

  let cfg: ReturnType<typeof erpConfigFromEnv>;
  try {
    cfg = erpConfigFromEnv();
  } catch (error) {
    // ERP 环境变量没配时跳过比价，订单页照常显示
    console.error('[admin] ERP env not configured, skip push prep', error);
    return {};
  }
  const [products, supplierNames] = await Promise.all([
    Promise.all(
      productIds.map(async (id) => {
        try {
          return [id, await findProductById(cfg, id)] as const;
        } catch (error) {
          console.error(`[admin] Failed to load ERP product ${id} for push prep`, error);
          return [id, null] as const;
        }
      })
    ),
    loadSupplierNames(),
  ]);
  const productById = new Map(products);

  const prep: OrderPushPrepMap = {};
  for (const order of pending) {
    const entries: ProductPushPrep[] = [];
    for (const [productId, group] of groupItemsByProduct(order)) {
      const product = productById.get(productId);
      if (!product) continue;
      const options = buildOptions(order, product, group.items, supplierNames);
      if (options.length === 0) continue;
      entries.push({
        erpProductId: productId,
        erpItemNo: product.itemNo ?? null,
        productTitle: group.title || product.itemEnName || product.title,
        options,
        selectedQuoteId: order.push_suppliers?.[productId]?.quote_id ?? null,
        snapshotSupplierName: group.items.find((item) => item.supplier_name)?.supplier_name ?? null,
      });
    }
    if (entries.length > 0) prep[order.id] = entries;
  }
  return prep;
}

/** 供应商显示名（cn_supplier_settings，运营自定义名优先于 ERP 原名） */
async function loadSupplierNames(): Promise<Map<string, string>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('cn_supplier_settings')
    .select('supplier_id, display_name')
    .returns<{ supplier_id: string; display_name: string }[]>();
  if (error) {
    console.error('[admin] Failed to load supplier display names', error);
    return new Map();
  }
  return new Map((data ?? []).map((row) => [row.supplier_id, row.display_name]));
}
