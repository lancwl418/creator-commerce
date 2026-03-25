import type { ProductTemplate, ProductView, PrintableArea } from '@/types/product';

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isString(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0;
}

function isPositiveNumber(v: unknown): v is number {
  return typeof v === 'number' && v > 0 && Number.isFinite(v);
}

function isNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function validatePrintableArea(raw: unknown): PrintableArea | null {
  if (!isObject(raw)) return null;

  const { shape, x, y, width, height, physicalWidthInches, physicalHeightInches, minDPI } = raw;

  if (!isNumber(x) || !isNumber(y)) return null;
  if (!isPositiveNumber(width) || !isPositiveNumber(height)) return null;
  if (!isPositiveNumber(physicalWidthInches) || !isPositiveNumber(physicalHeightInches)) return null;

  // shape validation
  if (!isObject(shape) || !isString(shape.type)) return null;
  if (!['rect', 'ellipse', 'polygon'].includes(shape.type as string)) return null;

  return {
    shape: shape as PrintableArea['shape'],
    x: x as number,
    y: y as number,
    width: width as number,
    height: height as number,
    physicalWidthInches: physicalWidthInches as number,
    physicalHeightInches: physicalHeightInches as number,
    minDPI: isPositiveNumber(minDPI) ? minDPI : 150,
  };
}

function validateView(raw: unknown): ProductView | null {
  if (!isObject(raw)) return null;

  const { id, label, mockupImageUrl, mockupWidth, mockupHeight, printableArea } = raw;

  if (!isString(id) || !isString(label) || !isString(mockupImageUrl)) return null;
  if (!isPositiveNumber(mockupWidth) || !isPositiveNumber(mockupHeight)) return null;

  const validArea = validatePrintableArea(printableArea);
  if (!validArea) return null;

  return {
    id: id as string,
    label: label as string,
    mockupImageUrl: mockupImageUrl as string,
    mockupWidth: mockupWidth as number,
    mockupHeight: mockupHeight as number,
    printableArea: validArea,
  };
}

/** Validate a single external product template at runtime. Returns null if invalid. */
export function validateTemplate(raw: unknown): ProductTemplate | null {
  if (!isObject(raw)) {
    console.warn('[TemplateValidator] Template is not an object');
    return null;
  }

  const { id, type, name, views, defaultViewId, description, metadata } = raw;

  if (!isString(id)) {
    console.warn('[TemplateValidator] Missing or invalid id');
    return null;
  }
  if (!isString(type)) {
    console.warn(`[TemplateValidator] Missing or invalid type for template "${id}"`);
    return null;
  }
  if (!isString(name)) {
    console.warn(`[TemplateValidator] Missing or invalid name for template "${id}"`);
    return null;
  }
  if (!Array.isArray(views) || views.length === 0) {
    console.warn(`[TemplateValidator] Missing or empty views for template "${id}"`);
    return null;
  }

  const validViews: ProductView[] = [];
  for (const v of views) {
    const validated = validateView(v);
    if (validated) {
      validViews.push(validated);
    } else {
      console.warn(`[TemplateValidator] Invalid view in template "${id}", skipping`);
    }
  }

  if (validViews.length === 0) {
    console.warn(`[TemplateValidator] No valid views for template "${id}"`);
    return null;
  }

  const resolvedDefaultViewId = isString(defaultViewId) && validViews.some((v) => v.id === defaultViewId)
    ? (defaultViewId as string)
    : validViews[0].id;

  return {
    id: id as string,
    type: type as string,
    name: name as string,
    description: isString(description) ? (description as string) : '',
    views: validViews,
    defaultViewId: resolvedDefaultViewId,
    metadata: isObject(metadata) ? (metadata as Record<string, unknown>) : {},
  };
}

/** Validate an array of external templates. Filters out invalid ones. */
export function validateTemplates(rawArray: unknown[]): ProductTemplate[] {
  const results: ProductTemplate[] = [];
  for (const item of rawArray) {
    const validated = validateTemplate(item);
    if (validated) {
      results.push(validated);
    }
  }
  return results;
}
