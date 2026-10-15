import Link from 'next/link';
import { signOutSeller } from '@/lib/sellers/actions';
import type { Seller } from '@/lib/types/seller';
import { t } from '@/lib/i18n';

export default function SiteHeader({ seller }: { seller: Seller }) {
  return (
    <header className="border-b border-border bg-white">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/products" className="text-sm font-bold text-gray-900">{t('app.title')}</Link>
          <nav className="flex items-center gap-4 text-sm text-gray-600">
            <Link href="/products" className="hover:text-gray-900">{t('nav.products')}</Link>
            <Link href="/my-products" className="hover:text-gray-900">{t('nav.myProducts')}</Link>
            <Link href="/cart" className="hover:text-gray-900">{t('nav.cart')}</Link>
            <Link href="/orders" className="hover:text-gray-900">{t('nav.orders')}</Link>
            <Link href="/stores" className="hover:text-gray-900">{t('nav.stores')}</Link>
            {seller.isAdmin && (
              <Link href="/settings/suppliers" className="hover:text-gray-900">{t('nav.settings')}</Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{seller.companyName || seller.email}</span>
          <form action={signOutSeller}>
            <button type="submit" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
              {t('auth.signOut')}
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
