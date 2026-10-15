'use client';

import { useActionState } from 'react';
import type { BlankVariant } from '@/lib/types/product';
import type { BulkOrderFormState, ShippingAddress } from '@/lib/types/bulk-order';
import type { PrintFace } from '@/lib/products/print-faces';
import DesignUploadFields from './DesignUploadFields';
import { t } from '@/lib/i18n';
import AuthFormStatus from '@/components/auth/AuthFormStatus';
import AuthSubmitButton from '@/components/auth/AuthSubmitButton';
import OrderQuantityTable from './OrderQuantityTable';
import ShippingAddressFields from './ShippingAddressFields';

type OrderAction = (state: BulkOrderFormState, form: FormData) => Promise<BulkOrderFormState>;

interface BulkOrderFormProps {
  action: OrderAction;
  hiddenFields: Record<string, string>;
  variants: BlankVariant[];
  moqBySku: Record<string, number | null>;
  defaultAddress: Partial<ShippingAddress> | null;
  /** 可上传设计的印刷面；不传则不显示设计区（如设计器产品下单） */
  designFaces?: PrintFace[];
  /** 设计是否可选（统一下单页：不传设计 = 白板）；false 时必须上传 */
  designOptional?: boolean;
  /** 显示「加入批量单」按钮（白板和带设计都可加入，多产品合成一张采购单） */
  allowCart?: boolean;
}

const INITIAL_STATE: BulkOrderFormState = {};

/** 采购单表单：统一下单（设计可选）与设计器产品下单共用，差别只在设计区和提交动作。 */
export default function BulkOrderForm({ action, hiddenFields, variants, moqBySku, defaultAddress, designFaces, designOptional, allowCart }: BulkOrderFormProps) {
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE);
  const address = state.address ?? defaultAddress ?? {};
  return (
    <form action={formAction} className="space-y-6">
      {Object.entries(hiddenFields).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}

      {designFaces && (
        <section className="rounded-2xl border border-border bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-1">
            {t('order.section.design')}
            {designOptional && <span className="ml-2 font-normal text-xs text-gray-400">{t('order.type.blank')} / {t('order.type.designed')}</span>}
          </h2>
          <p className="text-xs text-gray-400 mb-3">{t(designOptional ? 'order.section.designOptionalHint' : 'order.section.designHint')}</p>
          <DesignUploadFields faces={designFaces} />
        </section>
      )}

      <section className="rounded-2xl border border-border bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-1">{t('order.section.items')}</h2>
        <p className="text-xs text-gray-400 mb-3">{t('order.section.itemsHint')}</p>
        <OrderQuantityTable variants={variants} moqBySku={moqBySku} />
      </section>

      <section className="rounded-2xl border border-border bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">{t('order.section.address')}</h2>
        <ShippingAddressFields address={address} />
      </section>

      <section className="rounded-2xl border border-border bg-white p-5">
        <label htmlFor="note" className="block text-sm font-medium text-gray-700 mb-1.5">{t('order.field.note')}</label>
        <textarea id="note" name="note" rows={3} maxLength={1000}
          className="w-full rounded-xl border border-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/60 focus:border-brand-500" />
      </section>

      <p className="text-xs text-gray-500">{t('order.paymentNote')}</p>
      <AuthFormStatus state={state} />
      <AuthSubmitButton pending={pending} label={t('order.submit')} pendingLabel={t('order.pending')} />
      {/* 加入批量单只收数量和设计，formNoValidate 跳过地址的浏览器校验 */}
      {allowCart && (
        <button type="submit" name="intent" value="cart" formNoValidate disabled={pending}
          className="w-full rounded-xl border border-gray-900 px-4 py-2.5 text-sm font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
          {t('cart.add')}
        </button>
      )}
    </form>
  );
}
