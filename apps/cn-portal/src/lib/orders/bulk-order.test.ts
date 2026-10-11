import { describe, expect, it } from 'vitest';
import { orderSubtotal, parseBulkOrderForm } from './bulk-order';

const variants = [
  { skuId: 'a', sku: 'A', option1: 'White', option2: 'S', option3: null, skuImage: null, cost: 4 },
  { skuId: 'b', sku: 'B', option1: 'Black', option2: 'S', option3: null, skuImage: null, cost: 5.5 },
];
const address = { 'address.name': '张三', 'address.phone': '138', 'address.country': 'US', 'address.city': 'LA', 'address.address1': '1 St', 'address.zip': '90001' };

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

describe('白板采购单', () => {
  it('只收数量 ≥ 1 的行，单价取服务端成本；小计按数量 × 单价', () => {
    const parsed = parseBulkOrderForm(form({ ...address, 'qty:a': '10', 'qty:b': '0', note: ' n ' }), variants);
    expect(parsed).toMatchObject({ ok: true, input: { note: 'n', items: [{ sku_id: 'a', quantity: 10, unit_cost: 4 }] } });
    expect(orderSubtotal([{ sku_id: 'a', sku: 'A', option1: null, option2: null, option3: null, quantity: 3, unit_cost: 5.5 }])).toBe(16.5);
  });

  it('数量不是整数、没有商品、地址缺必填项时各给对应提示并回填地址', () => {
    expect(parseBulkOrderForm(form({ ...address, 'qty:a': '1.5' }), variants)).toMatchObject({ ok: false, error: 'order.error.quantity' });
    expect(parseBulkOrderForm(form({ ...address }), variants)).toMatchObject({ ok: false, error: 'order.error.noItems' });
    expect(parseBulkOrderForm(form({ ...address, 'address.zip': '', 'qty:a': '1' }), variants)).toMatchObject({ ok: false, error: 'order.error.address', address: { name: '张三', zip: '' } });
  });
});
