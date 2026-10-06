'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { FulfillmentItem } from '@/lib/types/order';
import { fulfillOrder } from '@/lib/api/orders';

export function useOrderFulfillment(orderId: string, items: FulfillmentItem[]) {
  const router = useRouter();
  const [fulfilling, setFulfilling] = useState(false);
  const [error, setError] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [note, setNote] = useState('');
  const [selectedItems, setSelectedItems] = useState(new Set(items.map(item => item.shopify_line_item_id)));

  async function handleFulfill() {
    if (fulfilling) return;
    if (!trackingNumber.trim() || !carrier.trim()) { setError('Tracking number and carrier are required'); return; }
    if (!selectedItems.size) { setError('Select at least one item'); return; }
    setFulfilling(true); setError('');
    try {
      await fulfillOrder(orderId, {
        tracking_number: trackingNumber.trim(), carrier: carrier.trim(),
        tracking_url: trackingUrl.trim() || undefined, line_item_ids: [...selectedItems], note: note.trim() || undefined
      });
      router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : 'Fulfillment failed'); }
    finally { setFulfilling(false); }
  }

  return {
    fulfilling, error, setError, trackingNumber, setTrackingNumber, carrier, setCarrier, trackingUrl, setTrackingUrl, note, setNote, selectedItems, handleFulfill,
    toggleItem: (id: string) => setSelectedItems(previous => { const next = new Set(previous); if (next.has(id)) next.delete(id); else next.add(id); return next; })
  };
}
