import crypto from 'node:crypto';
import type {
  ErpCustomerCreateInput,
  ErpCustomerCreateResult,
  ErpCustomerLevel,
  ErpProduct,
  ErpProductPage,
} from './types';

// ── ERP 网关配置 ──
// 与现有 apps/portal 保持一致：openapi/call/{code} + appkey + md5 签名。
// 所有环境都从环境变量读取；源码不提供凭据或部署地址兜底。
export interface ErpConfig {
  baseUrl: string;
  appKey: string;
  secretKey: string;
}

type ErpEnv = Record<string, string | undefined>;

function requiredEnv(env: ErpEnv, name: string): string {
  const value = env[name]?.trim();
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export function erpBaseUrlFromEnv(env: ErpEnv = process.env): string {
  const url = new URL(requiredEnv(env, 'ERP_API_BASE_URL'));
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('ERP_API_BASE_URL must be an HTTP(S) URL without credentials');
  }
  url.search = '';
  url.hash = '';
  return url.toString().replace(/\/$/, '');
}

export function erpConfigFromEnv(env: ErpEnv = process.env): ErpConfig {
  return {
    baseUrl: erpBaseUrlFromEnv(env),
    appKey: requiredEnv(env, 'ERP_APP_KEY'),
    secretKey: requiredEnv(env, 'ERP_SECRET_KEY'),
  };
}

/** 计算 ERP 网关签名：md5(appKey + secretKey + timestamp) */
export function erpSign(cfg: ErpConfig, timestamp: string): string {
  return crypto
    .createHash('md5')
    .update(cfg.appKey + cfg.secretKey + timestamp)
    .digest('hex');
}

/** 已知接口 code：产品分页列表（每条含 prodSkuList / prodImageList / pricingGroups） */
const PRODUCTS_ENDPOINT_CODE = 'K5iOWd6y';
/** 已知接口 code：按 id 查单个产品详情，返回结构与列表中的单条记录一致 */
const PRODUCT_DETAIL_ENDPOINT_CODE = 'rcdCIqkQ';
// ERP 对「产品不存在」返回 HTTP 200 + success=false，只能靠 message 区分（接口文档错误码表）。
const PRODUCT_NOT_FOUND_MESSAGE = '未找到对应商品数据';
/** 已知接口 code：客户等级分页列表 */
const CUSTOMER_LEVELS_ENDPOINT_CODE = 'wfi8Vrp4';
/** 已知接口 code：新增客户（需要 ERP 给 appKey 授权） */
const CUSTOMER_CREATE_ENDPOINT_CODE = 'RIv0P9vK';

export interface ErpEnvelope<T> {
  success: boolean;
  result?: T;
  message?: string;
}

export class ErpApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'ErpApiError';
  }
}

// 签名头每次请求都不同，Next 的 fetch 缓存按请求头生成 key，永远不会命中；
// 需要缓存的调用方在自己的数据层缓存结果。
async function erpRequest<T>(
  cfg: ErpConfig,
  code: string,
  params: Record<string, string>,
  body?: unknown
): Promise<ErpEnvelope<T>> {
  const timestamp = String(Date.now());
  const url = new URL(`${cfg.baseUrl}/openapi/call/${code}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString(), {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      'Content-Type': 'application/json',
      appkey: cfg.appKey,
      signature: erpSign(cfg, timestamp),
      timestamp,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!res.ok) {
    throw new ErpApiError(await describeHttpFailure(res), res.status);
  }
  return (await res.json()) as ErpEnvelope<T>;
}

/** 网关层错误（如 appKey 未授权）以 HTTP 500 + 异常信息返回，把原因带进错误里便于排查。 */
async function describeHttpFailure(res: Response): Promise<string> {
  const fallback = `ERP API returned ${res.status}`;
  try {
    const body = (await res.json()) as { message?: unknown; trace?: unknown };
    const trace = typeof body.trace === 'string' ? body.trace.split('\n')[0].replace(/^[\w.$]+Exception:\s*/, '') : '';
    const message = typeof body.message === 'string' && body.message ? body.message : trace;
    return message ? `${fallback}: ${message.trim()}` : fallback;
  } catch {
    return fallback;
  }
}

async function erpGet<T>(
  cfg: ErpConfig,
  code: string,
  params: Record<string, string>
): Promise<ErpEnvelope<T>> {
  return requireResult(await erpRequest<T>(cfg, code, params));
}

async function erpPost<T>(cfg: ErpConfig, code: string, body: unknown): Promise<ErpEnvelope<T>> {
  return requireResult(await erpRequest<T>(cfg, code, {}, body));
}

function requireResult<T>(data: ErpEnvelope<T>): ErpEnvelope<T> {
  if (!data.success || !data.result) {
    throw new ErpApiError(data.message || 'ERP API returned no data', 502);
  }
  return data;
}

export interface RawProductPage {
  records?: ErpProduct[];
  list?: ErpProduct[];
  total?: number;
  pages?: number;
  current?: number;
}

/** 保留 ERP 原始响应结构，供各 app 的兼容路由使用。 */
export async function fetchProductsEnvelope(
  cfg: ErpConfig,
  pageNo: string,
  pageSize: string
): Promise<ErpEnvelope<RawProductPage>> {
  return erpGet<RawProductPage>(cfg, PRODUCTS_ENDPOINT_CODE, { pageNo, pageSize });
}

/** 拉取产品分页列表 */
export async function fetchProducts(
  cfg: ErpConfig,
  pageNo = 1,
  pageSize = 40
): Promise<ErpProductPage> {
  const data = await fetchProductsEnvelope(cfg, String(pageNo), String(pageSize));
  const result = data.result ?? {};
  const records = result.records ?? result.list ?? [];
  const total = result.total ?? records.length;
  const pages = result.pages ?? Math.max(1, Math.ceil(total / pageSize));
  return { records, total, pages, current: result.current ?? pageNo };
}

/** 按 id 查单个产品；不存在或已被逻辑删除时返回 null。 */
export async function findProductById(
  cfg: ErpConfig,
  erpProductId: string
): Promise<ErpProduct | null> {
  const data = await erpRequest<ErpProduct>(cfg, PRODUCT_DETAIL_ENDPOINT_CODE, { id: erpProductId });
  if (data.success && data.result) {
    // 列表接口不返回已删除产品，详情接口按 id 直查，这里保持同样的可见范围。
    return Number(data.result.delFlag) === 1 ? null : data.result;
  }
  if (data.message?.includes(PRODUCT_NOT_FOUND_MESSAGE)) return null;
  throw new ErpApiError(data.message || 'ERP API returned no data', 502);
}

/** ERP 客户等级列表（零售 / 批发 / VIP / 中国商家…） */
export async function fetchCustomerLevels(cfg: ErpConfig): Promise<ErpCustomerLevel[]> {
  const data = await erpGet<{ records?: ErpCustomerLevel[] }>(cfg, CUSTOMER_LEVELS_ENDPOINT_CODE, {
    pageNo: '1',
    pageSize: '100',
  });
  return data.result?.records ?? [];
}

/** 在 ERP 创建客户档案，返回 ERP 客户 id。 */
export async function createCustomer(
  cfg: ErpConfig,
  input: ErpCustomerCreateInput
): Promise<ErpCustomerCreateResult> {
  const data = await erpPost<ErpCustomerCreateResult>(cfg, CUSTOMER_CREATE_ENDPOINT_CODE, input);
  return data.result as ErpCustomerCreateResult;
}
