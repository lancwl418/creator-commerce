import { describe, expect, it } from 'vitest';
import { buildOrderUpdate } from './orderEdits';

describe('order edit payloads', () => {
  it('requires an audit note before accepting updates', () => {
    expect(() => buildOrderUpdate('customer', [], {}, ' ')).toThrow('Note is required');
  });
  it('sends only changed customer fields and preserves clearing a field', () => {
    const fields = [{ key: 'customer_name', label: 'Name', value: 'Alice' }, { key: 'customer_email', label: 'Email', value: 'a@example.com' }];
    expect(buildOrderUpdate('customer', fields, { customer_name: 'Alice', customer_email: '' }, ' remove email ')).toEqual({ note: 'remove email', customer_email: null });
  });
  it('sends the complete shipping address so unchanged fields are not lost', () => {
    const fields = [{ key: 'city', label: 'City', value: 'LA' }, { key: 'address1', label: 'Address', value: 'Road' }];
    expect(buildOrderUpdate('shipping', fields, { city: 'NY', address1: 'Road' }, 'update')).toEqual({ note: 'update', shipping_address: { city: 'NY', address1: 'Road' } });
  });
});
