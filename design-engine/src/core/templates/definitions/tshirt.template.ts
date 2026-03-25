import type { ProductTemplate } from '@/types/product';

export const tshirtTemplate: ProductTemplate = {
  id: 'tshirt-classic',
  type: 'tshirt',
  name: 'Classic T-Shirt',
  description: 'Standard crew neck t-shirt with front and back print areas',
  defaultViewId: 'front',
  metadata: {},
  views: [
    {
      id: 'front',
      label: 'Front',
      mockupImageUrl: '/templates/tshirt-front.svg',
      mockupWidth: 800,
      mockupHeight: 1000,
      printableArea: {
        shape: { type: 'rect' },
        x: 280,
        y: 220,
        width: 240,
        height: 380,
        physicalWidthInches: 12,
        physicalHeightInches: 16,
        minDPI: 150,
      },
    },
    {
      id: 'back',
      label: 'Back',
      mockupImageUrl: '/templates/tshirt-back.svg',
      mockupWidth: 800,
      mockupHeight: 1000,
      printableArea: {
        shape: { type: 'rect' },
        x: 280,
        y: 200,
        width: 240,
        height: 400,
        physicalWidthInches: 12,
        physicalHeightInches: 16,
        minDPI: 150,
      },
    },
  ],
};
