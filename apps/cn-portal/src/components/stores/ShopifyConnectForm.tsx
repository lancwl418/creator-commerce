import { t } from '@/lib/i18n';

interface ShopifyConnectFormProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

export default function ShopifyConnectForm({ value, onChange, onSubmit }: ShopifyConnectFormProps) {
  return (
    <form
      className="mt-4 flex flex-col sm:flex-row gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="mystore.myshopify.com"
        aria-label={t('stores.shopify.domainLabel')}
        className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/60 focus:border-brand-500 transition-all"
      />
      <button
        type="submit"
        className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-gray-900 hover:bg-brand-600 transition-all shadow-sm"
      >
        {t('stores.shopify.connect')}
      </button>
    </form>
  );
}
