'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDesignImport } from '@/hooks/products/useDesignImport';
import FlowError from '@/components/products/FlowError';
import GhostLoader from '@/components/GhostLoader';

export default function SyncFromDesign({ creatorId }: { creatorId: string }) {
  const router = useRouter();
  const state = useDesignImport(creatorId, 'product_sync_payload');
  useEffect(() => {
    if (state.status === 'success') router.replace(`/dashboard/products/${state.products[0].id}?from=sync`);
  }, [state, router]);
  if (state.status === 'error') return <FlowError title="Couldn't sync your design" error={state.error} />;
  return <GhostLoader fullscreen size="lg" message="Syncing your design…" />;
}
