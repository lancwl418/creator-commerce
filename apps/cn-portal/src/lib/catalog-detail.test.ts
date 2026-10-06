import { describe, expect, it } from 'vitest';
import type { ErpProduct } from '@creator-commerce/shared/erp/types';
import type { TierPriceRow } from '@creator-commerce/shared/erp/pricing';
import { buildPriceTableView, buildProductDetailView } from './catalog-detail';
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

const options = [
  { dimensionCode: 'color', dimensionName: 'Color', isColor: true, isSize: false },
  { dimensionCode: 'size', dimensionName: 'Size', isColor: false, isSize: true },
];

describe('详情页属性表', () => {
  it('每个变体维度一行，值只取可上架 SKU 且去重', () => {
    const view = buildProductDetailView(product({ options }), item, data, 'VIP');
    expect(view.attributes).toEqual([
      { label: 'Color', value: 'Black' },
      { label: 'Size', value: 'M, L' },
    ]);
  });

  it('主档 option 名称为空或顺序相反时，仍按 options[] 标注', () => {
    const view = buildProductDetailView(product({ options, option1: 'Size', option2: 'Color' }), item, data, 'VIP');
    expect(view.attributes.map((a) => a.label)).toEqual(['Color', 'Size']);
  });

  it('没有值的维度不显示', () => {
    expect(buildProductDetailView(product({ option3: 'Material' }), item, data, 'VIP').attributes).toEqual([]);
  });
});

describe('价格明细表', () => {
  const rows: TierPriceRow[] = [
    { sizeTier: 'S~M', sizes: ['S', 'M'], colorTier: 'Light', colors: ['White', 'Grey'], blankPrice: 5,
      prints: [{ craftName: 'DTF', faces: [{ faces: 2, price: 1.5 }, { faces: 1, price: 1 }] }, { craftName: 'UV', faces: [{ faces: 1, price: 4 }] }] },
    { sizeTier: '4XL', sizes: [], colorTier: null, colors: [], blankPrice: null,
      prints: [{ craftName: 'DTF', faces: [{ faces: 1, price: 3 }] }] },
  ];

  it('列按工艺分组、面数升序；缺少的工艺或面数留空', () => {
    expect(buildPriceTableView(rows)).toEqual({
      showBlankPrice: true,
      columns: [{ craftName: 'DTF', faces: 1 }, { craftName: 'DTF', faces: 2 }, { craftName: 'UV', faces: 1 }],
      rows: [
        { sizes: 'S / M', colors: 'White / Grey', blankPrice: 5, printPrices: [1, 1.5, 4] },
        { sizes: '4XL', colors: null, blankPrice: null, printPrices: [3, null, null] },
      ],
    });
  });

  it('所有档位都没有空白衣售价（未报价或为 0）时不显示该列', () => {
    expect(buildPriceTableView(rows.map((row) => ({ ...row, blankPrice: 0 }))).showBlankPrice).toBe(false);
  });
});
