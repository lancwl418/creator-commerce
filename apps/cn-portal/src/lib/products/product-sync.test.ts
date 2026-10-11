import { describe, expect, it } from 'vitest';
import type { ErpProduct, ErpSku } from '@creator-commerce/shared/erp/types';
import { buildSyncVariants } from './product-sync';

function sku(code: string, color: string, size: string): ErpSku {
  return { id: `id-${code}`, sku: code, price: null, option1: color, option2: size, option3: null, inQty: 0, skuImage: null };
}

const product = {
  id: 'p1',
  options: [
    { dimensionCode: 'color', dimensionName: 'Color', isColor: true, isSize: false },
    { dimensionCode: 'size', dimensionName: 'Size', isColor: false, isSize: true },
  ],
  prodSkuList: [sku('W-S', 'White', 'S'), sku('B-S', 'Black', 'S')],
  suppliers: [{ id: 'q1', sizeTiers: [{ code: 'S~M', memberSizes: ['S', 'M'], colorTiers: [
    { id: 'ct_w', code: 'White', memberColors: ['White'] }, { id: 'ct_b', code: 'Black', memberColors: ['Black'] },
  ] }] }],
  pricingGroups: [{
    name: 'VIP', mode: 'multiplier', multiplier: 1.2, printMode: 'multiplier', printMultiplier: 1.2,
    customerLevelId: 'lvl', supplierId: 's', supplierName: 'A', supplierQuoteId: 'q1',
    pricingTiers: [{ tierCode: 'S~M', memberSizes: ['S', 'M'], blankPrice: 0, colorPrices: { ct_w: 0, ct_b: 5 } }],
    rules: [{ craftId: 'c', craftName: 'DTF', printPriceJson: JSON.stringify({ 'S~M': { colorTiers: { ct_w: { face_1: 8 }, ct_b: { face_2: 3 } } } }) }],
  }],
} as unknown as ErpProduct;

describe('同步 variant 的成本', () => {
  it('白板：只认大于 0 的空白件价', () => {
    expect(buildSyncVariants(product, 'VIP', product.prodSkuList, false).map((v) => [v.sku, v.cost])).toEqual([['B-S', 5]]);
  });

  it('带设计：空白件价 + 对应面数的印花价；没有该面数的价就不可用', () => {
    expect(buildSyncVariants(product, 'VIP', product.prodSkuList, 1).map((v) => [v.sku, v.cost])).toEqual([['W-S', 8]]);
    expect(buildSyncVariants(product, 'VIP', product.prodSkuList, 2).map((v) => [v.sku, v.cost])).toEqual([['B-S', 8]]);
  });

  it('中国商家等级没有定价组时按 VIP 兜底', () => {
    expect(buildSyncVariants(product, 'CN_MERCHANT', product.prodSkuList, 1)).toHaveLength(1);
  });
});
