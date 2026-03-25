'use client';

import dynamic from 'next/dynamic';

const EditorCanvas = dynamic(() => import('./EditorCanvas'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-gray-200">
      <div className="text-gray-500">Loading editor...</div>
    </div>
  ),
});

export default function EditorShell() {
  return <EditorCanvas />;
}
