'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ChangeEvent, DragEvent, FormEvent } from 'react';
import { createDesign } from '@/lib/designs/mutations';

function getImageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error('Unable to read this image'));
    image.src = url;
  });
}

export function useDesignUpload(creatorId: string) {
  const router = useRouter();
  const reader = useRef<FileReader | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => () => reader.current?.abort(), []);

  function selectFile(selected?: File) {
    if (!selected) return;
    if (!selected.type.startsWith('image/')) { setError('Please upload an image file (PNG, JPG, SVG, etc.)'); return; }
    reader.current?.abort();
    const nextReader = new FileReader();
    reader.current = nextReader;
    setFile(selected); setPreview(null); setError('');
    nextReader.onload = () => { if (typeof nextReader.result === 'string') setPreview(nextReader.result); };
    nextReader.onerror = () => setError('Unable to read this file');
    nextReader.readAsDataURL(selected);
    if (!title) setTitle(selected.name.replace(/\.[^/.]+$/, ''));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (loading) return;
    if (!file || !preview) { setError('Please select an artwork file and wait for its preview'); return; }
    setLoading(true); setError('');
    try {
      const dimensions = await getImageDimensions(preview);
      const id = await createDesign(creatorId, { title, description, tags, file, dimensions });
      router.push(`/dashboard/designs/${id}`);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to upload artwork'); }
    finally { setLoading(false); }
  }

  return {
    title, setTitle, description, setDescription, tags, setTags, file, preview, loading, error, handleSubmit,
    handleFileChange: (event: ChangeEvent<HTMLInputElement>) => selectFile(event.target.files?.[0]),
    handleDrop: (event: DragEvent) => { event.preventDefault(); selectFile(event.dataTransfer.files[0]); }
  };
}
