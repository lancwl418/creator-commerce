'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function PromoteButton({
  designId,
  designStatus,
}: {
  designId: string;
  designStatus: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'closed' | 'form' | 'agreement'>('closed');
  const [pricingMode, setPricingMode] = useState<'custom' | 'ideamax'>('ideamax');
  const [expectedProfit, setExpectedProfit] = useState('');
  const [agreed, setAgreed] = useState(false);

  if (designStatus !== 'draft') {
    if (designStatus === 'pending_review') {
      return (
        <span className="mt-3 block w-full rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs font-semibold text-amber-700 text-center">
          Under Review
        </span>
      );
    }
    if (designStatus === 'approved' || designStatus === 'published') {
      return (
        <span className="mt-3 block w-full rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 text-center">
          Promoted
        </span>
      );
    }
    if (designStatus === 'rejected') {
      return (
        <span className="mt-3 block w-full rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 text-center">
          Rejected
        </span>
      );
    }
    return null;
  }

  async function handleSubmit() {
    if (!agreed) return;
    setLoading(true);
    const supabase = createClient();

    const updateData: Record<string, unknown> = {
      status: 'pending_review',
      updated_at: new Date().toISOString(),
    };
    if (pricingMode === 'custom' && expectedProfit) {
      updateData.creator_expected_price = parseFloat(expectedProfit);
    }

    const { error } = await supabase
      .from('designs')
      .update(updateData)
      .eq('id', designId);

    if (error) {
      alert('Failed to submit: ' + error.message);
      setLoading(false);
      return;
    }

    setStep('closed');
    router.refresh();
  }

  const profitNum = parseFloat(expectedProfit) || 0;

  return (
    <>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setStep('form');
        }}
        className="mt-3 block w-full rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-2 text-xs font-semibold text-white text-center cursor-pointer hover:from-amber-600 hover:to-orange-600 transition-all shadow-sm"
      >
        IdeaMax Promote
      </button>

      {step !== 'closed' && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
        >
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={(e) => { e.stopPropagation(); setStep('closed'); setAgreed(false); }}
          />
          <div
            className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 my-4 max-h-[calc(100vh-2rem)] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Step 1: Pricing */}
            {step === 'form' && (
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
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        pricingMode === 'ideamax'
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
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        pricingMode === 'custom'
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
                    onClick={() => setStep('closed')}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setStep('agreement')}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold hover:from-amber-600 hover:to-orange-600 transition-all"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Legal Agreement */}
            {step === 'agreement' && (
              <div className="p-6">
                <h3 className="text-lg font-bold text-gray-900">Creator Agreement</h3>
                <p className="text-xs text-gray-400 mt-1 mb-4">Please review and accept before submitting</p>

                <div className="rounded-xl bg-surface-secondary border border-border-light p-4 text-xs text-gray-600 leading-relaxed space-y-3 max-h-[40vh] overflow-y-auto">
                  <p className="font-semibold text-gray-800">IdeaMax Marketplace Creator Agreement</p>

                  <p>By submitting your design to IdeaMax Marketplace, you acknowledge and agree to the following terms:</p>

                  <p className="font-semibold text-gray-700">1. License Grant</p>
                  <p>You grant IdeaMax a non-exclusive, worldwide license to reproduce, display, distribute, and sell products featuring your design on the IdeaMax Marketplace and affiliated channels. This license remains in effect while your design is listed on the platform.</p>

                  <p className="font-semibold text-gray-700">2. Revenue Split</p>
                  <p>Profit from each sale (selling price minus production cost) is split 70/30: you receive 70% and IdeaMax retains 30%. Payments are made according to the platform&apos;s settlement schedule.</p>

                  <p className="font-semibold text-gray-700">3. Pricing</p>
                  <p>IdeaMax reserves the right to set the final retail price. Your suggested profit will be considered but is not binding. Pricing may be adjusted to optimize sales performance.</p>

                  <p className="font-semibold text-gray-700">4. Originality & Copyright Warranty</p>
                  <p>You represent and warrant that:</p>
                  <ul className="list-disc ml-4 space-y-1">
                    <li>The submitted design is your original work or you hold all necessary rights and licenses to use it commercially.</li>
                    <li>The design does not infringe upon any third party&apos;s intellectual property rights, including but not limited to copyrights, trademarks, patents, or trade secrets.</li>
                    <li>The design does not contain any content that is defamatory, obscene, or otherwise unlawful.</li>
                  </ul>

                  <p className="font-semibold text-gray-700">5. Indemnification</p>
                  <p>You agree to indemnify, defend, and hold harmless IdeaMax, its affiliates, officers, directors, and employees from any claims, damages, losses, or expenses (including legal fees) arising from any breach of the warranties above. If any intellectual property dispute arises related to your design, you bear full responsibility and liability.</p>

                  <p className="font-semibold text-gray-700">6. Content Review</p>
                  <p>IdeaMax reserves the right to review, approve, reject, or remove any submitted design at its sole discretion. Submission does not guarantee listing on the marketplace.</p>

                  <p className="font-semibold text-gray-700">7. Removal Rights</p>
                  <p>You may request removal of your design from the marketplace at any time. IdeaMax will process removal requests within a reasonable timeframe. Existing orders placed before removal will still be fulfilled.</p>
                </div>

                <label className="flex items-start gap-3 mt-4 cursor-pointer select-none">
                  <div className="pt-0.5 shrink-0">
                    <div
                      onClick={() => setAgreed(!agreed)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-all ${
                        agreed
                          ? 'bg-amber-500 border-amber-500'
                          : 'border-gray-300 hover:border-amber-400'
                      }`}
                    >
                      {agreed && (
                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-gray-600 leading-relaxed">
                    I have read and agree to the <strong>IdeaMax Marketplace Creator Agreement</strong>. I confirm that this design is my original work and does not infringe upon any third party&apos;s intellectual property rights. I understand that any IP disputes are my sole responsibility.
                  </span>
                </label>

                <div className="flex gap-3 mt-5">
                  <button
                    onClick={() => setStep('form')}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={loading || !agreed}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Submitting...' : 'Submit for Review'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
