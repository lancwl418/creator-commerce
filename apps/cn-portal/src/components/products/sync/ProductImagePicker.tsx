import type { BlankProductImage } from '@/lib/types/product';
import { erpImage } from '@/lib/image';

export default function ProductImagePicker({ images }: { images: BlankProductImage[] }) {
  return (
    <div className="flex flex-wrap gap-3">
      {images.map((image) => (
        <label key={image.id} className="relative block w-24 h-24 rounded-xl border border-border bg-surface-secondary overflow-hidden cursor-pointer">
          <input type="checkbox" name="image" value={image.id} defaultChecked className="absolute top-1.5 left-1.5 z-10" aria-label={image.rawPath} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={erpImage(image.rawPath, 192)!} alt="" loading="lazy" className="w-full h-full object-contain p-1" />
        </label>
      ))}
    </div>
  );
}
