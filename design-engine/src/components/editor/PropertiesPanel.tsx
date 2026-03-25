'use client';

import { useState } from 'react';
import { ArrowUp, ArrowDown, ChevronsUp, ChevronsDown, Eraser, Loader2 } from 'lucide-react';
import { useDesignStore } from '@/stores/designStore';
import { useProductStore } from '@/stores/productStore';
import { useEditorStore } from '@/stores/editorStore';
import { calculateDpi } from '@/core/canvas/DpiCalculator';
import { BackgroundRemovalService } from '@/core/canvas/BackgroundRemovalService';
import type { DpiStatus } from '@/core/canvas/DpiCalculator';

interface PropertiesPanelProps {
  onUpdateTransform?: (layerId: string, transform: Record<string, unknown>) => void;
  onReorderLayers?: (orderedIds: string[]) => void;
}

const dpiStatusConfig: Record<DpiStatus, { label: string; bg: string; text: string; dot: string }> = {
  good: { label: 'Good', bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  warning: { label: 'OK', bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  low: { label: 'Low', bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
};

export default function PropertiesPanel({ onUpdateTransform, onReorderLayers }: PropertiesPanelProps) {
  const [bgRemovalProgress, setBgRemovalProgress] = useState<number | null>(null);
  const activeViewId = useProductStore((s) => s.activeViewId);
  const selectedTemplate = useProductStore((s) => s.selectedTemplate);
  const design = useDesignStore((s) => s.design);
  const updateLayer = useDesignStore((s) => s.updateLayer);
  const moveLayerForward = useDesignStore((s) => s.moveLayerForward);
  const moveLayerBackward = useDesignStore((s) => s.moveLayerBackward);
  const moveLayerToFront = useDesignStore((s) => s.moveLayerToFront);
  const moveLayerToBack = useDesignStore((s) => s.moveLayerToBack);
  const selectedLayerIds = useEditorStore((s) => s.selectedLayerIds);

  const currentView = design.views[activeViewId];
  const selectedLayer = currentView?.layers.find((l) => l.id === selectedLayerIds[0]);

  const activeProductView = selectedTemplate?.views.find((v) => v.id === activeViewId);

  if (!selectedLayer) {
    return (
      <div className="flex flex-col">
        <div className="p-3 border-b border-gray-200">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Properties
          </h3>
        </div>
        <div className="p-4 text-center text-sm text-gray-400">
          Select a layer to edit properties
        </div>
      </div>
    );
  }

  const { transform } = selectedLayer;

  const dpiInfo = activeProductView
    ? calculateDpi(selectedLayer, activeProductView.printableArea)
    : null;

  const handleTransformChange = (key: string, value: number) => {
    const newTransform = { ...transform, [key]: value };
    updateLayer(activeViewId, selectedLayer.id, { transform: newTransform });
    onUpdateTransform?.(selectedLayer.id, { [key]: value });
  };

  const handleOpacityChange = (opacity: number) => {
    updateLayer(activeViewId, selectedLayer.id, { opacity });
  };

  const handleZOrder = (action: 'forward' | 'backward' | 'front' | 'back') => {
    const id = selectedLayer.id;
    switch (action) {
      case 'forward': moveLayerForward(activeViewId, id); break;
      case 'backward': moveLayerBackward(activeViewId, id); break;
      case 'front': moveLayerToFront(activeViewId, id); break;
      case 'back': moveLayerToBack(activeViewId, id); break;
    }
    // Sync canvas z-order
    const view = useDesignStore.getState().design.views[activeViewId];
    if (view) {
      const ids = view.layers.map((l) => l.id);
      onReorderLayers?.(ids);
    }
  };

  const handleRemoveBg = async () => {
    if (selectedLayer.data.type !== 'image' || bgRemovalProgress !== null) return;
    const src = selectedLayer.data.src;
    setBgRemovalProgress(0);
    try {
      const resultDataUrl = await BackgroundRemovalService.removeBackground(src, (p) => {
        setBgRemovalProgress(p);
      });
      // Update store with new src
      updateLayer(activeViewId, selectedLayer.id, {
        data: { ...selectedLayer.data, src: resultDataUrl },
      });
      // Update canvas
      window.dispatchEvent(
        new CustomEvent('ideamizer:update-image-src', {
          detail: { layerId: selectedLayer.id, src: resultDataUrl },
        })
      );
    } catch (err) {
      console.error('Background removal failed:', err);
    } finally {
      setBgRemovalProgress(null);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="p-3 border-b border-gray-200">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Properties
        </h3>
      </div>

      <div className="p-3 space-y-3">
        {/* Layer name */}
        <div>
          <label className="text-xs text-gray-500 block mb-1">Name</label>
          <div className="text-sm font-medium text-gray-800">{selectedLayer.name}</div>
        </div>

        {/* DPI Info for image layers */}
        {dpiInfo && <DpiBadge dpiInfo={dpiInfo} />}

        {/* Remove Background (image layers only) */}
        {selectedLayer.data.type === 'image' && (
          <button
            onClick={handleRemoveBg}
            disabled={bgRemovalProgress !== null}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-60 disabled:cursor-wait transition-colors"
          >
            {bgRemovalProgress !== null ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Removing... {Math.round(bgRemovalProgress * 100)}%
              </>
            ) : (
              <>
                <Eraser className="w-4 h-4" />
                Remove Background
              </>
            )}
          </button>
        )}

        {/* Position */}
        <div className="grid grid-cols-2 gap-2">
          <PropertyInput
            label="X"
            value={Math.round(transform.x)}
            onChange={(v) => handleTransformChange('x', v)}
          />
          <PropertyInput
            label="Y"
            value={Math.round(transform.y)}
            onChange={(v) => handleTransformChange('y', v)}
          />
        </div>

        {/* Size */}
        <div className="grid grid-cols-2 gap-2">
          <PropertyInput
            label="W"
            value={Math.round(transform.width * transform.scaleX)}
            onChange={(v) => handleTransformChange('scaleX', v / transform.width)}
          />
          <PropertyInput
            label="H"
            value={Math.round(transform.height * transform.scaleY)}
            onChange={(v) => handleTransformChange('scaleY', v / transform.height)}
          />
        </div>

        {/* Rotation */}
        <PropertyInput
          label="Rotation"
          value={Math.round(transform.rotation)}
          onChange={(v) => handleTransformChange('rotation', v)}
          suffix="°"
        />

        {/* Opacity */}
        <div>
          <label className="text-xs text-gray-500 block mb-1">Opacity</label>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(selectedLayer.opacity * 100)}
            onChange={(e) => handleOpacityChange(Number(e.target.value) / 100)}
            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <div className="text-xs text-gray-400 text-right mt-0.5">
            {Math.round(selectedLayer.opacity * 100)}%
          </div>
        </div>

        {/* Z-Order */}
        <div>
          <label className="text-xs text-gray-500 block mb-1">Layer Order</label>
          <div className="flex gap-1">
            <button
              onClick={() => handleZOrder('front')}
              title="Bring to Front"
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded hover:bg-gray-100"
            >
              <ChevronsUp className="w-3 h-3" />
            </button>
            <button
              onClick={() => handleZOrder('forward')}
              title="Bring Forward"
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded hover:bg-gray-100"
            >
              <ArrowUp className="w-3 h-3" />
            </button>
            <button
              onClick={() => handleZOrder('backward')}
              title="Send Backward"
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded hover:bg-gray-100"
            >
              <ArrowDown className="w-3 h-3" />
            </button>
            <button
              onClick={() => handleZOrder('back')}
              title="Send to Back"
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded hover:bg-gray-100"
            >
              <ChevronsDown className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DpiBadge({ dpiInfo }: { dpiInfo: { effectiveDpi: number; status: DpiStatus; minDpi: number } }) {
  const config = dpiStatusConfig[dpiInfo.status];

  return (
    <div className={`rounded-lg p-2.5 ${config.bg}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-600">Print DPI</span>
        <span className={`inline-flex items-center gap-1 text-xs font-semibold ${config.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
          {config.label}
        </span>
      </div>
      <div className={`text-lg font-bold ${config.text}`}>
        {dpiInfo.effectiveDpi} DPI
      </div>
      {dpiInfo.status === 'low' && (
        <p className="text-xs text-red-600 mt-1">
          Below minimum {dpiInfo.minDpi} DPI. Image may print blurry.
        </p>
      )}
      {dpiInfo.status === 'warning' && (
        <p className="text-xs text-yellow-600 mt-1">
          Acceptable, but 300+ DPI recommended for best quality.
        </p>
      )}
    </div>
  );
}

function PropertyInput({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  return (
    <div>
      <label className="text-xs text-gray-500 block mb-1">{label}</label>
      <div className="flex items-center">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full text-sm bg-gray-50 border border-gray-200 rounded px-2 py-1 outline-none focus:border-blue-400"
        />
        {suffix && <span className="text-xs text-gray-400 ml-1">{suffix}</span>}
      </div>
    </div>
  );
}
