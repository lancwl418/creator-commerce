'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { duplicateProduct, deleteProduct } from '@/lib/products/mutations';

export function useProductActions(productId: string) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function duplicate() {
    setBusy(true);
    setError('');
    try {
      const id = await duplicateProduct(productId);
      router.push(`/dashboard/products/${id}`);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to duplicate product');
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError('');
    try {
      await deleteProduct(productId);
      router.refresh();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete product');
      return false;
    } finally {
      setBusy(false);
    }
  }

  return { busy, error, duplicate, remove, clearError: () => setError('') };
}
