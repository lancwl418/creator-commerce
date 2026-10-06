'use client';

import { useEffect, useRef, useState } from 'react';
import type { ErpProduct } from '@/lib/types/catalog';
import { erpImg, getImageUrl, getPriceRange, getProductImages, getProductOptions } from '@/lib/catalog/product';
import { addProductToDesignPool } from '@/lib/catalog/design-pool';
import { useCatalogDesign } from './useCatalogDesign';

export function useCatalogDetail(product: ErpProduct) {
  const [activeImage, setActiveImage] = useState(getImageUrl(product) || '');
  const [addedToPool, setAddedToPool] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [poolError, setPoolError] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const design = useCatalogDesign();
  const options = getProductOptions(product);
  useEffect(() => () => clearTimeout(timer.current), []);

  function handleColorSelect(color: string) {
    setSelectedColor(color);
    const sku = product.prodSkuList.find(item => item[options.colorOptionKey] === color && item.skuImage);
    if (sku?.skuImage) setActiveImage(erpImg(sku.skuImage));
  }

  function handleAddToDesignPool() {
    try {
      addProductToDesignPool(product);
      setPoolError('');
      setAddedToPool(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setAddedToPool(false), 2000);
    } catch {
      setPoolError('Unable to save the design pool in this browser');
    }
  }

  return {
    ...options, activeImage, setActiveImage, addedToPool, selectedColor, selectedSize, setSelectedSize,
    handleColorSelect, handleAddToDesignPool, images: getProductImages(product), priceRange: getPriceRange(product),
    handleStartDesigning: () => design.startDesign(product), busy: design.busy, error: design.error || poolError,
  };
}
