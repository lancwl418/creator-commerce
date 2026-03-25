import type { ProductTemplate } from '@/types/product';

export const phonecaseTemplate: ProductTemplate = {
  id: 'phonecase-classic',
  type: 'phonecase',
  name: 'Phone Case',
  description: 'Slim phone case with back print area',
  defaultViewId: 'back',
  metadata: {},
  views: [
    {
      id: 'back',
      label: 'Back',
      mockupImageUrl: '/templates/phonecase-back.svg',
      mockupWidth: 400,
      mockupHeight: 800,
      printableArea: {
        shape: { type: 'rect', borderRadius: 30 },
        x: 80,
        y: 185,
        width: 240,
        height: 540,
        physicalWidthInches: 2.75,
        physicalHeightInches: 5.5,
        minDPI: 200,
      },
    },
  ],
};
