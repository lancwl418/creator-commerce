import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildCachedEditorUrl, getDesignEngineUrl } from './design-engine';

afterEach(() => vi.unstubAllEnvs());

describe('editor configuration', () => {
  it('encodes cache and template parameters and preserves the deployment prefix', () => {
    vi.stubEnv('NEXT_PUBLIC_DESIGN_ENGINE_URL', 'https://editor.example/design/');
    const url = new URL(buildCachedEditorUrl('erp-1,erp-2', 'key+a', 'https://portal.example'));
    expect(url.pathname).toBe('/design/embed');
    expect(url.searchParams.get('products_cache_key')).toBe('key+a');
    expect(url.searchParams.get('templates')).toBe('erp-1,erp-2');
    expect(url.searchParams.get('parent_origin')).toBe('https://portal.example');
  });
  it('uses a callback for standalone editor navigation', () => {
    vi.stubEnv('NEXT_PUBLIC_DESIGN_ENGINE_URL', 'https://editor.example');
    const url = new URL(buildCachedEditorUrl('erp-1', 'key', 'https://portal.example', false));
    expect(url.searchParams.get('callback_url')).toBe('https://portal.example/api/products/import-redirect');
    expect(url.searchParams.has('parent_origin')).toBe(false);
  });
  it('does not silently navigate production users to localhost', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_DESIGN_ENGINE_URL', '');
    expect(() => getDesignEngineUrl()).toThrow('not configured');
  });
});
