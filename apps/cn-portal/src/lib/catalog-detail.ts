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

  // 属性表（英文原文，文档 5.3）
  const attrs: ProductAttribute[] = [];
  if (product.option1Name)
    attrs.push({
      label: product.option1Name,
      value: distinct(skus.map((s) => s.option1)).join(', '),
    });
  if (product.option2Name)
    attrs.push({
      label: product.option2Name,
      value: distinct(skus.map((s) => s.option2)).join(', '),
    });
  if (product.option3Name)
    attrs.push({
      label: product.option3Name,
      value: distinct(skus.map((s) => s.option3)).join(', '),
    });
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
