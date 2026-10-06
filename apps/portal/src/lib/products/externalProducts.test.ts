import { describe, expect, it } from 'vitest';
import type { ErpProduct } from '@/lib/types/catalog';
import { buildExternalProductMeta, getDesignArtworkUrl, toErpTemplate, toShopifyTemplate } from './externalProducts';
import { getPriceRange, getProductImages } from '@/lib/catalog/product';

const product = (prices: (number | null)[]): ErpProduct => ({
  id: '1', itemCnName: '中文', itemEnName: 'Shirt', title: '', description: '', vendor: '', productType: '',
  status: 1, tags: '', itemNo: 'A1', mainPic: 'main.png', prodImageList: [],
  prodSkuList: prices.map((price, index) => ({ id: String(index), sku: '', price, option1: null, option2: null, option3: null, inQty: 1, skuImage: null })),
});

describe('template prices and artwork', () => {
  it('keeps missing costs unknown and does not transmit an invented editor cost', () => {
    const erp = toErpTemplate(product([null]));
    const shopify = toShopifyTemplate({ id: 1, title: 'Shirt' });
    expect(erp.base_cost).toBeNull();
    expect(shopify.base_cost).toBeNull();
    expect(buildExternalProductMeta([erp, shopify]).every(meta => !('base_cost' in meta))).toBe(true);
  });
  it('preserves supplied zero and selects the lowest valid SKU price', () => {
    expect(toErpTemplate(product([null, 6, 0])).base_cost).toBe(0);
    expect(toShopifyTemplate({ id: 1, title: '', variants: [{ price: '0' }] }).base_cost).toBe(0);
  });
  it('does not treat invalid prices as costs', () => {
    expect(getPriceRange(product([null, NaN, -2]))).toBeNull();
    expect(toShopifyTemplate({ id: 1, title: '', variants: [{ price: 'bad' }] }).base_cost).toBeNull();
  });
  it('sorts and deduplicates gallery images without mutating ERP data', () => {
    const input = { ...product([]), prodImageList: [{ picSrc: 'b.png', isMain: 0, position: 2 }, { picSrc: 'main.png', isMain: 1, position: 1 }] };
    const original = [...input.prodImageList];
    expect(getProductImages(input)).toEqual(['/api/erp/image?path=main.png', '/api/erp/image?path=b.png']);
    expect(input.prodImageList).toEqual(original);
  });
  it('uses the latest artwork without sorting a designs prop in place', () => {
    const versions = [1, 2].map(version_number => ({ id: String(version_number), version_number, design_assets: [{ id: 'a', asset_type: 'artwork', file_url: `v${version_number}.png` }] }));
    expect(getDesignArtworkUrl({ id: 'd', title: '', current_version_id: '2', design_versions: versions })).toBe('v2.png');
    expect(versions.map(version => version.version_number)).toEqual([1, 2]);
  });
});
