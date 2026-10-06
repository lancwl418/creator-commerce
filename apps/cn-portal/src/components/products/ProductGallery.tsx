import { erpImage } from '@/lib/image';
import { t } from '@/lib/i18n';

interface ProductGalleryProps {
  images: string[];
  name: string;
}

export default function ProductGallery({ images, name }: ProductGalleryProps) {
  return (
    <div>
      <div className="aspect-square bg-white rounded-2xl border border-border flex items-center justify-center overflow-hidden">
        {images[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={erpImage(images[0])!}
            alt={name}
            className="w-full h-full object-contain p-6"
          />
        ) : (
          <span className="text-gray-300">{t('image.empty')}</span>
        )}
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 mt-3 flex-wrap">
          {images.slice(0, 6).map((src) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={src}
              src={erpImage(src)!}
              alt=""
              className="w-16 h-16 object-contain rounded-lg border border-border bg-white p-1"
            />
          ))}
        </div>
      )}
    </div>
  );
}
