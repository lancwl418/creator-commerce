import type { ProductTemplate } from '@/types/product';

export const mugTemplate: ProductTemplate = {
  id: 'mug-classic',
  type: 'mug',
  name: 'Classic Mug',
  description: '11oz ceramic mug with wrap-around print area',
  defaultViewId: 'wrap',
  metadata: {},
  views: [
    {
      id: 'wrap',
      label: 'Wrap',
      mockupImageUrl: '/templates/mug-wrap.svg',
      mockupWidth: 900,
      mockupHeight: 400,
      printableArea: {
        shape: { type: 'rect' },
        x: 120,
        y: 80,
        width: 480,
        height: 240,
        physicalWidthInches: 8.5,
        physicalHeightInches: 3.5,
        minDPI: 150,
      },
    },
  ],
};
