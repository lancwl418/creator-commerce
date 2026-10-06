import { afterEach, describe, expect, it, vi } from 'vitest';
import { proxyErpImage, resolveErpImageSource } from '@creator-commerce/shared/erp';

const baseUrl = 'https://erp.example.test/ideamax';
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('共享 ERP 图片代理', () => {
  it('解析 ERP 相对路径和绝对图片 URL', () => {
    const expected = `${baseUrl}/sys/common/static/products/a.png`;
    expect(resolveErpImageSource('products/a.png', baseUrl)?.href).toBe(expected);
    expect(resolveErpImageSource('/products/a.png', baseUrl)?.href).toBe(expected);
    expect(resolveErpImageSource(expected, baseUrl)?.href).toBe(expected);
  });

  it.each(['http://127.0.0.1/private', '//evil.test/a.png', '../../admin', '%2e%2e/admin', 'file:///etc/passwd', 'https://user:password@erp.example.test/ideamax/sys/common/static/a.png'])('拒绝任意来源或路径穿越：%s', (path) => {
    expect(resolveErpImageSource(path, baseUrl)).toBeNull();
  });

  it('额外图片源必须明确配置', () => {
    expect(resolveErpImageSource('https://cdn.example.test/a.png', baseUrl)).toBeNull();
    expect(resolveErpImageSource('https://cdn.example.test/a.png', baseUrl, ['https://cdn.example.test'])?.origin).toBe('https://cdn.example.test');
  });

  it('保留图片类型/缓存和 app 响应头，不跟随重定向', async () => {
    vi.stubEnv('ERP_API_BASE_URL', baseUrl);
    const fetchMock = vi.fn().mockResolvedValue(new Response('image', { headers: { 'Content-Type': 'image/webp' } }));
    vi.stubGlobal('fetch', fetchMock);
    const response = await proxyErpImage(new Request('https://portal.example.test/api/erp/image?path=a.webp%3Fversion%3D2'), { 'Access-Control-Allow-Origin': '*' });
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/webp');
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=86400');
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(fetchMock.mock.calls[0][1]).toEqual({ redirect: 'error' });
  });
});
