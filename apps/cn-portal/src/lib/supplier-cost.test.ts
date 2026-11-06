import { describe, expect, it } from 'vitest';
import { resolveSupplierSkuCost } from '@creator-commerce/shared/erp';
import type { ErpProduct, ErpSupplierQuote } from '@creator-commerce/shared/erp/types';

// 按 ERP 真实报价结构造的最小 fixture：
// 一个尺码档 S~3XL，两个色档（Black 3.5 / 其他色 4.0），工艺成本分色档给 face_N。
const quote: ErpSupplierQuote = {
  id: 'quote_1',
  supplierId: 'supplier_a',
  name: 'JJS',
  sizeTiers: [
    {
      id: 'tier_1',
      code: 'S~3XL',
      memberSizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
      price: 4,
      colorTiers: [
        { id: 'ct_black', code: 'Black', price: 3.5, memberColors: ['Black'] },
        { id: 'ct_rest', code: 'red~green', price: 4, memberColors: ['red', 'grey', 'green'] },
      ],
    },
  ],
  crafts: [
    {
      id: 'craft_1',
      name: '白墨烫画',
      costByTier: {
        tier_1: {
          face_1: 0.8,
          face_2: 1.3,
          ct_black: { face_1: 0.5, face_2: 1 },
          ct_rest: { face_1: 0.8, face_2: 1.3 },
        },
      },
    },
  ],
};

const product = {
  id: 'prod_1',
  options: [
    { dimensionCode: 'Color', isColor: true },
    { dimensionCode: 'Size', isSize: true },
  ],
  suppliers: [quote],
  mainSupplierId: 'supplier_a',
  prodSkuList: [
    { id: 'sku_black_m', sku: 'A3-Black-M', price: null, option1: 'Black', option2: 'M', option3: null, inQty: 0, skuImage: null },
    { id: 'sku_grey_m', sku: 'A3-grey-M', price: null, option1: 'grey', option2: 'M', option3: null, inQty: 0, skuImage: null },
    { id: 'sku_grey_5xl', sku: 'A3-grey-5XL', price: null, option1: 'grey', option2: '5XL', option3: null, inQty: 0, skuImage: null },
  ],
} as unknown as ErpProduct;

describe('resolveSupplierSkuCost', () => {
  it('白板成本取色档价', () => {
    expect(resolveSupplierSkuCost(product, quote, 'sku_black_m', 0)).toEqual({ blank: 3.5, print: null, craftName: null, unit: 3.5 });
    expect(resolveSupplierSkuCost(product, quote, 'sku_grey_m', 0).unit).toBe(4);
  });

  it('带设计成本 = 色档空白价 + 色档 face_N', () => {
    expect(resolveSupplierSkuCost(product, quote, 'sku_black_m', 1)).toEqual({ blank: 3.5, print: 0.5, craftName: '白墨烫画', unit: 4 });
    expect(resolveSupplierSkuCost(product, quote, 'sku_grey_m', 2).unit).toBe(5.3);
  });

  it('色档没有明细时回落档位级 face_N', () => {
    const noColorCraft: ErpSupplierQuote = {
      ...quote,
      crafts: [{ id: 'c', name: 'DTF', costByTier: { tier_1: { face_1: 0.9 } } }],
    };
    expect(resolveSupplierSkuCost(product, noColorCraft, 'sku_black_m', 1).unit).toBe(4.4);
  });

  it('报价覆盖不到（尺码不在档位 / 面数没报价 / SKU 不存在）返回 null unit', () => {
    expect(resolveSupplierSkuCost(product, quote, 'sku_grey_5xl', 0).unit).toBeNull();
    expect(resolveSupplierSkuCost(product, quote, 'sku_black_m', 3).unit).toBeNull();
    expect(resolveSupplierSkuCost(product, quote, 'nope', 0).unit).toBeNull();
  });

  it('不分色档时用档位整档价', () => {
    const flat: ErpSupplierQuote = {
      ...quote,
      sizeTiers: [{ id: 'tier_1', code: 'S~3XL', memberSizes: ['M'], price: 4.2, colorTiers: [] }],
    };
    expect(resolveSupplierSkuCost(product, flat, 'sku_black_m', 0).unit).toBe(4.2);
  });
});
