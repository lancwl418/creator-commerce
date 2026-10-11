import Image from 'next/image';
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
          <Image
            src={erpImage(images[0])!}
            alt={name}
            width={800}
            height={800}
            sizes="(max-width: 1024px) 100vw, 560px"
            priority
            className="w-full h-full object-contain p-6"
          />
        ) : (
          <span className="text-gray-300">{t('image.empty')}</span>
        )}
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 mt-3 flex-wrap">
          {images.slice(0, 6).map((src) => (
            <Image
              key={src}
              src={erpImage(src)!}
              alt=""
              width={64}
              height={64}
              className="w-16 h-16 object-contain rounded-lg border border-border bg-white p-1"
            />
          ))}
        </div>
      )}
    </div>
  );
}
