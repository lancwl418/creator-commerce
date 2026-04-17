import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const API_VERSION = process.env.SHOPIFY_API_VERSION ?? '2025-01';
const COST = 10.00; // MVP hardcoded cost

interface SkuSelection {
  sku_id: string;
  sku: string;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  enabled: boolean;
  price?: number | null;
}

/**
 * POST /api/shopify/sync-product
 * Body: { product_instance_id, store_connection_id }
 *
 * 1. Creates custom_product_skus for each enabled variant
 * 2. Creates product on Shopify via Admin API
 * 3. Records channel_listing + channel_listing_variants
 * 4. Maps Shopify variant IDs back to custom SKUs
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

  // Fetch product
  const { data: product, error: productError } = await supabase
    .from('sellable_product_instances')
    .select('*')
    .eq('id', product_instance_id)
    .eq('creator_id', creator.id)
    .single();

  if (productError || !product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  // Fetch store connection
  const { data: connection, error: connError } = await supabase
    .from('creator_store_connections')
    .select('*')
    .eq('id', store_connection_id)
    .eq('creator_id', creator.id)
    .single();

  if (connError || !connection) {
    return NextResponse.json({ error: 'Store connection not found' }, { status: 404 });
  }

  if (connection.status !== 'connected' || !connection.access_token) {
    return NextResponse.json({ error: 'Store is not connected. Please reconnect.' }, { status: 400 });
  }

  // Check if already synced
  const { data: existingListing } = await supabase
    .from('channel_listings')
    .select('id, external_product_id')
    .eq('sellable_product_instance_id', product_instance_id)
    .eq('creator_store_connection_id', store_connection_id)
    .single();

  if (existingListing) {
    return NextResponse.json({ error: 'Product is already synced to this store', listing: existingListing }, { status: 409 });
  }

  // ── Step 1: Create custom_product_skus ──
  const selectedSkus = ((product.selected_skus as SkuSelection[]) || []).filter(s => s.enabled);
  const erpProductId = (product.product_template_id as string)?.replace('erp-', '').replace('shopify-', '') || '';

  // Upsert custom SKUs for each enabled variant
  const customSkuRows = selectedSkus.map(sku => ({
    sellable_product_instance_id: product_instance_id,
    erp_product_id: erpProductId,
    erp_sku_id: sku.sku_id,
    sku_code: sku.sku,
    option1: sku.option1,
    option2: sku.option2,
    option3: sku.option3,
    sale_price: sku.price ?? product.retail_price ?? 25,
    base_cost_snapshot: COST,
    creator_store_connection_id: store_connection_id,
    is_active: true,
    erp_sync_status: 'pending',
  }));

  const { data: customSkus, error: skuError } = await supabase
    .from('custom_product_skus')
    .upsert(customSkuRows, { onConflict: 'sellable_product_instance_id,erp_sku_id,creator_store_connection_id' })
    .select('*');

  if (skuError) {
    console.error('[Sync] Failed to create custom SKUs:', skuError);
    return NextResponse.json({ error: 'Failed to create custom SKUs: ' + skuError.message }, { status: 500 });
  }

  // ── Step 2: Build & send Shopify product ──
  const previewUrls = (product.preview_urls as string[]) || [];
  const artworkUrls = (product.design_artwork_urls as string[]) || [];
  const imageUrls = [...previewUrls, ...artworkUrls].filter(
    url => url && url.startsWith('http')
  );

  // Derive option definitions
  const optionSets: { name: string; values: string[] }[] = [];
  for (const key of ['option1', 'option2', 'option3'] as const) {
    const values = [...new Set(selectedSkus.map(s => s[key]).filter(Boolean))] as string[];
    if (values.length > 0) {
      optionSets.push({ name: `Option ${key.slice(-1)}`, values });
    }
  }

  const shopifyProduct: Record<string, unknown> = {
    title: product.title || 'Untitled',
    body_html: product.description || '',
    images: imageUrls.map(url => ({ src: url })),
    status: 'active',
  };

  if (optionSets.length > 0) {
    shopifyProduct.options = optionSets.map(o => ({ name: o.name }));
  }

  if (selectedSkus.length > 0) {
    shopifyProduct.variants = selectedSkus.map(sku => {
      const variant: Record<string, unknown> = {
        price: String(sku.price ?? product.retail_price ?? 25),
        sku: sku.sku || undefined,
        inventory_management: null,
      };
      if (sku.option1) variant.option1 = sku.option1;
      if (sku.option2) variant.option2 = sku.option2;
      if (sku.option3) variant.option3 = sku.option3;
      return variant;
    });
  }

  const shopDomain = connection.store_url?.replace('https://', '').replace('http://', '').replace(/\/$/, '');

  try {
    const shopifyRes = await fetch(
      `https://${shopDomain}/admin/api/${API_VERSION}/products.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': connection.access_token,
        },
        body: JSON.stringify({ product: shopifyProduct }),
      }
    );

    if (!shopifyRes.ok) {
      const errorBody = await shopifyRes.text();
      console.error('[Shopify Sync] Create product failed:', shopifyRes.status, errorBody);
      return NextResponse.json(
        { error: `Shopify API error (${shopifyRes.status}): ${errorBody}` },
        { status: shopifyRes.status }
      );
    }

    const { product: createdProduct } = await shopifyRes.json();
    const shopifyVariants: { id: number; sku: string; option1?: string; option2?: string; option3?: string }[] =
      createdProduct.variants || [];

    // ── Step 3: Record channel listing ──
    const externalUrl = `https://${shopDomain}/products/${createdProduct.handle}`;
    const { data: listing, error: listingError } = await supabase
      .from('channel_listings')
      .insert({
        sellable_product_instance_id: product_instance_id,
        channel_type: 'creator_store',
        creator_store_connection_id: store_connection_id,
        external_product_id: String(createdProduct.id),
        external_listing_url: externalUrl,
        price: product.retail_price,
        currency: 'USD',
        status: 'active',
        published_at: new Date().toISOString(),
        metadata: {
          shopify_product_id: createdProduct.id,
          shopify_handle: createdProduct.handle,
          variant_count: shopifyVariants.length,
        },
      })
      .select('*')
      .single();

    if (listingError) {
      console.error('[Shopify Sync] Failed to save listing:', listingError);
    }

    // ── Step 4: Create channel_listing_variants & map Shopify variant IDs ──
    if (listing && customSkus && customSkus.length > 0) {
      const listingVariantRows = customSkus.map(csku => {
        // Match Shopify variant by option values
        const shopifyVariant = shopifyVariants.find(sv =>
          (sv.option1 || null) === (csku.option1 || null) &&
          (sv.option2 || null) === (csku.option2 || null) &&
          (sv.option3 || null) === (csku.option3 || null)
        ) || shopifyVariants.find(sv => sv.sku === csku.sku_code);

        return {
          channel_listing_id: listing.id,
          custom_product_sku_id: csku.id,
          sale_price: csku.sale_price,
          base_cost_snapshot: csku.base_cost_snapshot,
          external_variant_id: shopifyVariant ? String(shopifyVariant.id) : null,
          is_active: true,
        };
      });

      const { error: lvError } = await supabase
        .from('channel_listing_variants')
        .insert(listingVariantRows);

      if (lvError) {
        console.error('[Shopify Sync] Failed to save listing variants:', lvError);
      }

      // Update custom_product_skus with Shopify variant IDs
      for (const csku of customSkus) {
        const shopifyVariant = shopifyVariants.find(sv =>
          (sv.option1 || null) === (csku.option1 || null) &&
          (sv.option2 || null) === (csku.option2 || null) &&
          (sv.option3 || null) === (csku.option3 || null)
        );
        if (shopifyVariant) {
          await supabase
            .from('custom_product_skus')
            .update({
              external_variant_ids: {
                ...(csku.external_variant_ids as Record<string, string> || {}),
                shopify: String(shopifyVariant.id),
              },
            })
            .eq('id', csku.id);
        }
      }
    }

    // ── Step 5: Update product status ──
    await supabase
      .from('sellable_product_instances')
      .update({ status: 'listed' })
      .eq('id', product_instance_id);

    await supabase
      .from('creator_store_connections')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', store_connection_id);

    return NextResponse.json({
      success: true,
      shopify_product_id: createdProduct.id,
      shopify_url: externalUrl,
      listing_id: listing?.id,
      custom_skus_created: customSkus?.length || 0,
      variants_mapped: shopifyVariants.length,
    });
  } catch (err) {
    console.error('[Shopify Sync] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to sync product' },
      { status: 500 }
    );
  }
}
