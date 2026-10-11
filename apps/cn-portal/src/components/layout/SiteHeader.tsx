import Link from 'next/link';
import { signOutSeller } from '@/lib/sellers/actions';
import type { Seller } from '@/lib/types/seller';
import { t } from '@/lib/i18n';

export default function SiteHeader({ seller }: { seller: Seller }) {
  return (
    <header className="border-b border-border bg-white">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/products" className="text-sm font-bold text-gray-900">{t('app.title')}</Link>
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
