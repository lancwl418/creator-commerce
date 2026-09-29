import crypto from 'crypto';
import type { ErpProduct, ErpProductPage } from './types';

// ── ERP 网关配置 ──
// 与现有 apps/portal 保持一致：openapi/call/{code} + appkey + md5 签名。
// 生产环境应通过环境变量注入，defaults 仅用于本地联调。
export interface ErpConfig {
  baseUrl: string;
  appKey: string;
  secretKey: string;
}

export function erpConfigFromEnv(env: NodeJS.ProcessEnv = process.env): ErpConfig {
  return {
    baseUrl: env.ERP_API_BASE_URL ?? 'http://118.195.245.201:8081/ideamax',
    appKey: env.ERP_APP_KEY ?? 'ak-OwVVN4U4gJINJ4nK',
    secretKey: env.ERP_SECRET_KEY ?? 'QSd7yhGrQ1YyPIFJ9LJXHAbOU67C1A7K',
  };
}

/** ERP 图片代理基址（原图路径需拼在其后） */
export function erpImageBaseUrl(cfg: ErpConfig): string {
  return `${cfg.baseUrl}/sys/common/static/`;
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

interface ErpEnvelope<T> {
  success: boolean;
  result?: T;
  message?: string;
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
    throw new Error(`ERP API returned ${res.status}`);
  }
  return (await res.json()) as ErpEnvelope<T>;
}

interface RawProductPage {
  records?: ErpProduct[];
  list?: ErpProduct[];
  total?: number;
  pages?: number;
  current?: number;
}

/** 拉取产品分页列表 */
export async function fetchProducts(
  cfg: ErpConfig,
  pageNo = 1,
  pageSize = 40
): Promise<ErpProductPage> {
  const data = await erpGet<RawProductPage>(
    cfg,
    PRODUCTS_ENDPOINT_CODE,
    { pageNo: String(pageNo), pageSize: String(pageSize) },
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
 * ERP 当前无按 id 查询的接口，沿用现有 portal 做法：拉一页 100 条后匹配。
 * 如后续 ERP 提供 detail 接口，替换此实现即可。
 */
export async function findProductById(
  cfg: ErpConfig,
  erpProductId: string
): Promise<ErpProduct | null> {
  const data = await erpGet<RawProductPage>(cfg, PRODUCTS_ENDPOINT_CODE, {
    pageNo: '1',
    pageSize: '100',
  });
  const records = data.result?.records ?? data.result?.list ?? [];
  return records.find((p) => p.id === erpProductId) ?? null;
}
