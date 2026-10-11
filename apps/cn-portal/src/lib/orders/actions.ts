'use server';

import { redirect } from 'next/navigation';
import { t } from '../i18n';
import { getListableSkus } from '../catalog';
import { getProductDetail } from '../catalog.server';
import { ERP_TEMPLATE_PREFIX, buildBlankVariants } from '../products/blank-product';
import { buildSyncVariants } from '../products/product-sync';
import { getMyProduct } from '../queries/my-products';
import { requireSeller } from '../sellers/session';
import { createClient } from '../supabase/server';
import { uploadToR2 } from '@creator-commerce/shared/storage/r2';
import { getUploadableFaces } from '../products/print-faces';
import type { BulkOrderFormState, DesignFile } from '../types/bulk-order';
import { orderSubtotal, parseBulkOrderForm, readAddress } from './bulk-order';
import { fileExtension, parseFaceUploads } from './design-upload';

/** 白板下单：按该等级的空白件价生成采购单，状态待确认（不接支付）。 */
export async function createBlankOrder(_state: BulkOrderFormState, form: FormData): Promise<BulkOrderFormState> {
  const seller = await requireSeller();
  const erpProductId = String(form.get('erpProductId') ?? '');
  const { product, data } = await getProductDetail(erpProductId, seller.tier);
  if (!product) return { error: t('detail.notFound') };

  const variants = buildBlankVariants(product, seller.tier, getListableSkus(product, data));
  const parsed = parseBulkOrderForm(form, variants);
  if (!parsed.ok) return { error: t(parsed.error), address: parsed.address };

  const supabase = await createClient();
  const { data: created, error } = await supabase
    .from('cn_bulk_orders')
    .insert({
      creator_id: seller.id,
      order_type: 'blank',
      erp_product_id: product.id,
      product_title: product.itemEnName || product.title || product.itemCnName,
      items: parsed.input.items,
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

/** 设计下单：对设计后建好的产品下单，单价 = 空白件价 + 单面印花价。 */
export async function createDesignedOrder(_state: BulkOrderFormState, form: FormData): Promise<BulkOrderFormState> {
  const seller = await requireSeller();
  const productId = String(form.get('productId') ?? '');
  const row = await getMyProduct(seller.id, productId);
  if (!row) return { error: t('detail.notFound') };
  const { product, data } = await getProductDetail((row.product_template_id ?? '').replace(ERP_TEMPLATE_PREFIX, ''), seller.tier);
  if (!product) return { error: t('detail.notFound') };

  const variants = buildSyncVariants(product, seller.tier, getListableSkus(product, data), 1);
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
      items: parsed.input.items,
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

/**
 * 上传设计下单：按印刷面上传设计图（必填）和预览图（可选），设计了 N 面就按 N 面的印花价计价。
 * 文件在服务端传到 R2，采购单里存公网地址。
 */
export async function createUploadedDesignOrder(_state: BulkOrderFormState, form: FormData): Promise<BulkOrderFormState> {
  const seller = await requireSeller();
  const erpProductId = String(form.get('erpProductId') ?? '');
  const { product, data } = await getProductDetail(erpProductId, seller.tier);
  if (!product) return { error: t('detail.notFound') };

  const faces = getUploadableFaces(product, seller.tier);
  const uploads = parseFaceUploads(form, faces);
  if (!uploads.ok) return { error: t(uploads.error), address: readAddress(form) };

  const variants = buildSyncVariants(product, seller.tier, getListableSkus(product, data), uploads.uploads.length);
  if (variants.length === 0) return { error: t('order.error.noPriceForFaces'), address: readAddress(form) };
  const parsed = parseBulkOrderForm(form, variants);
  if (!parsed.ok) return { error: t(parsed.error), address: parsed.address };

  let designFiles: DesignFile[];
  try {
    designFiles = await Promise.all(uploads.uploads.map(async ({ face, design, preview }) => {
      const folder = `cn-orders/${seller.id}`;
      const [designUpload, previewUpload] = await Promise.all([
        uploadToR2(new Uint8Array(await design.arrayBuffer()), `${folder}/designs`, design.type, fileExtension(design)),
        preview ? uploadToR2(new Uint8Array(await preview.arrayBuffer()), `${folder}/previews`, preview.type, fileExtension(preview)) : null,
      ]);
      return { face, design_url: designUpload.url, preview_url: previewUpload?.url ?? null };
    }));
  } catch (error) {
    console.error('[cn-portal] Design upload failed', error);
    return { error: t('order.error.upload'), address: parsed.input.shippingAddress };
  }

  const supabase = await createClient();
  const { data: created, error } = await supabase
    .from('cn_bulk_orders')
    .insert({
      creator_id: seller.id,
      order_type: 'designed',
      erp_product_id: product.id,
      product_title: product.itemEnName || product.title || product.itemCnName,
      items: parsed.input.items,
      subtotal: orderSubtotal(parsed.input.items),
      currency: 'USD',
      shipping_address: parsed.input.shippingAddress,
      note: parsed.input.note || null,
      design_files: designFiles,
      faces: designFiles.length,
    })
    .select('id')
    .single<{ id: string }>();
  if (error || !created) return { error: error?.message ?? t('order.error.generic'), address: parsed.input.shippingAddress };

  redirect(`/orders/bulk/${created.id}?created=1`);
}
