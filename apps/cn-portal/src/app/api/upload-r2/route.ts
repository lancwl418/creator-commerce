import { NextRequest, NextResponse } from 'next/server';
import { uploadToR2 } from '@creator-commerce/shared/storage/r2';
import { getCurrentSeller } from '@/lib/queries/sellers';

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

/** POST /api/upload-r2  Body: { data_url, folder? }。设计器保存时上传预览图和图稿。 */
export async function POST(req: NextRequest) {
  const seller = await getCurrentSeller();
  if (!seller) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = (await req.json()) as { data_url?: string; folder?: string };
  const match = typeof body.data_url === 'string' ? body.data_url.match(/^data:([^;]+);base64,(.+)$/) : null;
  if (!match) return NextResponse.json({ error: 'data_url required' }, { status: 400 });

  const mime = match[1];
  const bytes = new Uint8Array(Buffer.from(match[2], 'base64'));
  if (bytes.length > MAX_BYTES) return NextResponse.json({ error: 'File too large' }, { status: 400 });

  try {
    const { url, key } = await uploadToR2(bytes, `${body.folder || 'uploads'}/${seller.id}`, mime, mime.includes('png') ? 'png' : 'jpg');
    return NextResponse.json({ url, key });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Upload failed' }, { status: 500 });
  }
}
