import { describe, it, expect } from 'vitest';
import {
  resolveProductTierPrice,
  type ErpProduct,
  type ErpSku,
  type ErpPricingGroup,
} from '@creator-commerce/shared/erp';
import { buildCatalog, applyFilters, type PlatformData } from './catalog';

function sku(overrides: Partial<ErpSku> & { sku: string }): ErpSku {
  return {
    id: overrides.sku,
    price: null,
    option1: null,
    option2: null,
    option3: null,
    inQty: 0,
    skuImage: null,
    ...overrides,
  };
}

// 造一个某等级的定价组：印花售价按 tierCode → face_1，可选 blankPrice
function group(
  name: string,
  face1: number,
  opts: { blankPrice?: number; colorTiered?: boolean; tierCode?: string } = {}
): ErpPricingGroup {
  const tierCode = opts.tierCode ?? 'S~2XL';
  const printPriceJson = opts.colorTiered
    ? JSON.stringify({ [tierCode]: { colorTiers: { ct_x: { code: 'White', face_1: face1 } } } })
    : JSON.stringify({ [tierCode]: { face_1: face1 } });
  return {
    name,
    mode: 'multiplier',
    multiplier: 1,
    printMode: 'multiplier',
    printMultiplier: 1,
    customerLevelId: `lvl-${name}`,
    supplierId: 'sup1',
    supplierName: 'ai定制',
    rules: [{ craftId: 'c1', craftName: 'DTF', printPriceJson }],
    pricingTiers: [
      {
        tierCode,
        memberSizes: ['S', 'M', 'L', 'XL', '2XL'],
        blankPrice: opts.blankPrice ?? 0,
        colorPrices: null,
      },
    ],
  };
}

function product(overrides: Partial<ErpProduct> & { id: string }): ErpProduct {
  return {
    itemCnName: '',
    itemEnName: 'Gildan Tee',
    title: 'Gildan Tee',
    description: '',
    vendor: '',
    productType: 'Apparel',
    status: 1,
    tags: '',
    itemNo: 'ITEM-1',
    mainPic: '',
    prodSkuList: [sku({ sku: 's1', option1: 'White', option2: 'M' })],
    prodImageList: [],
    ...overrides,
  };
}

function emptyData(): PlatformData {
  return { hiddenSkusForTier: new Set(), stock: new Map(), moq: new Map() };
}

describe('resolveProductTierPrice · 分级取价（验收 #1）', () => {
  it('按等级取对应组价格（VIP vs 批发）', () => {
    const p = product({
      id: 'p1',
      pricingGroups: [group('VIP', 8.24, { colorTiered: true }), group('批发', 9.62, { colorTiered: true })],
    });
    expect(resolveProductTierPrice(p, 'VIP')).toEqual({ min: 8.24, max: 8.24 });
    expect(resolveProductTierPrice(p, 'WHOLESALE')).toEqual({ min: 9.62, max: 9.62 });
  });

  it('售价 = 空白衣售价 + 印花 face_1', () => {
    const p = product({ id: 'p1', pricingGroups: [group('VIP', 8, { blankPrice: 2 })] });
    expect(resolveProductTierPrice(p, 'VIP')).toEqual({ min: 10, max: 10 });
  });

  it('该等级无定价组 → 缺价返回 null（验收 #5）', () => {
    const p = product({ id: 'p1', pricingGroups: [group('批发', 9.62)] });
    expect(resolveProductTierPrice(p, 'VIP')).toBeNull();
  });

  it('多组/多档取 min–max 区间', () => {
    const p = product({
      id: 'p1',
      pricingGroups: [group('VIP', 8, { tierCode: 'S~M' }), group('VIP', 12, { tierCode: 'L~XL' })],
    });
    expect(resolveProductTierPrice(p, 'VIP')).toEqual({ min: 8, max: 12 });
  });

  it('无 pricingGroups 时兜底 SKU 直接价', () => {
    const p = product({ id: 'p1', prodSkuList: [sku({ sku: 's1', price: 3.2 })] });
    expect(resolveProductTierPrice(p, 'VIP')).toEqual({ min: 3.2, max: 3.2 });
  });
});

describe('buildCatalog · 缺价过滤（验收 #5）', () => {
  it('缺价产品不显示，且进缺价清单', () => {
    const p = product({ id: 'p1', pricingGroups: [group('批发', 9.62)] });
    const res = buildCatalog([p], 'VIP', emptyData());
    expect(res.items).toHaveLength(0);
    expect(res.missingPriceProducts).toEqual([
      { productId: 'p1', itemNo: 'ITEM-1', productName: 'Gildan Tee' },
    ]);
  });
});

describe('buildCatalog · 库存过滤（验收 #3）', () => {
  const p = product({ id: 'p1', pricingGroups: [group('VIP', 5)] });

  it('库存空表 = 引导态，不过滤', () => {
    expect(buildCatalog([p], 'VIP', emptyData()).items).toHaveLength(1);
  });

  it('有快照且标记无货 → 不出现', () => {
    const data = emptyData();
    data.stock.set('s1', false);
    expect(buildCatalog([p], 'VIP', data).items).toHaveLength(0);
  });

  it('有快照且有货 → 出现', () => {
    const data = emptyData();
    data.stock.set('s1', true);
    expect(buildCatalog([p], 'VIP', data).items).toHaveLength(1);
  });
});

describe('buildCatalog · 可见性', () => {
  it('该等级隐藏所有 SKU → 产品不出现', () => {
    const p = product({ id: 'p1', pricingGroups: [group('VIP', 5)] });
    const data = emptyData();
    data.hiddenSkusForTier.add('s1');
    expect(buildCatalog([p], 'VIP', data).items).toHaveLength(0);
  });
});

describe('applyFilters', () => {
  const items = [
    { id: 'a', itemNo: '', name: 'A', imagePath: null, category: 'Tee', fromPrice: 5, maxPrice: 5, inStock: true, moqQty: null },
    { id: 'b', itemNo: '', name: 'B', imagePath: null, category: 'Hat', fromPrice: 10, maxPrice: 10, inStock: true, moqQty: null },
    { id: 'c', itemNo: '', name: 'C', imagePath: null, category: 'Tee', fromPrice: 8, maxPrice: 8, inStock: true, moqQty: null },
  ];

  it('按品类筛选', () => {
    expect(applyFilters(items, { category: 'Tee' }).map((i) => i.id)).toEqual(['a', 'c']);
  });
  it('按价格区间筛选', () => {
    expect(applyFilters(items, { priceMin: 6, priceMax: 9 }).map((i) => i.id)).toEqual(['c']);
  });
  it('价格升序', () => {
    expect(applyFilters(items, { sort: 'price_asc' }).map((i) => i.id)).toEqual(['a', 'c', 'b']);
  });
  it('价格降序', () => {
    expect(applyFilters(items, { sort: 'price_desc' }).map((i) => i.id)).toEqual(['b', 'c', 'a']);
  });
});
