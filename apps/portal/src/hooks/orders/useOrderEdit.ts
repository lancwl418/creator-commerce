'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { OrderEditField } from '@/lib/types/order';
import { updateOrder } from '@/lib/api/orders';
import { buildOrderUpdate } from '@/lib/orders/orderEdits';

export function useOrderEdit(orderId: string, section: string, fields: OrderEditField[]) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(fields.map(field => [field.key, field.value])));

  async function handleSave(): Promise<boolean> {
    if (saving) return false;
    setSaving(true); setError('');
    try { await updateOrder(orderId, buildOrderUpdate(section, fields, values, note)); router.refresh(); return true; }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to save'); return false; }
    finally { setSaving(false); }
  }

  return {
    saving, note, setNote, error, setError, values, handleSave,
    handleChange: (key: string, value: string) => setValues(previous => ({ ...previous, [key]: value }))
  };
}
