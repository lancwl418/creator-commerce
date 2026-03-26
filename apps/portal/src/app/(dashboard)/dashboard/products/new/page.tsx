'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// Phase 1: 产品模板硬编码（ERP API 未就绪时使用）
// 与 Design Engine 的模板定义保持一致
const PRODUCT_TEMPLATES = [
  {
    id: 'tshirt-front',
    product_name: 'Classic T-Shirt',
    name: 'Classic T-Shirt — Front Print',
    description: 'Standard cotton crew-neck tee with front chest print area',
    category: 'apparel',
    base_cost: 8.00,
    thumbnail: '/templates/tshirt-front.svg',
  },
  {
    id: 'tshirt-back',
    product_name: 'Classic T-Shirt',
    name: 'Classic T-Shirt — Back Print',
    description: 'Standard cotton crew-neck tee with back print area',
    category: 'apparel',
    base_cost: 8.00,
    thumbnail: '/templates/tshirt-back.svg',
  },
  {
    id: 'mug-wrap',
    product_name: 'Ceramic Mug',
    name: 'Ceramic Mug — Wrap Print',
    description: '11oz white ceramic mug with full wrap print area',
    category: 'drinkware',
    base_cost: 5.00,
    thumbnail: '/templates/mug-wrap.svg',
  },
];

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
  const [selectedTemplate, setSelectedTemplate] = useState<typeof PRODUCT_TEMPLATES[0] | null>(null);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDesigns();
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
        design_versions (
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

  function getArtworkUrl(design: Design): string | null {
    const version = design.design_versions
      ?.sort((a, b) => b.version_number - a.version_number)[0];
    return version?.design_assets?.find(a => a.asset_type === 'artwork')?.file_url ?? null;
  }

  async function handleCreate() {
    if (!selectedDesign || !selectedTemplate) return;

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

      const productTitle = title || `${selectedDesign.title} — ${selectedTemplate.product_name}`;

      // Create sellable product instance
      const { data: product, error: productError } = await supabase
        .from('sellable_product_instances')
        .insert({
          creator_id: creator.id,
          design_id: selectedDesign.id,
          design_version_id: currentVersion.id,
          product_template_id: selectedTemplate.id,
          title: productTitle,
          status: 'draft',
          base_price_suggestion: selectedTemplate.base_cost * 2.5,
          preview_urls: [],
        })
        .select()
        .single();
      if (productError) throw productError;

      // Create initial product configuration
      const { error: configError } = await supabase
        .from('product_configurations')
        .insert({
          sellable_product_instance_id: product.id,
          design_version_id: currentVersion.id,
          product_template_id: selectedTemplate.id,
          layers: [],
        });
      if (configError) throw configError;

      router.push(`/dashboard/products/${product.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl font-bold mb-1">Create Product</h2>
      <p className="text-gray-500 text-sm mb-6">
        Select a design and product template to create a sellable product
      </p>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 mb-8 text-sm">
        {['design', 'template', 'confirm'].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            {i > 0 && <span className="text-gray-300">→</span>}
            <span className={`px-2.5 py-0.5 rounded-full font-medium ${
              s === step ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'
            }`}>
              {i + 1}. {s.charAt(0).toUpperCase() + s.slice(1)}
            </span>
          </div>
        ))}
      </div>

      {error && (
        <p className="text-sm text-red-600 mb-4">{error}</p>
      )}

      {/* Step 1: Select Design */}
      {step === 'design' && (
        <div>
          <h3 className="text-lg font-medium mb-4">Select a Design</h3>
          {designs.length === 0 ? (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <p className="text-gray-500 mb-3">No designs available. Upload one first.</p>
              <button
                onClick={() => router.push('/dashboard/designs/new')}
                className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
              >
                Upload Design
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
                    className={`rounded-lg border-2 bg-white overflow-hidden text-left transition-all ${
                      isSelected ? 'border-black' : 'border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    <div className="aspect-square bg-gray-50 flex items-center justify-center">
                      {artworkUrl ? (
                        <img src={artworkUrl} alt={design.title} className="w-full h-full object-contain p-3" />
                      ) : (
                        <span className="text-gray-400 text-xs">No preview</span>
                      )}
                    </div>
                    <div className="p-2.5">
                      <p className="text-sm font-medium truncate">{design.title}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Select Template */}
      {step === 'template' && (
        <div>
          <h3 className="text-lg font-medium mb-4">Select a Product Template</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PRODUCT_TEMPLATES.map((template) => {
              const isSelected = selectedTemplate?.id === template.id;
              return (
                <button
                  key={template.id}
                  onClick={() => {
                    setSelectedTemplate(template);
                    setTitle(`${selectedDesign?.title ?? 'Design'} — ${template.product_name}`);
                    setStep('confirm');
                  }}
                  className={`rounded-lg border-2 bg-white overflow-hidden text-left transition-all ${
                    isSelected ? 'border-black' : 'border-gray-200 hover:border-gray-400'
                  }`}
                >
                  <div className="aspect-square bg-gray-50 flex items-center justify-center p-4">
                    <img src={template.thumbnail} alt={template.name} className="max-w-full max-h-full" />
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium">{template.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{template.description}</p>
                    <p className="text-xs text-gray-400 mt-1">Base cost: ${template.base_cost.toFixed(2)}</p>
                  </div>
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setStep('design')}
            className="mt-4 text-sm text-gray-500 hover:text-gray-700"
          >
            ← Back to design selection
          </button>
        </div>
      )}

      {/* Step 3: Confirm */}
      {step === 'confirm' && selectedDesign && selectedTemplate && (
        <div>
          <h3 className="text-lg font-medium mb-4">Confirm Product</h3>
          <div className="rounded-lg border border-gray-200 bg-white p-5 space-y-4">
            <div className="flex gap-4">
              <div className="w-24 h-24 rounded bg-gray-50 flex items-center justify-center shrink-0">
                {getArtworkUrl(selectedDesign) && (
                  <img src={getArtworkUrl(selectedDesign)!} alt="" className="max-w-full max-h-full object-contain p-2" />
                )}
              </div>
              <div>
                <p className="text-sm text-gray-500">Design</p>
                <p className="font-medium">{selectedDesign.title}</p>
                <p className="text-sm text-gray-500 mt-2">Template</p>
                <p className="font-medium">{selectedTemplate.name}</p>
              </div>
            </div>

            <div>
              <label htmlFor="product-title" className="block text-sm font-medium text-gray-700 mb-1">
                Product Title
              </label>
              <input
                id="product-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>

            <div className="text-sm text-gray-500">
              Suggested retail price: <span className="font-medium text-gray-900">${(selectedTemplate.base_cost * 2.5).toFixed(2)}</span>
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button
              onClick={() => setStep('template')}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              ← Back
            </button>
            <button
              onClick={handleCreate}
              disabled={loading}
              className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Product'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
