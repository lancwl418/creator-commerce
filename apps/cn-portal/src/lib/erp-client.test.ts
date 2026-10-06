import { afterEach, describe, expect, it, vi } from 'vitest';
import { erpConfigFromEnv, erpSign, fetchProducts, findProductById } from '@creator-commerce/shared/erp';

const config = { baseUrl: 'https://erp.example.test/ideamax', appKey: 'test-app', secretKey: 'test-secret' };

afterEach(() => vi.unstubAllGlobals());

describe('共享 ERP client', () => {
  it('未设置环境变量时明确报错，不使用硬编码凭据', () => {
    expect(() => erpConfigFromEnv({})).toThrow('ERP_API_BASE_URL');
    expect(() => erpConfigFromEnv({ ERP_API_BASE_URL: config.baseUrl })).toThrow('ERP_APP_KEY');
    expect(() => erpConfigFromEnv({ ERP_API_BASE_URL: config.baseUrl, ERP_APP_KEY: config.appKey })).toThrow('ERP_SECRET_KEY');
  });

  it('规范化 base URL，并读取明确配置的凭据', () => {
    expect(erpConfigFromEnv({ ERP_API_BASE_URL: `${config.baseUrl}/`, ERP_APP_KEY: config.appKey, ERP_SECRET_KEY: config.secretKey })).toEqual(config);
  });

  it('使用共享签名、分页参数，兼容 ERP list 响应', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ success: true, result: { list: [{ id: 'p1' }], total: 1 } }));
    vi.stubGlobal('fetch', fetchMock);
    const page = await fetchProducts(config, 1, 40);
    expect(page.records).toEqual([{ id: 'p1' }]);
    const [requestUrl, init] = fetchMock.mock.calls[0];
    const url = new URL(requestUrl);
    expect(url.pathname).toBe('/ideamax/openapi/call/K5iOWd6y');
    expect(url.searchParams.get('pageSize')).toBe('40');
    expect(init.headers.signature).toBe(erpSign(config, init.headers.timestamp));
  });

  it('ERP HTTP 200 但 success=false 时不能返回空目录', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ success: false, message: 'Permission denied' })));
    await expect(fetchProducts(config)).rejects.toThrow('Permission denied');
  });

  it('详情可以找到第一页之外的产品', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ success: true, result: { records: [{ id: 'p1' }], total: 101, pages: 2 } }))
      .mockResolvedValueOnce(Response.json({ success: true, result: { records: [{ id: 'p101' }], total: 101, pages: 2 } }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await findProductById(config, 'p101')).toEqual({ id: 'p101' });
    expect(new URL(fetchMock.mock.calls[1][0]).searchParams.get('pageNo')).toBe('2');
  });

  it('不存在的产品在最后一页返回 null', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ success: true, result: { records: [{ id: 'p1' }], pages: 1 } }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await findProductById(config, 'missing')).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
