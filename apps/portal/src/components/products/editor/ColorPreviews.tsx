'use client';

import type { ColorVariant } from '@/lib/utils';

interface ColorPreviewsProps {
  colorVariants: ColorVariant[];
  onImageClick: (url: string) => void;
}

export default function ColorPreviews({ colorVariants, onImageClick }: ColorPreviewsProps) {
  if (colorVariants.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Colors</h3>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {colorVariants.map((v) => (
          <button
            key={v.color}
            onClick={() => onImageClick(v.imageUrl)}
            className="shrink-0 text-center group"
          >
            <div className="w-20 h-20 rounded-lg border border-border bg-gray-50 overflow-hidden transition-all group-hover:border-primary-400 group-hover:shadow-sm">
              <img src={v.imageUrl} alt={v.color} className="w-full h-full object-contain p-1" />
            </div>
            <span className="text-[10px] text-gray-500 mt-1 block truncate w-20">{v.color}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
