import { describe, it, expect } from 'vitest';
import { resolveErpImageUrl, toPublicImageUrl } from './image';

describe('resolveErpImageUrl', () => {
  it('returns empty string for empty input', () => {
    expect(resolveErpImageUrl('')).toBe('');
  });

  it('passes through full http(s) URLs', () => {
    expect(resolveErpImageUrl('https://cdn.example.com/a.png')).toBe('https://cdn.example.com/a.png');
    expect(resolveErpImageUrl('http://cdn.example.com/a.png')).toBe('http://cdn.example.com/a.png');
  });

  it('rewrites design-engine proxy URLs to the portal format', () => {
    expect(resolveErpImageUrl('/api/erp-image?path=products%2Fx.png')).toBe(
      '/api/erp/image?path=products%2Fx.png',
    );
  });

  it('passes through already-portal /api/ URLs', () => {
    expect(resolveErpImageUrl('/api/erp/image?path=a')).toBe('/api/erp/image?path=a');
  });

  it('wraps a bare ERP path in the portal proxy and encodes it', () => {
    expect(resolveErpImageUrl('products/x.png')).toBe('/api/erp/image?path=products%2Fx.png');
  });
});

describe('toPublicImageUrl', () => {
  const app = 'https://portal.example.com';

  it('returns empty string for empty input', () => {
    expect(toPublicImageUrl('', app)).toBe('');
  });

  it('passes through https URLs unchanged', () => {
    expect(toPublicImageUrl('https://cdn.example.com/a.png', app)).toBe('https://cdn.example.com/a.png');
  });

  it('extracts the static path from an http ERP URL and re-proxies it publicly', () => {
    expect(toPublicImageUrl('http://erp.local/sys/common/static/foo/bar.png', app)).toBe(
      `${app}/api/erp/image?path=foo%2Fbar.png`,
    );
  });

  it('returns empty string for an http URL with no static segment', () => {
    expect(toPublicImageUrl('http://erp.local/other/path.png', app)).toBe('');
  });

  it('wraps a bare path through the public proxy', () => {
    expect(toPublicImageUrl('products/x.png', app)).toBe(`${app}/api/erp/image?path=products%2Fx.png`);
  });
});
