import { NextRequest, NextResponse } from 'next/server';
import {
  ProductSyncError,
  shopifyAppConfigFromEnv,
  syncProductToStore,
  type SyncableProduct,
  type SyncableStoreConnection,
} from '@creator-commerce/shared/shopify';
import { createClient } from '@/lib/supabase/server';

/**
 * ERP images are on an HTTP internal server that Shopify can't access.
 * Proxy them through our app's /api/erp/image endpoint (public HTTPS).
 */
function toPublicUrl(path: string): string {
  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');
  if (!path) return '';
  if (path.startsWith('https://')) return path;
  if (path.startsWith('http://')) {
    // Already a full HTTP URL — extract the relative path for the proxy
    const match = path.match(/\/sys\/common\/static\/(.+)$/);
    if (match) path = match[1];
    else return ''; // Can't proxy unknown HTTP URLs
  }
  return `${appUrl}/api/erp/image?path=${encodeURIComponent(path)}`;
}

/**
 * POST /api/shopify/sync-product
 * Body: { product_instance_id, store_connection_id, publish_status? }
 * The sync itself (custom SKUs → Shopify product → listing) lives in the shared package.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: creator } = await supabase
    .from('creators')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();
  if (!creator) {
    return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
  }

  const body = await req.json();
  const { product_instance_id, store_connection_id, publish_status } = body;
  if (!product_instance_id || !store_connection_id) {
    return NextResponse.json({ error: 'Missing product_instance_id or store_connection_id' }, { status: 400 });
  }

  const { data: product } = await supabase
    .from('sellable_product_instances')
    .select('*')
    .eq('id', product_instance_id)
    .eq('creator_id', creator.id)
    .single<SyncableProduct>();
  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  const { data: connection } = await supabase
    .from('creator_store_connections')
    .select('*')
    .eq('id', store_connection_id)
    .eq('creator_id', creator.id)
    .single<SyncableStoreConnection>();
  if (!connection) {
    return NextResponse.json({ error: 'Store connection not found' }, { status: 404 });
  }

  try {
    const result = await syncProductToStore({
      supabase,
      config: shopifyAppConfigFromEnv(),
      product,
      connection,
      publishStatus: publish_status === 'draft' ? 'draft' : 'active',
      toPublicUrl,
    });
    return NextResponse.json({
      success: true,
      shopify_product_id: result.shopifyProductId,
      shopify_url: result.shopifyUrl,
      listing_id: result.listingId,
      custom_skus_created: result.customSkusCreated,
      variants_mapped: result.variantsMapped,
    });
  } catch (err) {
    if (err instanceof ProductSyncError) {
      const details = (err.details && typeof err.details === 'object') ? err.details : {};
      return NextResponse.json({ error: err.message, ...details }, { status: err.status });
    }
    console.error('[Shopify Sync] Unexpected error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to sync product' }, { status: 500 });
  }
}
