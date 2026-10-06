'use client';

import type { DesignForProduct } from '@/lib/types/product-creation';
import { useNewProduct } from '@/hooks/products/useNewProduct';
import DesignSelection from './DesignSelection';
import ProductSelection from './ProductSelection';

interface NewProductFlowProps {
  designs: DesignForProduct[];
}

export default function NewProductFlow({ designs }: NewProductFlowProps) {
  const { step, setStep, selectedDesign, setSelectedDesign, products, selectedProducts, productsLoading,
    error, activeTab, setActiveTab, toggleProduct, handleOpenEditor } = useNewProduct(designs);
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
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${i <= currentStepIndex
                ? 'bg-primary-600 text-white shadow-md shadow-primary-600/25'
                : 'bg-gray-100 text-gray-400'
                }`}>
                {i + 1}
              </div>
              <span className={`text-sm font-medium ${i <= currentStepIndex ? 'text-gray-900' : 'text-gray-400'
                }`}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-4 rounded-full ${i < currentStepIndex ? 'bg-primary-600' : 'bg-gray-200'
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

      {step === 'design' && <DesignSelection designs={designs} selectedDesign={selectedDesign} onSelect={design => { setSelectedDesign(design); setStep('template'); }} />}

      {step === 'template' && <ProductSelection products={products} selectedProducts={selectedProducts} productsLoading={productsLoading} activeTab={activeTab} setActiveTab={setActiveTab} toggleProduct={toggleProduct} onBack={() => setStep('design')} handleOpenEditor={handleOpenEditor} />}
    </div>
  );
}
