import { describe, expect, it } from 'vitest';
import type { ErpProduct } from '@creator-commerce/shared/erp/types';
import { parseCsv, parseImportCsv, resolveImportGroups } from './import';

const product = {
  id: 'p1', itemEnName: 'Tee',
  options: [{ dimensionCode: 'color', dimensionName: 'Color', isColor: true, isSize: false }, { dimensionCode: 'size', dimensionName: 'Size', isColor: false, isSize: true }],
  prodSkuList: [{ id: 'id-W-M', sku: 'W-M', price: null, option1: 'White', option2: 'M', option3: null, inQty: 0, skuImage: null }],
  suppliers: [{ id: 'q1', sizeTiers: [{ code: 'M', memberSizes: ['M'], colorTiers: [{ id: 'ct_w', code: 'White', memberColors: ['White'] }] }] }],
  pricingGroups: [{ name: 'VIP', mode: 'multiplier', multiplier: 1, printMode: 'multiplier', printMultiplier: 1, customerLevelId: 'l', supplierId: 's', supplierName: 'A', supplierQuoteId: 'q1',
    pricingTiers: [{ tierCode: 'M', memberSizes: ['M'], blankPrice: 4, colorPrices: { ct_w: 4 } }],
    rules: [{ craftId: 'c', craftName: 'DTF', printPriceJson: JSON.stringify({ M: { colorTiers: { ct_w: { face_1: 1 } } } }) }] }],
} as unknown as ErpProduct;
const context = {
  tier: 'VIP' as const,
  skuIndex: new Map([['W-M', { product, sku: product.prodSkuList[0] }]]),
  platformData: { hiddenSkusForTier: new Set<string>(), stock: new Map(), moq: new Map() },
  defaultAddress: { name: '默认', phone: '1', country: 'US', province: '', city: 'LA', address1: '1 St', address2: '', zip: '90001' },
};

describe('表格下单', () => {
  it('CSV 解析支持引号内逗号、换行、BOM 和 CRLF', () => {
    expect(parseCsv('﻿a,b\r\n"x, y","line1\nline2"\r\n')).toEqual([['a', 'b'], ['x, y', 'line1\nline2']]);
  });

  it('表头接受中英文别名；缺 sku / 数量列时报错', () => {
    const parsed = parseImportCsv('单号,SKU,数量\nA,w-m,3\n');
    expect(parsed.ok && parsed.lines).toEqual([{ line: 2, values: { order_ref: 'A', sku: 'w-m', quantity: '3' } }]);
    expect(parseImportCsv('sku\nw-m\n')).toEqual({ ok: false, error: 'missingColumns', missing: ['quantity'] });
    expect(parseImportCsv('sku,quantity\n')).toEqual({ ok: false, error: 'empty' });
  });

  it('按单号分组定价；同 SKU 累加；没地址的组用默认地址；错误按组记录', () => {
    const parsed = parseImportCsv('order_ref,sku,quantity,name,phone,country,city,address1,zip\nA,w-m,2,张三,1,US,LA,1 St,90001\nA,W-M,3,,,,,,\nB,w-m,1,,,,,,\nC,nope,1,,,,,,\nD,w-m,x,李四,1,US,LA,,\n');
    expect(parsed.ok).toBe(true);
    const groups = resolveImportGroups(parsed.ok ? parsed.lines : [], context);
    expect(groups.map((g) => [g.ref, g.items.map((i) => [i.sku, i.quantity, i.unit_cost]), g.address?.name, g.errors.length])).toEqual([
      ['A', [['W-M', 5, 4]], '张三', 0],
      ['B', [['W-M', 1, 4]], '默认', 0],
      ['C', [], '默认', 1],
      ['D', [], undefined, 2],
    ]);
  });
});
