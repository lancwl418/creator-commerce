'use client';

import { useState } from 'react';
import type { PrintFace } from '@/lib/products/print-faces';
import { t, type MessageKey } from '@/lib/i18n';

const FACE_LABELS: Record<string, MessageKey> = {
  front: 'face.front', back: 'face.back', left: 'face.left', right: 'face.right', full: 'face.full',
};

export function faceLabel(face: string): string {
  return FACE_LABELS[face] ? t(FACE_LABELS[face]) : face;
}

/** 每个印刷面：设计图（必填其一）+ 预览图（可选），选中后本地预览。 */
export default function DesignUploadFields({ faces }: { faces: PrintFace[] }) {
  const [previews, setPreviews] = useState<Record<string, string>>({});

  function onPick(key: string, file: File | undefined) {
    setPreviews((prev) => {
      const next = { ...prev };
      if (next[key]) URL.revokeObjectURL(next[key]);
      if (file && file.type.startsWith('image/')) next[key] = URL.createObjectURL(file);
      else delete next[key];
      return next;
    });
  }

  return (
    <div className="space-y-4">
      {faces.map(({ face }) => (
        <div key={face} className="rounded-xl border border-border p-4">
          <p className="text-sm font-semibold text-gray-800 mb-3">{faceLabel(face)}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(['design', 'preview'] as const).map((kind) => {
              const key = `${kind}:${face}`;
              return (
                <div key={kind}>
                  <label htmlFor={key} className="block text-xs font-medium text-gray-600 mb-1.5">{t(kind === 'design' ? 'order.upload.design' : 'order.upload.preview')}</label>
                  <input id={key} name={key} type="file"
                    accept={kind === 'design' ? 'image/png,image/jpeg,image/svg+xml,application/pdf' : 'image/png,image/jpeg,image/webp'}
                    onChange={(event) => onPick(key, event.target.files?.[0])}
                    className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-200" />
                  {previews[key] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previews[key]} alt="" className="mt-2 h-24 w-24 rounded-lg border border-border bg-surface-secondary object-contain p-1" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <p className="text-xs text-gray-400">{t('order.upload.hint')}</p>
    </div>
  );
}
