'use client';

import type { ProfitRange } from '@/lib/utils';
import { formatPriceRange, formatPercentRange } from '@/lib/utils';

interface PricingPanelProps {
  retailPrice: string;
  onRetailPriceChange: (value: string) => void;
  profitRange: ProfitRange;
  hasCustomPrices: boolean;
  onResetPrices: () => void;
}

export default function PricingPanel({
  retailPrice, onRetailPriceChange, profitRange, hasCustomPrices, onResetPrices,
}: PricingPanelProps) {
  return (
    <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Pricing</h3>

      <div className="flex items-start gap-6">
        <div className="flex-1">
          <label htmlFor="retail-price" className="block text-xs font-medium text-gray-500 mb-1.5">
            Product Price (USD)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">$</span>
            <input
              id="retail-price"
              type="number"
              step="0.01"
              min="0.01"
              value={retailPrice}
              onChange={(e) => onRetailPriceChange(e.target.value)}
              className="w-full rounded-xl border border-border pl-8 pr-4 py-2.5 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
            />
          </div>
          <p className="text-[11px] text-gray-400 mt-1">Default price for all variants</p>
        </div>

        <div className={`rounded-xl px-4 py-3 text-sm ${profitRange.min > 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
          <div className="flex items-baseline gap-2">
            <span className="text-gray-500 text-xs">Profit</span>
            <span className={`text-lg font-bold ${profitRange.min > 0 ? 'text-emerald-700' : 'text-red-600'}`}>
              {formatPriceRange(profitRange.min, profitRange.max)}
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-gray-500 text-xs">Margin</span>
            <span className={`text-xs font-semibold ${profitRange.min > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {formatPercentRange(profitRange.minMargin, profitRange.maxMargin)}
            </span>
          </div>
          <p className="text-[10px] text-gray-400 mt-1">
            Cost: {formatPriceRange(profitRange.costMin, profitRange.costMax)}
          </p>
        </div>
      </div>

      {hasCustomPrices && (
        <button onClick={onResetPrices} className="mt-3 text-xs text-primary-600 hover:text-primary-700 font-medium">
          Reset all variants to product price
        </button>
      )}
    </div>
  );
}
