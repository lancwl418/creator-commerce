import { describe, expect, it } from 'vitest';
import { parseFaceUploads } from './design-upload';

const faces = [{ face: 'front' }, { face: 'back' }];
function file(name: string, type: string, size = 10): File {
  return new File([new Uint8Array(size)], name, { type });
}
function form(entries: Record<string, File>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

describe('上传设计下单的文件', () => {
  it('至少一面有设计图；预览图可选；按面收集', () => {
    const parsed = parseFaceUploads(form({ 'design:front': file('a.png', 'image/png'), 'preview:front': file('p.jpg', 'image/jpeg') }), faces);
    expect(parsed.ok && parsed.uploads.map((u) => [u.face, u.design.name, u.preview?.name])).toEqual([['front', 'a.png', 'p.jpg']]);
    expect(parseFaceUploads(form({}), faces)).toEqual({ ok: false, error: 'order.error.noDesign' });
  });

  it('只传预览不传设计、类型不对、超过大小都拒绝', () => {
    expect(parseFaceUploads(form({ 'preview:back': file('p.jpg', 'image/jpeg') }), faces)).toEqual({ ok: false, error: 'order.error.previewWithoutDesign' });
    expect(parseFaceUploads(form({ 'design:front': file('a.gif', 'image/gif') }), faces)).toEqual({ ok: false, error: 'order.error.designFile' });
    expect(parseFaceUploads(form({ 'design:front': file('a.png', 'image/png', 21 * 1024 * 1024) }), faces)).toEqual({ ok: false, error: 'order.error.designFile' });
  });
});
