import { uploadToR2 } from '@creator-commerce/shared/storage/r2';
import type { DesignFile } from '../types/bulk-order';
import { fileExtension, type FaceUpload } from './design-upload';

/** 把每个面的设计图 / 预览图传到 R2，返回采购单里存的公网地址（下单和加入批量单共用）。 */
export async function uploadDesignFiles(sellerId: string, uploads: FaceUpload[]): Promise<DesignFile[]> {
  const folder = `cn-orders/${sellerId}`;
  return Promise.all(uploads.map(async ({ face, design, preview }) => {
    const [designUpload, previewUpload] = await Promise.all([
      uploadToR2(new Uint8Array(await design.arrayBuffer()), `${folder}/designs`, design.type, fileExtension(design)),
      preview ? uploadToR2(new Uint8Array(await preview.arrayBuffer()), `${folder}/previews`, preview.type, fileExtension(preview)) : null,
    ]);
    return { face, design_url: designUpload.url, preview_url: previewUpload?.url ?? null };
  }));
}
