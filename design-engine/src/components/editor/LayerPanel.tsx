'use client';

import { Eye, EyeOff, Lock, Unlock, Trash2, GripVertical, Copy } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDesignStore } from '@/stores/designStore';
import { useProductStore } from '@/stores/productStore';
import { useEditorStore } from '@/stores/editorStore';
import { cn } from '@/lib/cn';
import type { DesignLayer } from '@/types/design';

interface LayerPanelProps {
  onSelectLayer?: (layerId: string) => void;
  onRemoveLayer?: (layerId: string) => void;
  onToggleVisibility?: (layerId: string, visible: boolean) => void;
  onToggleLock?: (layerId: string, locked: boolean) => void;
  onReorderLayers?: (orderedIds: string[]) => void;
  onDuplicateLayer?: (newLayer: import('@/types/design').DesignLayer) => void;
}

export default function LayerPanel({
  onSelectLayer,
  onRemoveLayer,
  onToggleVisibility,
  onToggleLock,
  onReorderLayers,
  onDuplicateLayer,
}: LayerPanelProps) {
  const activeViewId = useProductStore((s) => s.activeViewId);
  const design = useDesignStore((s) => s.design);
  const updateLayer = useDesignStore((s) => s.updateLayer);
  const removeLayer = useDesignStore((s) => s.removeLayer);
  const reorderLayers = useDesignStore((s) => s.reorderLayers);
  const duplicateLayer = useDesignStore((s) => s.duplicateLayer);
  const selectedLayerIds = useEditorStore((s) => s.selectedLayerIds);
  const setSelectedLayerIds = useEditorStore((s) => s.setSelectedLayerIds);

  const currentView = design.views[activeViewId];
  const layers = currentView?.layers ?? [];

  // Display order: reversed (top layer first in UI)
  const displayLayers = [...layers].reverse();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleToggleVisibility = (layer: DesignLayer) => {
    const newVisible = !layer.visible;
    updateLayer(activeViewId, layer.id, { visible: newVisible });
    onToggleVisibility?.(layer.id, newVisible);
  };

  const handleToggleLock = (layer: DesignLayer) => {
    const newLocked = !layer.locked;
    updateLayer(activeViewId, layer.id, { locked: newLocked });
    onToggleLock?.(layer.id, newLocked);
  };

  const handleRemove = (layerId: string) => {
    removeLayer(activeViewId, layerId);
    onRemoveLayer?.(layerId);
    setSelectedLayerIds(selectedLayerIds.filter((id) => id !== layerId));
  };

  const handleSelect = (layerId: string) => {
    setSelectedLayerIds([layerId]);
    onSelectLayer?.(layerId);
  };

  const handleDuplicate = (layerId: string) => {
    const newLayer = duplicateLayer(activeViewId, layerId);
    if (newLayer) {
      setSelectedLayerIds([newLayer.id]);
      onDuplicateLayer?.(newLayer);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = displayLayers.findIndex((l) => l.id === active.id);
    const newIndex = displayLayers.findIndex((l) => l.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    // Reorder in display order, then reverse back to store order
    const reordered = [...displayLayers];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    // Store order is reversed display order
    const storeOrderIds = [...reordered].reverse().map((l) => l.id);
    reorderLayers(activeViewId, storeOrderIds);
    onReorderLayers?.(storeOrderIds);
  };

  return (
    <div className="flex flex-col">
      <div className="p-3 border-b border-gray-200">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Layers</h3>
      </div>

      {layers.length === 0 ? (
        <div className="p-4 text-center text-sm text-gray-400">
          No layers yet. Upload an image to start.
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={displayLayers.map((l) => l.id)} strategy={verticalListSortingStrategy}>
            <div className="flex-1 overflow-y-auto">
              {displayLayers.map((layer) => (
                <SortableLayerItem
                  key={layer.id}
                  layer={layer}
                  isSelected={selectedLayerIds.includes(layer.id)}
                  onSelect={handleSelect}
                  onToggleVisibility={handleToggleVisibility}
                  onToggleLock={handleToggleLock}
                  onRemove={handleRemove}
                  onDuplicate={handleDuplicate}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

function SortableLayerItem({
  layer,
  isSelected,
  onSelect,
  onToggleVisibility,
  onToggleLock,
  onRemove,
  onDuplicate,
}: {
  layer: DesignLayer;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onToggleVisibility: (layer: DesignLayer) => void;
  onToggleLock: (layer: DesignLayer) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: layer.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onSelect(layer.id)}
      className={cn(
        'flex items-center gap-1 px-2 py-1.5 border-b border-gray-100 cursor-pointer group',
        isSelected ? 'bg-blue-50' : 'hover:bg-gray-50',
        isDragging && 'z-10 shadow-md bg-white'
      )}
    >
      <button
        className="touch-none p-0.5 cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-3 h-3 text-gray-300" />
      </button>

      {/* Layer type indicator */}
      <div
        className={cn(
          'w-6 h-6 rounded flex items-center justify-center text-[10px] font-medium',
          layer.type === 'image' && 'bg-purple-100 text-purple-600',
          layer.type === 'text' && 'bg-green-100 text-green-600',
          layer.type === 'shape' && 'bg-orange-100 text-orange-600'
        )}
      >
        {layer.type === 'image' ? 'IMG' : layer.type === 'text' ? 'T' : 'S'}
      </div>

      {/* Layer name */}
      <span className="flex-1 text-xs text-gray-700 truncate">{layer.name}</span>

      {/* Actions */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleVisibility(layer);
        }}
        className="p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {layer.visible ? (
          <Eye className="w-3 h-3 text-gray-400" />
        ) : (
          <EyeOff className="w-3 h-3 text-gray-300" />
        )}
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleLock(layer);
        }}
        className="p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {layer.locked ? (
          <Lock className="w-3 h-3 text-gray-400" />
        ) : (
          <Unlock className="w-3 h-3 text-gray-300" />
        )}
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onDuplicate(layer.id);
        }}
        className="p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Duplicate"
      >
        <Copy className="w-3 h-3 text-gray-400" />
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove(layer.id);
        }}
        className="p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Delete"
      >
        <Trash2 className="w-3 h-3 text-red-400" />
      </button>
    </div>
  );
}
