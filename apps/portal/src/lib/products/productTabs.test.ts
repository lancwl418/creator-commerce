import { describe, it, expect } from 'vitest';
import { resolveProductTab, productMatchesTab, countProductsByTab } from './productTabs';

describe('resolveProductTab', () => {
  it('returns a known tab as-is', () => {
    expect(resolveProductTab('unpublished')).toBe('unpublished');
    expect(resolveProductTab('published')).toBe('published');
  });

  it('defaults unknown/empty values to mockup', () => {
    expect(resolveProductTab('bogus')).toBe('mockup');
    expect(resolveProductTab(undefined)).toBe('mockup');
    expect(resolveProductTab(null)).toBe('mockup');
  });
});

describe('productMatchesTab', () => {
  it('maps statuses to their tab', () => {
    expect(productMatchesTab('draft', 'mockup')).toBe(true);
    expect(productMatchesTab('ready', 'unpublished')).toBe(true);
    expect(productMatchesTab('paused', 'unpublished')).toBe(true);
    expect(productMatchesTab('listed', 'published')).toBe(true);
    expect(productMatchesTab('published', 'published')).toBe(true);
  });

  it('returns false when status belongs to another tab', () => {
    expect(productMatchesTab('draft', 'published')).toBe(false);
    expect(productMatchesTab('listed', 'mockup')).toBe(false);
  });
});

describe('countProductsByTab', () => {
  it('counts products per tab by status', () => {
    expect(countProductsByTab([
      { status: 'draft' },
      { status: 'ready' },
      { status: 'paused' },
      { status: 'listed' },
      { status: 'published' },
    ])).toEqual({ mockup: 1, unpublished: 2, published: 2 });
  });

  it('returns zeroes for an empty list', () => {
    expect(countProductsByTab([])).toEqual({ mockup: 0, unpublished: 0, published: 0 });
  });
});
