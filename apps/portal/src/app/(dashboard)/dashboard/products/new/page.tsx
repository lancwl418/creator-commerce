'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

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

export default function NewProductPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const preselectedDesignId = searchParams.get('design_id');

  const [step, setStep] = useState<'design' | 'template' | 'confirm'>(
    preselectedDesignId ? 'template' : 'design'
  );
  const [designs, setDesigns] = useState<Design[]>([]);
  const [selectedDesign, setSelectedDesign] = useState<Design | null>(null);
  const [products, setProducts] = useState<ExternalProduct[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<ExternalProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'shopify' | 'erp'>('all');

  useEffect(() => {
    loadDesigns();
    loadProducts();
  }, []);

  async function loadDesigns() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: creator } = await supabase
      .from('creators')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();
    if (!creator) return;

    const { data } = await supabase
      .from('designs')
      .select(`
        id, title, current_version_id,
        design_versions!design_versions_design_id_fkey (
          id, version_number,
          design_assets (id, asset_type, file_url)
        )
      `)
      .eq('creator_id', creator.id)
      .in('status', ['draft', 'approved', 'published'])
      .order('created_at', { ascending: false });

    if (data) {
      setDesigns(data as Design[]);

      if (preselectedDesignId) {
        const found = data.find((d) => d.id === preselectedDesignId);
        if (found) setSelectedDesign(found as Design);
      }
    }
  }

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

  async function handleCreate() {
    if (!selectedDesign || selectedProducts.length === 0) return;

    setLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: creator } = await supabase
        .from('creators')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();
      if (!creator) throw new Error('Creator not found');

      const currentVersion = selectedDesign.design_versions
        ?.sort((a, b) => b.version_number - a.version_number)[0];
      if (!currentVersion) throw new Error('No design version found');

      let firstProductId: string | null = null;

      // Create a sellable_product_instance for each selected product
      for (const product of selectedProducts) {
        const productTitle = title
          ? (selectedProducts.length > 1 ? `${title} — ${product.product_name}` : title)
          : `${selectedDesign.title} — ${product.product_name}`;

        const { data: created, error: productError } = await supabase
          .from('sellable_product_instances')
          .insert({
            creator_id: creator.id,
            design_id: selectedDesign.id,
            design_version_id: currentVersion.id,
            product_template_id: product.id,
            title: productTitle,
            status: 'draft',
            base_price_suggestion: product.base_cost * 2.5,
            preview_urls: product.thumbnail ? [product.thumbnail] : [],
          })
          .select()
          .single();
        if (productError) throw productError;

        if (!firstProductId) firstProductId = created.id;

        const { error: configError } = await supabase
          .from('product_configurations')
          .insert({
            sellable_product_instance_id: created.id,
            design_version_id: currentVersion.id,
            product_template_id: product.id,
            layers: [],
          });
        if (configError) throw configError;
      }

      router.push(`/dashboard/products/${firstProductId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  }

  const steps = [
    { key: 'design', label: 'Design' },
    { key: 'template', label: 'Template' },
    { key: 'confirm', label: 'Confirm' },
  ];
  const currentStepIndex = steps.findIndex(s => s.key === step);

  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl font-bold text-gray-900 mb-1">Create Product</h2>
      <p className="text-gray-500 text-sm mb-8">
        Select a design and product template to create a sellable product
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

      {/* Step 2: Select Products */}
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
              ← Back
            </button>
            {selectedProducts.length > 0 && (
              <button
                onClick={() => {
                  if (selectedProducts.length === 1) {
                    setTitle(`${selectedDesign?.title ?? 'Design'} — ${selectedProducts[0].product_name}`);
                  } else {
                    setTitle(selectedDesign?.title ?? 'Design');
                  }
                  setStep('confirm');
                }}
                className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-500 transition-colors shadow-md shadow-primary-600/25"
              >
                Continue ({selectedProducts.length} products)
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Confirm */}
      {step === 'confirm' && selectedDesign && selectedProducts.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm</h3>
          <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-5 shadow-sm">
            <div className="flex gap-5">
              <div className="w-20 h-20 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                {getArtworkUrl(selectedDesign) && (
                  <img src={getArtworkUrl(selectedDesign)!} alt="" className="max-w-full max-h-full object-contain p-2" />
                )}
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Design</p>
                <p className="font-semibold text-gray-900">{selectedDesign.title}</p>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mt-3">Products</p>
                <p className="font-semibold text-gray-900">{selectedProducts.length} selected</p>
              </div>
            </div>

            {/* Selected products list */}
            <div className="space-y-2">
              {selectedProducts.map((p) => (
                <div key={p.id} className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
                  <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shrink-0">
                    {p.thumbnail ? (
                      <img src={p.thumbnail} alt="" className="w-full h-full object-contain rounded-lg" />
                    ) : (
                      <span className="text-gray-300 text-[10px]">N/A</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.source} · ${p.base_cost.toFixed(2)}</p>
                  </div>
                  <button
                    onClick={() => toggleProduct(p)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            <div>
              <label htmlFor="product-title" className="block text-sm font-semibold text-gray-700 mb-1.5">
                {selectedProducts.length > 1 ? 'Product Title Prefix' : 'Product Title'}
              </label>
              <input
                id="product-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
              />
              {selectedProducts.length > 1 && (
                <p className="text-xs text-gray-400 mt-1">Each product will be named: {title || selectedDesign.title} — [product name]</p>
              )}
            </div>
          </div>

          <div className="flex gap-3 mt-5">
            <button
              onClick={() => setStep('template')}
              className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={handleCreate}
              disabled={loading}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50 transition-all shadow-md shadow-blue-600/25"
            >
              {loading ? 'Creating...' : `Create ${selectedProducts.length} Product${selectedProducts.length > 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
