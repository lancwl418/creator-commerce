import crypto from 'node:crypto';
import type { ErpProduct, ErpProductPage } from './types';

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

/** 已知接口 code：产品主数据（含 prodSkuList / prodImageList） */
const PRODUCTS_ENDPOINT_CODE = 'K5iOWd6y';

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

async function erpGet<T>(
  cfg: ErpConfig,
  code: string,
  params: Record<string, string>,
  init?: { revalidate?: number }
): Promise<ErpEnvelope<T>> {
  const timestamp = String(Date.now());
  const url = new URL(`${cfg.baseUrl}/openapi/call/${code}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString(), {
    headers: {
      'Content-Type': 'application/json',
      appkey: cfg.appKey,
      signature: erpSign(cfg, timestamp),
      timestamp,
    },
    // Next.js fetch 缓存；非 Next 环境忽略此字段
    ...(init?.revalidate != null ? { next: { revalidate: init.revalidate } } : {}),
  } as RequestInit);

  if (!res.ok) {
    throw new ErpApiError(`ERP API returned ${res.status}`, res.status);
  }
  const data = (await res.json()) as ErpEnvelope<T>;
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
  pageSize: string,
  init?: { revalidate?: number }
): Promise<ErpEnvelope<RawProductPage>> {
  return erpGet<RawProductPage>(
    cfg,
    PRODUCTS_ENDPOINT_CODE,
    { pageNo, pageSize },
    init
  );
}

/** 拉取产品分页列表 */
export async function fetchProducts(
  cfg: ErpConfig,
  pageNo = 1,
  pageSize = 40
): Promise<ErpProductPage> {
  const data = await fetchProductsEnvelope(
    cfg,
    String(pageNo),
    String(pageSize),
    { revalidate: 300 }
  );
  const result = data.result ?? {};
  const records = result.records ?? result.list ?? [];
  const total = result.total ?? records.length;
  const pages = result.pages ?? Math.max(1, Math.ceil(total / pageSize));
  return { records, total, pages, current: result.current ?? pageNo };
}

/**
 * 按 id 找单个产品。
 * ERP 当前无按 id 查询的接口，逐页查找，避免第 100 条以后的产品无法打开。
 * 如后续 ERP 提供 detail 接口，替换此实现即可。
 */
export async function findProductById(
  cfg: ErpConfig,
  erpProductId: string
): Promise<ErpProduct | null> {
  let pageNo = 1;
  while (true) {
    const page = await fetchProducts(cfg, pageNo, 100);
    const product = page.records.find((p) => p.id === erpProductId);
    if (product) return product;
    if (page.records.length === 0 || pageNo >= page.pages) return null;
    pageNo += 1;
  }
}
