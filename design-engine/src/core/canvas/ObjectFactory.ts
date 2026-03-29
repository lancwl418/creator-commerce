import * as fabric from 'fabric';
import type { DesignLayer, ImageLayerData } from '@/types/design';

export class ObjectFactory {
  /**
   * Create a fabric object from a DesignLayer and add it to the canvas.
   * Images are loaded asynchronously and added when ready.
   */
  static createAndAdd(
    layer: DesignLayer,
    canvas: fabric.Canvas,
    clipPath: fabric.FabricObject | null
  ): void {
    if (layer.data.type === 'image') {
      ObjectFactory.loadAndAddImage(layer, canvas, clipPath);
    } else {
      const obj =
        layer.data.type === 'text'
          ? ObjectFactory.createText(layer)
          : ObjectFactory.createShape(layer);

      if (obj) {
        ObjectFactory.applyCommonProps(obj, layer);
        if (clipPath) obj.clipPath = clipPath;
        canvas.add(obj);
        canvas.setActiveObject(obj);
        canvas.renderAll();
      }
    }
  }

  private static loadAndAddImage(
    layer: DesignLayer,
    canvas: fabric.Canvas,
    clipPath: fabric.FabricObject | null
  ): void {
    if (layer.data.type !== 'image') return;

    const imageData = layer.data as ImageLayerData;

    // Use crossOrigin only for external URLs; same-origin proxy URLs don't need it
    // and setting it can cause CORS tainting issues with canvas.toDataURL()
    const crossOriginOpt = imageData.src.startsWith('data:') || imageData.src.startsWith('/')
      ? {} : { crossOrigin: 'anonymous' };
    fabric.FabricImage.fromURL(imageData.src, {}, crossOriginOpt).then((img) => {
      // Apply crop if set
      if (imageData.cropX != null) img.cropX = imageData.cropX;
      if (imageData.cropY != null) img.cropY = imageData.cropY;
      if (imageData.cropWidth != null) img.width = imageData.cropWidth;
      if (imageData.cropHeight != null) img.height = imageData.cropHeight;

      // Restore saved transform — use scaleX/scaleY directly instead of
      // recalculating from width/height, because transform.width is the unscaled
      // fabric dimension which differs from the fresh image source dimensions.
      img.set({
        left: layer.transform.x,
        top: layer.transform.y,
        originX: 'left',
        originY: 'top',
        scaleX: layer.transform.scaleX,
        scaleY: layer.transform.scaleY,
        angle: layer.transform.rotation,
        flipX: layer.transform.flipX,
        flipY: layer.transform.flipY,
        opacity: layer.opacity,
        visible: layer.visible,
        selectable: !layer.locked,
        evented: !layer.locked,
        data: { layerId: layer.id, layerType: layer.type },
      });

      if (clipPath) {
        img.clipPath = clipPath;
      }

      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.renderAll();
    });
  }

  private static createText(layer: DesignLayer): fabric.Textbox | null {
    if (layer.data.type !== 'text') return null;

    return new fabric.Textbox(layer.data.content, {
      fontFamily: layer.data.fontFamily,
      fontSize: layer.data.fontSize,
      fontWeight: layer.data.fontWeight as string | number,
      fontStyle: layer.data.fontStyle,
      textAlign: layer.data.textAlign,
      fill: layer.data.fill,
      stroke: layer.data.stroke ?? undefined,
      strokeWidth: layer.data.strokeWidth ?? 0,
      lineHeight: layer.data.lineHeight,
      charSpacing: layer.data.charSpacing,
      width: layer.transform.width,
    });
  }

  private static createShape(layer: DesignLayer): fabric.FabricObject | null {
    if (layer.data.type !== 'shape') return null;

    const { shapeType, fill, stroke, strokeWidth, borderRadius } = layer.data;
    const { width, height } = layer.transform;

    switch (shapeType) {
      case 'rect':
        return new fabric.Rect({
          width,
          height,
          fill,
          stroke,
          strokeWidth,
          rx: borderRadius ?? 0,
          ry: borderRadius ?? 0,
        });
      case 'circle':
        return new fabric.Circle({
          radius: Math.min(width, height) / 2,
          fill,
          stroke,
          strokeWidth,
        });
      case 'ellipse':
        return new fabric.Ellipse({
          rx: width / 2,
          ry: height / 2,
          fill,
          stroke,
          strokeWidth,
        });
      case 'triangle':
        return new fabric.Triangle({
          width,
          height,
          fill,
          stroke,
          strokeWidth,
        });
      default:
        return null;
    }
  }

  private static applyCommonProps(obj: fabric.FabricObject, layer: DesignLayer): void {
    obj.set({
      left: layer.transform.x,
      top: layer.transform.y,
      originX: 'left',
      originY: 'top',
      angle: layer.transform.rotation,
      scaleX: layer.transform.scaleX,
      scaleY: layer.transform.scaleY,
      flipX: layer.transform.flipX,
      flipY: layer.transform.flipY,
      opacity: layer.opacity,
      visible: layer.visible,
      selectable: !layer.locked,
      evented: !layer.locked,
      data: { layerId: layer.id, layerType: layer.type },
    });
  }
}
