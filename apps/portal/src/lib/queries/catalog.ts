import { erpConfigFromEnv, findProductById, fetchProducts } from '@creator-commerce/shared/erp';
import { getProductName, getImageUrl, getPriceRange } from '@/lib/catalog/product';
import type { RecommendedProduct } from '@/lib/types/dashboard';

export function getCatalogProduct(id: string) {
  return findProductById(erpConfigFromEnv(), id);
}

export async function getRecommendedProducts(): Promise<RecommendedProduct[]> {
  const page = await fetchProducts(erpConfigFromEnv(), 1, 8);
  return page.records.slice(0, 8).map(product => ({ id: product.id, name: getProductName(product),
    image: getImageUrl(product), price: getPriceRange(product)?.min ?? null }));
}
