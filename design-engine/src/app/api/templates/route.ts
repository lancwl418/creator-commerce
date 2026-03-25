import { NextResponse } from 'next/server';
import type { ProductTemplate } from '@/types/product';

/**
 * Mock API endpoint that simulates a backend returning product templates.
 * Used for testing standalone mode: /api/templates
 */

const sampleTemplates: ProductTemplate[] = [
  {
    id: 'hoodie-pullover',
    type: 'hoodie',
    name: 'Pullover Hoodie',
    description: 'Classic pullover hoodie with front print area',
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
          x: 260,
          y: 250,
          width: 280,
          height: 320,
          physicalWidthInches: 11,
          physicalHeightInches: 13,
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
          x: 250,
          y: 220,
          width: 300,
          height: 380,
          physicalWidthInches: 12,
          physicalHeightInches: 15,
          minDPI: 150,
        },
      },
    ],
  },
  {
    id: 'tote-bag',
    type: 'bag',
    name: 'Canvas Tote Bag',
    description: 'Cotton tote bag with front print area',
    defaultViewId: 'front',
    metadata: {},
    views: [
      {
        id: 'front',
        label: 'Front',
        mockupImageUrl: '/templates/tshirt-front.svg',
        mockupWidth: 600,
        mockupHeight: 700,
        printableArea: {
          shape: { type: 'rect' },
          x: 150,
          y: 150,
          width: 300,
          height: 350,
          physicalWidthInches: 10,
          physicalHeightInches: 12,
          minDPI: 150,
        },
      },
    ],
  },
  {
    id: 'poster-a3',
    type: 'poster',
    name: 'A3 Poster',
    description: 'A3 size poster print',
    defaultViewId: 'front',
    metadata: {},
    views: [
      {
        id: 'front',
        label: 'Front',
        mockupImageUrl: '/templates/tshirt-front.svg',
        mockupWidth: 600,
        mockupHeight: 850,
        printableArea: {
          shape: { type: 'rect' },
          x: 30,
          y: 30,
          width: 540,
          height: 790,
          physicalWidthInches: 11.7,
          physicalHeightInches: 16.5,
          minDPI: 200,
        },
      },
    ],
  },
];

export async function GET() {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500));
  return NextResponse.json(sampleTemplates);
}
