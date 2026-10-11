import type { ShopifyAppConfig } from './oauth';
import type { SkuSelection } from './listing-prices';

// 在 Shopify 创建商品（GraphQL Admin API）。从 Creator Portal 的 sync-product 路由原样迁入，
// 两个 app 共用；只把 API 版本改成从配置读取。

export interface ShopifyCreatedProduct {
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
export async function createProductViaGraphQL(
  config: ShopifyAppConfig,
  shopDomain: string,
  accessToken: string,
  shopifyProduct: Record<string, unknown>,
  selectedSkus: SkuSelection[],
  optionSets: { name: string; values: string[] }[],
  retailPrice: number,
  skuPriceMap?: Map<string, number>,
  variantImageMap?: Map<string, string>,
): Promise<ShopifyCreatedProduct> {
  const graphqlUrl = `https://${shopDomain}/admin/api/${config.apiVersion}/graphql.json`;

  // Build productSet input
  // Shopify VariantOptionValueInput uses { optionName: "Color", name: "Red" }
  const variants = selectedSkus.map(sku => {
    const optionValues: { optionName: string; name: string }[] = [];
    if (sku.option1 && optionSets[0]) optionValues.push({ optionName: optionSets[0].name, name: sku.option1 });
    if (sku.option2 && optionSets[1]) optionValues.push({ optionName: optionSets[1].name, name: sku.option2 });
    if (sku.option3 && optionSets[2]) optionValues.push({ optionName: optionSets[2].name, name: sku.option3 });

    // Use per-variant price from custom_product_skus, fallback to sku override, then product price
    const variantPrice = skuPriceMap?.get(sku.sku_id) ?? Number(sku.price ?? retailPrice);

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

  // Publish to Online Store and other sales channels if status is active
  if ((shopifyProduct.status as string) !== 'draft') {
    try {
      // Get all publications (sales channels)
      const pubQuery = `
        query { publications(first: 20) { edges { node { id name } } } }
      `;
      const pubRes = await fetch(graphqlUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': accessToken },
        body: JSON.stringify({ query: pubQuery }),
      });
      if (pubRes.ok) {
        const pubData = await pubRes.json();
        const publications = (pubData.data?.publications?.edges || [])
          .map((e: { node: { id: string; name: string } }) => e.node);

        if (publications.length > 0) {
          const publishMutation = `
            mutation publishablePublish($id: ID!, $input: [PublicationInput!]!) {
              publishablePublish(id: $id, input: $input) {
                userErrors { field message }
              }
            }
          `;
          await fetch(graphqlUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': accessToken },
            body: JSON.stringify({
              query: publishMutation,
              variables: {
                id: gqlProduct.id,
                input: publications.map((p: { id: string }) => ({ publicationId: p.id })),
              },
            }),
          });
          console.log(`[Shopify Sync] Published to ${publications.length} channels: ${publications.map((p: { name: string }) => p.name).join(', ')}`);
        }
      }
    } catch (e) {
      console.warn('[Shopify Sync] Publication failed (non-blocking):', e);
    }
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

  // Upload images via staged uploads (push to Shopify instead of Shopify pulling from URL)
  if (media.length > 0) {
    console.log(`[Shopify Sync] Uploading ${media.length} images via staged uploads`);

    // Step 1: Create staged upload targets
    const stagedMutation = `
      mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
        stagedUploadsCreate(input: $input) {
          stagedTargets {
            url
            resourceUrl
            parameters { name value }
          }
          userErrors { field message }
        }
      }
    `;

    const stagedInput = media.map((m: { originalSource: string }) => ({
      resource: 'IMAGE',
      filename: m.originalSource.split('/').pop()?.split('?')[0] || 'image.jpg',
      mimeType: m.originalSource.includes('.png') ? 'image/png' : 'image/jpeg',
      httpMethod: 'PUT',
    }));

    const stagedRes = await fetch(graphqlUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': accessToken },
      body: JSON.stringify({ query: stagedMutation, variables: { input: stagedInput } }),
    });

    if (!stagedRes.ok) {
      console.error('[Shopify Sync] Staged uploads request failed:', stagedRes.status);
    } else {
      const stagedData = await stagedRes.json();
      const targets = stagedData.data?.stagedUploadsCreate?.stagedTargets || [];
      const stagedErrors = stagedData.data?.stagedUploadsCreate?.userErrors || [];
      if (stagedErrors.length > 0) {
        console.error('[Shopify Sync] Staged upload errors:', JSON.stringify(stagedErrors));
      }

      // Step 2: Download each image and upload to Shopify's staged URL
      const uploadedResourceUrls: string[] = [];

      for (let i = 0; i < Math.min(media.length, targets.length); i++) {
        const imageUrl = (media[i] as { originalSource: string }).originalSource;
        const target = targets[i];

        try {
          // Download image from our URL (R2/proxy)
          const imgRes = await fetch(imageUrl);
          if (!imgRes.ok) {
            console.error(`[Shopify Sync] Failed to download image: ${imageUrl.substring(0, 80)}`);
            continue;
          }
          const imgBuffer = await imgRes.arrayBuffer();

          // Upload to Shopify's staged URL
          const uploadRes = await fetch(target.url, {
            method: 'PUT',
            headers: { 'Content-Type': imageUrl.includes('.png') ? 'image/png' : 'image/jpeg' },
            body: imgBuffer,
          });

          if (uploadRes.ok) {
            uploadedResourceUrls.push(target.resourceUrl);
          } else {
            console.error(`[Shopify Sync] Staged upload failed for image ${i}:`, uploadRes.status);
          }
        } catch (err) {
          console.error(`[Shopify Sync] Error uploading image ${i}:`, err);
        }
      }

      console.log(`[Shopify Sync] Staged uploads complete: ${uploadedResourceUrls.length}/${media.length}`);

      // Step 3: Attach uploaded images to product
      if (uploadedResourceUrls.length > 0) {
        const attachMutation = `
          mutation productCreateMedia($productId: ID!, $media: [CreateMediaInput!]!) {
            productCreateMedia(productId: $productId, media: $media) {
              media { id }
              mediaUserErrors { field message }
            }
          }
        `;
        const attachMedia = uploadedResourceUrls.map(url => ({
          originalSource: url,
          mediaContentType: 'IMAGE',
        }));

        const attachRes = await fetch(graphqlUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': accessToken },
          body: JSON.stringify({ query: attachMutation, variables: { productId: gqlProduct.id, media: attachMedia } }),
        });

        if (attachRes.ok) {
          const attachData = await attachRes.json();
          const attached = attachData.data?.productCreateMedia?.media || [];
          const attachErrors = attachData.data?.productCreateMedia?.mediaUserErrors || [];
          console.log(`[Shopify Sync] Attached ${attached.length} images to product, errors: ${attachErrors.length}`);
          if (attachErrors.length > 0) {
            console.error('[Shopify Sync] Attach errors:', JSON.stringify(attachErrors));
          }
        }

        // Step 4: Associate variant images
        if (variantImageMap && variantImageMap.size > 0) {
          await new Promise(r => setTimeout(r, 3000));

          const mediaQuery = `
            query getProductMedia($productId: ID!) {
              product(id: $productId) {
                media(first: 100) {
                  edges { node { ... on MediaImage { id image { url } } } }
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

            const mediaIdByFilename = new Map<string, string>();
            for (const edge of mediaEdges) {
              const node = edge.node;
              if (node?.id && node?.image?.url) {
                const filename = node.image.url.split('/').pop()?.split('?')[0] || '';
                mediaIdByFilename.set(filename, node.id);
              }
            }

            const variantUpdates: { id: string; mediaId: string }[] = [];
            for (const edge of allVariantEdges) {
              const node = edge.node;
              const colorOpt = node.selectedOptions?.[0]?.value;
              if (!colorOpt) continue;
              const imageUrl = variantImageMap.get(colorOpt);
              if (!imageUrl) continue;
              const imageFilename = imageUrl.split('/').pop()?.split('?')[0] || '';
              const mediaId = mediaIdByFilename.get(imageFilename);
              if (mediaId) {
                variantUpdates.push({ id: node.id, mediaId });
              }
            }

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
                    variants: variantUpdates.map(v => ({ id: v.id, mediaId: v.mediaId })),
                  },
                }),
              });
              console.log(`[Shopify Sync] Associated ${variantUpdates.length} variant images`);
            }
          }
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
