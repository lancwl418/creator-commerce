import { describe, expect, it } from 'vitest';
import { getPrintPositions } from './print-faces';

describe('印刷面', () => {
  it('解析 ERP 的 printPositions，去重、小写；空或无法解析时只有正面', () => {
    expect(getPrintPositions({ printPositions: '["front", "Back", "front"]' })).toEqual(['front', 'back']);
    expect(getPrintPositions({ printPositions: ['left'] })).toEqual(['left']);
    expect(getPrintPositions({ printPositions: null })).toEqual(['front']);
    expect(getPrintPositions({ printPositions: '{bad' })).toEqual(['front']);
    expect(getPrintPositions({ printPositions: '[]' })).toEqual(['front']);
  });
});
