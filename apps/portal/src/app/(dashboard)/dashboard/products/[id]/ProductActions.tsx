'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

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

  // Build editor embed URL
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
        // Update existing listing
        const existing = listings.find(l => l.channel_type === 'marketplace')!;
        const { error: updateError } = await supabase
          .from('channel_listings')
          .update({ price: priceNum, status: 'pending' })
          .eq('id', existing.id);
        if (updateError) throw updateError;
      } else {
        // Create new listing
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

      // Update product status to listed
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
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {showEditor ? 'Close Editor' : 'Open Editor'}
        </button>

        {!isListed && (
          <button
            onClick={() => setShowPublish(!showPublish)}
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Publish to Marketplace
          </button>
        )}
      </div>

      {/* Editor iframe */}
      {showEditor && (
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Design Editor</span>
            <button
              onClick={() => setShowEditor(false)}
              className="text-sm text-gray-500 hover:text-gray-700"
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
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-medium text-gray-900 mb-4">Publish to Marketplace</h3>

          <div className="space-y-4">
            <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                Selling Price (USD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">$</span>
                <input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full rounded-md border border-gray-300 pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                />
              </div>
            </div>

            {baseCost && (
              <div className="text-sm text-gray-500 space-y-1">
                <p>Base cost: ${Number(baseCost).toFixed(2)}</p>
                <p>
                  Est. royalty (15%): <span className="font-medium text-gray-900">
                    ${(parseFloat(price) * 0.15).toFixed(2)}
                  </span>
                </p>
              </div>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => setShowPublish(false)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePublishToMarketplace}
                disabled={publishing}
                className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
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
