'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { createProductsFromDesignPayload } from '@/lib/products/createFromDesignPayload';
import GhostLoader from '@/components/GhostLoader';

export default function SyncFromDesign({ creatorId }: { creatorId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [error, setError] = useState('');
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    (async () => {
      try {
        let raw: string | null = null;
        try {
          raw = sessionStorage.getItem('product_sync_payload');
          if (raw) sessionStorage.removeItem('product_sync_payload');
        } catch {}

        if (!raw) { setError('No design data received.'); return; }

        const payload = JSON.parse(raw);
        if (!payload.products || payload.products.length === 0) {
          setError('No products to create.'); return;
        }

        const created = await createProductsFromDesignPayload(supabase, creatorId, payload);
        if (created.length === 0) { setError('Failed to create product.'); return; }

        router.replace(`/dashboard/products/${created[0].id}?from=sync`);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong.');
      }
    })();
  }, [creatorId, router, supabase]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
        </div>
        <p className="text-red-600 font-medium mb-2">Couldn&apos;t sync your design</p>
        <p className="text-gray-500 text-sm mb-4">{error}</p>
        <button
          onClick={() => router.push('/dashboard/products')}
          className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-500 transition-colors"
        >
          Go to Products
        </button>
      </div>
    );
  }

  return <GhostLoader fullscreen size="lg" message="Syncing your design…" />;
}
