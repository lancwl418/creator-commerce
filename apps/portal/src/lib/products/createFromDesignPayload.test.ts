import { describe, expect, it } from 'vitest';

import {
  buildProductTitle,
  cleanDescriptionHtml,
  deriveArtworkUrls,
  pickPreviewUrls,
  suggestBasePrice,
  type DesignPayloadProduct,
} from './createFromDesignPayload';

const product = (value: Partial<DesignPayloadProduct>) => value as DesignPayloadProduct;

describe('design payload product helpers', () => {
  describe('buildProductTitle', () => {
    it('uses just the product name for single-product imports', () => {
      expect(buildProductTitle('Tee', 'Summer', 1)).toBe('Tee');
    });

    it('prefixes the product name for multi-product imports', () => {
      expect(buildProductTitle('Tee', 'Summer', 2)).toBe('Summer — Tee');
    });

    it('falls back to Untitled Product when the name is missing', () => {
      expect(buildProductTitle(undefined, 'Summer', 1)).toBe('Untitled Product');
    });

    it('falls back to Design and Untitled Product when prefix and name are missing', () => {
      expect(buildProductTitle(undefined, undefined, 2)).toBe('Design — Untitled Product');
    });

    it('falls back to Design when only the prefix is missing', () => {
      expect(buildProductTitle('Tee', undefined, 3)).toBe('Design — Tee');
    });
  });

  describe('cleanDescriptionHtml', () => {
    it('strips HTML tags and trims the result', () => {
      expect(cleanDescriptionHtml('<p>Hi <b>there</b></p>')).toBe('Hi there');
    });

    it('trims plain text', () => {
      expect(cleanDescriptionHtml('  plain  ')).toBe('plain');
    });

    it('returns an empty string for missing input', () => {
      expect(cleanDescriptionHtml(undefined)).toBe('');
    });

    it('does not insert spaces between stripped tags', () => {
      expect(cleanDescriptionHtml('<div>a</div><div>b</div>')).toBe('ab');
    });
  });

  describe('deriveArtworkUrls', () => {
    it('prefers explicit artwork urls', () => {
      expect(deriveArtworkUrls(product({ artwork_urls: ['a', 'b'] }))).toEqual(['a', 'b']);
    });

    it('derives urls from image layers when artwork urls are empty', () => {
      expect(deriveArtworkUrls(product({
        artwork_urls: [],
        layers: [
          { type: 'image', data: { src: 'x' } },
          { type: 'text' },
        ],
      }))).toEqual(['x']);
    });

    it('ignores image layers without a data src', () => {
      expect(deriveArtworkUrls(product({
        layers: [
          { type: 'image', data: { src: 'x' } },
          { type: 'image', data: {} },
        ],
      }))).toEqual(['x']);
    });

    it('returns an empty array when no artwork can be derived', () => {
      expect(deriveArtworkUrls(product({}))).toEqual([]);
    });

    it('uses artwork urls over image layers when both exist', () => {
      expect(deriveArtworkUrls(product({
        artwork_urls: ['a'],
        layers: [{ type: 'image', data: { src: 'x' } }],
      }))).toEqual(['a']);
    });
  });

  describe('pickPreviewUrls', () => {
    it('uses the thumbnail first', () => {
      expect(pickPreviewUrls('t', 'f', ['s'])).toEqual(['t']);
    });

    it('uses the artwork fallback when there is no thumbnail', () => {
      expect(pickPreviewUrls(null, 'f', ['s'])).toEqual(['f']);
    });

    it('uses the first stored artwork when no earlier fallback exists', () => {
      expect(pickPreviewUrls(null, null, ['s1', 's2'])).toEqual(['s1']);
    });

    it('returns an empty array when no preview source exists', () => {
      expect(pickPreviewUrls(null, null, [])).toEqual([]);
    });
  });

  describe('suggestBasePrice', () => {
    it('multiplies the base cost by 2.5', () => {
      expect(suggestBasePrice(4)).toBe(10);
      expect(suggestBasePrice(10)).toBe(25);
    });

    it('returns null when base cost is 0 or missing', () => {
      expect(suggestBasePrice(0)).toBeNull();
      expect(suggestBasePrice(undefined)).toBeNull();
    });
  });
});
