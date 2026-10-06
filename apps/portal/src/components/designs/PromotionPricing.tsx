import type { PromotionPricingMode } from '@/lib/types/design';

interface PromotionPricingProps {
  pricingMode: PromotionPricingMode;
  setPricingMode: (mode: PromotionPricingMode) => void;
  expectedProfit: string;
  setExpectedProfit: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export default function PromotionPricing({ pricingMode, setPricingMode, expectedProfit, setExpectedProfit, onBack, onNext }: PromotionPricingProps) {
  const profitNum = Number(expectedProfit) || 0;
  return (
    <div className="p-6">
      <div className="flex justify-center mb-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
          </svg>
        </div>
      </div>
      <h3 className="text-lg font-bold text-gray-900 text-center">Promote on IdeaMax</h3>
      <p className="text-sm text-gray-500 mt-2 text-center">
        Submit your design to the IdeaMax marketplace. You&apos;ll earn <strong className="text-amber-600">70%</strong> of the profit from every sale.
      </p>

      {/* Revenue split info */}
      <div className="mt-5 rounded-xl bg-amber-50 border border-amber-200 p-4">
        <p className="text-xs font-semibold text-amber-700 mb-2">Revenue Split</p>
        <div className="flex gap-3">
          <div className="flex-1 text-center">
            <p className="text-2xl font-bold text-amber-700">70%</p>
            <p className="text-[11px] text-amber-600">You earn</p>
          </div>
          <div className="w-px bg-amber-200" />
          <div className="flex-1 text-center">
            <p className="text-2xl font-bold text-gray-400">30%</p>
            <p className="text-[11px] text-gray-500">IdeaMax</p>
          </div>
        </div>
        <p className="text-[10px] text-amber-600 mt-2 text-center">
          Profit = Selling Price - Production Cost
        </p>
      </div>

      {/* Pricing mode */}
      <div className="mt-5">
        <label className="block text-sm font-medium text-gray-700 mb-3">How would you like to set the price?</label>
        <div className="space-y-2">
          <label
            className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${pricingMode === 'ideamax'
              ? 'border-amber-400 bg-amber-50'
              : 'border-gray-200 hover:bg-gray-50'
              }`}
          >
            <input
              type="radio"
              name="pricing"
              checked={pricingMode === 'ideamax'}
              onChange={() => setPricingMode('ideamax')}
              className="w-4 h-4 text-amber-500 focus:ring-amber-500"
            />
            <div>
              <p className="text-sm font-medium text-gray-900">Let IdeaMax decide</p>
              <p className="text-xs text-gray-400">Our team will set the optimal price to maximize your earnings</p>
            </div>
          </label>

          <label
            className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${pricingMode === 'custom'
              ? 'border-amber-400 bg-amber-50'
              : 'border-gray-200 hover:bg-gray-50'
              }`}
          >
            <input
              type="radio"
              name="pricing"
              checked={pricingMode === 'custom'}
              onChange={() => setPricingMode('custom')}
              className="w-4 h-4 text-amber-500 focus:ring-amber-500"
            />
            <div>
              <p className="text-sm font-medium text-gray-900">I have an expected profit</p>
              <p className="text-xs text-gray-400">Tell us how much you&apos;d like to earn per sale</p>
            </div>
          </label>
        </div>
      </div>

      {/* Expected profit input */}
      {pricingMode === 'custom' && (
        <div className="mt-4">
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            Your expected profit per sale (USD)
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">$</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={expectedProfit}
              onChange={(e) => setExpectedProfit(e.target.value)}
              placeholder="e.g. 5.00"
              className="w-full rounded-xl border border-gray-200 bg-white pl-8 pr-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/40 transition-all"
            />
          </div>
          {profitNum > 0 && (
            <div className="mt-2 rounded-lg bg-gray-50 p-3 text-xs text-gray-500 space-y-1">
              <div className="flex justify-between">
                <span>Your profit (70%)</span>
                <span className="font-semibold text-amber-600">${profitNum.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>IdeaMax (30%)</span>
                <span className="text-gray-400">${(profitNum / 0.7 * 0.3).toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-1">
                <span>Total profit needed</span>
                <span className="font-medium text-gray-700">${(profitNum / 0.7).toFixed(2)}</span>
              </div>
              <p className="text-[10px] text-gray-400 pt-1">
                Final selling price = total profit + production cost
              </p>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3 mt-6">
        <button
          onClick={onBack}
          className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold hover:from-amber-600 hover:to-orange-600 transition-all"
        >
          Next
        </button>
      </div>
    </div>
  );
}
