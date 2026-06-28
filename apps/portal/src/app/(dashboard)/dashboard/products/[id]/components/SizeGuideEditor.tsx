'use client';

import type { SizeGuide } from '@/lib/types/product';

interface SizeGuideEditorProps {
  value: SizeGuide | null;
  onChange: (value: SizeGuide | null) => void;
}

const DEFAULT_GUIDE: SizeGuide = {
  headers: ['Size', 'Chest (in)', 'Length (in)'],
  rows: [
    ['S', '', ''],
    ['M', '', ''],
    ['L', '', ''],
  ],
};

export default function SizeGuideEditor({ value, onChange }: SizeGuideEditorProps) {
  if (!value) {
    return (
      <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Size guide</h3>
            <p className="text-xs text-gray-400 mt-0.5">Add a sizing table so buyers pick the right fit.</p>
          </div>
          <button
            type="button"
            onClick={() => onChange(DEFAULT_GUIDE)}
            className="rounded-lg border border-border px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Add size guide
          </button>
        </div>
      </div>
    );
  }

  const { headers, rows } = value;

  const setHeader = (c: number, v: string) => {
    const next = headers.slice();
    next[c] = v;
    onChange({ headers: next, rows });
  };

  const setCell = (r: number, c: number, v: string) => {
    const next = rows.map((row) => row.slice());
    next[r][c] = v;
    onChange({ headers, rows: next });
  };

  const addRow = () =>
    onChange({ headers, rows: [...rows, headers.map(() => '')] });

  const removeRow = (r: number) =>
    onChange({ headers, rows: rows.filter((_, i) => i !== r) });

  const addColumn = () =>
    onChange({
      headers: [...headers, 'Measurement'],
      rows: rows.map((row) => [...row, '']),
    });

  const removeColumn = (c: number) =>
    onChange({
      headers: headers.filter((_, i) => i !== c),
      rows: rows.map((row) => row.filter((_, i) => i !== c)),
    });

  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Size guide</h3>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-xs font-semibold text-red-600 hover:text-red-700"
        >
          Remove
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {headers.map((h, c) => (
                <th key={c} className="p-1 align-bottom">
                  <div className="flex flex-col gap-1">
                    <input
                      value={h}
                      onChange={(e) => setHeader(c, e.target.value)}
                      className="w-full rounded-md border border-border bg-surface-secondary px-2 py-1 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
                    />
                    {headers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeColumn(c)}
                        title="Remove column"
                        className="text-[10px] text-gray-400 hover:text-red-500"
                      >
                        remove col
                      </button>
                    )}
                  </div>
                </th>
              ))}
              <th className="p-1 align-bottom">
                <button
                  type="button"
                  onClick={addColumn}
                  title="Add column"
                  className="rounded-md border border-dashed border-border px-2 py-1 text-xs text-gray-500 hover:bg-gray-50"
                >
                  + Col
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) => (
                  <td key={c} className="p-1">
                    <input
                      value={cell}
                      onChange={(e) => setCell(r, c, e.target.value)}
                      placeholder={c === 0 ? 'Size' : '—'}
                      className="w-full rounded-md border border-border bg-white px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
                    />
                  </td>
                ))}
                <td className="p-1 text-center">
                  <button
                    type="button"
                    onClick={() => removeRow(r)}
                    title="Remove row"
                    className="text-gray-300 hover:text-red-500"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={addRow}
        className="rounded-lg border border-dashed border-border px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
      >
        + Add row
      </button>
    </div>
  );
}
