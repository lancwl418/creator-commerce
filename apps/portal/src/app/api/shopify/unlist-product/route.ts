import { NextRequest, NextResponse } from 'next/server';
import { SHOPIFY_API_VERSION, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET } from '@/lib/constants';
import { createClient } from '@/lib/supabase/server';

/**
 * Build a Shopify Product GID from a stored external product id.
 * Stored ids are numeric strings; tolerate already-formatted GIDs too.
 */
function toProductGid(externalProductId: string): string {
  if (externalProductId.startsWith('gid://')) return externalProductId;
  return `gid://shopify/Product/${externalProductId}`;
}

/**
 * Delete a product from Shopify via the Admin GraphQL API.
 * Returns { ok, warning } — best-effort: a missing product is treated as success.
 */
async function deleteShopifyProduct(
  shopDomain: string,
  accessToken: string,
  externalProductId: string,
): Promise<{ ok: boolean; warning?: string }> {
  const graphqlUrl = `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;
  const mutation = `
    mutation productDelete($input: ProductDeleteInput!) {
      productDelete(input: $input) {
        deletedProductId
        userErrors { field message }
      }
    }
  `;

  const res = await fetch(graphqlUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': accessToken },
    body: JSON.stringify({
      query: mutation,
      variables: { input: { id: toProductGid(externalProductId) } },
    }),
  });

  if (!res.ok) {
    return { ok: false, warning: `Shopify returned HTTP ${res.status}` };
  }

  const data = await res.json();
  if (data.errors) {
    return { ok: false, warning: `Shopify error: ${JSON.stringify(data.errors)}` };
  }

  const userErrors = data.data?.productDelete?.userErrors || [];
  if (userErrors.length > 0) {
    // If the product no longer exists on Shopify, treat as already removed.
    const msg = JSON.stringify(userErrors);
    if (/does not exist|not found/i.test(msg)) {
      return { ok: true, warning: 'Product was already removed from the store.' };
    }
    return { ok: false, warning: `Shopify error: ${msg}` };
  }

  return { ok: true };
}

/**
 * POST /api/shopify/unlist-product
 * Body: { product_instance_id, store_connection_id }
 *
 * Takes a synced product down from BOTH the connected store and our hub:
 *  1. Deletes the product on Shopify (best-effort).
 *  2. Removes the channel_listing + channel_listing_variants rows so it can be re-synced.
 *  3. Reverts the product status to "ready" when it has no remaining active listings.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();

  // Auth
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
  const { product_instance_id, store_connection_id } = body;

  if (!product_instance_id || !store_connection_id) {
    return NextResponse.json({ error: 'Missing product_instance_id or store_connection_id' }, { status: 400 });
  }

  // Verify the product belongs to this creator
  const { data: product } = await supabase
    .from('sellable_product_instances')
    .select('id, status')
    .eq('id', product_instance_id)
    .eq('creator_id', creator.id)
    .single();

  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  // Find the listing for this store
  const { data: listing } = await supabase
    .from('channel_listings')
    .select('id, external_product_id, status')
    .eq('sellable_product_instance_id', product_instance_id)
    .eq('creator_store_connection_id', store_connection_id)
    .neq('status', 'removed')
    .maybeSingle();

  if (!listing) {
    return NextResponse.json({ error: 'No active listing found for this store' }, { status: 404 });
  }

  // Fetch store connection
  const { data: connection } = await supabase
    .from('creator_store_connections')
    .select('*')
    .eq('id', store_connection_id)
    .eq('creator_id', creator.id)
    .single();

  let warning: string | undefined;

  // Best-effort removal from the store
  if (connection && connection.access_token && listing.external_product_id) {
    let accessToken = connection.access_token;

    // Refresh token if expired
    if (connection.token_expires_at && new Date(connection.token_expires_at) <= new Date() && connection.refresh_token) {
      const shopDomainForRefresh = connection.store_url?.replace('https://', '').replace('http://', '').replace(/\/$/, '');
      const refreshRes = await fetch(`https://${shopDomainForRefresh}/admin/oauth/access_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: SHOPIFY_CLIENT_ID,
          client_secret: SHOPIFY_CLIENT_SECRET,
          grant_type: 'refresh_token',
          refresh_token: connection.refresh_token,
        }),
      });
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        accessToken = refreshData.access_token;
        await supabase.from('creator_store_connections').update({
          access_token: refreshData.access_token,
          refresh_token: refreshData.refresh_token || connection.refresh_token,
          token_expires_at: refreshData.expires_in
            ? new Date(Date.now() + refreshData.expires_in * 1000).toISOString()
            : connection.token_expires_at,
        }).eq('id', store_connection_id);
      } else {
        warning = 'Store token expired — removed from hub but could not reach the store.';
      }
    }

    if (!warning) {
      const shopDomain = connection.store_url?.replace('https://', '').replace('http://', '').replace(/\/$/, '');
      if (shopDomain) {
        const result = await deleteShopifyProduct(shopDomain, accessToken, listing.external_product_id);
        if (!result.ok) {
          // Don't strand the product on the store: report and stop so the user can retry.
          return NextResponse.json(
            { error: `Could not remove the product from the store. ${result.warning || ''}`.trim() },
            { status: 502 },
          );
        }
        warning = result.warning;
      }
    }
  } else if (!connection || connection.status !== 'connected') {
    warning = 'Store is disconnected — removed from hub only.';
  }

  // Remove the listing variants then the listing itself (allows a clean re-sync)
  await supabase.from('channel_listing_variants').delete().eq('channel_listing_id', listing.id);
  const { error: deleteError } = await supabase.from('channel_listings').delete().eq('id', listing.id);

  if (deleteError) {
    return NextResponse.json({ error: 'Failed to remove listing record' }, { status: 500 });
  }

  // Revert product status when no active listings remain
  const { count } = await supabase
    .from('channel_listings')
    .select('id', { count: 'exact', head: true })
    .eq('sellable_product_instance_id', product_instance_id)
    .neq('status', 'removed');

  if ((count ?? 0) === 0 && product.status === 'listed') {
    await supabase.from('sellable_product_instances').update({ status: 'ready' }).eq('id', product_instance_id);
  }

  return NextResponse.json({ success: true, warning });
}
