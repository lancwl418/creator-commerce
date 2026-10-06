import Image from 'next/image';

interface ImageThumbnailProps {
  src?: string | null;
  alt?: string;
  size?: number;
  className?: string;
}

export default function ImageThumbnail({ src, alt = '', size = 48, className = '' }: ImageThumbnailProps) {
  return (
    <div
      className={`rounded-lg bg-surface-secondary overflow-hidden shrink-0 flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      {src ? (
        <Image src={src} alt={alt} width={size} height={size} unoptimized className="w-full h-full object-contain" />
      ) : (
        <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
        </svg>
      )}
    </div>
  );
}
