import * as fabric from 'fabric';
import type { PrintableArea } from '@/types/product';

export class ClipRegionManager {
  private canvas: fabric.Canvas;
  private printableArea: PrintableArea;
  private overlay: fabric.FabricObject | null = null;

  constructor(canvas: fabric.Canvas, printableArea: PrintableArea) {
    this.canvas = canvas;
    this.printableArea = printableArea;
  }

  /**
   * Create a NEW clipPath clone for each object.
   * Each object must have its own clipPath instance.
   */
  createClipPathClone(): fabric.FabricObject {
    const { shape, x, y, width, height } = this.printableArea;

    switch (shape.type) {
      case 'rect':
        return new fabric.Rect({
          left: x,
          top: y,
          width,
          height,
          originX: 'left',
          originY: 'top',
          rx: shape.borderRadius ?? 0,
          ry: shape.borderRadius ?? 0,
          absolutePositioned: true,
        });
      case 'ellipse':
        return new fabric.Ellipse({
          left: x,
          top: y,
          rx: width / 2,
          ry: height / 2,
          originX: 'left',
          originY: 'top',
          absolutePositioned: true,
        });
      case 'polygon':
        return new fabric.Polygon(shape.points, {
          left: x,
          top: y,
          originX: 'left',
          originY: 'top',
          absolutePositioned: true,
        });
      default:
        return new fabric.Rect({
          left: x,
          top: y,
          width,
          height,
          originX: 'left',
          originY: 'top',
          absolutePositioned: true,
        });
    }
  }

  render(): void {
    const { shape, x, y, width, height } = this.printableArea;

    if (shape.type === 'rect') {
      this.overlay = new fabric.Rect({
        left: x,
        top: y,
        width,
        height,
        originX: 'left',
        originY: 'top',
        rx: shape.borderRadius ?? 0,
        ry: shape.borderRadius ?? 0,
        fill: 'transparent',
        stroke: '#3b82f6',
        strokeWidth: 1.5,
        strokeDashArray: [8, 4],
        selectable: false,
        evented: false,
        excludeFromExport: true,
        data: { isPrintableAreaOverlay: true },
      });
    } else if (shape.type === 'ellipse') {
      this.overlay = new fabric.Ellipse({
        left: x,
        top: y,
        rx: width / 2,
        ry: height / 2,
        originX: 'left',
        originY: 'top',
        fill: 'transparent',
        stroke: '#3b82f6',
        strokeWidth: 1.5,
        strokeDashArray: [8, 4],
        selectable: false,
        evented: false,
        excludeFromExport: true,
        data: { isPrintableAreaOverlay: true },
      });
    }

    if (this.overlay) {
      this.canvas.add(this.overlay);
    }
  }

  setVisible(visible: boolean): void {
    if (this.overlay) {
      this.overlay.visible = visible;
      this.canvas.renderAll();
    }
  }

  getOverlayCount(): number {
    return this.overlay ? 1 : 0;
  }

  getPrintableArea(): PrintableArea {
    return this.printableArea;
  }
}
