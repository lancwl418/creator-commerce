import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { uploadVariantPreview } from '@/lib/r2';

const ERP_IMAGE_BASE = 'http://118.195.245.201:8081/ideamax/sys/common/static/';

interface VariantInput {
  id: string;
  mockup_url: string;
  label?: string;
}

interface PrintArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface RequestBody {
  product_id: string;
  artwork_url: string;
  print_area: PrintArea;
  mockup_width: number;
  mockup_height: number;
  variants: VariantInput[];
}

/**
 * POST /api/generate-variant-previews
 *
 * Server-side composite: artwork + each variant's mockup → JPEG → R2
 * Returns a map of variant_id → R2 public URL.
 *
 * All variants share the same design parameters (position, scale).
 * Only the mockup base image differs per variant (different colors).
 */
export async function POST(req: NextRequest) {
  try {
    const body: RequestBody = await req.json();
    const { product_id, artwork_url, print_area, mockup_width, mockup_height, variants } = body;

    if (!product_id || !artwork_url || !print_area || !variants?.length) {
      return NextResponse.json(
        { error: 'Missing required fields: product_id, artwork_url, print_area, variants' },
        { status: 400 },
      );
    }

    // Fetch the artwork image once (shared across all variants)
    const artworkBuffer = await fetchImage(artwork_url);
    if (!artworkBuffer) {
      return NextResponse.json({ error: 'Failed to fetch artwork image' }, { status: 502 });
    }

    // Resize artwork to fit the print area
    const artworkResized = await sharp(artworkBuffer)
      .resize(Math.round(print_area.width), Math.round(print_area.height), { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    // Process each variant in parallel (limited concurrency)
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

          // Composite: mockup base + artwork at print_area position
          const composite = await sharp(mockupResized)
            .composite([{
              input: artworkResized,
              left: Math.round(print_area.x),
              top: Math.round(print_area.y),
            }])
            .jpeg({ quality: 85 })
            .toBuffer();

          // Upload to R2
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
 * Fetch an image from URL, handling data URLs, ERP relative paths, etc.
 */
async function fetchImage(url: string): Promise<Buffer | null> {
  try {
    // Handle base64 data URLs directly
    if (url.startsWith('data:')) {
      const match = url.match(/^data:[^;]+;base64,(.+)$/);
      if (!match) return null;
      return Buffer.from(match[1], 'base64');
    }

    let fetchUrl = url;
    if (!url.startsWith('http')) {
      fetchUrl = `${ERP_IMAGE_BASE}${url}`;
    }
    const res = await fetch(fetchUrl);
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}
