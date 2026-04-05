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
  const [expectedPrice, setExpectedPrice] = useState('');
  const [agreed, setAgreed] = useState(false);

  // Non-draft states
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
    if (expectedPrice) {
      updateData.creator_expected_price = parseFloat(expectedPrice);
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
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setStep('closed'); setAgreed(false); }} />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">

            {/* Step 1: Expected Price */}
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
                  Submit your design to the IdeaMax marketplace. Once approved, it will be listed and you&apos;ll earn royalties from every sale.
                </p>

                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Your expected selling price (USD)
                  </label>
                  <p className="text-xs text-gray-400 mb-2">
                    This is a suggestion for our team. The final price will be set during review to optimize sales.
                  </p>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={expectedPrice}
                      onChange={(e) => setExpectedPrice(e.target.value)}
                      placeholder="e.g. 29.99"
                      className="w-full rounded-xl border border-gray-200 bg-white pl-8 pr-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/40 transition-all"
                    />
                  </div>
                  {expectedPrice && parseFloat(expectedPrice) > 0 && (
                    <p className="text-xs text-gray-400 mt-2">
                      Estimated royalty per sale: <strong className="text-amber-600">${(parseFloat(expectedPrice) * 0.15).toFixed(2)}</strong> (15% standard rate)
                    </p>
                  )}
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => { setStep('closed'); }}
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

                  <p className="font-semibold text-gray-700">2. Royalty Compensation</p>
                  <p>You will receive royalty payments for each product sold featuring your design, calculated based on the applicable royalty rate (standard 15% or premium 20% of the selling price). Royalties are calculated after each sale and paid according to the platform&apos;s settlement schedule.</p>

                  <p className="font-semibold text-gray-700">3. Pricing</p>
                  <p>IdeaMax reserves the right to set the final retail price of products featuring your design. Your suggested price will be considered but is not binding. Pricing may be adjusted to optimize sales performance.</p>

                  <p className="font-semibold text-gray-700">4. Originality & Copyright Warranty</p>
                  <p>You represent and warrant that:</p>
                  <ul className="list-disc ml-4 space-y-1">
                    <li>The submitted design is your original work or you hold all necessary rights and licenses to use it commercially.</li>
                    <li>The design does not infringe upon any third party&apos;s intellectual property rights, including but not limited to copyrights, trademarks, patents, or trade secrets.</li>
                    <li>The design does not contain any content that is defamatory, obscene, or otherwise unlawful.</li>
                  </ul>

                  <p className="font-semibold text-gray-700">5. Indemnification</p>
                  <p>You agree to indemnify, defend, and hold harmless IdeaMax, its affiliates, officers, directors, and employees from any claims, damages, losses, or expenses (including legal fees) arising from any breach of the warranties above, including any intellectual property infringement claims related to your submitted design.</p>

                  <p className="font-semibold text-gray-700">6. Content Review</p>
                  <p>IdeaMax reserves the right to review, approve, reject, or remove any submitted design at its sole discretion. Submission does not guarantee listing on the marketplace.</p>

                  <p className="font-semibold text-gray-700">7. Removal Rights</p>
                  <p>You may request removal of your design from the marketplace at any time. IdeaMax will process removal requests within a reasonable timeframe. Existing orders placed before removal will still be fulfilled.</p>
                </div>

                <label className="flex items-start gap-3 mt-4 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-gray-300 text-amber-500 focus:ring-amber-500/20"
                  />
                  <span className="text-xs text-gray-600 leading-relaxed">
                    I have read and agree to the <strong>IdeaMax Marketplace Creator Agreement</strong>. I confirm that this design is my original work and does not infringe upon any third party&apos;s intellectual property rights.
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
                    className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
