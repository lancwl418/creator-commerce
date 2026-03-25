import * as fabric from 'fabric';
import type { DesignLayer, DesignView, LayerTransform, ImageLayerData, TextLayerData, ShapeLayerData } from '@/types/design';
import { generateId } from '@/lib/id';

export class CanvasSerializer {
  /**
   * Extract design data from the current canvas state
   */
  static canvasToDesignView(canvas: fabric.Canvas, viewId: string): DesignView {
    const layers: DesignLayer[] = [];

    for (const obj of canvas.getObjects()) {
      // Skip non-design objects (background, overlays)
      if (!obj.data?.layerId) continue;

      const layer = CanvasSerializer.objectToLayer(obj);
      if (layer) {
        layers.push(layer);
      }
    }

    return { viewId, layers };
  }

  private static objectToLayer(obj: fabric.FabricObject): DesignLayer | null {
    const transform: LayerTransform = {
      x: obj.left ?? 0,
      y: obj.top ?? 0,
      width: obj.width ?? 0,
      height: obj.height ?? 0,
      rotation: obj.angle ?? 0,
      scaleX: obj.scaleX ?? 1,
      scaleY: obj.scaleY ?? 1,
      flipX: obj.flipX ?? false,
      flipY: obj.flipY ?? false,
    };

    const layerType = obj.data?.layerType as string;

    let data: DesignLayer['data'];

    if (obj instanceof fabric.FabricImage) {
      data = {
        type: 'image',
        src: obj.getSrc(),
        originalWidth: obj.width ?? 0,
        originalHeight: obj.height ?? 0,
        filters: [],
      } satisfies ImageLayerData;
    } else if (obj instanceof fabric.Textbox) {
      data = {
        type: 'text',
        content: obj.text ?? '',
        fontFamily: obj.fontFamily ?? 'Arial',
        fontSize: obj.fontSize ?? 16,
        fontWeight: typeof obj.fontWeight === 'number' ? obj.fontWeight : 400,
        fontStyle: (obj.fontStyle ?? 'normal') as 'normal' | 'italic',
        textAlign: (obj.textAlign ?? 'left') as 'left' | 'center' | 'right',
        fill: typeof obj.fill === 'string' ? obj.fill : '#000000',
        stroke: typeof obj.stroke === 'string' ? obj.stroke : undefined,
        strokeWidth: obj.strokeWidth ?? 0,
        lineHeight: obj.lineHeight ?? 1.2,
        charSpacing: obj.charSpacing ?? 0,
      } satisfies TextLayerData;
    } else if (
      obj instanceof fabric.Rect ||
      obj instanceof fabric.Circle ||
      obj instanceof fabric.Ellipse ||
      obj instanceof fabric.Triangle
    ) {
      let shapeType: ShapeLayerData['shapeType'] = 'rect';
      if (obj instanceof fabric.Circle) shapeType = 'circle';
      else if (obj instanceof fabric.Ellipse) shapeType = 'ellipse';
      else if (obj instanceof fabric.Triangle) shapeType = 'triangle';

      data = {
        type: 'shape',
        shapeType,
        fill: typeof obj.fill === 'string' ? obj.fill : '#000000',
        stroke: typeof obj.stroke === 'string' ? obj.stroke : '#000000',
        strokeWidth: obj.strokeWidth ?? 0,
        borderRadius: obj instanceof fabric.Rect ? (obj.rx ?? 0) : undefined,
      } satisfies ShapeLayerData;
    } else {
      return null;
    }

    return {
      id: (obj.data?.layerId as string) ?? generateId(),
      type: layerType as DesignLayer['type'],
      name: (obj.data?.layerName as string) ?? `Layer`,
      visible: obj.visible ?? true,
      locked: !(obj.selectable ?? true),
      opacity: obj.opacity ?? 1,
      transform,
      data,
    };
  }
}
