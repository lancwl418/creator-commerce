import { describe, expect, it } from 'vitest';
import { buildImportedProductUpdate, parseDesignPayload } from './importPayload';

describe('design import contract', () => {
  it.each([null, {}, { products: [] }, { products: [{}] }, { products: [null] }])('rejects invalid import payloads', value => {
    expect(() => parseDesignPayload(value)).toThrow('valid products');
  });
  it('retains editor metadata when parsing a serialized payload', () => {
    const payload = { design_id: 'd1', products: [{ template_id: 'erp-1', variant_previews: { White: 'preview.png' } }] };
    expect(parseDesignPayload(JSON.stringify(payload))).toEqual(payload);
  });
  it('preserves zero and leaves an empty price unset', () => {
    expect(buildImportedProductUpdate({ title: ' Shirt ', description: ' desc ', price: '0' })).toEqual({ title: 'Shirt', description: 'desc', base_price_suggestion: 0 });
    expect(buildImportedProductUpdate({ title: '', description: '', price: '' }).base_price_suggestion).toBeNull();
  });
  it.each(['bad', '-1', 'Infinity', '12oops'])('rejects invalid quick-edit prices: %s', price => {
    expect(() => buildImportedProductUpdate({ title: '', description: '', price })).toThrow('valid price');
  });
});
