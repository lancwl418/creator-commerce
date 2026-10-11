import type { MessageKey } from '../i18n';
import type { PrintFace } from '../products/print-faces';

/** 每面最大文件大小 */
export const MAX_DESIGN_FILE_BYTES = 20 * 1024 * 1024;
export const DESIGN_FILE_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'application/pdf'];
export const PREVIEW_FILE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export interface FaceUpload {
  face: string;
  design: File;
  preview: File | null;
}

export type ParsedFaceUploads =
  | { ok: true; uploads: FaceUpload[] }
  | { ok: false; error: MessageKey };

function fileOrNull(value: FormDataEntryValue | null): File | null {
  return value instanceof File && value.size > 0 ? value : null;
}

/** 表单字段 design:<face> / preview:<face>；至少一面有设计图，有预览图的面必须也有设计图。 */
export function parseFaceUploads(form: FormData, faces: PrintFace[]): ParsedFaceUploads {
  const uploads: FaceUpload[] = [];
  for (const { face } of faces) {
    const design = fileOrNull(form.get(`design:${face}`));
    const preview = fileOrNull(form.get(`preview:${face}`));
    if (!design) {
      if (preview) return { ok: false, error: 'order.error.previewWithoutDesign' };
      continue;
    }
    if (!DESIGN_FILE_TYPES.includes(design.type) || design.size > MAX_DESIGN_FILE_BYTES) return { ok: false, error: 'order.error.designFile' };
    if (preview && (!PREVIEW_FILE_TYPES.includes(preview.type) || preview.size > MAX_DESIGN_FILE_BYTES)) return { ok: false, error: 'order.error.previewFile' };
    uploads.push({ face, design, preview });
  }
  if (uploads.length === 0) return { ok: false, error: 'order.error.noDesign' };
  return { ok: true, uploads };
}

export function fileExtension(file: File): string {
  const byType: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/svg+xml': 'svg', 'application/pdf': 'pdf', 'image/webp': 'webp' };
  return byType[file.type] ?? (file.name.split('.').pop()?.toLowerCase() || 'bin');
}
