'use client';

import { useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { catalogUrl, parseSort } from '@/lib/catalog-query';

export function useCatalogFilters() {
  const router = useRouter();
  const params = useSearchParams();

  const updateFilters = useCallback((updates: Record<string, string | null>) => {
    router.push(catalogUrl(new URLSearchParams(params.toString()), { ...updates, page: null }));
  }, [params, router]);

  return {
    activeCategory: params.get('category') ?? 'all',
    sort: parseSort(params.get('sort')),
    priceMin: params.get('priceMin') ?? '',
    priceMax: params.get('priceMax') ?? '',
    updateFilters,
    resetFilters: () => router.push('/products'),
  };
}
