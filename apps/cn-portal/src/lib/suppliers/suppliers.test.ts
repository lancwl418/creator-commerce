import { describe, expect, it } from 'vitest';
import type { ErpProduct } from '@creator-commerce/shared/erp/types';
import { collectSuppliers, displaySupplierName, getMainSupplier, parseSupplierNameForm } from './suppliers';

function product(overrides: Partial<ErpProduct>): ErpProduct {
  return { id: 'p', vendor: '', prodSkuList: [], prodImageList: [], ...overrides } as ErpProduct;
}

describe('默认供应商', () => {
  it('按 mainSupplierId 找报价上的名称，没有报价时用 vendor', () => {
    expect(getMainSupplier(product({ mainSupplierId: 's1', vendor: 'JJS', suppliers: [{ id: 'q1', supplierId: 's1', name: 'JJS 工厂' }] })))
      .toEqual({ id: 's1', originalName: 'JJS 工厂' });
    expect(getMainSupplier(product({ mainSupplierId: 's1', vendor: 'JJS', suppliers: [] })))
      .toEqual({ id: 's1', originalName: 'JJS' });
    expect(getMainSupplier(product({ mainSupplierId: null, vendor: 'JJS' }))).toBeNull();
  });

  it('显示名：自定义优先，其次原名，最后 id', () => {
    const names = new Map([['s1', '华南一厂']]);
    expect(displaySupplierName({ id: 's1', originalName: 'JJS' }, names)).toBe('华南一厂');
    expect(displaySupplierName({ id: 's2', originalName: 'ai定制' }, names)).toBe('ai定制');
    expect(displaySupplierName({ id: 's3', originalName: '' }, names)).toBe('s3');
  });

  it('汇总去重并按产品数排序', () => {
    const products = [
      product({ id: '1', mainSupplierId: 'a', vendor: 'A' }),
      product({ id: '2', mainSupplierId: 'b', vendor: 'B' }),
      product({ id: '3', mainSupplierId: 'b', vendor: 'B' }),
      product({ id: '4', mainSupplierId: null, vendor: 'X' }),
    ];
    expect(collectSuppliers(products)).toEqual([
      { id: 'b', originalName: 'B', productCount: 2 },
      { id: 'a', originalName: 'A', productCount: 1 },
    ]);
  });

  it('解析表单：只收已知供应商，空值表示清除，超长报错', () => {
    const form = new FormData();
    form.set('name:a', '  华南一厂 ');
    form.set('name:b', '');
    form.set('name:zzz', '陌生');
    expect(parseSupplierNameForm(form, ['a', 'b'])).toEqual({
      ok: true,
      inputs: [{ supplierId: 'a', displayName: '华南一厂' }, { supplierId: 'b', displayName: '' }],
    });
    form.set('name:a', 'x'.repeat(101));
    expect(parseSupplierNameForm(form, ['a', 'b'])).toEqual({ ok: false, error: 'tooLong' });
  });
});
