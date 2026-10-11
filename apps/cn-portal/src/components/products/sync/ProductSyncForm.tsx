'use client';

import { useActionState } from 'react';
import type { BlankProductImage, BlankSyncFormState, BlankVariant } from '@/lib/types/product';
import { t } from '@/lib/i18n';
import AuthFormStatus from '@/components/auth/AuthFormStatus';
import AuthSubmitButton from '@/components/auth/AuthSubmitButton';
import BlankVariantTable from './BlankVariantTable';
import ProductImagePicker from './ProductImagePicker';

type SyncAction = (state: BlankSyncFormState, form: FormData) => Promise<BlankSyncFormState>;

interface ProductSyncFormProps {
  action: SyncAction;
  /** 随表单提交的标识，如 erpProductId 或 productId */
  hiddenFields: Record<string, string>;
  defaultTitle: string;
  defaultDescription: string;
  defaultRetailPrice?: number | null;
  variants: BlankVariant[];
  images: BlankProductImage[];
  /** 设计稿预览图（已随产品保存，同步时自动带上） */
  previewUrls?: string[];
  storeName: string;
}

const INITIAL_STATE: BlankSyncFormState = {};

/** 同步到店铺的表单：白板同步和设计后同步共用，差别只在成本来源和提交动作。 */
export default function ProductSyncForm({
  action, hiddenFields, defaultTitle, defaultDescription, defaultRetailPrice, variants, images, previewUrls = [], storeName,
}: ProductSyncFormProps) {
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE);
  return (
    <form action={formAction} className="space-y-6">
      {Object.entries(hiddenFields).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}

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
              defaultValue={defaultRetailPrice ?? undefined}
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
        {previewUrls.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-2">{t('sync.section.previews')}</p>
            <div className="flex flex-wrap gap-3">
              {previewUrls.map((url) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={url} src={url} alt="" className="w-24 h-24 rounded-xl border border-border bg-surface-secondary object-contain p-1" />
              ))}
            </div>
          </div>
        )}
        <ProductImagePicker images={images} />
      </section>

      <AuthFormStatus state={state} />
      <AuthSubmitButton pending={pending} label={t('sync.submit', 'zh', { store: storeName })} pendingLabel={t('sync.pending')} />
    </form>
  );
}
