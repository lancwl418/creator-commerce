'use client';

import { useState } from 'react';
import { useOrderFulfillment } from '@/hooks/orders/useOrderFulfillment';
import type { FulfillmentItem } from '@/lib/types/order';

interface FulfillSectionProps { orderId: string; items: FulfillmentItem[]; fulfillmentStatus: string | null; }

export function FulfillSection({ orderId, items, fulfillmentStatus }: FulfillSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const { fulfilling, error, setError, trackingNumber, setTrackingNumber, carrier, setCarrier, trackingUrl, setTrackingUrl,
    note, setNote, selectedItems, toggleItem, handleFulfill } = useOrderFulfillment(orderId, items);
  if (fulfillmentStatus === 'fulfilled') return null;

  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Fulfill Order</h3>
        {!showForm && (
          <button onClick={() => setShowForm(true)}
            className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-500 transition-all">
            Add Fulfillment
          </button>
        )}
      </div>

      {showForm && (
        <div className="space-y-3">
          {/* Select items */}
          <div>
            <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1.5">Items to Fulfill</label>
            <div className="space-y-1.5">
              {items.map(item => {
                const checked = selectedItems.has(item.shopify_line_item_id);
                return (
                  <button key={item.shopify_line_item_id} type="button"
                    onClick={() => toggleItem(item.shopify_line_item_id)}
                    className="flex items-center gap-2 w-full text-left">
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${checked ? 'bg-primary-600 border-primary-600' : 'border-gray-300'
                      }`}>
                      {checked && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                      )}
                    </div>
                    <span className="text-xs text-gray-700">
                      {item.title}{item.variant_title ? ` — ${item.variant_title}` : ''}
                      {item.sku ? <span className="text-gray-400 ml-1">({item.sku})</span> : ''}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tracking info */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-0.5">Tracking Number *</label>
              <input value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)}
                className="w-full rounded-md border border-border px-2 py-1.5 text-xs" placeholder="1Z999AA10..." />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-0.5">Carrier *</label>
              <select value={carrier} onChange={e => setCarrier(e.target.value)}
                className="w-full rounded-md border border-border px-2 py-1.5 text-xs">
                <option value="">Select...</option>
                <option value="UPS">UPS</option>
                <option value="FedEx">FedEx</option>
                <option value="USPS">USPS</option>
                <option value="DHL">DHL</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-0.5">Tracking URL</label>
            <input value={trackingUrl} onChange={e => setTrackingUrl(e.target.value)}
              className="w-full rounded-md border border-border px-2 py-1.5 text-xs" placeholder="https://..." />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-0.5">Note</label>
            <input value={note} onChange={e => setNote(e.target.value)}
              className="w-full rounded-md border border-border px-2 py-1.5 text-xs" placeholder="Optional note..." />
          </div>

          {error && <p className="text-[10px] text-red-500">{error}</p>}

          <div className="flex gap-2">
            <button onClick={handleFulfill} disabled={fulfilling}
              className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition-all">
              {fulfilling ? 'Fulfilling...' : `Fulfill ${selectedItems.size} Item${selectedItems.size !== 1 ? 's' : ''}`}
            </button>
            <button onClick={() => { setShowForm(false); setError(''); }}
              className="rounded-lg border border-border px-3 py-2 text-xs text-gray-500 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
