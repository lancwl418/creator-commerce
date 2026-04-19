'use client';

import { useCallback, useRef, useEffect, useState } from 'react';
import EditorShell from './EditorShell';
import Toolbar from './Toolbar';
import ProductSelector from './ProductSelector';
import MultiProductPanel from './MultiProductPanel';
import DesignUploader from './DesignUploader';
import LayerPanel from './LayerPanel';
import PropertiesPanel from './PropertiesPanel';
import VariantPreviewStrip from './VariantPreviewStrip';
import ValidationDialog from './ValidationDialog';
import { EditorConfigContext, useEditorConfig } from './EditorConfigContext';
import { useDesignStore } from '@/stores/designStore';
import { useEditorStore } from '@/stores/editorStore';
import { useProductStore } from '@/stores/productStore';
import { useMultiProductStore } from '@/stores/multiProductStore';
import { useTemplateLoader } from '@/hooks/useTemplateLoader';
import { ExportService } from '@/core/design/ExportService';
import { validateDesign } from '@/core/design/DesignValidator';
import { useHistory } from '@/hooks/useHistory';
import type { ValidationResult } from '@/core/design/DesignValidator';
import type { DesignLayer } from '@/types/design';
import type { EditorConfig } from '@/types/editor-config';
import {
  Layers, Package, Upload, X, Undo2, Redo2, ZoomIn, ZoomOut, Save,
  AlignCenterVertical, AlignCenterHorizontal,
  FlipHorizontal2, FlipVertical2, Crop, Check, Trash2,
} from 'lucide-react';

/**
 * Generates a composite preview by drawing the mockup background + artwork layers
 * onto a fresh canvas. This avoids CORS tainting because images are loaded
 * from same-origin proxy routes without the crossOrigin attribute.
 */
async function compositePreview(
  template: import('@/types/product').ProductTemplate | null,
  design: import('@/types/design').DesignDocument,
): Promise<string> {
  if (!template) return '';

  const view = template.views[0];
  if (!view) return '';

  const width = view.mockupWidth || 600;
  const height = view.mockupHeight || 600;
  const maxSize = 600;
  const scale = Math.min(maxSize / width, maxSize / height, 1);
  const cw = Math.round(width * scale);
  const ch = Math.round(height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Helper: load image without crossOrigin (same-origin proxy = no taint)
  const loadImg = (src: string): Promise<HTMLImageElement | null> =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });

  // Draw mockup background
  const mockupImg = await loadImg(view.mockupImageUrl);
  if (mockupImg) {
    ctx.drawImage(mockupImg, 0, 0, cw, ch);
  } else {
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, cw, ch);
  }

  // Draw artwork layers
  const designView = design.views[view.id];
  if (designView) {
    for (const layer of designView.layers) {
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
  }

  try {
    return canvas.toDataURL('image/jpeg', 0.8);
  } catch {
    return '';
  }
}

interface EditorPageProps {
  config?: EditorConfig;
}

export default function EditorPage({ config }: EditorPageProps) {
  const resolvedConfig: EditorConfig = config ?? { mode: 'demo' };

  return (
    <EditorConfigContext.Provider value={resolvedConfig}>
      <EditorPageInner />
    </EditorConfigContext.Provider>
  );
}

function EditorPageInner() {
  const editorConfig = useEditorConfig();
  const status = useTemplateLoader();

  const design = useDesignStore((s) => s.design);
  const loadDesign = useDesignStore((s) => s.loadDesign);
  const selectedTemplate = useProductStore((s) => s.selectedTemplate);
  const error = useProductStore((s) => s.error);
  const initDesign = useDesignStore((s) => s.initDesign);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const pendingExportRef = useRef<'json' | 'png' | null>(null);

  const isEmbedded = editorConfig.mode === 'embedded';
  const isPortal = editorConfig.mode === 'portal';
  const isMultiProduct = useMultiProductStore((s) => s.isMultiProduct);
  const [saving, setSaving] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<'none' | 'products' | 'layers' | 'upload'>('none');

  // Initialize design on first render
  useEffect(() => {
    if (selectedTemplate && !design.productTemplateId) {
      initDesign(
        selectedTemplate.id,
        selectedTemplate.views.map((v) => v.id)
      );
    }
  }, [selectedTemplate, design.productTemplateId, initDesign]);

  // Auto-save to localStorage (debounced)
  useEffect(() => {
    if (!design.productTemplateId) return;
    const timer = setTimeout(() => {
      ExportService.saveToLocal(design);
    }, 1000);
    return () => clearTimeout(timer);
  }, [design]);

  const doExport = useCallback((format: 'json' | 'png') => {
    if (format === 'json') {
      if (editorConfig.onExport) {
        editorConfig.onExport(ExportService.exportJSON(design));
      } else {
        ExportService.downloadJSON(design);
      }
    } else {
      window.dispatchEvent(new CustomEvent('ideamizer:export-png'));
    }
  }, [design, editorConfig]);

  const handleExportWithValidation = useCallback((format: 'json' | 'png') => {
    if (!selectedTemplate) {
      doExport(format);
      return;
    }
    const result = validateDesign(design, selectedTemplate);
    if (result.issues.length === 0) {
      doExport(format);
    } else {
      pendingExportRef.current = format;
      setValidationResult(result);
    }
  }, [design, selectedTemplate, doExport]);

  const handleExportJSON = useCallback(() => {
    handleExportWithValidation('json');
  }, [handleExportWithValidation]);

  const handleExportPNG = useCallback(() => {
    handleExportWithValidation('png');
  }, [handleExportWithValidation]);

  const handleSave = useCallback(() => {
    ExportService.saveToLocal(design);
    if (editorConfig.onSave) {
      editorConfig.onSave(ExportService.exportJSON(design));
    }
  }, [design, editorConfig]);

  const handleImportJSON = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const imported = ExportService.importJSON(reader.result as string);
        if (imported) {
          loadDesign(imported);
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    },
    [loadDesign]
  );

  const handleLayerAdded = useCallback((_layer: DesignLayer) => {
    window.dispatchEvent(
      new CustomEvent('ideamizer:layer-added', { detail: _layer })
    );
  }, []);

  const handleReorderLayers = useCallback((orderedIds: string[]) => {
    window.dispatchEvent(
      new CustomEvent('ideamizer:layers-reordered', { detail: orderedIds })
    );
  }, []);

  // Save & Finish: save all products back to Portal and redirect
  const handleSaveAndFinish = useCallback(async () => {
    if (!isPortal) return;
    setSaving(true);

    try {
      // Capture mockup preview of the current canvas
      let currentMockup = '';
      // Try event-based capture first (Fabric.js canvas export)
      currentMockup = await new Promise<string>((resolve) => {
        let resolved = false;
        const handler = (dataUrl: string) => { resolved = true; resolve(dataUrl); };
        window.dispatchEvent(new CustomEvent('ideamizer:capture-mockup', { detail: handler }));
        setTimeout(() => { if (!resolved) resolve(''); }, 500);
      });
      // Fallback: try direct canvas element capture (.lower-canvas is the render layer)
      if (!currentMockup) {
        try {
          const canvasEl = document.querySelector('.lower-canvas') as HTMLCanvasElement;
          if (canvasEl) {
            currentMockup = canvasEl.toDataURL('image/jpeg', 0.8);
          }
        } catch (err) {
          console.warn('[Save] Canvas capture failed (CORS tainted):', err);
        }
      }
      // Fallback: composite preview from mockup + artwork using a fresh canvas
      // This avoids CORS tainting by loading same-origin images without crossOrigin
      if (!currentMockup) {
        currentMockup = await compositePreview(selectedTemplate, useDesignStore.getState().design);
      }
      console.log('[Save] Mockup captured:', currentMockup ? `${currentMockup.length} chars` : 'FAILED - using artwork fallback');

      // Save current product first
      const currentDesign = structuredClone(useDesignStore.getState().design);
      const multiStore = useMultiProductStore.getState();
      if (multiStore.isMultiProduct) {
        multiStore.saveCurrentProduct(currentDesign, currentMockup || undefined);
      }

      // Get artwork URL as fallback preview
      const artworkUrl = multiStore.artworkUrl
        || new URLSearchParams(window.location.search).get('artwork_url')
        || null;

      // Re-read state after saveCurrentProduct to get updated thumbnails
      const updatedProducts = useMultiProductStore.getState().products;

      // Collect all products with their layers
      // For multi-product, generate composite previews for products without thumbnails
      let productsToSave;
      if (multiStore.isMultiProduct) {
        productsToSave = await Promise.all(
          updatedProducts.map(async (entry) => {
            let thumbnail = entry.thumbnail;
            if (!thumbnail) {
              thumbnail = await compositePreview(entry.template, entry.design) || artworkUrl;
            }
            const defaultView = entry.template.views.find(v => v.id === entry.template.defaultViewId) || entry.template.views[0];
            const allLayers = Object.values(entry.design.views).flatMap((v) => v.layers);
            const artworkUrls = allLayers
              .filter((l) => l.type === 'image' && l.data.type === 'image')
              .map((l) => (l.data as { src: string }).src);
            // Extract artwork original dimensions for DPI calculation
            const artworkLayers = allLayers.filter((l) => l.type === 'image' && l.data.type === 'image');
            const primaryArtwork = artworkLayers[0]?.data as { originalWidth?: number; originalHeight?: number } | undefined;
            return {
              template_id: entry.template.id,
              name: entry.template.name,
              description: entry.template.description || '',
              base_cost: parseFloat(String(entry.template.metadata?.price ?? 0)) || 0,
              thumbnail,
              layers: allLayers,
              artwork_urls: artworkUrls,
              product_images: entry.template.metadata?.productImages || [],
              print_area_snapshot: defaultView ? {
                x: defaultView.printableArea.x,
                y: defaultView.printableArea.y,
                width: defaultView.printableArea.width,
                height: defaultView.printableArea.height,
                physicalWidthInches: defaultView.printableArea.physicalWidthInches,
                physicalHeightInches: defaultView.printableArea.physicalHeightInches,
                minDPI: defaultView.printableArea.minDPI,
                shape: defaultView.printableArea.shape,
              } : null,
              design_metadata: {
                mockupWidth: defaultView?.mockupWidth ?? null,
                mockupHeight: defaultView?.mockupHeight ?? null,
                artworkOriginalWidth: primaryArtwork?.originalWidth ?? null,
                artworkOriginalHeight: primaryArtwork?.originalHeight ?? null,
                viewId: defaultView?.id ?? null,
              },
            };
          })
        );
      } else {
        const defaultView = selectedTemplate?.views.find(v => v.id === selectedTemplate.defaultViewId) || selectedTemplate?.views[0];
        const allLayers = Object.values(currentDesign.views).flatMap((v) => v.layers);
        const artworkUrls = allLayers
          .filter((l) => l.type === 'image' && l.data.type === 'image')
          .map((l) => (l.data as { src: string }).src);
        const artworkLayers = allLayers.filter((l) => l.type === 'image' && l.data.type === 'image');
        const primaryArtwork = artworkLayers[0]?.data as { originalWidth?: number; originalHeight?: number } | undefined;
        productsToSave = [{
          template_id: selectedTemplate?.id ?? '',
          name: selectedTemplate?.name ?? '',
          description: selectedTemplate?.description || '',
          base_cost: 0,
          thumbnail: currentMockup || artworkUrl,
          layers: allLayers,
          artwork_urls: artworkUrls,
          product_images: selectedTemplate?.metadata?.productImages || [],
          print_area_snapshot: defaultView ? {
            x: defaultView.printableArea.x,
            y: defaultView.printableArea.y,
            width: defaultView.printableArea.width,
            height: defaultView.printableArea.height,
            physicalWidthInches: defaultView.printableArea.physicalWidthInches,
            physicalHeightInches: defaultView.printableArea.physicalHeightInches,
            minDPI: defaultView.printableArea.minDPI,
            shape: defaultView.printableArea.shape,
          } : null,
          design_metadata: {
            mockupWidth: defaultView?.mockupWidth ?? null,
            mockupHeight: defaultView?.mockupHeight ?? null,
            artworkOriginalWidth: primaryArtwork?.originalWidth ?? null,
            artworkOriginalHeight: primaryArtwork?.originalHeight ?? null,
            viewId: defaultView?.id ?? null,
          },
        }];
      }

      // Parse callback_url and products_meta from URL params
      const params = new URLSearchParams(window.location.search);
      const callbackUrl = params.get('callback_url');
      const productsMeta = params.get('products_meta');
      const titlePrefix = params.get('title_prefix') || 'Design';

      // Merge Portal metadata with editor layer data
      let portalProducts: { id: string; name: string; base_cost: number; source: string; thumbnail: string | null }[] = [];
      if (productsMeta) {
        try {
          portalProducts = JSON.parse(decodeURIComponent(productsMeta));
        } catch { /* ignore */ }
      }

      const mergedProducts = productsToSave.map((p) => {
        const portalMatch = portalProducts.find((pm) => pm.id === p.template_id);
        return {
          template_id: p.template_id,
          name: portalMatch?.name || p.name,
          base_cost: portalMatch?.base_cost || p.base_cost,
          thumbnail: p.thumbnail || portalMatch?.thumbnail,
          layers: p.layers,
          artwork_urls: p.artwork_urls,
          product_images: p.product_images,
          print_area_snapshot: p.print_area_snapshot,
          design_metadata: p.design_metadata,
        };
      });

      if (callbackUrl) {
        // Generate server-side variant previews for each product (upload to R2)
        for (const product of mergedProducts) {
          const colorVariants = productsToSave.find(p => p.template_id === product.template_id);
          const template = multiStore.isMultiProduct
            ? updatedProducts.find(e => e.template.id === product.template_id)?.template
            : selectedTemplate;
          const variants = (template?.metadata?.colorVariants ?? []) as { color: string; imageUrl: string; rawImagePath?: string }[];
          const printArea = product.print_area_snapshot;
          const meta = product.design_metadata;

          if (variants.length > 0 && meta?.mockupWidth && product.layers?.length > 0) {
            try {
              console.log('[Save] Calling generate-variant-previews API...', {
                variantsCount: variants.length,
                layersCount: product.layers.length,
                mockupSize: `${meta.mockupWidth}x${meta.mockupHeight}`,
              });
              const res = await fetch('/api/generate-variant-previews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  product_id: product.template_id,
                  layers: product.layers,
                  mockup_width: meta.mockupWidth,
                  mockup_height: meta.mockupHeight,
                  variants: variants.map((v) => ({
                    id: v.color,
                    mockup_url: v.rawImagePath || v.imageUrl,
                    label: v.color,
                  })),
                }),
              });
              const resText = await res.text();
              console.log('[Save] Variant preview API response:', res.status, resText.substring(0, 200));
              if (res.ok) {
                const data = JSON.parse(resText);
                (product as Record<string, unknown>).variant_previews = data.previews || {};
                console.log('[Save] Variant previews generated:', Object.keys(data.previews || {}).length);
              }
            } catch (err) {
              console.error('[Save] Variant preview generation failed:', err);
              // Non-blocking — continue without variant previews
            }
          }
        }

        // Redirect to Portal's import page with data in URL hash
        const payload = encodeURIComponent(JSON.stringify({
          design_id: editorConfig.designId,
          products: mergedProducts,
          title_prefix: decodeURIComponent(titlePrefix),
        }));

        const portalOrigin = new URL(callbackUrl).origin;
        window.location.href = `${portalOrigin}/dashboard/products/import#${payload}`;
        return;
      } else {
        // No callback — just save locally
        ExportService.saveToLocal(currentDesign);
        alert('Design saved locally.');
      }
    } catch (err) {
      alert(`Save failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  }, [isPortal, editorConfig, selectedTemplate]);

  // Loading state
  if (status === 'loading' || status === 'idle') {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading templates...</div>
      </div>
    );
  }

  // Error state
  if (status === 'error') {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-500 font-medium mb-2">Failed to load templates</div>
          <div className="text-sm text-gray-500">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden">
      {validationResult && (
        <ValidationDialog
          result={validationResult}
          onExportAnyway={() => {
            const format = pendingExportRef.current;
            setValidationResult(null);
            pendingExportRef.current = null;
            if (format) doExport(format);
          }}
          onCancel={() => {
            setValidationResult(null);
            pendingExportRef.current = null;
          }}
        />
      )}

      {/* Desktop toolbar */}
      <div className="hidden md:block">
        <Toolbar
          onExportJSON={handleExportJSON}
          onExportPNG={handleExportPNG}
          onSave={handleSave}
        />
      </div>

      {/* Mobile compact toolbar */}
      <MobileToolbar onSave={handleSave} />

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Multi-product panel — desktop only */}
        <div className="hidden md:block">
          {isMultiProduct && <MultiProductPanel />}
        </div>

        {/* Left sidebar — desktop only */}
        <div className="hidden md:flex w-56 flex-col border-r border-gray-200 bg-white overflow-y-auto">
          {!isEmbedded && <ProductSelector />}
          <div className="p-3 border-t border-gray-200">
            <DesignUploader onLayerAdded={handleLayerAdded} />
            <button
              onClick={handleImportJSON}
              className="w-full mt-2 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
            >
              Import JSON
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileImport}
              className="hidden"
            />
          </div>
        </div>

        {/* Canvas area + variant preview strip */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <EditorShell />
          <VariantPreviewStrip />
        </div>

        {/* Right sidebar — desktop only */}
        <div className="hidden md:flex w-64 bg-white border-l border-gray-200 flex-col overflow-y-auto">
          <LayerPanel onReorderLayers={handleReorderLayers} onDuplicateLayer={handleLayerAdded} />
          <div className="border-t border-gray-200">
            <PropertiesPanel onReorderLayers={handleReorderLayers} />
          </div>
        </div>
      </div>

      {/* Mobile bottom tab bar */}
      <div className="md:hidden bg-white border-t border-gray-200 flex items-center safe-pb">
        <MobileTabBtn
          icon={<Package className="w-5 h-5" />}
          label="Products"
          active={mobilePanel === 'products'}
          onClick={() => setMobilePanel(mobilePanel === 'products' ? 'none' : 'products')}
        />
        <MobileTabBtn
          icon={<Upload className="w-5 h-5" />}
          label="Upload"
          active={mobilePanel === 'upload'}
          onClick={() => setMobilePanel(mobilePanel === 'upload' ? 'none' : 'upload')}
        />
        <MobileTabBtn
          icon={<Layers className="w-5 h-5" />}
          label="Layers"
          active={mobilePanel === 'layers'}
          onClick={() => setMobilePanel(mobilePanel === 'layers' ? 'none' : 'layers')}
        />
        {isPortal && (
          <button
            onClick={handleSaveAndFinish}
            disabled={saving}
            className="flex-1 flex flex-col items-center gap-0.5 py-2.5 text-blue-600"
          >
            <Save className="w-5 h-5" />
            <span className="text-[10px] font-semibold">{saving ? 'Saving...' : 'Finish'}</span>
          </button>
        )}
      </div>

      {/* Mobile bottom sheet */}
      {mobilePanel !== 'none' && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobilePanel('none')} />
          <div className="relative bg-white rounded-t-2xl max-h-[65vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
              <h3 className="text-sm font-semibold text-gray-900">
                {mobilePanel === 'products' && 'Products'}
                {mobilePanel === 'upload' && 'Upload Design'}
                {mobilePanel === 'layers' && 'Layers & Properties'}
              </h3>
              <button onClick={() => setMobilePanel('none')} className="p-1 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {mobilePanel === 'products' && (
                <div>
                  {isMultiProduct && <MultiProductPanel />}
                  {!isEmbedded && <ProductSelector />}
                </div>
              )}
              {mobilePanel === 'upload' && (
                <div className="p-4">
                  <DesignUploader onLayerAdded={(layer) => { handleLayerAdded(layer); setMobilePanel('none'); }} />
                </div>
              )}
              {mobilePanel === 'layers' && (
                <div>
                  <LayerPanel onReorderLayers={handleReorderLayers} onDuplicateLayer={handleLayerAdded} />
                  <div className="border-t border-gray-200">
                    <PropertiesPanel onReorderLayers={handleReorderLayers} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Save & Finish — desktop only (mobile has it in tab bar) */}
      {isPortal && (
        <div className="hidden md:block fixed bottom-6 right-6 z-50">
          <button
            onClick={handleSaveAndFinish}
            disabled={saving}
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl shadow-lg hover:bg-blue-700 disabled:opacity-50 transition-all"
          >
            {saving ? 'Saving...' : 'Save & Finish'}
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Mobile helper components ── */

function MobileTabBtn({ icon, label, active, onClick }: {
  icon: React.ReactNode; label: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors ${
        active ? 'text-blue-600' : 'text-gray-500'
      }`}
    >
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

function MobileToolbar({ onSave }: { onSave?: () => void }) {
  const { undo, redo, canUndo, canRedo } = useHistory();
  const zoom = useEditorStore((s) => s.zoom);
  const setZoom = useEditorStore((s) => s.setZoom);
  const selectedLayerIds = useEditorStore((s) => s.selectedLayerIds);
  const activeTool = useEditorStore((s) => s.activeTool);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);
  const hasSelection = selectedLayerIds.length === 1;
  const isCropping = activeTool === 'crop';

  const handleAlign = (action: string) => {
    if (!hasSelection) return;
    const viewId = useProductStore.getState().activeViewId;
    const template = useProductStore.getState().selectedTemplate;
    const design = useDesignStore.getState().design;
    const view = design.views[viewId];
    const productView = template?.views.find((v: { id: string }) => v.id === viewId);
    if (!view || !productView) return;

    const layer = view.layers.find((l: { id: string }) => l.id === selectedLayerIds[0]);
    if (!layer) return;

    // Dynamic import to avoid circular deps
    import('@/core/canvas/AlignmentService').then(({ calculateAlignment }) => {
      const { x, y } = calculateAlignment(action as Parameters<typeof calculateAlignment>[0], layer.transform, productView.printableArea);
      useDesignStore.getState().updateLayer(viewId, layer.id, {
        transform: { ...layer.transform, x, y },
      });
      window.dispatchEvent(new CustomEvent('ideamizer:layer-transform', { detail: { layerId: layer.id, x, y } }));
    });
  };

  const handleFlip = (direction: 'horizontal' | 'vertical') => {
    if (!hasSelection) return;
    const viewId = useProductStore.getState().activeViewId;
    const design = useDesignStore.getState().design;
    const view = design.views[viewId];
    const layer = view?.layers.find((l: { id: string }) => l.id === selectedLayerIds[0]);
    if (!layer) return;

    const key = direction === 'horizontal' ? 'flipX' : 'flipY';
    useDesignStore.getState().updateLayer(viewId, layer.id, {
      transform: { ...layer.transform, [key]: !layer.transform[key] },
    });
    window.dispatchEvent(new CustomEvent('ideamizer:layer-flip', { detail: { layerId: layer.id, direction } }));
  };

  const handleDelete = () => {
    if (!hasSelection) return;
    const viewId = useProductStore.getState().activeViewId;
    useDesignStore.getState().removeLayer(viewId, selectedLayerIds[0]);
    useEditorStore.getState().setSelectedLayerIds([]);
  };

  const btnClass = "p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200";

  return (
    <div className="md:hidden flex items-center gap-0.5 bg-white border-b border-gray-200 px-1 py-1 overflow-x-auto">
      {/* Undo/Redo */}
      <button onClick={undo} disabled={!canUndo()} className={`${btnClass} disabled:opacity-30`}>
        <Undo2 className="w-4 h-4 text-gray-700" />
      </button>
      <button onClick={redo} disabled={!canRedo()} className={`${btnClass} disabled:opacity-30`}>
        <Redo2 className="w-4 h-4 text-gray-700" />
      </button>

      <div className="w-px h-5 bg-gray-200 mx-0.5 shrink-0" />

      {/* Zoom */}
      <button onClick={() => setZoom(Math.max(0.1, zoom - 0.15))} className={btnClass}>
        <ZoomOut className="w-4 h-4 text-gray-700" />
      </button>
      <span className="text-[10px] text-gray-500 w-8 text-center shrink-0">{Math.round(zoom * 100)}%</span>
      <button onClick={() => setZoom(Math.min(3, zoom + 0.15))} className={btnClass}>
        <ZoomIn className="w-4 h-4 text-gray-700" />
      </button>

      {/* Selection tools — shown when a layer is selected */}
      {hasSelection && !isCropping && (
        <>
          <div className="w-px h-5 bg-gray-200 mx-0.5 shrink-0" />
          <button onClick={() => handleAlign('center-h')} className={btnClass} title="Center H">
            <AlignCenterVertical className="w-4 h-4 text-gray-700" />
          </button>
          <button onClick={() => handleAlign('center-v')} className={btnClass} title="Center V">
            <AlignCenterHorizontal className="w-4 h-4 text-gray-700" />
          </button>
          <button onClick={() => handleFlip('horizontal')} className={btnClass} title="Flip H">
            <FlipHorizontal2 className="w-4 h-4 text-gray-700" />
          </button>
          <button onClick={() => handleFlip('vertical')} className={btnClass} title="Flip V">
            <FlipVertical2 className="w-4 h-4 text-gray-700" />
          </button>
          <button
            onClick={() => {
              setActiveTool('crop');
              window.dispatchEvent(new CustomEvent('ideamizer:enter-crop', { detail: selectedLayerIds[0] }));
            }}
            className={btnClass}
            title="Crop"
          >
            <Crop className="w-4 h-4 text-gray-700" />
          </button>
          <button onClick={handleDelete} className={btnClass} title="Delete">
            <Trash2 className="w-4 h-4 text-red-500" />
          </button>
        </>
      )}

      {/* Crop mode actions */}
      {isCropping && (
        <>
          <div className="w-px h-5 bg-gray-200 mx-0.5 shrink-0" />
          <button
            onClick={() => { setActiveTool('select'); window.dispatchEvent(new CustomEvent('ideamizer:apply-crop')); }}
            className={btnClass}
          >
            <Check className="w-4 h-4 text-green-600" />
          </button>
          <button
            onClick={() => { setActiveTool('select'); window.dispatchEvent(new CustomEvent('ideamizer:cancel-crop')); }}
            className={btnClass}
          >
            <X className="w-4 h-4 text-red-500" />
          </button>
        </>
      )}

      <div className="flex-1" />
      <button onClick={onSave} className={btnClass} title="Save">
        <Save className="w-4 h-4 text-gray-700" />
      </button>
    </div>
  );
}
