'use server';

import { redirect } from 'next/navigation';
import { t } from '../i18n';
import { addToCart } from '../cart/actions';
import { getListableSkus } from '../catalog';
import { getProductDetail } from '../catalog.server';
import { ERP_TEMPLATE_PREFIX, buildBlankVariants } from '../products/blank-product';
import { buildSyncVariants } from '../products/product-sync';
import { getMyProduct } from '../queries/my-products';
import { requireSeller } from '../sellers/session';
import { createClient } from '../supabase/server';
import { getUploadableFaces } from '../products/print-faces';
import { displaySupplierName, getMainSupplier } from '../suppliers/suppliers';
import type { BulkOrderFormState, BulkOrderItem, DesignFile } from '../types/bulk-order';
import { orderSubtotal, parseBulkOrderForm, readAddress } from './bulk-order';
import { parseFaceUploads } from './design-upload';
import { uploadDesignFiles } from './upload-design-files';
import { parseImportCsv, resolveImportGroups } from './import';
import { getSkuIndex, loadPlatformData } from '../catalog.server';
import type { ImportFormState } from '../types/bulk-order';

/** 条目上快照产品默认供应商的显示名（不同供应商分开展示 / 以后分单用） */
function withSupplier(items: BulkOrderItem[], product: Parameters<typeof getMainSupplier>[0], supplierNames: Map<string, string>): BulkOrderItem[] {
  const supplier = getMainSupplier(product);
  const supplierName = supplier ? displaySupplierName(supplier, supplierNames) : null;
  return items.map((item) => ({ ...item, supplier_name: supplierName }));
}

/**
 * 统一下单：上传设计可选 —— 设计了 N 面按「空白件价 + N 面印花价」计价，没传设计就是白板价。
 * intent=cart 时改为把数量（和设计）并入批量单。不接支付，提交后待运营确认。
 */
export async function createDirectOrder(_state: BulkOrderFormState, form: FormData): Promise<BulkOrderFormState> {
  const seller = await requireSeller();
  const erpProductId = String(form.get('erpProductId') ?? '');
  const { product, data } = await getProductDetail(erpProductId, seller.tier);
  if (!product) return { error: t('detail.notFound') };

  if (form.get('intent') === 'cart') return addToCart(_state, form);

  const faces = getUploadableFaces(product);
  const uploads = parseFaceUploads(form, faces, { required: false });
  if (!uploads.ok) return { error: t(uploads.error), address: readAddress(form) };
  const faceCount = uploads.uploads.length;

  const listableSkus = getListableSkus(product, data);
  const variants = faceCount === 0
    ? buildBlankVariants(product, listableSkus)
    : buildSyncVariants(product, listableSkus, faceCount);
  if (variants.length === 0) {
    return { error: t(faceCount === 0 ? 'order.error.designRequired' : 'order.error.noPriceForFaces'), address: readAddress(form) };
  }
  const parsed = parseBulkOrderForm(form, variants);
  if (!parsed.ok) return { error: t(parsed.error), address: parsed.address };

  let designFiles: DesignFile[] = [];
  if (faceCount > 0) {
    try {
      designFiles = await uploadDesignFiles(seller.id, uploads.uploads);
    } catch (error) {
      console.error('[cn-portal] Design upload failed', error);
      return { error: t('order.error.upload'), address: parsed.input.shippingAddress };
    }
  }

  const supabase = await createClient();
  const { data: created, error } = await supabase
    .from('cn_bulk_orders')
    .insert({
      creator_id: seller.id,
      order_type: faceCount > 0 ? 'designed' : 'blank',
      erp_product_id: product.id,
      product_title: product.itemEnName || product.title || product.itemCnName,
      items: withSupplier(parsed.input.items, product, data.supplierNames),
      subtotal: orderSubtotal(parsed.input.items),
      currency: 'USD',
      shipping_address: parsed.input.shippingAddress,
      note: parsed.input.note || null,
      ...(faceCount > 0 ? { design_files: designFiles, faces: faceCount } : {}),
    })
    .select('id')
    .single<{ id: string }>();
  if (error || !created) return { error: error?.message ?? t('order.error.generic'), address: parsed.input.shippingAddress };

  redirect(`/orders/bulk/${created.id}?created=1`);
}

/** 设计下单：对设计后建好的产品下单，单价 = 空白件价 + 单面印花价。 */
export async function createDesignedOrder(_state: BulkOrderFormState, form: FormData): Promise<BulkOrderFormState> {
  const seller = await requireSeller();
  const productId = String(form.get('productId') ?? '');
  const row = await getMyProduct(seller.id, productId);
  if (!row) return { error: t('detail.notFound') };
  const { product, data } = await getProductDetail((row.product_template_id ?? '').replace(ERP_TEMPLATE_PREFIX, ''), seller.tier);
  if (!product) return { error: t('detail.notFound') };

  const variants = buildSyncVariants(product, getListableSkus(product, data), 1);
  const parsed = parseBulkOrderForm(form, variants);
  if (!parsed.ok) return { error: t(parsed.error), address: parsed.address };

  const supabase = await createClient();
  const { data: created, error } = await supabase
    .from('cn_bulk_orders')
    .insert({
      creator_id: seller.id,
      order_type: 'designed',
      product_instance_id: row.id,
      erp_product_id: product.id,
      product_title: row.title ?? product.itemEnName,
      items: withSupplier(parsed.input.items, product, data.supplierNames),
      subtotal: orderSubtotal(parsed.input.items),
      currency: 'USD',
      shipping_address: parsed.input.shippingAddress,
      note: parsed.input.note || null,
    })
    .select('id')
    .single<{ id: string }>();
  if (error || !created) return { error: error?.message ?? t('order.error.generic'), address: parsed.input.shippingAddress };

  redirect(`/orders/bulk/${created.id}?created=1`);
}

/** 表格下单：解析 CSV → 预览（有错不提交）；confirm=1 时按解析结果建多张采购单。 */
export async function importOrders(_state: ImportFormState, form: FormData): Promise<ImportFormState> {
  const seller = await requireSeller();
  const file = form.get('file');
  const csv = typeof form.get('csv') === 'string' && form.get('csv') ? String(form.get('csv')) : file instanceof File && file.size > 0 ? await file.text() : '';
  const defaultAddress = readAddress(form);
  if (!csv.trim()) return { error: t('import.error.noFile'), address: defaultAddress };

  const parsed = parseImportCsv(csv);
  if (!parsed.ok) {
    return { error: parsed.error === 'empty' ? t('import.error.empty') : t('import.error.missingColumns', 'zh', { columns: (parsed.missing ?? []).join(', ') }), address: defaultAddress };
  }
  const [skuIndex, platformData] = await Promise.all([getSkuIndex(seller.tier), loadPlatformData()]);
  const groups = resolveImportGroups(parsed.lines, { tier: seller.tier, skuIndex, platformData, defaultAddress });
  const hasErrors = groups.some((g) => g.errors.length > 0);
  if (form.get('confirm') !== '1' || hasErrors) return { groups, csv, address: defaultAddress, error: hasErrors ? t('import.error.fixRows') : undefined };

  const supabase = await createClient();
  const { data: created, error } = await supabase
    .from('cn_bulk_orders')
    .insert(groups.map((group) => ({
      creator_id: seller.id, order_type: 'blank', erp_product_id: null, product_title: null,
      items: group.items, subtotal: orderSubtotal(group.items), currency: 'USD',
      shipping_address: group.address, note: [group.ref !== '1' ? `#${group.ref}` : '', group.note].filter(Boolean).join(' ') || null,
    })))
    .select('id');
  if (error || !created) return { error: error?.message ?? t('order.error.generic'), groups, csv, address: defaultAddress };
  redirect(`/orders?imported=${created.length}`);
}
