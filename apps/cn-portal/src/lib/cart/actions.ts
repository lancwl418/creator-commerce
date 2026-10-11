'use server';

import { redirect } from 'next/navigation';
import { t } from '../i18n';
import { getListableSkus } from '../catalog';
import { getProductDetail } from '../catalog.server';
import { isCompleteAddress, orderSubtotal, readAddress } from '../orders/bulk-order';
import { buildBlankVariants } from '../products/blank-product';
import { requireSeller } from '../sellers/session';
import { createClient } from '../supabase/server';
import type { BulkOrderFormState } from '../types/bulk-order';
import { cartToOrderItems, priceCartItems } from './pricing';
import { getCartItems } from './queries';

/** 产品页「加入批量单」：按数量把该产品的 variant 并入购物车（同 SKU 累加）。 */
export async function addToCart(_state: BulkOrderFormState, form: FormData): Promise<BulkOrderFormState> {
  const seller = await requireSeller();
  const erpProductId = String(form.get('erpProductId') ?? '');
  const { product, data } = await getProductDetail(erpProductId, seller.tier);
  if (!product) return { error: t('detail.notFound') };

  const variants = buildBlankVariants(product, seller.tier, getListableSkus(product, data));
  const items: { sku_id: string; quantity: number }[] = [];
  for (const variant of variants) {
    const raw = String(form.get(`qty:${variant.skuId}`) ?? '').trim();
    if (!raw) continue;
    const quantity = Number(raw);
    if (!Number.isInteger(quantity) || quantity < 0) return { error: t('order.error.quantity') };
    if (quantity > 0) items.push({ sku_id: variant.skuId, quantity });
  }
  if (items.length === 0) return { error: t('order.error.noItems') };

  const supabase = await createClient();
  const existing = await getCartItems(seller.id);
  const title = product.itemEnName || product.title || product.itemCnName;
  const rows = items.map(({ sku_id, quantity }) => {
    const variant = variants.find((v) => v.skuId === sku_id)!;
    const current = existing.find((row) => row.sku_id === sku_id);
    return {
      creator_id: seller.id, erp_product_id: product.id, product_title: title,
      sku_id, sku: variant.sku, option1: variant.option1, option2: variant.option2, option3: variant.option3,
      quantity: (current?.quantity ?? 0) + quantity,
    };
  });
  const { error } = await supabase.from('cn_cart_items').upsert(rows, { onConflict: 'creator_id,sku_id' });
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
      creator_id: seller.id, order_type: 'blank', erp_product_id: null, product_title: null,
      items, subtotal: orderSubtotal(items), currency: 'USD', shipping_address: address,
      note: String(form.get('note') ?? '').trim() || null,
    })
    .select('id')
    .single<{ id: string }>();
  if (error || !created) return { error: error?.message ?? t('order.error.generic'), address };
  await supabase.from('cn_cart_items').delete().eq('creator_id', seller.id);
  redirect(`/orders/bulk/${created.id}?created=1`);
}
