import * as fabric from 'fabric';
import type { ProductTemplate, ProductView } from '@/types/product';
import type { DesignLayer, DesignView } from '@/types/design';
import { ObjectFactory } from './ObjectFactory';
import { ClipRegionManager } from './ClipRegionManager';
import { GridManager } from './GridManager';

export type CropResult = {
  layerId: string;
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;
};

export type CanvasEventHandler = {
  onObjectModified?: (layerId: string, transform: DesignLayer['transform']) => void;
  onSelectionChanged?: (layerIds: string[]) => void;
  onObjectAdded?: (layerId: string) => void;
  onObjectRemoved?: (layerId: string) => void;
};

export class CanvasManager {
  private canvas: fabric.Canvas | null = null;
  private clipRegion: ClipRegionManager | null = null;
  private gridManager: GridManager | null = null;
  private currentView: ProductView | null = null;
  private eventHandlers: CanvasEventHandler = {};
  private backgroundImage: fabric.FabricImage | null = null;
  private ready = false;
  private snapEnabled = false;
  private constrainEnabled = true;
  private cropRect: fabric.Rect | null = null;
  private cropTargetId: string | null = null;

  async initialize(
    canvasElement: HTMLCanvasElement,
    template: ProductTemplate,
    viewId: string,
    handlers: CanvasEventHandler
  ): Promise<void> {
    this.eventHandlers = handlers;

    const view = template.views.find((v) => v.id === viewId);
    const initW = view?.mockupWidth ?? 800;
    const initH = view?.mockupHeight ?? 1000;

    this.canvas = new fabric.Canvas(canvasElement, {
      width: initW,
      height: initH,
      selection: true,
      preserveObjectStacking: true,
      backgroundColor: '#f0f0f0',
      enableRetinaScaling: true,
    });

    await this.setupView(template, viewId);
    this.bindEvents();
    this.ready = true;
  }

  isReady(): boolean {
    return this.ready;
  }

  private async setupView(template: ProductTemplate, viewId: string): Promise<void> {
    const view = template.views.find((v) => v.id === viewId);
    if (!view || !this.canvas) return;

    this.currentView = view;

    // Load mockup background
    try {
      const img = await fabric.FabricImage.fromURL(view.mockupImageUrl, {}, { crossOrigin: 'anonymous' });
      if (!this.canvas) return;

      // Compute scale from intrinsic size; fall back to 1:1 if unavailable
      const imgW = img.width || view.mockupWidth;
      const imgH = img.height || view.mockupHeight;

      img.set({
        left: 0,
        top: 0,
        originX: 'left',
        originY: 'top',
        scaleX: view.mockupWidth / imgW,
        scaleY: view.mockupHeight / imgH,
        selectable: false,
        evented: false,
        excludeFromExport: true,
      });

      if (this.backgroundImage) {
        this.canvas.remove(this.backgroundImage);
      }
      this.backgroundImage = img;
      this.canvas.insertAt(0, img);
    } catch {
      if (!this.canvas) return;
      this.canvas.backgroundColor = '#ffffff';
    }

    if (!this.canvas) return;

    // Setup printable area clip region
    this.clipRegion = new ClipRegionManager(this.canvas, view.printableArea);
    this.clipRegion.render();

    // Setup grid
    this.gridManager = new GridManager(this.canvas, view.printableArea);
    this.gridManager.render();

    this.canvas.renderAll();
  }

  private bindEvents(): void {
    if (!this.canvas) return;

    this.canvas.on('object:moving', (e) => {
      const obj = e.target;
      if (!obj || !obj.data?.layerId) return;

      if (this.snapEnabled && this.gridManager) {
        const snapped = this.gridManager.snapPoint(obj.left ?? 0, obj.top ?? 0);
        obj.left = snapped.x;
        obj.top = snapped.y;
      }

      if (this.constrainEnabled && this.currentView) {
        this.constrainToPrintableArea(obj);
      }

      obj.setCoords();
    });

    this.canvas.on('object:modified', (e) => {
      const obj = e.target;
      if (!obj || !obj.data?.layerId) return;
      this.eventHandlers.onObjectModified?.(obj.data.layerId as string, {
        x: obj.left ?? 0,
        y: obj.top ?? 0,
        width: obj.width ?? 0,
        height: obj.height ?? 0,
        rotation: obj.angle ?? 0,
        scaleX: obj.scaleX ?? 1,
        scaleY: obj.scaleY ?? 1,
        flipX: obj.flipX ?? false,
        flipY: obj.flipY ?? false,
      });
    });

    this.canvas.on('selection:created', (e) => {
      const ids = this.getSelectedLayerIds(e.selected);
      this.eventHandlers.onSelectionChanged?.(ids);
    });

    this.canvas.on('selection:updated', (e) => {
      const ids = this.getSelectedLayerIds(e.selected);
      this.eventHandlers.onSelectionChanged?.(ids);
    });

    this.canvas.on('selection:cleared', () => {
      this.eventHandlers.onSelectionChanged?.([]);
    });
  }

  private getSelectedLayerIds(selected?: fabric.FabricObject[]): string[] {
    if (!selected) return [];
    return selected
      .filter((obj) => obj.data?.layerId)
      .map((obj) => obj.data!.layerId as string);
  }

  addLayer(layer: DesignLayer): void {
    if (!this.canvas || !this.currentView) return;

    const clipPath = this.clipRegion?.createClipPathClone() ?? null;

    ObjectFactory.createAndAdd(layer, this.canvas, clipPath);
  }

  updateLayerTransform(layerId: string, transform: Partial<DesignLayer['transform']>): void {
    const obj = this.findObjectByLayerId(layerId);
    if (!obj) return;

    if (transform.x !== undefined) obj.left = transform.x;
    if (transform.y !== undefined) obj.top = transform.y;
    if (transform.rotation !== undefined) obj.angle = transform.rotation;
    if (transform.scaleX !== undefined) obj.scaleX = transform.scaleX;
    if (transform.scaleY !== undefined) obj.scaleY = transform.scaleY;
    if (transform.flipX !== undefined) obj.flipX = transform.flipX;
    if (transform.flipY !== undefined) obj.flipY = transform.flipY;

    obj.setCoords();
    this.canvas?.renderAll();
  }

  removeLayerFromCanvas(layerId: string): void {
    const obj = this.findObjectByLayerId(layerId);
    if (!obj || !this.canvas) return;
    this.canvas.remove(obj);
    this.canvas.renderAll();
  }

  setLayerVisibility(layerId: string, visible: boolean): void {
    const obj = this.findObjectByLayerId(layerId);
    if (!obj) return;
    obj.visible = visible;
    this.canvas?.renderAll();
  }

  setLayerLocked(layerId: string, locked: boolean): void {
    const obj = this.findObjectByLayerId(layerId);
    if (!obj) return;
    obj.selectable = !locked;
    obj.evented = !locked;
    this.canvas?.renderAll();
  }

  flipLayerHorizontal(layerId: string): void {
    const obj = this.findObjectByLayerId(layerId);
    if (!obj) return;
    obj.flipX = !obj.flipX;
    obj.setCoords();
    this.canvas?.renderAll();
  }

  flipLayerVertical(layerId: string): void {
    const obj = this.findObjectByLayerId(layerId);
    if (!obj) return;
    obj.flipY = !obj.flipY;
    obj.setCoords();
    this.canvas?.renderAll();
  }

  setLayerOpacity(layerId: string, opacity: number): void {
    const obj = this.findObjectByLayerId(layerId);
    if (!obj) return;
    obj.opacity = opacity;
    this.canvas?.renderAll();
  }

  reorderLayers(orderedIds: string[]): void {
    if (!this.canvas) return;

    let startIndex = 0;
    if (this.backgroundImage) startIndex++;
    if (this.clipRegion) startIndex += this.clipRegion.getOverlayCount();

    for (let i = 0; i < orderedIds.length; i++) {
      const obj = this.findObjectByLayerId(orderedIds[i]);
      if (obj) {
        this.canvas.remove(obj);
        this.canvas.insertAt(startIndex + i, obj);
      }
    }
    this.canvas.renderAll();
  }

  loadDesignView(designView: DesignView): void {
    if (!this.canvas) return;

    const designObjects = this.canvas.getObjects().filter((o) => o.data?.layerId);
    for (const obj of designObjects) {
      this.canvas.remove(obj);
    }

    for (const layer of designView.layers) {
      this.addLayer(layer);
    }
  }

  selectObject(layerId: string): void {
    const obj = this.findObjectByLayerId(layerId);
    if (!obj || !this.canvas) return;
    this.canvas.setActiveObject(obj);
    this.canvas.renderAll();
  }

  deselectAll(): void {
    this.canvas?.discardActiveObject();
    this.canvas?.renderAll();
  }

  setZoom(zoom: number): void {
    if (!this.canvas) return;
    const center = this.canvas.getCenterPoint();
    this.canvas.zoomToPoint(center, zoom);
    this.canvas.renderAll();
  }

  exportToDataURL(format: 'png' | 'jpeg' = 'png', multiplier = 1): string {
    if (!this.canvas || !this.currentView) return '';

    const { printableArea } = this.currentView;

    return this.canvas.toDataURL({
      format,
      multiplier,
      left: printableArea.x,
      top: printableArea.y,
      width: printableArea.width,
      height: printableArea.height,
    });
  }

  private findObjectByLayerId(layerId: string): fabric.FabricObject | undefined {
    return this.canvas?.getObjects().find((o) => o.data?.layerId === layerId);
  }

  setGridVisible(visible: boolean): void {
    this.gridManager?.setVisible(visible);
  }

  setGridSize(size: number): void {
    this.gridManager?.setGridSize(size);
  }

  setSnapToGrid(enabled: boolean): void {
    this.snapEnabled = enabled;
  }

  setConstrainToPrintableArea(enabled: boolean): void {
    this.constrainEnabled = enabled;
  }

  enterCropMode(layerId: string): boolean {
    if (!this.canvas) return false;
    const obj = this.findObjectByLayerId(layerId);
    if (!obj || !(obj instanceof fabric.FabricImage)) return false;

    this.cropTargetId = layerId;
    const left = obj.left ?? 0;
    const top = obj.top ?? 0;
    const w = (obj.width ?? 0) * (obj.scaleX ?? 1);
    const h = (obj.height ?? 0) * (obj.scaleY ?? 1);

    this.cropRect = new fabric.Rect({
      left,
      top,
      width: w,
      height: h,
      originX: 'left',
      originY: 'top',
      fill: 'rgba(0,0,0,0.3)',
      stroke: '#ffffff',
      strokeWidth: 2,
      strokeDashArray: [6, 3],
      cornerColor: '#3b82f6',
      cornerSize: 8,
      transparentCorners: false,
      lockRotation: true,
      hasRotatingPoint: false,
      data: { isCropRect: true },
    });

    this.canvas.add(this.cropRect);
    this.canvas.setActiveObject(this.cropRect);
    this.canvas.renderAll();
    return true;
  }

  applyCrop(): CropResult | null {
    if (!this.canvas || !this.cropRect || !this.cropTargetId) return null;

    const obj = this.findObjectByLayerId(this.cropTargetId);
    if (!obj || !(obj instanceof fabric.FabricImage)) {
      this.cancelCrop();
      return null;
    }

    const imgLeft = obj.left ?? 0;
    const imgTop = obj.top ?? 0;
    const imgScaleX = obj.scaleX ?? 1;
    const imgScaleY = obj.scaleY ?? 1;

    // Crop rect bounds in canvas coordinates
    const cropLeft = this.cropRect.left ?? 0;
    const cropTop = this.cropRect.top ?? 0;
    const cropW = (this.cropRect.width ?? 0) * (this.cropRect.scaleX ?? 1);
    const cropH = (this.cropRect.height ?? 0) * (this.cropRect.scaleY ?? 1);

    // Convert to source image pixel coordinates
    const existingCropX = obj.cropX ?? 0;
    const existingCropY = obj.cropY ?? 0;
    const srcCropX = existingCropX + (cropLeft - imgLeft) / imgScaleX;
    const srcCropY = existingCropY + (cropTop - imgTop) / imgScaleY;
    const srcCropW = cropW / imgScaleX;
    const srcCropH = cropH / imgScaleY;

    // Apply crop to the image
    obj.cropX = Math.max(0, Math.round(srcCropX));
    obj.cropY = Math.max(0, Math.round(srcCropY));
    obj.width = Math.round(srcCropW);
    obj.height = Math.round(srcCropH);
    obj.left = cropLeft;
    obj.top = cropTop;
    obj.scaleX = imgScaleX;
    obj.scaleY = imgScaleY;
    obj.setCoords();

    const result: CropResult = {
      layerId: this.cropTargetId,
      cropX: obj.cropX,
      cropY: obj.cropY,
      cropWidth: obj.width,
      cropHeight: obj.height,
    };

    // Clean up crop rect
    this.canvas.remove(this.cropRect);
    this.cropRect = null;
    this.cropTargetId = null;
    this.canvas.setActiveObject(obj);
    this.canvas.renderAll();

    return result;
  }

  cancelCrop(): void {
    if (!this.canvas || !this.cropRect) return;
    this.canvas.remove(this.cropRect);
    this.cropRect = null;
    this.cropTargetId = null;
    this.canvas.renderAll();
  }

  isCropping(): boolean {
    return this.cropRect !== null;
  }

  updateImageSource(layerId: string, newSrc: string): void {
    const obj = this.findObjectByLayerId(layerId);
    if (!obj || !(obj instanceof fabric.FabricImage) || !this.canvas) return;

    const canvas = this.canvas;
    const prevProps = {
      left: obj.left, top: obj.top, scaleX: obj.scaleX, scaleY: obj.scaleY,
      angle: obj.angle, flipX: obj.flipX, flipY: obj.flipY,
      opacity: obj.opacity, clipPath: obj.clipPath, data: obj.data,
    };

    fabric.FabricImage.fromURL(newSrc).then((newImg) => {
      const imgW = newImg.width ?? 1;
      const imgH = newImg.height ?? 1;
      const targetW = (obj.width ?? 1) * (prevProps.scaleX ?? 1);
      const targetH = (obj.height ?? 1) * (prevProps.scaleY ?? 1);

      newImg.set({
        ...prevProps,
        originX: 'left',
        originY: 'top',
        scaleX: targetW / imgW,
        scaleY: targetH / imgH,
        selectable: true,
        evented: true,
      });

      canvas.remove(obj);
      canvas.add(newImg);
      canvas.setActiveObject(newImg);
      canvas.renderAll();
    });
  }

  /**
   * Constrain object so at least 20% of its area remains inside the printable area.
   * This prevents users from accidentally dragging objects completely off the print zone.
   */
  private constrainToPrintableArea(obj: fabric.FabricObject): void {
    if (!this.currentView) return;
    const pa = this.currentView.printableArea;
    const objW = (obj.width ?? 0) * (obj.scaleX ?? 1);
    const objH = (obj.height ?? 0) * (obj.scaleY ?? 1);

    // Require at least 20% overlap
    const minOverlap = 0.2;
    const minVisibleW = objW * minOverlap;
    const minVisibleH = objH * minOverlap;

    let left = obj.left ?? 0;
    let top = obj.top ?? 0;

    // Object right edge must be at least minVisibleW inside printable area left
    if (left + objW < pa.x + minVisibleW) {
      left = pa.x + minVisibleW - objW;
    }
    // Object left edge must be at most pa.x + pa.width - minVisibleW
    if (left > pa.x + pa.width - minVisibleW) {
      left = pa.x + pa.width - minVisibleW;
    }
    // Same for vertical
    if (top + objH < pa.y + minVisibleH) {
      top = pa.y + minVisibleH - objH;
    }
    if (top > pa.y + pa.height - minVisibleH) {
      top = pa.y + pa.height - minVisibleH;
    }

    obj.left = left;
    obj.top = top;
  }

  getCanvas(): fabric.Canvas | null {
    return this.canvas;
  }

  dispose(): void {
    this.ready = false;
    this.gridManager?.dispose();
    if (this.canvas) {
      this.canvas.dispose();
      this.canvas = null;
    }
    this.clipRegion = null;
    this.gridManager = null;
    this.currentView = null;
    this.backgroundImage = null;
  }
}
