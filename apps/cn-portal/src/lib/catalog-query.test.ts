import { describe, expect, it } from 'vitest';
import { catalogUrl, parseCatalogQuery } from './catalog-query';

describe('目录 URL 参数', () => {
  it.each(['NaN', 'Infinity', '-2', '1.5', '0', '9007199254740992'])('非法页码回到第一页：%s', (page) => {
    expect(parseCatalogQuery({ page }).page).toBe(1);
  });

  it('校验价格和排序，处理重复参数', () => {
    expect(parseCatalogQuery({ page: ['2', '3'], priceMin: '-1', priceMax: 'Infinity', sort: 'invalid' })).toMatchObject({ page: 2, priceMin: null, priceMax: null, sort: 'newest' });
    expect(parseCatalogQuery({ priceMin: '1.25', priceMax: '20', sort: 'price_desc' })).toMatchObject({ priceMin: 1.25, priceMax: 20, sort: 'price_desc' });
  });

  it('分页保留筛选，筛选变动可清除页码，真实 all 值不误删', () => {
    const params = new URLSearchParams('category=Hat&priceMin=5&page=2');
    expect(catalogUrl(params, { page: '3' })).toBe('/products?category=Hat&priceMin=5&page=3');
    expect(catalogUrl(params, { category: 'all', page: null })).toBe('/products?priceMin=5');
    expect(catalogUrl(new URLSearchParams(), { sort: 'all' })).toBe('/products?sort=all');
    expect(catalogUrl(new URLSearchParams(), {})).toBe('/products');
    expect(params.get('page')).toBe('2');
  });
});
