interface PromotionAgreementProps {
  agreed: boolean;
  setAgreed: (value: boolean) => void;
  loading: boolean;
  handleSubmit: () => void;
  onBack: () => void;
}

export default function PromotionAgreement({ agreed, setAgreed, loading, handleSubmit, onBack }: PromotionAgreementProps) {
  return (
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
            className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-all ${agreed
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
          onClick={onBack}
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
  );
}
