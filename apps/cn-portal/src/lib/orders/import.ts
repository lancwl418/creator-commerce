import type { SkuLookup } from '../catalog.server';
import type { PlatformData } from '../types/catalog';
import type { SellerTier } from '@creator-commerce/shared/erp/pricing';
import { getListableSkus } from '../catalog';
import { buildSyncVariants } from '../products/product-sync';
import type { BulkOrderItem, ImportedOrderGroup, ShippingAddress } from '../types/bulk-order';
import { isCompleteAddress } from './bulk-order';

// 表格下单：CSV 每行一个 SKU；同一 order_ref 的行合成一张采购单；
// 带收货地址的组用自己的地址，没带的组用页面上填的默认地址。

export const IMPORT_COLUMNS = ['order_ref', 'sku', 'quantity', 'name', 'phone', 'country', 'province', 'city', 'address1', 'address2', 'zip', 'note'] as const;
export type ImportColumn = (typeof IMPORT_COLUMNS)[number];

const COLUMN_ALIASES: Record<string, ImportColumn> = {
  order_ref: 'order_ref', ref: 'order_ref', order: 'order_ref', '订单号': 'order_ref', '订单编号': 'order_ref', '单号': 'order_ref',
  sku: 'sku', 'sku编码': 'sku', 'sku 编码': 'sku',
  quantity: 'quantity', qty: 'quantity', '数量': 'quantity',
  name: 'name', recipient: 'name', '收件人': 'name', '姓名': 'name',
  phone: 'phone', tel: 'phone', '电话': 'phone', '手机': 'phone', '手机号': 'phone',
  country: 'country', '国家': 'country', '国家/地区': 'country',
  province: 'province', state: 'province', '省': 'province', '州': 'province', '省/州': 'province', '州/省': 'province',
  city: 'city', '城市': 'city',
  address1: 'address1', address: 'address1', '地址': 'address1', '地址1': 'address1',
  address2: 'address2', '地址2': 'address2',
  zip: 'zip', postcode: 'zip', postal_code: 'zip', '邮编': 'zip',
  note: 'note', remark: 'note', '备注': 'note',
};

/** 模板：表头 + 两行示例（同一单号两个 SKU；第二单没填地址则用页面默认地址） */
export const IMPORT_TEMPLATE_CSV = [
  IMPORT_COLUMNS.join(','),
  'A001,SKU-WHITE-M,10,张三,13800000000,US,California,Los Angeles,"123 Main St, Apt 4",,90001,第一张采购单',
  'A001,SKU-WHITE-L,5,张三,13800000000,US,California,Los Angeles,"123 Main St, Apt 4",,90001,',
  'A002,SKU-BLACK-M,20,,,,,,,,,用页面上填写的默认地址',
].join('\r\n') + '\r\n';

/** 解析 CSV 文本：支持引号、引号内逗号与换行、CRLF、BOM。返回按表头映射的记录。 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const input = text.replace(/^﻿/, '');
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"') {
        if (input[i + 1] === '"') { cell += '"'; i++; } else quoted = false;
      } else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && input[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length > 0) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

export interface ImportLine {
  line: number;
  values: Partial<Record<ImportColumn, string>>;
}

export type ParsedImport =
  | { ok: true; lines: ImportLine[] }
  | { ok: false; error: 'empty' | 'missingColumns'; missing?: string[] };

/** 表头映射 + 逐行读取；sku 与 quantity 列必须存在。 */
export function parseImportCsv(text: string): ParsedImport {
  const rows = parseCsv(text);
  if (rows.length < 2) return { ok: false, error: 'empty' };
  const header = rows[0].map((h) => COLUMN_ALIASES[h.trim().toLowerCase()] ?? COLUMN_ALIASES[h.trim()] ?? null);
  const missing = (['sku', 'quantity'] as const).filter((col) => !header.includes(col));
  if (missing.length > 0) return { ok: false, error: 'missingColumns', missing };
  const lines: ImportLine[] = rows.slice(1).map((cells, index) => {
    const values: Partial<Record<ImportColumn, string>> = {};
    header.forEach((col, i) => { if (col && cells[i] != null) values[col] = cells[i].trim(); });
    return { line: index + 2, values };
  });
  return { ok: true, lines };
}

export interface ResolveContext {
  tier: SellerTier;
  skuIndex: Map<string, SkuLookup>;
  platformData: PlatformData;
  defaultAddress: Partial<ShippingAddress>;
}

function addressFromLine(values: ImportLine['values']): Partial<ShippingAddress> {
  return {
    name: values.name ?? '', phone: values.phone ?? '', country: values.country ?? '', province: values.province ?? '',
    city: values.city ?? '', address1: values.address1 ?? '', address2: values.address2 ?? '', zip: values.zip ?? '',
  };
}

function hasAnyAddress(address: Partial<ShippingAddress>): boolean {
  return Object.values(address).some((v) => v && v.trim() !== '');
}

/**
 * 把表格行按 order_ref 分组并定价：SKU 必须在目录里、该等级有白板价；数量为正整数。
 * 组内第一行带地址则用它（必须完整），否则用默认地址。错误记在组上，任一组有错整批不提交。
 */
export function resolveImportGroups(lines: ImportLine[], context: ResolveContext): ImportedOrderGroup[] {
  const groups = new Map<string, ImportedOrderGroup & { addressRaw: Partial<ShippingAddress> | null }>();
  const costCache = new Map<string, Map<string, number>>();

  function costFor(lookup: SkuLookup): number | null {
    let bySku = costCache.get(lookup.product.id);
    if (!bySku) {
      bySku = new Map(buildSyncVariants(lookup.product, getListableSkus(lookup.product, context.platformData), false).map((v) => [v.skuId, v.cost]));
      costCache.set(lookup.product.id, bySku);
    }
    return bySku.get(lookup.sku.id) ?? null;
  }

  for (const { line, values } of lines) {
    const ref = (values.order_ref || '1').trim();
    let group = groups.get(ref);
    if (!group) {
      const lineAddress = addressFromLine(values);
      group = { ref, items: [], address: null, note: values.note ?? '', errors: [], addressRaw: hasAnyAddress(lineAddress) ? lineAddress : null };
      groups.set(ref, group);
    }
    const skuCode = (values.sku ?? '').trim().toUpperCase();
    const quantity = Number(values.quantity);
    if (!skuCode) { group.errors.push(`第 ${line} 行：缺少 SKU`); continue; }
    if (!Number.isInteger(quantity) || quantity <= 0) { group.errors.push(`第 ${line} 行：数量「${values.quantity ?? ''}」不是正整数`); continue; }
    const lookup = context.skuIndex.get(skuCode);
    if (!lookup) { group.errors.push(`第 ${line} 行：SKU ${skuCode} 不在可选目录里（不存在、未开放、无货或该等级没有价格）`); continue; }
    const cost = costFor(lookup);
    if (cost == null) { group.errors.push(`第 ${line} 行：SKU ${skuCode} 在当前等级没有空白件价格`); continue; }
    const existing = group.items.find((item) => item.sku_id === lookup.sku.id);
    if (existing) existing.quantity += quantity;
    else group.items.push({
      erp_product_id: lookup.product.id,
      product_title: lookup.product.itemEnName || lookup.product.title || lookup.product.itemCnName,
      sku_id: lookup.sku.id, sku: lookup.sku.sku,
      option1: lookup.sku.option1, option2: lookup.sku.option2, option3: lookup.sku.option3,
      quantity, unit_cost: cost,
    });
  }

  return [...groups.values()].map(({ addressRaw, ...group }) => {
    const candidate = addressRaw ?? context.defaultAddress;
    const address = isCompleteAddress(candidate) ? candidate : null;
    const errors = [...group.errors];
    if (group.items.length === 0 && errors.length === 0) errors.push('没有可下单的行');
    if (!address) errors.push(addressRaw ? '收货地址不完整（需要收件人、电话、国家、城市、地址、邮编）' : '未填写收货地址，且页面上没有完整的默认地址');
    return { ...group, address, errors };
  });
}
