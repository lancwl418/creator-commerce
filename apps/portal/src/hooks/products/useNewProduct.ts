'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { DesignForProduct, ExternalProduct, ProductSourceFilter } from '@/lib/types/product-creation';
import { fetchExternalProducts } from '@/lib/api/external-products';
import { buildDesignEditorUrl } from '@/lib/design-engine';
import { buildExternalProductMeta, getDesignArtworkUrl } from '@/lib/products/externalProducts';

export function useNewProduct(designs: DesignForProduct[]) {
  const searchParams = useSearchParams();
  const designId = searchParams.get('design_id');
  const preselected = designs.find(design => design.id === designId) ?? null;
  const [step, setStep] = useState<'design' | 'template'>(preselected ? 'template' : 'design');
  const [selectedDesign, setSelectedDesign] = useState<DesignForProduct | null>(preselected);
  const [products, setProducts] = useState<ExternalProduct[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<ExternalProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<ProductSourceFilter>('all');

  useEffect(() => {
    const controller = new AbortController();
    fetchExternalProducts(controller.signal).then(result => {
      if (controller.signal.aborted) return;
      setProducts(result.products);
      setError(result.warnings.join('; '));
      setProductsLoading(false);
    });
    return () => controller.abort();
  }, []);

  function toggleProduct(product: ExternalProduct) {
    setSelectedProducts(previous => previous.some(item => item.id === product.id)
      ? previous.filter(item => item.id !== product.id) : [...previous, product]);
  }

  function handleOpenEditor() {
    if (!selectedDesign || !selectedProducts.length) return;
    try {
      window.location.assign(buildDesignEditorUrl({
        design_id: selectedDesign.id, artwork_url: getDesignArtworkUrl(selectedDesign) || '',
        templates: selectedProducts.map(product => product.id).join(','),
        products_meta: JSON.stringify(buildExternalProductMeta(selectedProducts)),
        title_prefix: selectedDesign.title, callback_url: `${window.location.origin}/api/products/import-redirect`,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open editor');
    }
  }

  return {
    step, setStep, selectedDesign, setSelectedDesign, products, selectedProducts, productsLoading,
    error, activeTab, setActiveTab, toggleProduct, handleOpenEditor
  };
}
