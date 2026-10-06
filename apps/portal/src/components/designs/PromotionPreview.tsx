import { useState } from 'react';

type PreviewSize = 3 | 10;
type PreviewColor = 'white' | 'black';

const BLANKS = [
  { key: 'tshirt', label: 'T-Shirt', center: { x: 50, y: 40 }, maxWidthPct: 36, maxInches: 12 },
  { key: 'hoodie', label: 'Hoodie', center: { x: 50, y: 38 }, maxWidthPct: 34, maxInches: 12 },
  { key: 'tote', label: 'Tote Bag', center: { x: 50, y: 52 }, maxWidthPct: 50, maxInches: 12 },
  { key: 'cap', label: 'Cap', center: { x: 50, y: 50 }, maxWidthPct: 30, maxInches: 4.5 },
] as const;

interface PromotionPreviewProps { artworkUrl: string | null; onClose: () => void; onContinue: () => void; }

export default function PromotionPreview({ artworkUrl, onClose, onContinue }: PromotionPreviewProps) {
  const [previewSize, setPreviewSize] = useState<PreviewSize>(10);
  const [previewColor, setPreviewColor] = useState<PreviewColor>('white');
  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-1">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Mockup Preview</h3>
          <p className="text-xs text-gray-500 mt-1">
            See how your design looks on different blanks at print sizes 3&Prime; and 10&Prime;.
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg bg-gray-100 p-0.5">
          {[3, 10].map((s) => (
            <button
              key={s}
              onClick={() => setPreviewSize(s as PreviewSize)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${previewSize === s
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              {s}&Prime; × {s}&Prime;
            </button>
          ))}
        </div>

        <div className="inline-flex rounded-lg bg-gray-100 p-0.5">
          {(['white', 'black'] as PreviewColor[]).map((c) => (
            <button
              key={c}
              onClick={() => setPreviewColor(c)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-all ${previewColor === c
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              <span
                className={`inline-block w-3 h-3 rounded-full border ${c === 'white' ? 'bg-white border-gray-300' : 'bg-gray-900 border-gray-700'
                  }`}
              />
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Mockup grid */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        {BLANKS.map((blank) => {
          const widthPct = Math.min(
            blank.maxWidthPct * (previewSize / blank.maxInches),
            blank.maxWidthPct
          );
          return (
            <div
              key={blank.key}
              className="relative rounded-xl border border-gray-200 bg-gray-50 overflow-hidden"
            >
              <div className="relative">
                <img
                  src={`/product/${blank.key}-${previewColor}.png`}
                  alt={blank.label}
                  className="block w-full h-auto"
                />
                {artworkUrl && (
                  <img
                    src={artworkUrl}
                    alt="design"
                    draggable={false}
                    style={{
                      position: 'absolute',
                      left: `${blank.center.x}%`,
                      top: `${blank.center.y}%`,
                      width: `${widthPct}%`,
                      transform: 'translate(-50%, -50%)',
                      pointerEvents: 'none',
                    }}
                  />
                )}
              </div>
              <div className="absolute top-2 left-2 rounded-md bg-white/90 backdrop-blur px-2 py-0.5 text-[11px] font-semibold text-gray-700 shadow-sm">
                {blank.label}
              </div>
              <div className="absolute bottom-2 right-2 rounded-md bg-white/90 backdrop-blur px-2 py-0.5 text-[10px] text-gray-500 shadow-sm">
                {previewSize}&Prime; print
              </div>
            </div>
          );
        })}
      </div>

      {!artworkUrl && (
        <p className="mt-3 text-xs text-amber-600">
          No artwork found for this design — preview will show blanks only.
        </p>
      )}

      <p className="mt-4 text-[11px] text-gray-400 leading-relaxed">
        Preview is for reference only. Final placement and sizing will be confirmed during product setup.
      </p>

      <div className="flex gap-3 mt-5">
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onContinue}
          className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold hover:from-amber-600 hover:to-orange-600 transition-all"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
