'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

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

      {/* Step 2: Select Template */}
      {step === 'template' && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Select a Product Template</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                  className={`rounded-2xl border-2 bg-white overflow-hidden text-left transition-all hover:-translate-y-0.5 ${
                    isSelected ? 'border-primary-500 shadow-lg shadow-primary-500/10' : 'border-border hover:border-gray-300 hover:shadow-md'
                  }`}
                >
                  <div className="aspect-square bg-surface-secondary flex items-center justify-center p-6">
                    <img src={template.thumbnail} alt={template.name} className="max-w-full max-h-full" />
                  </div>
                  <div className="p-4">
                    <p className="text-sm font-semibold text-gray-900">{template.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{template.description}</p>
                    <p className="text-xs text-gray-400 mt-2 font-medium">Base cost: ${template.base_cost.toFixed(2)}</p>
                  </div>
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setStep('design')}
            className="mt-5 text-sm text-gray-500 hover:text-primary-600 font-medium transition-colors"
          >
            ← Back to design selection
          </button>
        </div>
      )}

      {/* Step 3: Confirm */}
      {step === 'confirm' && selectedDesign && selectedTemplate && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Product</h3>
          <div className="rounded-2xl border border-border bg-white p-6 space-y-5 shadow-sm">
            <div className="flex gap-5">
              <div className="w-24 h-24 rounded-xl bg-surface-secondary flex items-center justify-center shrink-0">
                {getArtworkUrl(selectedDesign) && (
                  <img src={getArtworkUrl(selectedDesign)!} alt="" className="max-w-full max-h-full object-contain p-2" />
                )}
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Design</p>
                <p className="font-semibold text-gray-900">{selectedDesign.title}</p>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mt-3">Template</p>
                <p className="font-semibold text-gray-900">{selectedTemplate.name}</p>
              </div>
            </div>

            <div>
              <label htmlFor="product-title" className="block text-sm font-semibold text-gray-700 mb-1.5">
                Product Title
              </label>
              <input
                id="product-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
              />
            </div>

            <div className="rounded-xl bg-surface-secondary px-4 py-3">
              <p className="text-sm text-gray-500">
                Suggested retail price: <span className="font-bold text-gray-900">${(selectedTemplate.base_cost * 2.5).toFixed(2)}</span>
              </p>
            </div>
          </div>

          <div className="flex gap-3 mt-5">
            <button
              onClick={() => setStep('template')}
              className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={handleCreate}
              disabled={loading}
              className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50 transition-all shadow-md shadow-primary-600/25"
            >
              {loading ? 'Creating...' : 'Create Product'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
