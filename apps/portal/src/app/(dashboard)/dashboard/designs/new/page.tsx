'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function NewDesignPage() {
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
      // 1. Get creator id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: creator } = await supabase
        .from('creators')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();
      if (!creator) throw new Error('Creator not found');

      // 2. Upload file to storage
      const ext = file.name.split('.').pop();
      const filePath = `${creator.id}/artworks/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('design-assets')
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('design-assets')
        .getPublicUrl(filePath);

      // 3. Create design
      const { data: design, error: designError } = await supabase
        .from('designs')
        .insert({
          creator_id: creator.id,
          title,
          description,
          status: 'draft',
        })
        .select()
        .single();
      if (designError) throw designError;

      // 4. Create version 1
      const { data: version, error: versionError } = await supabase
        .from('design_versions')
        .insert({
          design_id: design.id,
          version_number: 1,
        })
        .select()
        .single();
      if (versionError) throw versionError;

      // 5. Create design asset
      // Get image dimensions
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

      // 6. Update design with current_version_id
      await supabase
        .from('designs')
        .update({ current_version_id: version.id })
        .eq('id', design.id);

      // 7. Create tags
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
      <h2 className="text-2xl font-bold mb-1">Upload New Design</h2>
      <p className="text-gray-500 text-sm mb-6">Upload your artwork to create a new design</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* File Upload */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors cursor-pointer"
          onClick={() => document.getElementById('file-input')?.click()}
        >
          {preview ? (
            <div className="space-y-3">
              <img src={preview} alt="Preview" className="max-h-64 mx-auto object-contain" />
              <p className="text-sm text-gray-500">{file?.name}</p>
              <p className="text-xs text-gray-400">Click or drag to replace</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-4xl text-gray-300">+</div>
              <p className="text-sm text-gray-500">Drag and drop your artwork, or click to browse</p>
              <p className="text-xs text-gray-400">PNG, JPG, SVG — recommended 300 DPI</p>
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
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Title
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            placeholder="My awesome design"
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description <span className="text-gray-400">(optional)</span>
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            placeholder="Describe your design..."
          />
        </div>

        {/* Tags */}
        <div>
          <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
            Tags <span className="text-gray-400">(comma separated)</span>
          </label>
          <input
            id="tags"
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            placeholder="abstract, floral, vintage"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !file}
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Uploading...' : 'Create Design'}
          </button>
        </div>
      </form>
    </div>
  );
}
