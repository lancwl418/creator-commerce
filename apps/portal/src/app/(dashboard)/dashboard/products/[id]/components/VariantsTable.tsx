'use client';

import type { ErpSku } from '@/lib/types';
import type { SkuGroup } from '@/lib/utils';
import { getSkuCost, calculateVariantProfit } from '@/lib/utils';

// ── Shared checkbox SVG ──

function CheckIcon({ size = 3 }: { size?: number }) {
  return (
    <svg className={`w-${size} h-${size} text-white`} fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}

function MinusIcon() {
  return (
    <svg className="w-3 h-3 text-primary-600" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
    </svg>
  );
}

// ── Props ──

interface VariantsTableProps {
  erpSkus: ErpSku[];
  enabledSkuIds: Set<string>;
  variantPrices: Record<string, string>;
  productPrice: number;
  optionNames: string[];
  option1Values: string[];
  option2Values: string[];
  option3Values: string[];
  hasOptions: boolean;
  skusByColor: SkuGroup[] | null;
  loadingSkus: boolean;
  skuError: string;
  onToggleSku: (skuId: string) => void;
  onToggleColor: (color: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onSetVariantPrice: (skuId: string, value: string) => void;
  isColorFullyEnabled: (color: string) => boolean;
  isColorPartiallyEnabled: (color: string) => boolean;
}

export default function VariantsTable({
  erpSkus, enabledSkuIds, variantPrices, productPrice,
  optionNames, option1Values, option2Values, option3Values, hasOptions,
  skusByColor, loadingSkus, skuError,
  onToggleSku, onToggleColor, onSelectAll, onClearAll, onSetVariantPrice,
  isColorFullyEnabled, isColorPartiallyEnabled,
}: VariantsTableProps) {
  const hasCustomPrices = Object.keys(variantPrices).some(k => variantPrices[k] !== '');
  const optCols = (option1Values.length > 0 ? 1 : 0) + (option2Values.length > 0 ? 1 : 0) + (option3Values.length > 0 ? 1 : 0);
  const gridCols = `44px ${optCols > 0 ? `repeat(${optCols}, 1fr)` : '1fr'} 70px 90px 70px 60px`;

  return (
    <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Variants</h3>
        {erpSkus.length > 0 && (
          <div className="flex gap-2">
            <button onClick={onSelectAll} className="text-xs text-primary-600 hover:text-primary-700 font-medium">Select All</button>
            <span className="text-gray-300">|</span>
            <button onClick={onClearAll} className="text-xs text-gray-500 hover:text-gray-700 font-medium">Clear</button>
          </div>
        )}
      </div>

      {loadingSkus ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-500 ml-3">Loading variants...</span>
        </div>
      ) : skuError ? (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
          <p className="text-sm text-amber-700">{skuError}</p>
        </div>
      ) : erpSkus.length === 0 ? (
        <p className="text-sm text-gray-400 py-4">No variants found.</p>
      ) : (
        <>
          {/* Header */}
          <div className="grid gap-2 px-2 pb-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100"
            style={{ gridTemplateColumns: gridCols }}>
            <span></span>
            {option1Values.length > 0 && <span>{optionNames[0] || 'Color'}</span>}
            {option2Values.length > 0 && <span>{optionNames[1] || 'Size'}</span>}
            {option3Values.length > 0 && <span>{optionNames[2] || 'Option 3'}</span>}
            {!hasOptions && <span>SKU</span>}
            <span>Cost</span>
            <span>Price</span>
            <span>Profit</span>
            <span className="text-right">Stock</span>
          </div>

          {/* Rows */}
          <div className="max-h-[400px] overflow-y-auto">
            {skusByColor ? (
              skusByColor.map((group) => (
                <ColorGroup
                  key={group.color}
                  group={group}
                  enabledSkuIds={enabledSkuIds}
                  variantPrices={variantPrices}
                  productPrice={productPrice}
                  option2Values={option2Values}
                  option3Values={option3Values}
                  onToggleSku={onToggleSku}
                  onToggleColor={onToggleColor}
                  onSetVariantPrice={onSetVariantPrice}
                  isFullyEnabled={isColorFullyEnabled(group.color)}
                  isPartiallyEnabled={isColorPartiallyEnabled(group.color)}
                />
              ))
            ) : (
              <FlatList
                skus={erpSkus}
                enabledSkuIds={enabledSkuIds}
                variantPrices={variantPrices}
                productPrice={productPrice}
                gridCols={gridCols}
                option2Values={option2Values}
                option3Values={option3Values}
                hasOptions={hasOptions}
                onToggleSku={onToggleSku}
                onSetVariantPrice={onSetVariantPrice}
              />
            )}
          </div>

          <p className="text-xs text-gray-400 mt-3 pt-2 border-t border-gray-100">
            {enabledSkuIds.size} of {erpSkus.length} variants selected
            {hasCustomPrices && (
              <span className="ml-2 text-primary-500">
                · {Object.values(variantPrices).filter(v => v !== '').length} custom price{Object.values(variantPrices).filter(v => v !== '').length > 1 ? 's' : ''}
              </span>
            )}
          </p>
        </>
      )}
    </div>
  );
}

// ── Color Group ──

function ColorGroup({ group, enabledSkuIds, variantPrices, productPrice, option2Values, option3Values,
  onToggleSku, onToggleColor, onSetVariantPrice, isFullyEnabled, isPartiallyEnabled,
}: {
  group: SkuGroup; enabledSkuIds: Set<string>; variantPrices: Record<string, string>;
  productPrice: number; option2Values: string[]; option3Values: string[];
  onToggleSku: (id: string) => void; onToggleColor: (color: string) => void;
  onSetVariantPrice: (id: string, val: string) => void;
  isFullyEnabled: boolean; isPartiallyEnabled: boolean;
}) {
  const colorLabel = group.color || 'Other';
  const enabledCount = group.skus.filter(s => enabledSkuIds.has(s.id)).length;

  const innerGridCols = `44px ${
    (option2Values.length > 0 ? '1fr ' : '') + (option3Values.length > 0 ? '1fr ' : '')
  }70px 90px 70px 60px`.trim();

  return (
    <div className="mb-1">
      <button onClick={() => onToggleColor(group.color)}
        className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg transition-all hover:bg-gray-50 ${
          !isFullyEnabled && !isPartiallyEnabled ? 'opacity-60' : ''
        }`}>
        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0 ${
          isFullyEnabled ? 'bg-primary-600 border-primary-600' : isPartiallyEnabled ? 'border-primary-400 bg-primary-100' : 'border-gray-300'
        }`}>
          {isFullyEnabled && <CheckIcon />}
          {isPartiallyEnabled && <MinusIcon />}
        </div>
        <span className="text-sm font-semibold text-gray-900">{colorLabel}</span>
        <span className="text-[11px] text-gray-400 ml-auto">{enabledCount}/{group.skus.length}</span>
      </button>

      <div className="divide-y divide-gray-50 ml-4 border-l border-gray-100 pl-2">
        {group.skus.map((sku) => (
          <SkuRow key={sku.id} sku={sku} gridCols={innerGridCols} small
            enabled={enabledSkuIds.has(sku.id)} variantPrices={variantPrices}
            productPrice={productPrice} option2Values={option2Values} option3Values={option3Values}
            hasOptions={true} onToggle={onToggleSku} onSetPrice={onSetVariantPrice} />
        ))}
      </div>
    </div>
  );
}

// ── Flat List ──

function FlatList({ skus, enabledSkuIds, variantPrices, productPrice, gridCols, option2Values, option3Values, hasOptions, onToggleSku, onSetVariantPrice }: {
  skus: ErpSku[]; enabledSkuIds: Set<string>; variantPrices: Record<string, string>;
  productPrice: number; gridCols: string; option2Values: string[]; option3Values: string[];
  hasOptions: boolean; onToggleSku: (id: string) => void; onSetVariantPrice: (id: string, val: string) => void;
}) {
  return (
    <div className="divide-y divide-gray-50">
      {skus.map((sku) => (
        <SkuRow key={sku.id} sku={sku} gridCols={gridCols}
          enabled={enabledSkuIds.has(sku.id)} variantPrices={variantPrices}
          productPrice={productPrice} option2Values={option2Values} option3Values={option3Values}
          hasOptions={hasOptions} onToggle={onToggleSku} onSetPrice={onSetVariantPrice} />
      ))}
    </div>
  );
}

// ── Single SKU Row ──

function SkuRow({ sku, gridCols, enabled, variantPrices, productPrice, option2Values, option3Values, hasOptions, small, onToggle, onSetPrice }: {
  sku: ErpSku; gridCols: string; enabled: boolean; variantPrices: Record<string, string>;
  productPrice: number; option2Values: string[]; option3Values: string[];
  hasOptions: boolean; small?: boolean;
  onToggle: (id: string) => void; onSetPrice: (id: string, val: string) => void;
}) {
  const varPrice = variantPrices[sku.id];
  const isCustom = varPrice !== undefined && varPrice !== '';
  const cost = getSkuCost(sku);
  const salePrice = isCustom ? (parseFloat(varPrice) || 0) : productPrice;
  const profit = calculateVariantProfit(salePrice, cost);
  const checkSize = small ? 4 : 5;

  return (
    <div className={`grid gap-2 items-center px-2 ${small ? 'py-2' : 'py-2.5'} transition-all rounded-lg ${
      enabled ? 'bg-white' : 'bg-gray-50 opacity-50'
    }`} style={{ gridTemplateColumns: gridCols }}>
      <button onClick={() => onToggle(sku.id)} className="flex justify-center">
        <div className={`w-${checkSize} h-${checkSize} rounded${small ? '' : '-md'} border-2 flex items-center justify-center transition-all ${
          enabled ? 'bg-primary-600 border-primary-600' : 'border-gray-300'
        }`}>
          {enabled && <CheckIcon size={small ? 2.5 : 3} />}
        </div>
      </button>
      {option2Values.length > 0 && <span className="text-sm text-gray-700 truncate">{sku.option2 || '—'}</span>}
      {option3Values.length > 0 && <span className="text-sm text-gray-700 truncate">{sku.option3 || '—'}</span>}
      {!hasOptions && <span className="text-sm font-mono text-gray-600 truncate">{sku.sku}</span>}
      <span className="text-xs text-gray-500">${cost.toFixed(2)}</span>
      <div className="relative">
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
        <input type="number" step="0.01" min="0"
          value={isCustom ? varPrice : ''} placeholder={productPrice.toFixed(2)}
          onChange={(e) => onSetPrice(sku.id, e.target.value)}
          className={`w-full rounded-md border pl-5 pr-1 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500/30 focus:border-primary-500 transition-all ${
            isCustom ? 'border-primary-300 bg-primary-50/50' : 'border-border bg-white'
          }`} />
      </div>
      <span className={`text-xs font-medium ${profit > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
        ${profit.toFixed(2)}
      </span>
      <span className={`text-xs text-right font-medium ${sku.inQty > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
        {sku.inQty > 0 ? sku.inQty : 'Out'}
      </span>
    </div>
  );
}
