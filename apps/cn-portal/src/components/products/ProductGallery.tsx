'use client';

import { useCallback, useEffect, useState } from 'react';
import { erpImage } from '@/lib/image';
import { t } from '@/lib/i18n';

function Icon({ d, className }: { d: string; className: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

interface ProductGalleryProps {
  images: string[];
  name: string;
}

export default function ProductGallery({ images, name }: ProductGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const close = useCallback(() => setLightboxIndex(null), []);
  const step = useCallback(
    (delta: number) => {
      setLightboxIndex((i) =>
        i === null ? i : (i + delta + images.length) % images.length
      );
    },
    [images.length]
  );

  useEffect(() => {
    if (lightboxIndex === null) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
    }
    window.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [lightboxIndex, close, step]);

  return (
    <div>
      <button
        type="button"
        onClick={() => images[0] && setLightboxIndex(0)}
        aria-label={t('gallery.zoom')}
        className="w-full aspect-square bg-white rounded-2xl border border-border flex items-center justify-center overflow-hidden cursor-zoom-in"
      >
        {images[0] ? (
          // eslint-disable-next-line @next/next/no-img-element -- 走 R2 缓存的缩略图，不用 Next 优化器
          <img
            src={erpImage(images[0], 900)!}
            alt={name}
            width={800}
            height={800}
            className="w-full h-full object-contain p-6"
          />
        ) : (
          <span className="text-gray-300">{t('image.empty')}</span>
        )}
      </button>
      {images.length > 1 && (
        <div className="flex gap-2 mt-3 flex-wrap">
          {images.slice(0, 6).map((src, idx) => (
            <button
              key={src}
              type="button"
              onClick={() => setLightboxIndex(idx)}
              aria-label={t('gallery.zoom')}
              className="cursor-zoom-in"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- 走 R2 缓存的缩略图，不用 Next 优化器 */}
              <img
                src={erpImage(src, 128)!}
                alt=""
                width={64}
                height={64}
                loading="lazy"
                className="w-16 h-16 object-contain rounded-lg border border-border bg-white p-1"
              />
            </button>
          ))}
        </div>
      )}

      {lightboxIndex !== null && images[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 sm:p-10"
          onClick={close}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={close}
            aria-label={t('gallery.close')}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <Icon d="M18 6 6 18M6 6l12 12" className="w-6 h-6" />
          </button>
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  step(-1);
                }}
                aria-label={t('gallery.prev')}
                className="absolute left-2 sm:left-6 p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                <Icon d="m15 18-6-6 6-6" className="w-7 h-7" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  step(1);
                }}
                aria-label={t('gallery.next')}
                className="absolute right-2 sm:right-6 p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                <Icon d="m9 18 6-6-6-6" className="w-7 h-7" />
              </button>
            </>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element -- 大图同样走图片代理 */}
          <img
            src={erpImage(images[lightboxIndex], 1600)!}
            alt={name}
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-full object-contain rounded-lg bg-white"
          />
          {images.length > 1 && (
            <span className="absolute bottom-4 text-white/80 text-sm">
              {lightboxIndex + 1} / {images.length}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
