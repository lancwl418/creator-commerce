'use client';

import {
  Undo2, Redo2, ZoomIn, ZoomOut, Maximize2, Download, Save,
  Eye, EyeOff, AlignStartVertical, AlignCenterVertical, AlignEndVertical,
  AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal,
  FlipHorizontal2, FlipVertical2, Grid3x3, Magnet, Crop, Check, X,
} from 'lucide-react';
import { useHistory } from '@/hooks/useHistory';
import { useEditorStore } from '@/stores/editorStore';
import { useDesignStore } from '@/stores/designStore';
import { useProductStore } from '@/stores/productStore';
import { calculateAlignment } from '@/core/canvas/AlignmentService';
import type { AlignAction } from '@/core/canvas/AlignmentService';
import { cn } from '@/lib/cn';

interface ToolbarProps {
  onExportJSON?: () => void;
  onExportPNG?: () => void;
  onSave?: () => void;
}

export default function Toolbar({ onExportJSON, onExportPNG, onSave }: ToolbarProps) {
  const { undo, redo, canUndo, canRedo } = useHistory();
  const { zoom, setZoom, showPrintableArea, togglePrintableArea, showGrid, toggleGrid, snapToGrid, toggleSnapToGrid } = useEditorStore();
  const selectedLayerIds = useEditorStore((s) => s.selectedLayerIds);
  const designName = useDesignStore((s) => s.design.name);
  const setDesignName = useDesignStore((s) => s.setDesignName);

  const activeTool = useEditorStore((s) => s.activeTool);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);
  const hasSelection = selectedLayerIds.length === 1;
  const isCropping = activeTool === 'crop';

  const handleAlign = (action: AlignAction) => {
    if (!hasSelection) return;
    const viewId = useProductStore.getState().activeViewId;
    const template = useProductStore.getState().selectedTemplate;
    const design = useDesignStore.getState().design;
    const view = design.views[viewId];
    const productView = template?.views.find((v) => v.id === viewId);
    if (!view || !productView) return;

    const layer = view.layers.find((l) => l.id === selectedLayerIds[0]);
    if (!layer) return;

    const { x, y } = calculateAlignment(action, layer.transform, productView.printableArea);
    useDesignStore.getState().updateLayer(viewId, layer.id, {
      transform: { ...layer.transform, x, y },
    });

    window.dispatchEvent(
      new CustomEvent('ideamizer:layer-transform', {
        detail: { layerId: layer.id, x, y },
      })
    );
  };

  const handleFlip = (direction: 'horizontal' | 'vertical') => {
    if (!hasSelection) return;
    const viewId = useProductStore.getState().activeViewId;
    const design = useDesignStore.getState().design;
    const view = design.views[viewId];
    const layer = view?.layers.find((l) => l.id === selectedLayerIds[0]);
    if (!layer) return;

    const key = direction === 'horizontal' ? 'flipX' : 'flipY';
    const newValue = !layer.transform[key];
    useDesignStore.getState().updateLayer(viewId, layer.id, {
      transform: { ...layer.transform, [key]: newValue },
    });

    window.dispatchEvent(
      new CustomEvent('ideamizer:layer-flip', {
        detail: { layerId: layer.id, direction },
      })
    );
  };

  return (
    <div className="bg-white border-b border-gray-200 flex items-end px-3 gap-1 py-1">
      {/* Design name */}
      <div className="flex flex-col items-center mr-2 self-center">
        <input
          type="text"
          value={designName}
          onChange={(e) => setDesignName(e.target.value)}
          className="text-sm font-medium text-gray-800 bg-transparent border-none outline-none w-40 hover:bg-gray-50 px-2 py-1 rounded"
        />
      </div>

      <ToolbarDivider />

      {/* Undo / Redo */}
      <ToolbarGroup label="History">
        <ToolbarButton onClick={undo} disabled={!canUndo()} title="Undo (Ctrl+Z)">
          <Undo2 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={redo} disabled={!canRedo()} title="Redo (Ctrl+Shift+Z)">
          <Redo2 className="w-4 h-4" />
        </ToolbarButton>
      </ToolbarGroup>

      <ToolbarDivider />

      {/* Zoom */}
      <ToolbarGroup label="Zoom">
        <ToolbarButton onClick={() => setZoom(zoom - 0.1)} title="Zoom Out">
          <ZoomOut className="w-4 h-4" />
        </ToolbarButton>
        <span className="text-[10px] text-gray-600 w-10 text-center select-none leading-7">
          {Math.round(zoom * 100)}%
        </span>
        <ToolbarButton onClick={() => setZoom(zoom + 0.1)} title="Zoom In">
          <ZoomIn className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => setZoom(1)} title="Reset Zoom">
          <Maximize2 className="w-4 h-4" />
        </ToolbarButton>
      </ToolbarGroup>

      <ToolbarDivider />

      {/* View controls */}
      <ToolbarGroup label="View">
        <ToolbarButton onClick={togglePrintableArea} title="Toggle Printable Area">
          {showPrintableArea ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </ToolbarButton>
        <ToolbarButton
          onClick={() => {
            toggleGrid();
            window.dispatchEvent(new CustomEvent('ideamizer:toggle-grid'));
          }}
          title={showGrid ? 'Hide Grid' : 'Show Grid'}
        >
          <Grid3x3 className={cn('w-4 h-4', showGrid && 'text-blue-500')} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => {
            toggleSnapToGrid();
            window.dispatchEvent(new CustomEvent('ideamizer:toggle-snap'));
          }}
          title={snapToGrid ? 'Disable Snap' : 'Enable Snap'}
        >
          <Magnet className={cn('w-4 h-4', snapToGrid && 'text-blue-500')} />
        </ToolbarButton>
      </ToolbarGroup>

      {/* Alignment, Flip, Crop (shown when layer selected) */}
      {hasSelection && (
        <>
          <ToolbarDivider />

          <ToolbarGroup label="Align">
            <ToolbarButton onClick={() => handleAlign('left')} title="Align Left">
              <AlignStartVertical className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => handleAlign('center-h')} title="Align Center">
              <AlignCenterVertical className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => handleAlign('right')} title="Align Right">
              <AlignEndVertical className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => handleAlign('top')} title="Align Top">
              <AlignStartHorizontal className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => handleAlign('center-v')} title="Align Middle">
              <AlignCenterHorizontal className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => handleAlign('bottom')} title="Align Bottom">
              <AlignEndHorizontal className="w-4 h-4" />
            </ToolbarButton>
          </ToolbarGroup>

          <ToolbarDivider />

          <ToolbarGroup label="Flip">
            <ToolbarButton onClick={() => handleFlip('horizontal')} title="Flip Horizontal">
              <FlipHorizontal2 className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => handleFlip('vertical')} title="Flip Vertical">
              <FlipVertical2 className="w-4 h-4" />
            </ToolbarButton>
          </ToolbarGroup>

          <ToolbarDivider />

          <ToolbarGroup label={isCropping ? 'Cropping' : 'Crop'}>
            {!isCropping ? (
              <ToolbarButton
                onClick={() => {
                  setActiveTool('crop');
                  window.dispatchEvent(
                    new CustomEvent('ideamizer:enter-crop', { detail: selectedLayerIds[0] })
                  );
                }}
                title="Crop"
              >
                <Crop className="w-4 h-4" />
              </ToolbarButton>
            ) : (
              <>
                <ToolbarButton
                  onClick={() => {
                    setActiveTool('select');
                    window.dispatchEvent(new CustomEvent('ideamizer:apply-crop'));
                  }}
                  title="Apply Crop"
                >
                  <Check className="w-4 h-4 text-green-600" />
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => {
                    setActiveTool('select');
                    window.dispatchEvent(new CustomEvent('ideamizer:cancel-crop'));
                  }}
                  title="Cancel Crop"
                >
                  <X className="w-4 h-4 text-red-500" />
                </ToolbarButton>
              </>
            )}
          </ToolbarGroup>
        </>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Export / Save */}
      <ToolbarGroup label="Save">
        <ToolbarButton onClick={onSave} title="Save">
          <Save className="w-4 h-4" />
        </ToolbarButton>
      </ToolbarGroup>

      <ToolbarGroup label="Export">
        <div className="relative group">
          <ToolbarButton title="Export">
            <Download className="w-4 h-4" />
          </ToolbarButton>
          <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg py-1 hidden group-hover:block z-50 min-w-[140px]">
            <button
              onClick={onExportJSON}
              className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              Export JSON
            </button>
            <button
              onClick={onExportPNG}
              className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              Export PNG
            </button>
          </div>
        </div>
      </ToolbarGroup>
    </div>
  );
}

function ToolbarGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="flex items-center gap-0.5">{children}</div>
      <span className="text-[9px] text-gray-400 leading-none select-none">{label}</span>
    </div>
  );
}

function ToolbarDivider() {
  return <div className="h-8 w-px bg-gray-200 mx-1 self-center" />;
}

function ToolbarButton({
  children,
  onClick,
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'p-1.5 rounded hover:bg-gray-100 transition-colors',
        disabled && 'opacity-30 cursor-not-allowed'
      )}
    >
      {children}
    </button>
  );
}
