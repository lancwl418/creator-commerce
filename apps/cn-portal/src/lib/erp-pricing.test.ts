import { describe, expect, it } from 'vitest';
import {
  resolveOptionDimensions,
  resolveProductTierPrice,
  resolveTierPriceTables,
  type ErpProduct,
  type ErpSku,
} from '@creator-commerce/shared/erp';

function sku(code: string, option1: string, option2: string): ErpSku {
  return { id: code, sku: code, price: null, option1, option2, option3: null, inQty: 0, skuImage: null };
}

// 卫衣：浅色、深色两个色档，空白衣售价不同；印花按色档报价，深色档没有双面价。
function sweatshirt(overrides: Partial<ErpProduct> = {}): ErpProduct {
  return {
    id: 'p1',
    options: [
      { dimensionCode: 'color', dimensionName: 'Color', isColor: true, isSize: false },
      { dimensionCode: 'size', dimensionName: 'Size', isColor: false, isSize: true },
    ],
    prodSkuList: [sku('w-s', 'White', 'S'), sku('w-m', 'White', 'M'), sku('b-s', 'Black', 'S'), sku('b-4xl', 'Black', '4XL')],
    suppliers: [{
      id: 'quote1',
      sizeTiers: [
        { code: 'S~M', memberSizes: ['S', 'M'], colorTiers: [
          { id: 'ct_light', code: 'Light', memberColors: ['White', 'Grey'] },
          { id: 'ct_dark', code: 'Dark', memberColors: ['Black'] },
        ] },
        { code: '4XL', memberSizes: ['4XL'], colorTiers: [{ id: 'ct_dark', code: 'Dark', memberColors: ['Black'] }] },
      ],
    }],
    pricingGroups: [{
      name: 'VIP', mode: 'multiplier', multiplier: 1.2, printMode: 'multiplier', printMultiplier: 1.2,
      customerLevelId: 'lvl', supplierId: 'sup1', supplierName: 'Factory A', supplierQuoteId: 'quote1',
      pricingTiers: [
        { tierCode: 'S~M', memberSizes: ['S', 'M'], blankPrice: 5, colorPrices: { ct_light: 5, ct_dark: 6 } },
        { tierCode: '4XL', memberSizes: ['4XL'], blankPrice: 8, colorPrices: null },
      ],
      rules: [{
        craftId: 'c1', craftName: 'DTF',
        printPriceJson: JSON.stringify({
          'S~M': { colorTiers: { ct_light: { code: 'Light', face_1: 1, face_2: 1.5 }, ct_dark: { code: 'Dark', face_1: 2 } } },
          '4XL': { face_1: 3, face_2: 4 },
        }),
      }],
    }],
    ...overrides,
  } as ErpProduct;
}

describe('变体维度', () => {
  it('以 options[] 的顺序为准，主档 option 名称顺序不一致时不采用', () => {
    const product = sweatshirt({
      option1: 'Color', option2: 'Size',
      options: [
        { dimensionCode: 'size', dimensionName: 'Size', isSize: true, isColor: false },
        { dimensionCode: 'color', dimensionName: 'Color', isSize: false, isColor: true },
      ],
    });
    expect(resolveOptionDimensions(product)).toEqual([
      { key: 'option1', name: 'Size', isSize: true, isColor: false },
      { key: 'option2', name: 'Color', isSize: false, isColor: true },
    ]);
  });

  it('没有 options[] 时用主档的 option 名称兜底', () => {
    expect(resolveOptionDimensions(sweatshirt({ options: null, option1: 'Color', option2: 'Size' }))).toEqual([
      { key: 'option1', name: 'Color', isSize: false, isColor: true },
      { key: 'option2', name: 'Size', isSize: true, isColor: false },
    ]);
  });
});

describe('尺码档 × 色档价格明细', () => {
  it('空白衣售价优先取色档价，印花价按色档取，各面数完整保留', () => {
    expect(resolveTierPriceTables(sweatshirt(), 'VIP')).toEqual([[
      { sizeTier: 'S~M', sizes: ['S', 'M'], colorTier: 'Light', colors: ['White'], blankPrice: 5,
        prints: [{ craftName: 'DTF', faces: [{ faces: 1, price: 1 }, { faces: 2, price: 1.5 }] }] },
      { sizeTier: 'S~M', sizes: ['S'], colorTier: 'Dark', colors: ['Black'], blankPrice: 6,
        prints: [{ craftName: 'DTF', faces: [{ faces: 1, price: 2 }] }] },
      { sizeTier: '4XL', sizes: ['4XL'], colorTier: null, colors: [], blankPrice: 8,
        prints: [{ craftName: 'DTF', faces: [{ faces: 1, price: 3 }, { faces: 2, price: 4 }] }] },
    ]]);
  });

  it('只保留传入 SKU 覆盖到的档位、尺码和颜色', () => {
    const product = sweatshirt();
    const listable = product.prodSkuList.filter((s) => s.sku === 'w-m');
    expect(resolveTierPriceTables(product, 'VIP', listable)).toEqual([[
      expect.objectContaining({ sizeTier: 'S~M', sizes: ['M'], colorTier: 'Light', colors: ['White'] }),
    ]]);
    expect(resolveTierPriceTables(product, 'VIP', [])).toEqual([]);
  });

  it('其他等级的定价组不出现在该等级的明细里', () => {
    expect(resolveTierPriceTables(sweatshirt(), 'WHOLESALE')).toEqual([]);
  });

  it('起价与明细一致：空白衣售价 + 单面印花价，取各档的最低和最高', () => {
    // Light 5+1、Dark 6+2、4XL 8+3
    expect(resolveProductTierPrice(sweatshirt(), 'VIP')).toEqual({ min: 6, max: 11 });
  });
});
