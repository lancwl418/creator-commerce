'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useProductStore } from '@/stores/productStore';
import { useDesignStore } from '@/stores/designStore';

interface ColorVariant {
  color: string;
  imageUrl: string;
}

/**
 * Shows small preview thumbnails of the current design composited onto
 * each color variant's mockup image. Displayed below the main canvas.
 */
export default function VariantPreviewStrip() {
  const selectedTemplate = useProductStore((s) => s.selectedTemplate);
  const activeViewId = useProductStore((s) => s.activeViewId);
  const design = useDesignStore((s) => s.design);

  const colorVariants = (selectedTemplate?.metadata?.colorVariants ?? []) as ColorVariant[];
  const [previews, setPreviews] = useState<Map<string, string>>(new Map());
  const rafRef = useRef<number>(0);
  const prevDesignRef = useRef<string>('');

  // Get artwork layers from the current design view
  const getArtworkLayers = useCallback(() => {
    if (!activeViewId || !design.views[activeViewId]) return [];
    return design.views[activeViewId].layers.filter(
      (l) => l.visible && l.data.type === 'image'
    );
  }, [design, activeViewId]);

  // Composite design onto a variant mockup image
  const compositeVariant = useCallback(
    async (variant: ColorVariant, size: number): Promise<string> => {
      const view = selectedTemplate?.views[0];
      if (!view) return '';

      const mockupW = view.mockupWidth || 800;
      const mockupH = view.mockupHeight || 800;
      const scale = size / Math.max(mockupW, mockupH);

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

      // Draw variant mockup background
      const mockupImg = await loadImg(variant.imageUrl);
      if (mockupImg) {
        ctx.drawImage(mockupImg, 0, 0, canvas.width, canvas.height);
      } else {
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Draw artwork layers on top
      const layers = getArtworkLayers();
      for (const layer of layers) {
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
        return canvas.toDataURL('image/jpeg', 0.7);
      } catch {
        return '';
      }
    },
    [selectedTemplate, getArtworkLayers]
  );

  // Generate previews when design changes (debounced)
  useEffect(() => {
    if (colorVariants.length === 0) return;

    // Simple change detection: serialize layer transforms
    const layers = getArtworkLayers();
    const sig = JSON.stringify(
      layers.map((l) => ({ id: l.id, t: l.transform, o: l.opacity, s: (l.data as { src?: string }).src }))
    );
    if (sig === prevDesignRef.current) return;
    prevDesignRef.current = sig;

    // No artwork yet — show plain mockups
    if (layers.length === 0) {
      setPreviews(new Map());
      return;
    }

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      // Debounce: wait a bit for user to stop dragging
      const timer = setTimeout(async () => {
        const thumbSize = 120;
        const newPreviews = new Map<string, string>();
        for (const variant of colorVariants) {
          const dataUrl = await compositeVariant(variant, thumbSize);
          if (dataUrl) newPreviews.set(variant.color, dataUrl);
        }
        setPreviews(newPreviews);
      }, 300);
      return () => clearTimeout(timer);
    });
  }, [colorVariants, design, getArtworkLayers, compositeVariant]);

  if (colorVariants.length === 0) return null;

  return (
    <div className="bg-white border-t border-gray-200 px-3 py-2 shrink-0">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
        Color Variants
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {colorVariants.map((variant) => {
          const preview = previews.get(variant.color);
          return (
            <div key={variant.color} className="shrink-0 text-center">
              <div className="w-16 h-16 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden">
                {preview ? (
                  <img
                    src={preview}
                    alt={variant.color}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <img
                    src={variant.imageUrl}
                    alt={variant.color}
                    className="w-full h-full object-contain opacity-60"
                  />
                )}
              </div>
              <span className="text-[9px] text-gray-500 mt-0.5 block truncate w-16">
                {variant.color}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
