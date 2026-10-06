'use client';

import { useState } from 'react';
import { useOrderEdit } from '@/hooks/orders/useOrderEdit';
import type { OrderEditField } from '@/lib/types/order';

interface EditSectionProps { orderId: string; section: string; fields: OrderEditField[]; }

export function EditSection({ orderId, section, fields: initialFields }: EditSectionProps) {
  const [editing, setEditing] = useState(false);
  const { saving, note, setNote, error, setError, values, handleChange, handleSave } = useOrderEdit(orderId, section, initialFields);
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
        <button onClick={async () => { if (await handleSave()) setEditing(false); }} disabled={saving}
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

