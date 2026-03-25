export interface DesignDocument {
  version: '1.0.0';
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  productTemplateId: string;
  views: Record<string, DesignView>;
  metadata: Record<string, unknown>;
}

export interface DesignView {
  viewId: string;
  layers: DesignLayer[];
  backgroundColor?: string;
}

export interface DesignLayer {
  id: string;
  type: LayerType;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  transform: LayerTransform;
  data: LayerData;
}

export type LayerType = 'image' | 'text' | 'shape';

export interface LayerTransform {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  flipX: boolean;
  flipY: boolean;
}

export type LayerData = ImageLayerData | TextLayerData | ShapeLayerData;

export interface ImageLayerData {
  type: 'image';
  src: string;
  originalWidth: number;
  originalHeight: number;
  filters: ImageFilter[];
  cropX?: number;
  cropY?: number;
  cropWidth?: number;
  cropHeight?: number;
}

export interface TextLayerData {
  type: 'text';
  content: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  fontStyle: 'normal' | 'italic';
  textAlign: 'left' | 'center' | 'right';
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  lineHeight: number;
  charSpacing: number;
}

export interface ShapeLayerData {
  type: 'shape';
  shapeType: 'rect' | 'circle' | 'ellipse' | 'triangle';
  fill: string;
  stroke: string;
  strokeWidth: number;
  borderRadius?: number;
}

export interface ImageFilter {
  type: string;
  params: Record<string, number>;
}
