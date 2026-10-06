'use client';

import { useEffect, useState } from 'react';
import { fetchErpProducts } from '@/lib/api/erp-products';
import { filterCatalogProducts, getCategory } from '@/lib/catalog/product';
import type { CatalogState, ErpProduct } from '@/lib/types/catalog';
import { useCatalogDesign } from './useCatalogDesign';

export function useCatalog() {
  const [request, setRequest] = useState({ page: 1, revision: 0 });
  const [state, setState] = useState<CatalogState>({ records: [], total: 0, current: 1, pages: 1, loading: true, error: '' });
  const [selected, setSelected] = useState<Map<string, ErpProduct>>(new Map());
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const design = useCatalogDesign();

  useEffect(() => {
    const controller = new AbortController();
    setState(previous => ({ ...previous, loading: true, error: '', current: request.page }));
    fetchErpProducts(request.page, 40, controller.signal).then(page => {
      if (!controller.signal.aborted) setState({ ...page, loading: false, error: '' });
    }).catch(error => {
      if (!controller.signal.aborted) setState(previous => ({ ...previous, loading: false, error: error instanceof Error ? error.message : 'Failed to load products' }));
    });
    return () => controller.abort();
  }, [request]);

  const filteredProducts = filterCatalogProducts(state.records, search, activeCategory);
  const categories = ['all', ...new Set(state.records.map(getCategory).filter(Boolean))];

  function toggleSelect(id: string) {
    const product = state.records.find(item => item.id === id);
    if (!product) return;
    setSelected(previous => {
      const next = new Map(previous);
      if (next.has(id)) next.delete(id); else next.set(id, product);
      return next;
    });
  }

  function selectAll() {
    setSelected(previous => {
      const next = new Map(previous);
      const allSelected = filteredProducts.every(product => previous.has(product.id));
      for (const product of filteredProducts) {
        if (allSelected) next.delete(product.id); else next.set(product.id, product);
      }
      return next;
    });
  }

  return {
    state: { ...state, error: state.error || design.error }, search, setSearch, activeCategory, setActiveCategory,
    categories, filteredProducts, selectedIds: new Set(selected.keys()), selectedCount: selected.size, toggleSelect, selectAll,
    clearSelection: () => setSelected(new Map()),
    fetchProducts: (page: number) => setRequest(previous => ({ page, revision: previous.revision + 1 })),
    handleDesignSingle: design.startDesign, handleDesignSelected: () => design.startSelected([...selected.values()]), busy: design.busy,
  };
}
