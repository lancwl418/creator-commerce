'use client';

import { useActionState } from 'react';
import { syncBlankProduct } from '@/lib/products/actions';
import type { BlankProductImage, BlankSyncFormState, BlankVariant } from '@/lib/types/product';
import { t } from '@/lib/i18n';
import AuthFormStatus from '@/components/auth/AuthFormStatus';
import AuthSubmitButton from '@/components/auth/AuthSubmitButton';
import BlankVariantTable from './BlankVariantTable';
import ProductImagePicker from './ProductImagePicker';

interface BlankSyncFormProps {
  erpProductId: string;
  defaultTitle: string;
  defaultDescription: string;
  variants: BlankVariant[];
  images: BlankProductImage[];
  storeName: string;
}

const INITIAL_STATE: BlankSyncFormState = {};

export default function BlankSyncForm({ erpProductId, defaultTitle, defaultDescription, variants, images, storeName }: BlankSyncFormProps) {
  const [state, action, pending] = useActionState(syncBlankProduct, INITIAL_STATE);
  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="erpProductId" value={erpProductId} />

      <section className="rounded-2xl border border-border bg-white p-5 space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1.5">{t('sync.field.title')}</label>
          <input id="title" name="title" defaultValue={defaultTitle} required maxLength={255}
            className="w-full rounded-xl border border-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/60 focus:border-brand-500" />
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1.5">{t('sync.field.description')}</label>
          <textarea id="description" name="description" defaultValue={defaultDescription} rows={4}
            className="w-full rounded-xl border border-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/60 focus:border-brand-500" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="retailPrice" className="block text-sm font-medium text-gray-700 mb-1.5">{t('sync.field.retailPrice')}</label>
            <input id="retailPrice" name="retailPrice" type="number" min="0.01" step="0.01" required inputMode="decimal"
              className="w-full rounded-xl border border-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/60 focus:border-brand-500" />
            <p className="mt-1 text-xs text-gray-400">{t('sync.field.retailPriceHint')}</p>
          </div>
          <fieldset>
            <legend className="block text-sm font-medium text-gray-700 mb-1.5">{t('sync.field.publishStatus')}</legend>
            <div className="flex gap-4 text-sm text-gray-700 pt-2">
              <label className="flex items-center gap-1.5"><input type="radio" name="publishStatus" value="active" defaultChecked /> {t('sync.publish.active')}</label>
              <label className="flex items-center gap-1.5"><input type="radio" name="publishStatus" value="draft" /> {t('sync.publish.draft')}</label>
            </div>
          </fieldset>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">{t('sync.section.variants')}</h2>
        <BlankVariantTable variants={variants} />
      </section>

      <section className="rounded-2xl border border-border bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">{t('sync.section.images')}</h2>
        <ProductImagePicker images={images} />
      </section>

      <AuthFormStatus state={state} />
      <AuthSubmitButton pending={pending} label={t('sync.submit', 'zh', { store: storeName })} pendingLabel={t('sync.pending')} />
    </form>
  );
}
