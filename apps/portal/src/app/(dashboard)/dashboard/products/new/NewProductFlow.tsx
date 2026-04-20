'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const DESIGN_ENGINE_URL = process.env.NEXT_PUBLIC_DESIGN_ENGINE_URL || 'http://localhost:3001';

interface ExternalProduct {
  id: string;
  name: string;
  description: string;
  thumbnail: string | null;
  source: 'shopify' | 'erp' | 'demo';
  base_cost: number;
  product_name: string;
}

interface Design {
  id: string;
  title: string;
  current_version_id: string;
  design_versions: {
    id: string;
    version_number: number;
    design_assets: {
      id: string;
      asset_type: string;
      file_url: string;
    }[];
  }[];
}

interface NewProductFlowProps {
  creatorId: string;
  designs: Design[];
}

export default function NewProductFlow({ creatorId, designs: initialDesigns }: NewProductFlowProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const preselectedDesignId = searchParams.get('design_id');

  const [step, setStep] = useState<'design' | 'template'>(
    preselectedDesignId ? 'template' : 'design'
  );
  const [designs] = useState<Design[]>(initialDesigns);
  const [selectedDesign, setSelectedDesign] = useState<Design | null>(() => {
    if (preselectedDesignId) {
      return initialDesigns.find((d) => d.id === preselectedDesignId) || null;
    }
    return null;
  });
  const [products, setProducts] = useState<ExternalProduct[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<ExternalProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'shopify' | 'erp'>('all');

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    setProductsLoading(true);
    const allProducts: ExternalProduct[] = [];

    // Fetch Shopify products
    try {
      const res = await fetch(`${DESIGN_ENGINE_URL}/api/shopify-products?limit=20`);
      if (res.ok) {
        const data = await res.json();
        if (data.products) {
          for (const p of data.products) {
            const img = p.images?.[0]?.src || p.image?.src || null;
            allProducts.push({
              id: `shopify-${p.id}`,
              name: p.title,
              description: p.body_html?.replace(/<[^>]*>/g, '').slice(0, 100) || '',
              thumbnail: img,
              source: 'shopify',
              base_cost: parseFloat(p.variants?.[0]?.price || '10'),
              product_name: p.title,
            });
          }
        }
      }
    } catch {
      // Shopify fetch failed, continue
    }

    // Fetch ERP products
    try {
      const res = await fetch(`${DESIGN_ENGINE_URL}/api/erp-products?pageNo=1&pageSize=20`);
      if (res.ok) {
        const data = await res.json();
        const items = data.data?.list || data.list || [];
        for (const p of items) {
          const img = p.mainPic
            ? `${DESIGN_ENGINE_URL}/api/erp-image?path=${encodeURIComponent(p.mainPic)}`
            : null;
          allProducts.push({
            id: `erp-${p.id || p.itemNo}`,
            name: p.itemName || p.name || p.itemNo,
            description: p.itemNo || '',
            thumbnail: img,
            source: 'erp',
            base_cost: parseFloat(p.price || p.salePrice || '5'),
            product_name: p.itemName || p.name || p.itemNo,
          });
        }
      }
    } catch {
      // ERP fetch failed, continue
    }

    setProducts(allProducts);
    setProductsLoading(false);
  }

  function toggleProduct(product: ExternalProduct) {
    setSelectedProducts((prev) => {
      const exists = prev.find((p) => p.id === product.id);
      if (exists) {
        return prev.filter((p) => p.id !== product.id);
      }
      return [...prev, product];
    });
  }

  function getArtworkUrl(design: Design): string | null {
    const version = design.design_versions
      ?.sort((a, b) => b.version_number - a.version_number)[0];
    return version?.design_assets?.find(a => a.asset_type === 'artwork')?.file_url ?? null;
  }

  function handleOpenEditor() {
    if (!selectedDesign || selectedProducts.length === 0) return;

    const artworkUrl = getArtworkUrl(selectedDesign);
    const templateIds = selectedProducts.map((p) => p.id).join(',');
    const productMeta = encodeURIComponent(JSON.stringify(
      selectedProducts.map((p) => ({
        id: p.id,
        name: p.product_name,
        base_cost: p.base_cost,
        source: p.source,
        thumbnail: p.thumbnail,
      }))
    ));

    const callbackUrl = `${window.location.origin}/dashboard/products/import`;
    const titlePrefix = selectedDesign.title;

    const editorUrl = `${DESIGN_ENGINE_URL}/embed`
      + `?design_id=${selectedDesign.id}`
      + `&artwork_url=${encodeURIComponent(artworkUrl || '')}`
      + `&templates=${encodeURIComponent(templateIds)}`
      + `&products_meta=${productMeta}`
      + `&title_prefix=${encodeURIComponent(titlePrefix)}`
      + `&callback_url=${encodeURIComponent(callbackUrl)}`;

    // Navigate to editor — products are created only when designer saves
    window.location.href = editorUrl;
  }

  const steps = [
    { key: 'design', label: 'Design' },
    { key: 'template', label: 'Products' },
  ];
  const currentStepIndex = steps.findIndex(s => s.key === step);

  return (
    <div className="max-w-4xl">
      <h2 className="text-2xl font-bold text-gray-900 mb-1">Create Product</h2>
      <p className="text-gray-500 text-sm mb-8">
        Select a design and products, then configure in the editor
      </p>

      {/* Steps indicator */}
      <div className="flex items-center gap-0 mb-10">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                i <= currentStepIndex
                  ? 'bg-primary-600 text-white shadow-md shadow-primary-600/25'
                  : 'bg-gray-100 text-gray-400'
              }`}>
                {i + 1}
              </div>
              <span className={`text-sm font-medium ${
                i <= currentStepIndex ? 'text-gray-900' : 'text-gray-400'
              }`}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-4 rounded-full ${
                i < currentStepIndex ? 'bg-primary-600' : 'bg-gray-200'
              }`} />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 mb-6">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Step 1: Select Design */}
      {step === 'design' && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Select a Design</h3>
          {designs.length === 0 ? (
            <div className="border-2 border-dashed border-gray-300 rounded-2xl p-10 text-center bg-white">
              <p className="text-gray-500 mb-4">No designs available. Upload one first.</p>
              <button
                onClick={() => router.push('/dashboard/designs/new')}
                className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-500 transition-colors shadow-md shadow-primary-600/25"
              >
                Upload Design
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {designs.map((design) => {
                const artworkUrl = getArtworkUrl(design);
                const isSelected = selectedDesign?.id === design.id;
                return (
                  <button
                    key={design.id}
                    onClick={() => {
                      setSelectedDesign(design);
                      setStep('template');
                    }}
                    className={`rounded-2xl border-2 bg-white overflow-hidden text-left transition-all hover:-translate-y-0.5 ${
                      isSelected ? 'border-primary-500 shadow-lg shadow-primary-500/10' : 'border-border hover:border-gray-300 hover:shadow-md'
                    }`}
                  >
                    <div className="aspect-square bg-surface-secondary flex items-center justify-center">
                      {artworkUrl ? (
                        <img src={artworkUrl} alt={design.title} className="w-full h-full object-contain p-4" />
                      ) : (
                        <span className="text-gray-400 text-xs">No preview</span>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-medium truncate">{design.title}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Select Products -> then go to editor */}
      {step === 'template' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Select Products</h3>
            {selectedProducts.length > 0 && (
              <span className="text-sm text-gray-500">
                {selectedProducts.length} selected
              </span>
            )}
          </div>

          {/* Source tabs */}
          <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1">
            {[
              { key: 'all' as const, label: 'All' },
              { key: 'shopify' as const, label: 'Shopify' },
              { key: 'erp' as const, label: 'ERP' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {productsLoading ? (
            <div className="text-center py-12 text-gray-500">Loading products from Shopify & ERP...</div>
          ) : products.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No products found. Check Design Engine connection.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {products
                .filter((p) => activeTab === 'all' || p.source === activeTab)
                .map((product) => {
                  const isSelected = selectedProducts.some((s) => s.id === product.id);
                  return (
                    <button
                      key={product.id}
                      onClick={() => toggleProduct(product)}
                      className={`relative rounded-2xl border-2 bg-white overflow-hidden text-left transition-all hover:-translate-y-0.5 ${
                        isSelected
                          ? 'border-primary-500 shadow-lg shadow-primary-500/10'
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                      }`}
                    >
                      {/* Checkbox */}
                      <div className={`absolute top-2 right-2 w-5 h-5 rounded-md border-2 flex items-center justify-center z-10 ${
                        isSelected ? 'bg-primary-600 border-primary-600' : 'bg-white/80 border-gray-300'
                      }`}>
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                          </svg>
                        )}
                      </div>

                      {/* Source badge */}
                      <div className="absolute top-2 left-2 z-10">
                        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          product.source === 'shopify'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {product.source}
                        </span>
                      </div>

                      <div className="aspect-square bg-gray-50 flex items-center justify-center">
                        {product.thumbnail ? (
                          <img
                            src={product.thumbnail}
                            alt={product.name}
                            className="w-full h-full object-contain p-3"
                          />
                        ) : (
                          <span className="text-gray-300 text-xs">No image</span>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="text-xs font-semibold text-gray-900 truncate">{product.name}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">${product.base_cost.toFixed(2)}</p>
                      </div>
                    </button>
                  );
                })}
            </div>
          )}

          <div className="flex items-center justify-between mt-5">
            <button
              onClick={() => setStep('design')}
              className="text-sm text-gray-500 hover:text-primary-600 font-medium transition-colors"
            >
              &larr; Back
            </button>
            {selectedProducts.length > 0 && (
              <button
                onClick={handleOpenEditor}
                className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-500 transition-colors shadow-md shadow-primary-600/25"
              >
                Open Editor ({selectedProducts.length} product{selectedProducts.length > 1 ? 's' : ''})
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
