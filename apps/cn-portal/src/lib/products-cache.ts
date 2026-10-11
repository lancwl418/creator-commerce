import type { ErpProduct } from '@creator-commerce/shared/erp/types';
import { createTtlCache } from './ttl-cache';

// 把要编辑的产品放进进程内缓存，Design Engine 通过 /api/erp/products-cache?key= 取一次。
// 与 Creator Portal 的做法一致；这里在服务端写入，所以可以先把成本、报价等敏感字段去掉。

const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_ENTRIES = 200;
const cache = createTtlCache<unknown[]>(CACHE_TTL_MS, CACHE_ENTRIES);

/** Design Engine 只用产品主档、SKU 规格和图片；供应商报价、定价分组、SKU 成本不下发到浏览器。 */
export function sanitizeProductForEditor(product: ErpProduct): Record<string, unknown> {
  const { suppliers: _suppliers, pricingGroups: _pricingGroups, prodSkuList, ...rest } = product;
  return {
    ...rest,
    prodSkuList: (prodSkuList ?? []).map((sku) => {
      const { costPrice: _costPrice, compareAtPrice: _compareAtPrice, ...skuRest } = sku as typeof sku & { costPrice?: unknown; compareAtPrice?: unknown };
      return skuRest;
    }),
  };
}

export function cacheProductsForEditor(products: ErpProduct[]): string {
  const key = crypto.randomUUID();
  cache.set(key, products.map(sanitizeProductForEditor));
  return key;
}

/** 读取并作废；key 只能用一次 */
export async function takeCachedProducts(key: string): Promise<unknown[] | null> {
  try {
    const products = await cache.get(key, async () => { throw new Error('missing'); });
    cache.set(key, []);
    return products.length > 0 ? products : null;
  } catch {
    return null;
  }
}
