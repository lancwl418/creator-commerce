import { describe, expect, it } from 'vitest';
import type { ProductData, ProductDraftInput } from '@/lib/types/product';
import { buildProductDraftUpdate } from './productDraft';

const product: ProductData = {
  id: 'p1', title: 'Original', description: '', status: 'draft', cost: 5,
  retail_price: 20, selected_skus: [], design_id: 'd1', design_version_id: 'v1',
  product_template_id: 'erp-1', base_price_suggestion: null, shipping_cost: 0,
  tags: [], variant_preview_urls: null, created_at: '2026-01-01',
  product_images: [
    { id: 'image1', url: 'a.png', rawPath: 'a.png', isMain: true },
    { id: 'image2', url: 'b.png', rawPath: 'b.png', isMain: false },
  ],
};

function draft(): ProductDraftInput {
  return {
    erpSkus: ['sku1', 'sku2'].map((id) => ({
      id, sku: id, price: 5, option1: 'White', option2: 'M', option3: null, inQty: 10, skuImage: null,
    })),
    enabledSkuIds: new Set(['sku1']), variantPrices: { sku1: '30.00' },
    optionNames: ['Color', 'Size'], title: ' Updated ', description: ' Description ',
    tags: ['tag'], selectedImageIds: new Set(['image2']), retailPrice: 20, shippingCost: 3, costMin: 5,
  };
}

describe('product draft 保存契约', () => {
  it('成本缺失时不覆盖已有成本，保留供应商提供的零成本', () => {
    const input = draft();
    input.costMin = null;
    input.erpSkus[0].price = 0;
    const result = buildProductDraftUpdate(product, input);
    expect(result).not.toHaveProperty('cost');
    expect(result.selected_skus[0].erpPrice).toBe(0);
  });
  it('保留禁用 SKU 和单独报价，只保存选中的图片；不修改原数据', () => {
    const result = buildProductDraftUpdate(product, draft());
    expect(result.selected_skus).toMatchObject([
      { sku_id: 'sku1', enabled: true, price: 30, erpPrice: 5 },
      { sku_id: 'sku2', enabled: false, price: null, erpPrice: 5 },
    ]);
    expect(result.product_images).toEqual([product.product_images[1]]);
    expect(result).toMatchObject({ title: 'Updated', description: 'Description', shipping_cost: 3, status: 'ready' });
    expect(product.status).toBe('draft');
    expect(product.product_images).toHaveLength(2);
  });

  it('保存已发布产品时保留其发布状态，空标题保留原产品名', () => {
    const input = { ...draft(), title: ' ' };
    expect(buildProductDraftUpdate({ ...product, status: 'listed' }, input)).toMatchObject({ title: 'Original', status: 'listed' });
  });

  it.each([0, -1, NaN, Infinity])('无效价格不能保存：%s', (retailPrice) => {
    expect(() => buildProductDraftUpdate(product, { ...draft(), retailPrice })).toThrow('valid price');
  });

  it('没有选中的 variant 时阻止保存', () => {
    expect(() => buildProductDraftUpdate(product, { ...draft(), enabledSkuIds: new Set() })).toThrow('at least one variant');
  });
});
