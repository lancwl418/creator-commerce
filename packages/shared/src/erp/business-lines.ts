import type { ErpProduct } from './types';

/** ERP 业务线字典里中国卖家平台的 code */
export const CHINA_MERCHANT_BUSINESS_LINE = 'chinamerchant';

/** 产品支持的业务线 code。ERP 的 prodSupport 是 JSON 字符串数组；无法解析时视为不支持任何业务线。 */
export function getProductBusinessLines(product: Pick<ErpProduct, 'prodSupport'>): string[] {
  const raw = product.prodSupport;
  if (Array.isArray(raw)) return raw.filter((code): code is string => typeof code === 'string');
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((code): code is string => typeof code === 'string') : [];
  } catch {
    return [];
  }
}

export function productSupportsBusinessLine(
  product: Pick<ErpProduct, 'prodSupport'>,
  businessLine: string
): boolean {
  return getProductBusinessLines(product).includes(businessLine);
}
