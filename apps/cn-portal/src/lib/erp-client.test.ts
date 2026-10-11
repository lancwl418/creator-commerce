import { afterEach, describe, expect, it, vi } from 'vitest';
import { createCustomer, erpConfigFromEnv, erpSign, fetchCustomerLevels, fetchProducts, findProductById } from '@creator-commerce/shared/erp';

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

  it('详情按 id 直接查单品接口，只请求一次', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ success: true, result: { id: 'p101', delFlag: 0 } }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await findProductById(config, 'p101')).toEqual({ id: 'p101', delFlag: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.pathname).toBe('/ideamax/openapi/call/rcdCIqkQ');
    expect(url.searchParams.get('id')).toBe('p101');
  });

  it('不存在或已逻辑删除的产品返回 null', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ success: false, code: 500, message: '未找到对应商品数据' })));
    expect(await findProductById(config, 'missing')).toBeNull();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ success: true, result: { id: 'p1', delFlag: 1 } })));
    expect(await findProductById(config, 'p1')).toBeNull();
  });

  it('详情接口的其他失败不能当成产品不存在', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ success: false, code: 500, message: 'Permission denied' })));
    await expect(findProductById(config, 'p1')).rejects.toThrow('Permission denied');
  });

  it('客户等级列表按签名 GET 读取', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ success: true, result: { records: [{ id: 'l1', levelId: null, levelName: '中国商家' }] } }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await fetchCustomerLevels(config)).toEqual([{ id: 'l1', levelId: null, levelName: '中国商家' }]);
    expect(new URL(fetchMock.mock.calls[0][0]).pathname).toBe('/ideamax/openapi/call/wfi8Vrp4');
    expect(fetchMock.mock.calls[0][1].method).toBe('GET');
  });

  it('新增客户按 JSON POST，返回 ERP 客户 id', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ success: true, result: { id: 'c1', custId: 'CU1' } }));
    vi.stubGlobal('fetch', fetchMock);
    const input = { createBy: 'cn-portal', sysOrgCode: 'A02A04', custName: 'ACME', custContact: 'A', custTel: '1', custPhone: '1', custEmail: 'a@b.c', custState: 'active' as const, custSource: 'cn-portal', status: 2, custStageId: 'l1', vipStage: '中国商家' };
    expect(await createCustomer(config, input)).toEqual({ id: 'c1', custId: 'CU1' });
    const [requestUrl, init] = fetchMock.mock.calls[0];
    expect(new URL(requestUrl).pathname).toBe('/ideamax/openapi/call/RIv0P9vK');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual(input);
  });

  it('网关层拒绝（如 appKey 未授权）时把原因带进错误信息', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(
      { status: 500, error: 'Internal Server Error', trace: 'org.jeecg.common.exception.JeecgBootException: 该appKey未授权当前接口\r\n\tat org.jeecg...' },
      { status: 500 }
    )));
    await expect(fetchCustomerLevels(config)).rejects.toThrow('ERP API returned 500: 该appKey未授权当前接口');
  });
});
