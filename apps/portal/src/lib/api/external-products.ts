import { getDesignEngineUrl } from '@/lib/design-engine';
import type { ExternalProduct, ShopifyTemplateProduct } from '@/lib/types/product-creation';
import { toErpTemplate, toShopifyTemplate } from '@/lib/products/externalProducts';
import { fetchErpProducts } from './erp-products';

async function fetchShopifyTemplates(signal?: AbortSignal): Promise<ExternalProduct[]> {
  const response = await fetch(`${getDesignEngineUrl()}/api/shopify-products?limit=20`, { signal });
  const data: { products?: ShopifyTemplateProduct[]; error?: string } = await response.json();
  if (!response.ok || !Array.isArray(data.products)) throw new Error(data.error || 'Failed to load Shopify products');
  return data.products.map(toShopifyTemplate);
}

export async function fetchExternalProducts(signal?: AbortSignal): Promise<{ products: ExternalProduct[]; warnings: string[] }> {
  const results = await Promise.allSettled([
    fetchShopifyTemplates(signal),
    fetchErpProducts(1, 20, signal).then(page => page.records.map(toErpTemplate)),
  ]);
  const products: ExternalProduct[] = [];
  const warnings: string[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') products.push(...result.value);
    else warnings.push(result.reason instanceof Error ? result.reason.message : 'Failed to load product source');
  }
  return { products, warnings };
}
