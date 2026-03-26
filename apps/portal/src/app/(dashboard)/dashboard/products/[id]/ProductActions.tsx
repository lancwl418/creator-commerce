'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface Listing {
  id: string;
  channel_type: string;
  price: number;
  currency: string;
  status: string;
}

interface ProductActionsProps {
  productId: string;
  designId: string;
  designVersionId: string;
  productTemplateId: string;
  currentStatus: string;
  hasConfiguration: boolean;
  listings: Listing[];
  baseCost: number | null;
}

const DESIGN_ENGINE_URL = process.env.NEXT_PUBLIC_DESIGN_ENGINE_URL || 'http://localhost:3001';

export function ProductActions({
  productId,
  designId,
  designVersionId,
  productTemplateId,
  currentStatus,
  listings,
  baseCost,
}: ProductActionsProps) {
  const router = useRouter();
  const supabase = createClient();

  const [showEditor, setShowEditor] = useState(false);
  const [showPublish, setShowPublish] = useState(false);
  const [price, setPrice] = useState(baseCost ? (baseCost).toFixed(2) : '20.00');
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');

  const hasMarketplaceListing = listings.some(l => l.channel_type === 'marketplace');
  const isListed = currentStatus === 'listed';

  const editorUrl = `${DESIGN_ENGINE_URL}/embed?template=${productTemplateId}&product_id=${productId}&design_id=${designId}`;

  async function handlePublishToMarketplace() {
    setPublishing(true);
    setError('');

    try {
      const priceNum = parseFloat(price);
      if (isNaN(priceNum) || priceNum <= 0) {
        throw new Error('Please enter a valid price');
      }

      if (hasMarketplaceListing) {
        const existing = listings.find(l => l.channel_type === 'marketplace')!;
        const { error: updateError } = await supabase
          .from('channel_listings')
          .update({ price: priceNum, status: 'pending' })
          .eq('id', existing.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('channel_listings')
          .insert({
            sellable_product_instance_id: productId,
            channel_type: 'marketplace',
            price: priceNum,
            currency: 'USD',
            status: 'pending',
          });
        if (insertError) throw insertError;
      }

      const { error: statusError } = await supabase
        .from('sellable_product_instances')
        .update({ status: 'listed' })
        .eq('id', productId);
      if (statusError) throw statusError;

      setShowPublish(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => setShowEditor(!showEditor)}
          className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          {showEditor ? 'Close Editor' : 'Open Editor'}
        </button>

        {!isListed && (
          <button
            onClick={() => setShowPublish(!showPublish)}
            className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-500 transition-colors shadow-md shadow-primary-600/25"
          >
            Publish to Marketplace
          </button>
        )}
      </div>

      {/* Editor iframe */}
      {showEditor && (
        <div className="rounded-2xl border border-border bg-white overflow-hidden shadow-sm">
          <div className="bg-surface-secondary px-5 py-3 border-b border-border-light flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">Design Editor</span>
            <button
              onClick={() => setShowEditor(false)}
              className="text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors"
            >
              Close
            </button>
          </div>
          <iframe
            src={editorUrl}
            className="w-full border-0"
            style={{ height: '600px' }}
            allow="clipboard-write"
          />
        </div>
      )}

      {/* Publish form */}
      {showPublish && (
        <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-5">Publish to Marketplace</h3>

          <div className="space-y-5">
            <div>
              <label htmlFor="price" className="block text-sm font-semibold text-gray-700 mb-1.5">
                Selling Price (USD)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-2.5 text-gray-400 font-medium">$</span>
                <input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full rounded-xl border border-border pl-8 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
                />
              </div>
            </div>

            {baseCost && (
              <div className="rounded-xl bg-surface-secondary p-4 space-y-1.5">
                <p className="text-sm text-gray-500">Base cost: <span className="font-medium text-gray-700">${Number(baseCost).toFixed(2)}</span></p>
                <p className="text-sm text-gray-500">
                  Est. royalty (15%): <span className="font-bold text-primary-700">
                    ${(parseFloat(price) * 0.15).toFixed(2)}
                  </span>
                </p>
              </div>
            )}

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowPublish(false)}
                className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePublishToMarketplace}
                disabled={publishing}
                className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50 transition-all shadow-md shadow-primary-600/25"
              >
                {publishing ? 'Publishing...' : 'Publish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
