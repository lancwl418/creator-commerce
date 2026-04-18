import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const API_VERSION = process.env.SHOPIFY_API_VERSION ?? '2024-10';
const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID ?? '';
const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET ?? '';
const COST = 10.00; // MVP hardcoded cost


interface SkuSelection {
  sku_id: string;
  sku: string;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  enabled: boolean;
  price?: number | null;
  skuImage?: string | null;
}

interface ShopifyCreatedProduct {
  id: number | string;
  handle: string;
  variants: { id: number | string; sku: string; option1?: string; option2?: string; option3?: string }[];
}

/**
 * Extract numeric Shopify ID from a GID string like "gid://shopify/Product/123"
 */
function gidToId(gid: string): string {
  const match = gid.match(/(\d+)$/);
  return match ? match[1] : gid;
}

/**
 * Create a Shopify product via GraphQL Admin API (supports >100 variants).
 * Uses the productSet mutation available in API version 2024-04+.
 */
async function createProductViaGraphQL(
  shopDomain: string,
  accessToken: string,
  shopifyProduct: Record<string, unknown>,
  selectedSkus: SkuSelection[],
  optionSets: { name: string; values: string[] }[],
  retailPrice: number,
  skuPriceMap?: Map<string, number>,
  variantImageMap?: Map<string, string>,
): Promise<ShopifyCreatedProduct> {
  const graphqlUrl = `https://${shopDomain}/admin/api/${API_VERSION}/graphql.json`;

  // Build productSet input
  // Shopify VariantOptionValueInput uses { optionName: "Color", name: "Red" }
  const variants = selectedSkus.map(sku => {
    const optionValues: { optionName: string; name: string }[] = [];
    if (sku.option1 && optionSets[0]) optionValues.push({ optionName: optionSets[0].name, name: sku.option1 });
    if (sku.option2 && optionSets[1]) optionValues.push({ optionName: optionSets[1].name, name: sku.option2 });
    if (sku.option3 && optionSets[2]) optionValues.push({ optionName: optionSets[2].name, name: sku.option3 });

    // Use per-variant price from custom_product_skus, fallback to sku override, then product price
    const variantPrice = skuPriceMap?.get(sku.sku_id) ?? Number(sku.price ?? retailPrice ?? 25);

    return {
      optionValues: optionValues.length > 0 ? optionValues : [{ optionName: optionSets[0]?.name || 'Title', name: 'Default Title' }],
      price: variantPrice.toFixed(2),
      sku: sku.sku || undefined,
    };
  });

  const images = shopifyProduct.images as { src: string }[] | undefined;
  const media = images?.map(img => ({
    originalSource: img.src,
    mediaContentType: 'IMAGE',
  })) || [];

  const productSetInput: Record<string, unknown> = {
    title: shopifyProduct.title || 'Untitled',
    descriptionHtml: shopifyProduct.body_html || '',
    vendor: (shopifyProduct.vendor as string) || undefined,
    tags: typeof shopifyProduct.tags === 'string' ? shopifyProduct.tags.split(',').map((t: string) => t.trim()) : [],
    status: (shopifyProduct.status as string) === 'draft' ? 'DRAFT' : 'ACTIVE',
    productOptions: optionSets.map(o => ({
      name: o.name,
      values: o.values.map(v => ({ name: v })),
    })),
    variants,
  };

  const mutation = `
    mutation productSet($input: ProductSetInput!) {
      productSet(input: $input) {
        product {
          id
          handle
          variants(first: 250) {
            edges {
              node {
                id
                sku
                selectedOptions {
                  name
                  value
                }
              }
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  // productSet may need pagination for >250 variants; for now handle up to 250 in first response
  const res = await fetch(graphqlUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': accessToken,
    },
    body: JSON.stringify({
      query: mutation,
      variables: { input: productSetInput },
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Shopify GraphQL HTTP error (${res.status}): ${errorBody}`);
  }

  const gqlResponse = await res.json();

  if (gqlResponse.errors) {
    throw new Error(`Shopify GraphQL errors: ${JSON.stringify(gqlResponse.errors)}`);
  }

  const productSet = gqlResponse.data?.productSet;
  if (productSet?.userErrors?.length > 0) {
    throw new Error(`Shopify productSet errors: ${JSON.stringify(productSet.userErrors)}`);
  }

  const gqlProduct = productSet?.product;
  if (!gqlProduct) {
    throw new Error('Shopify GraphQL returned no product');
  }

  // Fetch remaining variants if >250
  let allVariantEdges = gqlProduct.variants.edges;
  let hasNextPage = gqlProduct.variants.edges.length === 250;
  let cursor = allVariantEdges[allVariantEdges.length - 1]?.cursor;

  while (hasNextPage && cursor) {
    const paginationQuery = `
      query getVariants($productId: ID!, $cursor: String!) {
        product(id: $productId) {
          variants(first: 250, after: $cursor) {
            edges {
              node { id sku selectedOptions { name value } }
              cursor
            }
            pageInfo { hasNextPage }
          }
        }
      }
    `;
    const pageRes = await fetch(graphqlUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': accessToken },
      body: JSON.stringify({ query: paginationQuery, variables: { productId: gqlProduct.id, cursor } }),
    });
    if (!pageRes.ok) break;
    const pageData = await pageRes.json();
    const pageVariants = pageData.data?.product?.variants;
    if (!pageVariants) break;
    allVariantEdges = [...allVariantEdges, ...pageVariants.edges];
    hasNextPage = pageVariants.pageInfo?.hasNextPage;
    cursor = pageVariants.edges[pageVariants.edges.length - 1]?.cursor;
  }

  // Upload media and associate variant images
  if (media.length > 0) {
    const mediaMutation = `
      mutation productCreateMedia($productId: ID!, $media: [CreateMediaInput!]!) {
        productCreateMedia(productId: $productId, media: $media) {
          media { id originalSource { url } }
          mediaUserErrors { field message }
        }
      }
    `;
    console.log(`[Shopify Sync] Uploading ${media.length} media items to product ${gqlProduct.id}`);
    const mediaRes = await fetch(graphqlUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': accessToken },
      body: JSON.stringify({ query: mediaMutation, variables: { productId: gqlProduct.id, media } }),
    });

    if (mediaRes.ok) {
      const mediaResult = await mediaRes.json();
      const mediaErrors = mediaResult.data?.productCreateMedia?.mediaUserErrors || [];
      if (mediaErrors.length > 0) {
        console.error('[Shopify Sync] Media upload errors:', JSON.stringify(mediaErrors));
      } else {
        console.log('[Shopify Sync] Media uploaded successfully');
      }
    } else {
      console.error('[Shopify Sync] Media upload HTTP error:', mediaRes.status, await mediaRes.text());
    }

    // Associate variant images if we have a color→image mapping
    if (variantImageMap && variantImageMap.size > 0 && mediaRes.ok) {
      // Wait briefly for Shopify to process media
      await new Promise(r => setTimeout(r, 2000));

      // Query product media to get IDs
      const mediaQuery = `
        query getProductMedia($productId: ID!) {
          product(id: $productId) {
            media(first: 100) {
              edges {
                node {
                  ... on MediaImage {
                    id
                    image { url }
                  }
                }
              }
            }
          }
        }
      `;
      const mediaQueryRes = await fetch(graphqlUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': accessToken },
        body: JSON.stringify({ query: mediaQuery, variables: { productId: gqlProduct.id } }),
      });

      if (mediaQueryRes.ok) {
        const mediaData = await mediaQueryRes.json();
        const mediaEdges = mediaData.data?.product?.media?.edges || [];

        // Build URL→mediaId lookup (Shopify may change the URL slightly, match by filename)
        const mediaIdByFilename = new Map<string, string>();
        for (const edge of mediaEdges) {
          const node = edge.node;
          if (node?.id && node?.image?.url) {
            // Extract filename from Shopify CDN URL for matching
            const filename = node.image.url.split('/').pop()?.split('?')[0] || '';
            mediaIdByFilename.set(filename, node.id);
            // Also store full URL for exact match
            mediaIdByFilename.set(node.image.url.split('?')[0], node.id);
          }
        }

        // Build variant update input: match each variant's color to its image
        const variantUpdates: { id: string; mediaId: string }[] = [];
        for (const edge of allVariantEdges) {
          const node = edge.node;
          // Get color from option1 (first option, typically Color)
          const colorOpt = node.selectedOptions?.[0]?.value;
          if (!colorOpt) continue;

          const imageUrl = variantImageMap.get(colorOpt);
          if (!imageUrl) continue;

          // Try to find matching media by filename
          const imageFilename = imageUrl.split('/').pop()?.split('?')[0] || '';
          const mediaId = mediaIdByFilename.get(imageFilename)
            || mediaIdByFilename.get(imageUrl.split('?')[0]);

          if (mediaId) {
            variantUpdates.push({ id: node.id, mediaId });
          }
        }

        // Batch update variants with their images
        if (variantUpdates.length > 0) {
          const variantMediaMutation = `
            mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
              productVariantsBulkUpdate(productId: $productId, variants: $variants) {
                userErrors { field message }
              }
            }
          `;
          await fetch(graphqlUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': accessToken },
            body: JSON.stringify({
              query: variantMediaMutation,
              variables: {
                productId: gqlProduct.id,
                variants: variantUpdates.map(v => ({
                  id: v.id,
                  mediaId: v.mediaId,
                })),
              },
            }),
          });
          console.log(`[Shopify Sync] Associated ${variantUpdates.length} variant images`);
        }
      }
    }
  }

  // Convert GQL variant format to match REST format for downstream compatibility
  const mappedVariants = allVariantEdges.map((edge: { node: { id: string; sku: string; selectedOptions: { name: string; value: string }[] } }) => {
    const node = edge.node;
    const opts: Record<string, string> = {};
    node.selectedOptions.forEach((opt: { name: string; value: string }, i: number) => {
      opts[`option${i + 1}`] = opt.value;
    });
    return {
      id: Number(gidToId(node.id)),
      sku: node.sku || '',
      ...opts,
    };
  });

  return {
    id: Number(gidToId(gqlProduct.id)),
    handle: gqlProduct.handle,
    variants: mappedVariants,
  };
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
  const { product_instance_id, store_connection_id, publish_status } = body;
  const shopifyStatus = publish_status === 'draft' ? 'draft' : 'active';

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

  // Refresh token if expired
  let accessToken = connection.access_token;
  if (connection.token_expires_at && new Date(connection.token_expires_at) <= new Date()) {
    if (!connection.refresh_token) {
      return NextResponse.json({ error: 'Token expired and no refresh token. Please reconnect.' }, { status: 400 });
    }
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
    if (!refreshRes.ok) {
      console.error('[Shopify Sync] Token refresh failed:', await refreshRes.text());
      await supabase.from('creator_store_connections').update({ status: 'expired' }).eq('id', store_connection_id);
      return NextResponse.json({ error: 'Token refresh failed. Please reconnect your store.' }, { status: 401 });
    }
    const refreshData = await refreshRes.json();
    accessToken = refreshData.access_token;
    // Save new tokens
    await supabase.from('creator_store_connections').update({
      access_token: refreshData.access_token,
      refresh_token: refreshData.refresh_token || connection.refresh_token,
      token_expires_at: refreshData.expires_in
        ? new Date(Date.now() + refreshData.expires_in * 1000).toISOString()
        : connection.token_expires_at,
    }).eq('id', store_connection_id);
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

  // ── Step 1: Resolve variants — only sync explicitly enabled ones ──
  const selectedSkus = ((product.selected_skus as SkuSelection[]) || []).filter(s => s.enabled);
  const erpProductId = (product.product_template_id as string)?.replace('erp-', '').replace('shopify-', '') || '';
  const savedOptionNames: string[] = (product.option_names as string[]) || [];

  if (selectedSkus.length === 0) {
    return NextResponse.json(
      { error: 'No variants selected. Please save your variant selection before syncing.' },
      { status: 400 }
    );
  }

  // Use base_price_suggestion as fallback for retail_price
  if (!product.retail_price && product.base_price_suggestion) {
    product.retail_price = product.base_price_suggestion;
    await supabase.from('sellable_product_instances').update({
      retail_price: product.retail_price,
    }).eq('id', product_instance_id);
  }

  // Upsert custom SKUs for each enabled variant
  const variantPreviewMap = (product.variant_preview_urls as Record<string, string>) || {};
  const customSkuRows = selectedSkus.map(sku => ({
    sellable_product_instance_id: product_instance_id,
    erp_product_id: erpProductId,
    erp_sku_id: sku.sku_id,
    sku_code: sku.sku,
    option1: sku.option1,
    option2: sku.option2,
    option3: sku.option3,
    // R2 design preview for this variant (design composited on this color)
    preview_image_url: (sku.option1 ? variantPreviewMap[sku.option1] : null) || null,
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
  // ERP images are on an HTTP internal server that Shopify can't access.
  // Proxy them through our app's /api/erp/image endpoint (public HTTPS).
  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');
  const toPublicUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('https://')) return path;
    // For ERP relative paths or HTTP URLs, proxy through our app
    if (path.startsWith('http://')) {
      // Already a full HTTP URL — extract the relative path for the proxy
      const match = path.match(/\/sys\/common\/static\/(.+)$/);
      if (match) path = match[1];
      else return ''; // Can't proxy unknown HTTP URLs
    }
    return `${appUrl}/api/erp/image?path=${encodeURIComponent(path)}`;
  };

  const previewUrls = (product.preview_urls as string[]) || [];
  const artworkUrls = (product.design_artwork_urls as string[]) || [];
  // Filter to only valid, accessible image URLs (skip broken Supabase URLs etc.)
  const imageUrls = [...previewUrls, ...artworkUrls].filter(
    url => url && url.startsWith('http') && !url.includes('supabase.co/storage')
  );

  // Use design preview images for variants if available (from R2),
  // fallback to ERP SKU images proxied through our HTTPS endpoint
  const variantImageUrls = [...new Set(
    selectedSkus
      .map(s => {
        // Try design preview by color (option1), then fallback to raw SKU image
        const designPreview = s.option1 ? variantPreviewMap[s.option1] : null;
        if (designPreview) return designPreview; // Already HTTPS R2 URL
        return s.skuImage ? toPublicUrl(s.skuImage) : '';
      })
      .filter(Boolean)
  )];

  // Merge: product images first, then variant images (deduplicated)
  const allImageUrls = [...new Set([...imageUrls, ...variantImageUrls])];

  console.log('[Shopify Sync] Images debug:', {
    previewUrls: previewUrls.length,
    artworkUrls: artworkUrls.length,
    variantImageUrls: variantImageUrls.length,
    allImageUrls: allImageUrls.length,
    firstImage: allImageUrls[0]?.substring(0, 80),
  });

  // Derive option definitions using real names from ERP (e.g. "Color", "Size")
  const optionSets: { name: string; values: string[] }[] = [];
  const optionKeys = ['option1', 'option2', 'option3'] as const;
  for (let i = 0; i < optionKeys.length; i++) {
    const key = optionKeys[i];
    const values = [...new Set(selectedSkus.map(s => s[key]).filter(Boolean))] as string[];
    if (values.length > 0) {
      optionSets.push({ name: savedOptionNames[i] || `Option ${i + 1}`, values });
    }
  }

  const shopifyProduct: Record<string, unknown> = {
    title: product.title || 'Untitled',
    body_html: product.description || '',
    vendor: 'ideamax',
    tags: 'ideamax',
    images: allImageUrls.map(url => ({ src: url })),
    status: shopifyStatus,
  };

  // Build a price lookup from custom_product_skus (per-variant sale_price is the source of truth)
  const skuPriceMap = new Map<string, number>();
  if (customSkus) {
    for (const csku of customSkus) {
      skuPriceMap.set(csku.erp_sku_id, Number(csku.sale_price));
    }
  }

  const shopDomain = connection.store_url?.replace('https://', '').replace('http://', '').replace(/\/$/, '');

  try {
    // Build color → image URL map for variant image association
    const variantImageMap = new Map<string, string>();
    for (const sku of selectedSkus) {
      if (!sku.option1) continue;
      if (variantImageMap.has(sku.option1)) continue;
      const designPreview = variantPreviewMap[sku.option1];
      if (designPreview) {
        variantImageMap.set(sku.option1, designPreview);
      } else if (sku.skuImage) {
        variantImageMap.set(sku.option1, toPublicUrl(sku.skuImage));
      }
    }

    console.log(`[Shopify Sync] Creating product with ${selectedSkus.length} variants via GraphQL, ${variantImageMap.size} variant images`);
    const createdProduct = await createProductViaGraphQL(
      shopDomain!,
      accessToken,
      shopifyProduct,
      selectedSkus,
      optionSets,
      product.retail_price ?? 25,
      skuPriceMap,
      variantImageMap,
    );

    const shopifyVariants: { id: number | string; sku: string; option1?: string; option2?: string; option3?: string }[] =
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
