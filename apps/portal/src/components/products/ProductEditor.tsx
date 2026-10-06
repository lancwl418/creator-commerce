'use client';

import { useState } from 'react';
import { useProductEditor } from '@/hooks/products/useProductEditor';
import { useRouter } from 'next/navigation';
import type { Listing, ProductData } from '@/lib/types';
import SyncModal from '@/components/products/SyncModal';
import UnlistModal from '@/components/products/UnlistModal';
import ProductEditorToolbar from '@/components/products/editor/ProductEditorToolbar';
import BulkMarkupEditor from '@/components/products/editor/BulkMarkupEditor';
import PricingPanel from '@/components/products/editor/PricingPanel';
import ColorPreviews from '@/components/products/editor/ColorPreviews';
import ProductImagesSelector from '@/components/products/editor/ProductImagesSelector';
import VariantsTable from '@/components/products/editor/VariantsTable';
import ChannelListings from '@/components/products/editor/ChannelListings';
import ProductInfoCard from '@/components/products/editor/ProductInfoCard';
import TagsEditor from '@/components/products/editor/TagsEditor';
import Lightbox from '@/components/products/editor/Lightbox';

interface ProductEditorProps {
  product: ProductData;
  previewUrl: string | null;
  designTitle: string | null;
  designArtworkUrls: string[];
  listings: Listing[];
}

export default function ProductEditor({ product, previewUrl, designTitle, designArtworkUrls, listings }: ProductEditorProps) {
  const router = useRouter();
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showUnlistModal, setShowUnlistModal] = useState(false);
  const {
    erpSkus, enabledSkuIds, optionNames, loadingSkus, skuError,
    option1Values, option2Values, option3Values, hasOptions, colorVariants, skusByColor,
    title, setTitle, description, setDescription, tags, setTags,
    step, goToStep, markup, setMarkup, selectedImageIds,
    retailPrice, setRetailPrice, shippingCost, setShippingCost, variantPrices,
    saving, saved, error, priceNum, hasCustomPrices, profitRange,
    toggleSku, toggleColor, selectAll, clearAll, isColorFull, isColorPartial,
    toggleProductImage, setVariantPrice, applyPriceToAll, applyMarkup, saveProduct, handleSave,
  } = useProductEditor(product);

  // ── Render ──
  return (
    <div className="space-y-6">
      {/* Wizard top bar */}
      <ProductEditorToolbar
        step={step}
        saving={saving}
        saved={saved}
        onStepChange={goToStep}
        onSave={handleSave}
        onPublish={() => setShowSyncModal(true)}
        onEdit={() => router.push(`/dashboard/products/${product.id}/edit`)}
      />

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-5 py-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Step content */}
      {step === 'detail' ? (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-4">
            {/* Preview Image */}
            <div className="rounded-2xl border border-border bg-white overflow-hidden shadow-sm">
              <div className="aspect-square bg-surface-secondary flex items-center justify-center">
                {previewUrl ? (
                  <img src={previewUrl} alt={product.title} className="w-full h-full object-contain p-8" />
                ) : (
                  <span className="text-gray-400 text-sm">No preview</span>
                )}
              </div>
            </div>

            <ProductInfoCard
              title={title}
              description={description}
              status={product.status}
              designId={product.design_id}
              designTitle={designTitle}
              designArtworkUrls={designArtworkUrls}
              createdAt={product.created_at}
              onTitleChange={setTitle}
              onDescriptionChange={setDescription}
              onImageClick={setLightboxUrl}
            />

            <ChannelListings listings={listings} onUnlist={() => setShowUnlistModal(true)} />
          </div>

          {/* Right Column */}
          <div className="lg:col-span-3 space-y-5">
            <ColorPreviews colorVariants={colorVariants} onImageClick={setLightboxUrl} />

            <ProductImagesSelector
              images={product.product_images}
              selectedIds={selectedImageIds}
              onToggle={toggleProductImage}
            />

            <TagsEditor
              tags={tags}
              onChange={setTags}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-5 max-w-4xl">
          <PricingPanel
            retailPrice={retailPrice}
            onRetailPriceChange={setRetailPrice}
            shippingCost={shippingCost}
            onShippingCostChange={setShippingCost}
            profitRange={profitRange}
            hasCustomPrices={hasCustomPrices}
            onResetPrices={applyPriceToAll}
          />

          {/* Bulk markup */}
          <BulkMarkupEditor markup={markup} onChange={setMarkup} onApply={applyMarkup} />

          <VariantsTable
            erpSkus={erpSkus}
            enabledSkuIds={enabledSkuIds}
            variantPrices={variantPrices}
            productPrice={priceNum}
            optionNames={optionNames}
            option1Values={option1Values}
            option2Values={option2Values}
            option3Values={option3Values}
            hasOptions={hasOptions}
            skusByColor={skusByColor}
            loadingSkus={loadingSkus}
            skuError={skuError}
            onToggleSku={toggleSku}
            onToggleColor={toggleColor}
            onSelectAll={selectAll}
            onClearAll={clearAll}
            onSetVariantPrice={setVariantPrice}
            isColorFullyEnabled={isColorFull}
            isColorPartiallyEnabled={isColorPartial}
          />
        </div>
      )}

      {/* Lightbox */}
      {lightboxUrl && <Lightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}

      {/* Sync Modal */}
      {showSyncModal && (
        <SyncModal
          productId={product.id}
          listings={listings}
          onClose={() => setShowSyncModal(false)}
          onSynced={() => router.refresh()}
          onBeforeSync={saveProduct}
        />
      )}

      {/* Unlist Modal */}
      {showUnlistModal && (
        <UnlistModal
          productId={product.id}
          listings={listings}
          onClose={() => setShowUnlistModal(false)}
          onUnlisted={() => router.refresh()}
        />
      )}
    </div>
  );
}
