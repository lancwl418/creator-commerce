'use client';

import { useState } from 'react';

interface TagsEditorProps {
  tags: string[];
  onChange: (tags: string[]) => void;
}

export default function TagsEditor({ tags, onChange }: TagsEditorProps) {
  const [input, setInput] = useState('');

  function addTag() {
    const t = input.trim().replace(/,$/, '').trim();
    if (t && !tags.includes(t)) onChange([...tags, t]);
    setInput('');
  }

  function removeTag(t: string) {
    onChange(tags.filter((x) => x !== t));
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-sm space-y-3">
      <h3 className="text-sm font-semibold text-gray-900">Tags</h3>

      <div className="flex flex-wrap gap-1.5">
        {tags.length === 0 && <span className="text-xs text-gray-400">No tags yet</span>}
        {tags.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700"
          >
            {t}
            <button
              type="button"
              onClick={() => removeTag(t)}
              title="Remove tag"
              className="text-gray-400 hover:text-red-500"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        ))}
      </div>

      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); }
        }}
        placeholder="Add a tag and press Enter"
        className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
      />
    </div>
  );
}
