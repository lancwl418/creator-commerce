'use client';

import { useState } from 'react';

interface OrderActionsProps {
  orderId: string;
  shopifyOrderId: string;
  storeConnectionId: string;
  currentData: {
    customer_name: string | null;
    customer_email: string | null;
    shipping_address: Record<string, string> | null;
    financial_status: string | null;
    fulfillment_status: string | null;
    notes: string | null;
  };
}

export default function OrderActions({ orderId, shopifyOrderId, storeConnectionId, currentData }: OrderActionsProps) {
  const [showEdit, setShowEdit] = useState(false);
  const [resyncing, setResyncing] = useState(false);
  const [resyncResult, setResyncResult] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState(false);

  // Edit form state
  const [note, setNote] = useState('');
  const [customerName, setCustomerName] = useState(currentData.customer_name || '');
  const [customerEmail, setCustomerEmail] = useState(currentData.customer_email || '');
  const [financialStatus, setFinancialStatus] = useState(currentData.financial_status || '');
  const [fulfillmentStatus, setFulfillmentStatus] = useState(currentData.fulfillment_status || '');
  const [orderNotes, setOrderNotes] = useState(currentData.notes || '');

  // Shipping address fields
  const shipping = currentData.shipping_address || {};
  const [shipName, setShipName] = useState(shipping.name || '');
  const [shipAddress1, setShipAddress1] = useState(shipping.address1 || '');
  const [shipAddress2, setShipAddress2] = useState(shipping.address2 || '');
  const [shipCity, setShipCity] = useState(shipping.city || '');
  const [shipProvince, setShipProvince] = useState(shipping.province || '');
  const [shipZip, setShipZip] = useState(shipping.zip || '');
  const [shipCountry, setShipCountry] = useState(shipping.country || '');
  const [shipPhone, setShipPhone] = useState(shipping.phone || '');

  async function handleResync() {
    setResyncing(true);
    setResyncResult(null);
    try {
      const res = await fetch('/api/shopify/fetch-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_connection_id: storeConnectionId, single_order_id: shopifyOrderId }),
      });
      if (res.ok) {
        const data = await res.json();
        setResyncResult(`Resynced: ${data.line_items_matched || 0} items matched`);
        setTimeout(() => window.location.reload(), 1500);
      } else {
        const err = await res.json().catch(() => ({}));
        setResyncResult(`Error: ${err.error || 'Failed to resync'}`);
      }
    } catch (err) {
      setResyncResult(`Error: ${err instanceof Error ? err.message : 'Failed'}`);
    } finally {
      setResyncing(false);
    }
  }

  async function handleSaveEdit() {
    if (!note.trim()) {
      setEditError('Note is required for manual edits');
      return;
    }
    setSaving(true);
    setEditError('');
    setEditSuccess(false);

    try {
      const updates: Record<string, unknown> = { note: note.trim() };

      if (customerName !== (currentData.customer_name || '')) updates.customer_name = customerName;
      if (customerEmail !== (currentData.customer_email || '')) updates.customer_email = customerEmail;
      if (financialStatus !== (currentData.financial_status || '')) updates.financial_status = financialStatus;
      if (fulfillmentStatus !== (currentData.fulfillment_status || '')) updates.fulfillment_status = fulfillmentStatus || null;
      if (orderNotes !== (currentData.notes || '')) updates.notes = orderNotes;

      // Check if shipping changed
      const newShipping = { name: shipName, address1: shipAddress1, address2: shipAddress2, city: shipCity, province: shipProvince, zip: shipZip, country: shipCountry, phone: shipPhone };
      const oldShipping = currentData.shipping_address || {};
      if (JSON.stringify(newShipping) !== JSON.stringify({
        name: oldShipping.name || '', address1: oldShipping.address1 || '', address2: oldShipping.address2 || '',
        city: oldShipping.city || '', province: oldShipping.province || '', zip: oldShipping.zip || '',
        country: oldShipping.country || '', phone: oldShipping.phone || '',
      })) {
        updates.shipping_address = newShipping;
      }

      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        setEditSuccess(true);
        setTimeout(() => window.location.reload(), 1500);
      } else {
        const err = await res.json().catch(() => ({}));
        setEditError(err.error || 'Failed to save');
      }
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowEdit(!showEdit)}
          className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
          </svg>
          {showEdit ? 'Cancel Edit' : 'Edit Order'}
        </button>
        <button
          onClick={handleResync}
          disabled={resyncing}
          className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
        >
          {resyncing ? (
            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
            </svg>
          )}
          Resync
        </button>
      </div>
      {resyncResult && (
        <p className="text-xs text-gray-500 text-center">{resyncResult}</p>
      )}

      {/* Edit form */}
      {showEdit && (
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Edit Order</h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Customer Name</label>
              <input value={customerName} onChange={e => setCustomerName(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Email</label>
              <input value={customerEmail} onChange={e => setCustomerEmail(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-1.5 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Financial Status</label>
              <select value={financialStatus} onChange={e => setFinancialStatus(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-1.5 text-sm">
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="partially_paid">Partially Paid</option>
                <option value="refunded">Refunded</option>
                <option value="voided">Voided</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Fulfillment Status</label>
              <select value={fulfillmentStatus || ''} onChange={e => setFulfillmentStatus(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-1.5 text-sm">
                <option value="">Unfulfilled</option>
                <option value="partial">Partial</option>
                <option value="fulfilled">Fulfilled</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Shipping Address</label>
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="Name" value={shipName} onChange={e => setShipName(e.target.value)}
                className="rounded-lg border border-border px-3 py-1.5 text-sm" />
              <input placeholder="Phone" value={shipPhone} onChange={e => setShipPhone(e.target.value)}
                className="rounded-lg border border-border px-3 py-1.5 text-sm" />
              <input placeholder="Address 1" value={shipAddress1} onChange={e => setShipAddress1(e.target.value)}
                className="col-span-2 rounded-lg border border-border px-3 py-1.5 text-sm" />
              <input placeholder="Address 2" value={shipAddress2} onChange={e => setShipAddress2(e.target.value)}
                className="col-span-2 rounded-lg border border-border px-3 py-1.5 text-sm" />
              <input placeholder="City" value={shipCity} onChange={e => setShipCity(e.target.value)}
                className="rounded-lg border border-border px-3 py-1.5 text-sm" />
              <input placeholder="Province/State" value={shipProvince} onChange={e => setShipProvince(e.target.value)}
                className="rounded-lg border border-border px-3 py-1.5 text-sm" />
              <input placeholder="ZIP" value={shipZip} onChange={e => setShipZip(e.target.value)}
                className="rounded-lg border border-border px-3 py-1.5 text-sm" />
              <input placeholder="Country" value={shipCountry} onChange={e => setShipCountry(e.target.value)}
                className="rounded-lg border border-border px-3 py-1.5 text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Internal Notes</label>
            <textarea value={orderNotes} onChange={e => setOrderNotes(e.target.value)} rows={2}
              className="w-full rounded-lg border border-border px-3 py-1.5 text-sm resize-none"
              placeholder="Internal notes..." />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">
              Edit Note <span className="text-red-500">*</span>
            </label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
              className="w-full rounded-lg border border-border px-3 py-1.5 text-sm resize-none"
              placeholder="Reason for this change (required)..." />
          </div>

          {editError && <p className="text-sm text-red-600">{editError}</p>}
          {editSuccess && <p className="text-sm text-emerald-600">Saved! Refreshing...</p>}

          <button
            onClick={handleSaveEdit}
            disabled={saving}
            className="w-full rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50 transition-all"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}
    </div>
  );
}
