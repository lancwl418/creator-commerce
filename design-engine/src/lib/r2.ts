import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { nanoid } from 'nanoid';

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucket = process.env.R2_BUCKET;
const publicBase = process.env.R2_PUBLIC_BASE_URL;

let cachedClient: S3Client | null = null;

function getClient(): S3Client {
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
  return cachedClient;
}

export async function uploadMockup(
  bytes: Uint8Array,
  contentType: string,
  ext: string,
): Promise<{ url: string; key: string }> {
  const client = getClient();
  const key = `mockups/${new Date().toISOString().slice(0, 10)}/${nanoid(16)}.${ext}`;
  await client.send(
    new PutObjectCommand({
      Bucket: bucket!,
      Key: key,
      Body: bytes,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );
  return { url: `${publicBase!.replace(/\/$/, '')}/${key}`, key };
}

/**
 * Upload a variant preview image to R2.
 * Stored under variant-previews/{productId}/{variantId}.jpg
 */
export async function uploadVariantPreview(
  bytes: Uint8Array,
  productId: string,
  variantId: string,
): Promise<{ url: string; key: string }> {
  const client = getClient();
  const key = `variant-previews/${productId}/${variantId}_${nanoid(8)}.jpg`;
  await client.send(
    new PutObjectCommand({
      Bucket: bucket!,
      Key: key,
      Body: bytes,
      ContentType: 'image/jpeg',
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );
  return { url: `${publicBase!.replace(/\/$/, '')}/${key}`, key };
}
