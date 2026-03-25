import * as fabric from 'fabric';
import type { PrintableArea } from '@/types/product';

export class GridManager {
  private canvas: fabric.Canvas;
  private printableArea: PrintableArea;
  private gridLines: fabric.FabricObject[] = [];
  private visible = false;
  private gridSize = 20;

  constructor(canvas: fabric.Canvas, printableArea: PrintableArea) {
    this.canvas = canvas;
    this.printableArea = printableArea;
  }

  render(gridSize?: number): void {
    if (gridSize !== undefined) this.gridSize = gridSize;
    this.clear();

    const { x, y, width, height } = this.printableArea;
    const size = this.gridSize;

    // Vertical lines
    for (let cx = x + size; cx < x + width; cx += size) {
      const line = new fabric.Line([cx, y, cx, y + height], {
        stroke: '#d1d5db',
        strokeWidth: 0.5,
        selectable: false,
        evented: false,
        excludeFromExport: true,
        originX: 'left',
        originY: 'top',
        data: { isGrid: true },
      });
      this.gridLines.push(line);
      this.canvas.add(line);
    }

    // Horizontal lines
    for (let cy = y + size; cy < y + height; cy += size) {
      const line = new fabric.Line([x, cy, x + width, cy], {
        stroke: '#d1d5db',
        strokeWidth: 0.5,
        selectable: false,
        evented: false,
        excludeFromExport: true,
        originX: 'left',
        originY: 'top',
        data: { isGrid: true },
      });
      this.gridLines.push(line);
      this.canvas.add(line);
    }

    // Send grid lines behind design objects but above background/overlay
    for (const line of this.gridLines) {
      line.visible = this.visible;
    }

    this.canvas.renderAll();
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    for (const line of this.gridLines) {
      line.visible = visible;
    }
    this.canvas.renderAll();
  }

  setGridSize(size: number): void {
    this.gridSize = size;
    if (this.visible) {
      this.render();
      this.setVisible(true);
    }
  }

  getGridSize(): number {
    return this.gridSize;
  }

  isVisible(): boolean {
    return this.visible;
  }

  /**
   * Snap a coordinate to the nearest grid line within the printable area.
   */
  snapToGrid(value: number, offset: number): number {
    const relative = value - offset;
    const snapped = Math.round(relative / this.gridSize) * this.gridSize;
    return snapped + offset;
  }

  snapPoint(x: number, y: number): { x: number; y: number } {
    return {
      x: this.snapToGrid(x, this.printableArea.x),
      y: this.snapToGrid(y, this.printableArea.y),
    };
  }

  private clear(): void {
    for (const line of this.gridLines) {
      this.canvas.remove(line);
    }
    this.gridLines = [];
  }

  getLineCount(): number {
    return this.gridLines.length;
  }

  dispose(): void {
    this.clear();
  }
}
