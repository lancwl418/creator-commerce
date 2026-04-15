'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { nanoid } from 'nanoid';
import { cn } from '@/lib/cn';
import PrintableAreaEditor, { type ProductRectData } from '@/components/editor/PrintableAreaEditor';
import MockupUploader from '@/components/embed/MockupUploader';
import type { ProductTemplate, ProductView, PrintableArea } from '@/types/product';

/* ────────────────────────────────────────────────────────────
 * postMessage protocol (ERP ↔ Editor)
 * ──────────────────────────────────────────────────────────── */

interface InitMessage {
  type: 'INIT_TEMPLATE_SETUP';
  payload: {
    productId: string | number;        // opaque ERP product id, echoed back on save
    productName?: string;
    /** Existing data (for re-edit). Omit/empty to start with default front+back. */
    views?: ProductView[];
    productRects?: Record<string, ProductRectData>;
  };
}

interface SavedMessage {
  type: 'TEMPLATE_SETUP_SAVED';
  payload: {
    productId: string | number;
    views: ProductView[];
    productRects: Record<string, ProductRectData>;
  };
}

interface CloseMessage { type: 'TEMPLATE_SETUP_CLOSE' }
interface ReadyMessage { type: 'TEMPLATE_SETUP_READY' }

/* ────────────────────────────────────────────────────────────
 * Defaults
 * ──────────────────────────────────────────────────────────── */

const DEFAULT_PRINTABLE_AREA: PrintableArea = {
  shape: { type: 'rect' },
  x: 200, y: 250, width: 400, height: 500,
  physicalWidthInches: 12, physicalHeightInches: 15, minDPI: 150,
};

function makeEmptyView(label: string): ProductView {
  return {
    id: nanoid(8),
    label,
    mockupImageUrl: '',
    mockupWidth: 800,
    mockupHeight: 1000,
    printableArea: { ...DEFAULT_PRINTABLE_AREA },
  };
}

function defaultViews(): ProductView[] {
  return [makeEmptyView('Front'), makeEmptyView('Back')];
}

/* ────────────────────────────────────────────────────────────
 * Component
 * ──────────────────────────────────────────────────────────── */

interface Props {
  embedKey: string;
}

export default function TemplateSetupApp({ embedKey }: Props) {
  const [productId, setProductId] = useState<string | number>('');
  const [productName, setProductName] = useState<string>('Product');
  const [views, setViews] = useState<ProductView[]>(defaultViews);
  const [productRects, setProductRects] = useState<Record<string, ProductRectData>>({});
  const [activeViewId, setActiveViewId] = useState<string>(() => views[0]?.id ?? '');
  const parentOriginRef = useRef<string>('*');

  /* postMessage: listen for INIT */
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      const msg = e.data as InitMessage | undefined;
      if (!msg || typeof msg !== 'object') return;
      if (msg.type === 'INIT_TEMPLATE_SETUP') {
        parentOriginRef.current = e.origin || '*';
        const incomingViews = msg.payload.views && msg.payload.views.length > 0
          ? msg.payload.views
          : defaultViews();
        setProductId(msg.payload.productId);
        setProductName(msg.payload.productName ?? 'Product');
        setViews(incomingViews);
        setProductRects(msg.payload.productRects ?? {});
        setActiveViewId(incomingViews[0].id);
      }
    };
    window.addEventListener('message', handler);
    // signal ready
    const ready: ReadyMessage = { type: 'TEMPLATE_SETUP_READY' };
    window.parent?.postMessage(ready, '*');
    return () => window.removeEventListener('message', handler);
  }, []);

  /* ── view management ── */
  const addView = () => {
    const next = makeEmptyView(`View ${views.length + 1}`);
    setViews((vs) => [...vs, next]);
    setActiveViewId(next.id);
  };

  const removeView = (id: string) => {
    if (views.length <= 1) return;
    setViews((vs) => vs.filter((v) => v.id !== id));
    setProductRects((r) => {
      const { [id]: _drop, ...rest } = r;
      return rest;
    });
    if (activeViewId === id) {
      const remaining = views.filter((v) => v.id !== id);
      setActiveViewId(remaining[0]?.id ?? '');
    }
  };

  const renameView = (id: string, label: string) => {
    setViews((vs) => vs.map((v) => (v.id === id ? { ...v, label } : v)));
  };

  const setMockup = (id: string, url: string, w: number, h: number) => {
    setViews((vs) => vs.map((v) => (
      v.id === id
        ? {
            ...v,
            mockupImageUrl: url,
            mockupWidth: w,
            mockupHeight: h,
            printableArea: {
              ...v.printableArea,
              x: Math.round(w * 0.25),
              y: Math.round(h * 0.25),
              width: Math.round(w * 0.5),
              height: Math.round(h * 0.5),
            },
          }
        : v
    )));
  };

  /* ── editor change wiring ── */
  const handleEditorChange = useCallback(
    (viewId: string, printableArea: PrintableArea, productRectData: ProductRectData) => {
      setViews((vs) => vs.map((v) => (v.id === viewId ? { ...v, printableArea } : v)));
      setProductRects((r) => ({ ...r, [viewId]: productRectData }));
    },
    [],
  );

  /* ── save / close ── */
  const handleSave = () => {
    // Only views with an uploaded mockup are persisted. Empty views are dropped
    // silently. At least one view must have a mockup.
    const filledViews = views.filter((v) => !!v.mockupImageUrl);
    if (filledViews.length === 0) {
      alert('Please upload a mockup image for at least one view before saving.');
      return;
    }
    const filledIds = new Set(filledViews.map((v) => v.id));
    const filteredRects = Object.fromEntries(
      Object.entries(productRects).filter(([id]) => filledIds.has(id)),
    );
    const msg: SavedMessage = {
      type: 'TEMPLATE_SETUP_SAVED',
      payload: { productId, views: filledViews, productRects: filteredRects },
    };
    window.parent?.postMessage(msg, parentOriginRef.current);
  };

  const handleClose = () => {
    const msg: CloseMessage = { type: 'TEMPLATE_SETUP_CLOSE' };
    window.parent?.postMessage(msg, parentOriginRef.current);
  };

  /* ── derived template for PrintableAreaEditor ── */
  const activeView = views.find((v) => v.id === activeViewId) ?? views[0];
  const editorTemplate: ProductTemplate | null = useMemo(() => {
    if (!activeView || !activeView.mockupImageUrl) return null;
    return {
      id: 'embed-template',
      type: 'custom',
      name: productName,
      description: '',
      views,
      defaultViewId: activeView.id,
      metadata: { productRects },
    };
  }, [activeView, productName, views, productRects]);

  return (
    <div className="flex flex-col w-full h-screen bg-gray-50">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-semibold text-gray-800">Define Print Areas</h1>
          {productName && <span className="text-xs text-gray-400">— {productName}</span>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleClose}
            className="px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </header>

      {/* View tabs */}
      <div className="flex items-center gap-1 px-4 pt-3 bg-white border-b border-gray-200 overflow-x-auto">
        {views.map((v) => (
          <div
            key={v.id}
            className={cn(
              'group flex items-center gap-1 pl-3 pr-1 py-1.5 rounded-t-md border-b-2 cursor-pointer',
              activeViewId === v.id
                ? 'border-blue-500 bg-blue-50/40 text-blue-700'
                : 'border-transparent text-gray-500 hover:bg-gray-50',
            )}
            onClick={() => setActiveViewId(v.id)}
          >
            <input
              value={v.label}
              onChange={(e) => renameView(v.id, e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="bg-transparent outline-none text-xs font-medium w-20 focus:bg-white focus:px-1 focus:rounded"
            />
            {!v.mockupImageUrl && (
              <span className="text-[10px] text-amber-600 mr-1">(empty)</span>
            )}
            {views.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); removeView(v.id); }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50"
                title="Delete view"
              >
                <Trash2 className="w-3 h-3 text-red-500" />
              </button>
            )}
          </div>
        ))}
        <button
          onClick={addView}
          className="ml-2 flex items-center gap-1 px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-100 rounded"
          title="Add view"
        >
          <Plus className="w-3.5 h-3.5" /> Add view
        </button>
      </div>

      {/* Body: either uploader (no mockup yet) or PrintableAreaEditor */}
      <div className="flex-1 min-h-0 overflow-hidden bg-gray-100">
        {!activeView ? (
          <div className="p-8 text-sm text-gray-500">No view selected.</div>
        ) : !activeView.mockupImageUrl ? (
          <MockupUploader
            embedKey={embedKey}
            label={`Upload mockup for "${activeView.label}"`}
            onUploaded={(url, w, h) => setMockup(activeView.id, url, w, h)}
          />
        ) : editorTemplate ? (
          <div className="w-full h-full">
            <PrintableAreaEditor
              template={editorTemplate}
              embedded
              activeViewIdOverride={activeView.id}
              onChange={handleEditorChange}
              onSave={() => { /* unused in embedded mode */ }}
              onClose={handleClose}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
