import type { MessageKey } from '../i18n';
import type { BlankVariant } from '../types/product';
import type { BulkOrderInput, BulkOrderItem, ShippingAddress } from '../types/bulk-order';

export const ADDRESS_FIELDS: (keyof ShippingAddress)[] = ['name', 'phone', 'country', 'province', 'city', 'address1', 'address2', 'zip'];
const REQUIRED_ADDRESS_FIELDS: (keyof ShippingAddress)[] = ['name', 'phone', 'country', 'city', 'address1', 'zip'];

export type ParsedBulkOrder =
  | { ok: true; input: BulkOrderInput }
  | { ok: false; error: MessageKey; address: Partial<ShippingAddress> };

function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

export function readAddress(form: FormData): ShippingAddress {
  return Object.fromEntries(ADDRESS_FIELDS.map((key) => [key, field(form, `address.${key}`)])) as unknown as ShippingAddress;
}

/**
 * 解析下单表单：数量字段 qty:<skuId>，只收整数且 ≥ 1 的行；至少一行；收货地址必填项齐全。
 * 单价来自服务端算好的 variant 成本，不信任表单。
 */
export function parseBulkOrderForm(form: FormData, variants: BlankVariant[]): ParsedBulkOrder {
  const address = readAddress(form);
  const items: BulkOrderItem[] = [];
  for (const variant of variants) {
    const raw = field(form, `qty:${variant.skuId}`);
    if (!raw) continue;
    const quantity = Number(raw);
    if (!Number.isInteger(quantity) || quantity < 0) return { ok: false, error: 'order.error.quantity', address };
    if (quantity === 0) continue;
    items.push({
      sku_id: variant.skuId, sku: variant.sku,
      option1: variant.option1, option2: variant.option2, option3: variant.option3,
      quantity, unit_cost: variant.cost,
    });
  }
  if (items.length === 0) return { ok: false, error: 'order.error.noItems', address };
  if (REQUIRED_ADDRESS_FIELDS.some((key) => !address[key])) return { ok: false, error: 'order.error.address', address };
  return { ok: true, input: { items, shippingAddress: address, note: field(form, 'note') } };
}

export function orderSubtotal(items: BulkOrderItem[]): number {
  return Math.round(items.reduce((sum, item) => sum + item.quantity * item.unit_cost, 0) * 100) / 100;
}

export function orderQuantity(items: BulkOrderItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}
