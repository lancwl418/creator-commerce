import {
  erpBaseUrlFromEnv,
  resolveOptionDimensions,
  resolveSupplierSkuCost,
  type ErpProduct,
  type ErpSupplierQuote,
} from '@creator-commerce/shared/erp';
import type { CnOrderItem, CnOrderRow } from '@/lib/types/cn-order';
import { deriveStyleCode, type FactoryConsignee, type FactoryOrderItemInput } from './types';

// 采购单 → 工厂报文条目的纯组装逻辑（不碰数据库/网络），推送服务和干跑脚本共用。

const FACE_POSITION: Record<string, string> = { front: '1', back: '2' };

/** 设计面 → RIIN printPosition（"1"/"2"/"1,2"）；对不上的面按单面处理 */
export function printPositionOf(faces: string[]): '1' | '2' | '1,2' {
  const positions = [...new Set(faces.map((face) => FACE_POSITION[face]).filter(Boolean))].sort();
  return (positions.join(',') || '1') as '1' | '2' | '1,2';
}

/** 条目的设计文件：条目级优先，单产品订单在单级 */
export function designFilesOf(order: CnOrderRow, item: CnOrderItem): { face: string; design_url: string; preview_url: string | null }[] {
  if (item.design_files?.length) return item.design_files;
  const productId = item.erp_product_id ?? order.erp_product_id;
  return productId && productId === order.erp_product_id ? order.design_files : [];
}

/**
 * 产品主图的公网 URL（ERP 静态目录），工厂报文效果图为空时兜底。
 * RIIN 对没有 type-2 效果图的条目报「效果图为空」HTTP 500。
 */
export function productMainImageUrl(product: ErpProduct): string | null {
  const path =
    product.mainPic ||
    product.prodImageList?.find((i) => i.isMain === 1)?.picSrc ||
    product.prodImageList?.[0]?.picSrc;
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return `${erpBaseUrlFromEnv()}/sys/common/static/${path.replace(/^\//, '')}`;
}

/** 从选定供应商报价的 skuMaps 找工厂编码（skuKey = "颜色|尺码"），找不到用我方 SKU */
export function factorySkuOf(quote: ErpSupplierQuote | null, item: CnOrderItem, color: string, size: string): string {
  const maps = quote?.skuMaps ?? [];
  const byKey = maps.find((m) => m.skuKey === `${color}|${size}`);
  const byCode = byKey ?? maps.find((m) => m.mySkuCode && m.mySkuCode === item.sku);
  return byCode?.factoryCode?.trim() || item.sku;
}

export function buildConsignee(order: CnOrderRow): { ok: true; consignee: FactoryConsignee } | { ok: false; error: string } {
  const a = order.shipping_address;
  const missing = (['name', 'phone', 'address1', 'city', 'province', 'country'] as const).filter((k) => !a[k]?.trim());
  if (missing.length > 0) return { ok: false, error: `Shipping address missing: ${missing.join(', ')}` };
  if (!a.zip?.trim()) return { ok: false, error: 'Shipping address missing: zip (postCode is required for overseas orders)' };
  return {
    ok: true,
    consignee: {
      name: a.name,
      phone: a.phone,
      address: a.address1,
      addressOptional: a.address2 || undefined,
      country: a.country,
      province: a.province,
      city: a.city,
      postCode: a.zip,
    },
  };
}

export function buildItemInput(
  order: CnOrderRow,
  entry: { item: CnOrderItem; index: number; product: ErpProduct; quote: ErpSupplierQuote | null }
): FactoryOrderItemInput {
  const { item, index, product, quote } = entry;
  const dimensions = resolveOptionDimensions(product);
  const sizeKey = dimensions.find((d) => d.isSize)?.key;
  const colorKey = dimensions.find((d) => d.isColor)?.key;
  const sku = product.prodSkuList.find((s) => s.id === item.sku_id);
  const color = (sku && colorKey ? sku[colorKey] : null) ?? item.option1 ?? '';
  const size = (sku && sizeKey ? sku[sizeKey] : null) ?? item.option2 ?? '';

  const designFiles = designFilesOf(order, item);
  const shouldPrint = designFiles.length > 0;
  const effectImageUrls = designFiles.map((f) => f.preview_url).filter((url): url is string => !!url);
  if (effectImageUrls.length === 0) {
    const mainImage = productMainImageUrl(product);
    if (mainImage) effectImageUrls.push(mainImage);
  }
  const faces = item.faces ?? order.faces ?? (shouldPrint ? designFiles.length : 0);
  const factorySku = factorySkuOf(quote, item, color, size);
  // 工厂价：选定供应商的报价成本；取不到时退回下单单价快照
  const cost = quote ? resolveSupplierSkuCost(product, quote, item.sku_id, shouldPrint ? faces : 0) : null;
  const styleCode = deriveStyleCode(factorySku, color, size);

  return {
    orderItemId: `CN${order.order_number}_${index + 1}`,
    title: item.product_title ?? order.product_title ?? product.itemEnName ?? product.title,
    quantity: item.quantity,
    price: cost?.unit ?? Number(item.unit_cost),
    ourSku: item.sku || null,
    factorySku,
    sizeCode: size,
    sizeName: size,
    colorCode: color,
    colorName: color,
    styleCode,
    styleName: styleCode,
    craftType: 1,
    shouldPrint,
    printPosition: shouldPrint ? printPositionOf(designFiles.map((f) => f.face)) : undefined,
    printImageUrls: designFiles.map((f) => f.design_url),
    effectImageUrls,
  };
}
