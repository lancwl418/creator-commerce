'use client';

import { useEffect, useRef } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

const BUTTONS: { cmd: string; label: string; title: string; className?: string }[] = [
  { cmd: 'bold', label: 'B', title: 'Bold', className: 'font-bold' },
  { cmd: 'italic', label: 'I', title: 'Italic', className: 'italic' },
  { cmd: 'underline', label: 'U', title: 'Underline', className: 'underline' },
  { cmd: 'insertUnorderedList', label: '•', title: 'Bullet list' },
  { cmd: 'insertOrderedList', label: '1.', title: 'Numbered list' },
];

/**
 * Lightweight rich-text editor backed by a contentEditable div and
 * document.execCommand — no external dependency. Emits HTML via onChange.
 */
export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Sync external value in without moving the caret while the user types:
  // after onChange the parent value already equals the DOM, so this is a no-op.
  useEffect(() => {
    const el = ref.current;
    if (el && el.innerHTML !== value) el.innerHTML = value || '';
  }, [value]);

  function exec(cmd: string, arg?: string) {
    document.execCommand(cmd, false, arg);
    ref.current?.focus();
    if (ref.current) onChange(ref.current.innerHTML);
  }

  function addLink() {
    const url = window.prompt('Link URL');
    if (url) exec('createLink', url);
  }

  return (
    <div className="rounded-lg border border-border bg-white focus-within:ring-2 focus-within:ring-primary-500/30 focus-within:border-primary-500 transition-all">
      <div className="flex items-center gap-0.5 border-b border-border-light px-1.5 py-1">
        {BUTTONS.map((b) => (
          <button
            key={b.cmd}
            type="button"
            title={b.title}
            onMouseDown={(e) => { e.preventDefault(); exec(b.cmd); }}
            className={`w-7 h-7 rounded text-xs text-gray-600 hover:bg-gray-100 transition-colors ${b.className ?? ''}`}
          >
            {b.label}
          </button>
        ))}
        <button
          type="button"
          title="Link"
          onMouseDown={(e) => { e.preventDefault(); addLink(); }}
          className="w-7 h-7 rounded text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <svg className="w-3.5 h-3.5 mx-auto" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
          </svg>
        </button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
        data-placeholder={placeholder}
        className="min-h-[90px] px-3 py-2 text-sm text-gray-600 focus:outline-none [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-primary-600 [&_a]:underline empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400"
      />
    </div>
  );
}
