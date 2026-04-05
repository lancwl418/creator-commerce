'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface Product {
  id: string;
  title: string;
  status: string;
  retail_price: number | null;
  cost: number | null;
}

export function DesignReviewActions({
  designId,
  designStatus,
  creatorExpectedProfit,
  existingProducts,
}: {
  designId: string;
  designStatus: string;
  creatorExpectedProfit: number | null;
  existingProducts: Product[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const cost = existingProducts[0]?.cost ?? 10;

  // If creator expects $X profit, suggested price = cost + X / 0.7 (since creator gets 70% of profit)
  const suggestedPrice = creatorExpectedProfit
    ? cost + creatorExpectedProfit / 0.7
    : null;

  const [price, setPrice] = useState(
    existingProducts[0]?.retail_price?.toString() || suggestedPrice?.toFixed(2) || ''
  );
  const [rejectionReason, setRejectionReason] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [loading, setLoading] = useState(false);

  const priceNum = parseFloat(price) || 0;
  const profit = priceNum - cost;
  const creatorShare = profit * 0.7;
  const platformShare = profit * 0.3;

  async function handleApprove() {
    if (!price || priceNum <= 0) {
      alert('Please set a selling price before approving');
      return;
    }
    if (priceNum <= cost) {
      alert('Selling price must be higher than production cost');
      return;
    }
    setLoading(true);

    const { error: designError } = await supabase
      .from('designs')
      .update({ status: 'approved', updated_at: new Date().toISOString() })
      .eq('id', designId);

    if (designError) {
      alert('Failed: ' + designError.message);
      setLoading(false);
      return;
    }

    if (existingProducts.length > 0) {
      await supabase
        .from('sellable_product_instances')
        .update({ retail_price: priceNum })
        .eq('design_id', designId);
    }

    router.refresh();
    setLoading(false);
  }

  async function handleReject() {
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }
    setLoading(true);

    const { error } = await supabase
      .from('designs')
      .update({
        status: 'rejected',
        rejection_reason: rejectionReason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', designId);

    if (error) {
      alert('Failed: ' + error.message);
      setLoading(false);
      return;
    }

    router.refresh();
    setLoading(false);
  }

  async function handlePublish() {
    setLoading(true);
    await supabase
      .from('designs')
      .update({ status: 'published', updated_at: new Date().toISOString() })
      .eq('id', designId);
    router.refresh();
    setLoading(false);
  }

  const isPending = designStatus === 'pending_review';
  const isApproved = designStatus === 'approved';
  const isRejected = designStatus === 'rejected';
  const isPublished = designStatus === 'published';

  return (
    <div className="bg-white rounded-2xl border border-border-light shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border-light">
        <h3 className="text-sm font-semibold text-gray-900">Pricing & Revenue Split</h3>
        <p className="text-[11px] text-gray-400 mt-0.5">70% Creator / 30% IdeaMax</p>
      </div>

      <div className="p-5 space-y-4">
        {/* Creator's expected profit */}
        {creatorExpectedProfit ? (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
            <p className="text-[11px] font-medium text-amber-600 uppercase tracking-wider">Creator&apos;s Expected Profit</p>
            <p className="text-lg font-bold text-amber-800 mt-0.5">${creatorExpectedProfit.toFixed(2)} <span className="text-sm font-normal text-amber-600">per sale</span></p>
            {suggestedPrice && (
              <p className="text-[11px] text-amber-500 mt-1">
                Suggested selling price: ${suggestedPrice.toFixed(2)} (cost ${cost.toFixed(2)} + profit ${(creatorExpectedProfit / 0.7).toFixed(2)})
              </p>
            )}
          </div>
        ) : (
          <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3">
            <p className="text-[11px] font-medium text-blue-600">Creator chose &quot;Let IdeaMax decide&quot;</p>
          </div>
        )}

        {/* Price Input */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Selling Price (USD)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="29.99"
              disabled={isPublished}
              className="w-full rounded-xl border border-border bg-white pl-7 pr-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500/40 transition-all disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>
        </div>

        {/* Breakdown */}
        {priceNum > 0 && (
          <div className="rounded-xl bg-surface-secondary p-4 space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Per Sale Breakdown</p>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Selling Price</span>
              <span className="font-medium text-gray-900">${priceNum.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Production Cost</span>
              <span className="text-gray-400">-${cost.toFixed(2)}</span>
            </div>
            <div className="border-t border-border-light pt-2 mt-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Profit</span>
                <span className={`font-medium ${profit >= 0 ? 'text-gray-900' : 'text-danger-600'}`}>${profit.toFixed(2)}</span>
              </div>
            </div>
            {profit > 0 && (
              <>
                <div className="flex justify-between text-sm pl-3">
                  <span className="text-gray-400">Creator (70%)</span>
                  <span className="text-violet-600 font-medium">${creatorShare.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm pl-3">
                  <span className="text-gray-400">IdeaMax (30%)</span>
                  <span className="text-amber-600 font-medium">${platformShare.toFixed(2)}</span>
                </div>
                {creatorExpectedProfit && (
                  <div className="border-t border-border-light pt-2 mt-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Creator expected</span>
                      <span className={creatorShare >= creatorExpectedProfit ? 'text-success-600' : 'text-danger-500'}>
                        ${creatorExpectedProfit.toFixed(2)}
                        {creatorShare >= creatorExpectedProfit ? ' (met)' : ' (not met)'}
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 space-y-2">
          {isPending && !showReject && (
            <>
              <button
                onClick={handleApprove}
                disabled={loading}
                className="w-full px-4 py-2.5 rounded-xl bg-success-500 text-white text-sm font-semibold hover:bg-success-600 transition-colors disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Approve Design'}
              </button>
              <button
                onClick={() => setShowReject(true)}
                className="w-full px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Reject
              </button>
            </>
          )}

          {isPending && showReject && (
            <>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Rejection reason (required)..."
                rows={3}
                className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-danger-500/20 focus:border-danger-500/40 transition-all resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowReject(false); setRejectionReason(''); }}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={loading || !rejectionReason.trim()}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-danger-500 text-white text-sm font-semibold hover:bg-danger-600 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Rejecting...' : 'Confirm Reject'}
                </button>
              </div>
            </>
          )}

          {isApproved && (
            <button
              onClick={handlePublish}
              disabled={loading}
              className="w-full px-4 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-500 transition-colors disabled:opacity-50"
            >
              {loading ? 'Publishing...' : 'Publish to Marketplace'}
            </button>
          )}

          {isRejected && (
            <div className="rounded-xl bg-danger-50 border border-red-200 p-3">
              <p className="text-xs font-medium text-danger-600">This design was rejected</p>
            </div>
          )}

          {isPublished && (
            <div className="rounded-xl bg-success-50 border border-green-200 p-3">
              <p className="text-xs font-medium text-success-600">This design is live on the marketplace</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
