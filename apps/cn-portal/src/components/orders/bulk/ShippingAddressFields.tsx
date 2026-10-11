import type { ShippingAddress } from '@/lib/types/bulk-order';
import { ADDRESS_FIELDS } from '@/lib/orders/bulk-order';
import { t, type MessageKey } from '@/lib/i18n';

const REQUIRED: (keyof ShippingAddress)[] = ['name', 'phone', 'country', 'city', 'address1', 'zip'];

export default function ShippingAddressFields({ address }: { address: Partial<ShippingAddress> }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {ADDRESS_FIELDS.map((key) => (
        <div key={key} className={key === 'address1' || key === 'address2' ? 'sm:col-span-2' : ''}>
          <label htmlFor={`address.${key}`} className="block text-sm font-medium text-gray-700 mb-1.5">
            {t(`order.address.${key}` as MessageKey)}
          </label>
          <input id={`address.${key}`} name={`address.${key}`} defaultValue={address[key] ?? ''} required={REQUIRED.includes(key)}
            autoComplete={key === 'name' ? 'name' : key === 'phone' ? 'tel' : key === 'zip' ? 'postal-code' : 'off'}
            className="w-full rounded-xl border border-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/60 focus:border-brand-500" />
        </div>
      ))}
    </div>
  );
}
