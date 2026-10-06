'use client';

import { useDesignPromotion } from '@/hooks/designs/useDesignPromotion';
import PromotionPreview from './PromotionPreview';
import PromotionPricing from './PromotionPricing';
import PromotionAgreement from './PromotionAgreement';

interface PromoteButtonProps { designId: string; designStatus: string; artworkUrl: string | null; }

export function PromoteButton({ designId, designStatus, artworkUrl }: PromoteButtonProps) {
  const { step, setStep, pricingMode, setPricingMode, expectedProfit, setExpectedProfit, agreed, setAgreed, loading, error, handleSubmit } = useDesignPromotion(designId);
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

  return (
    <>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setStep('preview');
        }}
        className="mt-3 block w-full rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-2 text-xs font-semibold text-white text-center cursor-pointer hover:from-amber-600 hover:to-orange-600 transition-all shadow-sm"
      >
        Request Promotion
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
            className={`relative bg-white rounded-2xl shadow-xl w-full mx-4 my-4 max-h-[calc(100vh-2rem)] overflow-y-auto ${step === 'preview' ? 'max-w-3xl' : 'max-w-md'
              }`}
            onClick={(e) => e.stopPropagation()}
          >
            {error && <p role="alert" className="px-6 pt-4 text-sm text-red-600">{error}</p>}
            {step === 'preview' && <PromotionPreview artworkUrl={artworkUrl} onClose={() => setStep('closed')} onContinue={() => setStep('form')} />}
            {step === 'form' && <PromotionPricing pricingMode={pricingMode} setPricingMode={setPricingMode} expectedProfit={expectedProfit} setExpectedProfit={setExpectedProfit} onBack={() => setStep('preview')} onNext={() => setStep('agreement')} />}
            {step === 'agreement' && <PromotionAgreement agreed={agreed} setAgreed={setAgreed} loading={loading} handleSubmit={handleSubmit} onBack={() => setStep('form')} />}

          </div>
        </div>
      )}
    </>
  );
}
