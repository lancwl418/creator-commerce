'use client';

interface LightboxProps {
  url: string;
  onClose: () => void;
}

export default function Lightbox({ url, onClose }: LightboxProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="relative max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute -top-10 right-0 text-white/80 hover:text-white transition-colors">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="bg-white rounded-2xl overflow-hidden shadow-2xl">
          <div className="aspect-square bg-gray-50 flex items-center justify-center">
            <img src={url} alt="Preview" className="max-w-full max-h-full object-contain p-4" />
          </div>
        </div>
      </div>
    </div>
  );
}
