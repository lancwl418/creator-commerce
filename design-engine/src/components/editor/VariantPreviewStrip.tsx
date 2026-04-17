'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useProductStore } from '@/stores/productStore';
import { useDesignStore } from '@/stores/designStore';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface ColorVariant {
  color: string;
  imageUrl: string;
}

/** Composite artwork layers onto a mockup at a given resolution */
async function compositeOnMockup(
  mockupUrl: string,
  mockupW: number,
  mockupH: number,
  layers: import('@/types/design').DesignLayer[],
  outputSize: number,
  quality: number = 0.7,
): Promise<string> {
  const scale = outputSize / Math.max(mockupW, mockupH);

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(mockupW * scale);
  canvas.height = Math.round(mockupH * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const loadImg = (src: string): Promise<HTMLImageElement | null> =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });

  // Draw mockup background
  const mockupImg = await loadImg(mockupUrl);
  if (mockupImg) {
    ctx.drawImage(mockupImg, 0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Draw artwork layers
  for (const layer of layers) {
    if (!layer.visible || layer.data.type !== 'image') continue;
    const src = (layer.data as { src?: string }).src;
    if (!src) continue;

    const artImg = await loadImg(src);
    if (!artImg) continue;

    const t = layer.transform;
    ctx.save();
    ctx.translate(t.x * scale, t.y * scale);
    ctx.rotate((t.rotation || 0) * Math.PI / 180);
    if (t.flipX) ctx.scale(-1, 1);
    if (t.flipY) ctx.scale(1, -1);
    const drawW = (t.width || artImg.naturalWidth) * (t.scaleX || 1) * scale;
    const drawH = (t.height || artImg.naturalHeight) * (t.scaleY || 1) * scale;
    ctx.globalAlpha = layer.opacity ?? 1;
    ctx.drawImage(artImg, 0, 0, drawW, drawH);
    ctx.restore();
  }

  try {
    return canvas.toDataURL('image/jpeg', quality);
  } catch {
    return '';
  }
}

/**
 * Shows small preview thumbnails of the current design composited onto
 * each color variant's mockup image. Displayed below the main canvas.
 * Click a thumbnail to view an enlarged preview with navigation.
 */
export default function VariantPreviewStrip() {
  const selectedTemplate = useProductStore((s) => s.selectedTemplate);
  const activeViewId = useProductStore((s) => s.activeViewId);
  const design = useDesignStore((s) => s.design);

  const colorVariants = (selectedTemplate?.metadata?.colorVariants ?? []) as ColorVariant[];
  const [previews, setPreviews] = useState<Map<string, string>>(new Map());
  const prevDesignRef = useRef<string>('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Lightbox state
  const [viewingIndex, setViewingIndex] = useState<number | null>(null);
  const [hiResPreview, setHiResPreview] = useState<string>('');
  const [loadingHiRes, setLoadingHiRes] = useState(false);

  // Get artwork layers from the current design view
  const getArtworkLayers = useCallback(() => {
    if (!activeViewId || !design.views[activeViewId]) return [];
    return design.views[activeViewId].layers.filter(
      (l) => l.visible && l.data.type === 'image'
    );
  }, [design, activeViewId]);

  const view = selectedTemplate?.views[0];
  const mockupW = view?.mockupWidth || 800;
  const mockupH = view?.mockupHeight || 800;

  // Generate thumbnails when design changes (debounced)
  useEffect(() => {
    if (colorVariants.length === 0) return;

    const layers = getArtworkLayers();
    const sig = JSON.stringify(
      layers.map((l) => ({ id: l.id, t: l.transform, o: l.opacity, s: (l.data as { src?: string }).src }))
    );
    if (sig === prevDesignRef.current) return;
    prevDesignRef.current = sig;

    if (layers.length === 0) {
      setPreviews(new Map());
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const newPreviews = new Map<string, string>();
      for (const variant of colorVariants) {
        const dataUrl = await compositeOnMockup(variant.imageUrl, mockupW, mockupH, layers, 120);
        if (dataUrl) newPreviews.set(variant.color, dataUrl);
      }
      setPreviews(newPreviews);
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [colorVariants, design, getArtworkLayers, mockupW, mockupH]);

  // Generate hi-res preview when lightbox opens or navigates
  useEffect(() => {
    if (viewingIndex === null || !colorVariants[viewingIndex]) return;

    const variant = colorVariants[viewingIndex];
    const layers = getArtworkLayers();

    if (layers.length === 0) {
      setHiResPreview(variant.imageUrl);
      return;
    }

    setLoadingHiRes(true);
    compositeOnMockup(variant.imageUrl, mockupW, mockupH, layers, 600, 0.9).then((url) => {
      setHiResPreview(url || variant.imageUrl);
      setLoadingHiRes(false);
    });
  }, [viewingIndex, colorVariants, getArtworkLayers, mockupW, mockupH]);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (viewingIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setViewingIndex(null);
      if (e.key === 'ArrowLeft') setViewingIndex((i) => i !== null && i > 0 ? i - 1 : i);
      if (e.key === 'ArrowRight') setViewingIndex((i) => i !== null && i < colorVariants.length - 1 ? i + 1 : i);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [viewingIndex, colorVariants.length]);

  if (colorVariants.length === 0) return null;

  return (
    <>
      {/* Thumbnail strip */}
      <div className="bg-white border-t border-gray-200 px-3 py-2 shrink-0">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
          Color Variants
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {colorVariants.map((variant, index) => {
            const preview = previews.get(variant.color);
            return (
              <button
                key={variant.color}
                onClick={() => setViewingIndex(index)}
                className="shrink-0 text-center group"
              >
                <div className="w-16 h-16 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden transition-all group-hover:border-blue-400 group-hover:shadow-sm">
                  {preview ? (
                    <img src={preview} alt={variant.color} className="w-full h-full object-contain" />
                  ) : (
                    <img src={variant.imageUrl} alt={variant.color} className="w-full h-full object-contain opacity-60" />
                  )}
                </div>
                <span className="text-[9px] text-gray-500 mt-0.5 block truncate w-16">
                  {variant.color}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Lightbox overlay */}
      {viewingIndex !== null && colorVariants[viewingIndex] && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60" onClick={() => setViewingIndex(null)}>
          <div className="relative max-w-lg w-full mx-4" onClick={(e) => e.stopPropagation()}>
            {/* Close */}
            <button
              onClick={() => setViewingIndex(null)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Preview image */}
            <div className="bg-white rounded-2xl overflow-hidden shadow-2xl">
              <div className="aspect-square bg-gray-50 flex items-center justify-center relative">
                {loadingHiRes && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-50/80 z-10">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                <img
                  src={hiResPreview || colorVariants[viewingIndex].imageUrl}
                  alt={colorVariants[viewingIndex].color}
                  className="max-w-full max-h-full object-contain p-4"
                />
              </div>
              <div className="px-4 py-3 text-center border-t border-gray-100">
                <p className="text-sm font-semibold text-gray-900">{colorVariants[viewingIndex].color}</p>
                <p className="text-xs text-gray-400 mt-0.5">{viewingIndex + 1} / {colorVariants.length}</p>
              </div>
            </div>

            {/* Nav arrows */}
            {viewingIndex > 0 && (
              <button
                onClick={() => setViewingIndex(viewingIndex - 1)}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 w-9 h-9 rounded-full bg-white/90 shadow flex items-center justify-center hover:bg-white transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-700" />
              </button>
            )}
            {viewingIndex < colorVariants.length - 1 && (
              <button
                onClick={() => setViewingIndex(viewingIndex + 1)}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 w-9 h-9 rounded-full bg-white/90 shadow flex items-center justify-center hover:bg-white transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-gray-700" />
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
