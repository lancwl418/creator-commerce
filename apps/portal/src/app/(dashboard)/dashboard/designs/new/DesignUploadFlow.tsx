'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface DesignUploadFlowProps {
  creatorId: string;
}

export default function DesignUploadFlow({ creatorId }: DesignUploadFlowProps) {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!selected.type.startsWith('image/')) {
      setError('Please upload an image file (PNG, JPG, SVG, etc.)');
      return;
    }

    setFile(selected);
    setError('');

    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(selected);

    if (!title) {
      setTitle(selected.name.replace(/\.[^/.]+$/, ''));
    }
  }, [title]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped && dropped.type.startsWith('image/')) {
      setFile(dropped);
      setError('');
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target?.result as string);
      reader.readAsDataURL(dropped);
      if (!title) {
        setTitle(dropped.name.replace(/\.[^/.]+$/, ''));
      }
    }
  }, [title]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError('Please select an artwork file');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const ext = file.name.split('.').pop();
      const filePath = `${creatorId}/artworks/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('design-assets')
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('design-assets')
        .getPublicUrl(filePath);

      const { data: design, error: designError } = await supabase
        .from('designs')
        .insert({
          creator_id: creatorId,
          title,
          description,
          status: 'draft',
        })
        .select()
        .single();
      if (designError) throw designError;

      const { data: version, error: versionError } = await supabase
        .from('design_versions')
        .insert({
          design_id: design.id,
          version_number: 1,
        })
        .select()
        .single();
      if (versionError) throw versionError;

      const img = new Image();
      const dimensions = await new Promise<{ width: number; height: number }>((resolve) => {
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.src = preview!;
      });

      const { error: assetError } = await supabase
        .from('design_assets')
        .insert({
          design_version_id: version.id,
          asset_type: 'artwork',
          file_url: urlData.publicUrl,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          width_px: dimensions.width,
          height_px: dimensions.height,
        });
      if (assetError) throw assetError;

      await supabase
        .from('designs')
        .update({ current_version_id: version.id })
        .eq('id', design.id);

      if (tags.trim()) {
        const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);
        if (tagList.length > 0) {
          await supabase
            .from('design_tags')
            .insert(tagList.map(tag => ({ design_id: design.id, tag })));
        }
      }

      router.push(`/dashboard/designs/${design.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold text-gray-900 mb-1">Upload New Design</h2>
      <p className="text-gray-500 text-sm mb-8">Upload your artwork to create a new design</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* File Upload */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center hover:border-primary-400 hover:bg-primary-50/30 transition-all cursor-pointer bg-white"
          onClick={() => document.getElementById('file-input')?.click()}
        >
          {preview ? (
            <div className="space-y-3">
              <img src={preview} alt="Preview" className="max-h-64 mx-auto object-contain rounded-lg" />
              <p className="text-sm text-gray-600 font-medium">{file?.name}</p>
              <p className="text-xs text-gray-400">Click or drag to replace</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-primary-50 flex items-center justify-center mx-auto">
                <svg className="w-7 h-7 text-primary-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                </svg>
              </div>
              <p className="text-sm text-gray-600 font-medium">Drag and drop your artwork, or click to browse</p>
              <p className="text-xs text-gray-400">PNG, JPG, SVG -- recommended 300 DPI</p>
            </div>
          )}
          <input
            id="file-input"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-semibold text-gray-700 mb-1.5">
            Title
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
            placeholder="My awesome design"
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-1.5">
            Description <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all resize-none"
            placeholder="Describe your design..."
          />
        </div>

        {/* Tags */}
        <div>
          <label htmlFor="tags" className="block text-sm font-semibold text-gray-700 mb-1.5">
            Tags <span className="text-gray-400 font-normal">(comma separated)</span>
          </label>
          <input
            id="tags"
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
            placeholder="abstract, floral, vintage"
          />
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !file}
            className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-primary-600/25"
          >
            {loading ? 'Uploading...' : 'Create Design'}
          </button>
        </div>
      </form>
    </div>
  );
}
