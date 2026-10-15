'use server';

import { redirect } from 'next/navigation';
import { t } from '../i18n';
import { getListableSkus } from '../catalog';
import { getProductDetail } from '../catalog.server';
import { isCompleteAddress, orderSubtotal, readAddress } from '../orders/bulk-order';
import { parseFaceUploads } from '../orders/design-upload';
import { uploadDesignFiles } from '../orders/upload-design-files';
import { buildBlankVariants } from '../products/blank-product';
import { buildSyncVariants } from '../products/product-sync';
import { getUploadableFaces } from '../products/print-faces';
import { requireSeller } from '../sellers/session';
import { createClient } from '../supabase/server';
import type { BulkOrderFormState, DesignFile } from '../types/bulk-order';
import { cartToOrderItems, priceCartItems } from './pricing';
import { getCartItems } from './queries';

/**
 * 「加入批量单」：按数量把该产品的 variant 并入购物车。
 * 上传了设计的按设计行加入（每次一组新行，faces 面计价）；没传设计的按白板加入（同 SKU 累加）。
 */
export async function addToCart(_state: BulkOrderFormState, form: FormData): Promise<BulkOrderFormState> {
  const seller = await requireSeller();
  const erpProductId = String(form.get('erpProductId') ?? '');
  const { product, data } = await getProductDetail(erpProductId, seller.tier);
  if (!product) return { error: t('detail.notFound') };

  const uploads = parseFaceUploads(form, getUploadableFaces(product), { required: false });
  if (!uploads.ok) return { error: t(uploads.error) };
  const faceCount = uploads.uploads.length;

  const listableSkus = getListableSkus(product, data);
  const variants = faceCount === 0
    ? buildBlankVariants(product, listableSkus)
    : buildSyncVariants(product, listableSkus, faceCount);
  if (variants.length === 0) return { error: t(faceCount === 0 ? 'order.error.designRequired' : 'order.error.noPriceForFaces') };

  const items: { sku_id: string; quantity: number }[] = [];
  for (const variant of variants) {
    const raw = String(form.get(`qty:${variant.skuId}`) ?? '').trim();
    if (!raw) continue;
    const quantity = Number(raw);
    if (!Number.isInteger(quantity) || quantity < 0) return { error: t('order.error.quantity') };
    if (quantity > 0) items.push({ sku_id: variant.skuId, quantity });
  }
  if (items.length === 0) return { error: t('order.error.noItems') };

  let designFiles: DesignFile[] | null = null;
  if (faceCount > 0) {
    try {
      designFiles = await uploadDesignFiles(seller.id, uploads.uploads);
    } catch (error) {
      console.error('[cn-portal] Design upload failed', error);
      return { error: t('order.error.upload') };
    }
  }

  const supabase = await createClient();
  const existing = await getCartItems(seller.id);
  const title = product.itemEnName || product.title || product.itemCnName;
  const rows = items.map(({ sku_id, quantity }) => {
    const variant = variants.find((v) => v.skuId === sku_id)!;
    // 白板行同 SKU 累加；带设计的行每次都是新行（同一 SKU 可以配不同设计）
    const current = faceCount === 0 ? existing.find((row) => row.sku_id === sku_id && row.faces === 0) : undefined;
    return {
      ...(current ? { id: current.id } : {}),
      creator_id: seller.id, erp_product_id: product.id, product_title: title,
      sku_id, sku: variant.sku, option1: variant.option1, option2: variant.option2, option3: variant.option3,
      quantity: (current?.quantity ?? 0) + quantity,
      design_files: designFiles, faces: faceCount,
    };
  });
  const { error } = await supabase.from('cn_cart_items').upsert(rows, { onConflict: 'id' });
  if (error) return { error: error.message };
  redirect('/cart?added=1');
}

export async function updateCartItem(form: FormData): Promise<void> {
  const seller = await requireSeller();
  const id = String(form.get('id') ?? '');
  const quantity = Number(form.get('quantity'));
  const supabase = await createClient();
  if (!Number.isInteger(quantity) || quantity <= 0) {
    await supabase.from('cn_cart_items').delete().eq('id', id).eq('creator_id', seller.id);
  } else {
    await supabase.from('cn_cart_items').update({ quantity }).eq('id', id).eq('creator_id', seller.id);
  }
  redirect('/cart');
}

export async function removeCartItem(form: FormData): Promise<void> {
  const seller = await requireSeller();
  const supabase = await createClient();
  await supabase.from('cn_cart_items').delete().eq('id', String(form.get('id') ?? '')).eq('creator_id', seller.id);
  redirect('/cart');
}

/** 购物车结算：所有有价的行合成一张多产品采购单（待确认），清空购物车。 */
export async function checkoutCart(_state: BulkOrderFormState, form: FormData): Promise<BulkOrderFormState> {
  const seller = await requireSeller();
  const priced = await priceCartItems(await getCartItems(seller.id), seller.tier);
  const unpriced = priced.filter((item) => item.unit_cost == null);
  if (unpriced.length > 0) return { error: t('cart.error.unpriced', 'zh', { skus: unpriced.map((i) => i.sku).join(', ') }), address: readAddress(form) };
  const items = cartToOrderItems(priced);
  if (items.length === 0) return { error: t('cart.error.empty') };
  const address = readAddress(form);
  if (!isCompleteAddress(address)) return { error: t('order.error.address'), address };

  const supabase = await createClient();
  const { data: created, error } = await supabase
    .from('cn_bulk_orders')
    .insert({
      creator_id: seller.id,
      order_type: items.some((item) => (item.faces ?? 0) > 0) ? 'designed' : 'blank',
      erp_product_id: null, product_title: null,
      items, subtotal: orderSubtotal(items), currency: 'USD', shipping_address: address,
      note: String(form.get('note') ?? '').trim() || null,
    })
    .select('id')
    .single<{ id: string }>();
  if (error || !created) return { error: error?.message ?? t('order.error.generic'), address };
  await supabase.from('cn_cart_items').delete().eq('creator_id', seller.id);
  redirect(`/orders/bulk/${created.id}?created=1`);
}
