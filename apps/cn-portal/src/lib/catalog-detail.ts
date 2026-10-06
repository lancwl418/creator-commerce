import type { ErpProduct } from '@creator-commerce/shared/erp/types';
import type { CatalogItem, PlatformData, ProductAttribute, ProductDetailView } from './types/catalog';
import { getListableSkus } from './catalog';

function distinct(values: (string | null | undefined)[]): string[] {
  return Array.from(new Set(values.filter((v): v is string => !!v)));
}

export function buildProductDetailView(
  product: ErpProduct,
  item: CatalogItem,
  data: PlatformData
): ProductDetailView {
  const skus = getListableSkus(product, data);
  // 图集
  const images = distinct([
    product.mainPic,
    ...(product.prodImageList ?? []).map((i) => i.picSrc),
  ]);

  // 属性表（英文原文，文档 5.3）。维度名在产品主档的 option1~3，维度值在各 SKU 的同名字段。
  const attrs: ProductAttribute[] = [];
  for (const key of ['option1', 'option2', 'option3'] as const) {
    const label = product[key] || product[`${key}Name`];
    const value = distinct(skus.map((s) => s[key])).join(', ');
    if (label && value) attrs.push({ label, value });
  }
  if (product.weight != null)
    attrs.push({ label: 'Weight', value: String(product.weight) });

  return {
    item,
    images,
    attributes: attrs,
    productionTime: product.productionTime ?? null,
    shipFrom: product.shipFrom ?? null,
  };
}
