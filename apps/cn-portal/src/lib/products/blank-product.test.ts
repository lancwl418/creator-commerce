import { describe, expect, it } from 'vitest';
import type { ErpProduct, ErpSku } from '@creator-commerce/shared/erp/types';
import { buildBlankProductImages, buildBlankProductRow, buildBlankVariants, erpImagePublicUrl, parseBlankProductForm } from './blank-product';

function sku(code: string, color: string, size: string): ErpSku {
  return { id: `id-${code}`, sku: code, price: null, option1: color, option2: size, option3: null, inQty: 0, skuImage: `img/${code}.png` };
}

const product = {
  id: 'p1', itemEnName: 'Tee', description: 'desc', mainPic: 'main.png',
  prodImageList: [{ picSrc: 'main.png', isMain: 1 }, { picSrc: 'b.png', isMain: 0 }],
  options: [
    { dimensionCode: 'color', dimensionName: 'Color', isColor: true, isSize: false },
    { dimensionCode: 'size', dimensionName: 'Size', isColor: false, isSize: true },
  ],
  prodSkuList: [sku('W-S', 'White', 'S'), sku('B-S', 'Black', 'S'), sku('W-4XL', 'White', '4XL')],
  suppliers: [{ id: 'q1', sizeTiers: [
    { code: 'S~M', memberSizes: ['S', 'M'], colorTiers: [{ id: 'ct_w', code: 'White', memberColors: ['White'] }, { id: 'ct_b', code: 'Black', memberColors: ['Black'] }] },
    { code: '4XL', memberSizes: ['4XL'], colorTiers: [{ id: 'ct_w', code: 'White', memberColors: ['White'] }] },
  ] }],
  pricingGroups: [{
    name: '中国商家', mode: 'multiplier', multiplier: 1.2, printMode: 'multiplier', printMultiplier: 1.2,
    customerLevelId: 'lvl', supplierId: 's', supplierName: 'A', supplierQuoteId: 'q1',
    pricingTiers: [
      { tierCode: 'S~M', memberSizes: ['S', 'M'], blankPrice: 4, colorPrices: { ct_w: 4, ct_b: 5 } },
      { tierCode: '4XL', memberSizes: ['4XL'], blankPrice: 0, colorPrices: { ct_w: 0 } },
    ],
    rules: [{ craftId: 'c', craftName: 'DTF', printPriceJson: JSON.stringify({ 'S~M': { colorTiers: { ct_w: { face_1: 1 }, ct_b: { face_1: 1 } } }, '4XL': { colorTiers: { ct_w: { face_1: 2 } } } }) }],
  }],
} as unknown as ErpProduct;

function form(entries: Record<string, string | string[]>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    for (const v of Array.isArray(value) ? value : [value]) data.append(key, v);
  }
  return data;
}

describe('仅同步白板', () => {
  it('成本取该等级的空白件价（色档价优先）；空白件价为 0 的 variant 不能同步', () => {
    const variants = buildBlankVariants(product, 'CN_MERCHANT', product.prodSkuList);
    expect(variants.map((v) => [v.sku, v.cost])).toEqual([['W-S', 4], ['B-S', 5]]);
  });

  it('产品图去重，主图在前', () => {
    expect(buildBlankProductImages(product)).toEqual([
      { id: 'img-0', rawPath: 'main.png', isMain: true },
      { id: 'img-1', rawPath: 'b.png', isMain: false },
    ]);
  });

  it('表单：标题、正数售价、至少一个 variant；覆盖价只收合法数字', () => {
    const variants = buildBlankVariants(product, 'CN_MERCHANT', product.prodSkuList);
    const images = buildBlankProductImages(product);
    expect(parseBlankProductForm(form({ title: '', retailPrice: '10', enabledSku: 'id-W-S' }), variants, images)).toEqual({ ok: false, error: 'sync.error.titleRequired' });
    expect(parseBlankProductForm(form({ title: 'T', retailPrice: '0', enabledSku: 'id-W-S' }), variants, images)).toEqual({ ok: false, error: 'sync.error.priceInvalid' });
    expect(parseBlankProductForm(form({ title: 'T', retailPrice: '10', enabledSku: 'id-unknown' }), variants, images)).toEqual({ ok: false, error: 'sync.error.noVariants' });
    expect(parseBlankProductForm(form({ title: ' T ', retailPrice: '10', enabledSku: ['id-W-S', 'id-B-S'], 'price:id-B-S': '12.5', image: 'img-1', publishStatus: 'draft' }), variants, images)).toEqual({
      ok: true,
      input: { title: 'T', description: '', retailPrice: 10, variantPrices: { 'id-B-S': 12.5 }, enabledSkuIds: ['id-W-S', 'id-B-S'], selectedImageIds: ['img-1'], publishStatus: 'draft' },
    });
  });

  it('产品记录：erp- 模板前缀、按 SKU 字段顺序的选项名、成本为启用 variant 的最低价', () => {
    const variants = buildBlankVariants(product, 'CN_MERCHANT', product.prodSkuList);
    const images = buildBlankProductImages(product);
    const row = buildBlankProductRow('creator-1', product, variants, images, {
      title: 'T', description: 'd', retailPrice: 10, variantPrices: { 'id-B-S': 12 }, enabledSkuIds: ['id-B-S'], selectedImageIds: ['img-0'], publishStatus: 'active',
    });
    expect(row).toMatchObject({
      creator_id: 'creator-1', product_template_id: 'erp-p1', erp_product_id: 'p1', status: 'ready',
      option_names: ['Color', 'Size'], retail_price: 10, cost: 5,
      product_images: [{ id: 'img-0', rawPath: 'main.png', isMain: true, url: '/api/erp/image?path=main.png' }],
    });
    expect(row.selected_skus).toEqual([
      expect.objectContaining({ sku_id: 'id-W-S', enabled: false, erpPrice: 4, price: null }),
      expect.objectContaining({ sku_id: 'id-B-S', enabled: true, erpPrice: 5, price: 12, skuImage: 'img/B-S.png' }),
    ]);
  });

  it('图片公网地址走本站代理；无法代理的 http 地址返回空', () => {
    expect(erpImagePublicUrl('https://cn.example.com', 'temp/a.png')).toBe('https://cn.example.com/api/erp/image?path=temp%2Fa.png');
    expect(erpImagePublicUrl('https://cn.example.com', 'http://erp/ideamax/sys/common/static/temp/a.png')).toBe('https://cn.example.com/api/erp/image?path=temp%2Fa.png');
    expect(erpImagePublicUrl('https://cn.example.com', 'https://cdn.example.com/a.png')).toBe('https://cdn.example.com/a.png');
    expect(erpImagePublicUrl('https://cn.example.com', 'http://other/a.png')).toBe('');
  });
});
