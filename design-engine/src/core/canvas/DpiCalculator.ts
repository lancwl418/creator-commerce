import type { DesignLayer, ImageLayerData } from '@/types/design';
import type { PrintableArea } from '@/types/product';

export type DpiStatus = 'good' | 'warning' | 'low';

export interface DpiInfo {
  horizontalDpi: number;
  verticalDpi: number;
  effectiveDpi: number;
  status: DpiStatus;
  minDpi: number;
}

export function calculateDpi(
  layer: DesignLayer,
  printableArea: PrintableArea
): DpiInfo | null {
  if (layer.data.type !== 'image') return null;

  const imageData = layer.data as ImageLayerData;
  const { originalWidth, originalHeight } = imageData;
  if (!originalWidth || !originalHeight) return null;

  const { width: canvasW, scaleX, height: canvasH, scaleY } = layer.transform;

  // Canvas pixels per physical inch
  const pxPerInchX = printableArea.width / printableArea.physicalWidthInches;
  const pxPerInchY = printableArea.height / printableArea.physicalHeightInches;

  // Physical size of image in inches
  const imagePhysicalW = (canvasW * scaleX) / pxPerInchX;
  const imagePhysicalH = (canvasH * scaleY) / pxPerInchY;

  if (imagePhysicalW <= 0 || imagePhysicalH <= 0) return null;

  const horizontalDpi = originalWidth / imagePhysicalW;
  const verticalDpi = originalHeight / imagePhysicalH;
  const effectiveDpi = Math.min(horizontalDpi, verticalDpi);

  const minDpi = printableArea.minDPI;
  let status: DpiStatus;
  if (effectiveDpi >= 300) {
    status = 'good';
  } else if (effectiveDpi >= minDpi) {
    status = 'warning';
  } else {
    status = 'low';
  }

  return {
    horizontalDpi: Math.round(horizontalDpi),
    verticalDpi: Math.round(verticalDpi),
    effectiveDpi: Math.round(effectiveDpi),
    status,
    minDpi,
  };
}
