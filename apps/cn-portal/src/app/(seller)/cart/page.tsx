import Link from 'next/link';
import { priceCartItems } from '@/lib/cart/pricing';
import { getCartItems } from '@/lib/cart/queries';
import { getLastShippingAddress } from '@/lib/queries/bulk-orders';
import { requireSeller } from '@/lib/sellers/session';
import { t } from '@/lib/i18n';
import CartItems from '@/components/cart/CartItems';
import CheckoutForm from '@/components/cart/CheckoutForm';

export const dynamic = 'force-dynamic';

export default async function CartPage({ searchParams }: { searchParams: Promise<{ added?: string }> }) {
  const seller = await requireSeller();
  const [{ added }, rows, lastAddress] = await Promise.all([searchParams, getCartItems(seller.id), getLastShippingAddress(seller.id)]);
  const items = await priceCartItems(rows, seller.tier);
  const hasUnpriced = items.some((item) => item.unit_cost == null);

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('cart.title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('cart.subtitle')}</p>
      </div>
      {added && <div role="status" className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">{t('cart.added')}</div>}
      {items.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-300 p-10 text-center bg-white">
          <p className="text-gray-500">{t('cart.empty')}</p>
          <Link href="/products" className="inline-block mt-4 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-gray-900 hover:bg-brand-600">{t('nav.products')}</Link>
        </div>
      ) : (
        <>
          <CartItems items={items} />
          {hasUnpriced && <p role="alert" className="text-sm text-red-600">{t('cart.unpricedHint')}</p>}
          <CheckoutForm defaultAddress={lastAddress} disabled={hasUnpriced} />
        </>
      )}
    </div>
  );
}
