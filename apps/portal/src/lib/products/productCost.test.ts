import { describe, expect, it } from 'vitest';
import { readProductCost } from '@creator-commerce/shared';

describe('host/editor cost contract', () => {
  it.each([null, undefined, '', ' ', false, {}, 'invalid', '-5', Infinity, NaN])('does not manufacture a cost for %s', value => {
    expect(readProductCost(value)).toBeUndefined();
  });
  it.each([0, '0', '0.00'])('preserves zero supplied by either application: %s', value => {
    expect(readProductCost(value)).toBe(0);
  });
  it('normalizes a valid numeric cost', () => {
    expect(readProductCost('8.50')).toBe(8.5);
  });
});
