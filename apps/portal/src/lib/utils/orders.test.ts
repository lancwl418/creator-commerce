import { describe, it, expect } from 'vitest';
import { calculateOrderEarnings, calculateOrderItemCount, aggregateOrderTotals } from './orders';

describe('calculateOrderEarnings', () => {
  it('sums earnings, treating null as 0', () => {
    expect(calculateOrderEarnings([
      { earnings_amount: 5 },
      { earnings_amount: null },
      { earnings_amount: 3.5 },
    ])).toBe(8.5);
  });

  it('returns 0 for no items', () => {
    expect(calculateOrderEarnings([])).toBe(0);
  });
});

describe('calculateOrderItemCount', () => {
  it('sums quantities', () => {
    expect(calculateOrderItemCount([{ quantity: 2 }, { quantity: 3 }])).toBe(5);
  });
});

describe('aggregateOrderTotals', () => {
  it('aggregates revenue and earnings across orders, coercing string prices', () => {
    expect(aggregateOrderTotals([
      { total_price: '10', creator_order_items: [{ earnings_amount: 4 }] },
      { total_price: 20, creator_order_items: [{ earnings_amount: 6 }] },
    ])).toEqual({ totalOrders: 2, totalRevenue: 30, totalEarnings: 10 });
  });

  it('handles orders with no items and empty input', () => {
    expect(aggregateOrderTotals([{ total_price: 15 }])).toEqual({
      totalOrders: 1, totalRevenue: 15, totalEarnings: 0,
    });
    expect(aggregateOrderTotals([])).toEqual({ totalOrders: 0, totalRevenue: 0, totalEarnings: 0 });
  });
});
