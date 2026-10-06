import type { ErpProduct } from '@/lib/types/catalog';
import { readProductCost } from '@creator-commerce/shared';
import type { DesignEditorProductMeta } from '@creator-commerce/shared';
import type { DesignForProduct, ExternalProduct, ShopifyTemplateProduct } from '@/lib/types/product-creation';
import { getImageUrl, getPriceRange, getProductName } from '@/lib/catalog/product';

export function toErpTemplate(product: ErpProduct): ExternalProduct {
  const name = getProductName(product);
  return { id: `erp-${product.id}`, name, product_name: name, description: product.description || product.itemNo,
    thumbnail: getImageUrl(product), source: 'erp', base_cost: getPriceRange(product)?.min ?? null };
}

export function toShopifyTemplate(product: ShopifyTemplateProduct): ExternalProduct {
  const price = readProductCost(product.variants?.[0]?.price);
  return { id: `shopify-${product.id}`, name: product.title, product_name: product.title,
    description: (product.body_html || '').replace(/<[^>]*>/g, '').slice(0, 100),
    thumbnail: product.images?.[0]?.src || product.image?.src || null, source: 'shopify',
    base_cost: price ?? null };
}

export function getDesignArtworkUrl(design: DesignForProduct): string | null {
  const latest = [...(design.design_versions ?? [])].sort((a, b) => b.version_number - a.version_number)[0];
  return latest?.design_assets?.find(asset => asset.asset_type === 'artwork')?.file_url ?? null;
}

export function buildExternalProductMeta(products: ExternalProduct[]): DesignEditorProductMeta[] {
  return products.map(product => ({ id: product.id, name: product.product_name,
    ...(product.base_cost != null ? { base_cost: product.base_cost } : {}), source: product.source, thumbnail: product.thumbnail }));
}
