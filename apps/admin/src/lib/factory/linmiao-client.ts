import { createHash } from 'crypto';

// Linmiao 工厂 API 原始客户端，移植自 order-workbench src/lib/factory/client.ts。
// 与 RIIN 同一种协议：MD5(body + "::" + secretKey) 签名。

const DEFAULT_BASE_URL = 'https://linmiao.online/';

function baseUrl(): string {
  const raw = process.env.FACTORY_API_URL || DEFAULT_BASE_URL;
  return raw.endsWith('/') ? raw : raw + '/';
}

function secretKey(): string {
  const key = process.env.FACTORY_API_SECRET_KEY;
  if (!key) {
    throw new Error('FACTORY_API_SECRET_KEY is not set — configure the factory API env vars');
  }
  return key;
}

function sign(body: string, key: string): string {
  return createHash('md5').update(body + '::' + key).digest('hex');
}

export interface LinmiaoResponse<T = unknown> {
  successful: boolean;
  message: string;
  errorCode: string;
  data: T;
  traceId: string;
}

const REQUEST_TIMEOUT_MS = 30_000;

async function post<T>(path: string, payload: Record<string, unknown>): Promise<LinmiaoResponse<T>> {
  const key = secretKey();
  const body = JSON.stringify(payload);
  const url = baseUrl() + path.replace(/^\//, '');

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        secretKey: key,
        sign: sign(body, key),
      },
      body,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (e) {
    if (e instanceof Error && (e.name === 'TimeoutError' || e.name === 'AbortError')) {
      throw new Error(`Factory API timed out after ${REQUEST_TIMEOUT_MS / 1000}s (${path})`);
    }
    throw new Error(`Factory API unreachable: ${e instanceof Error ? e.message : String(e)}`);
  }

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Factory HTTP ${res.status}: ${text.slice(0, 500)}`);
  }

  let parsed: LinmiaoResponse<T>;
  try {
    parsed = JSON.parse(text) as LinmiaoResponse<T>;
  } catch {
    throw new Error(`Factory returned non-JSON response: ${text.slice(0, 500)}`);
  }

  if (!parsed.successful) {
    const err = new Error(parsed.message || parsed.errorCode || 'Factory push failed');
    (err as Error & { traceId?: string; errorCode?: string }).traceId = parsed.traceId;
    (err as Error & { traceId?: string; errorCode?: string }).errorCode = parsed.errorCode;
    throw err;
  }

  return parsed;
}

export interface LinmiaoConsignee {
  name: string;
  phone: string;
  address: string;
  alternateAddress?: string;
  country: string;
  province: string;
  city: string;
  district?: string;
  town?: string;
  company?: string;
  id?: string;
  postCode?: string;
}

export interface LinmiaoImage {
  type: 1 | 2; // 1=打印图, 2=效果图
  imageUrl: string;
  imageCode: string;
  imageName: string;
}

export interface LinmiaoGoodsItem {
  pfOrderId: string;
  pfSubOrderId: string;
  goodsType: 1 | 2;
  title: string;
  specification: string;
  subOrderStatus: 'NOT_SHIPPED' | 'SHIPPED';
  subOrderRefundStatus: 'NO_REFUND' | 'REFUNDING' | 'PART_REFUNDED' | 'REFUNDED';
  sizeCode: string;
  sizeName: string;
  colorCode: string;
  colorName: string;
  styleCode: string;
  styleName: string;
  craftType: 1 | 2;
  num: number;
  spuId?: string;
  skuId?: string;
  remark?: string;
  price?: number;
  sellPrice?: number;
  printPosition?: string;
  imageList: LinmiaoImage[];
}

export interface LinmiaoCreateOrderParams {
  platformType: number;
  sourceOrderId: string;
  pfOrderStatus: 'NOT_SHIPPED' | 'SHIPPED' | 'CANCEL';
  pfRefundStatus: 'NO_REFUND' | 'REFUNDING' | 'PART_REFUNDED' | 'REFUNDED';
  pfOrderId: string;
  consignee: LinmiaoConsignee;
  orderTime: string;
  postCode?: string;
  goodsList: LinmiaoGoodsItem[];
  sellerRemark?: string;
  buyerRemark?: string;
}

export function createOrder(params: LinmiaoCreateOrderParams): Promise<LinmiaoResponse<unknown>> {
  return post('trade/v1/openapi/create-order', params as unknown as Record<string, unknown>);
}

export function queryOrderStatus(orderIds: string[]): Promise<LinmiaoResponse<unknown>> {
  return post('trade/v1/openapi/query-order-status', { orderIdList: orderIds });
}

export function queryOrderInfo(orderIds: string[]): Promise<LinmiaoResponse<unknown>> {
  return post('trade/v1/openapi/query-order-info', { orderIdList: orderIds });
}
