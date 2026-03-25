import type { PrintableArea } from '@/types/product';
import type { LayerTransform } from '@/types/design';

export type AlignAction =
  | 'left'
  | 'center-h'
  | 'right'
  | 'top'
  | 'center-v'
  | 'bottom';

/**
 * Calculate new position for a layer transform based on alignment
 * relative to the printable area.
 */
export function calculateAlignment(
  action: AlignAction,
  transform: LayerTransform,
  printableArea: PrintableArea
): { x: number; y: number } {
  const objW = transform.width * transform.scaleX;
  const objH = transform.height * transform.scaleY;
  const pa = printableArea;

  let { x, y } = transform;

  switch (action) {
    case 'left':
      x = pa.x;
      break;
    case 'center-h':
      x = pa.x + (pa.width - objW) / 2;
      break;
    case 'right':
      x = pa.x + pa.width - objW;
      break;
    case 'top':
      y = pa.y;
      break;
    case 'center-v':
      y = pa.y + (pa.height - objH) / 2;
      break;
    case 'bottom':
      y = pa.y + pa.height - objH;
      break;
  }

  return { x, y };
}
