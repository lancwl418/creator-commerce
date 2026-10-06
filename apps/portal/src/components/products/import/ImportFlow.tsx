'use client';

import { useDesignImport } from '@/hooks/products/useDesignImport';
import GhostLoader from '@/components/GhostLoader';
import FlowError from '@/components/products/FlowError';
import ImportedProducts from './ImportedProducts';

export default function ImportFlow({ creatorId }: { creatorId: string }) {
  const state = useDesignImport(creatorId, 'product_import_payload', true);
  if (state.status === 'saving') return <GhostLoader fullscreen size="lg" />;
  if (state.status === 'error') return <FlowError title="Failed to save products" error={state.error} />;
  return <ImportedProducts products={state.products} />;
}
