'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Loader2 } from 'lucide-react';

interface MockupUploaderProps {
  embedKey: string;
  onUploaded: (url: string, width: number, height: number) => void;
  label?: string;
}

export default function MockupUploader({ embedKey, onUploaded, label = 'Upload mockup image' }: MockupUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      // Read dimensions client-side first.
      const dims = await readImageDimensions(file);
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`/api/embed/upload-mockup?key=${encodeURIComponent(embedKey)}`, {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? `upload failed (${res.status})`);
      onUploaded(data.url, dims.width, dims.height);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'upload failed');
    } finally {
      setUploading(false);
    }
  }, [embedKey, onUploaded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.svg'] },
    maxFiles: 1,
    disabled: uploading,
  });

  return (
    <div className="flex flex-col items-center justify-center w-full h-full p-8">
      <div
        {...getRootProps()}
        className={`flex flex-col items-center justify-center w-full max-w-md h-64 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
          isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
        } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <>
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
            <p className="text-sm text-gray-600">Uploading…</p>
          </>
        ) : (
          <>
            <Upload className="w-8 h-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-600 font-medium">{label}</p>
            <p className="text-xs text-gray-400 mt-1">PNG / JPG / WebP / SVG · max 5 MB</p>
          </>
        )}
      </div>
      {error && <p className="text-xs text-red-500 mt-3">{error}</p>}
    </div>
  );
}

function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('could not read image dimensions'));
    };
    img.src = url;
  });
}
