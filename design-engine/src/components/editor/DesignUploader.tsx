'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload } from 'lucide-react';
import { useDesignStore } from '@/stores/designStore';
import { useProductStore } from '@/stores/productStore';
import { generateId } from '@/lib/id';
import type { DesignLayer, ImageLayerData } from '@/types/design';

interface DesignUploaderProps {
  onLayerAdded?: (layer: DesignLayer) => void;
}

export default function DesignUploader({ onLayerAdded }: DesignUploaderProps) {
  const addLayer = useDesignStore((s) => s.addLayer);
  const activeViewId = useProductStore((s) => s.activeViewId);
  const selectedTemplate = useProductStore((s) => s.selectedTemplate);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (!selectedTemplate) return;

      const view = selectedTemplate.views.find((v) => v.id === activeViewId);
      if (!view) return;

      for (const file of acceptedFiles) {
        const reader = new FileReader();
        reader.onload = () => {
          const src = reader.result as string;
          const img = new Image();
          img.onload = () => {
            // Calculate initial size to fit within printable area
            const maxW = view.printableArea.width * 0.8;
            const maxH = view.printableArea.height * 0.8;
            const ratio = Math.min(maxW / img.width, maxH / img.height, 1);
            const width = img.width * ratio;
            const height = img.height * ratio;

            // Center in printable area
            const x = view.printableArea.x + (view.printableArea.width - width) / 2;
            const y = view.printableArea.y + (view.printableArea.height - height) / 2;

            const layer: DesignLayer = {
              id: generateId(),
              type: 'image',
              name: file.name.replace(/\.[^/.]+$/, ''),
              visible: true,
              locked: false,
              opacity: 1,
              transform: {
                x,
                y,
                width,
                height,
                rotation: 0,
                scaleX: 1,
                scaleY: 1,
                flipX: false,
                flipY: false,
              },
              data: {
                type: 'image',
                src,
                originalWidth: img.width,
                originalHeight: img.height,
                filters: [],
              } satisfies ImageLayerData,
            };

            addLayer(activeViewId, layer);
            onLayerAdded?.(layer);
          };
          img.src = src;
        };
        reader.readAsDataURL(file);
      }
    },
    [activeViewId, selectedTemplate, addLayer, onLayerAdded]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/svg+xml': ['.svg'],
      'image/webp': ['.webp'],
    },
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
        isDragActive
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-300 hover:border-gray-400'
      }`}
    >
      <input {...getInputProps()} />
      <Upload className="w-6 h-6 mx-auto mb-2 text-gray-400" />
      <p className="text-sm text-gray-600">
        {isDragActive ? 'Drop image here' : 'Upload image'}
      </p>
      <p className="text-xs text-gray-400 mt-1">PNG, JPG, SVG, WebP</p>
    </div>
  );
}
