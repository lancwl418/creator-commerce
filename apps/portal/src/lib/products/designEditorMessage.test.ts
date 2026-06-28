import { describe, expect, it } from 'vitest';

import {
  DESIGN_EDITOR_MESSAGE,
  isDesignEditorMessage,
} from '@creator-commerce/shared';

describe('isDesignEditorMessage', () => {
  it('accepts editor to host outbound messages', () => {
    expect(isDesignEditorMessage({
      type: DESIGN_EDITOR_MESSAGE.SAVED,
      payload: { products: [] },
    })).toBe(true);
    expect(isDesignEditorMessage({ type: DESIGN_EDITOR_MESSAGE.READY })).toBe(true);
    expect(isDesignEditorMessage({
      type: DESIGN_EDITOR_MESSAGE.ERROR,
      error: 'x',
    })).toBe(true);
  });

  it('rejects inbound and unknown message types', () => {
    expect(isDesignEditorMessage({ type: DESIGN_EDITOR_MESSAGE.LOAD_DESIGN })).toBe(false);
    expect(isDesignEditorMessage({ type: 'SOMETHING_ELSE' })).toBe(false);
  });

  it('rejects values without an outbound message type', () => {
    expect(isDesignEditorMessage({})).toBe(false);
    expect(isDesignEditorMessage(null)).toBe(false);
    expect(isDesignEditorMessage(undefined)).toBe(false);
    expect(isDesignEditorMessage('a string')).toBe(false);
    expect(isDesignEditorMessage(123)).toBe(false);
  });
});
