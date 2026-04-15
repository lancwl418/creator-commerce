'use client';

import { useState, useCallback } from 'react';
import { useProductStore } from '@/stores/productStore';
import { useDesignStore } from '@/stores/designStore';
import { useMultiProductStore } from '@/stores/multiProductStore';
import { Shirt, Coffee, Smartphone, Package, ShoppingBag, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { ProductTemplate } from '@/types/product';

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
  defaultExpanded?: boolean;
}

function TemplateGroup({ title, templates, selectedTemplate, onSelect, defaultExpanded = true }: TemplateGroupProps) {
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
              <button
                key={template.id}
                onClick={() => onSelect(template.id)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors min-w-0',
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
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ProductSelector() {
  const { templates, selectedTemplate, selectTemplate, activeViewId, setActiveView } =
    useProductStore();
  const design = useDesignStore((s) => s.design);

  const demoTemplates = templates.filter((t) => !t.metadata?.source);
  const shopifyTemplates = templates.filter((t) => t.metadata?.source === 'shopify');
  const erpTemplates = templates.filter((t) => t.metadata?.source === 'erp');

  const addProduct = useMultiProductStore((s) => s.addProduct);
  const multiProducts = useMultiProductStore((s) => s.products);
  const isMultiProduct = useMultiProductStore((s) => s.isMultiProduct);

  const handleAddToProducts = useCallback(
    (template: ProductTemplate) => {
      addProduct(template);
    },
    [addProduct]
  );

  const isInMultiProduct = useCallback(
    (templateId: string) => multiProducts.some((p) => p.template.id === templateId),
    [multiProducts]
  );

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
      />

      <TemplateGroup
        title="ERP"
        templates={erpTemplates}
        selectedTemplate={selectedTemplate}
        onSelect={selectTemplate}
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

      {/* Add to multi-product button */}
      {selectedTemplate && (
        <div className="p-2 border-t border-gray-200">
          <button
            onClick={() => handleAddToProducts(selectedTemplate)}
            disabled={isInMultiProduct(selectedTemplate.id)}
            className={cn(
              'w-full px-3 py-2 rounded-md text-sm font-medium transition-colors',
              isInMultiProduct(selectedTemplate.id)
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            )}
          >
            {isInMultiProduct(selectedTemplate.id) ? 'Added' : '+ Add to Products'}
          </button>
        </div>
      )}

    </div>
  );
}
