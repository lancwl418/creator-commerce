'use client';

import { useState } from 'react';
import { useProductStore } from '@/stores/productStore';
import { useDesignStore } from '@/stores/designStore';
import { Shirt, Coffee, Smartphone, Package, ShoppingBag, ChevronDown, ChevronRight, Settings } from 'lucide-react';
import { cn } from '@/lib/cn';
import PrintableAreaEditor from './PrintableAreaEditor';
import type { ProductRectData } from './PrintableAreaEditor';
import type { ProductTemplate, PrintableArea } from '@/types/product';

const productIcons: Record<string, typeof Shirt> = {
  tshirt: Shirt,
  mug: Coffee,
  phonecase: Smartphone,
};

function getTemplateIcon(template: ProductTemplate): typeof Shirt {
  const source = template.metadata?.source;
  if (source === 'shopify') return ShoppingBag;
  if (source === 'erp') return Package;
  return productIcons[template.type] ?? Package;
}

interface TemplateGroupProps {
  title: string;
  templates: ProductTemplate[];
  selectedTemplate: ProductTemplate | null;
  onSelect: (id: string) => void;
  onEdit?: (template: ProductTemplate) => void;
  defaultExpanded?: boolean;
}

function TemplateGroup({ title, templates, selectedTemplate, onSelect, onEdit, defaultExpanded = true }: TemplateGroupProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (templates.length === 0) return null;

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:bg-gray-50 transition-colors"
      >
        <span>{title}</span>
        {expanded ? (
          <ChevronDown className="w-3 h-3" />
        ) : (
          <ChevronRight className="w-3 h-3" />
        )}
      </button>
      {expanded && (
        <div className="px-2 pb-2 space-y-1">
          {templates.map((template) => {
            const Icon = getTemplateIcon(template);
            const isSelected = selectedTemplate?.id === template.id;
            const isExternal = !!template.metadata?.source;
            const thumbnailUrl = isExternal ? template.views[0]?.mockupImageUrl : null;

            return (
              <div key={template.id} className="flex items-center gap-1">
                <button
                  onClick={() => onSelect(template.id)}
                  className={cn(
                    'flex-1 flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors min-w-0',
                    isSelected
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  )}
                >
                  {thumbnailUrl ? (
                    <img
                      src={thumbnailUrl}
                      alt=""
                      className="w-6 h-6 object-contain rounded flex-shrink-0"
                    />
                  ) : (
                    <Icon className="w-4 h-4 flex-shrink-0" />
                  )}
                  <span className="truncate">{template.name}</span>
                </button>
                {isExternal && onEdit && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(template);
                    }}
                    className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                    title="Edit printable area"
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ProductSelector() {
  const { templates, selectedTemplate, selectTemplate, activeViewId, setActiveView, updateTemplateView } =
    useProductStore();
  const design = useDesignStore((s) => s.design);
  const [editingTemplate, setEditingTemplate] = useState<ProductTemplate | null>(null);

  const demoTemplates = templates.filter((t) => !t.metadata?.source);
  const shopifyTemplates = templates.filter((t) => t.metadata?.source === 'shopify');
  const erpTemplates = templates.filter((t) => t.metadata?.source === 'erp');

  const updateTemplateMetadata = useProductStore((s) => s.updateTemplateMetadata);

  const handleSavePrintableArea = (
    templateId: string,
    viewId: string,
    printableArea: PrintableArea,
    productRectData: ProductRectData,
  ) => {
    // Save printable area to the view
    updateTemplateView(templateId, viewId, { printableArea });

    // Save product rect data to template metadata for persistence
    const template = templates.find((t) => t.id === templateId);
    const existingRects = (template?.metadata?.productRects as Record<string, ProductRectData>) ?? {};
    updateTemplateMetadata(templateId, {
      productRects: { ...existingRects, [viewId]: productRectData },
    });

    setEditingTemplate(null);
  };

  return (
    <div className="flex flex-col">
      <div className="p-3 border-b border-gray-200">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</h3>
      </div>

      <TemplateGroup
        title="Demo"
        templates={demoTemplates}
        selectedTemplate={selectedTemplate}
        onSelect={selectTemplate}
      />

      <TemplateGroup
        title="Shopify"
        templates={shopifyTemplates}
        selectedTemplate={selectedTemplate}
        onSelect={selectTemplate}
        onEdit={setEditingTemplate}
      />

      <TemplateGroup
        title="ERP"
        templates={erpTemplates}
        selectedTemplate={selectedTemplate}
        onSelect={selectTemplate}
        onEdit={setEditingTemplate}
      />

      {selectedTemplate && selectedTemplate.views.length > 1 && (
        <>
          <div className="p-3 border-t border-gray-200">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">View</h3>
          </div>
          <div className="p-2 space-y-1">
            {selectedTemplate.views.map((view) => {
              const viewLayers = design.views[view.id]?.layers ?? [];
              const layerCount = viewLayers.length;
              return (
                <button
                  key={view.id}
                  onClick={() => setActiveView(view.id)}
                  className={cn(
                    'w-full px-3 py-1.5 rounded-md text-sm transition-colors text-left flex items-center justify-between',
                    activeViewId === view.id
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  )}
                >
                  <span>{view.label}</span>
                  {layerCount > 0 && (
                    <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">
                      {layerCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Printable area editor modal */}
      {editingTemplate && (
        <PrintableAreaEditor
          template={editingTemplate}
          onSave={handleSavePrintableArea}
          onClose={() => setEditingTemplate(null)}
        />
      )}
    </div>
  );
}
