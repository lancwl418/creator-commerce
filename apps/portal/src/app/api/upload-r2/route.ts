import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { uploadToR2 } from '@/lib/r2';

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * POST /api/upload-r2
 * Body: FormData with `file` field, or JSON with `data_url` field
 *
 * Uploads an image to Cloudflare R2 and returns the public URL.
 * Requires authentication.
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

  const contentType = req.headers.get('content-type') || '';

  let bytes: Uint8Array;
  let mime: string;
  let ext: string;
  let folder: string;

  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData();
    const file = form.get('file');
    const uploadFolder = form.get('folder')?.toString() || 'uploads';
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file field required' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File too large' }, { status: 400 });
    }
    bytes = new Uint8Array(await file.arrayBuffer());
    mime = file.type || 'image/jpeg';
    ext = mime.includes('png') ? 'png' : 'jpg';
    folder = `${uploadFolder}/${creator.id}`;
  } else {
    // JSON body with data_url
    const body = await req.json();
    const { data_url, folder: reqFolder } = body;
    if (!data_url || !data_url.startsWith('data:')) {
      return NextResponse.json({ error: 'data_url required' }, { status: 400 });
    }
    const match = data_url.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      return NextResponse.json({ error: 'Invalid data URL' }, { status: 400 });
    }
    mime = match[1];
    const base64 = match[2];
    bytes = new Uint8Array(Buffer.from(base64, 'base64'));
    if (bytes.length > MAX_BYTES) {
      return NextResponse.json({ error: 'File too large' }, { status: 400 });
    }
    ext = mime.includes('png') ? 'png' : 'jpg';
    folder = `${reqFolder || 'uploads'}/${creator.id}`;
  }

  try {
    const { url, key } = await uploadToR2(bytes, folder, mime, ext);
    return NextResponse.json({ url, key });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500 },
    );
  }
}
