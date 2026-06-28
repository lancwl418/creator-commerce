import { describe, it, expect } from 'vitest';
import { extractShopDomain } from './shopify';

describe('extractShopDomain', () => {
  it('strips https protocol and trailing slash', () => {
    expect(extractShopDomain('https://shop.myshopify.com/')).toBe('shop.myshopify.com');
  });

  it('strips http protocol', () => {
    expect(extractShopDomain('http://shop.myshopify.com')).toBe('shop.myshopify.com');
  });

  it('leaves a bare domain unchanged', () => {
    expect(extractShopDomain('shop.myshopify.com')).toBe('shop.myshopify.com');
  });

  it('returns empty string for null/undefined', () => {
    expect(extractShopDomain(null)).toBe('');
    expect(extractShopDomain(undefined)).toBe('');
  });
});
