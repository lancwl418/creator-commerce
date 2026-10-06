import Image from 'next/image';
interface CatalogGalleryProps {
  name: string;
  activeImage: string;
  setActiveImage: (url: string) => void;
  images: string[];
}

export default function CatalogGallery({ name, activeImage, setActiveImage, images }: CatalogGalleryProps) {
  return (
    <div>
      {/* Main image */}
      <div className="rounded-2xl border border-border bg-white overflow-hidden shadow-sm">
        <div className="aspect-square bg-surface-secondary flex items-center justify-center">
          {activeImage ? (
            <Image unoptimized width={400} height={400}
              src={activeImage}
              alt={name}
              className="max-w-full max-h-full object-contain p-8"
            />
          ) : (
            <svg className="w-16 h-16 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
            </svg>
          )}
        </div>
      </div>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {images.map((url, i) => (
            <button
              key={i}
              onClick={() => setActiveImage(url)}
              className={`w-16 h-16 rounded-lg border-2 bg-white overflow-hidden shrink-0 transition-all ${activeImage === url
                ? 'border-primary-500 shadow-sm'
                : 'border-border hover:border-gray-300'
                }`}
            >
              <Image unoptimized width={400} height={400} src={url} alt="" className="w-full h-full object-contain p-1" />
            </button>
          ))}
        </div>
      )}
    </div>

  );
}
