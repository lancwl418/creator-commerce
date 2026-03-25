'use client';

import { useState } from 'react';
import EditorPage from '@/components/editor/EditorPage';
import type { EditorConfig } from '@/types/editor-config';

const embeddedSampleTemplate = {
  id: 'custom-mug-xl',
  type: 'mug',
  name: 'XL Ceramic Mug',
  description: 'Extra large mug from external system',
  defaultViewId: 'wrap',
  metadata: {},
  views: [
    {
      id: 'wrap',
      label: 'Wrap Around',
      mockupImageUrl: '/templates/mug-wrap.svg',
      mockupWidth: 900,
      mockupHeight: 400,
      printableArea: {
        shape: { type: 'rect' as const },
        x: 120,
        y: 60,
        width: 660,
        height: 280,
        physicalWidthInches: 9.5,
        physicalHeightInches: 4,
        minDPI: 150,
      },
    },
  ],
};

type DemoMode = 'select' | 'demo' | 'embedded' | 'standalone';

const configs: Record<Exclude<DemoMode, 'select'>, EditorConfig> = {
  demo: { mode: 'demo' },
  embedded: { mode: 'embedded', template: embeddedSampleTemplate },
  standalone: { mode: 'standalone', apiEndpoint: '/api/templates' },
};

export default function DemoPage() {
  const [activeMode, setActiveMode] = useState<DemoMode>('select');

  if (activeMode !== 'select') {
    return (
      <div className="h-screen flex flex-col">
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 flex items-center gap-4 text-sm shrink-0">
          <span className="font-medium text-yellow-800">
            Mode: {activeMode}
          </span>
          <button
            onClick={() => {
              // Reset productStore before switching
              window.location.reload();
            }}
            className="text-yellow-700 underline hover:text-yellow-900"
          >
            Back to mode selection
          </button>
        </div>
        <div className="flex-1">
          <EditorPage config={configs[activeMode]} />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-lg w-full space-y-6 p-8">
        <h1 className="text-2xl font-bold text-gray-900">Editor Mode Demo</h1>
        <p className="text-gray-500 text-sm">
          Select a mode to test the editor with different configurations.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => setActiveMode('demo')}
            className="w-full text-left p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all"
          >
            <div className="font-medium text-gray-900">Demo Mode</div>
            <div className="text-sm text-gray-500 mt-1">
              Built-in templates (T-Shirt, Mug, Phone Case). Current default behavior.
            </div>
          </button>

          <button
            onClick={() => setActiveMode('embedded')}
            className="w-full text-left p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all"
          >
            <div className="font-medium text-gray-900">Embedded Mode</div>
            <div className="text-sm text-gray-500 mt-1">
              Single product passed via props (XL Ceramic Mug). No product selector shown.
              Simulates Shopify integration.
            </div>
          </button>

          <button
            onClick={() => setActiveMode('standalone')}
            className="w-full text-left p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all"
          >
            <div className="font-medium text-gray-900">Standalone Mode</div>
            <div className="text-sm text-gray-500 mt-1">
              Templates loaded from API (/api/templates). Shows loading state, then product
              selector with Hoodie, Tote Bag, A3 Poster.
            </div>
          </button>
        </div>

        <div className="pt-4 border-t border-gray-200">
          <h2 className="text-sm font-medium text-gray-700 mb-2">iframe Embed URLs</h2>
          <div className="space-y-2 text-xs text-gray-500 font-mono">
            <div>/embed?api=/api/templates</div>
            <div>/embed?template={'{encoded JSON}'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
