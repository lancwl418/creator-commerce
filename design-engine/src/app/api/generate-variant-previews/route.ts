import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { uploadVariantPreview } from '@/lib/r2';

const ERP_IMAGE_BASE = 'http://118.195.245.201:8081/ideamax/sys/common/static/';

interface VariantInput {
  id: string;
  mockup_url: string;
  label?: string;
}

interface LayerTransform {
  x: number;
  y: number;
  width: number;
  height: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  flipX?: boolean;
  flipY?: boolean;
}

interface LayerInput {
  type: string;
  visible: boolean;
  opacity?: number;
  transform: LayerTransform;
  data: {
    type: string;
    src?: string;
  };
}

interface RequestBody {
  product_id: string;
  layers: LayerInput[];
  mockup_width: number;
  mockup_height: number;
  variants: VariantInput[];
}

/**
 * POST /api/generate-variant-previews
 *
 * Server-side composite: artwork layers + each variant's mockup → JPEG → R2
 * Uses exact layer transforms (x, y, width, height, scaleX, scaleY) to match
 * what the user sees in the editor.
 */
export async function POST(req: NextRequest) {
  try {
    const body: RequestBody = await req.json();
    const { product_id, layers, mockup_width, mockup_height, variants } = body;

    if (!product_id || !layers?.length || !variants?.length) {
      return NextResponse.json(
        { error: 'Missing required fields: product_id, layers, variants' },
        { status: 400 },
      );
    }

    // Prepare artwork layers: fetch each image once and resize per transform
    const artworkLayers: { buffer: Buffer; transform: LayerTransform; opacity: number }[] = [];
    for (const layer of layers) {
      if (!layer.visible || layer.data.type !== 'image' || !layer.data.src) continue;

      const imgBuffer = await fetchImage(layer.data.src);
      if (!imgBuffer) {
        console.warn(`[Variant Preview] Failed to fetch layer image: ${layer.data.src.substring(0, 80)}`);
        continue;
      }

      // Resize artwork to its rendered size on the mockup (width * scaleX, height * scaleY)
      const renderW = Math.round((layer.transform.width || 100) * (layer.transform.scaleX || 1));
      const renderH = Math.round((layer.transform.height || 100) * (layer.transform.scaleY || 1));

      const resized = await sharp(imgBuffer)
        .resize(renderW, renderH, { fit: 'fill' })
        .png()
        .toBuffer();

      artworkLayers.push({
        buffer: resized,
        transform: layer.transform,
        opacity: layer.opacity ?? 1,
      });
    }

    if (artworkLayers.length === 0) {
      return NextResponse.json({ error: 'No valid artwork layers found' }, { status: 400 });
    }

    // Process each variant
    const CONCURRENCY = 5;
    const results: Record<string, string> = {};
    const errors: Record<string, string> = {};

    for (let i = 0; i < variants.length; i += CONCURRENCY) {
      const batch = variants.slice(i, i + CONCURRENCY);
      const batchResults = await Promise.allSettled(
        batch.map(async (variant) => {
          const mockupBuffer = await fetchImage(variant.mockup_url);
          if (!mockupBuffer) {
            throw new Error(`Failed to fetch mockup for variant ${variant.id}`);
          }

          // Resize mockup to target dimensions
          const mockupResized = await sharp(mockupBuffer)
            .resize(mockup_width, mockup_height, { fit: 'cover' })
            .png()
            .toBuffer();

          // Composite all artwork layers onto mockup at their exact positions
          const compositeInputs = artworkLayers.map((layer) => ({
            input: layer.buffer,
            left: Math.round(layer.transform.x),
            top: Math.round(layer.transform.y),
          }));

          const composite = await sharp(mockupResized)
            .composite(compositeInputs)
            .jpeg({ quality: 85 })
            .toBuffer();

          const { url } = await uploadVariantPreview(
            new Uint8Array(composite),
            product_id,
            variant.id,
          );

          return { id: variant.id, url };
        }),
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results[result.value.id] = result.value.url;
        } else {
          const variantId = batch[batchResults.indexOf(result)]?.id ?? 'unknown';
          errors[variantId] = result.reason?.message || 'Unknown error';
          console.error(`[Variant Preview] Failed for ${variantId}:`, result.reason);
        }
      }
    }

    return NextResponse.json({
      product_id,
      previews: results,
      errors: Object.keys(errors).length > 0 ? errors : undefined,
      total: variants.length,
      success: Object.keys(results).length,
      failed: Object.keys(errors).length,
    });
  } catch (err) {
    console.error('[Generate Variant Previews] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * Fetch an image buffer from a URL, data URL, or ERP relative path.
 */
async function fetchImage(url: string): Promise<Buffer | null> {
  try {
    // Handle base64 data URLs directly
    if (url.startsWith('data:')) {
      const match = url.match(/^data:[^;]+;base64,(.+)$/);
      if (!match) return null;
      return Buffer.from(match[1], 'base64');
    }

    // ERP relative paths → prepend base URL
    const fetchUrl = url.startsWith('http') ? url : `${ERP_IMAGE_BASE}${url}`;

    const res = await fetch(fetchUrl);
    if (!res.ok) {
      console.error(`[fetchImage] Failed ${res.status} for: ${fetchUrl.substring(0, 100)}`);
      return null;
    }
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err) {
    console.error(`[fetchImage] Error fetching: ${url.substring(0, 100)}`, err);
    return null;
  }
}
