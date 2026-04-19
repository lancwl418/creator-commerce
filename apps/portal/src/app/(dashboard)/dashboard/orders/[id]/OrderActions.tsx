'use client';

import { useState } from 'react';

// ── Resync Button (for order header) ──

export function ResyncButton({ orderId, shopifyOrderId, storeConnectionId }: {
  orderId: string; shopifyOrderId: string; storeConnectionId: string;
}) {
  const [resyncing, setResyncing] = useState(false);

  async function handleResync() {
    setResyncing(true);
    try {
      const res = await fetch('/api/shopify/fetch-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_connection_id: storeConnectionId, single_order_id: shopifyOrderId }),
      });
      if (res.ok) {
        window.location.reload();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Resync failed');
      }
    } catch { alert('Resync failed'); }
    finally { setResyncing(false); }
  }

  return (
    <button onClick={handleResync} disabled={resyncing}
      className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-all flex items-center gap-1.5">
      {resyncing ? (
        <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
      ) : (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
        </svg>
      )}
      Resync
    </button>
  );
}

// ── Inline Edit Section ──

interface EditSectionProps {
  orderId: string;
  section: string;
  fields: { key: string; label: string; value: string; type?: 'text' | 'select' | 'textarea'; options?: { value: string; label: string }[] }[];
}

export function EditSection({ orderId, section, fields: initialFields }: EditSectionProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [values, setValues] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const f of initialFields) m[f.key] = f.value;
    return m;
  });

  function handleChange(key: string, val: string) {
    setValues(prev => ({ ...prev, [key]: val }));
  }

  async function handleSave() {
    if (!note.trim()) { setError('Note is required'); return; }
    setSaving(true);
    setError('');

    const updates: Record<string, unknown> = { note: note.trim() };

    if (section === 'shipping') {
      const addr: Record<string, string> = {};
      for (const f of initialFields) {
        addr[f.key] = values[f.key] || '';
      }
      updates.shipping_address = addr;
    } else {
      for (const f of initialFields) {
        if (values[f.key] !== f.value) {
          updates[f.key] = values[f.key] || null;
        }
      }
    }

    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        setEditing(false);
        window.location.reload();
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.error || 'Failed to save');
      }
    } catch { setError('Failed to save'); }
    finally { setSaving(false); }
  }

  if (!editing) {
    return (
      <button onClick={() => setEditing(true)}
        className="text-[10px] text-primary-600 hover:text-primary-700 font-medium">
        Edit
      </button>
    );
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
      {initialFields.map(f => (
        <div key={f.key}>
          <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-0.5">{f.label}</label>
          {f.type === 'select' ? (
            <select value={values[f.key]} onChange={e => handleChange(f.key, e.target.value)}
              className="w-full rounded-md border border-border px-2 py-1 text-xs">
              {f.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ) : f.type === 'textarea' ? (
            <textarea value={values[f.key]} onChange={e => handleChange(f.key, e.target.value)} rows={2}
              className="w-full rounded-md border border-border px-2 py-1 text-xs resize-none" />
          ) : (
            <input value={values[f.key]} onChange={e => handleChange(f.key, e.target.value)}
              className="w-full rounded-md border border-border px-2 py-1 text-xs" />
          )}
        </div>
      ))}
      <div>
        <label className="block text-[10px] font-semibold text-red-400 uppercase mb-0.5">Note (required)</label>
        <input value={note} onChange={e => setNote(e.target.value)} placeholder="Reason for change..."
          className="w-full rounded-md border border-border px-2 py-1 text-xs" />
      </div>
      {error && <p className="text-[10px] text-red-500">{error}</p>}
      <div className="flex gap-2">
        <button onClick={handleSave} disabled={saving}
          className="flex-1 rounded-md bg-primary-600 px-2 py-1 text-[10px] font-semibold text-white hover:bg-primary-500 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button onClick={() => { setEditing(false); setError(''); }}
          className="rounded-md border border-border px-2 py-1 text-[10px] text-gray-500 hover:bg-gray-50">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Fulfill Section (per-line-item fulfillment) ──

interface FulfillSectionProps {
  orderId: string;
  items: { shopify_line_item_id: string; title: string; variant_title: string | null; sku: string | null }[];
  fulfillmentStatus: string | null;
}

export function FulfillSection({ orderId, items, fulfillmentStatus }: FulfillSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [fulfilling, setFulfilling] = useState(false);
  const [error, setError] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [note, setNote] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(() => new Set(items.map(i => i.shopify_line_item_id)));

  function toggleItem(id: string) {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleFulfill() {
    if (!trackingNumber.trim() || !carrier.trim()) {
      setError('Tracking number and carrier are required');
      return;
    }
    if (selectedItems.size === 0) {
      setError('Select at least one item');
      return;
    }

    setFulfilling(true);
    setError('');

    try {
      const res = await fetch(`/api/orders/${orderId}/fulfill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tracking_number: trackingNumber.trim(),
          carrier: carrier.trim(),
          tracking_url: trackingUrl.trim() || undefined,
          line_item_ids: Array.from(selectedItems),
          note: note.trim() || undefined,
        }),
      });

      if (res.ok) {
        window.location.reload();
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.error || 'Fulfillment failed');
      }
    } catch {
      setError('Fulfillment failed');
    } finally {
      setFulfilling(false);
    }
  }

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
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                      checked ? 'bg-primary-600 border-primary-600' : 'border-gray-300'
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
