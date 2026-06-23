import { describe, expect, it } from 'vitest';

import type { ErpSku } from '@/lib/types';
import {
  calculateEarnings,
  calculateProfitRange,
  calculateVariantProfit,
  formatPercentRange,
  formatPrice,
  formatPriceRange,
  getEffectivePrice,
  getSkuCost,
  markupPrice,
} from '@/lib/utils';

const sku = (id: string, price?: number | null) => ({ id, price } as ErpSku);

describe('pricing utilities', () => {
  describe('getSkuCost', () => {
    it('uses the sku price when present', () => {
      expect(getSkuCost(sku('s1', 4.5))).toBe(4.5);
    });

    it('falls back to DEFAULT_COST when price is undefined or null', () => {
      expect(getSkuCost(sku('s1'))).toBe(10);
      expect(getSkuCost(sku('s1', null))).toBe(10);
    });

    it('falls back to DEFAULT_COST when price is 0', () => {
      expect(getSkuCost(sku('s1', 0))).toBe(10);
    });
  });

  describe('getEffectivePrice', () => {
    it('uses a non-empty variant override', () => {
      expect(getEffectivePrice('s1', { s1: '12.5' }, 25)).toBe(12.5);
    });

    it('uses the product price when the override is empty or missing', () => {
      expect(getEffectivePrice('s1', { s1: '' }, 25)).toBe(25);
      expect(getEffectivePrice('s1', {}, 25)).toBe(25);
    });

    it('returns 0 for non-numeric overrides', () => {
      expect(getEffectivePrice('s1', { s1: 'abc' }, 25)).toBe(0);
    });
  });

  describe('calculateVariantProfit', () => {
    it('subtracts cost from sale price', () => {
      expect(calculateVariantProfit(20, 8)).toBe(12);
      expect(calculateVariantProfit(5, 8)).toBe(-3);
    });
  });

  describe('markupPrice', () => {
    it('applies percentage markup to cost', () => {
      expect(markupPrice(8.98, 100)).toBeCloseTo(17.96);
      expect(markupPrice(10, 0)).toBe(10);
      expect(markupPrice(10, 50)).toBe(15);
      expect(markupPrice(10, -100)).toBe(0);
    });
  });

  describe('calculateEarnings', () => {
    it('multiplies per-unit profit by quantity', () => {
      expect(calculateEarnings(20, 8, 3)).toBe(36);
      expect(calculateEarnings(20, 8, 0)).toBe(0);
    });
  });

  describe('calculateProfitRange', () => {
    it('returns a zero uniform range when no skus are enabled', () => {
      expect(calculateProfitRange([sku('s1', 4)], new Set(), {}, 20)).toEqual({
        min: 0,
        max: 0,
        minMargin: 0,
        maxMargin: 0,
        costMin: 0,
        costMax: 0,
        uniform: true,
      });
    });

    it('returns a uniform range for skus with the same cost and no overrides', () => {
      expect(calculateProfitRange(
        [sku('s1', 4), sku('s2', 4)],
        new Set(['s1', 's2']),
        {},
        20,
      )).toEqual({
        min: 16,
        max: 16,
        minMargin: 80,
        maxMargin: 80,
        costMin: 4,
        costMax: 4,
        uniform: true,
      });
    });

    it('returns a non-uniform range for skus with different costs', () => {
      expect(calculateProfitRange(
        [sku('s1', 4), sku('s2', 10)],
        new Set(['s1', 's2']),
        {},
        20,
      )).toMatchObject({
        min: 10,
        max: 16,
        costMin: 4,
        costMax: 10,
        uniform: false,
      });
    });

    it('respects per-variant price overrides', () => {
      expect(calculateProfitRange(
        [sku('s1', 4), sku('s2', 10)],
        new Set(['s1', 's2']),
        { s1: '9' },
        20,
      )).toMatchObject({
        min: 5,
        max: 10,
        minMargin: 25,
        maxMargin: 50,
        costMin: 4,
        costMax: 10,
        uniform: false,
      });
    });

    it('guards margins when product price is 0', () => {
      expect(calculateProfitRange(
        [sku('s1', 4), sku('s2', 10)],
        new Set(['s1', 's2']),
        {},
        0,
      )).toMatchObject({
        minMargin: 0,
        maxMargin: 0,
      });
    });

    it('only includes enabled skus in the range', () => {
      expect(calculateProfitRange(
        [sku('s1', 4), sku('s2', 100)],
        new Set(['s1']),
        {},
        20,
      )).toMatchObject({
        min: 16,
        max: 16,
        costMin: 4,
        costMax: 4,
        uniform: true,
      });
    });
  });

  describe('formatPrice', () => {
    it('formats USD prices with the requested decimal places', () => {
      expect(formatPrice(12.5)).toBe('$12.50');
      expect(formatPrice(12.5, 0)).toBe('$13');
    });
  });

  describe('formatPriceRange', () => {
    it('formats close prices as a single price', () => {
      expect(formatPriceRange(12.5, 12.5)).toBe('$12.50');
    });

    it('formats different prices as an en dash range', () => {
      expect(formatPriceRange(10, 20)).toBe('$10.00 – $20.00');
    });
  });

  describe('formatPercentRange', () => {
    it('formats close percents as a single percent', () => {
      expect(formatPercentRange(80, 80)).toBe('80.0%');
    });

    it('formats different percents as an en dash range', () => {
      expect(formatPercentRange(10, 20)).toBe('10.0% – 20.0%');
    });
  });
});
