import type { DesignDocument } from '@/types/design';
import type { ProductTemplate } from '@/types/product';
import { calculateDpi } from '@/core/canvas/DpiCalculator';

export type ValidationSeverity = 'error' | 'warning';

export interface ValidationIssue {
  severity: ValidationSeverity;
  message: string;
  layerId?: string;
  viewId?: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

export function validateDesign(
  design: DesignDocument,
  template: ProductTemplate
): ValidationResult {
  const issues: ValidationIssue[] = [];

  for (const view of template.views) {
    const designView = design.views[view.id];
    if (!designView) continue;

    // Check: at least one layer in the view
    if (designView.layers.length === 0) {
      issues.push({
        severity: 'warning',
        message: `${view.label} view has no layers.`,
        viewId: view.id,
      });
      continue;
    }

    for (const layer of designView.layers) {
      if (!layer.visible) continue;

      // DPI check for images
      if (layer.data.type === 'image') {
        const dpi = calculateDpi(layer, view.printableArea);
        if (dpi && dpi.status === 'low') {
          issues.push({
            severity: 'error',
            message: `"${layer.name}" is ${dpi.effectiveDpi} DPI (minimum: ${dpi.minDpi}).`,
            layerId: layer.id,
            viewId: view.id,
          });
        } else if (dpi && dpi.status === 'warning') {
          issues.push({
            severity: 'warning',
            message: `"${layer.name}" is ${dpi.effectiveDpi} DPI. 300+ recommended.`,
            layerId: layer.id,
            viewId: view.id,
          });
        }
      }

      // Bounds check: is layer at least partially inside printable area?
      const pa = view.printableArea;
      const t = layer.transform;
      const objW = t.width * t.scaleX;
      const objH = t.height * t.scaleY;
      const objRight = t.x + objW;
      const objBottom = t.y + objH;
      const paRight = pa.x + pa.width;
      const paBottom = pa.y + pa.height;

      const overlapX = Math.max(0, Math.min(objRight, paRight) - Math.max(t.x, pa.x));
      const overlapY = Math.max(0, Math.min(objBottom, paBottom) - Math.max(t.y, pa.y));
      const overlapArea = overlapX * overlapY;
      const objArea = objW * objH;

      if (objArea > 0 && overlapArea / objArea < 0.1) {
        issues.push({
          severity: 'warning',
          message: `"${layer.name}" is mostly outside the printable area.`,
          layerId: layer.id,
          viewId: view.id,
        });
      }
    }
  }

  return {
    valid: issues.filter((i) => i.severity === 'error').length === 0,
    issues,
  };
}
