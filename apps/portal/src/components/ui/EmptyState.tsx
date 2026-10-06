import type { ReactNode } from 'react';

export default function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-gray-300 bg-white p-12 text-center">
      {children}
    </div>
  );
}
