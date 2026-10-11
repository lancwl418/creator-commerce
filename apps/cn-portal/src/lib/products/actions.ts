'use server';

import { redirect } from 'next/navigation';
import {
  ProductSyncError,
  shopifyAppConfigFromEnv,
  syncProductToStore,
  type SyncableStoreConnection,
} from '@creator-commerce/shared/shopify';
import { t } from '../i18n';
import { getListableSkus } from '../catalog';
import { getProductDetail } from '../catalog.server';
import { getRequestOrigin } from '../request-origin';
import { requireSeller } from '../sellers/session';
import { createClient } from '../supabase/server';
import type { BlankSyncFormState } from '../types/product';
import {
  buildBlankProductImages,
  buildBlankProductRow,
  buildBlankVariants,
  erpImagePublicUrl,
  parseBlankProductForm,
} from './blank-product';

/** 「仅同步白板」：建产品记录 → 同步到卖家已连接的 Shopify 店铺 → 跳到我的产品。 */
export async function syncBlankProduct(_state: BlankSyncFormState, form: FormData): Promise<BlankSyncFormState> {
  const seller = await requireSeller();
  const erpProductId = String(form.get('erpProductId') ?? '');
  const { product, data } = await getProductDetail(erpProductId, seller.tier);
  if (!product) return { error: t('detail.notFound') };

  const variants = buildBlankVariants(product, seller.tier, getListableSkus(product, data));
  const images = buildBlankProductImages(product);
  const parsed = parseBlankProductForm(form, variants, images);
  if (!parsed.ok) return { error: t(parsed.error) };

  const supabase = await createClient();
  const { data: connection, error: connectionError } = await supabase
    .from('creator_store_connections')
    .select('*')
    .eq('creator_id', seller.id)
    .eq('platform', 'shopify')
    .eq('status', 'connected')
    .maybeSingle<SyncableStoreConnection>();
  if (connectionError) return { error: connectionError.message };
  if (!connection) return { error: t('sync.error.noStore') };

  const { data: created, error: insertError } = await supabase
    .from('sellable_product_instances')
    .insert(buildBlankProductRow(seller.id, product, variants, images, parsed.input))
    .select('*')
    .single();
  if (insertError || !created) return { error: insertError?.message ?? t('sync.error.generic') };

  const origin = await getRequestOrigin();
  try {
    await syncProductToStore({
      supabase,
      config: shopifyAppConfigFromEnv(),
      product: created,
      connection,
      publishStatus: parsed.input.publishStatus,
      toPublicUrl: (path) => erpImagePublicUrl(origin, path),
    });
  } catch (error) {
    // 同步失败就撤掉刚建的产品记录，避免留下半成品；Shopify 侧若已创建会在错误里说明
    await supabase.from('sellable_product_instances').delete().eq('id', created.id);
    console.error('[cn-portal] Blank product sync failed', error);
    const message = error instanceof ProductSyncError || error instanceof Error ? error.message : t('sync.error.generic');
    return { error: message };
  }

  redirect(`/my-products?synced=${created.id}`);
}
