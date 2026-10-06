export type ProductEditorSession = {
  mode: 'create';
  creatorId: string;
  templates: string;
  cacheKey: string;
} | {
  mode: 'edit';
  productId: string;
  templateId: string;
  layers: unknown[];
};
