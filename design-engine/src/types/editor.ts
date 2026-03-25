export type EditorTool = 'select' | 'pan' | 'text' | 'shape' | 'crop';

export interface EditorState {
  activeTool: EditorTool;
  zoom: number;
  panOffset: { x: number; y: number };
  selectedLayerIds: string[];
  activeViewId: string;
  isInteracting: boolean;
  showPrintableArea: boolean;
}
