import type { ErpProduct } from '@/lib/types/catalog';

export function getCategory(product: ErpProduct): string {
  return product.category || product.categoryName || product.productType || '';
}

export function getProductName(product: ErpProduct): string {
  return product.itemEnName || product.title || product.itemCnName;
}

export function erpImg(path: string): string {
  return path ? `/api/erp/image?path=${encodeURIComponent(path)}` : '';
}

export function getImageUrl(product: ErpProduct): string | null {
  const path = product.mainPic || product.prodImageList?.find(image => image.isMain === 1)?.picSrc || product.prodImageList?.[0]?.picSrc;
  return path ? erpImg(path) : null;
}

export function getProductImages(product: ErpProduct): string[] {
  const paths = [product.mainPic, ...[...(product.prodImageList ?? [])]
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0)).map(image => image.picSrc)];
  return [...new Set(paths.filter(Boolean).map(erpImg))];
}

export function getPriceRange(product: ErpProduct): { min: number; max: number } | null {
  const prices = (product.prodSkuList ?? []).map(sku => sku.price)
    .filter((price): price is number => price != null && Number.isFinite(price) && price >= 0);
  return prices.length ? { min: Math.min(...prices), max: Math.max(...prices) } : null;
}

export function filterCatalogProducts(products: ErpProduct[], search: string, category: string): ErpProduct[] {
  const query = search.trim().toLowerCase();
  return products.filter(product => (category === 'all' || getCategory(product) === category)
    && [product.itemEnName, product.itemCnName, product.title, product.itemNo]
      .some(value => (value || '').toLowerCase().includes(query)));
}

export function getProductOptions(product: ErpProduct) {
  const rawOptions = { option1: [] as string[], option2: [] as string[], option3: [] as string[] };
  for (const sku of product.prodSkuList ?? []) {
    for (const key of ['option1', 'option2', 'option3'] as const) {
      const value = sku[key];
      if (value && !rawOptions[key].includes(value)) rawOptions[key].push(value);
    }
  }
  const looksLikeSizes = (values: string[]) => values.length > 0
    && values.filter(value => /^(XXS|XS|S|M|L|XL|XXL|XXXL|\d?XL|\d{1,3})$/i.test(value.trim())).length > values.length / 2;
  const firstIsSize = looksLikeSizes(rawOptions.option1);
  const colorOptionKey = firstIsSize ? 'option2' : 'option1';
  return {
    rawOptions, colorOptionKey,
    colorValues: rawOptions[colorOptionKey],
    sizeValues: firstIsSize ? rawOptions.option1 : looksLikeSizes(rawOptions.option2) ? rawOptions.option2 : [],
  } as const;
}
