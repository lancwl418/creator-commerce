import { t, type MessageKey } from '../i18n';

const FACE_LABELS: Record<string, MessageKey> = {
  front: 'face.front', back: 'face.back', left: 'face.left', right: 'face.right', full: 'face.full',
};

/** 印刷面的显示名（服务端 / 客户端组件共用） */
export function faceLabel(face: string): string {
  return FACE_LABELS[face] ? t(FACE_LABELS[face]) : face;
}
