import type { OrderEditField } from '@/lib/types/order';

export function buildOrderUpdate(section: string, fields: OrderEditField[], values: Record<string, string>, note: string) {
  if (!note.trim()) throw new Error('Note is required');
  const updates: Record<string, unknown> = { note: note.trim() };
  if (section === 'shipping') {
    updates.shipping_address = Object.fromEntries(fields.map(field => [field.key, values[field.key] || '']));
  } else {
    for (const field of fields) if (values[field.key] !== field.value) updates[field.key] = values[field.key] || null;
  }
  return updates;
}
