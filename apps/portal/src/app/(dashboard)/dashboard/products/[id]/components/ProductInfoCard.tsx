'use client';

import Link from 'next/link';
import { PRODUCT_STATUS_COLORS } from '@/lib/constants';

interface ProductInfoCardProps {
  title: string;
  description: string;
  status: string;
  designId: string;
  designTitle: string | null;
  designArtworkUrls: string[];
  createdAt: string;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onImageClick: (url: string) => void;
}

export default function ProductInfoCard({
  title, description, status, designId, designTitle,
  designArtworkUrls, createdAt, onTitleChange, onDescriptionChange, onImageClick,
}: ProductInfoCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-sm space-y-3">
      <div>
        <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Product Name</label>
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
        />
      </div>
      <div>
        <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all resize-none"
          placeholder="Product description..."
        />
      </div>
      <div className="space-y-2 text-sm pt-1">
        <div className="flex justify-between">
          <span className="text-gray-500">Status</span>
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${PRODUCT_STATUS_COLORS[status] || PRODUCT_STATUS_COLORS.draft}`}>
            {status}
          </span>
        </div>
        <div className="flex justify-between items-start">
          <span className="text-gray-500">Design</span>
          <div className="flex items-center gap-2">
            {designArtworkUrls.length > 0 && (
              <div className="flex gap-1.5">
                {designArtworkUrls.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => onImageClick(url)}
                    className="w-9 h-9 rounded-md bg-surface-secondary overflow-hidden border border-border hover:border-primary-400 hover:shadow-sm transition-all"
                  >
                    <img src={url} alt="" className="w-full h-full object-contain" />
                  </button>
                ))}
              </div>
            )}
            {designTitle && (
              <Link href={`/dashboard/designs/${designId}`} className="text-primary-600 hover:text-primary-700 font-medium">
                {designTitle}
              </Link>
            )}
          </div>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Created</span>
          <span className="text-gray-900">{new Date(createdAt).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}
