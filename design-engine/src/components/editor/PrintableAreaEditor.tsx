'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { ProductTemplate, PrintableArea } from '@/types/product';

/** Saved product rect data per view, stored in template.metadata.productRects */
export interface ProductRectData {
  x: number;
  y: number;
  w: number;
  h: number;
  physicalW: number;
  physicalH: number;
}

interface PrintableAreaEditorProps {
  template: ProductTemplate;
  onSave: (
    templateId: string,
    viewId: string,
    printableArea: PrintableArea,
    productRectData: ProductRectData,
  ) => void;
  onClose: () => void;
  /** When true, render inline (no modal overlay) and hide internal Save/Cancel buttons. */
  embedded?: boolean;
  /** Fires on every edit; used by embed host to accumulate state across views. */
  onChange?: (
    viewId: string,
    printableArea: PrintableArea,
    productRectData: ProductRectData,
  ) => void;
  /** Force a specific active view (controlled). If omitted, internal state is used. */
  activeViewIdOverride?: string;
  onActiveViewChange?: (viewId: string) => void;
}

type DragMode =
  | 'move'
  | 'nw' | 'n' | 'ne'
  | 'w'  |        'e'
  | 'sw' | 's' | 'se'
  | null;

type DragTarget = 'product' | 'printable';

const HANDLE_SIZE = 8;
const MIN_RECT_SIZE = 20;

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

// Shared resize handle definitions
const HANDLE_DEFS: { mode: DragMode; style: React.CSSProperties; cursor: string }[] = [
  { mode: 'nw', style: { top: -HANDLE_SIZE / 2, left: -HANDLE_SIZE / 2 }, cursor: 'nwse-resize' },
  { mode: 'n', style: { top: -HANDLE_SIZE / 2, left: '50%', marginLeft: -HANDLE_SIZE / 2 }, cursor: 'ns-resize' },
  { mode: 'ne', style: { top: -HANDLE_SIZE / 2, right: -HANDLE_SIZE / 2 }, cursor: 'nesw-resize' },
  { mode: 'w', style: { top: '50%', marginTop: -HANDLE_SIZE / 2, left: -HANDLE_SIZE / 2 }, cursor: 'ew-resize' },
  { mode: 'e', style: { top: '50%', marginTop: -HANDLE_SIZE / 2, right: -HANDLE_SIZE / 2 }, cursor: 'ew-resize' },
  { mode: 'sw', style: { bottom: -HANDLE_SIZE / 2, left: -HANDLE_SIZE / 2 }, cursor: 'nesw-resize' },
  { mode: 's', style: { bottom: -HANDLE_SIZE / 2, left: '50%', marginLeft: -HANDLE_SIZE / 2 }, cursor: 'ns-resize' },
  { mode: 'se', style: { bottom: -HANDLE_SIZE / 2, right: -HANDLE_SIZE / 2 }, cursor: 'nwse-resize' },
];

export default function PrintableAreaEditor({
  template,
  onSave,
  onClose,
  embedded = false,
  onChange,
  activeViewIdOverride,
  onActiveViewChange,
}: PrintableAreaEditorProps) {
  const [internalActiveViewId, setInternalActiveViewId] = useState(template.defaultViewId);
  const activeViewId = activeViewIdOverride ?? internalActiveViewId;
  const setActiveViewId = (id: string) => {
    if (activeViewIdOverride === undefined) setInternalActiveViewId(id);
    onActiveViewChange?.(id);
  };
  const view = template.views.find((v) => v.id === activeViewId) ?? template.views[0];

  // Restore saved product rect from metadata, or use default (80% centered)
  const getSavedProductRect = (viewId: string): { rect: Rect; physW: number; physH: number } => {
    const saved = (template.metadata?.productRects as Record<string, ProductRectData> | undefined)?.[viewId];
    if (saved) {
      return {
        rect: { x: saved.x, y: saved.y, w: saved.w, h: saved.h },
        physW: saved.physicalW,
        physH: saved.physicalH,
      };
    }
    const v = template.views.find((vw) => vw.id === viewId) ?? template.views[0];
    const pw = Math.round(v.mockupWidth * 0.8);
    const ph = Math.round(v.mockupHeight * 0.8);
    return {
      rect: {
        x: Math.round((v.mockupWidth - pw) / 2),
        y: Math.round((v.mockupHeight - ph) / 2),
        w: pw,
        h: ph,
      },
      physW: 14,
      physH: 16,
    };
  };

  const initialProduct = getSavedProductRect(activeViewId);
  const [productRect, setProductRect] = useState<Rect>(initialProduct.rect);
  const [productPhysicalW, setProductPhysicalW] = useState(initialProduct.physW);
  const [productPhysicalH, setProductPhysicalH] = useState(initialProduct.physH);

  // Printable area rect — within the product rect
  const [printRect, setPrintRect] = useState<Rect>({
    x: view.printableArea.x,
    y: view.printableArea.y,
    w: view.printableArea.width,
    h: view.printableArea.height,
  });
  const [minDPI, setMinDPI] = useState(view.printableArea.minDPI);

  // Image display state
  const [imgLoaded, setImgLoaded] = useState(false);
  const [displaySize, setDisplaySize] = useState({ w: 0, h: 0 });
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Track the image's actual rendered size so the overlay rectangles stay
  // aligned when the viewport / container resizes.
  useEffect(() => {
    if (!imgLoaded || !imgRef.current) return;
    const el = imgRef.current;
    const update = () => setDisplaySize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [imgLoaded, view.mockupImageUrl]);

  // Scale factor: display pixels → mockup pixels
  const scale = displaySize.w > 0 ? view.mockupWidth / displaySize.w : 1;

  // Inches per mockup pixel (derived from product rect)
  const inchesPerPx = productRect.w > 0 ? productPhysicalW / productRect.w : 0;
  const inchesPerPxY = productRect.h > 0 ? productPhysicalH / productRect.h : 0;

  // Computed printable area physical dimensions
  const printPhysicalW = +(printRect.w * inchesPerPx).toFixed(2);
  const printPhysicalH = +(printRect.h * inchesPerPxY).toFixed(2);

  // Sync state when the active view changes (NOT on every template prop change —
  // doing so would create an infinite loop when the parent echoes our onChange
  // back as a new template object).
  useEffect(() => {
    const v = template.views.find((vw) => vw.id === activeViewId) ?? template.views[0];
    const saved = getSavedProductRect(activeViewId);
    setProductRect(saved.rect);
    setProductPhysicalW(saved.physW);
    setProductPhysicalH(saved.physH);
    setPrintRect({
      x: v.printableArea.x,
      y: v.printableArea.y,
      w: v.printableArea.width,
      h: v.printableArea.height,
    });
    setMinDPI(v.printableArea.minDPI);
    setImgLoaded(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeViewId]);

  const handleImgLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setDisplaySize({ w: img.clientWidth, h: img.clientHeight });
    setImgLoaded(true);
  }, []);

  // --- Drag interaction ---
  const dragRef = useRef<{
    target: DragTarget;
    mode: DragMode;
    startX: number;
    startY: number;
    startRect: Rect;
  } | null>(null);

  const startDrag = useCallback((e: React.MouseEvent, target: DragTarget, mode: DragMode) => {
    e.preventDefault();
    e.stopPropagation();
    const currentRect = target === 'product' ? productRect : printRect;
    dragRef.current = {
      target,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      startRect: { ...currentRect },
    };
  }, [productRect, printRect]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const drag = dragRef.current;
      if (!drag || !drag.mode) return;

      const dx = (e.clientX - drag.startX) * scale;
      const dy = (e.clientY - drag.startY) * scale;
      const s = drag.startRect;
      const maxX = view.mockupWidth;
      const maxY = view.mockupHeight;

      let nx = s.x, ny = s.y, nw = s.w, nh = s.h;

      switch (drag.mode) {
        case 'move':
          nx = Math.max(0, Math.min(s.x + dx, maxX - s.w));
          ny = Math.max(0, Math.min(s.y + dy, maxY - s.h));
          break;
        case 'nw':
          nx = Math.max(0, Math.min(s.x + dx, s.x + s.w - MIN_RECT_SIZE));
          ny = Math.max(0, Math.min(s.y + dy, s.y + s.h - MIN_RECT_SIZE));
          nw = s.w - (nx - s.x);
          nh = s.h - (ny - s.y);
          break;
        case 'n':
          ny = Math.max(0, Math.min(s.y + dy, s.y + s.h - MIN_RECT_SIZE));
          nh = s.h - (ny - s.y);
          break;
        case 'ne':
          nw = Math.max(MIN_RECT_SIZE, Math.min(s.w + dx, maxX - s.x));
          ny = Math.max(0, Math.min(s.y + dy, s.y + s.h - MIN_RECT_SIZE));
          nh = s.h - (ny - s.y);
          break;
        case 'w':
          nx = Math.max(0, Math.min(s.x + dx, s.x + s.w - MIN_RECT_SIZE));
          nw = s.w - (nx - s.x);
          break;
        case 'e':
          nw = Math.max(MIN_RECT_SIZE, Math.min(s.w + dx, maxX - s.x));
          break;
        case 'sw':
          nx = Math.max(0, Math.min(s.x + dx, s.x + s.w - MIN_RECT_SIZE));
          nw = s.w - (nx - s.x);
          nh = Math.max(MIN_RECT_SIZE, Math.min(s.h + dy, maxY - s.y));
          break;
        case 's':
          nh = Math.max(MIN_RECT_SIZE, Math.min(s.h + dy, maxY - s.y));
          break;
        case 'se':
          nw = Math.max(MIN_RECT_SIZE, Math.min(s.w + dx, maxX - s.x));
          nh = Math.max(MIN_RECT_SIZE, Math.min(s.h + dy, maxY - s.y));
          break;
      }

      const updated = { x: Math.round(nx), y: Math.round(ny), w: Math.round(nw), h: Math.round(nh) };

      if (drag.target === 'product') {
        setProductRect(updated);
      } else {
        setPrintRect(updated);
      }
    };

    const handleMouseUp = () => {
      dragRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [scale, view.mockupWidth, view.mockupHeight]);

  // Fire onChange continuously (embed mode uses this to accumulate state).
  useEffect(() => {
    if (!onChange) return;
    const printableArea: PrintableArea = {
      shape: view.printableArea.shape,
      x: printRect.x,
      y: printRect.y,
      width: printRect.w,
      height: printRect.h,
      physicalWidthInches: printPhysicalW,
      physicalHeightInches: printPhysicalH,
      minDPI,
    };
    const productRectData: ProductRectData = {
      x: productRect.x,
      y: productRect.y,
      w: productRect.w,
      h: productRect.h,
      physicalW: productPhysicalW,
      physicalH: productPhysicalH,
    };
    onChange(activeViewId, printableArea, productRectData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeViewId, printRect, productRect, productPhysicalW, productPhysicalH, minDPI, printPhysicalW, printPhysicalH]);

  const handleSave = () => {
    const printableArea: PrintableArea = {
      shape: view.printableArea.shape,
      x: printRect.x,
      y: printRect.y,
      width: printRect.w,
      height: printRect.h,
      physicalWidthInches: printPhysicalW,
      physicalHeightInches: printPhysicalH,
      minDPI,
    };
    const productRectData: ProductRectData = {
      x: productRect.x,
      y: productRect.y,
      w: productRect.w,
      h: productRect.h,
      physicalW: productPhysicalW,
      physicalH: productPhysicalH,
    };
    onSave(template.id, activeViewId, printableArea, productRectData);
  };

  // Convert mockup coords to display coords
  const toDisplay = (r: Rect) => ({
    left: r.x / scale,
    top: r.y / scale,
    width: r.w / scale,
    height: r.h / scale,
  });

  const dispProduct = toDisplay(productRect);
  const dispPrint = toDisplay(printRect);

  const inner = (
    <div className={cn('bg-white flex flex-col', embedded ? 'w-full h-full' : 'rounded-xl shadow-2xl w-[640px] max-h-[90vh]')}>
        {/* Header */}
        {!embedded && (
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-800">
            Printable Area — {template.name}
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
        )}

        {/* View tabs (hidden in embedded mode — parent renders its own) */}
        {!embedded && template.views.length > 1 && (
          <div className="flex gap-1 px-4 pt-3">
            {template.views.map((v) => (
              <button
                key={v.id}
                onClick={() => setActiveViewId(v.id)}
                className={cn(
                  'px-3 py-1 text-xs rounded-md transition-colors',
                  activeViewId === v.id
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-500 hover:bg-gray-100'
                )}
              >
                {v.label}
              </button>
            ))}
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-4 px-4 pt-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="inline-block w-3 h-3 border-2 border-dashed border-orange-400 rounded-sm" />
            Product Area
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="inline-block w-3 h-3 border-2 border-dashed border-blue-500 rounded-sm" />
            Printable Area
          </div>
        </div>

        {/* Image + two rectangle overlays */}
        <div className={cn('p-4 flex justify-center items-center', embedded ? 'flex-1 min-h-0' : 'flex-1 overflow-hidden')}>
          <div
            className="relative inline-block bg-gray-100 rounded-lg overflow-visible select-none max-w-full max-h-full"
          >
            <img
              ref={imgRef}
              src={view.mockupImageUrl}
              alt={view.label}
              onLoad={handleImgLoad}
              className={cn('block object-contain', embedded ? 'max-w-full max-h-[55vh]' : 'max-w-full max-h-[380px]')}
              draggable={false}
              crossOrigin="anonymous"
            />

            {imgLoaded && (
              <>
                {/* Product area rectangle (orange) */}
                <div
                  className="absolute border-2 border-dashed border-orange-400 bg-orange-400/5"
                  style={{
                    left: dispProduct.left,
                    top: dispProduct.top,
                    width: dispProduct.width,
                    height: dispProduct.height,
                    cursor: 'move',
                    zIndex: 1,
                  }}
                  onMouseDown={(e) => startDrag(e, 'product', 'move')}
                >
                  <div className="absolute -top-5 left-0 text-[10px] text-orange-600 whitespace-nowrap bg-white/90 px-1 rounded">
                    Product {productRect.w}x{productRect.h}px
                  </div>
                  {HANDLE_DEFS.map((h) => (
                    <div
                      key={h.mode}
                      className="absolute bg-white border-2 border-orange-400 rounded-sm"
                      style={{
                        width: HANDLE_SIZE,
                        height: HANDLE_SIZE,
                        cursor: h.cursor,
                        ...h.style,
                      }}
                      onMouseDown={(e) => startDrag(e, 'product', h.mode)}
                    />
                  ))}
                </div>

                {/* Printable area rectangle (blue) */}
                <div
                  className="absolute border-2 border-dashed border-blue-500 bg-blue-500/10"
                  style={{
                    left: dispPrint.left,
                    top: dispPrint.top,
                    width: dispPrint.width,
                    height: dispPrint.height,
                    cursor: 'move',
                    zIndex: 2,
                  }}
                  onMouseDown={(e) => startDrag(e, 'printable', 'move')}
                >
                  <div className="absolute -top-5 left-0 text-[10px] text-blue-600 whitespace-nowrap bg-white/90 px-1 rounded">
                    Print {printRect.w}x{printRect.h}px
                  </div>
                  {HANDLE_DEFS.map((h) => (
                    <div
                      key={h.mode}
                      className="absolute bg-white border-2 border-blue-500 rounded-sm"
                      style={{
                        width: HANDLE_SIZE,
                        height: HANDLE_SIZE,
                        cursor: h.cursor,
                        ...h.style,
                      }}
                      onMouseDown={(e) => startDrag(e, 'printable', h.mode)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Inputs */}
        <div className="px-4 pb-2 space-y-3">
          {/* Product physical dimensions */}
          <div>
            <div className="text-xs font-semibold text-orange-600 mb-1.5">Product Dimensions</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Width (inches)</label>
                <input
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={productPhysicalW}
                  onChange={(e) => setProductPhysicalW(Number(e.target.value))}
                  className="w-full text-sm bg-gray-50 border border-gray-200 rounded px-2 py-1.5 outline-none focus:border-orange-400"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Height (inches)</label>
                <input
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={productPhysicalH}
                  onChange={(e) => setProductPhysicalH(Number(e.target.value))}
                  className="w-full text-sm bg-gray-50 border border-gray-200 rounded px-2 py-1.5 outline-none focus:border-orange-400"
                />
              </div>
            </div>
          </div>

          {/* Printable area computed dimensions */}
          <div>
            <div className="text-xs font-semibold text-blue-600 mb-1.5">Printable Area (auto-calculated)</div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Width</label>
                <div className="text-sm bg-gray-100 border border-gray-200 rounded px-2 py-1.5 text-gray-700">
                  {printPhysicalW}&quot;
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Height</label>
                <div className="text-sm bg-gray-100 border border-gray-200 rounded px-2 py-1.5 text-gray-700">
                  {printPhysicalH}&quot;
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Min DPI</label>
                <input
                  type="number"
                  min={72}
                  step={1}
                  value={minDPI}
                  onChange={(e) => setMinDPI(Number(e.target.value))}
                  className="w-full text-sm bg-gray-50 border border-gray-200 rounded px-2 py-1.5 outline-none focus:border-blue-400"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        {!embedded && (
        <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600"
          >
            Save
          </button>
        </div>
        )}
    </div>
  );

  if (embedded) return inner;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      {inner}
    </div>
  );
}
