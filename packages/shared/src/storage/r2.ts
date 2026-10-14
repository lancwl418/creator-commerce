import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';

// Cloudflare R2 上传（设计预览图、图稿）。各 app 共用同一组 R2_* 环境变量。

let cachedClient: S3Client | null = null;

function getClient(): { client: S3Client; bucket: string; publicBase: string } {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  const publicBase = process.env.R2_PUBLIC_BASE_URL;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicBase) {
    throw new Error('R2 env vars missing (R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET / R2_PUBLIC_BASE_URL)');
  }
  if (!cachedClient) {
    cachedClient = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return { client: cachedClient, bucket, publicBase };
}

/** Upload an image to R2. Used for design previews and artworks. */
export async function uploadToR2(
  bytes: Uint8Array,
  folder: string,
  contentType: string,
  ext: string,
): Promise<{ url: string; key: string }> {
  const { client, bucket, publicBase } = getClient();
  const key = `${folder}/${randomUUID()}.${ext}`;
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: bytes,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );
  return { url: `${publicBase.replace(/\/$/, '')}/${key}`, key };
}

/** R2 object 的公网地址（key 已知时直接拼，不发请求）。 */
export function r2PublicUrl(key: string): string {
  const { publicBase } = getClient();
  return `${publicBase.replace(/\/$/, '')}/${key}`;
}

/** 判断某个 key 是否已存在（缩略图缓存查重用）。 */
export async function r2ObjectExists(key: string): Promise<boolean> {
  const { client, bucket } = getClient();
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

/** 按指定 key 上传（确定性 key，便于查重 / 复用），返回公网地址。 */
export async function uploadToR2AtKey(
  bytes: Uint8Array,
  key: string,
  contentType: string,
): Promise<string> {
  const { client, bucket } = getClient();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: bytes,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );
  return r2PublicUrl(key);
}
