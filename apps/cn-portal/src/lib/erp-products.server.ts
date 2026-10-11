import {
  fetchProducts,
  findProductById,
  type ErpProduct,
  type ErpProductPage,
} from '@creator-commerce/shared/erp';
import { getErpConfig } from './erp';
import { createTtlCache } from './ttl-cache';

// ERP 产品数据与卖家等级无关，可以跨请求共用；等级价格、可见性、库存在其后按请求计算。
//
// ERP 列表接口每 100 条要 2~3 秒、整个目录 7MB 左右，用户不能每次都等它：
// 5 分钟内直接用缓存；5 分钟到 6 小时之间先返回旧数据、后台刷新；
// 进程启动时预热并定时刷新（见 instrumentation.ts），正常情况下页面永远不等 ERP。
const ERP_FRESH_MS = 5 * 60 * 1000;
const ERP_STALE_MS = 6 * 60 * 60 * 1000;
const ERP_PAGE_CACHE_ENTRIES = 50;
const ERP_PRODUCT_CACHE_ENTRIES = 1000;
const erpPageCache = createTtlCache<ErpProductPage>(ERP_FRESH_MS, ERP_PAGE_CACHE_ENTRIES, { staleMs: ERP_STALE_MS });
const erpProductCache = createTtlCache<ErpProduct | null>(ERP_FRESH_MS, ERP_PRODUCT_CACHE_ENTRIES, { staleMs: ERP_STALE_MS });

function loadErpPage(pageNo: number, pageSize: number): Promise<ErpProductPage> {
  return erpPageCache.get(`${pageNo}:${pageSize}`, async () => {
    const page = await fetchProducts(getErpConfig(), pageNo, pageSize);
    // 列表记录与详情接口返回的结构一致，顺带写入详情缓存，从列表点进详情不必再请求 ERP。
    for (const product of page.records) erpProductCache.set(product.id, product);
    return page;
  });
}

export function loadErpProduct(erpProductId: string): Promise<ErpProduct | null> {
  return erpProductCache.get(erpProductId, () => findProductById(getErpConfig(), erpProductId));
}

// ERP 产品列表接口只有分页参数，不能按业务线筛选；目录要先取回全部产品再在本地筛选、
// 排序和分页。各页走上面的缓存。
const ERP_SCAN_PAGE_SIZE = 100;

export async function loadAllErpProducts(): Promise<ErpProduct[]> {
  const first = await loadErpPage(1, ERP_SCAN_PAGE_SIZE);
  const rest = await Promise.all(
    Array.from({ length: Math.max(0, first.pages - 1) }, (_, index) =>
      loadErpPage(index + 2, ERP_SCAN_PAGE_SIZE)
    )
  );
  return [first, ...rest].flatMap((page) => page.records);
}

// 比新鲜期略晚一点触发，保证每次定时刷新都真的重新拉 ERP。
const ERP_WARM_INTERVAL_MS = ERP_FRESH_MS + 5 * 1000;
let warming = false;

/** 进程启动时拉一遍目录，之后定时在后台刷新，用户打开页面时数据已经在内存里。 */
export function keepErpProductsWarm(): void {
  if (warming) return;
  warming = true;
  const refresh = async () => {
    const started = Date.now();
    try {
      const products = await loadAllErpProducts();
      console.log(`[cn-portal] ERP 目录已刷新：${products.length} 个产品，${Date.now() - started}ms`);
    } catch (error) {
      console.warn('[cn-portal] ERP 目录刷新失败，下次再试', error);
    }
  };
  void refresh();
  setInterval(refresh, ERP_WARM_INTERVAL_MS).unref();
}
