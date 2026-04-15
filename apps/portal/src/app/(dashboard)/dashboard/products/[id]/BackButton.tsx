'use client';

import { useRouter } from 'next/navigation';

export function BackButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.back()}
      className="hover:text-primary-600 transition-colors"
    >
      ← Back
    </button>
  );
}
