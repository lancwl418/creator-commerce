import { describe, expect, it } from 'vitest';
import type { ErpProduct } from '@creator-commerce/shared/erp/types';
import { buildProductDetailView } from './catalog-detail';
import type { CatalogItem, PlatformData } from './types/catalog';

const item = { id: 'p1' } as CatalogItem;
const data: PlatformData = { hiddenSkusForTier: new Set(['hidden']), stock: new Map(), moq: new Map() };

function product(overrides: Partial<ErpProduct>): ErpProduct {
  return {
    id: 'p1', prodImageList: [],
    prodSkuList: [
      { id: '1', sku: 'a', price: null, option1: 'Black', option2: 'M', option3: null, inQty: 0, skuImage: null },
      { id: '2', sku: 'b', price: null, option1: 'Black', option2: 'L', option3: null, inQty: 0, skuImage: null },
      { id: '3', sku: 'hidden', price: null, option1: 'Pink', option2: 'XL', option3: null, inQty: 0, skuImage: null },
    ],
    ...overrides,
  } as ErpProduct;
}

describe('详情页属性表', () => {
  it('维度名取产品主档的 option1~3，值只取可上架 SKU 且去重', () => {
    const view = buildProductDetailView(product({ option1: 'Color', option2: 'Size', option3: null }), item, data);
    expect(view.attributes).toEqual([
      { label: 'Color', value: 'Black' },
      { label: 'Size', value: 'M, L' },
    ]);
  });

  it('没有维度名或没有值的维度不显示', () => {
    expect(buildProductDetailView(product({ option3: 'Material' }), item, data).attributes).toEqual([]);
  });
});
