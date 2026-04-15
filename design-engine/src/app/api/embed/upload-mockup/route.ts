import { NextResponse } from 'next/server';
import { uploadMockup } from '@/lib/r2';
import { validateEmbedAuthFromRequest } from '@/lib/embedAuth';

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']);

const EXT_BY_TYPE: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type, x-embed-key',
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function POST(req: Request) {
  const auth = validateEmbedAuthFromRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.reason }, { status: 401, headers: corsHeaders() });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file field required' }, { status: 400, headers: corsHeaders() });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: `unsupported type: ${file.type}` }, { status: 400, headers: corsHeaders() });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: `file too large (max ${MAX_BYTES} bytes)` }, { status: 400, headers: corsHeaders() });
  }

  try {
    const buf = new Uint8Array(await file.arrayBuffer());
    const { url, key } = await uploadMockup(buf, file.type, EXT_BY_TYPE[file.type]);
    return NextResponse.json({ url, key }, { headers: corsHeaders() });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'upload failed';
    return NextResponse.json({ error: msg }, { status: 500, headers: corsHeaders() });
  }
}
