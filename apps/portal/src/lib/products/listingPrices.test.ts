import { describe, expect, it } from 'vitest';
import type { SkuSelection } from '@/lib/types/product';
import { validateListingPrices } from './listingPrices';

const sku: SkuSelection = { sku_id: 's1', sku: 'S1', option1: null, option2: null, option3: null, enabled: true };

describe('publishing prices', () => {
  it('rejects missing costs instead of recording a fabricated snapshot', () => {
    expect(() => validateListingPrices([sku], 20)).toThrow('Cost is missing');
  });
  it('allows a supplied zero cost and a per-variant sale price', () => {
    expect(() => validateListingPrices([{ ...sku, erpPrice: 0, price: 20 }], null)).not.toThrow();
  });
  it.each([null, 0, -1, NaN, Infinity])('rejects invalid sale prices: %s', price => {
    expect(() => validateListingPrices([{ ...sku, erpPrice: 5 }], price)).toThrow('valid sale price');
  });
});
