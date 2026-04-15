'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

const DESIGN_ENGINE_URL = process.env.NEXT_PUBLIC_DESIGN_ENGINE_URL || 'http://localhost:3001';

interface ErpProductSku {
  id: string;
  sku: string;
  price: number;
  compareAtPrice: number | null;
  option1: string;
  option2: string;
  option3: string;
  skuImage: string;
  inQty: number;
}

interface ErpProductImage {
  id: string;
  picSrc: string;
  isMain: number;
  position: number;
  altText: string;
}

interface ErpProduct {
  id: string;
  itemCnName: string;
  itemEnName: string;
  title: string;
  description: string;
  vendor: string;
  productType: string;
  category?: string;
  categoryName?: string;
  status: number;
  tags: string;
  itemNo: string;
  mainPic: string;
  prodSkuList: ErpProductSku[];
  prodImageList: ErpProductImage[];
}

function getCategory(p: ErpProduct): string {
  return p.category || p.categoryName || p.productType || '';
}

function erpImg(path: string): string {
  if (!path) return '';
  return `/api/erp/image?path=${encodeURIComponent(path)}`;
}

export default function CatalogDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<ErpProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeImage, setActiveImage] = useState<string>('');
  const [addedToPool, setAddedToPool] = useState(false);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  async function fetchProduct() {
    setLoading(true);
    setError('');
    try {
      // ERP doesn't have a single-product endpoint yet, fetch list and find by id
      const res = await fetch('/api/erp/products?pageNo=1&pageSize=100');
      if (!res.ok) throw new Error(`Failed to fetch (${res.status})`);
      const data = await res.json();

      const result = data.result ?? data.data ?? data;
      const records: ErpProduct[] = result.records ?? result.list ?? [];
      const found = records.find((p) => p.id === id);

      if (!found) {
        setError('Product not found');
        setLoading(false);
        return;
      }

      setProduct(found);
      setActiveImage(
        found.mainPic
          ? erpImg(found.mainPic)
          : found.prodImageList?.[0]?.picSrc
            ? erpImg(found.prodImageList[0].picSrc)
            : ''
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load product');
    } finally {
      setLoading(false);
    }
  }

  function handleAddToDesignPool() {
    if (!product) return;
    // Store in localStorage for cross-page persistence
    const pool: { id: string; name: string; thumbnail: string | null }[] = JSON.parse(
      localStorage.getItem('design_pool') || '[]'
    );
    if (!pool.find((p) => p.id === product.id)) {
      pool.push({
        id: product.id,
        name: product.itemEnName || product.title || product.itemCnName,
        thumbnail: product.mainPic ? erpImg(product.mainPic) : null,
      });
      localStorage.setItem('design_pool', JSON.stringify(pool));
    }
    setAddedToPool(true);
    setTimeout(() => setAddedToPool(false), 2000);
  }

  function handleStartDesigning() {
    if (!product) return;

    const templateIds = `erp-${product.id}`;
    const productsMeta = encodeURIComponent(
      JSON.stringify([
        {
          id: `erp-${product.id}`,
          name: product.itemEnName || product.title || product.itemCnName,
          base_cost: product.prodSkuList?.[0]?.price ?? 0,
          source: 'erp',
          thumbnail: product.mainPic ? erpImg(product.mainPic) : null,
        },
      ])
    );
    const callbackUrl = `${window.location.origin}/dashboard/products/import`;

    window.location.href =
      `${DESIGN_ENGINE_URL}/embed` +
      `?templates=${encodeURIComponent(templateIds)}` +
      `&products_meta=${productsMeta}` +
      `&callback_url=${encodeURIComponent(callbackUrl)}`;
  }

  // Get all product images sorted
  const images: string[] = product
    ? [
        ...(product.mainPic ? [erpImg(product.mainPic)] : []),
        ...(product.prodImageList ?? [])
          .sort((a, b) => a.position - b.position)
          .map((img) => erpImg(img.picSrc))
          .filter((url) => url !== erpImg(product.mainPic)),
      ]
    : [];

  // Extract unique option values for display
  const options = product?.prodSkuList?.reduce(
    (acc, sku) => {
      if (sku.option1 && !acc.option1.includes(sku.option1)) acc.option1.push(sku.option1);
      if (sku.option2 && !acc.option2.includes(sku.option2)) acc.option2.push(sku.option2);
      if (sku.option3 && !acc.option3.includes(sku.option3)) acc.option3.push(sku.option3);
      return acc;
    },
    { option1: [] as string[], option2: [] as string[], option3: [] as string[] }
  );

  const priceRange = product?.prodSkuList?.length
    ? {
        min: Math.min(...product.prodSkuList.map((s) => s.price)),
        max: Math.max(...product.prodSkuList.map((s) => s.price)),
      }
    : null;

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 w-32 bg-gray-200 rounded mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="aspect-square bg-gray-100 rounded-2xl" />
          <div className="space-y-4">
            <div className="h-6 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-100 rounded w-1/2" />
            <div className="h-20 bg-gray-100 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div>
        <Link href="/dashboard/catalog" className="text-sm text-gray-500 hover:text-primary-600 mb-4 inline-block">
          ← Back to Catalog
        </Link>
        <div className="rounded-2xl border-2 border-dashed border-gray-300 p-12 text-center bg-white">
          <p className="text-gray-500">{error || 'Product not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/dashboard/catalog" className="hover:text-primary-600 transition-colors">
          Product Catalog
        </Link>
        <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
        <span className="text-gray-900 font-medium truncate max-w-xs">
          {product.itemEnName || product.title || product.itemCnName}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Images */}
        <div>
          {/* Main image */}
          <div className="rounded-2xl border border-border bg-white overflow-hidden shadow-sm">
            <div className="aspect-square bg-surface-secondary flex items-center justify-center">
              {activeImage ? (
                <img
                  src={activeImage}
                  alt={product.itemEnName || product.title}
                  className="max-w-full max-h-full object-contain p-8"
                />
              ) : (
                <svg className="w-16 h-16 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                </svg>
              )}
            </div>
          </div>

          {/* Thumbnail strip */}
          {images.length > 1 && (
            <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
              {images.map((url, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(url)}
                  className={`w-16 h-16 rounded-lg border-2 bg-white overflow-hidden shrink-0 transition-all ${
                    activeImage === url
                      ? 'border-primary-500 shadow-sm'
                      : 'border-border hover:border-gray-300'
                  }`}
                >
                  <img src={url} alt="" className="w-full h-full object-contain p-1" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Details + Actions */}
        <div className="space-y-5">
          {/* Title & meta */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {product.itemEnName || product.title || product.itemCnName}
            </h1>
            {product.itemCnName && product.itemEnName && (
              <p className="text-sm text-gray-400 mt-1">{product.itemCnName}</p>
            )}
            <div className="flex items-center gap-3 mt-3">
              <span className="text-xs text-gray-400 font-mono">{product.itemNo}</span>
              {getCategory(product) && (
                <span className="inline-block rounded-md bg-surface-secondary px-2.5 py-0.5 text-[11px] text-gray-500 font-medium">
                  {getCategory(product)}
                </span>
              )}
              {product.vendor && (
                <span className="text-xs text-gray-400">{product.vendor}</span>
              )}
            </div>
          </div>

          {/* Price */}
          {priceRange && (
            <div className="rounded-xl bg-surface-secondary p-4">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Base Cost</p>
              <p className="text-xl font-bold text-gray-900">
                {priceRange.min === priceRange.max
                  ? `$${priceRange.min.toFixed(2)}`
                  : `$${priceRange.min.toFixed(2)} – $${priceRange.max.toFixed(2)}`}
              </p>
              <p className="text-[11px] text-gray-400 mt-1">
                {product.prodSkuList.length} variant{product.prodSkuList.length > 1 ? 's' : ''} available
              </p>
            </div>
          )}

          {/* Description */}
          {product.description && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Description</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{product.description}</p>
            </div>
          )}

          {/* Options / Variants */}
          {options && (options.option1.length > 0 || options.option2.length > 0) && (
            <div className="space-y-3">
              {options.option1.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Size</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {options.option1.map((v) => (
                      <span key={v} className="rounded-lg border border-border bg-white px-2.5 py-1 text-xs text-gray-700 font-medium">
                        {v}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {options.option2.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Color</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {options.option2.map((v) => (
                      <span key={v} className="rounded-lg border border-border bg-white px-2.5 py-1 text-xs text-gray-700 font-medium">
                        {v}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {options.option3.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Option 3</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {options.option3.map((v) => (
                      <span key={v} className="rounded-lg border border-border bg-white px-2.5 py-1 text-xs text-gray-700 font-medium">
                        {v}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tags */}
          {product.tags && (
            <div className="flex flex-wrap gap-1.5">
              {product.tags.split(',').map((tag) => tag.trim()).filter(Boolean).map((tag) => (
                <span key={tag} className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] text-gray-500 font-medium">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 space-y-3">
            <button
              onClick={handleStartDesigning}
              className="w-full rounded-xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white hover:bg-primary-500 transition-colors shadow-md shadow-primary-600/25"
            >
              Start Designing
            </button>
            <button
              onClick={handleAddToDesignPool}
              disabled={addedToPool}
              className={`w-full rounded-xl px-5 py-3 text-sm font-semibold transition-all ${
                addedToPool
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-white text-gray-700 border border-border hover:bg-gray-50 hover:border-gray-300'
              }`}
            >
              {addedToPool ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                  Added to Design Pool
                </span>
              ) : (
                'Add to Design Pool'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
